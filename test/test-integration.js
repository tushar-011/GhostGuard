const assert = require('assert');
const app = require('../server');

async function runIntegrationTests() {
  console.log('--- Running GhostGuard API Integration Tests ---\n');

  const server = app.server;
  const baseUrl = 'http://localhost:5000';

  try {
    // 1. Health check
    console.log('[Test 1] Health Check GET /');
    const healthRes = await fetch(`${baseUrl}/`);
    assert.strictEqual(healthRes.status, 200);
    const healthText = await healthRes.text();
    assert.ok(healthText.includes('GhostGuard Auditor API'));
    console.log('✓ Health check passed');

    // 2. Auth Status
    console.log('\n[Test 2] Auth Status GET /auth/status');
    const authStatusRes = await fetch(`${baseUrl}/auth/status`);
    assert.strictEqual(authStatusRes.status, 200);
    const authStatusJson = await authStatusRes.json();
    assert.strictEqual(authStatusJson.success, true);
    console.log('✓ Auth status endpoint verified');

    // 3. Mock Scan
    console.log('\n[Test 3] Audit Scan GET /api/audit/scan?mock=true');
    const scanRes = await fetch(`${baseUrl}/api/audit/scan?mock=true`);
    assert.strictEqual(scanRes.status, 200);
    const scanJson = await scanRes.json();
    assert.strictEqual(scanJson.success, true);
    assert.ok(scanJson.count > 0, 'Scan should discover mock services');
    assert.ok(Array.isArray(scanJson.assets));
    console.log(`✓ Audit scan returned ${scanJson.count} services`);

    // 4. Graph Generation
    console.log('\n[Test 4] Graph Generator GET /api/audit/graph');
    const graphRes = await fetch(`${baseUrl}/api/audit/graph`);
    assert.strictEqual(graphRes.status, 200);
    const graphJson = await graphRes.json();
    assert.strictEqual(graphJson.success, true);
    assert.ok(graphJson.graph.nodes.length > 0);
    assert.ok(graphJson.graph.edges.length > 0);
    console.log(`✓ Graph endpoint returned ${graphJson.graph.nodes.length} nodes and ${graphJson.graph.edges.length} edges`);

    // 5. Audit Action Update
    console.log('\n[Test 5] Remediation Action POST /api/audit/action');
    const targetDomain = scanJson.assets[0].domain;
    const actionRes = await fetch(`${baseUrl}/api/audit/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        domain: targetDomain,
        action: 'SECURED',
        notes: 'Integration test remediation verification'
      })
    });
    assert.strictEqual(actionRes.status, 200);
    const actionJson = await actionRes.json();
    assert.strictEqual(actionJson.success, true);
    assert.strictEqual(actionJson.account.status, 'SECURED');
    console.log(`✓ Successfully updated "${targetDomain}" to status SECURED`);

    // 6. Stats Aggregation
    console.log('\n[Test 6] Stats Aggregator GET /api/audit/stats');
    const statsRes = await fetch(`${baseUrl}/api/audit/stats`);
    assert.strictEqual(statsRes.status, 200);
    const statsJson = await statsRes.json();
    assert.strictEqual(statsJson.success, true);
    assert.ok(statsJson.stats.totalDiscovered > 0);
    assert.strictEqual(statsJson.stats.statusBreakdown.SECURED >= 1, true);
    console.log(`✓ Stats returned: ${statsJson.stats.totalDiscovered} total, ${statsJson.stats.dormantCount} dormant, ${statsJson.stats.highRiskCount} high risk`);

    // 7. Logout
    console.log('\n[Test 7] Logout GET /auth/logout');
    const logoutRes = await fetch(`${baseUrl}/auth/logout`);
    assert.strictEqual(logoutRes.status, 200);
    const logoutJson = await logoutRes.json();
    assert.strictEqual(logoutJson.success, true);
    console.log('✓ Logout endpoint verified');

    console.log('\n🎉 ALL INTEGRATION TESTS PASSED WITH 100% SUCCESS!');
  } finally {
    if (server && server.close) {
      server.close();
    }
  }
}

runIntegrationTests().catch((err) => {
  console.error('\n❌ Integration test failed:', err);
  process.exit(1);
});

