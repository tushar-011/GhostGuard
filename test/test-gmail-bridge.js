const assert = require('assert');
const { admin, db, isInitialized } = require('../src/config/firebaseAdmin');
const firestoreService = require('../src/services/firestoreService');

async function testGmailBridge() {
  console.log('\n===========================================================');
  console.log('--- Testing GhostGuard Gmail Connection & Token Bridge ---');
  console.log('===========================================================\n');

  assert.ok(isInitialized(), 'Firebase Admin must be initialized');
  assert.ok(db !== null, 'Firestore db instance must be initialized');

  const testUid = `bridge-user-${Date.now()}`;
  console.log(`[Setup] Using Bridge Test UID: ${testUid}\n`);

  try {
    // 1. Initial State Check: User has no connected Gmail
    console.log('[Test 1] Verify Initial State: No Connected Gmail');
    const initialConnected = await firestoreService.hasUserConnectedGmail(testUid);
    assert.strictEqual(initialConnected, false, 'User must not have connected Gmail initially');
    console.log('✓ Initial connected Gmail check returned false as expected');

    // 2. Simulate User Email Registration Profile Creation
    console.log('\n[Test 2] Upsert Profile on Initial Email Signup');
    await firestoreService.upsertUserProfile(testUid, {
      email: 'new.member@ghostguard.test',
      displayName: 'New Member'
    });
    console.log('✓ User profile created in users/{uid}');

    // 3. Simulate Gmail OAuth Callback Bridging Tokens to Firestore
    console.log('\n[Test 3] Store Gmail OAuth Tokens in users/{uid}/connectedAccounts/gmail');
    const mockTokens = {
      access_token: 'ya29.mock_access_token_for_audit_testing',
      refresh_token: '1//mock_refresh_token_for_offline_access',
      scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email',
      token_type: 'Bearer',
      expiry_date: Date.now() + 3600 * 1000
    };

    const savedAccount = await firestoreService.saveUserConnectedAccount(testUid, 'gmail', {
      tokens: mockTokens,
      connectedEmail: 'new.member@gmail.com',
      connectedName: 'New Member (Google)',
      provider: 'google-gmail'
    });

    assert.ok(savedAccount, 'saveUserConnectedAccount must return payload');
    assert.strictEqual(savedAccount.provider, 'google-gmail');
    assert.strictEqual(savedAccount.connectedEmail, 'new.member@gmail.com');
    console.log('✓ Successfully saved Gmail OAuth tokens in Firestore');

    // 4. Retrieve and Validate Connected Account
    console.log('\n[Test 4] Retrieve Connected Gmail Account');
    const retrievedAccount = await firestoreService.getUserConnectedAccount(testUid, 'gmail');
    assert.ok(retrievedAccount, 'Retrieved account document must exist');
    assert.strictEqual(retrievedAccount.tokens.access_token, mockTokens.access_token);
    assert.strictEqual(retrievedAccount.tokens.refresh_token, mockTokens.refresh_token);
    console.log('✓ Retrieved tokens match stored OAuth credentials');

    // 5. Validate hasUserConnectedGmail
    console.log('\n[Test 5] Verify hasUserConnectedGmail Helper');
    const hasGmail = await firestoreService.hasUserConnectedGmail(testUid);
    assert.strictEqual(hasGmail, true, 'hasUserConnectedGmail must return true after connection');
    console.log('✓ hasUserConnectedGmail returned true');

    // 6. Verify Audit Log entry for Account Connection
    console.log('\n[Test 6] Verify ACCOUNT_CONNECTED Audit Log Entry');
    const logsSnap = await db.collection('users').doc(testUid).collection('auditLogs').get();
    const connectLog = logsSnap.docs.find((d) => d.data().action === 'ACCOUNT_CONNECTED');
    assert.ok(connectLog, 'Audit log entry for ACCOUNT_CONNECTED must exist');
    assert.strictEqual(connectLog.data().targetId, 'gmail');
    console.log('✓ Verified audit log entry in users/{uid}/auditLogs');

    console.log('\n🎉 ALL GMAIL BRIDGE & ONBOARDING PERSISTENCE TESTS PASSED!\n');
  } finally {
    console.log('[Cleanup] Cleaning up test records in Firestore...');
    try {
      const userRef = db.collection('users').doc(testUid);
      const accountsSnap = await userRef.collection('connectedAccounts').get();
      const logsSnap = await userRef.collection('auditLogs').get();

      const batch = db.batch();
      accountsSnap.forEach((d) => batch.delete(d.ref));
      logsSnap.forEach((d) => batch.delete(d.ref));
      batch.delete(userRef);
      await batch.commit();
      console.log('✓ Successfully cleaned up bridge test records from Firestore');
    } catch (cleanupErr) {
      console.warn('Cleanup warning:', cleanupErr.message);
    }
  }
}

testGmailBridge().catch((err) => {
  console.error('\n❌ Gmail bridge test failed:\n', err);
  process.exit(1);
});

