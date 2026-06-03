/**
 * Lovcore Clipper — Lovcore tab management
 * Handles finding, opening, and communicating with the Lovcore web app tab.
 */

import {
  LOVCORE_URL,
  LOVCORE_ORIGINS,
  DELIVERY_ATTEMPTS,
  DELIVERY_INTERVAL_MS,
} from './constants.js';

/**
 * Check if a URL belongs to Lovcore.
 * @param {string} url
 * @returns {boolean}
 */
export function isLovcoreUrl(url) {
  if (typeof url !== 'string') return false;
  try {
    return LOVCORE_ORIGINS.includes(new URL(url).origin);
  } catch {
    return false;
  }
}

function getLovcoreOrigin(url) {
  if (typeof url !== 'string') return undefined;
  try {
    const origin = new URL(url).origin;
    return LOVCORE_ORIGINS.includes(origin) ? origin : undefined;
  } catch {
    return undefined;
  }
}

function retargetToExistingOrigin(targetUrl, existingUrl) {
  const existingOrigin = getLovcoreOrigin(existingUrl);
  if (!existingOrigin) return targetUrl;

  try {
    const target = new URL(targetUrl);
    return `${existingOrigin}${target.pathname}${target.search}${target.hash}`;
  } catch {
    return targetUrl;
  }
}

/**
 * Find an existing Lovcore tab or open a new one.
 * @param {string} [url] - URL to open (defaults to LOVCORE_URL)
 * @returns {Promise<number>} Tab ID
 */
export async function findOrOpenLovcoreTab(url) {
  let targetUrl = url || LOVCORE_URL;
  const tabs = await chrome.tabs.query({});
  const lovcoreTab = tabs.find((tab) => isLovcoreUrl(tab.url));

  if (lovcoreTab?.id) {
    targetUrl = retargetToExistingOrigin(targetUrl, lovcoreTab.url);
    await chrome.tabs.update(lovcoreTab.id, { active: true, url: targetUrl });
    if (lovcoreTab.windowId) {
      await chrome.windows.update(lovcoreTab.windowId, { focused: true });
    }
    return lovcoreTab.id;
  }

  const newTab = await chrome.tabs.create({ url: targetUrl });
  return newTab.id;
}

/**
 * Wait for a tab to finish loading.
 * @param {number} tabId
 * @param {number} [timeoutMs=8000]
 * @returns {Promise<void>}
 */
export function waitForTabComplete(tabId, timeoutMs = 8000) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    }, timeoutMs);

    function listener(updatedTabId, changeInfo) {
      if (updatedTabId !== tabId || changeInfo.status !== 'complete') return;
      clearTimeout(timeout);
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    }

    chrome.tabs.onUpdated.addListener(listener);
  });
}

/**
 * Deliver a clip payload to a Lovcore tab via script injection.
 * Retries multiple times in case the page is still loading.
 *
 * @param {number} tabId
 * @param {string} clipId
 * @param {import('./clipPayload.js').ClipPayload} clipData
 * @returns {Promise<boolean>} Whether delivery succeeded.
 */
export async function deliverClipToTab(tabId, clipId, clipData) {
  for (let attempt = 0; attempt < DELIVERY_ATTEMPTS; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, DELIVERY_INTERVAL_MS));

    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (id, data) => {
          window.__lovcoreClipPayload = { ...data, clipId: id };
          // Set screenshot on window for immediate access
          if (data.screenshot) {
            window.__lovcoreClipScreenshot = data.screenshot;
          }
          // Dispatch the full payload as a custom event
          window.dispatchEvent(new CustomEvent('lovcore:clip-payload', {
            detail: { ...data, clipId: id },
          }));
        },
        args: [clipId, clipData],
      });
      return true;
    } catch {
      // Lovcore may still be navigating. Keep retrying.
    }
  }

  return false;
}
