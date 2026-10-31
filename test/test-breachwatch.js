const assert = require('assert');
const auditRoutes = require('../src/routes/auditRoutes');

console.log('\n--- Testing GhostGuard BreachWatch Exposure Monitor & HIBP Engine ---');

async function testBreachWatch() {
  // Extract route handlers directly from Express router stack for fast in-memory execution
  const breachesLayer = auditRoutes.stack.find(
    (layer) => layer.route && layer.route.path === '/breaches' && layer.route.methods.get
  );
  assert(breachesLayer, 'GET /breaches route must be registered in auditRoutes');
  const getBreachesHandler = breachesLayer.route.stack[0].handle;

  const passwordLayer = auditRoutes.stack.find(
    (layer) => layer.route && layer.route.path === '/check-pwned-password' && layer.route.methods.post
  );
  assert(passwordLayer, 'POST /check-pwned-password route must be registered in auditRoutes');
  const postPasswordHandler = passwordLayer.route.stack[0].handle;

  // Test 1: GET /api/audit/breaches
  console.log('\n[Test 1] GET /api/audit/breaches - Incident Catalog & Footprint Cross-Reference');
  let breachesData = null;
  const mockReqBreaches = {
    query: { email: 'alex@demo.co', all: 'true' },
    user: null
  };
  const mockResBreaches = {
    json: (payload) => {
      breachesData = payload;
    },
    status: (code) => mockResBreaches
  };

  await getBreachesHandler(mockReqBreaches, mockResBreaches);

  assert.strictEqual(breachesData.success, true, 'Response must be success: true');
  assert.strictEqual(breachesData.email, 'alex@demo.co', 'Email must match queried parameter');
  assert(Array.isArray(breachesData.breaches), 'breaches must be an array');
  assert(breachesData.breaches.length >= 7, 'Must contain curated breaches catalog');

  // Verify presence of core breach records
  const canva = breachesData.breaches.find((b) => b.name === 'Canva');
  assert(canva, 'Canva breach must exist in catalog');
  assert.strictEqual(canva.domain, 'canva.com');
  assert.strictEqual(canva.severity, 'CRITICAL');
  assert(canva.dataClasses.includes('Passwords'), 'Canva must list Passwords in dataClasses');
  assert.strictEqual(canva.isPasswordExposed, true);

  const dropbox = breachesData.breaches.find((b) => b.name === 'Dropbox');
  assert(dropbox, 'Dropbox breach must exist in catalog');
  assert.strictEqual(dropbox.domain, 'dropbox.com');

  const linkedin = breachesData.breaches.find((b) => b.name === 'LinkedIn');
  assert(linkedin, 'LinkedIn breach must exist in catalog');

  console.log(`✓ Verified breach catalog with ${breachesData.breaches.length} disclosures and risk grade "${breachesData.riskGrade}"`);

  // Test 2: POST /api/audit/check-pwned-password input validation ($k-anonymity)
  console.log('\n[Test 2] POST /api/audit/check-pwned-password - k-Anonymity Validation');

  let badStatus = null;
  let badPayload = null;
  const mockReqBad = {
    body: { hashPrefix: '5BA' } // Invalid (< 5 chars)
  };
  const mockResBad = {
    status: (code) => {
      badStatus = code;
      return {
        json: (payload) => {
          badPayload = payload;
        }
      };
    }
  };

  await postPasswordHandler(mockReqBad, mockResBad);
  assert.strictEqual(badStatus, 400, 'Must reject prefixes shorter than 5 chars');
  assert.strictEqual(badPayload.success, false);

  // Valid prefix test
  let validPayload = null;
  const mockReqValid = {
    body: {
      hashPrefix: '5BAA6',
      hashSuffix: '1E4C9B93F3F0682250B6CF8331B7EE68FD8' // SHA-1 suffix for "password"
    }
  };
  const mockResValid = {
    json: (payload) => {
      validPayload = payload;
    },
    status: (code) => mockResValid
  };

  await postPasswordHandler(mockReqValid, mockResValid);
  assert.strictEqual(validPayload.success, true);
  assert.strictEqual(validPayload.prefix, '5BAA6');
  assert.strictEqual(typeof validPayload.isExposed, 'boolean');
  assert.strictEqual(typeof validPayload.pwnedCount, 'number');
  console.log(`✓ k-Anonymity check verified: prefix "${validPayload.prefix}" (isExposed: ${validPayload.isExposed}, count: ${validPayload.pwnedCount})`);

  console.log('\n🎉 ALL BREACHWATCH BACKEND TESTS PASSED PERFECTLY!\n');
}

testBreachWatch().catch((err) => {
  console.error('BreachWatch test failed:', err);
  process.exit(1);
});
