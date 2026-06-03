/**
 * Lovcore Clipper — Retry queue and history
 * Uses chrome.storage.local for persistence across service worker restarts.
 */

import {
  QUEUE_MAX_SIZE,
  QUEUE_TTL_MS,
  QUEUE_MAX_ATTEMPTS,
  HISTORY_MAX_SIZE,
  SCREENSHOT_MAX_BYTES,
  STORAGE_KEY_QUEUE,
  STORAGE_KEY_HISTORY,
} from './constants.js';

// ─── Queue ───────────────────────────────────────────────

/**
 * @typedef {Object} QueueEntry
 * @property {string} id
 * @property {string} type - ClipType
 * @property {string} url
 * @property {string} [title]
 * @property {string} [selectedText]
 * @property {string} [imageUrl]
 * @property {string} [screenshot] - May be omitted if too large
 * @property {string} [note]
 * @property {number} createdAt
 * @property {number} updatedAt
 * @property {number} attempts
 * @property {'pending' | 'failed' | 'sending'} status
 * @property {string} [lastError]
 */

/**
 * Get all queue entries.
 * @returns {Promise<QueueEntry[]>}
 */
export async function getQueue() {
  const result = await chrome.storage.local.get(STORAGE_KEY_QUEUE);
  return result[STORAGE_KEY_QUEUE] || [];
}

/**
 * Save the queue array.
 * @param {QueueEntry[]} queue
 */
async function saveQueue(queue) {
  await chrome.storage.local.set({ [STORAGE_KEY_QUEUE]: queue });
}

/**
 * Add a clip to the retry queue.
 * Handles screenshot size gracefully — drops screenshot if too large.
 * @param {import('./clipPayload.js').ClipPayload} payload
 * @param {string} [error]
 * @returns {Promise<QueueEntry>}
 */
export async function enqueue(payload, error) {
  const queue = await getQueue();

  // Enforce max size — remove oldest entries
  while (queue.length >= QUEUE_MAX_SIZE) {
    queue.shift();
  }

  // Check screenshot size and drop if too large
  let screenshot = payload.screenshot;
  if (screenshot && screenshot.length > SCREENSHOT_MAX_BYTES) {
    screenshot = undefined; // Drop oversized screenshot
  }

  /** @type {QueueEntry} */
  const entry = {
    id: payload.clipId,
    type: payload.type,
    url: payload.url,
    title: payload.title,
    selectedText: payload.selectedText,
    imageUrl: payload.imageUrl,
    screenshot,
    note: payload.note,
    createdAt: payload.createdAt || Date.now(),
    updatedAt: Date.now(),
    attempts: 1,
    status: 'failed',
    lastError: error || 'Unknown error',
  };

  queue.push(entry);
  await saveQueue(queue);
  return entry;
}

/**
 * Update an existing queue entry.
 * @param {string} id
 * @param {Partial<QueueEntry>} updates
 */
export async function updateQueueEntry(id, updates) {
  const queue = await getQueue();
  const idx = queue.findIndex((e) => e.id === id);
  if (idx === -1) return;
  Object.assign(queue[idx], updates, { updatedAt: Date.now() });
  await saveQueue(queue);
}

/**
 * Remove an entry from the queue.
 * @param {string} id
 */
export async function dequeue(id) {
  const queue = await getQueue();
  await saveQueue(queue.filter((e) => e.id !== id));
}

/**
 * Get a specific queue entry.
 * @param {string} id
 * @returns {Promise<QueueEntry | undefined>}
 */
export async function getQueueEntry(id) {
  const queue = await getQueue();
  return queue.find((e) => e.id === id);
}

/**
 * Mark an entry as sending and increment attempts.
 * @param {string} id
 */
export async function markSending(id) {
  const entry = await getQueueEntry(id);
  await updateQueueEntry(id, {
    status: 'sending',
    attempts: (entry?.attempts || 0) + 1,
  });
}

/**
 * Mark an entry as failed.
 * @param {string} id
 * @param {string} error
 */
export async function markFailed(id, error) {
  await updateQueueEntry(id, { status: 'failed', lastError: error });
}

/**
 * Get pending/failed entries eligible for retry.
 * @returns {Promise<QueueEntry[]>}
 */
export async function getRetryable() {
  const queue = await getQueue();
  return queue.filter(
    (e) => e.status === 'failed' && e.attempts < QUEUE_MAX_ATTEMPTS
  );
}

/**
 * Remove expired entries from the queue.
 * @returns {Promise<number>} Number of entries removed.
 */
export async function cleanupExpired() {
  const queue = await getQueue();
  const now = Date.now();
  const filtered = queue.filter((e) => now - e.createdAt < QUEUE_TTL_MS);
  const removed = queue.length - filtered.length;
  if (removed > 0) {
    await saveQueue(filtered);
  }
  return removed;
}

// ─── History ─────────────────────────────────────────────

/**
 * @typedef {Object} HistoryEntry
 * @property {string} id
 * @property {string} type - ClipType
 * @property {string} url
 * @property {string} [title]
 * @property {string} domain
 * @property {boolean} hasScreenshot
 * @property {'success' | 'failed'} status
 * @property {number} createdAt
 */

/**
 * Get all history entries (newest first).
 * @returns {Promise<HistoryEntry[]>}
 */
export async function getHistory() {
  const result = await chrome.storage.local.get(STORAGE_KEY_HISTORY);
  return (result[STORAGE_KEY_HISTORY] || []).sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Save the history array.
 * @param {HistoryEntry[]} history
 */
async function saveHistory(history) {
  await chrome.storage.local.set({ [STORAGE_KEY_HISTORY]: history });
}

/**
 * Add an entry to clip history.
 * @param {HistoryEntry} entry
 */
export async function addHistory(entry) {
  const history = await getHistory();

  // Enforce max size — remove oldest
  while (history.length >= HISTORY_MAX_SIZE) {
    history.pop(); // Remove oldest (end of sorted array)
  }

  history.unshift(entry); // Add newest at front
  await saveHistory(history);
}

/**
 * Record a successful clip in history.
 * @param {import('./clipPayload.js').ClipPayload} payload
 */
export async function recordSuccess(payload) {
  let domain = '';
  try { domain = new URL(payload.url).hostname; } catch { /* ignore */ }

  await addHistory({
    id: payload.clipId,
    type: payload.type,
    url: payload.url,
    title: payload.title,
    domain,
    hasScreenshot: !!payload.screenshot,
    status: 'success',
    createdAt: payload.createdAt || Date.now(),
  });
}

/**
 * Record a failed clip in history.
 * @param {import('./clipPayload.js').ClipPayload} payload
 * @param {string} error
 */
export async function recordFailure(payload, error) {
  let domain = '';
  try { domain = new URL(payload.url).hostname; } catch { /* ignore */ }

  await addHistory({
    id: payload.clipId,
    type: payload.type,
    url: payload.url,
    title: payload.title,
    domain,
    hasScreenshot: !!payload.screenshot,
    status: 'failed',
    createdAt: payload.createdAt || Date.now(),
  });
}
