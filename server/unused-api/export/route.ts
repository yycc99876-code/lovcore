/**
 * Export API Stubs 鈥?BACKEND
 *
 * Desired endpoints:
 *   POST /api/export/txt       鈥?plain text download
 *   POST /api/export/html      鈥?HTML download
 *   POST /api/export/markdown  鈥?Markdown download
 *   POST /api/export/pdf       鈥?PDF generation (Phase 2, backend-driven)
 *   POST /api/export/docx      鈥?DOCX generation (Phase 2, backend-driven)
 *
 * Phase 1 (TXT/HTML/MD) can run client-side.
 * Phase 2 (PDF/DOCX) should be backend-driven for consistent formatting.
 *
 * Input: Tiptap JSON or normalized HTML, NOT screenshots.
 */

export interface ExportRequest {
  title: string;
  body: {
    kind: 'tiptap';
    json: unknown;
    text: string;
    html?: string;
  };
  format: 'txt' | 'html' | 'markdown' | 'pdf' | 'docx';
}

export interface ExportResponse {
  filename: string;
  mimeType: string;
  content: string; // For text formats. Binary formats return a URL/reference.
}

/**
 * POST /api/export/:format 鈥?STUB
 * Phase 1 formats (txt, html, markdown) are implemented client-side.
 * Phase 2 formats (pdf, docx) will be implemented here.
 */
export async function handleExport(_req: ExportRequest): Promise<ExportResponse> {
  throw new Error('Server-side export not yet implemented. Using client-side export.');
}
