const assert = require('assert');
const auditRoutes = require('../src/routes/auditRoutes');

console.log('\n--- Testing GhostGuard GhostAI Security Advisor ---');

async function testGhostAI() {
  // Extract route handler from Express router stack
  const ghostAiLayer = auditRoutes.stack.find(
    (layer) => layer.route && layer.route.path === '/ghost-ai' && layer.route.methods.post
  );
  assert(ghostAiLayer, 'POST /ghost-ai route must be registered in auditRoutes');
  const postGhostAiHandler = ghostAiLayer.route.stack[0].handle;

  // Test 1: Validation of empty message
  console.log('\n[Test 1] Input Validation');
  let errStatus = null;
  let errPayload = null;
  const mockReqBad = { body: {} };
  const mockResBad = {
    status: (code) => {
      errStatus = code;
      return {
        json: (payload) => {
          errPayload = payload;
        }
      };
    }
  };

  await postGhostAiHandler(mockReqBad, mockResBad);
  assert.strictEqual(errStatus, 400, 'Must return 400 when message is missing');
  assert.strictEqual(errPayload.success, false);
  console.log('✓ Rejection of invalid payload verified');

  // Test 2: Heuristic Advisor - Prioritization Query
  console.log('\n[Test 2] Query: "Which accounts should I prioritize securing?"');
  let prioritizePayload = null;
  const mockReqPrioritize = {
    body: {
      message: 'Which accounts should I prioritize securing?'
    },
    user: null
  };
  const mockResPrioritize = {
    json: (payload) => {
      prioritizePayload = payload;
    },
    status: (code) => mockResPrioritize
  };

  await postGhostAiHandler(mockReqPrioritize, mockResPrioritize);
  assert.strictEqual(prioritizePayload.success, true);
  assert.strictEqual(typeof prioritizePayload.reply, 'string');
  assert(prioritizePayload.reply.length > 50, 'Reply should be detailed');
  assert(
    prioritizePayload.reply.toLowerCase().includes('priority') ||
    prioritizePayload.reply.toLowerCase().includes('score'),
    'Should contain priority or score guidance'
  );
  assert(
    prioritizePayload.reply.toLowerCase().includes('advisor') ||
    prioritizePayload.reply.toLowerCase().includes('dashboard'),
    'Should reinforce read-only advisor guardrail directing to dashboard buttons'
  );
  console.log('✓ Prioritization advice successfully generated & grounded');

  // Test 3: Heuristic Advisor - Dormancy Query
  console.log('\n[Test 3] Query: "Why are dormant accounts risky?"');
  let dormantPayload = null;
  const mockReqDormant = {
    body: {
      message: 'Why are dormant accounts risky?'
    },
    user: null
  };
  const mockResDormant = {
    json: (payload) => {
      dormantPayload = payload;
    },
    status: (code) => mockResDormant
  };

  await postGhostAiHandler(mockReqDormant, mockResDormant);
  assert.strictEqual(dormantPayload.success, true);
  assert(
    dormantPayload.reply.toLowerCase().includes('credential stuffing') ||
    dormantPayload.reply.toLowerCase().includes('dormant')
  );
  console.log('✓ Dormancy threat analysis verified');

  // Test 4: Heuristic Advisor - Executive Report Query
  console.log('\n[Test 4] Query: "Generate audit summary report"');
  let reportPayload = null;
  const mockReqReport = {
    body: {
      message: 'Generate audit summary report'
    },
    user: null
  };
  const mockResReport = {
    json: (payload) => {
      reportPayload = payload;
    },
    status: (code) => mockResReport
  };

  await postGhostAiHandler(mockReqReport, mockResReport);
  assert.strictEqual(reportPayload.success, true);
  assert(reportPayload.reply.includes('Security Score') || reportPayload.reply.includes('Summary'));
  console.log('✓ Executive posture report verified');

  console.log('\n🎉 ALL GHOSTAI SECURITY ADVISOR TESTS PASSED PERFECTLY!\n');
}

testGhostAI().catch((err) => {
  console.error('GhostAI test failed:', err);
  process.exit(1);
});
