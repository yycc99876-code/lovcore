/**
 * Lovcore Clipper — Clip payload construction and validation
 * Defines the stable v1 schema for extension → Lovcore communication.
 */

import { PAYLOAD_VERSION } from './constants.js';

/**
 * @typedef {'page' | 'selection' | 'link' | 'image'} ClipType
 */

/**
 * @typedef {Object} ClipPayload
 * @property {number} version - Schema version
 * @property {string} clipId - Unique clip identifier
 * @property {'extension'} source - Always "extension"
 * @property {ClipType} type - What is being clipped
 * @property {string} url - Source URL
 * @property {string} [title] - Page or content title
 * @property {string} [selectedText] - Selected text on the page
 * @property {string} [imageUrl] - Image URL (for image clips)
 * @property {string} [screenshot] - Base64 JPEG screenshot
 * @property {string} [note] - User-added note
 * @property {number} createdAt - Timestamp (ms)
 */

/**
 * Generate a unique clip ID.
 */
export function generateClipId() {
  return `clip-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Build a validated ClipPayload.
 * @param {Partial<ClipPayload>} fields
 * @returns {ClipPayload}
 */
export function buildPayload(fields) {
  const now = Date.now();
  return {
    version: PAYLOAD_VERSION,
    clipId: fields.clipId || generateClipId(),
    source: 'extension',
    type: fields.type || 'page',
    url: fields.url || '',
    title: fields.title || undefined,
    selectedText: fields.selectedText || undefined,
    imageUrl: fields.imageUrl || undefined,
    screenshot: fields.screenshot || undefined,
    note: fields.note || undefined,
    createdAt: fields.createdAt || now,
  };
}

/**
 * Validate a ClipPayload has minimum required fields.
 * @param {ClipPayload} payload
 * @returns {{ valid: boolean, error?: string }}
 */
export function validatePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Payload is not an object' };
  }
  if (!payload.clipId || typeof payload.clipId !== 'string') {
    return { valid: false, error: 'Missing clipId' };
  }
  if (!payload.url || typeof payload.url !== 'string') {
    return { valid: false, error: 'Missing url' };
  }
  if (!['page', 'selection', 'link', 'image'].includes(payload.type)) {
    return { valid: false, error: `Invalid type: ${payload.type}` };
  }
  if (payload.source !== 'extension') {
    return { valid: false, error: `Invalid source: ${payload.source}` };
  }
  return { valid: true };
}

/**
 * Strip large fields for history storage (don't persist screenshot base64).
 * @param {ClipPayload} payload
 * @returns {Partial<ClipPayload>}
 */
export function toHistoryEntry(payload) {
  return {
    clipId: payload.clipId,
    type: payload.type,
    url: payload.url,
    title: payload.title,
    hasScreenshot: !!payload.screenshot,
    createdAt: payload.createdAt,
  };
}
