import type { Item, ItemType } from '../types';
import { storeFile, makeFileRef } from './fileStore';
import { aiClient } from '../ai/client';
import type { AnalyzeCardResult } from '../ai/types';
import { extractDocumentText, renderPdfFirstPage, renderDocxThumbnail, renderTextThumbnail } from './documentExtraction';

export type IngestResolver = (item: Item) => Item | Promise<Item>;

export interface IngestDraft {
  type: ItemType;
  initialFields: Partial<Item>;
  resolve: IngestResolver;
}

export const isHttpUrl = (value: string) => /^https?:\/\/[^\s$.?#].[^\s]*$/i.test(value);

function getFileExtension(filename: string, fallback = 'file'): string {
  return filename.split('.').pop()?.toLowerCase() || fallback;
}

function getFileMetadata(file: File) {
  return {
    originalFileName: file.name,
    fileExtension: getFileExtension(file.name),
    mimeType: file.type || 'application/octet-stream',
    fileSizeBytes: file.size,
  };
}

function createUniqueItemId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const createAnalyzingItem = (
  type: ItemType,
  initialFields: Partial<Item>,
): Item => ({
  id: createUniqueItemId(),
  type,
  title: initialFields.title || 'Analyzing...',
  content: initialFields.content || '',
  summary: '',
  tags: [],
  status: 'analyzing',
  createdAt: new Date().toISOString(),
  ...initialFields,
});

/**
 * Call analyze-card and merge AI results into the item.
 * Also generates an embedding for semantic search (fire-and-forget).
 * Falls back to the base item if AI fails.
 */
async function enrichWithAI(base: Item): Promise<Item> {
  try {
    const analyzeText = base.content || base.summary || base.title;
    const result = await aiClient.analyzeCard({
      type: base.type,
      title: base.title,
      content: analyzeText,
      sourceUrl: base.sourceUrl,
    });
    const enriched = applyAIResult(base, result);

    // Generate embedding for semantic search (awaited so it persists with the item)
    try {
      const embedText = `${enriched.title} ${enriched.summary} ${enriched.tags.join(' ')}`;
      const embedResult = await aiClient.embed({ text: embedText });
      if (embedResult.embedding.length > 0) {
        enriched.embedding = embedResult.embedding;
      }
    } catch { /* embedding is optional */ }

    return enriched;
  } catch {
    return base;
  }
}

function applyAIResult(base: Item, result: AnalyzeCardResult): Item {
  const mergedTags = result.tags.length > 0
    ? Array.from(new Set([...base.tags, ...result.tags]))
    : base.tags;
  const shouldPreserveTitle = base.type === 'link' || !!base.sourceUrl;

  return {
    ...base,
    ...(!shouldPreserveTitle && result.title ? { title: result.title } : {}),
    summary: result.summary || base.summary,
    tags: mergedTags,
    keyClaims: result.keyClaims.length > 0 ? result.keyClaims : base.keyClaims,
    whyItMatters: result.whyItMatters || base.whyItMatters,
    suggestedSpaceIds: result.suggestedSpaceIds.length > 0 ? result.suggestedSpaceIds : base.suggestedSpaceIds,
  };
}

export const createFileIngestDraft = (file: File, onTextFileReady: (draft: IngestDraft) => void): IngestDraft | null => {
  const fileType = file.type;
  const name = file.name;

  if (fileType.startsWith('image/')) {
    const imgUrl = URL.createObjectURL(file);

    return {
      type: 'image',
      initialFields: {
        title: name,
        thumbnail: imgUrl,
        content: `Uploaded photograph: ${name}. Format: ${fileType}.`,
        ...getFileMetadata(file),
      },
      resolve: async (item) => {
        await storeFile(item.id, file);

        // Read image as base64 for vision analysis
        const base64 = await readAsBase64(file);

        const base: Item = {
          ...item,
          title: name.replace(/\.[^/.]+$/, ''),
          thumbnail: makeFileRef(item.id),
          originalFileRef: makeFileRef(item.id),
          ...getFileMetadata(file),
          summary: '',
          colorPalette: ['#2E2D2A', '#8F908A', '#DFDFDB', '#5E6652'],
          tags: ['upload', 'image'],
        };

        // Call vision analysis
        try {
          const vision = await aiClient.analyzeImage({
            imageBase64: base64,
            title: base.title,
          });
          if (vision.summary) {
            base.summary = vision.summary;
            base.content = vision.summary;
          }
          if (vision.tags.length > 0) base.tags = [...new Set([...base.tags, ...vision.tags])];
          if (vision.colorPalette.length > 0) base.colorPalette = vision.colorPalette;
          if (vision.subjects.length > 0) base.content = [vision.summary, ...vision.subjects].filter(Boolean).join('. ');
          if (vision.whyItMatters) base.whyItMatters = vision.whyItMatters;
        } catch { /* vision is optional */ }

        // Then run analyze-card + embed on the enriched content
        return enrichWithAI(base);
      },
    };
  }

  const lowerName = name.toLowerCase();
  const docExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.key', '.pages', '.numbers', '.csv', '.txt', '.md', '.markdown'];
  const isDoc = docExtensions.some((ext) => lowerName.endsWith(ext)) || fileType === 'application/pdf' || fileType === 'text/plain' || fileType === 'text/markdown' || fileType.includes('msword') || fileType.includes('officedocument') || fileType.includes('excel') || fileType.includes('powerpoint');

  if (isDoc) {
    const sizeStr = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
    const ext = name.split('.').pop()?.toLowerCase() || 'doc';

    return {
      type: 'pdf',
      initialFields: {
        title: name,
        content: `Extracting content from ${name}...`,
        fileSize: sizeStr,
        ...getFileMetadata(file),
      },
      resolve: async (item) => {
        // Extract real text content from the document.
        const extracted = await extractDocumentText(file);
        let docContent = extracted.success
          ? extracted.text
          : `${ext.toUpperCase()} Document: ${name}. size: ${sizeStr}.`;

        const base: Item = {
          ...item,
          title: name,
          content: docContent,
          fileSize: sizeStr,
          ...getFileMetadata(file),
          fileExtension: ext,
          mimeType: fileType || 'application/octet-stream',
          pageCount: extracted.pageCount,
          summary: '',
          tags: ['document', ext],
        };

        const isPdf = ext === 'pdf' || fileType === 'application/pdf';
        const isConvertibleOffice = isOfficeFileForPdfPreview(ext, fileType);

        // Store and convert Office files through LibreOffice so detail view can
        // show a faithful PDF preview instead of a clipped HTML approximation.
        if (isConvertibleOffice) {
          await storeFile(item.id + '-original', file);
          base.originalFileRef = makeFileRef(item.id + '-original');

          try {
            const converted = await convertOfficeToPdf(file);
            const pdfFile = new File([converted], `${name.replace(/\.[^/.]+$/, '')}.pdf`, { type: 'application/pdf' });

            await storeFile(item.id + '-preview-pdf', pdfFile);
            base.previewPdfRef = makeFileRef(item.id + '-preview-pdf');

            const convertedText = await extractDocumentText(pdfFile);
            if (convertedText.success) {
              docContent = convertedText.text;
              base.content = docContent;
              base.pageCount = convertedText.pageCount;
            }

            const thumbBlob = await renderPdfFirstPage(pdfFile, { trimWhitespace: isPresentationFile(ext, fileType) });
            if (thumbBlob) {
              await storeFile(item.id + '-thumb', thumbBlob);
              base.thumbnail = makeFileRef(item.id + '-thumb');
            }
          } catch (err) {
            console.error('[ingestion] LibreOffice conversion failed:', err);
          }
        }

        // For PDFs: render first page as thumbnail and store original file for later
        if (isPdf) {
          const thumbBlob = await renderPdfFirstPage(file, { trimWhitespace: true });
          if (thumbBlob) {
            await storeFile(item.id + '-thumb', thumbBlob);
            base.thumbnail = makeFileRef(item.id + '-thumb');
          }
          // Store original PDF for on-demand page rendering in detail view
          await storeFile(item.id + '-pdf', file);
          base.originalFileRef = makeFileRef(item.id + '-pdf');
        }

        // Store docx for on-demand rendering with docx-preview
        if (ext === 'docx' && !base.previewPdfRef) {
          await storeFile(item.id + '-docx', file);
          base.originalFileRef = makeFileRef(item.id + '-docx');
          // Generate docx thumbnail
          if (!base.thumbnail) {
            const thumbBlob = await renderDocxThumbnail(file);
            if (thumbBlob) {
              await storeFile(item.id + '-thumb', thumbBlob);
              base.thumbnail = makeFileRef(item.id + '-thumb');
            }
          }
        }

        // Generate text thumbnail for txt/md files
        if ((ext === 'txt' || ext === 'md' || ext === 'markdown') && !base.thumbnail && docContent) {
          const thumbBlob = await renderTextThumbnail(docContent, name);
          if (thumbBlob) {
            await storeFile(item.id + '-thumb', thumbBlob);
            base.thumbnail = makeFileRef(item.id + '-thumb');
          }
        }

        if (!base.originalFileRef) {
          await storeFile(item.id + '-original', file);
          base.originalFileRef = makeFileRef(item.id + '-original');
        }

        return enrichWithAI(base);
      },
    };
  }

  // Video files
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.m4v'];
  const isVideo = file.type.startsWith('video/') || videoExtensions.some((ext) => lowerName.endsWith(ext));

  if (isVideo) {
    const MAX_VIDEO_SIZE = 1000 * 1024 * 1024; // 1000MB
    if (file.size > MAX_VIDEO_SIZE) {
      alert(`Video file is too large. Maximum size is 1000MB. Your file is ${(file.size / (1024 * 1024)).toFixed(0)}MB.`);
      return null;
    }

    const sizeStr = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
    const videoUrl = URL.createObjectURL(file);

    return {
      type: 'video',
      initialFields: {
        title: name,
        content: `Video file: ${name}. Format: ${fileType}. Size: ${sizeStr}.`,
        thumbnail: videoUrl,
      },
      resolve: async (item) => {
        // Store video file in IndexedDB
        await storeFile(item.id, file);

        // Extract duration and thumbnail from video
        let duration = '';
        let thumbnailBlob: Blob | null = null;

        try {
          const videoEl = document.createElement('video');
          videoEl.preload = 'metadata';
          videoEl.muted = true;
          videoEl.playsInline = true;

          await new Promise<void>((resolve, reject) => {
            videoEl.onloadedmetadata = () => resolve();
            videoEl.onerror = () => reject(new Error('Failed to load video metadata'));
            videoEl.src = videoUrl;
          });

          // Get duration
          const totalSeconds = Math.floor(videoEl.duration);
          const minutes = Math.floor(totalSeconds / 60);
          const seconds = totalSeconds % 60;
          duration = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

          // Seek to 1 second for thumbnail (or 0 if video is shorter)
          const seekTime = Math.min(1, videoEl.duration * 0.1);
          await new Promise<void>((resolve) => {
            videoEl.onseeked = () => resolve();
            videoEl.currentTime = seekTime;
          });

          // Capture frame to canvas
          const canvas = document.createElement('canvas');
          canvas.width = videoEl.videoWidth || 640;
          canvas.height = videoEl.videoHeight || 360;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
            thumbnailBlob = await new Promise<Blob | null>((resolve) => {
              canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.8);
            });
          }

          videoEl.remove();
        } catch (err) {
          console.error('[ingestion] Failed to extract video metadata/thumbnail:', err);
        }

        const base: Item = {
          ...item,
          title: name.replace(/\.[^/.]+$/, ''),
          content: `Video file: ${name}. Format: ${fileType}. Size: ${sizeStr}.`,
          summary: '',
          duration,
          fileSize: sizeStr,
          ...getFileMetadata(file),
          fileExtension: getFileExtension(name, 'mp4'),
          mimeType: fileType || 'application/octet-stream',
          tags: ['video', 'upload'],
        };

        // Store thumbnail if generated
        if (thumbnailBlob) {
          await storeFile(item.id + '-thumb', thumbnailBlob);
          base.thumbnail = makeFileRef(item.id + '-thumb');
        }

        // Store original video file reference
        base.originalFileRef = makeFileRef(item.id);

        // AI analysis for video
        try {
          const MAX_BASE64_SIZE = 30 * 1024 * 1024; // 30MB limit for base64 upload
          if (file.size <= MAX_BASE64_SIZE) {
            // Use video understanding API for smaller videos
            const videoBase64 = await readAsBase64(file);
            const vision = await aiClient.analyzeVideo({
              videoBase64,
              title: base.title,
            });
            if (vision.summary) {
              base.summary = vision.summary;
              base.content = vision.summary;
            }
            if (vision.tags.length > 0) base.tags = [...new Set([...base.tags, ...vision.tags])];
            if (vision.subjects.length > 0) base.content = [vision.summary, ...vision.subjects].filter(Boolean).join('. ');
            if (vision.whyItMatters) base.whyItMatters = vision.whyItMatters;
          } else if (thumbnailBlob) {
            // For large videos, analyze thumbnail as fallback
            const thumbBase64 = await readAsBase64(new File([thumbnailBlob], 'thumb.jpg', { type: 'image/jpeg' }));
            const vision = await aiClient.analyzeImage({
              imageBase64: thumbBase64,
              title: base.title,
            });
            if (vision.summary) {
              base.summary = `[Video thumbnail] ${vision.summary}`;
              base.content = base.summary;
            }
            if (vision.tags.length > 0) base.tags = [...new Set([...base.tags, ...vision.tags])];
            if (vision.subjects.length > 0) base.content = [base.summary, ...vision.subjects].filter(Boolean).join('. ');
            if (vision.whyItMatters) base.whyItMatters = vision.whyItMatters;
          }
        } catch {
          /* video analysis is optional */
        }

        return enrichWithAI(base);
      },
    };
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    const text = (event.target?.result as string) || '';

    onTextFileReady({
      type: 'note',
      initialFields: {
        title: name,
        content: text,
        ...getFileMetadata(file),
      },
      resolve: async (item) => {
        await storeFile(item.id + '-original', file);
        const base: Item = {
          ...item,
          title: name.replace(/\.[^/.]+$/, ''),
          content: text,
          summary: '',
          originalFileRef: makeFileRef(item.id + '-original'),
          ...getFileMetadata(file),
          tags: ['note', 'text-extract'],
          noteBgColor: 'rgba(224, 234, 238, 0.65)',
        };
        return enrichWithAI(base);
      },
    });
  };
  reader.readAsText(file);

  return null;
};

export const createSearchSubmitDraft = (
  value: string,
  opts?: { title?: string; selectedText?: string; tags?: string[]; note?: string; kind?: string; screenshot?: string },
): IngestDraft => {
  const trimmed = value.trim();

  if (isHttpUrl(trimmed)) {
    // Image context menu: save as image card
    if (opts?.kind === 'image') {
      const filename = trimmed.split('/').pop()?.split('?')[0] || 'image';
      return {
        type: 'image',
        initialFields: {
          title: opts?.title || filename,
          sourceUrl: trimmed,
          thumbnail: trimmed,
          content: `Saved image: ${trimmed}`,
        },
        resolve: async (item) => {
          const base: Item = {
            ...item,
            type: 'image',
            title: opts?.title || filename,
            thumbnail: trimmed,
            sourceUrl: trimmed,
            content: `Saved image from ${trimmed}`,
            summary: '',
            tags: ['image', 'web-clip', ...(opts?.tags || [])],
            clipNote: opts?.note,
          };
          return enrichWithAI(base);
        },
      };
    }

    // Normal link clip
    return {
      type: 'link',
      initialFields: {
        title: opts?.title || 'Retrieving website info...',
        sourceUrl: trimmed,
        content: opts?.selectedText || `Imported link reference: ${trimmed}`,
        thumbnail: opts?.screenshot || undefined,
      },
      resolve: async (item) => {
        const hostname = new URL(trimmed).hostname;
        const clipTags = opts?.tags || [];

        try {
          const meta = await aiClient.scrapeUrl({ url: trimmed });
          const scraped: Item = {
            ...item,
            title: opts?.title || meta.title || `${hostname} - Web Bookmark`,
            thumbnail: opts?.screenshot || meta.image || undefined,
            summary: opts?.selectedText ? opts.selectedText.slice(0, 200) : meta.description || '',
            content: opts?.selectedText || meta.description || `Imported link reference: ${trimmed}`,
            tags: ['link', 'web', hostname.replace('www.', ''), ...clipTags],
            clipNote: opts?.note,
          };
          return enrichWithAI(scraped);
        } catch {
          const fallback: Item = {
            ...item,
            title: opts?.title || `${hostname} - Web Bookmark`,
            thumbnail: opts?.screenshot || undefined,
            summary: opts?.selectedText?.slice(0, 200) || '',
            tags: ['link', 'web', hostname.replace('www.', ''), ...clipTags],
            clipNote: opts?.note,
          };
          return enrichWithAI(fallback);
        }
      },
    };
  }

  return {
    type: 'note',
    initialFields: {
      content: trimmed,
      title: 'Captured Note',
    },
    resolve: async (item) => {
      const titleSnippet = trimmed.length > 25 ? `${trimmed.slice(0, 25)}...` : trimmed;
      const base: Item = {
        ...item,
        content: trimmed,
        title: titleSnippet,
        summary: '',
        tags: ['note', 'capture'],
        noteBgColor: 'rgba(238, 224, 230, 0.65)',
      };
      return enrichWithAI(base);
    },
  };
};

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] || '');
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteString = atob(base64);
  const bytes = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i += 1) {
    bytes[i] = byteString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

function isOfficeFileForPdfPreview(ext: string, mimeType: string): boolean {
  return ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'odp', 'ods', 'odt'].includes(ext)
    || mimeType.includes('msword')
    || mimeType.includes('officedocument')
    || mimeType.includes('powerpoint')
    || mimeType.includes('presentation')
    || mimeType.includes('excel')
    || mimeType.includes('spreadsheet');
}

function isPresentationFile(ext: string, mimeType: string): boolean {
  return ['ppt', 'pptx', 'odp'].includes(ext)
    || mimeType.includes('powerpoint')
    || mimeType.includes('presentation');
}

async function convertOfficeToPdf(file: File): Promise<Blob> {
  const fileBase64 = await readAsBase64(file);
  const response = await fetch('/api/files/convert-office', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      fileBase64,
      mimeType: file.type,
    }),
  });

  const payload = await response.json() as { pdfBase64?: string; mimeType?: string; error?: string };
  if (!response.ok || !payload.pdfBase64) {
    throw new Error(payload.error || 'Office conversion failed');
  }

  return base64ToBlob(payload.pdfBase64, payload.mimeType || 'application/pdf');
}
