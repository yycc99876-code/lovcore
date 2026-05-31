/**
 * Lovcore Clipper — Background Service Worker
 *
 * Captures visible tab screenshot, stores it temporarily,
 * and opens Lovcore with a clip ID for retrieval.
 */

const LOVCORE_URL = 'https://lovecore.com';

// Temporary store for pending clip screenshots (cleared after retrieval)
const pendingClips = new Map();

// Capture screenshot and open Lovcore
async function captureAndSave(tab, selectedText) {
  try {
    // Capture the visible tab as JPEG (smaller than PNG)
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: 'jpeg',
      quality: 75,
    });

    // Generate a unique clip ID
    const clipId = `clip-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Store the screenshot temporarily
    pendingClips.set(clipId, {
      screenshot: dataUrl,
      url: tab.url,
      title: tab.title || '',
      selectedText: selectedText || '',
      timestamp: Date.now(),
    });

    // Auto-cleanup after 60 seconds
    setTimeout(() => pendingClips.delete(clipId), 60000);

    // Build the Lovcore URL with clip ID
    const params = new URLSearchParams();
    params.set('clipId', clipId);
    params.set('clip', tab.url);
    if (tab.title) params.set('title', tab.title);
    if (selectedText) params.set('text', selectedText);

    const lovcoreUrl = `${LOVCORE_URL}/?${params.toString()}`;

    // Open or focus Lovcore tab
    const tabs = await chrome.tabs.query({});
    const lovcoreTab = tabs.find(t => t.url?.startsWith(LOVCORE_URL));

    let targetTabId;
    if (lovcoreTab) {
      await chrome.tabs.update(lovcoreTab.id, { active: true, url: lovcoreUrl });
      targetTabId = lovcoreTab.id;
      if (lovcoreTab.windowId) {
        await chrome.windows.update(lovcoreTab.windowId, { focused: true });
      }
    } else {
      const newTab = await chrome.tabs.create({ url: lovcoreUrl });
      targetTabId = newTab.id;
    }

    // Inject script to deliver screenshot data to Lovcore after page loads
    const storedClip = pendingClips.get(clipId);
    if (storedClip) {
      const deliver = async (tabId, attempts) => {
        for (let i = 0; i < attempts; i++) {
          await new Promise(r => setTimeout(r, 800));
          try {
            await chrome.scripting.executeScript({
              target: { tabId },
              func: (id, data) => {
                window.__lovcoreClipScreenshot = data.screenshot;
                window.dispatchEvent(new CustomEvent('lovcore:clip-data', { detail: data }));
              },
              args: [clipId, storedClip],
            });
            return;
          } catch { /* page not ready yet, retry */ }
        }
      };
      deliver(targetTabId, 8);
    }

    return { success: true };
  } catch (err) {
    console.error('[Lovcore Clipper] capture failed:', err);
    return { success: false, error: err.message };
  }
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'capture-and-save') {
    captureAndSave(message.tab, message.selectedText)
      .then(sendResponse)
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // keep channel open for async response
  }

  // Lovcore requests clip data by ID
  if (message.action === 'get-clip-data') {
    const clipId = message.clipId;
    const clipData = pendingClips.get(clipId);
    if (clipData) {
      pendingClips.delete(clipId); // one-time use
      sendResponse({ success: true, data: clipData });
    } else {
      sendResponse({ success: false, error: 'Clip data expired or not found' });
    }
    return true;
  }
});

// Keyboard shortcut: Ctrl+Shift+L
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'save-to-lovcore') return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return;

  let selectedText = '';
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection()?.toString() || '',
    });
    selectedText = results?.[0]?.result?.trim() || '';
  } catch { /* ignore */ }

  await captureAndSave(tab, selectedText);
});

// Context menus
chrome.runtime.onInstalled.addListener(() => {
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

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'lovcore-save-page') {
    await captureAndSave(tab, '');
  } else if (info.menuItemId === 'lovcore-save-selection') {
    await captureAndSave(tab, info.selectionText);
  } else if (info.menuItemId === 'lovcore-save-link') {
    const params = new URLSearchParams();
    params.set('clip', info.linkUrl);
    params.set('title', info.selectionText || '');
    const url = `${LOVCORE_URL}/?${params.toString()}`;
    const tabs = await chrome.tabs.query({});
    const lovcoreTab = tabs.find(t => t.url?.startsWith(LOVCORE_URL));
    if (lovcoreTab) {
      await chrome.tabs.update(lovcoreTab.id, { active: true, url });
    } else {
      await chrome.tabs.create({ url });
    }
  } else if (info.menuItemId === 'lovcore-save-image') {
    const params = new URLSearchParams();
    params.set('clip', info.srcUrl);
    params.set('title', tab?.title || '');
    params.set('kind', 'image');
    const url = `${LOVCORE_URL}/?${params.toString()}`;
    const tabs = await chrome.tabs.query({});
    const lovcoreTab = tabs.find(t => t.url?.startsWith(LOVCORE_URL));
    if (lovcoreTab) {
      await chrome.tabs.update(lovcoreTab.id, { active: true, url });
    } else {
      await chrome.tabs.create({ url });
    }
  }
});
