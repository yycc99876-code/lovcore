import { supabase } from './supabaseClient';

export function readAsBase64(file: Blob): Promise<string> {
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

export function isOfficeFileForPdfPreview(ext: string, mimeType: string): boolean {
  const normalizedExt = ext.toLowerCase();
  const normalizedMime = mimeType.toLowerCase();

  return ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'odp', 'ods', 'odt'].includes(normalizedExt)
    || normalizedMime.includes('msword')
    || normalizedMime.includes('officedocument')
    || normalizedMime.includes('powerpoint')
    || normalizedMime.includes('presentation')
    || normalizedMime.includes('excel')
    || normalizedMime.includes('spreadsheet');
}

export function isPresentationFile(ext: string, mimeType: string): boolean {
  const normalizedExt = ext.toLowerCase();
  const normalizedMime = mimeType.toLowerCase();

  return ['ppt', 'pptx', 'odp'].includes(normalizedExt)
    || normalizedMime.includes('powerpoint')
    || normalizedMime.includes('presentation');
}

export function isOfficePreviewCandidate(item: {
  fileExtension?: string;
  mimeType?: string;
  originalFileName?: string;
  title?: string;
}): boolean {
  const extensionFromName = (item.originalFileName || item.title || '').split('.').pop()?.toLowerCase() || '';
  const ext = item.fileExtension?.toLowerCase() || extensionFromName;
  return isOfficeFileForPdfPreview(ext, item.mimeType || '');
}

export async function convertOfficeToPdf(file: File): Promise<Blob> {
  const fileBase64 = await readAsBase64(file);
  const officeConvertUrl = (import.meta.env.VITE_OFFICE_CONVERT_URL as string | undefined)?.replace(/\/$/, '');
  const endpoint = officeConvertUrl ? `${officeConvertUrl}/convert-office` : '/api/files/convert-office';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (officeConvertUrl && supabase) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
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
