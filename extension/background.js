/**
 * GhostGuard Background Service Worker (Manifest V3)
 * Real-Time Digital Perimeter Defender & Dynamic Badge Manager
 */

const BACKEND_URL = 'http://localhost:5000';

// Badge color tokens matching GhostGuard design system
const BADGE_COLOR_ALERT = '#ef4444'; // Red alert for unreviewed / high-risk on active site
const BADGE_COLOR_SAFE = '#2e583c';  // Muted emerald for general unreviewed accounts

/**
 * Extracts normalized hostname from URL
 * @param {string} url
 * @returns {string | null}
 */
function extractHostname(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Retrieves audited accounts from chrome.storage.local or backend fallback
 * @returns {Promise<Array<object>>}
 */
async function getAuditedAccounts() {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
      return resolve([]);
    }

    chrome.storage.local.get(['gg_accounts'], async (data) => {
      if (data && Array.isArray(data.gg_accounts) && data.gg_accounts.length > 0) {
        return resolve(data.gg_accounts);
      }

      // If not cached, attempt background sync from backend
      try {
        const res = await fetch(`${BACKEND_URL}/api/audit/accounts`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.assets)) {
            chrome.storage.local.set({
              gg_accounts: json.assets,
              gg_last_sync: Date.now()
            });
            return resolve(json.assets);
          }
        }
      } catch {
        // Backend offline or unreachable
      }
      resolve([]);
    });
  });
}

/**
 * Matches hostname against audited assets list
 * @param {Array<object>} accounts
 * @param {string} hostname
 * @returns {object | null}
 */
function findMatchingAccount(accounts, hostname) {
  if (!hostname || !accounts || !accounts.length) return null;
  return accounts.find((a) => {
    if (!a.domain) return false;
    const cleanDomain = a.domain.replace(/^www\./i, '').toLowerCase();
    return cleanDomain === hostname || hostname.endsWith('.' + cleanDomain) || cleanDomain.endsWith('.' + hostname);
  }) || null;
}

/**
 * Updates extension action badge based on current tab perimeter status
 * @param {number} [tabId]
 * @param {string} [url]
 */
async function updateBadgeForActiveTab(tabId, url) {
  if (typeof chrome === 'undefined' || !chrome.action) return;

  try {
    const accounts = await getAuditedAccounts();
    const hostname = extractHostname(url);
    const matchedAccount = findMatchingAccount(accounts, hostname);

    const unreviewedCount = accounts.filter(
      (a) => !a.status || a.status === 'UNREVIEWED'
    ).length;

    // 1. Site-Specific Alert Check
    if (matchedAccount) {
      const riskUpper = (matchedAccount.riskLevel || '').toUpperCase();
      const isHighRisk = riskUpper === 'HIGH' || riskUpper === 'CRITICAL';
      const isUnreviewed = !matchedAccount.status || matchedAccount.status === 'UNREVIEWED';
      const highGhostScore = typeof matchedAccount.ghostScore === 'number' && matchedAccount.ghostScore >= 70;

      if (isHighRisk || isUnreviewed || highGhostScore) {
        // Active tab is an unreviewed or high-risk ghost asset!
        const badgeDetails = tabId !== undefined ? { tabId, text: '!' } : { text: '!' };
        const colorDetails = tabId !== undefined ? { tabId, color: BADGE_COLOR_ALERT } : { color: BADGE_COLOR_ALERT };
        
        chrome.action.setBadgeText(badgeDetails);
        chrome.action.setBadgeBackgroundColor(colorDetails);

        if (chrome.action.setBadgeTextColor) {
          chrome.action.setBadgeTextColor({ color: '#ffffff', ...(tabId !== undefined ? { tabId } : {}) });
        }

        const titleText = `GhostGuard Alert: Registered identity on ${matchedAccount.domain} requires review (Risk: ${matchedAccount.riskLevel || 'High'})`;
        chrome.action.setTitle({ title: titleText, ...(tabId !== undefined ? { tabId } : {}) });
        return;
      }
    }

    // 2. Global Unreviewed Badge Counter
    if (unreviewedCount > 0) {
      const badgeDetails = tabId !== undefined ? { tabId, text: String(unreviewedCount) } : { text: String(unreviewedCount) };
      const colorDetails = tabId !== undefined ? { tabId, color: BADGE_COLOR_SAFE } : { color: BADGE_COLOR_SAFE };

      chrome.action.setBadgeText(badgeDetails);
      chrome.action.setBadgeBackgroundColor(colorDetails);

      if (chrome.action.setBadgeTextColor) {
        chrome.action.setBadgeTextColor({ color: '#f3f7f0', ...(tabId !== undefined ? { tabId } : {}) });
      }

      const titleText = `GhostGuard: ${unreviewedCount} unreviewed accounts in digital footprint`;
      chrome.action.setTitle({ title: titleText, ...(tabId !== undefined ? { tabId } : {}) });
    } else {
      // All items reviewed and perimeter is clean
      chrome.action.setBadgeText({ text: '', ...(tabId !== undefined ? { tabId } : {}) });
      chrome.action.setTitle({ title: 'GhostGuard: All digital perimeter accounts secured', ...(tabId !== undefined ? { tabId } : {}) });
    }
  } catch (err) {
    console.debug('[GhostGuard SW] Badge update notice:', err.message);
  }
}

/**
 * Refreshes badge across active window
 */
function refreshCurrentTabBadge() {
  if (typeof chrome === 'undefined' || !chrome.tabs) return;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs[0]) {
      updateBadgeForActiveTab(tabs[0].id, tabs[0].url);
    }
  });
}

// Tab switched
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab && tab.url) {
      updateBadgeForActiveTab(activeInfo.tabId, tab.url);
    }
  } catch {}
});

// Tab URL changed or reloaded
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab && tab.url) {
    updateBadgeForActiveTab(tabId, tab.url);
  }
});

// Messages from popup (e.g. after review action, sync, or offline)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && (message.type === 'SYNC_BADGE' || message.type === 'ACCOUNTS_UPDATED')) {
    refreshCurrentTabBadge();
    sendResponse({ success: true });
  }
  return true;
});

// Initial boot
chrome.runtime.onInstalled.addListener(() => {
  getAuditedAccounts().then(() => {
    refreshCurrentTabBadge();
  });
});

