const assert = require('assert');
const app = require('../server');

async function testEndpoints() {
  console.log('\n--- Testing GhostGuard API Audit Endpoints ---');

  const baseUrl = `http://127.0.0.1:5000`;

  try {
    // 1. Test GET /api/audit/scan?mock=true
    console.log('\n[API Test 1] GET /api/audit/scan?mock=true');
    const scanRes = await fetch(`${baseUrl}/api/audit/scan?mock=true`);
    const scanData = await scanRes.json();
    console.log('Status:', scanRes.status);
    console.log('Scanned assets count:', scanData.count);
    assert.strictEqual(scanRes.status, 200);
    assert(scanData.success);
    assert(scanData.assets.length > 0);

    const sampleAsset = scanData.assets[0];
    console.log('Sample Scored Asset:', {
      service: sampleAsset.serviceName,
      domain: sampleAsset.domain,
      riskLevel: sampleAsset.riskLevel,
      ghostScore: sampleAsset.ghostScore,
      isDormant: sampleAsset.isDormant,
      flag: sampleAsset.flag
    });
    assert(typeof sampleAsset.ghostScore === 'number');
    assert(['High', 'Medium', 'Low'].includes(sampleAsset.riskLevel));
    assert(typeof sampleAsset.remediationTip === 'string');

    // 2. Test GET /api/audit/graph
    console.log('\n[API Test 2] GET /api/audit/graph?email=testuser@gmail.com');
    const graphRes = await fetch(`${baseUrl}/api/audit/graph?email=testuser@gmail.com`);
    const graphData = await graphRes.json();
    console.log('Status:', graphRes.status);
    console.log('Graph node count:', graphData.graph.nodes.length);
    console.log('Graph edge count:', graphData.graph.edges.length);
    assert.strictEqual(graphRes.status, 200);
    assert(graphData.success);
    assert(graphData.graph.nodes.length > 0);
    assert(graphData.graph.edges.length > 0);

    const rootNode = graphData.graph.nodes.find((n) => n.id === 'root');
    assert.strictEqual(rootNode.label, 'testuser@gmail.com');

    // 3. Test POST /api/audit/action
    console.log('\n[API Test 3] POST /api/audit/action');
    const actionRes = await fetch(`${baseUrl}/api/audit/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        domain: 'notion.so',
        action: 'SECURED',
        notes: 'Enabled SAML SSO and verified active members'
      })
    });
    const actionData = await actionRes.json();
    console.log('Status:', actionRes.status);
    console.log('Action update response:', actionData.message);
    assert.strictEqual(actionRes.status, 200);
    assert(actionData.success);
    assert.strictEqual(actionData.account.status, 'SECURED');
    assert.strictEqual(actionData.account.notes, 'Enabled SAML SSO and verified active members');

    // 4. Test POST /api/audit/action with invalid action (Expect 400)
    console.log('\n[API Test 4] POST /api/audit/action (Invalid Action Validation)');
    const invalidActionRes = await fetch(`${baseUrl}/api/audit/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        domain: 'notion.so',
        action: 'INVALID_STATUS'
      })
    });
    console.log('Status:', invalidActionRes.status);
    assert.strictEqual(invalidActionRes.status, 400);

    // 5. Test GET /api/audit/stats
    console.log('\n[API Test 5] GET /api/audit/stats');
    const statsRes = await fetch(`${baseUrl}/api/audit/stats`);
    const statsData = await statsRes.json();
    console.log('Status:', statsRes.status);
    console.log('Stats breakdown:', JSON.stringify(statsData.stats, null, 2));
    assert.strictEqual(statsRes.status, 200);
    assert(statsData.success);
    assert(typeof statsData.stats.totalDiscovered === 'number');
    assert(typeof statsData.stats.dormantCount === 'number');
    assert(typeof statsData.stats.highRiskCount === 'number');
    assert(statsData.stats.reviewedCount >= 1, 'Reviewed count should be >= 1 after action update');
    assert(statsData.stats.statusBreakdown.SECURED >= 1, 'SECURED count should be >= 1');

    console.log('\n🎉 ALL AUDIT ROUTES VERIFIED SUCCESSFULLY!\n');
  } finally {
    if (app.server) {
      await new Promise((resolve) => app.server.close(resolve));
      console.log('Server listener closed cleanly.');
    }
  }
}

testEndpoints().catch((err) => {
  console.error('Endpoint test failed:', err);
  process.exit(1);
});
