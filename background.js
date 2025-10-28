// background.js (MV3-safe, defensive, full-featured)

'use strict';

/**
 * Helper: is this an http(s) page and a LeetCode problem URL?
 * Use startsWith("http") to filter out chrome:// and other non-web pages.
 */
function isLeetCodeProblemUrl(url) {
  return typeof url === 'string' && url.startsWith('http') && url.includes('leetcode.com/problems/');
}

/**
 * Try to notify the user: first try to open the popup (may fail),
 * otherwise fall back to setting a badge.
 */
function notifyUserAboutFailure() {
  try {
    // attempt to open popup (may fail if browser blocks)
    chrome.action.openPopup?.(() => {
      if (chrome.runtime.lastError) {
        console.warn('openPopup failed:', chrome.runtime.lastError.message);
        // fallback to badge
        try {
          chrome.action.setBadgeText({ text: '1' });
          chrome.action.setBadgeBackgroundColor?.({ color: '#ea580c' });
        } catch (e) {
          console.warn('Failed to set badge fallback:', e);
        }
      } else {
        // popup opened; clear badge if any
        try { chrome.action.setBadgeText({ text: '' }); } catch (e) {}
      }
    });
  } catch (err) {
    console.warn('openPopup threw, using badge fallback', err);
    try {
      chrome.action.setBadgeText({ text: '1' });
      chrome.action.setBadgeBackgroundColor?.({ color: '#ea580c' });
    } catch (e) {
      console.warn('Failed to set badge in catch fallback:', e);
    }
  }
}

/**
 * Try to ensure the content helper is running:
 * - Prefer sending a message to the content script (works when content script is present),
 * - If that fails (no listener), try to inject content.js via scripting.executeScript (if allowed).
 *
 * This avoids unnecessary repeated injection and respects CSP + chrome:// restrictions.
 */
async function ensureContentScript(tabId, tabUrl) {
  if (!isLeetCodeProblemUrl(tabUrl)) return;

  // First try to send a ping message to the content script
  try {
    await new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, { type: 'PING_FROM_BG' }, (resp) => {
        // If there is a runtime.lastError, likely no content script is present (or cross-origin)
        if (chrome.runtime.lastError) {
          // Not an actual error we want to propagate; resolve with false so fallback injection can run
          resolve(false);
        } else {
          // content script responded; all good
          resolve(true);
        }
      });
    });
    // If content script exists it will reply; nothing further needed.
  } catch (err) {
    // ignore - we'll try injection below
    console.warn('tabs.sendMessage ping threw:', err);
  }

  // If we reach here, try to inject the content script if scripting is available.
  if (!chrome.scripting) {
    console.warn('chrome.scripting is not available; cannot inject content.js');
    return;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js'],
    });
    console.log('Injected content.js into tab', tabId);
  } catch (err) {
    // Injection can fail for many reasons (CSP, chrome:// pages, not allowed host)
    console.warn('Could not inject content.js:', err);
  }
}

/**
 * Listen to tab updates. When a LeetCode problem page finishes loading, ensure content script runs.
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  try {
    // Only act when page finished loading
    if (changeInfo.status !== 'complete') return;
    if (!tab?.url) return;

    if (!isLeetCodeProblemUrl(tab.url)) return;

    // guard: skip non-http pages (chrome:// etc.)
    if (!tab.url.startsWith('http')) {
      console.warn('Skipping non-http page:', tab.url);
      return;
    }

    // Ensure content script or content.js is present
    await ensureContentScript(tabId, tab.url);
  } catch (err) {
    console.error('onUpdated handler error:', err);
  }
});

/**
 * Handle messages from content scripts.
 * We expect messages of type 'LC_FAILURE_DETECTED' or others.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    if (!message || typeof message.type !== 'string') return;

    if (message.type === 'LC_FAILURE_DETECTED') {
      const failureData = message.data || {};
      console.log('Received LC_FAILURE_DETECTED from content script:', failureData);

      // Persist to chrome.storage.local (defensive check)
      if (chrome.storage?.local) {
        chrome.storage.local.set({ latestFailure: failureData }, () => {
          if (chrome.runtime.lastError) {
            console.warn('Error saving latestFailure:', chrome.runtime.lastError);
          } else {
            console.log('Saved latestFailure to chrome.storage.local');
            // Notify user (try popup then badge)
            notifyUserAboutFailure();

            // Additionally broadcast to any open extension pages (popup) to update immediately
            try {
              chrome.runtime.sendMessage({ type: 'LC_FAILURE_BROADCAST', data: failureData }, () => {
                // ignore send errors
              });
            } catch (e) {
              // ignore
            }
          }
        });
      } else {
        console.warn('chrome.storage.local not available; cannot persist latestFailure');
      }

      // Optionally respond asynchronously
      // sendResponse({ ok: true });
      // return true; // indicate we will send response asynchronously (if used)
    }

    if (message.type === 'TRIGGER_POPUP_KEYWORD') {
      console.log('💡 Triggered popup by user typing "popup"');
      notifyUserAboutFailure();
    }

    // (Optional) Accept a 'REQUEST_SCRAPE' message to tell content script to run scraping immediately
    if (message.type === 'REQUEST_SCRAPE' && sender?.tab?.id) {
      // forward a message to the content script in the same tab
      try {
        chrome.tabs.sendMessage(sender.tab.id, { type: 'RUN_SCRAPE' }, (resp) => {
          if (chrome.runtime.lastError) {
            // If no listener, try injecting content.js
            ensureContentScript(sender.tab.id, sender.tab.url);
          }
        });
      } catch (e) {
        console.warn('Failed to forward REQUEST_SCRAPE:', e);
      }
    }
  } catch (err) {
    console.error('runtime.onMessage handler error:', err);
  }
});

/**
 * Optional: When user clicks the extension icon, clear the badge and open popup normally.
 * Note: chrome.action.onClicked is not used when you define a default_popup in manifest (click opens popup).
 * The following is a defensive handler in case you remove default_popup or for future use.
 */
chrome.action.onClicked?.addListener((tab) => {
  try {
    chrome.action.setBadgeText({ text: '' });
  } catch (err) {
    // ignore
  }
});

/**
 * Clean-up: clear badge on extension install/update so old badges don't linger.
 */
chrome.runtime.onInstalled?.addListener(() => {
  try {
    chrome.action.setBadgeText({ text: '' });
  } catch (err) {
    // ignore
  }
});
