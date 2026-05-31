import type { Item, ItemType } from '../types';
import { storeFile, makeFileRef } from './fileStore';
import { aiClient } from '../ai/client';

export type IngestResolver = (item: Item) => Item | Promise<Item>;

export interface IngestDraft {
  type: ItemType;
  initialFields: Partial<Item>;
  resolve: IngestResolver;
}

export const isHttpUrl = (value: string) => /^https?:\/\/[^\s$.?#].[^\s]*$/i.test(value);

export const createAnalyzingItem = (
  type: ItemType,
  initialFields: Partial<Item>,
): Item => ({
  id: Date.now().toString(),
  type,
  title: initialFields.title || 'Analyzing...',
  content: initialFields.content || '',
  summary: '',
  tags: [],
  status: 'analyzing',
  createdAt: new Date().toISOString(),
  ...initialFields,
});

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
      },
      resolve: async (item) => {
        await storeFile(item.id, file);
        return {
          ...item,
          title: name.replace(/\.[^/.]+$/, ''),
          thumbnail: makeFileRef(item.id),
          summary: `A user-uploaded image named '${name}'. Lovcore's vision system analyzed the visual balance and tone structure.`,
          colorPalette: ['#2E2D2A', '#8F908A', '#DFDFDB', '#5E6652'],
          tags: ['upload', 'image', 'color-dna', 'inspiration'],
        };
      },
    };
  }

  const lowerName = name.toLowerCase();
  const docExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.key', '.pages', '.numbers', '.csv'];
  const isDoc = docExtensions.some((ext) => lowerName.endsWith(ext)) || fileType === 'application/pdf' || fileType.includes('msword') || fileType.includes('officedocument') || fileType.includes('excel') || fileType.includes('powerpoint');

  if (isDoc) {
    const sizeStr = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
    const ext = name.split('.').pop()?.toLowerCase() || 'doc';

    return {
      type: 'pdf',
      initialFields: {
        title: name,
        content: `${ext.toUpperCase()} Document: ${name}. size: ${sizeStr}.`,
      },
      resolve: (item) => ({
        ...item,
        title: name,
        fileSize: sizeStr,
        pageCount: Math.floor(Math.random() * 40) + 5,
        summary: `An uploaded ${ext.toUpperCase()} document titled '${name}'. The content extractor parsed structure and metadata for deep indexing.`,
        tags: ['document', ext, 'archive', 'reading'],
      }),
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
      },
      resolve: (item) => ({
        ...item,
        title: name.replace(/\.[^/.]+$/, ''),
        summary: 'A note card imported from a text file, indexing raw thoughts and notes.',
        tags: ['note', 'text-extract', 'archived'],
        noteBgColor: 'rgba(224, 234, 238, 0.65)',
      }),
    });
  };
  reader.readAsText(file);

  return null;
};

export const createSearchSubmitDraft = (value: string): IngestDraft => {
  const trimmed = value.trim();

  if (isHttpUrl(trimmed)) {
    return {
      type: 'link',
      initialFields: {
        title: 'Retrieving website info...',
        sourceUrl: trimmed,
        content: `Imported link reference: ${trimmed}`,
      },
      resolve: async (item) => {
        const hostname = new URL(trimmed).hostname;

        try {
          const meta = await aiClient.scrapeUrl({ url: trimmed });
          return {
            ...item,
            title: meta.title || `${hostname} - Web Bookmark`,
            thumbnail: meta.image || '/images/token_refraction.png',
            summary: meta.description || `A bookmark reference pointing to ${trimmed}.`,
            content: meta.description || `Imported link reference: ${trimmed}`,
            tags: ['link', 'web', hostname.replace('www.', '')],
          };
        } catch {
          return {
            ...item,
            title: `${hostname} - Web Bookmark`,
            thumbnail: '/images/token_refraction.png',
            summary: `A bookmark reference pointing to ${trimmed}.`,
            tags: ['link', 'web', hostname.replace('www.', '')],
          };
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
    resolve: (item) => {
      const titleSnippet = trimmed.length > 25 ? `${trimmed.slice(0, 25)}...` : trimmed;

      return {
        ...item,
        content: trimmed,
        title: titleSnippet,
        summary: `A quick note captured directly from the search bar: "${trimmed}"`,
        tags: ['note', 'capture', 'quick-note'],
        noteBgColor: 'rgba(238, 224, 230, 0.65)',
      };
    },
  };
};
