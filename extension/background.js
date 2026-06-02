/**
 * Lovcore Clipper background service worker.
 *
 * Captures the active page, opens Lovcore, and delivers the clip payload after
 * the Lovcore tab is ready. Payloads live in chrome.storage.session so they
 * survive service-worker suspension during navigation.
 */

const LOVCORE_URL = 'https://lovcore.com';
const CLIP_TTL_MS = 5 * 60 * 1000;
const DELIVERY_ATTEMPTS = 16;
const DELIVERY_INTERVAL_MS = 700;

function clipStorageKey(clipId) {
  return `lovcoreClip:${clipId}`;
}

function isLovcoreUrl(url) {
  return typeof url === 'string' && url.startsWith(LOVCORE_URL);
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

async function cleanupExpiredClips() {
  const all = await chrome.storage.session.get(null);
  const expiredKeys = Object.entries(all)
    .filter(([key, value]) => key.startsWith('lovcoreClip:') && value?.expiresAt < Date.now())
    .map(([key]) => key);

  if (expiredKeys.length > 0) {
    await chrome.storage.session.remove(expiredKeys);
  }
}

async function getSelectedText(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => window.getSelection()?.toString() || '',
    });
    return results?.[0]?.result?.trim() || '';
  } catch {
    return '';
  }
}

async function findOrOpenLovcoreTab(url) {
  const tabs = await chrome.tabs.query({});
  const lovcoreTab = tabs.find((tab) => isLovcoreUrl(tab.url));

  if (lovcoreTab?.id) {
    await chrome.tabs.update(lovcoreTab.id, { active: true, url });
    if (lovcoreTab.windowId) {
      await chrome.windows.update(lovcoreTab.windowId, { focused: true });
    }
    return lovcoreTab.id;
  }

  const newTab = await chrome.tabs.create({ url });
  return newTab.id;
}

async function deliverClipToTab(tabId, clipId, clipData) {
  for (let attempt = 0; attempt < DELIVERY_ATTEMPTS; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, DELIVERY_INTERVAL_MS));

    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (id, data) => {
          window.__lovcoreClipScreenshot = data.screenshot;
          window.dispatchEvent(new CustomEvent('lovcore:clip-data', {
            detail: {
              ...data,
              clipId: id,
            },
          }));
        },
        args: [clipId, clipData],
      });
      return true;
    } catch {
      // Lovcore may still be navigating. Keep retrying for a short window.
    }
  }

  return false;
}

function waitForTabComplete(tabId) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    }, 8000);

    function listener(updatedTabId, changeInfo) {
      if (updatedTabId !== tabId || changeInfo.status !== 'complete') return;
      clearTimeout(timeout);
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    }

    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function captureAndSave(tab, selectedText = '') {
  try {
    if (!tab?.id || !tab?.url) {
      throw new Error('No active page found');
    }

    const screenshot = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: 'jpeg',
      quality: 78,
    });

    const clipId = `clip-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const clipData = {
      screenshot,
      url: tab.url,
      title: tab.title || '',
      selectedText: selectedText || '',
      timestamp: Date.now(),
    };

    await cleanupExpiredClips();
    await putClip(clipId, clipData);

    const params = new URLSearchParams();
    params.set('clipId', clipId);
    params.set('clip', tab.url);
    if (tab.title) params.set('title', tab.title);
    if (selectedText) params.set('text', selectedText);

    const targetTabId = await findOrOpenLovcoreTab(`${LOVCORE_URL}/?${params.toString()}`);

    waitForTabComplete(targetTabId)
      .then(() => deliverClipToTab(targetTabId, clipId, clipData))
      .catch(() => undefined);

    return { success: true };
  } catch (err) {
    console.error('[Lovcore Clipper] capture failed:', err);
    return { success: false, error: err?.message || 'Capture failed' };
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'capture-and-save') {
    captureAndSave(message.tab, message.selectedText)
      .then(sendResponse)
      .catch((err) => sendResponse({ success: false, error: err?.message || 'Capture failed' }));
    return true;
  }

  if (message.action === 'get-clip-data') {
    takeClip(message.clipId)
      .then((clipData) => {
        if (clipData) {
          sendResponse({ success: true, data: clipData });
        } else {
          sendResponse({ success: false, error: 'Clip data expired or not found' });
        }
      })
      .catch((err) => sendResponse({ success: false, error: err?.message || 'Clip data unavailable' }));
    return true;
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'save-to-lovcore') return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab?.url) return;

  await captureAndSave(tab, await getSelectedText(tab.id));
});

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
    await captureAndSave(tab, '');
    return;
  }

  if (info.menuItemId === 'lovcore-save-selection') {
    await captureAndSave(tab, info.selectionText || '');
    return;
  }

  const params = new URLSearchParams();
  if (info.menuItemId === 'lovcore-save-link' && info.linkUrl) {
    params.set('clip', info.linkUrl);
    params.set('title', info.selectionText || info.linkUrl);
  } else if (info.menuItemId === 'lovcore-save-image' && info.srcUrl) {
    params.set('clip', info.srcUrl);
    params.set('title', tab?.title || '');
    params.set('kind', 'image');
  } else {
    return;
  }

  await findOrOpenLovcoreTab(`${LOVCORE_URL}/?${params.toString()}`);
});
