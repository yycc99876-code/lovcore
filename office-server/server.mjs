import http from 'node:http';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { createClient } from '@supabase/supabase-js';

const execFileAsync = promisify(execFile);

const PORT = Number(process.env.PORT || 8080);
const SOFFICE_PATH = process.env.LIBREOFFICE_PATH || 'libreoffice';
const CONVERT_TIMEOUT_MS = Number(process.env.CONVERT_TIMEOUT_MS || 90_000);
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES || 80 * 1024 * 1024);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

function isOriginAllowed(origin) {
  if (!origin || ALLOWED_ORIGINS.length === 0) return true;
  return ALLOWED_ORIGINS.includes(origin);
}

function setCors(res, origin) {
  if (isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

async function readJson(req) {
  let total = 0;
  const chunks = [];
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_BODY_BYTES) {
      throw Object.assign(new Error('Request body too large'), { statusCode: 413 });
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

async function verifyToken(req) {
  if (!supabase) return { ok: true };
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return { ok: false, reason: 'Missing auth token' };

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return { ok: false, reason: error?.message || 'Invalid auth token' };
  }
  return { ok: true, userId: data.user.id };
}

function sanitizeFileName(fileName) {
  const fallback = 'document';
  const base = path.basename(fileName || fallback).replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim();
  return base || fallback;
}

async function convertOfficeToPdf({ fileName, fileBase64 }) {
  if (!fileName || !fileBase64) {
    throw Object.assign(new Error('fileName and fileBase64 are required'), { statusCode: 400 });
  }

  const workDir = await mkdtemp(path.join(tmpdir(), 'lovcore-office-'));
  try {
    const safeName = sanitizeFileName(fileName);
    const inputPath = path.join(workDir, safeName);
    await writeFile(inputPath, Buffer.from(fileBase64, 'base64'));

    await execFileAsync(
      SOFFICE_PATH,
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

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  setCors(res, origin);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'GET' && url.pathname === '/health') {
    sendJson(res, 200, { ok: true, service: 'lovcore-office-server' });
    return;
  }

  if (req.method !== 'POST' || url.pathname !== '/convert-office') {
    sendJson(res, 404, { error: 'Not found' });
    return;
  }

  if (!isOriginAllowed(origin)) {
    sendJson(res, 403, { error: 'Origin not allowed' });
    return;
  }

  const auth = await verifyToken(req);
  if (!auth.ok) {
    sendJson(res, 401, { error: auth.reason });
    return;
  }

  try {
    const body = await readJson(req);
    const result = await convertOfficeToPdf(body);
    sendJson(res, 200, result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    console.error('[office-server] conversion error:', error);
    sendJson(res, statusCode, { error: error.message || 'Office conversion failed' });
  }
});

server.listen(PORT, () => {
  console.log(`[office-server] listening on :${PORT}`);
});
