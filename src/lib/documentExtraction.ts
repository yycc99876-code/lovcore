/**
 * Document text extraction for Lovcore.
 *
 * Extracts plain text from uploaded files for AI analysis.
 * Supports: txt, md, pdf, docx. Graceful fallback for others.
 */

export interface ExtractionResult {
  text: string;
  pageCount?: number;
  success: boolean;
}

const MAX_TEXT_LENGTH = 50000;
const PDF_TIMEOUT_MS = 15000;

/**
 * Extract text from a File object.
 * Returns extracted text and optional page count.
 */
export async function extractDocumentText(file: File): Promise<ExtractionResult> {
  const name = file.name.toLowerCase();

  try {
    if (name.endsWith('.txt') || file.type === 'text/plain') {
      return extractPlainText(file);
    }

    if (name.endsWith('.md') || name.endsWith('.markdown') || file.type === 'text/markdown') {
      return extractMarkdown(file);
    }

    if (name.endsWith('.pdf') || file.type === 'application/pdf') {
      return extractPdfText(file);
    }

    if (name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return extractDocxText(file);
    }

    if (
      name.endsWith('.ppt')
      || name.endsWith('.pptx')
      || name.endsWith('.xls')
      || name.endsWith('.xlsx')
      || name.endsWith('.key')
      || name.endsWith('.pages')
      || name.endsWith('.numbers')
      || file.type.includes('presentation')
      || file.type.includes('powerpoint')
      || file.type.includes('spreadsheet')
      || file.type.includes('excel')
    ) {
      return unsupportedBinaryDocument(file);
    }

    // .doc (legacy binary format) cannot be parsed client-side
    if (name.endsWith('.doc') || file.type === 'application/msword') {
      return unsupportedBinaryDocument(file);
    }

    // Fallback: try reading as plain text
    return extractPlainText(file);
  } catch {
    return { text: '', success: false };
  }
}

function unsupportedBinaryDocument(file: File): ExtractionResult {
  const ext = file.name.split('.').pop()?.toUpperCase() || 'DOCUMENT';
  return {
    text: `${ext} file: ${file.name}. Native preview requires server-side conversion to PDF or images.`,
    success: false,
  };
}

async function extractPlainText(file: File): Promise<ExtractionResult> {
  const text = await readAsText(file);
  return {
    text: truncate(text),
    success: text.length > 0,
  };
}

async function extractMarkdown(file: File): Promise<ExtractionResult> {
  const raw = await readAsText(file);
  // Keep markdown formatting for display — only strip images and horizontal rules
  const text = raw
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '') // images (can't display)
    .replace(/---+/g, '')            // horizontal rules
    .trim();

  return {
    text: truncate(text),
    pageCount: undefined,
    success: text.length > 0,
  };
}

async function extractDocxText(file: File): Promise<ExtractionResult> {
  const arrayBuffer = await file.arrayBuffer();
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ arrayBuffer });
  const text = (result.value || '').trim();

  return {
    text: truncate(text),
    pageCount: undefined,
    success: text.length > 0,
  };
}

async function extractPdfText(file: File): Promise<ExtractionResult> {
  const arrayBuffer = await file.arrayBuffer();

  // Dynamic import to avoid loading pdfjs unless needed
  const pdfjsLib = await import('pdfjs-dist');

  // Set worker source
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url,
  ).toString();

  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });

  const pdf = await Promise.race([
    loadingTask.promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('PDF timeout')), PDF_TIMEOUT_MS)
    ),
  ]);

  const pageCount = pdf.numPages;
  const parts: string[] = [];

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : '') || '')
      .join(' ');
    if (pageText.trim()) parts.push(pageText.trim());
  }

  const text = parts.join('\n\n');

  return {
    text: truncate(text),
    pageCount,
    success: text.length > 0,
  };
}

/**
 * Render the first page of a PDF as a PNG blob for use as a thumbnail.
 * Returns null on failure (graceful fallback).
 */
export async function renderPdfFirstPage(file: File, opts: { trimWhitespace?: boolean } = {}): Promise<Blob | null> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfjsLib = await import('pdfjs-dist');

    // Disable worker — run on main thread to avoid worker URL resolution issues in Vite
    pdfjsLib.GlobalWorkerOptions.workerPort = null;

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);

    const scale = 1.5;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('[renderPdfFirstPage] Failed to get 2d context');
      return null;
    }

    await page.render({ canvas, canvasContext: ctx, viewport }).promise;

    const outputCanvas = opts.trimWhitespace ? cropWhitespace(canvas) : canvas;

    return new Promise((resolve) => {
      outputCanvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/png');
    });
  } catch (err) {
    console.error('[renderPdfFirstPage] Error:', err);
    return null;
  }
}

/**
 * Render a docx file as a thumbnail image using docx-preview + html2canvas.
 */
export async function renderDocxThumbnail(file: File): Promise<Blob | null> {
  try {
    const { renderAsync } = await import('docx-preview');
    const html2canvas = (await import('html2canvas')).default;

    // Create off-screen container
    const container = document.createElement('div');
    container.style.cssText =
      'position:fixed;left:-9999px;top:0;width:840px;background:#fff;padding:60px;font-family:Georgia,serif;font-size:15px;line-height:1.6;color:#1f2937;overflow:hidden;';
    document.body.appendChild(container);

    await renderAsync(await file.arrayBuffer(), container, undefined, {
      inWrapper: false,
      ignoreWidth: true,
    });

    // Limit visible height to ~1188px (A4 proportions)
    container.style.height = '1188px';
    container.style.overflow = 'hidden';

    const canvas = await html2canvas(container, { scale: 1.5, useCORS: true });
    document.body.removeChild(container);

    return new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/png');
    });
  } catch (err) {
    console.error('[renderDocxThumbnail] Error:', err);
    return null;
  }
}

/**
 * Render all pages of a docx file as PNG blobs.
 * Uses docx-preview + html2canvas to capture page-sized chunks.
 */
export async function renderDocxPages(file: File, maxPages = 20): Promise<Blob[]> {
  try {
    const { renderAsync } = await import('docx-preview');
    const html2canvas = (await import('html2canvas')).default;

    // Render docx to HTML in off-screen container
    const container = document.createElement('div');
    container.style.cssText =
      'position:fixed;left:-9999px;top:0;width:840px;background:#fff;padding:60px;font-family:Georgia,serif;font-size:15px;line-height:1.6;color:#1f2937;';
    document.body.appendChild(container);

    await renderAsync(await file.arrayBuffer(), container, undefined, {
      inWrapper: false,
      ignoreWidth: true,
    });

    const PAGE_HEIGHT = 1188; // A4 proportions at 840px wide
    const totalHeight = container.scrollHeight;
    const pageCount = Math.min(Math.ceil(totalHeight / PAGE_HEIGHT), maxPages);
    const blobs: Blob[] = [];

    // Set container to clip to page height for each screenshot
    container.style.height = `${PAGE_HEIGHT}px`;
    container.style.overflow = 'hidden';

    for (let i = 0; i < pageCount; i++) {
      // Scroll to the correct position for this page
      container.style.marginTop = `${-i * PAGE_HEIGHT}px`;

      const canvas = await html2canvas(container, { scale: 1.5, useCORS: true });
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/png');
      });
      if (blob) blobs.push(blob);
    }

    document.body.removeChild(container);
    return blobs;
  } catch (err) {
    console.error('[renderDocxPages] Error:', err);
    return [];
  }
}

/**
 * Render plain text / markdown as a styled A4 page thumbnail.
 */
export async function renderTextThumbnail(text: string, title: string): Promise<Blob | null> {
  try {
    const html2canvas = (await import('html2canvas')).default;

    const container = document.createElement('div');
    container.style.cssText =
      'position:fixed;left:-9999px;top:0;width:840px;height:1188px;background:#fff;padding:60px 56px;overflow:hidden;font-family:Georgia,serif;color:#1f2937;';
    document.body.appendChild(container);

    // Build styled HTML
    const titleEl = document.createElement('h1');
    titleEl.textContent = title.replace(/\.[^/.]+$/, '');
    titleEl.style.cssText = 'font-size:26px;font-weight:600;margin:0 0 16px 0;color:#111827;line-height:1.3;';
    container.appendChild(titleEl);

    const divider = document.createElement('div');
    divider.style.cssText = 'height:2px;background:#e5e7eb;margin:0 0 24px 0;';
    container.appendChild(divider);

    const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim()).slice(0, 15);
    for (const para of paragraphs) {
      const p = document.createElement('p');
      p.textContent = para.replace(/\n/g, ' ').trim().slice(0, 300);
      p.style.cssText = 'font-size:14px;line-height:1.65;margin:0 0 10px 0;color:#374151;';
      container.appendChild(p);
    }

    const canvas = await html2canvas(container, { scale: 1.5, useCORS: true });
    document.body.removeChild(container);

    return new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/png');
    });
  } catch (err) {
    console.error('[renderTextThumbnail] Error:', err);
    return null;
  }
}

/**
 * Render all pages of a PDF as PNG blobs.
 * Returns an array of blobs (one per page), or empty array on failure.
 */
export async function renderPdfPages(file: File, maxPages = 20, opts: { trimWhitespace?: boolean } = {}): Promise<Blob[]> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfjsLib = await import('pdfjs-dist');

    pdfjsLib.GlobalWorkerOptions.workerPort = null;

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pageCount = Math.min(pdf.numPages, maxPages);
    const blobs: Blob[] = [];

    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i);
      const scale = 1.5;
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      await page.render({ canvas, canvasContext: ctx, viewport }).promise;

      const outputCanvas = opts.trimWhitespace ? cropWhitespace(canvas) : canvas;
      const blob = await new Promise<Blob | null>((resolve) => {
        outputCanvas.toBlob((b) => resolve(b), 'image/png');
      });
      if (blob) blobs.push(blob);
    }

    return blobs;
  } catch (err) {
    console.error('[renderPdfPages] Error:', err);
    return [];
  }
}

function cropWhitespace(source: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = source.getContext('2d', { willReadFrequently: true });
  if (!ctx) return source;

  const { width, height } = source;
  const data = ctx.getImageData(0, 0, width, height).data;
  const threshold = 246;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];
      if (a > 8 && (r < threshold || g < threshold || b < threshold)) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (minX >= maxX || minY >= maxY) return source;

  const contentWidth = maxX - minX + 1;
  const contentHeight = maxY - minY + 1;
  const contentAreaRatio = (contentWidth * contentHeight) / (width * height);
  if (contentAreaRatio > 0.82) return source;

  const margin = Math.round(Math.min(width, height) * 0.035);
  const sx = Math.max(0, minX - margin);
  const sy = Math.max(0, minY - margin);
  const sw = Math.min(width - sx, contentWidth + margin * 2);
  const sh = Math.min(height - sy, contentHeight + margin * 2);

  const target = document.createElement('canvas');
  target.width = sw;
  target.height = sh;
  const targetCtx = target.getContext('2d');
  if (!targetCtx) return source;
  targetCtx.fillStyle = '#ffffff';
  targetCtx.fillRect(0, 0, sw, sh);
  targetCtx.drawImage(source, sx, sy, sw, sh, 0, 0, sw, sh);
  return target;
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string) || '');
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function truncate(text: string): string {
  if (text.length <= MAX_TEXT_LENGTH) return text;
  return text.slice(0, MAX_TEXT_LENGTH) + '…';
}
