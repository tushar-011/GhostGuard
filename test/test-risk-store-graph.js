const assert = require('assert');
const {
  calculateAccountAge,
  determineRiskLevel,
  calculateGhostScore,
  evaluateRisk
} = require('../src/services/riskEngine');
const storeService = require('../src/services/storeService');
const { generateMindMapGraph } = require('../src/services/graphService');

async function runTests() {
  console.log('--- Testing GhostGuard Risk Engine, Store Service & Graph Formatter ---\n');

  // ==========================================
  // 1. Test Risk Assessment Utility
  // ==========================================
  console.log('[Test 1] Risk Engine - Age & Risk Calculations');

  // Age calculations
  const now = new Date();
  const twoYearsAgo = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000).toISOString();
  const sevenMonthsAgo = new Date(now.getTime() - 215 * 24 * 60 * 60 * 1000).toISOString();
  const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();
  const fourteenMonthsAgo = new Date(now.getTime() - 425 * 24 * 60 * 60 * 1000).toISOString();

  // Test 1a: Account Age
  const age1 = calculateAccountAge(twoYearsAgo);
  assert(age1.ageInMonths >= 23, `Expected >= 23 months, got ${age1.ageInMonths}`);

  // Test 1b: Financial service > 6 months -> High Risk
  const finRisk = determineRiskLevel('Finance', 7, 'stripe.com');
  assert.strictEqual(finRisk, 'High', 'Finance > 6 months must be High Risk');

  // Test 1c: Developer service > 12 months -> High Risk
  const devRisk = determineRiskLevel('Developer', 14, 'github.com');
  assert.strictEqual(devRisk, 'High', 'Developer > 12 months must be High Risk');

  // Test 1d: Social media > 18 months -> Medium Risk
  const socialRisk = determineRiskLevel('Social & Media', 20, 'twitter.com');
  assert.strictEqual(socialRisk, 'Medium', 'Social > 18 months must be Medium Risk');

  // Test 1e: Accounts < 6 months -> Low Risk
  const newRisk = determineRiskLevel('Productivity', 2, 'linear.app');
  assert.strictEqual(newRisk, 'Low', 'Account < 6 months must be Low Risk');

  // Test 1f: evaluateRisk full payload
  const evaluatedDev = evaluateRisk({
    domain: 'github.com',
    serviceName: 'GitHub',
    category: 'Developer',
    detectedDate: fourteenMonthsAgo,
    snippet: 'Welcome to GitHub'
  });

  assert.strictEqual(evaluatedDev.isDormant, true, 'Account > 12 months should be dormant');
  assert.strictEqual(evaluatedDev.flag, 'Dormant / Ghost Candidate');
  assert.strictEqual(evaluatedDev.riskLevel, 'High');
  assert(evaluatedDev.ghostScore >= 70, `Expected ghostScore >= 70 for high risk dormant dev account, got ${evaluatedDev.ghostScore}`);
  assert(typeof evaluatedDev.remediationTip === 'string' && evaluatedDev.remediationTip.length > 10);
  console.log('✓ Risk Engine calculations and telemetry verified');

  // ==========================================
  // 2. Test File-Based State Store
  // ==========================================
  console.log('\n[Test 2] State Store Service');
  await storeService.clearStore();

  const sampleAccounts = [
    evaluateRisk({
      domain: 'stripe.com',
      serviceName: 'Stripe',
      category: 'Finance',
      detectedDate: sevenMonthsAgo
    }),
    evaluateRisk({
      domain: 'github.com',
      serviceName: 'GitHub',
      category: 'Developer',
      detectedDate: fourteenMonthsAgo
    }),
    evaluateRisk({
      domain: 'notion.so',
      serviceName: 'Notion',
      category: 'Productivity',
      detectedDate: twoMonthsAgo
    })
  ];

  // Save accounts
  const saved = await storeService.saveAccounts(sampleAccounts);
  assert.strictEqual(saved.length, 3, 'Should save 3 accounts');

  // Verify default status is UNREVIEWED
  const fetched = await storeService.getAccounts();
  assert.strictEqual(fetched.length, 3);
  assert.strictEqual(fetched[0].status, 'UNREVIEWED');

  // Test status update: MARKED_FOR_DELETION
  const updated1 = await storeService.updateAccountStatus('github.com', 'MARKED_FOR_DELETION', 'User decided to close account');
  assert.strictEqual(updated1.status, 'MARKED_FOR_DELETION');
  assert.strictEqual(updated1.notes, 'User decided to close account');
  assert(updated1.userActionDate);

  // Test status update: SECURED
  const updated2 = await storeService.updateAccountStatus('stripe.com', 'SECURED', 'Enabled hardware 2FA');
  assert.strictEqual(updated2.status, 'SECURED');

  // Test status update on non-existent domain should reject
  await assert.rejects(
    async () => {
      await storeService.updateAccountStatus('nonexistent.com', 'KEPT');
    },
    /not found/
  );

  // Test invalid status should reject
  await assert.rejects(
    async () => {
      await storeService.updateAccountStatus('notion.so', 'INVALID_STATUS');
    },
    /Invalid status/
  );

  console.log('✓ Store Service save, retrieve, and status lifecycle verified');

  // ==========================================
  // 3. Test Mind-Map Graph Formatter
  // ==========================================
  console.log('\n[Test 3] Mind-Map Graph Formatter');
  const graph = generateMindMapGraph(await storeService.getAccounts(), 'developer@example.com');

  // Verify structure
  assert(Array.isArray(graph.nodes), 'graph.nodes must be array');
  assert(Array.isArray(graph.edges), 'graph.edges must be array');

  // Root node validation
  const rootNode = graph.nodes.find((n) => n.id === 'root');
  assert(rootNode, 'Must contain a root node');
  assert.strictEqual(rootNode.label, 'developer@example.com');
  assert.strictEqual(rootNode.type, 'user');

  // Category nodes validation
  const categoryNodes = graph.nodes.filter((n) => n.type === 'category');
  assert(categoryNodes.length >= 3, `Expected at least 3 categories, got ${categoryNodes.length}`);

  // Leaf service nodes validation
  const serviceNodes = graph.nodes.filter((n) => n.type === 'service');
  assert.strictEqual(serviceNodes.length, 3, 'Must contain 3 service leaf nodes');

  const githubNode = serviceNodes.find((n) => n.id === 'github.com');
  assert(githubNode, 'github.com node must exist');
  assert.strictEqual(githubNode.label, 'GitHub');
  assert.strictEqual(githubNode.riskLevel, 'High');
  assert.strictEqual(githubNode.status, 'MARKED_FOR_DELETION');
  assert(typeof githubNode.ghostScore === 'number');

  // Edges validation
  const rootEdges = graph.edges.filter((e) => e.source === 'root');
  assert.strictEqual(rootEdges.length, categoryNodes.length, 'Root must link to all category nodes');

  const serviceEdges = graph.edges.filter((e) => e.target === 'github.com');
  assert.strictEqual(serviceEdges.length, 1, 'Service must have incoming edge from category');

  console.log('✓ Graph Formatter nodes, edges, hierarchy, and properties verified');

  console.log('\n🎉 ALL COMPONENT TESTS PASSED PERFECTLY!\n');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

