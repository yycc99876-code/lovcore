/**
 * File Upload API Stub — BACKEND
 *
 * Desired endpoint:
 *   POST /api/files/upload — upload file (image, audio, PDF, etc.)
 *
 * Flow:
 *   1. Browser sends file via multipart/form-data
 *   2. Backend validates file type and size
 *   3. Backend stores file (local storage, S3, OSS, etc.)
 *   4. Returns file reference/URL
 *
 * For voice transcription:
 *   - Audio blob uploaded here
 *   - Reference passed to /api/ai/transcribe
 */

export interface UploadResponse {
  fileId: string;
  filename: string;
  mimeType: string;
  size: number;
  url?: string; // If stored with a public URL
}

/**
 * POST /api/files/upload — STUB
 */
export async function handleUpload(_formData: FormData): Promise<UploadResponse> {
  throw new Error('File upload API not yet implemented.');
}
