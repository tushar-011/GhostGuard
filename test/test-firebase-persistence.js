const assert = require('assert');
const { admin, db, isInitialized } = require('../src/config/firebaseAdmin');
const firestoreService = require('../src/services/firestoreService');

async function testFirebasePersistence() {
  console.log('\n======================================================');
  console.log('--- Testing GhostGuard Multi-User Firestore Persistence ---');
  console.log('======================================================\n');

  assert.ok(isInitialized(), 'Firebase Admin must be initialized');
  assert.ok(db !== null, 'Firestore db instance must be initialized');

  const testUid = `test-user-${Date.now()}`;
  const isolatedUid = `isolated-user-${Date.now()}`;

  console.log(`[Setup] Using Primary Test UID: ${testUid}`);
  console.log(`[Setup] Using Isolated Test UID: ${isolatedUid}\n`);

  try {
    // 1. Profile Upsert
    console.log('[Test 1] Upsert User Profile (users/{uid})');
    const profile = await firestoreService.upsertUserProfile(testUid, {
      email: 'security.lead@ghostguard.test',
      displayName: 'Security Lead',
      settings: { weeklyReview: true, criticalAlerts: true }
    });
    assert.strictEqual(profile.profile.email, 'security.lead@ghostguard.test');
    assert.strictEqual(profile.profile.displayName, 'Security Lead');
    console.log('✓ Successfully created user profile in Firestore');

    // 2. Save Audit Scan
    console.log('\n[Test 2] Save Audit Scan (users/{uid}/threats/{domain})');
    const initialAssets = [
      {
        domain: 'stripe.com',
        serviceName: 'Stripe',
        category: 'Financial Infrastructure',
        ghostScore: 88,
        riskLevel: 'HIGH',
        status: 'UNREVIEWED',
        isDormant: true,
        ageInMonths: 24,
        remediationTip: 'Rotate webhook signing secrets and enable MFA hardware keys.'
      },
      {
        domain: 'github.com',
        serviceName: 'GitHub',
        category: 'Development',
        ghostScore: 55,
        riskLevel: 'Medium',
        status: 'UNREVIEWED',
        isDormant: false,
        ageInMonths: 8,
        remediationTip: 'Review third-party OAuth application authorizations.'
      },
      {
        domain: 'notion.so',
        serviceName: 'Notion',
        category: 'Productivity',
        ghostScore: 18,
        riskLevel: 'Low',
        status: 'UNREVIEWED',
        isDormant: true,
        ageInMonths: 14,
        remediationTip: 'Review public page sharing settings.'
      }
    ];

    const scanResult = await firestoreService.saveAuditScan(testUid, initialAssets, {
      rawCount: 3,
      highRiskCount: 1
    });
    assert.strictEqual(scanResult.totalSaved, 3);
    console.log(`✓ Saved scan ${scanResult.scanId} with 3 audited threat documents`);

    // 3. Verify Threat Retrieval & Multi-User Isolation
    console.log('\n[Test 3] Verify Threat Retrieval & Multi-User Data Isolation');
    const userThreats = await firestoreService.getUserThreats(testUid);
    assert.strictEqual(userThreats.length, 3, 'User must have exactly 3 threats stored');

    const isolatedThreats = await firestoreService.getUserThreats(isolatedUid);
    assert.strictEqual(isolatedThreats.length, 0, 'Isolated user UID must have 0 threats');
    console.log(`✓ User ${testUid} retrieved 3 threats; Isolated user ${isolatedUid} retrieved 0 threats (Complete Data Isolation)`);

    // 4. Update Threat Actions (Remediation Workflow)
    console.log('\n[Test 4] Update Threat Remediation Actions');
    await firestoreService.updateThreatAction(testUid, 'stripe.com', 'SECURED', 'Enabled FIDO2 Key');
    await firestoreService.updateThreatAction(testUid, 'github.com', 'MARKED_FOR_DELETION', 'Scheduled for account purge');

    const updatedThreats = await firestoreService.getUserThreats(testUid);
    const stripeDoc = updatedThreats.find((t) => t.domain === 'stripe.com');
    const githubDoc = updatedThreats.find((t) => t.domain === 'github.com');
    const notionDoc = updatedThreats.find((t) => t.domain === 'notion.so');

    assert.ok(stripeDoc, 'Stripe document must exist');
    assert.strictEqual(stripeDoc.status, 'SECURED', 'Stripe status must be SECURED');
    assert.strictEqual(stripeDoc.userNotes, 'Enabled FIDO2 Key');

    assert.ok(githubDoc, 'GitHub document must exist');
    assert.strictEqual(githubDoc.status, 'MARKED_FOR_DELETION', 'GitHub status must be MARKED_FOR_DELETION');

    assert.ok(notionDoc, 'Notion document must exist');
    assert.strictEqual(notionDoc.status, 'UNREVIEWED', 'Notion status should remain UNREVIEWED');
    console.log('✓ Successfully persisted SECURED & MARKED_FOR_DELETION statuses in Cloud Firestore');

    // 5. Test Rescan Status Preservation
    console.log('\n[Test 5] Status Preservation Across Re-Scans');
    // Simulate a rescanning event with fresh unreviewed data
    await firestoreService.saveAuditScan(testUid, initialAssets);
    const reScannedThreats = await firestoreService.getUserThreats(testUid);
    const stripeAfterRescan = reScannedThreats.find((t) => t.domain === 'stripe.com');
    const githubAfterRescan = reScannedThreats.find((t) => t.domain === 'github.com');

    assert.strictEqual(stripeAfterRescan.status, 'SECURED', 'Status must survive rescans');
    assert.strictEqual(githubAfterRescan.status, 'MARKED_FOR_DELETION', 'Status must survive rescans');
    console.log('✓ Re-scan successfully preserved user remediation statuses');

    // 6. Test Stats Aggregation
    console.log('\n[Test 6] Stats Aggregation from Cloud Firestore');
    const stats = await firestoreService.getUserAuditStats(testUid);
    assert.strictEqual(stats.totalDiscovered, 3);
    assert.strictEqual(stats.reviewedCount, 2, 'Two accounts actioned (SECURED + MARKED_FOR_DELETION)');
    assert.strictEqual(stats.statusBreakdown.SECURED, 1);
    assert.strictEqual(stats.statusBreakdown.MARKED_FOR_DELETION, 1);
    assert.strictEqual(stats.statusBreakdown.UNREVIEWED, 1);
    console.log(`✓ Stats verified: ${stats.totalDiscovered} total, ${stats.reviewedCount} reviewed, score: ${stats.ghostScore}`);

    // 7. Test Asset Removal / Permanent Record Deletion
    console.log('\n[Test 7] Asset Removal & Record Deletion');
    await firestoreService.removeThreatRecord(testUid, 'notion.so');
    const remainingThreats = await firestoreService.getUserThreats(testUid);
    assert.strictEqual(remainingThreats.length, 2, 'Should have 2 threats after removal');
    assert.ok(!remainingThreats.find((t) => t.domain === 'notion.so'), 'Notion should be deleted');
    console.log('✓ Permanently removed Notion record from Firestore');

    console.log('\n🎉 ALL FIREBASE PERSISTENCE & DATA ISOLATION TESTS PASSED!\n');
  } finally {
    // Clean up test documents to keep database pristine
    console.log('[Cleanup] Cleaning up test records in Firestore...');
    try {
      const userRef = db.collection('users').doc(testUid);
      const threatsSnap = await userRef.collection('threats').get();
      const scansSnap = await userRef.collection('scans').get();
      const logsSnap = await userRef.collection('auditLogs').get();

      const batch = db.batch();
      threatsSnap.forEach((d) => batch.delete(d.ref));
      scansSnap.forEach((d) => batch.delete(d.ref));
      logsSnap.forEach((d) => batch.delete(d.ref));
      batch.delete(userRef);
      await batch.commit();

      const isolatedUserRef = db.collection('users').doc(isolatedUid);
      await isolatedUserRef.delete();
      console.log('✓ Successfully cleaned up test records from Firestore');
    } catch (cleanupErr) {
      console.warn('Cleanup warning:', cleanupErr.message);
    }
  }
}

testFirebasePersistence().catch((err) => {
  console.error('\n❌ Persistence test failed with error:\n', err);
  process.exit(1);
});

