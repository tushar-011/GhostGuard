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
  'REVOKED'
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
 * Retrieves stored accounts as a domain-keyed dictionary
 * @returns {Promise<Record<string, object>>}
 */
async function getAccountsMap() {
  const store = await readStore();
  return store.accounts;
}

/**
 * Updates an account's user action status and optional notes
 *
 * @param {string} domain - Domain key of the account
 * @param {'UNREVIEWED' | 'KEPT' | 'SECURED' | 'MARKED_FOR_DELETION' | 'REVOKED'} status
 * @param {string} [notes='']
 * @returns {Promise<object>} The updated account object
 */
async function updateAccountStatus(domain, status, notes = '') {
  if (!domain) {
    throw new Error('Domain is required to update account status.');
  }

  const cleanStatus = (status || '').toUpperCase().trim();
  if (!ALLOWED_STATUSES.includes(cleanStatus)) {
    throw new Error(`Invalid status "${status}". Allowed values: ${ALLOWED_STATUSES.join(', ')}`);
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
  const empty = { lastScanned: null, accounts: {} };
  await writeStore(empty);
  return empty;
}

module.exports = {
  ALLOWED_STATUSES,
  STORE_FILE,
  ensureStoreInitialized,
  saveAccounts,
  getAccounts,
  getAccountsMap,
  updateAccountStatus,
  clearStore
};

