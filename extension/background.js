/**
 * Lovcore Clipper — Background service worker (MV3 module)
 *
 * Responsibilities:
 * - Event registration (commands, contextMenus, messages)
 * - Dispatching to lib/ modules
 * - No business logic inline — delegate everything.
 */

import {
  LOVCORE_URL,
  CLIP_TTL_MS,
  STORAGE_PREFIX_CLIP,
} from './lib/constants.js';
import { buildPayload, validatePayload } from './lib/clipPayload.js';
import {
  enqueue,
  getQueue,
  getQueueEntry,
  dequeue,
  markSending,
  markFailed,
  getRetryable,
  cleanupExpired,
  recordSuccess,
  recordFailure,
} from './lib/clipQueue.js';
import {
  captureScreenshot,
  getSelectedText,
  getPageMeta,
  determineClipType,
} from './lib/pageCapture.js';
import {
  findOrOpenLovcoreTab,
  waitForTabComplete,
  deliverClipToTab,
} from './lib/lovcoreTabs.js';
import { checkLoginState } from './lib/permissions.js';
import { logError, logInfo } from './lib/telemetry.js';

// ─── Session storage for clip payloads ───────────────────

function clipStorageKey(clipId) {
  return `${STORAGE_PREFIX_CLIP}${clipId}`;
}

async function putClip(clipId, data) {
  await chrome.storage.session.set({
    [clipStorageKey(clipId)]: {
      ...data,
      expiresAt: Date.now() + CLIP_TTL_MS,
    },
  });
}

async function takeClip(clipId) {
  const key = clipStorageKey(clipId);
  const result = await chrome.storage.session.get(key);
  const clip = result[key];
  if (!clip) return undefined;

  if (clip.expiresAt && clip.expiresAt < Date.now()) {
    await chrome.storage.session.remove(key);
    return undefined;
  }

  await chrome.storage.session.remove(key);
  return clip;
}

async function cleanupExpiredSessionClips() {
  const all = await chrome.storage.session.get(null);
  const expiredKeys = Object.entries(all)
    .filter(
      ([key, value]) =>
        key.startsWith(STORAGE_PREFIX_CLIP) && value?.expiresAt < Date.now()
    )
    .map(([key]) => key);

  if (expiredKeys.length > 0) {
    await chrome.storage.session.remove(expiredKeys);
  }
}

// ─── Core capture-and-save flow ──────────────────────────

/**
 * Capture the current page and deliver to Lovcore.
 * @param {chrome.tabs.Tab} tab
 * @param {Object} opts
 * @param {string} [opts.selectedText]
 * @param {string} [opts.imageUrl]
 * @param {string} [opts.linkUrl]
 * @param {'page' | 'selection' | 'link' | 'image'} [opts.clipType]
 * @param {string} [opts.note]
 * @returns {Promise<{ success: boolean, clipId?: string, error?: string, errorKey?: string }>}
 */
async function captureAndSave(tab, opts = {}) {
  try {
    if (!tab?.id || !tab?.url) {
      return { success: false, error: 'No active page found', errorKey: 'no_page' };
    }

    const type = opts.clipType || determineClipType(opts);
    const meta = getPageMeta(tab);

    // For link/image clips from context menu, skip screenshot
    let screenshot;
    if (type === 'page' || type === 'selection') {
      try {
        screenshot = await captureScreenshot(tab.windowId);
      } catch (err) {
        logError('capture', 'Screenshot failed', err);
        // Continue without screenshot — don't fail the whole clip
      }
    }

    const payload = buildPayload({
      type,
      url: type === 'link' ? opts.linkUrl : type === 'image' ? opts.imageUrl : meta.url,
      title: meta.title,
      selectedText: opts.selectedText,
      imageUrl: opts.imageUrl,
      screenshot,
      note: opts.note,
    });
    const validation = validatePayload(payload);
    if (!validation.valid) {
      return {
        success: false,
        clipId: payload.clipId,
        error: validation.error || 'Invalid clip payload',
        errorKey: 'invalid_payload',
      };
    }

    await cleanupExpiredSessionClips();
    await putClip(payload.clipId, payload);

    // Build URL params for Lovcore navigation
    const params = new URLSearchParams();
    params.set('clipId', payload.clipId);
    params.set('clip', payload.url);
    if (payload.title) params.set('title', payload.title);
    if (payload.selectedText) params.set('text', payload.selectedText);
    if (payload.note) params.set('note', payload.note);
    if (type === 'image' && opts.imageUrl) params.set('kind', 'image');

    // Open or focus Lovcore tab
    const targetTabId = await findOrOpenLovcoreTab(
      `${LOVCORE_URL}/?${params.toString()}`
    );

    // Fire-and-forget delivery (don't block the popup)
    waitForTabComplete(targetTabId)
      .then(() => deliverClipToTab(targetTabId, payload.clipId, payload))
      .then((delivered) => {
        if (delivered) {
          logInfo('delivery', `Clip ${payload.clipId} delivered`);
          recordSuccess(payload).catch((err) => {
            logError('history', 'Record success failed', err);
          });
        } else {
          logError('delivery', `Clip ${payload.clipId} delivery failed`);
          recordDeliveryFailure(payload, 'Delivery failed').catch((err) => {
            logError('queue', 'Queue delivery failure failed', err);
          });
        }
      })
      .catch((err) => {
        logError('delivery', 'Delivery error', err);
        recordDeliveryFailure(payload, err?.message || 'Delivery error').catch((queueErr) => {
          logError('queue', 'Queue delivery error failed', queueErr);
        });
      });

    return { success: true, clipId: payload.clipId };
  } catch (err) {
    logError('capture', 'Capture failed', err);
    const errorKey = classifyError(err);
    return { success: false, error: err?.message || 'Capture failed', errorKey };
  }
}

/**
 * Classify an error into a user-facing key.
 * @param {Error} err
 * @returns {string}
 */
function classifyError(err) {
  const msg = (err?.message || '').toLowerCase();
  if (msg.includes('permission') || msg.includes('not allowed') || msg.includes('cannot access')) {
    return 'permission_denied';
  }
  if (msg.includes('capture') || msg.includes('screenshot')) {
    return 'screenshot_failed';
  }
  if (msg.includes('network') || msg.includes('fetch')) {
    return 'network_error';
  }
  if (msg.includes('tab')) {
    return 'tab_error';
  }
  return 'unknown';
}

function isRetryableErrorKey(errorKey) {
  return !['invalid_payload', 'permission_denied', 'tab_error', 'no_page'].includes(errorKey);
}

async function recordDeliveryFailure(payload, error) {
  await enqueue(payload, error);
  await recordFailure(payload, error);
}

// ─── Retry queue processing ──────────────────────────────

async function processRetryQueue() {
  const retryable = await getRetryable();
  if (retryable.length === 0) return;

  for (const entry of retryable) {
    await markSending(entry.id);

    try {
      const payload = buildPayload({
        clipId: entry.id,
        type: entry.type,
        url: entry.url,
        title: entry.title,
        selectedText: entry.selectedText,
        imageUrl: entry.imageUrl,
        screenshot: entry.screenshot,
        note: entry.note,
        createdAt: entry.createdAt,
      });

      const params = new URLSearchParams();
      params.set('clipId', payload.clipId);
      params.set('clip', payload.url);
      if (payload.title) params.set('title', payload.title);
      if (payload.selectedText) params.set('text', payload.selectedText);
      if (payload.note) params.set('note', payload.note);
      if (payload.type === 'image') params.set('kind', 'image');

      const targetTabId = await findOrOpenLovcoreTab(
        `${LOVCORE_URL}/?${params.toString()}`
      );

      await waitForTabComplete(targetTabId);
      const delivered = await deliverClipToTab(targetTabId, payload.clipId, payload);

      if (delivered) {
        await dequeue(entry.id);
        await recordSuccess(payload);
        logInfo('retry', `Clip ${entry.id} retried successfully`);
      } else {
        await markFailed(entry.id, 'Delivery failed');
      }
    } catch (err) {
      await markFailed(entry.id, err?.message || 'Retry failed');
      logError('retry', `Retry failed for ${entry.id}`, err);
    }
  }
}

// ─── Message handler ─────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const { action } = message;

  if (action === 'capture-and-save') {
    captureAndSave(message.tab, {
      selectedText: message.selectedText,
      imageUrl: message.imageUrl,
      linkUrl: message.linkUrl,
      clipType: message.clipType,
      note: message.note,
    })
      .then((result) => {
        if (!result.success && result.clipId && isRetryableErrorKey(result.errorKey)) {
          // Enqueue failed clip for retry
          const payload = buildPayload({
            clipId: result.clipId,
            type: message.clipType || 'page',
            url: message.tab?.url || '',
            title: message.tab?.title,
            selectedText: message.selectedText,
            imageUrl: message.imageUrl,
            note: message.note,
          });
          enqueue(payload, result.error).then(() => {
            recordFailure(payload, result.error);
          });
        }
        sendResponse(result);
      })
      .catch((err) => {
        sendResponse({
          success: false,
          error: err?.message || 'Capture failed',
          errorKey: 'unknown',
        });
      });
    return true; // Keep channel open for async response
  }

  if (action === 'get-clip-data') {
    takeClip(message.clipId)
      .then((clipData) => {
        if (clipData) {
          sendResponse({ success: true, data: clipData });
        } else {
          sendResponse({ success: false, error: 'Clip data expired or not found' });
        }
      })
      .catch((err) => {
        sendResponse({ success: false, error: err?.message || 'Clip data unavailable' });
      });
    return true;
  }

  if (action === 'check-login') {
    checkLoginState()
      .then(sendResponse)
      .catch((err) => {
        sendResponse({ state: 'unknown', lovcoreOpen: false });
        logError('auth', 'Login check failed', err);
      });
    return true;
  }

  if (action === 'get-queue') {
    cleanupExpired()
      .then(() => getQueue())
      .then((queue) => sendResponse({ success: true, queue }))
      .catch((err) => sendResponse({ success: false, error: err?.message }));
    return true;
  }

  if (action === 'retry-queue-item') {
    getQueueEntry(message.id)
      .then(async (entry) => {
        if (!entry) {
          sendResponse({ success: false, error: 'Entry not found' });
          return;
        }
        await markSending(entry.id);
        const payload = buildPayload({
          clipId: entry.id,
          type: entry.type,
          url: entry.url,
          title: entry.title,
          selectedText: entry.selectedText,
          imageUrl: entry.imageUrl,
          screenshot: entry.screenshot,
          note: entry.note,
          createdAt: entry.createdAt,
        });

        const params = new URLSearchParams();
        params.set('clipId', payload.clipId);
        params.set('clip', payload.url);
        if (payload.title) params.set('title', payload.title);
        if (payload.selectedText) params.set('text', payload.selectedText);
        if (payload.note) params.set('note', payload.note);
        if (payload.type === 'image') params.set('kind', 'image');

        const targetTabId = await findOrOpenLovcoreTab(
          `${LOVCORE_URL}/?${params.toString()}`
        );
        await waitForTabComplete(targetTabId);
        const delivered = await deliverClipToTab(targetTabId, payload.clipId, payload);

        if (delivered) {
          await dequeue(entry.id);
          await recordSuccess(payload);
          sendResponse({ success: true });
        } else {
          await markFailed(entry.id, 'Delivery failed');
          sendResponse({ success: false, error: 'Delivery failed' });
        }
      })
      .catch((err) => {
        sendResponse({ success: false, error: err?.message });
      });
    return true;
  }

  if (action === 'delete-queue-item') {
    dequeue(message.id)
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err?.message }));
    return true;
  }

  if (action === 'get-history') {
    // History is stored in storage, popup reads it directly
    // but we provide a message handler for consistency
    chrome.storage.local
      .get('lovcoreHistory')
      .then((result) => {
        const history = (result.lovcoreHistory || []).sort(
          (a, b) => b.createdAt - a.createdAt
        );
        sendResponse({ success: true, history });
      })
      .catch((err) => sendResponse({ success: false, error: err?.message }));
    return true;
  }

  return false;
});

// ─── Keyboard shortcut ───────────────────────────────────

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'save-to-lovcore') return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab?.url) return;

  const selectedText = await getSelectedText(tab.id);
  await captureAndSave(tab, { selectedText });
});

// ─── Context menus ───────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'lovcore-save-page',
      title: 'Save to Lovcore',
      contexts: ['page'],
    });

    chrome.contextMenus.create({
      id: 'lovcore-save-selection',
      title: 'Save selection to Lovcore',
      contexts: ['selection'],
    });

    chrome.contextMenus.create({
      id: 'lovcore-save-link',
      title: 'Save link to Lovcore',
      contexts: ['link'],
    });

    chrome.contextMenus.create({
      id: 'lovcore-save-image',
      title: 'Save image to Lovcore',
      contexts: ['image'],
    });
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'lovcore-save-page') {
    await captureAndSave(tab);
    return;
  }

  if (info.menuItemId === 'lovcore-save-selection') {
    await captureAndSave(tab, { selectedText: info.selectionText || '' });
    return;
  }

  if (info.menuItemId === 'lovcore-save-link' && info.linkUrl) {
    await captureAndSave(tab, {
      linkUrl: info.linkUrl,
      selectedText: info.selectionText || '',
    });
    return;
  }

  if (info.menuItemId === 'lovcore-save-image' && info.srcUrl) {
    await captureAndSave(tab, {
      imageUrl: info.srcUrl,
    });
    return;
  }
});
