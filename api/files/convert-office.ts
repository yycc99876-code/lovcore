import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { withHandler } from '../_handler.js';

const execFileAsync = promisify(execFile);

export interface ConvertOfficeRequest {
  fileName: string;
  fileBase64: string;
  mimeType?: string;
}

export interface ConvertOfficeResponse {
  pdfBase64: string;
  mimeType: 'application/pdf';
}

const DEFAULT_SOFFICE_PATH = 'C:\\Program Files\\LibreOffice\\program\\soffice.exe';
const CONVERT_TIMEOUT_MS = 60_000;

export async function handleConvertOffice(request: ConvertOfficeRequest): Promise<ConvertOfficeResponse> {
  if (!request.fileName || !request.fileBase64) {
    throw new Error('fileName and fileBase64 are required');
  }

  const sofficePath = process.env.LIBREOFFICE_PATH || DEFAULT_SOFFICE_PATH;
  const workDir = await mkdtemp(path.join(tmpdir(), 'lovcore-office-'));

  try {
    const safeName = sanitizeFileName(request.fileName);
    const inputPath = path.join(workDir, safeName);
    await writeFile(inputPath, Buffer.from(request.fileBase64, 'base64'));

    await execFileAsync(
      sofficePath,
      ['--headless', '--convert-to', 'pdf', '--outdir', workDir, inputPath],
      { timeout: CONVERT_TIMEOUT_MS, windowsHide: true },
    );

    const outputPath = path.join(workDir, `${path.parse(safeName).name}.pdf`);
    const pdfBuffer = await readFile(outputPath);

    return {
      pdfBase64: pdfBuffer.toString('base64'),
      mimeType: 'application/pdf',
    };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

export default withHandler(
  async (body) => handleConvertOffice(body as ConvertOfficeRequest),
  { isAi: false, timeoutMs: CONVERT_TIMEOUT_MS + 5_000 },
);

function sanitizeFileName(fileName: string): string {
  const fallback = 'document';
  const base = path.basename(fileName).replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim();
  return base || fallback;
}
