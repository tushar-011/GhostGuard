const assert = require('assert');
const {
  assignCategory,
  extractServiceMetadata,
  parseGoogleAccountSharingEmail,
} = require('../src/services/parserService');
const { GMAIL_SEARCH_QUERY } = require('../src/services/gmailService');

console.log('--- Running GhostGuard Parser Tests ---\n');

// 1. Test Category Assignment
console.log('[Test 1] assignCategory');
assert.strictEqual(assignCategory('notion.so'), 'Productivity');
assert.strictEqual(assignCategory('slack.com'), 'Productivity');
assert.strictEqual(assignCategory('github.com'), 'Developer');
assert.strictEqual(assignCategory('twitter.com'), 'Social & Media');
assert.strictEqual(assignCategory('reddit.com'), 'Social & Media');
assert.strictEqual(assignCategory('stripe.com'), 'Finance');
assert.strictEqual(assignCategory('unknownservice.com'), 'General Service');
console.log('✓ assignCategory passed');

// 2. Test Gmail Search Query Generator
console.log('\n[Test 2] GMAIL_SEARCH_QUERY verification');
assert(GMAIL_SEARCH_QUERY.includes('You shared some Google Account data with'), 'Search query must target Google data sharing alerts');
assert(GMAIL_SEARCH_QUERY.includes('noreply-accounts@google.com'), 'Search query must target Google accounts sender');
console.log('✓ GMAIL_SEARCH_QUERY contains OAuth & data sharing search clauses');

// 3. Test parseGoogleAccountSharingEmail directly
console.log('\n[Test 3] parseGoogleAccountSharingEmail Handler');

// Case A: Pattern 1 - "You shared some Google Account data with {ServiceName}"
const googleOAuthReddit = parseGoogleAccountSharingEmail({
  from: 'Google <noreply-accounts@google.com>',
  subject: 'You shared some Google Account data with Reddit',
  date: '2024-03-19T15:00:00.000Z',
  snippet: 'You recently used Sign in with Google to sign in to Reddit.'
});
assert(googleOAuthReddit, 'Should identify Reddit from Google account sharing subject');
assert.strictEqual(googleOAuthReddit.serviceName, 'Reddit');
assert.strictEqual(googleOAuthReddit.domain, 'reddit.com');
assert.strictEqual(googleOAuthReddit.authMethod, 'Google OAuth SSO');
assert.strictEqual(googleOAuthReddit.ghostScore, 45);
assert.strictEqual(googleOAuthReddit.status, 'UNREVIEWED');
console.log('✓ Google Account data sharing pattern successfully parsed (Reddit)');

// Case B: Pattern 1 variant - "{ServiceName} was granted access to your Google Account"
const googleOAuthCanva = parseGoogleAccountSharingEmail({
  from: 'Google Accounts <no-reply@accounts.google.com>',
  subject: 'Canva was granted access to your Google Account',
  date: '2024-05-10T10:00:00.000Z',
  snippet: 'Canva has access to basic profile info.'
});
assert(googleOAuthCanva, 'Should identify Canva from access grant subject');
assert.strictEqual(googleOAuthCanva.serviceName, 'Canva');
assert.strictEqual(googleOAuthCanva.domain, 'canva.com');
assert.strictEqual(googleOAuthCanva.authMethod, 'Google OAuth SSO');
console.log('✓ Google access grant pattern successfully parsed (Canva)');

// Case C: Pattern 2 - Body snippet inspection
const googleOAuthDiscord = parseGoogleAccountSharingEmail(
  [
    { name: 'From', value: 'Google <noreply-accounts@google.com>' },
    { name: 'Subject', value: 'Security alert for your linked account' },
    { name: 'Date', value: '2024-08-01T12:00:00.000Z' }
  ],
  'You used Sign in with Google to sign in to Discord on your web browser.'
);
assert(googleOAuthDiscord, 'Should identify Discord from body text');
assert.strictEqual(googleOAuthDiscord.serviceName, 'Discord');
assert.strictEqual(googleOAuthDiscord.domain, 'discord.com');
assert.strictEqual(googleOAuthDiscord.authMethod, 'Google OAuth SSO');
console.log('✓ Body text OAuth sign-in pattern successfully parsed (Discord)');

// Case D: Non-sharing Google alert (should return null)
const googleGenericAlert = parseGoogleAccountSharingEmail({
  from: 'Google <no-reply@accounts.google.com>',
  subject: 'Security alert: New sign-in on Windows device',
  snippet: 'A new sign-in was detected on your account.'
});
assert.strictEqual(googleGenericAlert, null, 'Generic Google security alert should not be parsed as third party');
console.log('✓ Generic self-referential Google alerts safely filtered out');

// 4. Test extractServiceMetadata with mixed inbox
console.log('\n[Test 4] extractServiceMetadata with mixed inbox');
const sampleEmails = [
  {
    id: '1',
    from: '"Notion Team" <team@mail.notion.so>',
    subject: 'Welcome to Notion!',
    date: '2024-10-12T10:15:00.000Z',
    snippet: 'Welcome to Notion! Your all-in-one workspace.'
  },
  {
    id: '2',
    from: 'GitHub <noreply@github.com>',
    subject: 'Please verify your email address',
    date: '2025-01-15T14:22:10.000Z',
    snippet: 'Thanks for signing up for GitHub!'
  },
  {
    id: '3',
    from: '"Notion Security" <security@mail.notion.so>',
    subject: 'Confirm your account login',
    date: '2024-10-14T11:00:00.000Z',
    snippet: 'Confirm login'
  },
  {
    id: '4',
    from: 'Google <no-reply@accounts.google.com>',
    subject: 'Security alert',
    date: '2025-02-01T08:00:00.000Z',
    snippet: 'New login'
  },
  {
    id: '5',
    from: 'Google <noreply-accounts@google.com>',
    subject: 'You shared some Google Account data with Reddit',
    date: '2024-03-19T15:00:00.000Z',
    snippet: 'You recently used Sign in with Google to sign in to Reddit.'
  }
];

const results = extractServiceMetadata(sampleEmails);

console.log(`Extracted ${results.length} services:`);
console.table(results.map(r => ({ serviceName: r.serviceName, domain: r.domain, authMethod: r.authMethod, category: r.category })));

// Assertions
assert.strictEqual(results.length, 3, 'Should extract Notion, GitHub, and Reddit (via Google OAuth SSO), ignoring generic Google alert');

const notionAsset = results.find(r => r.domain === 'notion.so');
const githubAsset = results.find(r => r.domain === 'github.com');
const redditAsset = results.find(r => r.domain === 'reddit.com');

assert(notionAsset, 'Notion must be cataloged');
assert.strictEqual(notionAsset.category, 'Productivity');

assert(githubAsset, 'GitHub must be cataloged');
assert.strictEqual(githubAsset.category, 'Developer');

assert(redditAsset, 'Reddit must be cataloged from Google data sharing email');
assert.strictEqual(redditAsset.serviceName, 'Reddit');
assert.strictEqual(redditAsset.domain, 'reddit.com');
assert.strictEqual(redditAsset.authMethod, 'Google OAuth SSO');

// 5. Test Live/Mock Scan Route Integration
console.log('\n[Test 5] GET /api/audit/scan?mock=true Route Integration');
const auditRoutes = require('../src/routes/auditRoutes');
const scanLayer = auditRoutes.stack.find(
  (l) => l.route && l.route.path === '/scan' && l.route.methods.get
);
assert(scanLayer, 'GET /scan route must exist in auditRoutes');
const scanHandler = scanLayer.route.stack[0].handle;

(async () => {
  let scanPayload = null;
  const mockReq = { query: { mock: 'true' }, user: null };
  const mockRes = {
    json: (p) => { scanPayload = p; },
    status: () => mockRes
  };

  await scanHandler(mockReq, mockRes);
  assert.strictEqual(scanPayload.success, true);
  assert(scanPayload.count >= 10, `Expected at least 10 discovered accounts, got ${scanPayload.count}`);

  const redditInScan = scanPayload.assets.find(a => a.domain === 'reddit.com');
  assert(redditInScan, 'Reddit (reddit.com) must be discovered in scan results');
  assert.strictEqual(redditInScan.serviceName, 'Reddit');
  assert.strictEqual(redditInScan.authMethod, 'Google OAuth SSO');
  console.log(`✓ Scan endpoint returned ${scanPayload.count} accounts including Reddit (${redditInScan.authMethod})`);

  console.log('\n✅ ALL PARSER & OAUTH TESTS PASSED SUCCESSFULLY!\n');
})().catch((err) => {
  console.error('\n❌ Test 5 failed:', err);
  process.exit(1);
});
