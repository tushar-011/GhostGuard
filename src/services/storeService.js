const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
const STORE_FILE = path.join(DATA_DIR, 'audit_store.json');

// Allowed status lifecycle states for user action management
const ALLOWED_STATUSES = [
  'UNREVIEWED',
  'KEPT',
  'SECURED',
  'MARKED_FOR_DELETION',
  'REVOKED',
  'REMOVE_RECORD',
  'DELETE_RECORD'
];

/**
 * Ensures the data directory and audit_store.json file exist with default structure
 */
async function ensureStoreInitialized() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      await fs.access(STORE_FILE);
    } catch {
      const initialData = {
        lastScanned: null,
        accounts: {}
      };
      await fs.writeFile(STORE_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
    }
  } catch (err) {
    console.error('[StoreService] Failed to initialize state store:', err.message);
    throw err;
  }
}

/**
 * Read the current raw store content from disk
 * @returns {Promise<{ lastScanned: string|null, accounts: Record<string, object> }>}
 */
async function readStore() {
  await ensureStoreInitialized();
  try {
    const raw = await fs.readFile(STORE_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[StoreService] Corrupted store file encountered, resetting to default structure.');
    const fallback = { lastScanned: null, accounts: {} };
    await fs.writeFile(STORE_FILE, JSON.stringify(fallback, null, 2), 'utf-8');
    return fallback;
  }
}

/**
 * Write updated data to the store file
 * @param {object} storeData
 */
async function writeStore(storeData) {
  await ensureStoreInitialized();
  await fs.writeFile(STORE_FILE, JSON.stringify(storeData, null, 2), 'utf-8');
}

/**
 * Saves discovered and scored accounts into the store keyed by domain.
 * Preserves existing user actions (status, notes, userActionDate) across re-scans.
 *
 * @param {Array<object>} accounts
 * @returns {Promise<Array<object>>} The saved accounts as an array
 */
async function saveAccounts(accounts = []) {
  const store = await readStore();
  const now = new Date().toISOString();

  store.lastScanned = now;

  for (const account of accounts) {
    if (!account.domain) continue;

    const domainKey = account.domain.toLowerCase().trim();
    const existing = store.accounts[domainKey];

    if (existing) {
      // Merge updated scan telemetry while strictly preserving user action state
      store.accounts[domainKey] = {
        ...existing,
        ...account,
        status: existing.status || 'UNREVIEWED',
        notes: existing.notes !== undefined ? existing.notes : '',
        userActionDate: existing.userActionDate || null,
        firstAddedAt: existing.firstAddedAt || now,
        lastScannedAt: now
      };
    } else {
      // Create new account entry
      store.accounts[domainKey] = {
        ...account,
        status: account.status || 'UNREVIEWED',
        notes: account.notes || '',
        userActionDate: null,
        firstAddedAt: now,
        lastScannedAt: now
      };
    }
  }

  await writeStore(store);
  return Object.values(store.accounts);
}

/**
 * Retrieves all stored accounts
 * @returns {Promise<Array<object>>}
 */
async function getAccounts() {
  const store = await readStore();
  return Object.values(store.accounts);
}

/**
 * Computes audit stats directly from unique store accounts
 * @returns {Promise<{ totalDiscovered: number, highRiskCount: number, dormantCount: number, reviewedCount: number }>}
 */
async function getAuditStats() {
  const store = await readStore();
  const accounts = Object.values(store.accounts || {});
  const totalDiscovered = accounts.length;
  const highRiskCount = accounts.filter(
    (a) => (a.riskLevel && a.riskLevel.toUpperCase() === 'HIGH') || (typeof a.ghostScore === 'number' && a.ghostScore >= 70)
  ).length;
  const dormantCount = accounts.filter((a) => a.isDormant || (a.ageInMonths && a.ageInMonths >= 12)).length;
  const reviewedCount = accounts.filter((a) => a.status && a.status !== 'UNREVIEWED').length;
  const decommissionedCount = accounts.filter((a) => a.status === 'MARKED_FOR_DELETION').length;
  const deadManArmed = Boolean(store.deadManArmed || (totalDiscovered > 0 && decommissionedCount === totalDiscovered));

  return {
    totalDiscovered,
    highRiskCount,
    dormantCount,
    reviewedCount,
    deadManArmed,
    deadManArmedAt: store.deadManArmedAt || null,
  };
}

/**
 * Retrieves stored accounts as a domain-keyed dictionary
 * @returns {Promise<Record<string, object>>}
 */
async function getAccountsMap() {
  const store = await readStore();
  return store.accounts;
}

/**
 * Permanently removes an account matching domain or serviceName from audit_store.json
 * @param {string} domain
 * @returns {Promise<{ removedDomain: string, remainingCount: number }>}
 */
async function removeAccount(domain) {
  if (!domain) {
    throw new Error('Domain is required to remove an account.');
  }

  const store = await readStore();
  const domainKey = domain.toLowerCase().trim();

  let matchedKey = null;
  if (store.accounts[domainKey]) {
    matchedKey = domainKey;
  } else {
    for (const key of Object.keys(store.accounts)) {
      if (
        key === domainKey ||
        (store.accounts[key].serviceName && store.accounts[key].serviceName.toLowerCase() === domainKey) ||
        (store.accounts[key].domain && store.accounts[key].domain.toLowerCase() === domainKey)
      ) {
        matchedKey = key;
        break;
      }
    }
  }

  if (matchedKey) {
    delete store.accounts[matchedKey];
    await writeStore(store);
  }

  return {
    removedDomain: domain,
    remainingCount: Object.keys(store.accounts).length
  };
}

/**
 * Updates an account's user action status and optional notes
 *
 * @param {string} domain - Domain key of the account
 * @param {'UNREVIEWED' | 'KEPT' | 'SECURED' | 'MARKED_FOR_DELETION' | 'REVOKED' | 'REMOVE_RECORD'} status
 * @param {string} [notes='']
 * @returns {Promise<object>} The updated account object
 */
async function updateAccountStatus(domain, status, notes = '') {
  if (!domain) {
    throw new Error('Domain is required to update account status.');
  }

  let cleanStatus = (status || '').toUpperCase().trim();
  if (cleanStatus === 'KEEP') cleanStatus = 'KEPT';
  if (cleanStatus === 'SECURE') cleanStatus = 'SECURED';
  if (cleanStatus === 'REVOKE') cleanStatus = 'REVOKED';
  if (cleanStatus === 'DELETE') cleanStatus = 'MARKED_FOR_DELETION';

  if (!ALLOWED_STATUSES.includes(cleanStatus)) {
    throw new Error(`Invalid status "${status}". Allowed values: ${ALLOWED_STATUSES.join(', ')}`);
  }

  // Handle permanent deletion via updateAccountStatus
  if (cleanStatus === 'REMOVE_RECORD' || cleanStatus === 'DELETE_RECORD') {
    const removal = await removeAccount(domain);
    return { domain, status: 'REMOVED', removed: true, remainingCount: removal.remainingCount };
  }

  const store = await readStore();
  const domainKey = domain.toLowerCase().trim();
  const account = store.accounts[domainKey];

  if (!account) {
    throw new Error(`Account for domain "${domain}" not found in audit store.`);
  }

  account.status = cleanStatus;
  if (notes !== undefined && notes !== null) {
    account.notes = notes;
  }
  account.userActionDate = new Date().toISOString();

  store.accounts[domainKey] = account;
  await writeStore(store);

  return account;
}

/**
 * Clears the local store (useful for test resets)
 */
async function clearStore() {
  await ensureStoreInitialized();
  const empty = { lastScanned: null, accounts: {}, deadManArmed: false };
  await writeStore(empty);
  return empty;
}

/**
 * Triggers the Dead Man's Switch emergency decommission across all local accounts
 * @returns {Promise<{ count: number }>}
 */
async function triggerDeadManSwitchLocal() {
  const store = await readStore();
  const now = new Date().toISOString();
  let count = 0;

  for (const domainKey of Object.keys(store.accounts || {})) {
    const acc = store.accounts[domainKey];
    acc.previousStatus = acc.status || 'UNREVIEWED';
    acc.status = 'MARKED_FOR_DELETION';
    acc.decommissionTimestamp = now;
    count++;
  }

  store.deadManArmed = true;
  store.deadManArmedAt = now;
  await writeStore(store);

  return { count };
}

/**
 * Disarms the Dead Man's Switch and reverts accounts to previous states
 * @returns {Promise<{ count: number }>}
 */
async function disarmDeadManSwitchLocal() {
  const store = await readStore();
  const now = new Date().toISOString();
  let count = 0;

  for (const domainKey of Object.keys(store.accounts || {})) {
    const acc = store.accounts[domainKey];
    if (acc.status === 'MARKED_FOR_DELETION') {
      acc.status = acc.previousStatus || 'KEPT';
      acc.previousStatus = null;
      acc.disarmedTimestamp = now;
      count++;
    }
  }

  store.deadManArmed = false;
  store.deadManDisarmedAt = now;
  await writeStore(store);

  return { count };
}

/**
 * Gets local Dead Man's Switch status
 * @returns {Promise<{ armed: boolean, armedAt: string|null, decommissionedCount: number }>}
 */
async function getDeadManStatusLocal() {
  const store = await readStore();
  const accounts = Object.values(store.accounts || {});
  const decommissionedCount = accounts.filter((a) => a.status === 'MARKED_FOR_DELETION').length;
  const armed = Boolean(store.deadManArmed || (accounts.length > 0 && decommissionedCount === accounts.length));

  return {
    armed,
    armedAt: store.deadManArmedAt || null,
    decommissionedCount
  };
}

module.exports = {
  ALLOWED_STATUSES,
  STORE_FILE,
  ensureStoreInitialized,
  saveAccounts,
  getAccounts,
  getAccountsMap,
  getAuditStats,
  updateAccountStatus,
  removeAccount,
  clearStore,
  triggerDeadManSwitchLocal,
  disarmDeadManSwitchLocal,
  getDeadManStatusLocal
};

