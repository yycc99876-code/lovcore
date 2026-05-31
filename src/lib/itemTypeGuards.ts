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

export function isPlainDocumentItem(item: Item): boolean {
  const title = item.title.toLowerCase();
  const ext = item.fileExtension?.toLowerCase();

  // Video and audio are not documents even if they have a fileExtension
  if (item.type === 'video' || item.type === 'audio') return false;

  return isPdfItem(item)
    || isDocxItem(item)
    || item.type === 'pdf'
    || !!ext
    || title.endsWith('.txt')
    || title.endsWith('.md')
    || title.endsWith('.markdown');
}
