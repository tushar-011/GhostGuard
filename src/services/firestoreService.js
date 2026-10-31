const { db, isInitialized, isFirebaseConfigured } = require('../config/firebaseAdmin');

/**
 * Checks if Firebase is active and initialized
 */
function isConfigured() {
  if (typeof isInitialized === 'function') return isInitialized();
  return Boolean(isFirebaseConfigured && db);
}

/**
 * Sanitizes domain string for use as a Firestore document ID
 * @param {string} domain
 * @returns {string}
 */
function sanitizeDocId(domain) {
  if (!domain) return 'unknown';
  return domain.toLowerCase().trim().replace(/[\/\\]/g, '_');
}

/**
 * Ensures Firebase is active before attempting Firestore operations
 */
function assertFirebase() {
  if (!isConfigured() || !db) {
    throw new Error('Firebase Admin & Firestore are not configured or initialized.');
  }
}

/**
 * 1. Upserts user profile information in users/{uid}
 * @param {string} uid
 * @param {object} profileData
 * @returns {Promise<object>}
 */
async function upsertUserProfile(uid, profileData = {}) {
  assertFirebase();
  if (!uid) throw new Error('User UID is required.');

  const userRef = db.collection('users').doc(uid);
  const now = new Date().toISOString();

  const payload = {
    profile: {
      email: profileData.email || '',
      displayName: profileData.displayName || profileData.name || '',
      updatedAt: now,
      settings: profileData.settings || {
        weeklyReview: true,
        criticalAlerts: true,
        breachNotices: true,
      },
    },
    updatedAt: now,
  };

  await userRef.set(payload, { merge: true });
  return payload;
}

/**
 * 2. Saves an audit scan and writes discovered assets to users/{uid}/threats/{domain}
 * Also records scan summary in users/{uid}/scans/{scanId}
 *
 * @param {string} uid
 * @param {Array<object>} scanResults
 * @param {object} [stats={}]
 * @returns {Promise<{ scanId: string, totalSaved: number, timestamp: string }>}
 */
async function saveAuditScan(uid, scanResults = [], stats = {}) {
  assertFirebase();
  if (!uid) throw new Error('User UID is required.');

  const now = new Date().toISOString();
  const scanId = `scan_${Date.now()}`;
  const userRef = db.collection('users').doc(uid);

  // Compute stats if not fully passed
  const highRiskCount =
    stats.highRiskCount ??
    scanResults.filter(
      (a) =>
        (a.riskLevel && a.riskLevel.toUpperCase() === 'HIGH') ||
        (typeof a.ghostScore === 'number' && a.ghostScore >= 70)
    ).length;

  const scanMeta = {
    scanId,
    timestamp: now,
    totalDiscovered: scanResults.length,
    highRiskCount,
    rawCount: stats.rawCount ?? scanResults.length,
    stats: stats || {},
  };

  // 1. Record scan metadata under users/{uid}/scans/{scanId}
  await userRef.collection('scans').doc(scanId).set(scanMeta);

  // 2. Fetch existing threats to preserve remediation actions across rescans
  const threatsColl = userRef.collection('threats');
  let existingMap = new Map();
  try {
    const existingSnapshot = await threatsColl.get();
    existingSnapshot.forEach((doc) => {
      existingMap.set(doc.id, doc.data());
    });
  } catch (err) {
    console.warn('[Firestore] Could not pre-fetch existing threats:', err.message);
  }

  // 3. Batch write assets to users/{uid}/threats/{domain} in chunks of 400
  const CHUNK_SIZE = 400;

  for (let i = 0; i < scanResults.length; i += CHUNK_SIZE) {
    const chunk = scanResults.slice(i, i + CHUNK_SIZE);
    const batch = db.batch();

    for (const asset of chunk) {
      if (!asset.domain) continue;
      const domainKey = sanitizeDocId(asset.domain);
      const threatRef = threatsColl.doc(domainKey);
      const existing = existingMap.get(domainKey);

      // Preserve status if user has already audited or actioned this record
      const status =
        existing && existing.status && existing.status !== 'UNREVIEWED'
          ? existing.status
          : (asset.status || 'UNREVIEWED');

      const userNotes = existing?.userNotes || existing?.notes || asset.userNotes || asset.notes || '';
      const actionHistory = existing?.actionHistory || asset.actionHistory || [];

      const threatData = {
        serviceName: asset.serviceName || asset.name || domainKey,
        domain: asset.domain,
        category: asset.category || 'General Service',
        ghostScore: asset.ghostScore ?? 0,
        riskLevel: asset.riskLevel || 'Low',
        detectedDate: asset.detectedDate || existing?.detectedDate || now,
        status,
        notes: userNotes,
        userNotes,
        actionHistory,
        isDormant: Boolean(asset.isDormant),
        ageInMonths: asset.ageInMonths ?? 0,
        ageInDays: asset.ageInDays ?? 0,
        remediationTip: asset.remediationTip || '',
        snippet: asset.snippet || '',
        firstDiscoveredEmail: asset.firstDiscoveredEmail || '',
        lastScannedAt: now,
      };

      batch.set(threatRef, threatData, { merge: true });
    }

    await batch.commit();
  }

  // 3. Log scan in auditLogs
  const logId = `log_${Date.now()}_scan`;
  await userRef.collection('auditLogs').doc(logId).set({
    logId,
    action: 'INBOX_SCAN_COMPLETED',
    targetId: scanId,
    result: `Discovered ${scanResults.length} accounts (${highRiskCount} high risk)`,
    timestamp: now,
  });

  return {
    scanId,
    totalSaved: scanResults.length,
    timestamp: now,
  };
}

/**
 * 3. Retrieves all scanned assets / threats for a user from users/{uid}/threats
 * @param {string} uid
 * @returns {Promise<Array<object>>}
 */
async function getUserThreats(uid) {
  assertFirebase();
  if (!uid) throw new Error('User UID is required.');

  const snapshot = await db
    .collection('users')
    .doc(uid)
    .collection('threats')
    .get();

  const threats = [];
  snapshot.forEach((doc) => {
    threats.push({
      id: doc.id,
      ...doc.data(),
    });
  });

  return threats;
}

/**
 * 4. Updates an audited threat's user remediation action in users/{uid}/threats/{domain}
 * And records the event in users/{uid}/auditLogs/{logId}
 *
 * @param {string} uid
 * @param {string} domain
 * @param {'KEPT' | 'SECURED' | 'REVOKED' | 'MARKED_FOR_DELETION' | 'DELETED' | string} action
 * @param {string} [notes='']
 * @returns {Promise<object>}
 */
async function updateThreatAction(uid, domain, action, notes = '') {
  assertFirebase();
  if (!uid || !domain) throw new Error('User UID and domain are required.');

  let cleanAction = (action || '').toUpperCase().trim();
  if (cleanAction === 'KEEP') cleanAction = 'KEPT';
  if (cleanAction === 'SECURE') cleanAction = 'SECURED';
  if (cleanAction === 'REVOKE') cleanAction = 'REVOKED';
  if (cleanAction === 'DELETE') cleanAction = 'MARKED_FOR_DELETION';

  // Handle permanent deletion via updateThreatAction
  if (cleanAction === 'REMOVE_RECORD' || cleanAction === 'DELETE_RECORD' || cleanAction === 'DELETED') {
    return removeThreatRecord(uid, domain);
  }

  const domainKey = sanitizeDocId(domain);
  const userRef = db.collection('users').doc(uid);
  const threatRef = userRef.collection('threats').doc(domainKey);
  const now = new Date().toISOString();

  const threatDoc = await threatRef.get();
  if (!threatDoc.exists) {
    throw new Error(`Threat record for domain "${domain}" not found in Firestore.`);
  }

  const updateData = {
    status: cleanAction,
    notes: notes || '',
    userNotes: notes || '',
    userActionDate: now,
  };

  await threatRef.update(updateData);

  // Record audit log
  const logId = `log_${Date.now()}_action`;
  await userRef.collection('auditLogs').doc(logId).set({
    logId,
    action: `REMEDIATION_${cleanAction}`,
    targetId: domain,
    result: 'SUCCESS',
    notes: notes || '',
    timestamp: now,
  });

  return {
    ...threatDoc.data(),
    ...updateData,
  };
}

/**
 * 5. Permanently removes a threat document from users/{uid}/threats/{domain}
 * And records the deletion in users/{uid}/auditLogs/{logId}
 *
 * @param {string} uid
 * @param {string} domain
 * @returns {Promise<{ success: boolean, removedDomain: string, logId: string }>}
 */
async function removeThreatRecord(uid, domain) {
  assertFirebase();
  if (!uid || !domain) throw new Error('User UID and domain are required.');

  const domainKey = sanitizeDocId(domain);
  const userRef = db.collection('users').doc(uid);
  const threatRef = userRef.collection('threats').doc(domainKey);
  const now = new Date().toISOString();

  await threatRef.delete();

  const logId = `log_${Date.now()}_delete`;
  await userRef.collection('auditLogs').doc(logId).set({
    logId,
    action: 'REMOVE_THREAT_RECORD',
    targetId: domain,
    result: 'PERMANENTLY_DELETED',
    timestamp: now,
  });

  return {
    success: true,
    removedDomain: domain,
    logId,
  };
}

/**
 * 6. Calculates audit stats from user threats in Firestore
 * @param {string} uid
 * @returns {Promise<object>}
 */
async function getUserAuditStats(uid) {
  const threats = await getUserThreats(uid);
  const totalDiscovered = threats.length;

  let dormantCount = 0;
  let highRiskCount = 0;
  let reviewedCount = 0;
  let totalGhostScore = 0;

  const riskBreakdown = { High: 0, Medium: 0, Low: 0 };
  const statusBreakdown = {
    UNREVIEWED: 0,
    KEPT: 0,
    SECURED: 0,
    MARKED_FOR_DELETION: 0,
    REVOKED: 0,
  };
  const categoryBreakdown = {};

  for (const t of threats) {
    if (typeof t.ghostScore === 'number') {
      totalGhostScore += t.ghostScore;
    }

    if (t.isDormant || (t.ageInMonths && t.ageInMonths >= 12)) {
      dormantCount++;
    }

    const rawRisk = t.riskLevel || 'Low';
    const upperRisk = rawRisk.toUpperCase();
    const isHigh =
      upperRisk === 'HIGH' ||
      (typeof t.ghostScore === 'number' && t.ghostScore >= 70);

    if (isHigh) {
      highRiskCount++;
      riskBreakdown.High = (riskBreakdown.High || 0) + 1;
    } else if (upperRisk === 'MEDIUM' || upperRisk === 'MED') {
      riskBreakdown.Medium = (riskBreakdown.Medium || 0) + 1;
    } else {
      riskBreakdown.Low = (riskBreakdown.Low || 0) + 1;
    }

    const status = t.status || 'UNREVIEWED';
    if (status && status !== 'UNREVIEWED') {
      reviewedCount++;
    }
    statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;

    const cat = t.category || 'General Service';
    categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
  }

  const avgGhostScore =
    totalDiscovered > 0 ? Math.round(totalGhostScore / totalDiscovered) : 0;

  return {
    totalDiscovered,
    dormantCount,
    highRiskCount,
    reviewedCount,
    ghostScore: avgGhostScore,
    riskBreakdown,
    statusBreakdown,
    categoryBreakdown,
  };
}

/**
 * 7. Saves connected third-party account credentials (e.g. Gmail OAuth tokens)
 * under users/{uid}/connectedAccounts/{provider}
 *
 * @param {string} uid
 * @param {string} provider - e.g. 'gmail'
 * @param {object} accountData
 * @returns {Promise<object>}
 */
async function saveUserConnectedAccount(uid, provider = 'gmail', accountData = {}) {
  assertFirebase();
  if (!uid) throw new Error('User UID is required.');

  const now = new Date().toISOString();
  const accountRef = db
    .collection('users')
    .doc(uid)
    .collection('connectedAccounts')
    .doc(provider);

  const payload = {
    provider,
    connectedAt: accountData.connectedAt || now,
    updatedAt: now,
    ...accountData,
  };

  await accountRef.set(payload, { merge: true });

  // Also log the connection event in auditLogs
  try {
    const logId = `log_${Date.now()}_connect_${provider}`;
    await db
      .collection('users')
      .doc(uid)
      .collection('auditLogs')
      .doc(logId)
      .set({
        logId,
        action: 'ACCOUNT_CONNECTED',
        targetId: provider,
        result: 'SUCCESS',
        email: accountData.connectedEmail || '',
        timestamp: now,
      });
  } catch (logErr) {
    console.warn('[Firestore] Failed to log account connection:', logErr.message);
  }

  return payload;
}

/**
 * 8. Retrieves connected account credentials for a user from users/{uid}/connectedAccounts/{provider}
 * @param {string} uid
 * @param {string} provider - e.g. 'gmail'
 * @returns {Promise<object|null>}
 */
async function getUserConnectedAccount(uid, provider = 'gmail') {
  assertFirebase();
  if (!uid) throw new Error('User UID is required.');

  const doc = await db
    .collection('users')
    .doc(uid)
    .collection('connectedAccounts')
    .doc(provider)
    .get();

  if (!doc.exists) return null;
  return doc.data();
}

/**
 * 9. Checks if a user has a connected Gmail account
 * @param {string} uid
 * @returns {Promise<boolean>}
 */
async function hasUserConnectedGmail(uid) {
  if (!isConfigured() || !db || !uid) return false;
  try {
    const account = await getUserConnectedAccount(uid, 'gmail');
    return Boolean(
      account &&
      (account.tokens || account.accessToken || account.refreshToken)
    );
  } catch {
    return false;
  }
}

/**
 * 10. Retrieves audit logs for a user from users/{uid}/auditLogs
 * @param {string} uid
 * @param {number} [limit=50]
 * @returns {Promise<Array<object>>}
 */
async function getUserAuditLogs(uid, limit = 50) {
  assertFirebase();
  if (!uid) throw new Error('User UID is required.');

  try {
    const snapshot = await db
      .collection('users')
      .doc(uid)
      .collection('auditLogs')
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    const logs = [];
    snapshot.forEach((doc) => {
      logs.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return logs;
  } catch (err) {
    // If orderBy without index fails or unindexed, fallback to un-ordered query
    const snapshot = await db
      .collection('users')
      .doc(uid)
      .collection('auditLogs')
      .limit(limit)
      .get();

    const logs = [];
    snapshot.forEach((doc) => {
      logs.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return logs.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
  }
}

/**
 * 11. Triggers Dead Man's Switch for a user in Firestore
 * Bulk transitions all threats in users/{uid}/threats to status: "MARKED_FOR_DELETION"
 * and records DEAD_MAN_SWITCH_TRIGGERED in users/{uid}/auditLogs
 * @param {string} uid
 * @returns {Promise<{ count: number }>}
 */
async function triggerDeadManSwitch(uid) {
  assertFirebase();
  if (!uid) throw new Error('User UID is required.');

  const userRef = db.collection('users').doc(uid);
  const threatsColl = userRef.collection('threats');
  const snapshot = await threatsColl.get();
  const now = new Date().toISOString();

  let count = 0;
  const batch = db.batch();

  snapshot.forEach((doc) => {
    const data = doc.data();
    batch.update(doc.ref, {
      previousStatus: data.status || 'UNREVIEWED',
      status: 'MARKED_FOR_DELETION',
      decommissionTimestamp: now,
      updatedAt: now,
    });
    count++;
  });

  // Record audit log
  const logId = `log_${Date.now()}_deadman_trigger`;
  const logRef = userRef.collection('auditLogs').doc(logId);
  batch.set(logRef, {
    logId,
    action: 'DEAD_MAN_SWITCH_TRIGGERED',
    timestamp: now,
    affectedCount: count,
    details: 'Emergency digital perimeter purge initiated. All active accounts queued for deletion.',
  });

  // Update user document state
  batch.set(
    userRef,
    {
      deadManArmed: true,
      deadManArmedAt: now,
      updatedAt: now,
    },
    { merge: true }
  );

  await batch.commit();
  return { count };
}

/**
 * 12. Disarms Dead Man's Switch for a user in Firestore
 * Reverts MARKED_FOR_DELETION threats back to their previousStatus or 'KEPT'
 * and records DEAD_MAN_SWITCH_DISARMED in users/{uid}/auditLogs
 * @param {string} uid
 * @returns {Promise<{ count: number }>}
 */
async function disarmDeadManSwitch(uid) {
  assertFirebase();
  if (!uid) throw new Error('User UID is required.');

  const userRef = db.collection('users').doc(uid);
  const threatsColl = userRef.collection('threats');
  const snapshot = await threatsColl.get();
  const now = new Date().toISOString();

  let count = 0;
  const batch = db.batch();

  snapshot.forEach((doc) => {
    const data = doc.data();
    if (data.status === 'MARKED_FOR_DELETION') {
      batch.update(doc.ref, {
        status: data.previousStatus || 'KEPT',
        previousStatus: null,
        disarmedTimestamp: now,
        updatedAt: now,
      });
      count++;
    }
  });

  // Record audit log
  const logId = `log_${Date.now()}_deadman_disarm`;
  const logRef = userRef.collection('auditLogs').doc(logId);
  batch.set(logRef, {
    logId,
    action: 'DEAD_MAN_SWITCH_DISARMED',
    timestamp: now,
    restoredCount: count,
    details: 'Emergency purge aborted. Accounts restored to previous statuses.',
  });

  // Update user document state
  batch.set(
    userRef,
    {
      deadManArmed: false,
      deadManDisarmedAt: now,
      updatedAt: now,
    },
    { merge: true }
  );

  await batch.commit();
  return { count };
}

/**
 * 13. Gets Dead Man's Switch status for a user in Firestore
 * @param {string} uid
 * @returns {Promise<{ armed: boolean, armedAt: string|null, decommissionedCount: number }>}
 */
async function getDeadManStatus(uid) {
  assertFirebase();
  if (!uid) throw new Error('User UID is required.');

  const userRef = db.collection('users').doc(uid);
  const userDoc = await userRef.get();
  const userData = userDoc.exists ? userDoc.data() : {};

  const threatsColl = userRef.collection('threats');
  const snapshot = await threatsColl.get();
  let totalAccounts = 0;
  let decommissionedCount = 0;

  snapshot.forEach((doc) => {
    totalAccounts++;
    if (doc.data().status === 'MARKED_FOR_DELETION') {
      decommissionedCount++;
    }
  });

  const armed = Boolean(
    userData.deadManArmed ||
    (totalAccounts > 0 && decommissionedCount === totalAccounts)
  );

  return {
    armed,
    armedAt: userData.deadManArmedAt || null,
    decommissionedCount,
  };
}

module.exports = {
  sanitizeDocId,
  upsertUserProfile,
  saveAuditScan,
  getUserThreats,
  updateThreatAction,
  removeThreatRecord,
  getUserAuditStats,
  saveUserConnectedAccount,
  getUserConnectedAccount,
  hasUserConnectedGmail,
  getUserAuditLogs,
  triggerDeadManSwitch,
  disarmDeadManSwitch,
  getDeadManStatus,
};

