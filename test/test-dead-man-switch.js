const assert = require('assert');
const storeService = require('../src/services/storeService');
const firestoreService = require('../src/services/firestoreService');
const auditRoutes = require('../src/routes/auditRoutes');

console.log('\n--- Testing GhostGuard Dead Man\'s Switch (Emergency Digital Perimeter Purge) ---');

async function testDeadManSwitch() {
  // Test 1: Service functions export integrity
  console.log('\n[Test 1] Service Module Exports');
  assert.strictEqual(typeof storeService.triggerDeadManSwitchLocal, 'function', 'storeService must export triggerDeadManSwitchLocal');
  assert.strictEqual(typeof storeService.disarmDeadManSwitchLocal, 'function', 'storeService must export disarmDeadManSwitchLocal');
  assert.strictEqual(typeof storeService.getDeadManStatusLocal, 'function', 'storeService must export getDeadManStatusLocal');
  assert.strictEqual(typeof firestoreService.triggerDeadManSwitch, 'function', 'firestoreService must export triggerDeadManSwitch');
  assert.strictEqual(typeof firestoreService.disarmDeadManSwitch, 'function', 'firestoreService must export disarmDeadManSwitch');
  assert.strictEqual(typeof firestoreService.getDeadManStatus, 'function', 'firestoreService must export getDeadManStatus');
  console.log('✓ All Dead Man\'s Switch service functions exported properly');

  // Test 2: Local Store Lifecycle (Arm -> Decommission -> Disarm -> Restore)
  console.log('\n[Test 2] Local Store Decommission and Restore Lifecycle');
  await storeService.clearStore();
  const testAccounts = [
    {
      serviceName: 'GitHub',
      domain: 'github.com',
      email: 'user@example.com',
      status: 'SECURED',
      riskLevel: 'LOW',
      ghostScore: 25,
    },
    {
      serviceName: 'Dormant Forum',
      domain: 'oldforum.org',
      email: 'user@example.com',
      status: 'UNREVIEWED',
      riskLevel: 'HIGH',
      ghostScore: 85,
    },
    {
      serviceName: 'Test Service',
      domain: 'service.io',
      email: 'user@example.com',
      status: 'KEPT',
      riskLevel: 'MEDIUM',
      ghostScore: 40,
    }
  ];

  await storeService.saveAccounts(testAccounts);

  // Initial status check
  const initialStatus = await storeService.getDeadManStatusLocal();
  assert.strictEqual(initialStatus.armed, false, 'Switch should not be armed initially');

  // Trigger Dead Man's Switch
  const triggerRes = await storeService.triggerDeadManSwitchLocal();
  assert.strictEqual(triggerRes.count, 3, 'Should decommission all 3 test accounts');

  const armedAccounts = await storeService.getAccounts();
  for (const acc of armedAccounts) {
    assert.strictEqual(acc.status, 'MARKED_FOR_DELETION', `Account ${acc.domain} must be MARKED_FOR_DELETION`);
    assert(acc.previousStatus, `Account ${acc.domain} must store previousStatus`);
    assert(acc.decommissionTimestamp, `Account ${acc.domain} must store decommissionTimestamp`);
  }

  const githubAccount = armedAccounts.find((a) => a.domain === 'github.com');
  const forumAccount = armedAccounts.find((a) => a.domain === 'oldforum.org');
  assert.strictEqual(githubAccount.previousStatus, 'SECURED');
  assert.strictEqual(forumAccount.previousStatus, 'UNREVIEWED');

  const armedStatus = await storeService.getDeadManStatusLocal();
  assert.strictEqual(armedStatus.armed, true, 'Switch must be armed');
  assert.strictEqual(armedStatus.decommissionedCount, 3, 'Decommission count must equal 3');
  console.log('✓ Dead Man Switch successfully transitioned all accounts to MARKED_FOR_DELETION');

  // Disarm Dead Man's Switch
  const disarmRes = await storeService.disarmDeadManSwitchLocal();
  assert.strictEqual(disarmRes.count, 3, 'Should restore all 3 test accounts');

  const restoredAccounts = await storeService.getAccounts();
  const restoredGithub = restoredAccounts.find((a) => a.domain === 'github.com');
  const restoredForum = restoredAccounts.find((a) => a.domain === 'oldforum.org');
  const restoredService = restoredAccounts.find((a) => a.domain === 'service.io');

  assert.strictEqual(restoredGithub.status, 'SECURED', 'GitHub must be restored to SECURED');
  assert.strictEqual(restoredForum.status, 'UNREVIEWED', 'Forum must be restored to UNREVIEWED');
  assert.strictEqual(restoredService.status, 'KEPT', 'Service must be restored to KEPT');

  const disarmedStatus = await storeService.getDeadManStatusLocal();
  assert.strictEqual(disarmedStatus.armed, false, 'Switch must be disarmed');
  assert.strictEqual(disarmedStatus.decommissionedCount, 0, 'Decommission count must be 0 after disarm');
  console.log('✓ Dead Man Switch successfully restored accounts to previous statuses');

  // Test 3: Express Routes End-to-End
  console.log('\n[Test 3] Express Route Endpoints');

  const findRoute = (path, method) => {
    const layer = auditRoutes.stack.find(
      (l) => l.route && l.route.path === path && l.route.methods[method.toLowerCase()]
    );
    assert(layer, `${method} ${path} route must be registered in auditRoutes`);
    return layer.route.stack[0].handle;
  };

  const triggerHandler = findRoute('/dead-man-switch/trigger', 'POST');
  const disarmHandler = findRoute('/dead-man-switch/disarm', 'POST');
  const statusHandler = findRoute('/dead-man-switch/status', 'GET');
  const statsHandler = findRoute('/stats', 'GET');

  // A. Invalid confirmation rejection
  let badStatus = null;
  let badPayload = null;
  const mockReqBad = {
    body: { confirmation: 'wrong_phrase' },
    user: null
  };
  const mockResBad = {
    status: (code) => {
      badStatus = code;
      return {
        json: (p) => { badPayload = p; }
      };
    },
    json: (p) => { badPayload = p; }
  };
  await triggerHandler(mockReqBad, mockResBad);
  assert.strictEqual(badStatus, 400, 'Must return 400 for incorrect confirmation phrase');
  assert.strictEqual(badPayload.success, false);
  console.log('✓ Route correctly rejects invalid confirmation phrase');

  // B. Trigger via API route with confirmation: "PURGE"
  let triggerPayload = null;
  const mockReqTrigger = {
    body: { confirmation: 'PURGE' },
    user: null
  };
  const mockResTrigger = {
    json: (p) => { triggerPayload = p; },
    status: () => mockResTrigger
  };
  await triggerHandler(mockReqTrigger, mockResTrigger);
  assert.strictEqual(triggerPayload.success, true);
  assert.strictEqual(triggerPayload.armed, true);
  assert.strictEqual(triggerPayload.count, 3);
  console.log('✓ POST /dead-man-switch/trigger arms switch and returns count');

  // C. Check status route
  let statusPayload = null;
  const mockReqStatus = { query: {}, user: null };
  const mockResStatus = {
    json: (p) => { statusPayload = p; },
    status: () => mockResStatus
  };
  await statusHandler(mockReqStatus, mockResStatus);
  assert.strictEqual(statusPayload.success, true);
  assert.strictEqual(statusPayload.armed, true);
  assert.strictEqual(statusPayload.decommissionedCount, 3);
  console.log('✓ GET /dead-man-switch/status reports active armed switch');

  // D. Check stats route reflects deadManArmed
  let statsPayload = null;
  const mockReqStats = { query: {}, user: null };
  const mockResStats = {
    json: (p) => { statsPayload = p; },
    status: () => mockResStats
  };
  await statsHandler(mockReqStats, mockResStats);
  assert.strictEqual(statsPayload.success, true);
  assert.strictEqual(statsPayload.deadManArmed, true, 'GET /stats must report deadManArmed: true');
  console.log('✓ GET /stats includes deadManArmed: true status');

  // E. Disarm via API route
  let disarmPayload = null;
  const mockReqDisarm = { body: {}, user: null };
  const mockResDisarm = {
    json: (p) => { disarmPayload = p; },
    status: () => mockResDisarm
  };
  await disarmHandler(mockReqDisarm, mockResDisarm);
  assert.strictEqual(disarmPayload.success, true);
  assert.strictEqual(disarmPayload.armed, false);
  assert.strictEqual(disarmPayload.count, 3);
  console.log('✓ POST /dead-man-switch/disarm restores accounts');

  // Cleanup
  await storeService.clearStore();
  console.log('\n=== ALL DEAD MAN\'S SWITCH TESTS PASSED ===\n');
}

testDeadManSwitch().catch((err) => {
  console.error('\n❌ Dead Man\'s Switch Test Failed:', err);
  process.exit(1);
});

