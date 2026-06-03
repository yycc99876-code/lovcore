/**
 * Lovcore Clipper — Popup script (v3)
 *
 * State machine driven. Communicates with background.js via messages.
 * No ES modules — self-contained for popup context.
 */

// ─── Constants ───────────────────────────────────────────

const LOVCORE_URL = 'https://lovcore.com';
const HISTORY_MAX_DISPLAY = 3;
const STATE = {
  IDLE: 'idle',
  READING: 'reading-page',
  CAPTURING: 'capturing',
  SENDING: 'sending',
  WAITING: 'waiting-lovcore',
  SAVED: 'saved',
  FAILED: 'failed',
  RETRYING: 'retrying',
};

// ─── SVG Icons ───────────────────────────────────────────

const ICONS = {
  save: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 2v8m0 0l3-3m-3 3L5 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M3 12h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,
  check: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M4 8l3 3 5-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  spinner: `<svg class="spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5" stroke-dasharray="28" stroke-dashoffset="8" stroke-linecap="round"/>
  </svg>`,
  error: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/>
    <path d="M8 5v3m0 2v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,
  dots: `<span class="loading-dots"><span></span><span></span><span></span></span>`,
};

// ─── DOM Refs ────────────────────────────────────────────

const $ = (id) => document.getElementById(id);

const popupEl = $('popup');
const loginBanner = $('loginBanner');
const loginBannerText = $('loginBannerText');
const openLoginBtn = $('openLoginBtn');
const modePage = $('modePage');
const modeSelection = $('modeSelection');
const modeImage = $('modeImage');
const modeLink = $('modeLink');
const pageTitleEl = $('pageTitle');
const pageDomainEl = $('pageDomain');
const pageFaviconEl = $('pageFavicon');
const pageScreenshotEl = $('pageScreenshot');
const screenshotShimmerEl = $('screenshotShimmer');
const selectionTextEl = $('selectionText');
const selectionSourceEl = $('selectionSource');
const imagePreviewBox = $('imagePreviewBox');
const imageUrlEl = $('imageUrl');
const linkTitleEl = $('linkTitle');
const linkUrlEl = $('linkUrl');
const noteInput = $('noteInput');
const saveTypeDot = $('saveTypeDot');
const saveTypeLabel = $('saveTypeLabel');
const saveBtn = $('saveBtn');
const saveBtnIcon = $('saveBtnIcon');
const saveBtnText = $('saveBtnText');
const errorActions = $('errorActions');
const retryBtn = $('retryBtn');
const linkOnlyBtn = $('linkOnlyBtn');
const openLovcoreBtn = $('openLovcoreBtn');
const statusEl = $('status');
const historyToggle = $('historyToggle');
const historyPanel = $('historyPanel');
const historyClose = $('historyClose');
const historyList = $('historyList');
const queueSection = $('queueSection');
const queueList = $('queueList');

// ─── State ───────────────────────────────────────────────

let currentState = STATE.IDLE;
let currentTab = null;
let clipType = 'page'; // 'page' | 'selection' | 'link' | 'image'
let selectedText = '';
let contextImageUrl = '';
let contextLinkUrl = '';
let lastError = '';
let lastErrorKey = '';
let lastPayload = null; // For retry
let loginState = 'unknown'; // 'authenticated' | 'unauthenticated' | 'unknown'
let lovcoreOpen = false;

// ─── State Machine ───────────────────────────────────────

function setState(newState) {
  currentState = newState;
  updateUI();
}

function updateUI() {
  // Reset common elements
  saveBtn.disabled = false;
  saveBtn.classList.remove('success', 'error-state');
  errorActions.classList.add('hidden');
  statusEl.classList.add('hidden');
  saveTypeDot.className = 'save-type-dot';

  switch (currentState) {
    case STATE.IDLE:
      saveBtnIcon.innerHTML = ICONS.save;
      saveBtnText.textContent = 'Save to Lovcore';
      break;

    case STATE.READING:
    case STATE.CAPTURING:
    case STATE.SENDING:
    case STATE.WAITING:
      saveBtn.disabled = true;
      saveBtnIcon.innerHTML = ICONS.spinner;
      saveBtnText.textContent = getProgressText();
      saveTypeDot.classList.add('sending');
      break;

    case STATE.SAVED:
      saveBtn.disabled = true;
      saveBtn.classList.add('success');
      saveBtnIcon.innerHTML = ICONS.check;
      saveBtnText.textContent = 'Saved';
      saveTypeDot.classList.add('success');
      showStatus('Clipped to Lovcore', 'success');
      // Auto-close after 1 second
      setTimeout(() => {
        popupEl.classList.add('closing');
        setTimeout(() => window.close(), 350);
      }, 1000);
      break;

    case STATE.FAILED:
      saveBtnIcon.innerHTML = ICONS.error;
      saveBtnText.textContent = 'Failed';
      saveBtn.classList.add('error-state');
      saveTypeDot.classList.add('error');
      showStatus(getUserErrorMessage(lastErrorKey, lastError), 'error');
      errorActions.classList.remove('hidden');
      break;

    case STATE.RETRYING:
      saveBtn.disabled = true;
      saveBtnIcon.innerHTML = ICONS.spinner;
      saveBtnText.textContent = 'Retrying...';
      saveTypeDot.classList.add('sending');
      break;
  }

  // Update save type label
  saveTypeLabel.textContent = clipType;
}

function getProgressText() {
  switch (currentState) {
    case STATE.READING: return 'Reading page...';
    case STATE.CAPTURING: return 'Capturing...';
    case STATE.SENDING: return 'Sending...';
    case STATE.WAITING: return 'Waiting for Lovcore...';
    default: return 'Saving...';
  }
}

function getUserErrorMessage(errorKey, errorMsg) {
  switch (errorKey) {
    case 'screenshot_failed':
      return 'Screenshot failed — saving link instead';
    case 'permission_denied':
      return 'This page does not allow extensions';
    case 'tab_error':
      return 'Cannot access this page (chrome:// or restricted)';
    case 'network_error':
      return 'Network error — check your connection';
    case 'lovcore_not_open':
      return 'Could not reach Lovcore';
    case 'data_expired':
      return 'Clip data expired — please try again';
    case 'invalid_payload':
      return 'This page could not be clipped safely';
    default:
      return errorMsg || 'Failed to save — try again';
  }
}

// ─── Status Display ──────────────────────────────────────

function showStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  // Re-trigger animation
  statusEl.style.animation = 'none';
  statusEl.offsetHeight;
  statusEl.style.animation = '';
}

// ─── Clip Mode UI ────────────────────────────────────────

function showClipMode(type) {
  modePage.classList.add('hidden');
  modeSelection.classList.add('hidden');
  modeImage.classList.add('hidden');
  modeLink.classList.add('hidden');

  switch (type) {
    case 'page':
      modePage.classList.remove('hidden');
      break;
    case 'selection':
      modeSelection.classList.remove('hidden');
      break;
    case 'image':
      modeImage.classList.remove('hidden');
      break;
    case 'link':
      modeLink.classList.remove('hidden');
      break;
  }
}

// ─── Favicon Loading ─────────────────────────────────────

function loadFavicon(tab) {
  if (!tab.url) return;

  try {
    const faviconUrl = `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(tab.url)}&size=32`;
    tryLoadImage(pageFaviconEl, faviconUrl, () => {
      pageFaviconEl.style.display = 'none';
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

// ─── Screenshot Preview ──────────────────────────────────

async function captureScreenshotPreview(tab) {
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
    return dataUrl;
  } catch {
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
    return null;
  }
}

// ─── Login Detection ─────────────────────────────────────

async function checkLogin() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'check-login' });
    loginState = response?.state || 'unknown';
    lovcoreOpen = response?.lovcoreOpen || false;
  } catch {
    loginState = 'unknown';
    lovcoreOpen = false;
  }

  updateLoginBanner();
}

function updateLoginBanner() {
  if (loginState === 'unauthenticated') {
    loginBanner.classList.remove('hidden');
    loginBannerText.textContent = 'Please log in to Lovcore first';
    loginBanner.style.background = 'var(--error-bg)';
    loginBanner.style.borderColor = 'rgba(248, 113, 113, 0.2)';
    loginBanner.style.color = 'var(--error)';
    openLoginBtn.style.background = 'var(--error)';
  } else if (loginState === 'unknown' && !lovcoreOpen) {
    loginBanner.classList.remove('hidden');
    loginBannerText.textContent = 'Open Lovcore to enable clipping';
    loginBanner.style.background = 'var(--warning-bg)';
    loginBanner.style.borderColor = 'rgba(251, 191, 36, 0.2)';
    loginBanner.style.color = 'var(--warning)';
    openLoginBtn.style.background = 'var(--warning)';
  } else {
    loginBanner.classList.add('hidden');
  }
}

// ─── History ─────────────────────────────────────────────

async function loadHistory() {
  try {
    const [historyRes, queueRes] = await Promise.all([
      chrome.runtime.sendMessage({ action: 'get-history' }),
      chrome.runtime.sendMessage({ action: 'get-queue' }),
    ]);

    renderHistory(historyRes?.history || []);
    renderQueue(queueRes?.queue || []);
  } catch (err) {
    console.error('Failed to load history:', err);
  }
}

function renderHistory(history) {
  if (history.length === 0) {
    historyList.innerHTML = '<div class="history-empty">No clips yet</div>';
    return;
  }

  const display = history.slice(0, HISTORY_MAX_DISPLAY);
  historyList.innerHTML = display
    .map(
      (entry) => `
    <div class="history-item">
      <div class="history-item-icon ${entry.status}"></div>
      <div class="history-item-body">
        <div class="history-item-title">${escapeHtml(entry.title || entry.url || 'Untitled')}</div>
        <div class="history-item-meta">
          <span>${entry.type}</span>
          <span class="history-item-domain">${escapeHtml(entry.domain || '')}</span>
          <span>${formatTime(entry.createdAt)}</span>
        </div>
      </div>
    </div>
  `
    )
    .join('');
}

function renderQueue(queue) {
  if (queue.length === 0) {
    queueSection.classList.add('hidden');
    return;
  }

  queueSection.classList.remove('hidden');
  queueList.innerHTML = queue
    .map(
      (entry) => `
    <div class="queue-item">
      <div class="queue-item-body">
        <div class="queue-item-title">${escapeHtml(entry.title || entry.url || 'Untitled')}</div>
        <div class="queue-item-error">${escapeHtml(entry.lastError || 'Unknown error')}</div>
      </div>
      <div class="queue-item-actions">
        <button class="queue-action-btn retry" data-id="${entry.id}">Retry</button>
        <button class="queue-action-btn delete" data-id="${entry.id}">Delete</button>
      </div>
    </div>
  `
    )
    .join('');

  // Bind queue action buttons
  queueList.querySelectorAll('.queue-action-btn.retry').forEach((btn) => {
    btn.addEventListener('click', () => retryQueueItem(btn.dataset.id));
  });
  queueList.querySelectorAll('.queue-action-btn.delete').forEach((btn) => {
    btn.addEventListener('click', () => deleteQueueItem(btn.dataset.id));
  });
}

async function retryQueueItem(id) {
  try {
    setState(STATE.RETRYING);
    const response = await chrome.runtime.sendMessage({
      action: 'retry-queue-item',
      id,
    });
    if (response?.success) {
      setState(STATE.SAVED);
      loadHistory();
    } else {
      lastError = response?.error || 'Retry failed';
      lastErrorKey = 'unknown';
      setState(STATE.FAILED);
    }
  } catch (err) {
    lastError = err?.message || 'Retry failed';
    lastErrorKey = 'unknown';
    setState(STATE.FAILED);
  }
}

async function deleteQueueItem(id) {
  try {
    await chrome.runtime.sendMessage({ action: 'delete-queue-item', id });
    loadHistory();
  } catch (err) {
    console.error('Failed to delete queue item:', err);
  }
}

// ─── Utilities ───────────────────────────────────────────

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  const now = Date.now();
  const diff = now - timestamp;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '...' : str;
}

// ─── Init ────────────────────────────────────────────────

async function init() {
  setState(STATE.READING);

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tab;

    if (!tab?.url) {
      throw new Error('No active page found');
    }

    // Check if this is a restricted page
    const isRestricted =
      tab.url.startsWith('chrome://') ||
      tab.url.startsWith('chrome-extension://') ||
      tab.url.startsWith('edge://') ||
      tab.url.startsWith('about:') ||
      tab.url.startsWith('chrome.google.com/webstore');

    if (isRestricted) {
      pageTitleEl.textContent = 'Restricted page';
      pageDomainEl.textContent = new URL(tab.url).hostname;
      pageFaviconEl.style.display = 'none';
      screenshotShimmerEl?.remove();
      throw new Error('This page does not allow extensions');
    }

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
    captureScreenshotPreview(tab);

    // Detect context: selection, link, image
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const sel = window.getSelection()?.toString()?.trim() || '';
          return { selectedText: sel };
        },
      });
      selectedText = results?.[0]?.result?.selectedText || '';
    } catch {
      selectedText = '';
    }

    // Determine clip type
    if (selectedText) {
      clipType = 'selection';
      selectionTextEl.textContent = truncate(selectedText, 200);
      selectionSourceEl.textContent = tab.title || new URL(tab.url).hostname;
    } else {
      clipType = 'page';
    }

    showClipMode(clipType);
    setState(STATE.IDLE);

    // Check login state (non-blocking)
    checkLogin();
  } catch (err) {
    lastError = err?.message || 'Could not access this page';
    lastErrorKey = classifyInitError(err);
    showClipMode('page');
    setState(STATE.FAILED);
    saveBtn.disabled = true;
  }
}

function classifyInitError(err) {
  const msg = (err?.message || '').toLowerCase();
  if (msg.includes('restricted') || msg.includes('does not allow')) return 'tab_error';
  if (msg.includes('no active')) return 'no_page';
  return 'unknown';
}

// ─── Save Flow ───────────────────────────────────────────

async function save() {
  if (currentState !== STATE.IDLE && currentState !== STATE.FAILED) return;
  if (!currentTab?.url) return;

  // Warn if unauthenticated
  if (loginState === 'unauthenticated') {
    showStatus('Not logged in — clip may not be saved', 'warning');
    // Still allow save (payload will be queued if delivery fails)
  }

  setState(STATE.CAPTURING);

  try {
    setState(STATE.SENDING);

    const note = noteInput.value.trim() || undefined;

    const response = await chrome.runtime.sendMessage({
      action: 'capture-and-save',
      tab: {
        url: currentTab.url,
        title: currentTab.title,
        windowId: currentTab.windowId,
        id: currentTab.id,
      },
      selectedText: clipType === 'selection' ? selectedText : undefined,
      imageUrl: clipType === 'image' ? contextImageUrl : undefined,
      linkUrl: clipType === 'link' ? contextLinkUrl : undefined,
      clipType,
      note,
    });

    if (response?.success) {
      setState(STATE.SAVED);
      // Refresh history in background
      loadHistory();
    } else {
      throw new Error(response?.error || 'Failed');
    }
  } catch (err) {
    lastError = err?.message || 'Save failed';
    lastErrorKey = classifySaveError(err);
    setState(STATE.FAILED);
  }
}

function classifySaveError(err) {
  const msg = (err?.message || '').toLowerCase();
  if (msg.includes('permission') || msg.includes('not allowed')) return 'permission_denied';
  if (msg.includes('capture') || msg.includes('screenshot')) return 'screenshot_failed';
  if (msg.includes('network') || msg.includes('fetch')) return 'network_error';
  if (msg.includes('tab')) return 'tab_error';
  return 'unknown';
}

// ─── Event Listeners ─────────────────────────────────────

// Save button
saveBtn.addEventListener('click', save);

// Ctrl+Enter shortcut
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    save();
  }
});

// Retry button
retryBtn.addEventListener('click', () => {
  setState(STATE.IDLE);
  save();
});

// Link-only button (retry without screenshot)
linkOnlyBtn.addEventListener('click', async () => {
  if (!currentTab?.url) return;
  setState(STATE.RETRYING);

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'capture-and-save',
      tab: {
        url: currentTab.url,
        title: currentTab.title,
        windowId: currentTab.windowId,
        id: currentTab.id,
      },
      selectedText: undefined,
      clipType: 'link',
      linkUrl: currentTab.url,
      note: noteInput.value.trim() || undefined,
    });

    if (response?.success) {
      setState(STATE.SAVED);
    } else {
      throw new Error(response?.error || 'Failed');
    }
  } catch (err) {
    lastError = err?.message || 'Save failed';
    lastErrorKey = 'unknown';
    setState(STATE.FAILED);
  }
});

// Open Lovcore button
openLovcoreBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: LOVCORE_URL });
  window.close();
});

// Login button
openLoginBtn?.addEventListener('click', () => {
  chrome.tabs.create({ url: LOVCORE_URL });
  window.close();
});

// History toggle
historyToggle.addEventListener('click', () => {
  const isHidden = historyPanel.classList.contains('hidden');
  if (isHidden) {
    historyPanel.classList.remove('hidden');
    loadHistory();
  } else {
    historyPanel.classList.add('hidden');
  }
});

// History close
historyClose.addEventListener('click', () => {
  historyPanel.classList.add('hidden');
});

// ─── Start ───────────────────────────────────────────────

init();
