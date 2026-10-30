/**
 * GhostGuard Chrome Extension Popup Logic
 * Communicates with local GhostGuard backend on http://localhost:5000
 */

const BACKEND_URL = 'http://localhost:5000';
const FRONTEND_DASHBOARD_URL = 'http://localhost:3000/dashboard';

// DOM Elements
const connectionStatus = document.getElementById('connectionStatus');
const statusText = document.getElementById('statusText');
const authBanner = document.getElementById('authBanner');
const btnAuthenticate = document.getElementById('btnAuthenticate');

const statTotal = document.getElementById('statTotal');
const statDormant = document.getElementById('statDormant');
const statHighRisk = document.getElementById('statHighRisk');

const btnScanInbox = document.getElementById('btnScanInbox');
const scanSpinner = document.getElementById('scanSpinner');
const scanIcon = document.getElementById('scanIcon');
const scanBtnText = document.getElementById('scanBtnText');
const openDashboardBtn = document.getElementById('open-dashboard-btn');
const btnRefresh = document.getElementById('btnRefresh');

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
 * @param {'connected' | 'disconnected' | 'auth_needed'} state
 * @param {string} [label]
 */
function updateConnectionStatus(state, label) {
  connectionStatus.classList.remove('connected', 'disconnected');

  if (state === 'connected') {
    connectionStatus.classList.add('connected');
    statusText.textContent = label || 'Connected';
  } else if (state === 'auth_needed') {
    connectionStatus.classList.add('disconnected');
    statusText.textContent = label || 'Needs Auth';
  } else {
    connectionStatus.classList.add('disconnected');
    statusText.textContent = label || 'Offline';
  }
}

/**
 * Fetches high-level metrics from backend
 */
async function loadStats() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/audit/stats`);
    if (res.status === 401) {
      updateConnectionStatus('auth_needed', 'Needs Auth');
      authBanner.classList.remove('hidden');
      return false;
    }

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }

    const data = await res.json();
    if (data.success && data.stats) {
      statTotal.textContent = data.stats.totalDiscovered ?? 0;
      statDormant.textContent = data.stats.dormantCount ?? 0;
      statHighRisk.textContent = data.stats.highRiskCount ?? 0;
      updateConnectionStatus('connected', 'Connected');
      authBanner.classList.add('hidden');
      return true;
    }
    return false;
  } catch (err) {
    console.warn('[GhostGuard] Failed to fetch stats:', err.message);
    updateConnectionStatus('disconnected', 'Offline');
    statTotal.textContent = '--';
    statDormant.textContent = '--';
    statHighRisk.textContent = '--';
    return false;
  }
}

/**
 * Triggers or fetches inbox scan findings
 * @param {boolean} isUserTriggered
 */
async function loadFindings(isUserTriggered = false) {
  if (isUserTriggered) {
    btnScanInbox.disabled = true;
    scanSpinner.classList.remove('hidden');
    scanIcon.classList.add('hidden');
    scanBtnText.textContent = 'Scanning...';
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/audit/scan`);

    if (res.status === 401) {
      updateConnectionStatus('auth_needed', 'Needs Auth');
      authBanner.classList.remove('hidden');
      renderEmptyState('Authentication Required', 'Please log in with Google to scan your inbox for accounts.');
      return;
    }

    if (!res.ok) {
      throw new Error(`Audit scan failed with HTTP ${res.status}`);
    }

    const data = await res.json();
    authBanner.classList.add('hidden');
    updateConnectionStatus('connected', 'Connected');

    if (data.success && Array.isArray(data.assets)) {
      renderFindings(data.assets);
      await loadStats();
    } else {
      renderEmptyState('No Assets Discovered', 'Scan returned no matching account registration emails.');
    }
  } catch (err) {
    console.error('[GhostGuard] Scan error:', err);
    updateConnectionStatus('disconnected', 'Offline');
    renderEmptyState('Backend Offline', 'Could not reach http://localhost:5000. Ensure the GhostGuard server is running.');
  } finally {
    if (isUserTriggered) {
      btnScanInbox.disabled = false;
      scanSpinner.classList.add('hidden');
      scanIcon.classList.remove('hidden');
      scanBtnText.textContent = 'Scan Inbox';
    }
  }
}

/**
 * Renders the feed of discovered orphaned/audited services
 * @param {Array<object>} assets
 */
function renderFindings(assets) {
  findingsList.innerHTML = '';
  findingsCount.textContent = `${assets.length} items`;

  if (assets.length === 0) {
    renderEmptyState('No Assets Discovered', 'Click "Scan Inbox" to inspect your digital footprint.');
    return;
  }

  // Sort: High risk first, then dormant, then highest ghostScore
  const sorted = [...assets].sort((a, b) => {
    const riskWeight = { High: 3, Medium: 2, Low: 1 };
    const rA = riskWeight[a.riskLevel] || 0;
    const rB = riskWeight[b.riskLevel] || 0;
    if (rB !== rA) return rB - rA;
    return (b.ghostScore || 0) - (a.ghostScore || 0);
  });

  sorted.forEach((asset) => {
    const itemCard = document.createElement('div');
    itemCard.className = 'finding-item';
    itemCard.setAttribute('data-domain', asset.domain);

    // Risk badge class
    const risk = (asset.riskLevel || 'Low').toUpperCase();
    let badgeClass = 'badge-low';
    if (risk === 'HIGH') badgeClass = 'badge-high';
    else if (risk === 'MED' || risk === 'MEDIUM') badgeClass = 'badge-med';

    // Age text
    const ageMonths = asset.ageInMonths ? `${asset.ageInMonths}m old` : 'Recent';

    // Status label
    const currentStatus = (asset.status || 'UNREVIEWED').replace(/_/g, ' ');

    itemCard.innerHTML = `
      <div class="finding-header">
        <div class="finding-identity">
          <span class="finding-name" title="${asset.serviceName || asset.domain}">${asset.serviceName || asset.domain}</span>
          <span class="badge ${badgeClass}">${risk.slice(0, 4)}</span>
        </div>
        <span class="badge badge-status status-label">${currentStatus}</span>
      </div>
      <div class="finding-meta">
        <span class="finding-domain">${asset.domain}</span>
        <span class="finding-age">${ageMonths}${asset.isDormant ? ' • Dormant' : ''}</span>
      </div>
      <div class="finding-actions">
        <button class="btn-item btn-item-secure" data-action="SECURED" title="Mark account as secured with 2FA">Secure</button>
        <button class="btn-item btn-item-revoke" data-action="REVOKED" title="Mark account as revoked or closed">Revoke</button>
      </div>
    `;

    // Attach Action Listeners
    const secureBtn = itemCard.querySelector('[data-action="SECURED"]');
    const revokeBtn = itemCard.querySelector('[data-action="REVOKED"]');

    secureBtn.addEventListener('click', () => handleItemAction(asset.domain, 'SECURED', itemCard));
    revokeBtn.addEventListener('click', () => handleItemAction(asset.domain, 'REVOKED', itemCard));

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
      // Re-fetch metrics in background
      loadStats();
    } else {
      alert(`Action failed: ${data.error || 'Unknown error'}`);
    }
  } catch (err) {
    console.error('Failed to post action:', err);
    alert(`Could not update account: ${err.message}`);
  } finally {
    buttons.forEach((b) => (b.disabled = false));
  }
}

/**
 * Helper to render empty or error state card in feed
 */
function renderEmptyState(title, subtitle) {
  findingsList.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">👻</div>
      <p class="empty-title">${title}</p>
      <p class="empty-sub">${subtitle}</p>
    </div>
  `;
  findingsCount.textContent = '0 items';
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
  // 1. Initial health & stats check
  const isOnline = await loadStats();

  // 2. Load feed
  if (isOnline) {
    await loadFindings(false);
  } else {
    renderEmptyState('Backend Offline', 'Ensure "npm run dev" or "npm start" is running on http://localhost:5000.');
  }

  // 3. Button: Scan Inbox
  btnScanInbox.addEventListener('click', () => {
    loadFindings(true);
  });

  // 4. Button: Open Web Dashboard
  if (openDashboardBtn) {
    openDashboardBtn.addEventListener('click', handleOpenDashboard);
  }

  // 5. Button: Google Authenticate CTA
  btnAuthenticate.addEventListener('click', () => {
    openTab(`${BACKEND_URL}/auth/google`);
  });

  // 6. Button: Refresh Telemetry
  btnRefresh.addEventListener('click', async () => {
    await loadStats();
    await loadFindings(false);
  });
});

