/**
 * GhostGuard Chrome Extension Popup Logic
 * Real-Time Digital Perimeter Defender
 * Communicates with backend on http://localhost:5000 & coordinates with dashboard
 */

const BACKEND_URL = 'http://localhost:5000';
const FRONTEND_DASHBOARD_URL = 'http://localhost:3000/dashboard';
const GOOGLE_CONNECTIONS_URL = 'https://myaccount.google.com/connections';

// DOM Elements: Header & Status
const connectionStatus = document.getElementById('connectionStatus');
const statusText = document.getElementById('statusText');
const userBanner = document.getElementById('userBanner');
const userEmailText = document.getElementById('userEmailText');
const authBanner = document.getElementById('authBanner');
const btnAuthenticate = document.getElementById('btnAuthenticate');
const offlineAlertCard = document.getElementById('offlineAlertCard');
const btnRetryConnection = document.getElementById('btnRetryConnection');

// DOM Elements: Perimeter Defender (Module 1)
const perimeterDot = document.getElementById('perimeterDot');
const perimeterStatusText = document.getElementById('perimeterStatusText');
const perimeterDomainBadge = document.getElementById('perimeterDomainBadge');
const perimeterContent = document.getElementById('perimeterContent');

// DOM Elements: Metrics
const statTotal = document.getElementById('statTotal');
const statAttention = document.getElementById('statAttention');
const statSecurityScore = document.getElementById('statSecurityScore');

// DOM Elements: Actions Toolbar
const btnScanInbox = document.getElementById('btnScanInbox');
const scanSpinner = document.getElementById('scanSpinner');
const scanIcon = document.getElementById('scanIcon');
const scanBtnText = document.getElementById('scanBtnText');
const openDashboardBtn = document.getElementById('open-dashboard-btn');

// DOM Elements: Findings Section
const scanRadar = document.getElementById('scanRadar');
const findingsCount = document.getElementById('findingsCount');
const findingsList = document.getElementById('findingsList');

// DOM Elements: Tools Bar & Footer (Module 4)
const btnExportReport = document.getElementById('btnExportReport');
const exportBtnText = document.getElementById('exportBtnText');
const btnLiveSync = document.getElementById('btnLiveSync');
const liveSyncIcon = document.getElementById('liveSyncIcon');
const liveSyncSpinner = document.getElementById('liveSyncSpinner');
const liveSyncText = document.getElementById('liveSyncText');
const btnRefresh = document.getElementById('btnRefresh');
const footerMetaText = document.getElementById('footerMetaText');

// In-Memory State Cache
let state = {
  accounts: [],
  stats: null,
  activeTab: null,
  userEmail: null,
  isOffline: false
};

/**
 * Returns security settings URL for a given domain
 * @param {string} domain
 * @returns {string}
 */
function getServiceSecurityUrl(domain) {
  if (!domain) return 'https://google.com';
  const clean = domain.replace(/^www\./i, '').toLowerCase();
  const known = {
    'github.com': 'https://github.com/settings/security',
    'google.com': 'https://myaccount.google.com/security',
    'notion.so': 'https://www.notion.so/my-account',
    'slack.com': 'https://my.slack.com/account/settings',
    'figma.com': 'https://www.figma.com/settings',
    'stripe.com': 'https://dashboard.stripe.com/settings',
    'docker.com': 'https://hub.docker.com/settings/security',
    'coinbase.com': 'https://www.coinbase.com/settings/security_settings',
    'twitter.com': 'https://twitter.com/settings/security',
    'x.com': 'https://x.com/settings/security',
    'spotify.com': 'https://www.spotify.com/account/change-password/',
    'airbnb.com': 'https://www.airbnb.com/users/security',
    'quora.com': 'https://www.quora.com/settings',
    'dropbox.com': 'https://www.dropbox.com/account/security',
    'linkedin.com': 'https://www.linkedin.com/psettings/security',
    'reddit.com': 'https://www.reddit.com/settings/account'
  };
  return known[clean] || `https://${clean}`;
}

/**
 * Opens a URL in a new tab via Chrome Tabs API with window.open fallback
 * @param {string} url
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
 * @param {'connected' | 'auth_needed' | 'disconnected'} mode
 * @param {string} [label]
 */
function updateConnectionStatus(mode, label) {
  if (!connectionStatus || !statusText) return;
  connectionStatus.classList.remove('connected', 'auth_needed', 'disconnected');

  if (mode === 'connected') {
    connectionStatus.classList.add('connected');
    statusText.textContent = label || '● LIVE PERIMETER';
    if (offlineAlertCard) offlineAlertCard.classList.add('hidden');
    state.isOffline = false;
  } else if (mode === 'auth_needed') {
    connectionStatus.classList.add('auth_needed');
    statusText.textContent = label || '● AUTH NEEDED';
    if (offlineAlertCard) offlineAlertCard.classList.add('hidden');
    state.isOffline = false;
  } else {
    connectionStatus.classList.add('disconnected');
    statusText.textContent = label || '○ OFFLINE';
    if (offlineAlertCard) offlineAlertCard.classList.remove('hidden');
    state.isOffline = true;
  }
}

/**
 * Normalizes and extracts hostname from URL
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
 * Matches hostname against audited assets
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
 * MODULE 1: Live Tab Perimeter & Ghost Account Detection
 * Inspects active browser tab and renders perimeter status
 * @param {Array<object>} accounts
 */
async function inspectActiveTabPerimeter(accounts) {
  if (!perimeterContent || !perimeterStatusText || !perimeterDot || !perimeterDomainBadge) return;

  const resolveTab = () => new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0]) resolve(tabs[0]);
        else resolve(null);
      });
    } else {
      resolve(null);
    }
  });

  const tab = await resolveTab();
  state.activeTab = tab;

  if (!tab || !tab.url) {
    // Non-extension preview or blank tab
    perimeterDot.className = 'perimeter-dot neutral';
    perimeterStatusText.className = 'perimeter-status-title';
    perimeterStatusText.textContent = '○ PERIMETER READY';
    perimeterDomainBadge.textContent = 'Active View';
    perimeterContent.innerHTML = `
      <div class="perimeter-clean-body">
        <span class="perimeter-clean-icon">🛡️</span>
        <span>Open any web service or app to inspect active digital perimeter.</span>
      </div>
    `;
    return;
  }

  const hostname = extractHostname(tab.url);

  if (!hostname) {
    // Internal browser page (chrome://, about:blank, etc.)
    perimeterDot.className = 'perimeter-dot neutral';
    perimeterStatusText.className = 'perimeter-status-title';
    perimeterStatusText.textContent = '○ INTERNAL BROWSER PAGE';
    perimeterDomainBadge.textContent = 'Browser Internal';
    perimeterContent.innerHTML = `
      <div class="perimeter-clean-body">
        <span class="perimeter-clean-icon">⚙️</span>
        <span>Internal browser page. Navigate to external domains to audit perimeter exposure.</span>
      </div>
    `;
    return;
  }

  perimeterDomainBadge.textContent = hostname;
  const matched = findMatchingAccount(accounts, hostname);

  if (matched) {
    // Case A: Registered Account on Current Site!
    const ghostScore = typeof matched.ghostScore === 'number' ? matched.ghostScore : 25;
    const rawRisk = (matched.riskLevel || 'Low').toUpperCase();
    const isHigh = rawRisk === 'HIGH' || ghostScore >= 70;
    const isMed = rawRisk === 'MED' || rawRisk === 'MEDIUM' || (ghostScore >= 40 && ghostScore < 70);

    let riskClass = 'low';
    let riskLabel = 'Low Risk';
    if (isHigh) {
      riskClass = 'high';
      riskLabel = matched.isDormant ? 'High Risk (Dormant)' : 'High Risk';
    } else if (isMed) {
      riskClass = 'med';
      riskLabel = matched.isDormant ? 'Med Risk (Dormant)' : 'Med Risk';
    } else if (matched.isDormant) {
      riskLabel = 'Low Risk (Dormant)';
    }

    perimeterDot.className = `perimeter-dot detected-${riskClass}`;
    perimeterStatusText.className = `perimeter-status-title detected-${riskClass}`;
    perimeterStatusText.textContent = '● REGISTERED IDENTITY DETECTED';

    const category = matched.category || 'Discovered Service';
    const statusLabel = (matched.status || 'UNREVIEWED').replace(/_/g, ' ');

    perimeterContent.innerHTML = `
      <div class="perimeter-match-body">
        <div class="perimeter-info">
          <div class="perimeter-score-pill ${riskClass}">
            <span>Score: ${ghostScore}/100 • ${riskLabel}</span>
          </div>
          <span class="perimeter-meta-line">${category} • Status: ${statusLabel}</span>
        </div>
        <button id="btnPerimeterRemediate" class="btn-perimeter-remediate" title="Remediate account on dashboard">
          <span>⚡ Secure / Revoke</span>
        </button>
      </div>
    `;

    const btnRemediate = document.getElementById('btnPerimeterRemediate');
    if (btnRemediate) {
      btnRemediate.addEventListener('click', () => {
        openTab(`${FRONTEND_DASHBOARD_URL}/accounts`);
      });
    }

  } else {
    // Case B: Unknown / Fresh Site (No GhostGuard Record)
    perimeterDot.className = 'perimeter-dot clean';
    perimeterStatusText.className = 'perimeter-status-title clean';
    perimeterStatusText.textContent = '○ NO GHOSTGUARD RECORD';

    perimeterContent.innerHTML = `
      <div class="perimeter-clean-body">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="perimeter-clean-icon">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <polyline points="9 12 11 14 15 10"/>
        </svg>
        <span>No previous registrations or tokens discovered for this domain.</span>
      </div>
    `;
  }
}

/**
 * Synchronizes metrics and discovered accounts with GhostGuard backend
 * Supports offline storage fallback and background badge refresh
 * @param {boolean} isUserScan
 */
async function syncTelemetry(isUserScan = false) {
  if (isUserScan) {
    if (btnScanInbox) btnScanInbox.disabled = true;
    if (scanSpinner) scanSpinner.classList.remove('hidden');
    if (scanIcon) scanIcon.classList.add('hidden');
    if (scanBtnText) scanBtnText.textContent = 'Scanning...';
    if (scanRadar) scanRadar.classList.remove('hidden');

    if (btnLiveSync) btnLiveSync.disabled = true;
    if (liveSyncSpinner) liveSyncSpinner.classList.remove('hidden');
    if (liveSyncIcon) liveSyncIcon.classList.add('hidden');
    if (liveSyncText) liveSyncText.textContent = 'Syncing...';
  }

  try {
    // 1. Fetch Stats from /api/audit/stats
    const statsRes = await fetch(`${BACKEND_URL}/api/audit/stats`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (statsRes.status === 401) {
      updateConnectionStatus('auth_needed', '● AUTH NEEDED');
      if (authBanner) authBanner.classList.remove('hidden');
      if (userBanner) userBanner.classList.add('hidden');
      renderEmptyState('Authentication Required', 'Connect your Google account to begin perimeter audit.');
      return;
    }

    if (!statsRes.ok) {
      throw new Error(`HTTP ${statsRes.status} from /api/audit/stats`);
    }

    const statsData = await statsRes.json();
    if (statsData.success && (statsData.stats || statsData.totalDiscovered !== undefined)) {
      const stats = statsData.stats || statsData;
      state.stats = stats;

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

      updateConnectionStatus('connected', '● LIVE PERIMETER');
    }

    // 2. Fetch Discovered Accounts from /api/audit/scan or /api/audit/accounts
    const accountsRes = await fetch(`${BACKEND_URL}/api/audit/accounts`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (accountsRes.ok) {
      const accData = await accountsRes.json();
      if (accData.success && Array.isArray(accData.assets)) {
        state.accounts = accData.assets;
        if (authBanner) authBanner.classList.add('hidden');
        updateConnectionStatus('connected', '● LIVE PERIMETER');

        // Cache in chrome.storage.local for background service worker
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({
            gg_accounts: accData.assets,
            gg_stats: state.stats,
            gg_last_sync: Date.now()
          });

          // Notify background worker to refresh badge
          if (chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({ type: 'ACCOUNTS_UPDATED' }).catch(() => {});
          }
        }

        // Render findings
        renderFindings(accData.assets.slice(0, 5));

        // Evaluate active tab perimeter
        await inspectActiveTabPerimeter(accData.assets);
      }
    } else {
      // Fallback to scan if accounts endpoint empty
      const scanRes = await fetch(`${BACKEND_URL}/api/audit/scan`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      if (scanRes.ok) {
        const scanData = await scanRes.json();
        if (scanData.success && Array.isArray(scanData.assets)) {
          state.accounts = scanData.assets;
          renderFindings(scanData.assets.slice(0, 5));
          await inspectActiveTabPerimeter(scanData.assets);
        }
      }
    }

    // 3. Check /auth/status for active user profile information
    try {
      const authRes = await fetch(`${BACKEND_URL}/auth/status`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      if (authRes.ok) {
        const authData = await authRes.json();
        if (authData.authenticated) {
          const email = authData.email || (authData.user && authData.user.email);
          if (email) {
            state.userEmail = email;
            if (userEmailText) {
              userEmailText.textContent = email;
              userEmailText.title = email;
            }
            if (userBanner) userBanner.classList.remove('hidden');
            if (authBanner) authBanner.classList.add('hidden');
          }
        }
      }
    } catch {}

  } catch (err) {
    console.warn('[GhostGuard] Telemetry synchronization offline:', err.message);
    updateConnectionStatus('disconnected', '○ OFFLINE');

    // Attempt to load from chrome.storage.local cache
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['gg_accounts', 'gg_stats'], (cached) => {
        if (cached && Array.isArray(cached.gg_accounts) && cached.gg_accounts.length > 0) {
          state.accounts = cached.gg_accounts;
          state.stats = cached.gg_stats;
          renderFindings(cached.gg_accounts.slice(0, 5));
          inspectActiveTabPerimeter(cached.gg_accounts);

          if (cached.gg_stats) {
            if (statTotal) statTotal.textContent = cached.gg_stats.totalDiscovered ?? cached.gg_accounts.length;
            if (statAttention) statAttention.textContent = (cached.gg_stats.highRiskCount || 0) + (cached.gg_stats.dormantCount || 0);
            if (statSecurityScore) statSecurityScore.textContent = `${Math.max(10, 100 - (cached.gg_stats.ghostScore || 20))}%`;
          }

          if (footerMetaText) footerMetaText.textContent = 'GhostGuard v1.1 • Cached Offline Mode';
          return;
        }

        renderEmptyState('Backend Offline', 'Could not reach http://localhost:5000. Start the GhostGuard server to audit your digital footprint.');
      });
    } else {
      renderEmptyState('Backend Offline', 'Could not reach http://localhost:5000. Start the GhostGuard server to audit your digital footprint.');
    }
  } finally {
    if (isUserScan) {
      if (btnScanInbox) btnScanInbox.disabled = false;
      if (scanSpinner) scanSpinner.classList.add('hidden');
      if (scanIcon) scanIcon.classList.remove('hidden');
      if (scanBtnText) scanBtnText.textContent = 'Scan Inbox';
      if (scanRadar) scanRadar.classList.add('hidden');

      if (btnLiveSync) btnLiveSync.disabled = false;
      if (liveSyncSpinner) liveSyncSpinner.classList.add('hidden');
      if (liveSyncIcon) liveSyncIcon.classList.remove('hidden');
      if (liveSyncText) {
        liveSyncText.textContent = 'Synced ✓';
        setTimeout(() => { liveSyncText.textContent = 'Live Sync'; }, 2000);
      }
    }
  }
}

/**
 * MODULE 2: In-Popup Quick Remediation Actions
 * Renders discovered services with Ghost Score pill, initial avatar, and micro-actions
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

  assets.forEach((asset) => {
    const itemCard = document.createElement('div');
    itemCard.className = 'finding-item';
    itemCard.setAttribute('data-domain', asset.domain);

    const serviceName = asset.serviceName || asset.domain || 'Service';
    const category = asset.category || 'General';
    const domain = asset.domain || '';
    const initial = serviceName.charAt(0).toUpperCase();

    // Risk badge styling
    const risk = (asset.riskLevel || 'Low').toUpperCase();
    let badgeClass = 'badge-low';
    if (risk === 'HIGH') badgeClass = 'badge-high';
    else if (risk === 'MED' || risk === 'MEDIUM') badgeClass = 'badge-med';

    const ghostScore = typeof asset.ghostScore === 'number' ? asset.ghostScore : 20;
    const ageMonths = asset.ageInMonths ? `${asset.ageInMonths}m old` : 'Recent';
    const dormantTag = asset.isDormant ? ' • Dormant' : '';

    itemCard.innerHTML = `
      <div class="finding-header">
        <div class="finding-identity">
          <div class="finding-avatar" title="${serviceName}">${initial}</div>
          <div class="finding-names">
            <span class="finding-name" title="${serviceName}">${serviceName}</span>
            <div class="finding-subline">
              <span class="finding-category">${category}</span>
              <span class="finding-dot">•</span>
              <span class="finding-domain">${domain}</span>
            </div>
          </div>
        </div>
        <div class="finding-badges">
          <span class="badge badge-ghost-score" title="Ghost Score">Score: ${ghostScore}</span>
          <span class="badge ${badgeClass}">${risk.slice(0, 4)}</span>
        </div>
      </div>
      <div class="finding-actions">
        <span class="finding-age">${ageMonths}${dormantTag}</span>
        <div class="finding-action-btns">
          <button class="btn-item btn-item-keep" data-action="KEPT" title="Keep and mark verified">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>Keep</span>
          </button>
          <button class="btn-item btn-item-secure" data-action="SECURED" title="Secure credentials on service">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span>Secure</span>
          </button>
          <button class="btn-item btn-item-revoke" data-action="REVOKED" title="Revoke OAuth access via Google Permissions">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            <span>Revoke</span>
          </button>
        </div>
      </div>
    `;

    // Event Bindings for Micro-Actions
    const keepBtn = itemCard.querySelector('[data-action="KEPT"]');
    const secureBtn = itemCard.querySelector('[data-action="SECURED"]');
    const revokeBtn = itemCard.querySelector('[data-action="REVOKED"]');

    if (keepBtn) {
      keepBtn.addEventListener('click', () => executeMicroAction(domain, 'KEPT', itemCard));
    }
    if (secureBtn) {
      secureBtn.addEventListener('click', () => {
        // Open service credentials URL in new tab & record action
        const securityUrl = getServiceSecurityUrl(domain);
        openTab(securityUrl);
        executeMicroAction(domain, 'SECURED', itemCard);
      });
    }
    if (revokeBtn) {
      revokeBtn.addEventListener('click', () => {
        // Open Google third-party app connections to sever token & record action
        openTab(GOOGLE_CONNECTIONS_URL);
        executeMicroAction(domain, 'REVOKED', itemCard);
      });
    }

    findingsList.appendChild(itemCard);
  });
}

/**
 * MODULE 2: Executes quick remediation action with smooth animation and badge decrement
 * @param {string} domain
 * @param {'KEPT' | 'SECURED' | 'REVOKED'} action
 * @param {HTMLElement} itemCard
 */
async function executeMicroAction(domain, action, itemCard) {
  const buttons = itemCard.querySelectorAll('.btn-item');
  buttons.forEach((b) => (b.disabled = true));

  // Immediate visual animation & counter decrement
  itemCard.classList.add('item-resolving');

  if (statAttention) {
    const curAttention = parseInt(statAttention.textContent);
    if (!isNaN(curAttention) && curAttention > 0) {
      statAttention.textContent = curAttention - 1;
    }
  }

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
        notes: `Remediated via Chrome Extension Micro-Action at ${new Date().toLocaleTimeString()}`
      })
    });

    const data = await res.json();
    if (data.success) {
      // Update in-memory state
      state.accounts = state.accounts.map((a) => (a.domain === domain ? { ...a, status: action } : a));

      // Update storage and notify background worker
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ gg_accounts: state.accounts });
        chrome.runtime?.sendMessage?.({ type: 'ACCOUNTS_UPDATED' })?.catch?.(() => {});
      }

      // Re-evaluate perimeter for current tab in case domain was active
      inspectActiveTabPerimeter(state.accounts);
    }
  } catch (err) {
    console.warn('[GhostGuard] Action dispatch error:', err.message);
  } finally {
    // Remove element after smooth fade-out
    setTimeout(() => {
      if (itemCard && itemCard.parentNode) {
        itemCard.parentNode.removeChild(itemCard);
        const remaining = findingsList.querySelectorAll('.finding-item').length;
        if (findingsCount) findingsCount.textContent = `${remaining} items`;
        if (remaining === 0) {
          renderEmptyState('All Items Reviewed', 'Great job! Your digital perimeter backlog is clean.');
        }
      }
    }, 400);
  }
}

/**
 * MODULE 4: 1-Click "Footprint Export & Security Report"
 * Generates lightweight summary report JSON and triggers browser download
 */
function handleExportFootprint() {
  const accountsToExport = state.accounts.length > 0 ? state.accounts : [];
  const exportPayload = {
    report: 'GhostGuard Digital Footprint & Perimeter Audit',
    version: '1.1.0',
    generatedAt: new Date().toISOString(),
    auditedIdentity: state.userEmail || 'Local Auditor',
    perimeterContext: {
      activeTabDomain: state.activeTab ? extractHostname(state.activeTab.url) : 'N/A',
      connectionStatus: state.isOffline ? 'OFFLINE' : 'ONLINE'
    },
    summary: {
      totalDiscovered: state.stats?.totalDiscovered ?? accountsToExport.length,
      needAttention: statAttention ? parseInt(statAttention.textContent) || 0 : 0,
      securityScore: statSecurityScore ? statSecurityScore.textContent : 'N/A'
    },
    assets: accountsToExport.map((a) => ({
      serviceName: a.serviceName || a.domain,
      domain: a.domain,
      category: a.category || 'General',
      riskLevel: a.riskLevel || 'Low',
      ghostScore: a.ghostScore || 0,
      status: a.status || 'UNREVIEWED',
      isDormant: Boolean(a.isDormant),
      ageInMonths: a.ageInMonths || 0,
      detectedDate: a.detectedDate || null
    }))
  };

  const jsonStr = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const downloadUrl = URL.createObjectURL(blob);
  const filename = `ghostguard-footprint-${new Date().toISOString().slice(0, 10)}.json`;

  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);

  if (exportBtnText) {
    const originalText = exportBtnText.textContent;
    exportBtnText.textContent = 'Exported ✓';
    setTimeout(() => {
      exportBtnText.textContent = originalText;
    }, 2000);
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
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c2d6b8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
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
 * Focuses existing dashboard tab or opens new one
 */
function handleOpenDashboard() {
  const targetUrl = FRONTEND_DASHBOARD_URL;
  const urlPattern = 'http://localhost:3000/*';

  if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
    chrome.tabs.query({ url: urlPattern }, (tabs) => {
      if (tabs && tabs.length > 0) {
        const existing = tabs[0];
        chrome.tabs.update(existing.id, { active: true }, () => {
          if (existing.windowId && chrome.windows && chrome.windows.update) {
            chrome.windows.update(existing.windowId, { focused: true }, () => window.close());
          } else {
            window.close();
          }
        });
      } else {
        chrome.tabs.create({ url: targetUrl }, () => window.close());
      }
    });
  } else {
    window.open(targetUrl, '_blank');
  }
}

/**
 * Initialization and Event Bindings
 */
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initial Telemetry & Perimeter Inspection
  await syncTelemetry(false);

  // 2. Button: Scan Inbox
  if (btnScanInbox) {
    btnScanInbox.addEventListener('click', () => {
      syncTelemetry(true);
    });
  }

  // 3. Button: Open Full Web Dashboard
  if (openDashboardBtn) {
    openDashboardBtn.addEventListener('click', handleOpenDashboard);
  }

  // 4. Button: Connect Google Account (OAuth)
  if (btnAuthenticate) {
    btnAuthenticate.addEventListener('click', () => {
      openTab(`${BACKEND_URL}/auth/google`);
    });
  }

  // 5. Button: Retry Offline Connection
  if (btnRetryConnection) {
    btnRetryConnection.addEventListener('click', async () => {
      await syncTelemetry(false);
    });
  }

  // 6. MODULE 4: Export Footprint Button
  if (btnExportReport) {
    btnExportReport.addEventListener('click', handleExportFootprint);
  }

  // 7. MODULE 4: Live Sync Button
  if (btnLiveSync) {
    btnLiveSync.addEventListener('click', () => {
      syncTelemetry(true);
    });
  }

  // 8. Footer Refresh Button
  if (btnRefresh) {
    btnRefresh.addEventListener('click', async () => {
      await syncTelemetry(false);
    });
  }
});
