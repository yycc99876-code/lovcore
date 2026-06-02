/**
 * File type detection helpers for Lovcore.
 *
 * Provides extension + MIME based classification so ingestion
 * can route files to the correct handler without relying solely
 * on file.type (which is often empty for unusual files).
 */

// ============================================================
// Extension Sets
// ============================================================

/** Extensions whose content can safely be read as UTF-8 text. */
export const TEXT_EXTENSIONS = new Set([
  'txt', 'md', 'markdown',
  'json', 'js', 'ts', 'jsx', 'tsx', 'mjs', 'cjs',
  'css', 'scss', 'less', 'html', 'htm', 'xml', 'svg',
  'yaml', 'yml', 'toml',
  'py', 'rb', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'hpp',
  'sh', 'bat', 'ps1',
  'csv', 'log', 'sql', 'env', 'ini', 'cfg', 'conf',
  'gitignore', 'dockerfile',
]);

/** Extensions for common audio formats. */
export const AUDIO_EXTENSIONS = new Set([
  'mp3', 'wav', 'm4a', 'webm', 'ogg', 'aac', 'flac', 'wma', 'opus',
]);

/** Extensions for common video formats. */
export const VIDEO_EXTENSIONS = new Set([
  'mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'm4v', 'wmv', 'flv',
]);

/** Extensions for Office / document formats that may need PDF conversion. */
export const OFFICE_EXTENSIONS = new Set([
  'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'odp', 'ods', 'odt', 'key', 'pages', 'numbers', 'csv', 'rtf',
]);

/** Extensions for archive / compressed formats. */
export const ARCHIVE_EXTENSIONS = new Set([
  'zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'tgz',
]);

/** Extensions for design / CAD source files. */
export const DESIGN_EXTENSIONS = new Set([
  'psd', 'ai', 'sketch', 'fig', 'xd', 'indd',
  'dwg', 'dxf', 'step', 'stp', 'iges', 'igs', 'stl', '3ds',
]);

// ============================================================
// File Kind Detection
// ============================================================

export type FileKind =
  | 'image'
  | 'pdf'
  | 'office'
  | 'video'
  | 'audio'
  | 'text'
  | 'archive'
  | 'design'
  | 'unknown';

/**
 * Get the extension from a filename, lowercased and without the dot.
 * Returns empty string if no extension found.
 */
export function getExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

/**
 * Determine the broad category of a file based on extension and MIME type.
 */
export function getFileKind(file: File): FileKind {
  const ext = getExtension(file.name);
  const mime = (file.type || '').toLowerCase();

  // Image
  if (mime.startsWith('image/') && !mime.includes('svg')) return 'image';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'ico', 'heic', 'heif', 'avif'].includes(ext)) return 'image';

  // PDF
  if (ext === 'pdf' || mime === 'application/pdf') return 'pdf';

  // Audio
  if (mime.startsWith('audio/') || AUDIO_EXTENSIONS.has(ext)) return 'audio';

  // Video
  if (mime.startsWith('video/') || VIDEO_EXTENSIONS.has(ext)) return 'video';

  // Office / document
  if (OFFICE_EXTENSIONS.has(ext)) return 'office';
  if (mime.includes('msword') || mime.includes('officedocument') || mime.includes('powerpoint') || mime.includes('excel') || mime.includes('spreadsheet') || mime.includes('presentation')) return 'office';

  // Text
  if (isTextLikeFile(file)) return 'text';

  // Archive
  if (ARCHIVE_EXTENSIONS.has(ext)) return 'archive';
  if (mime === 'application/zip' || mime === 'application/x-rar-compressed' || mime === 'application/x-7z-compressed' || mime === 'application/x-tar') return 'archive';

  // Design / CAD
  if (DESIGN_EXTENSIONS.has(ext)) return 'design';

  return 'unknown';
}

/**
 * Determine if a file's content is safe to read as UTF-8 text.
 *
 * Uses both extension whitelist and MIME type checks.
 * When MIME is empty (common for unusual files), falls back to extension only.
 * Returns false for binary files to prevent readAsText producing garbage.
 */
export function isTextLikeFile(file: File): boolean {
  const ext = getExtension(file.name);
  const mime = (file.type || '').toLowerCase();

  // Extension whitelist — most reliable signal
  if (TEXT_EXTENSIONS.has(ext)) return true;

  // MIME-based checks (less reliable but catches dynamically typed files)
  if (mime.startsWith('text/')) {
    // text/html, text/xml, text/csv etc. are text
    // but text/plain with a binary extension should be checked
    return true;
  }

  if (mime === 'application/json'
    || mime === 'application/xml'
    || mime === 'application/javascript'
    || mime === 'application/typescript'
    || mime === 'application/x-sh'
    || mime === 'application/csv') {
    return true;
  }

  // If MIME is empty and extension is not in any known binary set,
  // we still can't be sure it's text — default to NOT text for safety.
  return false;
}

/**
 * Format a byte count into a human-readable display string.
 * e.g. 1536 → "1.5 KB", 1048576 → "1.0 MB"
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Get a user-friendly label for a file kind.
 */
export function getFileKindLabel(kind: FileKind): string {
  switch (kind) {
    case 'image': return 'Image';
    case 'pdf': return 'PDF';
    case 'office': return 'Document';
    case 'video': return 'Video';
    case 'audio': return 'Audio';
    case 'text': return 'Text';
    case 'archive': return 'Archive';
    case 'design': return 'Design';
    default: return 'File';
  }
}
