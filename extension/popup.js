/**
 * GhostGuard Chrome Extension Popup Logic
 * Communicates with local GhostGuard backend on http://localhost:5000
 * Syncs with web dashboard on http://localhost:3000/dashboard
 */

const BACKEND_URL = 'http://localhost:5000';
const FRONTEND_DASHBOARD_URL = 'http://localhost:3000/dashboard';

// DOM Elements
const connectionStatus = document.getElementById('connectionStatus');
const statusText = document.getElementById('statusText');
const userBanner = document.getElementById('userBanner');
const userEmailText = document.getElementById('userEmailText');
const authBanner = document.getElementById('authBanner');
const btnAuthenticate = document.getElementById('btnAuthenticate');

const statTotal = document.getElementById('statTotal');
const statAttention = document.getElementById('statAttention');
const statSecurityScore = document.getElementById('statSecurityScore');

const btnScanInbox = document.getElementById('btnScanInbox');
const scanSpinner = document.getElementById('scanSpinner');
const scanIcon = document.getElementById('scanIcon');
const scanBtnText = document.getElementById('scanBtnText');
const openDashboardBtn = document.getElementById('open-dashboard-btn');
const btnRefresh = document.getElementById('btnRefresh');

const scanRadar = document.getElementById('scanRadar');
const findingsCount = document.getElementById('findingsCount');
const findingsList = document.getElementById('findingsList');

/**
 * Helper to open URLs via Chrome Tabs API with fallback for standalone browser preview
 */
function openTab(url) {
  if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
    chrome.tabs.create({ url });
  } else {
    window.open(url, '_blank');
  }
}

/**
 * Updates connection indicator in header
 * @param {'connected' | 'disconnected'} state
 * @param {string} [label]
 */
function updateConnectionStatus(state, label) {
  if (!connectionStatus || !statusText) return;
  connectionStatus.classList.remove('connected', 'disconnected');

  if (state === 'connected') {
    connectionStatus.classList.add('connected');
    statusText.textContent = label || '● LIVE WORKSPACE';
  } else {
    connectionStatus.classList.add('disconnected');
    statusText.textContent = label || '○ Disconnected';
  }
}

/**
 * Checks authentication status with GhostGuard backend
 */
async function checkAuthStatus() {
  try {
    const res = await fetch(`${BACKEND_URL}/auth/status`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    if (data.authenticated) {
      const email = data.email || (data.user && data.user.email) || 'Connected User';
      if (userEmailText) {
        userEmailText.textContent = email;
        userEmailText.title = email;
      }
      if (userBanner) userBanner.classList.remove('hidden');
      if (authBanner) authBanner.classList.add('hidden');
      updateConnectionStatus('connected', '● LIVE WORKSPACE');
      return true;
    } else {
      if (userBanner) userBanner.classList.add('hidden');
      if (authBanner) authBanner.classList.remove('hidden');
      updateConnectionStatus('disconnected', '○ Needs Auth');
      return false;
    }
  } catch (err) {
    console.warn('[GhostGuard] Auth status error:', err.message);
    if (userBanner) userBanner.classList.add('hidden');
    if (authBanner) authBanner.classList.add('hidden');
    updateConnectionStatus('disconnected', '○ Disconnected');
    return false;
  }
}

/**
 * Fetches high-level metrics from backend
 */
async function loadStats() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/audit/stats`);
    if (res.status === 401) {
      updateConnectionStatus('disconnected', '○ Needs Auth');
      if (authBanner) authBanner.classList.remove('hidden');
      if (userBanner) userBanner.classList.add('hidden');
      return false;
    }

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }

    const data = await res.json();
    if (data.success && data.stats) {
      const stats = data.stats;
      const total = stats.totalDiscovered ?? 0;
      const highRisk = stats.highRiskCount ?? 0;
      const dormant = stats.dormantCount ?? 0;
      const attention = highRisk + dormant;

      if (statTotal) statTotal.textContent = total;
      if (statAttention) statAttention.textContent = attention;

      // Dynamic Security Score calculation
      const score = total > 0
        ? Math.max(10, Math.round(((total - highRisk) / total) * 100))
        : 100;
      if (statSecurityScore) statSecurityScore.textContent = `${score}%`;

      updateConnectionStatus('connected', '● LIVE WORKSPACE');
      return true;
    }
    return false;
  } catch (err) {
    console.warn('[GhostGuard] Failed to fetch stats:', err.message);
    if (statTotal) statTotal.textContent = '--';
    if (statAttention) statAttention.textContent = '--';
    if (statSecurityScore) statSecurityScore.textContent = '--%';
    return false;
  }
}

/**
 * Initial feed hydration: loads stored accounts or triggers scan
 */
async function loadInitialFeed() {
  try {
    // 1. Try reading stored accounts first for instant response
    const res = await fetch(`${BACKEND_URL}/api/audit/accounts`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.assets) && data.assets.length > 0) {
        renderFindings(data.assets);
        return;
      }
    }

    // 2. If store is empty, run scan without user spinner
    await loadFindings(false);
  } catch (err) {
    console.warn('[GhostGuard] Initial feed fetch warning:', err.message);
    renderEmptyState('Backend Offline', 'Ensure the GhostGuard server is running on http://localhost:5000.');
  }
}

/**
 * Triggers or fetches inbox scan findings
 * @param {boolean} isUserTriggered
 */
async function loadFindings(isUserTriggered = false) {
  if (isUserTriggered) {
    if (btnScanInbox) btnScanInbox.disabled = true;
    if (scanSpinner) scanSpinner.classList.remove('hidden');
    if (scanIcon) scanIcon.classList.add('hidden');
    if (scanBtnText) scanBtnText.textContent = 'Scanning...';
    if (scanRadar) scanRadar.classList.remove('hidden');
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/audit/scan`);

    if (res.status === 401) {
      updateConnectionStatus('disconnected', '○ Needs Auth');
      if (authBanner) authBanner.classList.remove('hidden');
      if (userBanner) userBanner.classList.add('hidden');
      renderEmptyState('Authentication Required', 'Please connect your Google account to audit your inbox for orphaned assets.');
      return;
    }

    if (!res.ok) {
      throw new Error(`Audit scan failed with HTTP ${res.status}`);
    }

    const data = await res.json();
    if (authBanner) authBanner.classList.add('hidden');
    updateConnectionStatus('connected', '● LIVE WORKSPACE');

    if (data.success && Array.isArray(data.assets) && data.assets.length > 0) {
      renderFindings(data.assets);
      await loadStats();
    } else {
      renderEmptyState('No Assets Discovered', 'Scan returned no matching account onboarding emails.');
    }
  } catch (err) {
    console.error('[GhostGuard] Scan error:', err);
    updateConnectionStatus('disconnected', '○ Disconnected');
    renderEmptyState('Backend Offline', 'Could not reach http://localhost:5000. Ensure the GhostGuard server is running.');
  } finally {
    if (isUserTriggered) {
      if (btnScanInbox) btnScanInbox.disabled = false;
      if (scanSpinner) scanSpinner.classList.add('hidden');
      if (scanIcon) scanIcon.classList.remove('hidden');
      if (scanBtnText) scanBtnText.textContent = 'Scan Inbox';
      if (scanRadar) scanRadar.classList.add('hidden');
    }
  }
}

/**
 * Renders the feed of discovered orphaned/audited services
 * @param {Array<object>} assets
 */
function renderFindings(assets) {
  if (!findingsList) return;
  findingsList.innerHTML = '';
  if (findingsCount) findingsCount.textContent = `${assets.length} items`;

  if (assets.length === 0) {
    renderEmptyState('No Assets Discovered', 'Click "Scan Inbox" to inspect your digital footprint.');
    return;
  }

  // Sort: High risk first, then medium, then dormant
  const sorted = [...assets].sort((a, b) => {
    const riskWeight = { HIGH: 3, High: 3, MEDIUM: 2, Medium: 2, LOW: 1, Low: 1 };
    const rA = riskWeight[a.riskLevel] || 0;
    const rB = riskWeight[b.riskLevel] || 0;
    if (rB !== rA) return rB - rA;
    return (b.ghostScore || 0) - (a.ghostScore || 0);
  });

  // Take top 12 items for clean extension popup scrolling
  sorted.slice(0, 12).forEach((asset) => {
    const itemCard = document.createElement('div');
    itemCard.className = 'finding-item';
    itemCard.setAttribute('data-domain', asset.domain);

    const serviceName = asset.serviceName || asset.domain || 'Service';
    const firstLetter = serviceName.charAt(0).toUpperCase();

    // Risk badge styling
    const risk = (asset.riskLevel || 'Low').toUpperCase();
    let badgeClass = 'badge-low';
    let avatarClass = '';
    if (risk === 'HIGH') {
      badgeClass = 'badge-high';
      avatarClass = 'high';
    } else if (risk === 'MED' || risk === 'MEDIUM') {
      badgeClass = 'badge-med';
      avatarClass = 'med';
    }

    // Age / dormancy tag
    const ageMonths = asset.ageInMonths ? `${asset.ageInMonths}m old` : 'Recent';
    const dormantTag = asset.isDormant ? ' • Dormant' : '';

    // Status label
    const currentStatus = (asset.status || 'UNREVIEWED').replace(/_/g, ' ');

    itemCard.innerHTML = `
      <div class="finding-header">
        <div class="finding-identity">
          <div class="finding-avatar ${avatarClass}" title="${serviceName}">${firstLetter}</div>
          <div class="finding-names">
            <span class="finding-name" title="${serviceName}">${serviceName}</span>
            <span class="finding-domain" title="${asset.domain}">${asset.domain}</span>
          </div>
        </div>
        <div class="finding-badges">
          <span class="badge ${badgeClass}">${risk.slice(0, 4)}</span>
          <span class="badge badge-status status-label">${currentStatus}</span>
        </div>
      </div>
      <div class="finding-actions">
        <span class="finding-age">${ageMonths}${dormantTag}</span>
        <div class="finding-action-btns">
          <button class="btn-item btn-item-secure" data-action="SECURED" title="Mark account as secured">Secure</button>
          <button class="btn-item btn-item-revoke" data-action="REVOKED" title="Mark account as revoked">Revoke</button>
        </div>
      </div>
    `;

    // Action listeners
    const secureBtn = itemCard.querySelector('[data-action="SECURED"]');
    const revokeBtn = itemCard.querySelector('[data-action="REVOKED"]');

    if (secureBtn) {
      secureBtn.addEventListener('click', () => handleItemAction(asset.domain, 'SECURED', itemCard));
    }
    if (revokeBtn) {
      revokeBtn.addEventListener('click', () => handleItemAction(asset.domain, 'REVOKED', itemCard));
    }

    findingsList.appendChild(itemCard);
  });
}

/**
 * Handles action status updates (SECURED / REVOKED)
 * @param {string} domain
 * @param {'SECURED' | 'REVOKED'} action
 * @param {HTMLElement} itemCard
 */
async function handleItemAction(domain, action, itemCard) {
  const buttons = itemCard.querySelectorAll('.btn-item');
  buttons.forEach((b) => (b.disabled = true));

  try {
    const res = await fetch(`${BACKEND_URL}/api/audit/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        domain,
        action,
        notes: `Updated via Chrome Extension at ${new Date().toLocaleTimeString()}`
      })
    });

    const data = await res.json();
    if (data.success && data.account) {
      const statusLabel = itemCard.querySelector('.status-label');
      if (statusLabel) {
        statusLabel.textContent = data.account.status.replace(/_/g, ' ');
      }
      // Re-fetch metrics in background to reflect change
      loadStats();
    } else {
      console.warn('Action failed:', data.error);
    }
  } catch (err) {
    console.error('Failed to post action:', err);
  } finally {
    buttons.forEach((b) => (b.disabled = false));
  }
}

/**
 * Helper to render empty or error state card in feed
 */
function renderEmptyState(title, subtitle) {
  if (!findingsList) return;
  findingsList.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">🛡️</div>
      <p class="empty-title">${title}</p>
      <p class="empty-sub">${subtitle}</p>
    </div>
  `;
  if (findingsCount) findingsCount.textContent = '0 items';
}

/**
 * Handles switching to an existing dashboard tab or opening a new one
 */
function handleOpenDashboard() {
  const targetUrl = FRONTEND_DASHBOARD_URL;
  const urlPattern = 'http://localhost:3000/*';

  if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
    try {
      chrome.tabs.query({ url: urlPattern }, (tabs) => {
        if (chrome.runtime && chrome.runtime.lastError) {
          console.warn('[GhostGuard] chrome.tabs.query warning:', chrome.runtime.lastError.message);
          chrome.tabs.create({ url: targetUrl });
          window.close();
          return;
        }

        if (tabs && tabs.length > 0) {
          const existingTab = tabs[0];
          // Focus existing tab
          chrome.tabs.update(existingTab.id, { active: true }, () => {
            // Focus the window containing the tab
            if (existingTab.windowId && chrome.windows && chrome.windows.update) {
              chrome.windows.update(existingTab.windowId, { focused: true }, () => {
                window.close();
              });
            } else {
              window.close();
            }
          });
        } else {
          // If no matching tab is found, open a new tab targeting http://localhost:3000/dashboard
          chrome.tabs.create({ url: targetUrl }, () => {
            window.close();
          });
        }
      });
    } catch (err) {
      console.error('[GhostGuard] Tab navigation error:', err);
      chrome.tabs.create({ url: targetUrl });
      window.close();
    }
  } else {
    // Fallback for non-extension preview
    window.open(targetUrl, '_blank');
  }
}

/**
 * Initialization and Event Bindings
 */
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Check user auth status
  await checkAuthStatus();

  // 2. Initial stats check
  await loadStats();

  // 3. Load initial feed
  await loadInitialFeed();

  // 4. Button: Scan Inbox
  if (btnScanInbox) {
    btnScanInbox.addEventListener('click', () => {
      loadFindings(true);
    });
  }

  // 5. Button: Open Web Dashboard
  if (openDashboardBtn) {
    openDashboardBtn.addEventListener('click', handleOpenDashboard);
  }

  // 6. Button: Google Authenticate CTA
  if (btnAuthenticate) {
    btnAuthenticate.addEventListener('click', () => {
      openTab(`${BACKEND_URL}/auth/google`);
    });
  }

  // 7. Button: Refresh Telemetry
  if (btnRefresh) {
    btnRefresh.addEventListener('click', async () => {
      await checkAuthStatus();
      await loadStats();
      await loadInitialFeed();
    });
  }
});
