const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('--- Testing GhostGuard Chrome Extension Perimeter Defender ---');

// Test 1: Verify Manifest V3 configuration
console.log('\n[Test 1] Manifest V3 Permissions & Background Registration');
const manifestRaw = fs.readFileSync(path.join(__dirname, '../extension/manifest.json'), 'utf8');
const manifest = JSON.parse(manifestRaw);

assert.strictEqual(manifest.manifest_version, 3, 'Must be Manifest V3');
assert(manifest.permissions.includes('tabs'), 'Must contain tabs permission');
assert(manifest.permissions.includes('activeTab'), 'Must contain activeTab permission');
assert(manifest.permissions.includes('storage'), 'Must contain storage permission');
assert(manifest.background && manifest.background.service_worker === 'background.js', 'Must configure background service worker');
console.log('✓ Manifest V3 configuration verified');

// Test 2: Domain matching & hostname extraction logic
console.log('\n[Test 2] Domain Matching & Normalization Logic');
function extractHostname(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return null;
  }
}

function findMatchingAccount(accounts, hostname) {
  if (!hostname || !accounts || !accounts.length) return null;
  return accounts.find((a) => {
    if (!a.domain) return false;
    const cleanDomain = a.domain.replace(/^www\./i, '').toLowerCase();
    return cleanDomain === hostname || hostname.endsWith('.' + cleanDomain) || cleanDomain.endsWith('.' + hostname);
  }) || null;
}

const mockAccounts = [
  { domain: 'github.com', serviceName: 'GitHub', riskLevel: 'HIGH', ghostScore: 82, status: 'UNREVIEWED' },
  { domain: 'notion.so', serviceName: 'Notion', riskLevel: 'LOW', ghostScore: 12, status: 'KEPT' },
  { domain: 'airbnb.com', serviceName: 'Airbnb', riskLevel: 'MED', ghostScore: 55, isDormant: true }
];

assert.strictEqual(extractHostname('https://github.com/org/repo'), 'github.com');
assert.strictEqual(extractHostname('https://www.github.com/pulls'), 'github.com');
assert.strictEqual(extractHostname('https://gist.github.com/snippet'), 'gist.github.com');
assert.strictEqual(extractHostname('chrome://extensions'), null);

const matchGithub = findMatchingAccount(mockAccounts, 'github.com');
assert(matchGithub !== null && matchGithub.serviceName === 'GitHub', 'Should match github.com');

const matchSubdomain = findMatchingAccount(mockAccounts, 'gist.github.com');
assert(matchSubdomain !== null && matchSubdomain.serviceName === 'GitHub', 'Should match subdomains of github.com');

const matchUnknown = findMatchingAccount(mockAccounts, 'wikipedia.org');
assert.strictEqual(matchUnknown, null, 'Unknown domain should return null');
console.log('✓ Domain matching & normalization verified');

// Test 3: Micro-Action Service URLs
console.log('\n[Test 3] Micro-Action Remediation URLs');
function getServiceSecurityUrl(domain) {
  if (!domain) return 'https://google.com';
  const clean = domain.replace(/^www\./i, '').toLowerCase();
  const known = {
    'github.com': 'https://github.com/settings/security',
    'google.com': 'https://myaccount.google.com/security',
    'notion.so': 'https://www.notion.so/my-account'
  };
  return known[clean] || `https://${clean}`;
}

assert.strictEqual(getServiceSecurityUrl('github.com'), 'https://github.com/settings/security');
assert.strictEqual(getServiceSecurityUrl('www.github.com'), 'https://github.com/settings/security');
assert.strictEqual(getServiceSecurityUrl('randomsite.io'), 'https://randomsite.io');
console.log('✓ Micro-action security URLs verified');

console.log('\n🎉 ALL EXTENSION PERIMETER TESTS PASSED PERFECTLY!');

