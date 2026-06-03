/**
 * Lovcore Clipper — Shared constants
 * All configuration values in one place.
 */

export const LOVCORE_URL = 'https://lovcore.com';
export const LOVCORE_ORIGIN = 'https://lovcore.com';
export const LOVCORE_ORIGINS = [
  'https://lovcore.com',
  'https://www.lovcore.com',
  'https://lovcore.vercel.app',
];

/** Time-to-live for a clip payload in chrome.storage.session (ms) */
export const CLIP_TTL_MS = 5 * 60 * 1000;

/** Max delivery attempts when injecting clip-data into Lovcore tab */
export const DELIVERY_ATTEMPTS = 16;

/** Delay between delivery attempts (ms) */
export const DELIVERY_INTERVAL_MS = 700;

/** Max retry queue entries */
export const QUEUE_MAX_SIZE = 20;

/** Queue entry TTL — 24 hours */
export const QUEUE_TTL_MS = 24 * 60 * 60 * 1000;

/** Max retry attempts per clip */
export const QUEUE_MAX_ATTEMPTS = 5;

/** Max clip history entries */
export const HISTORY_MAX_SIZE = 20;

/** Screenshot quality for captureVisibleTab (0-100) */
export const SCREENSHOT_QUALITY = 78;

/** Max screenshot size to store in queue (bytes). ~200KB */
export const SCREENSHOT_MAX_BYTES = 200 * 1024;

/** Extension version — keep in sync with manifest.json */
export const EXTENSION_VERSION = '3.0.0';

/** Payload schema version */
export const PAYLOAD_VERSION = 1;

/** Storage key prefixes */
export const STORAGE_PREFIX_CLIP = 'lovcoreClip:';
export const STORAGE_KEY_QUEUE = 'lovcoreQueue';
export const STORAGE_KEY_HISTORY = 'lovcoreHistory';
