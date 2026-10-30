/**
 * GhostGuard Chrome Extension Popup Logic
 * Communicates directly with local GhostGuard backend on http://localhost:5000
 * Coordinates with web dashboard on http://localhost:3000/dashboard
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
 * Updates connection indicator badge in header
 * @param {'connected' | 'auth_needed' | 'disconnected'} state
 * @param {string} [label]
 */
function updateConnectionStatus(state, label) {
  if (!connectionStatus || !statusText) return;
  connectionStatus.classList.remove('connected', 'auth_needed', 'disconnected');

  if (state === 'connected') {
    connectionStatus.classList.add('connected');
    statusText.textContent = label || '● LIVE WORKSPACE';
  } else if (state === 'auth_needed') {
    connectionStatus.classList.add('auth_needed');
    statusText.textContent = label || '● AUTH NEEDED';
  } else {
    connectionStatus.classList.add('disconnected');
    statusText.textContent = label || '○ Disconnected';
  }
}

/**
 * Synchronizes metrics and discovered accounts with GhostGuard backend
 * @param {boolean} isUserScan
 */
async function syncTelemetry(isUserScan = false) {
  if (isUserScan) {
    if (btnScanInbox) btnScanInbox.disabled = true;
    if (scanSpinner) scanSpinner.classList.remove('hidden');
    if (scanIcon) scanIcon.classList.add('hidden');
    if (scanBtnText) scanBtnText.textContent = 'Scanning...';
    if (scanRadar) scanRadar.classList.remove('hidden');
  }

  try {
    // 1. Fetch Stats directly from /api/audit/stats
    const statsRes = await fetch(`${BACKEND_URL}/api/audit/stats`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (statsRes.status === 401) {
      updateConnectionStatus('auth_needed', '● AUTH NEEDED');
      if (authBanner) authBanner.classList.remove('hidden');
      if (userBanner) userBanner.classList.add('hidden');
      renderEmptyState('Authentication Required', 'Connect your Google account to begin audit.');
      return;
    }

    if (!statsRes.ok) {
      throw new Error(`HTTP ${statsRes.status} from /api/audit/stats`);
    }

    const statsData = await statsRes.json();
    if (statsData.success && statsData.stats) {
      const stats = statsData.stats;
      const total = stats.totalDiscovered ?? 0;
      const highRisk = stats.highRiskCount ?? 0;
      const dormant = stats.dormantCount ?? 0;
      const attention = highRisk + dormant;

      if (statTotal) statTotal.textContent = total;
      if (statAttention) statAttention.textContent = attention;

      const score = stats.ghostScore !== undefined
        ? Math.max(10, 100 - stats.ghostScore)
        : (total > 0 ? Math.max(10, Math.round(((total - highRisk) / total) * 100)) : 100);
      if (statSecurityScore) statSecurityScore.textContent = `${score}%`;

      updateConnectionStatus('connected', '● LIVE WORKSPACE');
    }

    // 2. Fetch Discovered Accounts directly from /api/audit/scan
    const scanRes = await fetch(`${BACKEND_URL}/api/audit/scan`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (scanRes.status === 401) {
      updateConnectionStatus('auth_needed', '● AUTH NEEDED');
      if (authBanner) authBanner.classList.remove('hidden');
      if (userBanner) userBanner.classList.add('hidden');
      renderEmptyState('Authentication Required', 'Connect your Google account to audit your inbox.');
      return;
    }

    if (scanRes.ok) {
      const scanData = await scanRes.json();
      if (authBanner) authBanner.classList.add('hidden');
      updateConnectionStatus('connected', '● LIVE WORKSPACE');

      if (scanData.success && Array.isArray(scanData.assets) && scanData.assets.length > 0) {
        // Render latest 3-5 audited accounts
        renderFindings(scanData.assets.slice(0, 5));
      } else {
        renderEmptyState('No Assets Discovered', 'Scan returned no matching account onboarding emails.');
      }
    }

    // 3. Check /auth/status for active user profile information
    try {
      const authRes = await fetch(`${BACKEND_URL}/auth/status`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      if (authRes.ok) {
        const authData = await authRes.json();
        if (authData.authenticated) {
          const email = authData.email || (authData.user && authData.user.email);
          if (email && userEmailText) {
            userEmailText.textContent = email;
            userEmailText.title = email;
            if (userBanner) userBanner.classList.remove('hidden');
            if (authBanner) authBanner.classList.add('hidden');
          }
        }
      }
    } catch {}

  } catch (err) {
    console.warn('[GhostGuard] Telemetry synchronization error:', err.message);
    updateConnectionStatus('disconnected', '○ Disconnected');
    if (statTotal) statTotal.textContent = '--';
    if (statAttention) statAttention.textContent = '--';
    if (statSecurityScore) statSecurityScore.textContent = '--%';
    renderEmptyState('Backend Offline', 'Could not reach http://localhost:5000. Ensure the GhostGuard server is running.');
  } finally {
    if (isUserScan) {
      if (btnScanInbox) btnScanInbox.disabled = false;
      if (scanSpinner) scanSpinner.classList.add('hidden');
      if (scanIcon) scanIcon.classList.remove('hidden');
      if (scanBtnText) scanBtnText.textContent = 'Scan Inbox';
      if (scanRadar) scanRadar.classList.add('hidden');
    }
  }
}

/**
 * Renders the feed of 3-5 discovered services with category, risk, and action buttons
 * @param {Array<object>} assets
 */
function renderFindings(assets) {
  if (!findingsList) return;
  findingsList.innerHTML = '';
  if (findingsCount) findingsCount.textContent = `${assets.length} items`;

  if (assets.length === 0) {
    renderEmptyState('No Assets Discovered', 'Click "Scan Inbox" to discover registered services and evaluate orphaned digital assets.');
    return;
  }

  // Render latest 3-5 audited accounts
  const items = assets.slice(0, 5);

  items.forEach((asset) => {
    const itemCard = document.createElement('div');
    itemCard.className = 'finding-item';
    itemCard.setAttribute('data-domain', asset.domain);

    const serviceName = asset.serviceName || asset.domain || 'Service';
    const category = asset.category || 'General';

    // Risk badge styling
    const risk = (asset.riskLevel || 'Low').toUpperCase();
    let badgeClass = 'badge-low';
    if (risk === 'HIGH') badgeClass = 'badge-high';
    else if (risk === 'MED' || risk === 'MEDIUM') badgeClass = 'badge-med';

    const ageMonths = asset.ageInMonths ? `${asset.ageInMonths}m old` : 'Recent';
    const dormantTag = asset.isDormant ? ' • Dormant' : '';
    const currentStatus = (asset.status || 'UNREVIEWED').replace(/_/g, ' ');

    itemCard.innerHTML = `
      <div class="finding-header">
        <div class="finding-identity">
          <div class="finding-avatar" title="${serviceName}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2L3 6v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V6l-9-4z"/>
            </svg>
          </div>
          <div class="finding-names">
            <span class="finding-name" title="${serviceName}">${serviceName}</span>
            <div class="finding-subline">
              <span class="finding-category">${category}</span>
              <span class="finding-dot">•</span>
              <span class="finding-domain">${asset.domain}</span>
            </div>
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
        'Content-Type': 'application/json',
        'Accept': 'application/json'
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
        statusLabel.textContent = (data.account.status || action).replace(/_/g, ' ');
      }
      // Re-sync stats in background to update counts
      syncTelemetry(false);
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
      <div class="empty-icon">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#c2d6b8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2L3 6v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V6l-9-4z"/>
        </svg>
      </div>
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
  // Initial telemetry and accounts synchronization
  await syncTelemetry(false);

  // Button: Scan Inbox
  if (btnScanInbox) {
    btnScanInbox.addEventListener('click', () => {
      syncTelemetry(true);
    });
  }

  // Button: Open Web Dashboard
  if (openDashboardBtn) {
    openDashboardBtn.addEventListener('click', handleOpenDashboard);
  }

  // Button: Connect Google Account
  if (btnAuthenticate) {
    btnAuthenticate.addEventListener('click', () => {
      openTab(`${BACKEND_URL}/auth/google`);
    });
  }

  // Button: Refresh Telemetry
  if (btnRefresh) {
    btnRefresh.addEventListener('click', async () => {
      await syncTelemetry(false);
    });
  }
});
