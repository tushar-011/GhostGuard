const assert = require('assert');
const {
  assignCategory,
  extractServiceMetadata
} = require('../src/services/parserService');

console.log('--- Running GhostGuard Parser Tests ---\n');

// 1. Test Category Assignment
console.log('[Test 1] assignCategory');
assert.strictEqual(assignCategory('notion.so'), 'Productivity');
assert.strictEqual(assignCategory('slack.com'), 'Productivity');
assert.strictEqual(assignCategory('github.com'), 'Developer');
assert.strictEqual(assignCategory('twitter.com'), 'Social & Media');
assert.strictEqual(assignCategory('stripe.com'), 'Finance');
assert.strictEqual(assignCategory('unknownservice.com'), 'General Service');
console.log('✓ assignCategory passed');

// 2. Test extractServiceMetadata
console.log('\n[Test 2] extractServiceMetadata');
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
  }
];

const results = extractServiceMetadata(sampleEmails);

console.log(`Extracted ${results.length} services:`);
console.table(results);

// Assertions
assert.strictEqual(results.length, 2, 'Should extract Notion and GitHub, ignoring Google and deduplicating Notion');
assert.strictEqual(results[0].domain, 'notion.so');
assert.strictEqual(results[0].category, 'Productivity');
assert.strictEqual(results[1].domain, 'github.com');
assert.strictEqual(results[1].category, 'Developer');

console.log('\n✅ ALL TESTS PASSED SUCCESSFULLY!');
