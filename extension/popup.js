/**
 * Lovcore Clipper popup script
 *
 * Handles: page info display, favicon, screenshot preview,
 * save action with animated state transitions.
 */

const LOVCORE_URL = 'https://lovcore.com';

// --- DOM Refs ---
const popupEl = document.getElementById('popup');
const pageTitleEl = document.getElementById('pageTitle');
const pageDomainEl = document.getElementById('pageDomain');
const pageFaviconEl = document.getElementById('pageFavicon');
const pageScreenshotEl = document.getElementById('pageScreenshot');
const screenshotShimmerEl = document.getElementById('screenshotShimmer');
const selectionPreviewEl = document.getElementById('selection-preview');
const selectionTextEl = document.getElementById('selectionText');
const saveTypeLabel = document.getElementById('saveTypeLabel');
const saveBtn = document.getElementById('saveBtn');
const statusEl = document.getElementById('status');

let currentTab = null;
let selectedText = '';

// --- SVG Icons ---
const ICONS = {
  save: `
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 2v8m0 0l3-3m-3 3L5 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M3 12h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`,
  check: `
    <svg class="checkmark-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M4 8l3 3 5-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  dots: `
    <span class="loading-dots">
      <span></span><span></span><span></span>
    </span>`,
};

// --- Init ---
async function init() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tab;

    // Page title
    pageTitleEl.textContent = tab.title || 'Untitled';

    // Domain
    try {
      pageDomainEl.textContent = new URL(tab.url).hostname;
    } catch {
      pageDomainEl.textContent = '';
    }

    // Favicon
    loadFavicon(tab);

    // Screenshot preview
    captureScreenshot(tab);

    // Selected text
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.getSelection()?.toString() || '',
      });
      selectedText = results?.[0]?.result?.trim() || '';
      if (selectedText) {
        selectionTextEl.textContent = selectedText;
        selectionPreviewEl.classList.remove('hidden');
        saveTypeLabel.textContent = 'selection';
      }
    } catch { /* some pages block injection */ }

  } catch {
    pageTitleEl.textContent = 'Unable to read page';
    pageDomainEl.textContent = '';
    showStatus('Could not access this page', 'error');
    saveBtn.disabled = true;
  }
}

// --- Favicon ---
function loadFavicon(tab) {
  if (!tab.url) return;

  // Try chrome's built-in favicon API first
  try {
    const faviconUrl = `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(tab.url)}&size=32`;
    tryLoadImage(pageFaviconEl, faviconUrl, () => {
      // Fallback: Google's favicon service
      const domain = new URL(tab.url).hostname;
      tryLoadImage(pageFaviconEl, `https://www.google.com/s2/favicons?domain=${domain}&sz=32`, () => {
        // Fallback: direct /favicon.ico
        const origin = new URL(tab.url).origin;
        tryLoadImage(pageFaviconEl, `${origin}/favicon.ico`, () => {
          pageFaviconEl.style.display = 'none';
        });
      });
    });
  } catch {
    pageFaviconEl.style.display = 'none';
  }
}

function tryLoadImage(imgEl, src, onError) {
  imgEl.onerror = onError;
  imgEl.onload = () => imgEl.classList.add('loaded');
  imgEl.src = src;
}

// --- Screenshot Preview ---
async function captureScreenshot(tab) {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: 'jpeg',
      quality: 50,
    });

    const img = document.createElement('img');
    img.alt = 'Page preview';
    img.src = dataUrl;
    img.onload = () => {
      img.classList.add('loaded');
      screenshotShimmerEl?.remove();
    };
    pageScreenshotEl.appendChild(img);
  } catch {
    // No screenshot available (chrome:// pages, etc.)
    screenshotShimmerEl?.remove();
    pageScreenshotEl.style.background = '#1A1A1A';
    pageScreenshotEl.style.display = 'flex';
    pageScreenshotEl.style.alignItems = 'center';
    pageScreenshotEl.style.justifyContent = 'center';
    pageScreenshotEl.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#706D66" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <path d="M21 15l-5-5L5 21"/>
      </svg>`;
  }
}

// --- Status Display ---
function showStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  statusEl.classList.remove('hidden');
  // Re-trigger animation
  statusEl.style.animation = 'none';
  statusEl.offsetHeight; // force reflow
  statusEl.style.animation = '';
}

// --- Save ---
saveBtn.addEventListener('click', save);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    save();
  }
});

async function save() {
  if (!currentTab?.url || saveBtn.disabled) return;

  saveBtn.disabled = true;
  saveBtn.innerHTML = `${ICONS.dots} Saving`;

  try {
    // Ask background to capture screenshot + open Lovcore
    const response = await chrome.runtime.sendMessage({
      action: 'capture-and-save',
      tab: {
        url: currentTab.url,
        title: currentTab.title,
        windowId: currentTab.windowId,
      },
      selectedText,
    });

    if (response?.success) {
      saveBtn.classList.add('success');
      saveBtn.innerHTML = `${ICONS.check} Saved`;
      showStatus('Clipped to Lovcore', 'success');

      // Graceful close with fade-out
      setTimeout(() => {
        popupEl.classList.add('closing');
        setTimeout(() => window.close(), 350);
      }, 1000);
    } else {
      throw new Error(response?.error || 'Failed');
    }
  } catch (err) {
    const errorMessage = getErrorMessage(err);
    showStatus(errorMessage, 'error');
    saveBtn.disabled = false;
    saveBtn.classList.remove('success');
    saveBtn.innerHTML = `${ICONS.save} Save to Lovcore`;
  }
}

// --- Error Messages ---
function getErrorMessage(err) {
  const msg = err?.message?.toLowerCase() || '';
  if (msg.includes('network') || msg.includes('fetch')) {
    return 'Network error - check your connection';
  }
  if (msg.includes('permission') || msg.includes('not allowed')) {
    return 'Permission denied on this page';
  }
  if (msg.includes('tab') || msg.includes('capture')) {
    return 'Cannot capture this page';
  }
  return 'Failed to save - try again';
}

// --- Start ---
init();
