/**
 * Lovcore Clipper — Page capture utilities
 * Handles screenshots, selected text extraction, and page metadata.
 */

import { SCREENSHOT_QUALITY } from './constants.js';

/**
 * Capture a visible tab screenshot as base64 JPEG data URL.
 * @param {number} windowId
 * @returns {Promise<string>} data:image/jpeg;base64,...
 */
export async function captureScreenshot(windowId) {
  return chrome.tabs.captureVisibleTab(windowId, {
    format: 'jpeg',
    quality: SCREENSHOT_QUALITY,
  });
}

/**
 * Get selected text from a tab via script injection.
 * @param {number} tabId
 * @returns {Promise<string>}
 */
export async function getSelectedText(tabId) {
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

/**
 * Extract page metadata from a tab.
 * @param {chrome.tabs.Tab} tab
 * @returns {{ url: string, title: string, domain: string }}
 */
export function getPageMeta(tab) {
  let domain = '';
  try {
    domain = new URL(tab.url).hostname;
  } catch { /* ignore */ }

  return {
    url: tab.url || '',
    title: tab.title || '',
    domain,
  };
}

/**
 * Determine the clip type from context.
 * @param {Object} params
 * @param {string} [params.selectedText]
 * @param {string} [params.imageUrl]
 * @param {string} [params.linkUrl]
 * @returns {'page' | 'selection' | 'link' | 'image'}
 */
export function determineClipType({ selectedText, imageUrl, linkUrl } = {}) {
  if (imageUrl) return 'image';
  if (linkUrl) return 'link';
  if (selectedText) return 'selection';
  return 'page';
}
