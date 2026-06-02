import type { Item } from '../types';

export function isPdfItem(item: Item): boolean {
  const title = item.title.toLowerCase();
  const tags = item.tags.map((tag) => tag.toLowerCase());
  const originalFileRef = item.originalFileRef?.toLowerCase() || '';

  return !!item.previewPdfRef
    || item.fileExtension?.toLowerCase() === 'pdf'
    || item.mimeType === 'application/pdf'
    || tags.includes('pdf')
    || tags.includes('document:pdf')
    || title.endsWith('.pdf')
    || title.includes('.pdf ')
    || originalFileRef.includes('-pdf');
}

export function isDocxItem(item: Item): boolean {
  const title = item.title.toLowerCase();
  const tags = item.tags.map((tag) => tag.toLowerCase());

  return item.fileExtension?.toLowerCase() === 'docx'
    || item.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    || tags.includes('docx')
    || title.endsWith('.docx');
}

/** Check if item is a generic file type (unknown binary, archive, CAD, etc.) */
export function isFileItem(item: Item): boolean {
  return item.type === 'file';
}

/** Check if item is an audio file. */
export function isAudioItem(item: Item): boolean {
  return item.type === 'audio';
}

export function isPlainDocumentItem(item: Item): boolean {
  const title = item.title.toLowerCase();
  const ext = item.fileExtension?.toLowerCase();

  // Video, audio, and generic file are not documents even if they have a fileExtension
  if (item.type === 'video' || item.type === 'audio' || item.type === 'file') return false;

  return isPdfItem(item)
    || isDocxItem(item)
    || item.type === 'pdf'
    || !!ext
    || title.endsWith('.txt')
    || title.endsWith('.md')
    || title.endsWith('.markdown');
}
