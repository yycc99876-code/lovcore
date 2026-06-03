/**
 * Lovcore Clipper — Login state detection
 * Communicates with the Lovcore page to check authentication status.
 *
 * Does NOT store any tokens. The extension never sees Supabase credentials.
 */

import { LOVCORE_ORIGINS } from './constants.js';

function isLovcoreUrl(url) {
  if (typeof url !== 'string') return false;
  try {
    return LOVCORE_ORIGINS.includes(new URL(url).origin);
  } catch {
    return false;
  }
}

/**
 * @typedef {'authenticated' | 'unauthenticated' | 'unknown'} LoginState
 */

/**
 * Check login state by querying the Lovcore tab.
 *
 * Strategy:
 * 1. Find an open Lovcore tab.
 * 2. Inject a script that checks for auth state indicators.
 * 3. Return the result.
 *
 * @returns {Promise<{ state: LoginState, lovcoreOpen: boolean }>}
 */
export async function checkLoginState() {
  try {
    const tabs = await chrome.tabs.query({});
    const lovcoreTab = tabs.find((tab) => isLovcoreUrl(tab.url));

    if (!lovcoreTab?.id) {
      return { state: 'unknown', lovcoreOpen: false };
    }

    // Try to detect auth state from the Lovcore page.
    // We inject a script that looks for common auth indicators.
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: lovcoreTab.id },
        func: () => {
          // Check for Supabase auth token in localStorage (common pattern)
          try {
            const keys = Object.keys(localStorage);
            const hasAuthKey = keys.some((k) => {
              // Supabase stores tokens under keys like "sb-<project>-auth-token"
              if (k.startsWith('sb-') && k.endsWith('-auth-token')) {
                try {
                  const val = JSON.parse(localStorage.getItem(k));
                  return val?.access_token || val?.currentSession?.access_token;
                } catch {
                  return false;
                }
              }
              return false;
            });
            if (hasAuthKey) return 'authenticated';
          } catch {
            // localStorage access denied
          }

          // Check for a global auth flag that Lovcore might set
          try {
            const w = /** @type {any} */ (window);
            if (w.__lovcoreAuth === true) return 'authenticated';
            if (w.__lovcoreAuth === false) return 'unauthenticated';
          } catch {
            // ignore
          }

          return 'unknown';
        },
      });

      const result = results?.[0]?.result;
      if (result === 'authenticated') return { state: 'authenticated', lovcoreOpen: true };
      if (result === 'unauthenticated') return { state: 'unauthenticated', lovcoreOpen: true };
      return { state: 'unknown', lovcoreOpen: true };
    } catch {
      // Script injection failed (CSP, cross-origin, etc.)
      return { state: 'unknown', lovcoreOpen: true };
    }
  } catch {
    return { state: 'unknown', lovcoreOpen: false };
  }
}
