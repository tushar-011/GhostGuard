const assert = require('assert');
const { admin, db, auth, isInitialized, isFirebaseConfigured } = require('../src/config/firebaseAdmin');
const { authMiddleware, requireAuth } = require('../src/middleware/authMiddleware');
const firestoreService = require('../src/services/firestoreService');

async function testFirebaseScaffolding() {
  console.log('\n--- Testing GhostGuard Firebase & Firestore Scaffolding ---');

  // Test 1: Firebase Admin Configuration Check
  console.log('\n[Test 1] Firebase Admin Config & Initialization Check');
  assert.ok(admin !== undefined, 'Admin object should be exported');
  assert.strictEqual(typeof isInitialized, 'function', 'isInitialized must be a function');
  assert.strictEqual(typeof isFirebaseConfigured, 'boolean', 'isFirebaseConfigured must be boolean');

  const initialized = isInitialized();
  console.log(`✓ Firebase initialized state: ${initialized} (isFirebaseConfigured: ${isFirebaseConfigured})`);
  assert.strictEqual(initialized, true, 'Firebase should be initialized with serviceAccountKey.json');
  assert.ok(admin.apps.length > 0, 'At least 1 Firebase app should be active');
  assert.ok(db !== null, 'Firestore db instance should be initialized');
  assert.ok(auth !== null, 'Auth instance should be initialized');
  console.log(`✓ Firebase Admin initialized with app name: [${admin.apps[0].name}]`);

  // Test 2: Firestore Document ID Sanitizer
  console.log('\n[Test 2] Firestore Document ID Sanitizer');
  assert.strictEqual(firestoreService.sanitizeDocId('Stripe.COM'), 'stripe.com');
  assert.strictEqual(firestoreService.sanitizeDocId('sub.domain.com/path'), 'sub.domain.com_path');
  assert.strictEqual(firestoreService.sanitizeDocId(''), 'unknown');
  console.log('✓ Firestore document sanitization verified');

  // Test 3: Auth Middleware Execution (Graceful Fallback & Context Attachment)
  console.log('\n[Test 3] Express Auth Middleware Execution');
  const mockReqGuest = { headers: {} };
  let nextCalledGuest = false;
  await authMiddleware(mockReqGuest, {}, () => {
    nextCalledGuest = true;
  });
  assert.strictEqual(nextCalledGuest, true, 'authMiddleware must call next() for guest requests');
  console.log(`✓ authMiddleware proceeded with user: ${mockReqGuest.user ? mockReqGuest.user.email : 'null (guest mode)'}`);

  // Test 4: Require Auth Guard
  console.log('\n[Test 4] Require Auth Middleware Security Guard');
  const mockReqNoUser = { user: null };
  let statusSent = null;
  let jsonSent = null;
  const mockResGuard = {
    status: (code) => {
      statusSent = code;
      return {
        json: (data) => {
          jsonSent = data;
        }
      };
    }
  };
  requireAuth(mockReqNoUser, mockResGuard, () => {});
  assert.strictEqual(statusSent, 401, 'requireAuth should reject with 401 when no user');
  assert.strictEqual(jsonSent.success, false);

  const mockReqWithUser = { user: { uid: 'u-123', email: 'test@example.com' } };
  let requireNextCalled = false;
  requireAuth(mockReqWithUser, {}, () => {
    requireNextCalled = true;
  });
  assert.strictEqual(requireNextCalled, true, 'requireAuth should allow authenticated requests');
  console.log('✓ requireAuth security guard verified');

  console.log('\n🎉 ALL FIREBASE ADMIN & SCAFFOLDING TESTS PASSED PERFECTLY!\n');
}

testFirebaseScaffolding().catch((err) => {
  console.error('\n❌ Firebase scaffolding test failed:', err);
  process.exit(1);
});
