const express = require('express');
const router = express.Router();
const { oauth2Client } = require('../config/googleAuth');
const { fetchAccountDiscoveryEmails } = require('../services/gmailService');
const { extractServiceMetadata } = require('../services/parserService');
const { evaluateRisk } = require('../services/riskEngine');
const storeService = require('../services/storeService');
const { generateMindMapGraph } = require('../services/graphService');

/**
 * Helper to generate mock email discovery dataset for testing/demos
 */
function getMockRawEmails() {
  return [
    {
      id: 'mock-1',
      from: '"Notion Team" <team@mail.notion.so>',
      subject: 'Welcome to Notion! Your all-in-one workspace',
      date: 'Wed, 12 Oct 2023 10:15:00 GMT',
      snippet: 'Welcome to Notion! Set up your team workspaces and wikis.'
    },
    {
      id: 'mock-2',
      from: 'GitHub <noreply@github.com>',
      subject: '[GitHub] Please verify your email address.',
      date: 'Mon, 15 Jan 2024 14:22:10 GMT',
      snippet: 'Thanks for signing up for GitHub! Use this code to verify your account.'
    },
    {
      id: 'mock-3',
      from: 'Slack <feedback@slack.com>',
      subject: 'Confirm your account and join your team on Slack',
      date: 'Tue, 03 May 2023 09:30:00 GMT',
      snippet: 'Confirm your email to join the workspace on Slack.'
    },
    {
      id: 'mock-4',
      from: '"Figma" <support@figma.com>',
      subject: 'Welcome to Figma - Let us build together',
      date: 'Fri, 20 Nov 2023 16:45:00 GMT',
      snippet: 'Thanks for joining Figma! Explore multiplayer design files today.'
    },
    {
      id: 'mock-5',
      from: 'Stripe <notifications@stripe.com>',
      subject: 'Activate your account to start accepting payments',
      date: 'Thu, 05 Aug 2023 11:00:00 GMT',
      snippet: 'Finish setting up your Stripe account and verify your business details.'
    },
    {
      id: 'mock-6',
      from: 'Docker <no-reply@docker.com>',
      subject: 'Verify your Docker Hub account registration',
      date: 'Thu, 18 Jan 2024 12:00:00 GMT',
      snippet: 'Please confirm your email address to access Docker Hub repositories.'
    },
    {
      id: 'mock-7',
      from: 'Coinbase <no-reply@coinbase.com>',
      subject: 'Verify your email address on Coinbase',
      date: 'Wed, 10 Nov 2023 13:40:00 GMT',
      snippet: 'Welcome to Coinbase! Verify your account to start trading crypto securely.'
    },
    {
      id: 'mock-8',
      from: 'Twitter <verify@twitter.com>',
      subject: 'Confirm your Twitter account',
      date: 'Sun, 14 Aug 2022 18:20:00 GMT',
      snippet: 'Confirm your email to start following conversations on Twitter.'
    },
    {
      id: 'mock-9',
      from: 'Spotify <news@news.spotify.com>',
      subject: 'Welcome to Spotify!',
      date: 'Sun, 04 Jun 2023 12:05:00 GMT',
      snippet: 'Thanks for signing up! Start listening to millions of songs.'
    }
  ];
}

/**
 * 1. GET /api/audit/scan
 * Runs discovery, applies riskEngine, persists results into storeService, and returns scored assets.
 * Supports ?mock=true for rapid frontend development and offline hackathon testing.
 */
router.get('/scan', async (req, res) => {
  try {
    const isMock = req.query.mock === 'true' || req.query.demo === 'true';

    let rawEmails = [];

    if (isMock) {
      console.log('[Audit] Using mock discovery email dataset for scan...');
      rawEmails = getMockRawEmails();
    } else {
      if (!oauth2Client.credentials || !oauth2Client.credentials.access_token) {
        // Fallback: If we already have stored audited accounts from a previous scan, return them!
        const existingStored = await storeService.getAccounts();
        if (existingStored && existingStored.length > 0) {
          console.log(`[Audit] Active tokens not in memory, returning ${existingStored.length} stored accounts.`);
          return res.json({
            success: true,
            mode: 'store',
            count: existingStored.length,
            assets: existingStored
          });
        }

        return res.status(401).json({
          success: false,
          error: 'User not authenticated. Please log in via /auth/google first.',
          authUrl: '/auth/google',
          tip: 'Use /api/audit/scan?mock=true to run in demo mode without Google login.'
        });
      }

      console.log('[Audit] Querying Gmail API for account onboarding emails...');
      rawEmails = await fetchAccountDiscoveryEmails(oauth2Client);
    }

    // 1. Extract third-party service identities and strip subdomains
    const parsedAccounts = extractServiceMetadata(rawEmails);

    // 2. Apply Risk Assessment Engine (age, dormancy, risk level, ghostScore, remediationTip)
    const scoredAccounts = parsedAccounts.map((account) => evaluateRisk(account));

    // 3. Persist results in file-based state store
    const persistedAccounts = await storeService.saveAccounts(scoredAccounts);

    console.log(`[Audit] Scan completed and saved. Total accounts in store: ${persistedAccounts.length}`);

    res.json({
      success: true,
      mode: isMock ? 'mock' : 'live',
      count: persistedAccounts.length,
      assets: persistedAccounts,
      batchDiscoveredCount: scoredAccounts.length
    });
  } catch (error) {
    console.error('Audit scan failed:', error);
    // If Gmail API call failed due to invalid credentials, check if we have stored accounts
    try {
      const existing = await storeService.getAccounts();
      if (existing && existing.length > 0) {
        return res.json({
          success: true,
          mode: 'store-fallback',
          count: existing.length,
          assets: existing
        });
      }
    } catch {}
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 1b. GET /api/audit/accounts
 * Returns all saved audited accounts directly from state store.
 */
router.get('/accounts', async (req, res) => {
  try {
    const accounts = await storeService.getAccounts();
    res.json({
      success: true,
      count: accounts.length,
      assets: accounts
    });
  } catch (error) {
    console.error('Failed to get stored accounts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 2. GET /api/audit/graph
 * Returns node-and-edge JSON structure for D3.js or React Flow mind maps.
 */
router.get('/graph', async (req, res) => {
  try {
    let accounts = await storeService.getAccounts();

    // If store is empty and ?mock=true is requested, generate mock scan first
    if (accounts.length === 0 && (req.query.mock === 'true' || req.query.demo === 'true')) {
      const mockRaw = getMockRawEmails();
      const parsed = extractServiceMetadata(mockRaw);
      const scored = parsed.map((a) => evaluateRisk(a));
      accounts = await storeService.saveAccounts(scored);
    }

    const userEmail = req.query.email || 'Your Digital Footprint';
    const graphData = generateMindMapGraph(accounts, userEmail);

    res.json({
      success: true,
      graph: graphData
    });
  } catch (error) {
    console.error('Graph generation failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Helper to compute high-level audit statistics across stored accounts
 */
function computeAuditStats(accounts = []) {
  const totalDiscovered = accounts.length;

  let dormantCount = 0;
  let highRiskCount = 0;
  let reviewedCount = 0;
  let totalGhostScore = 0;

  const riskBreakdown = { High: 0, Medium: 0, Low: 0 };
  const statusBreakdown = {
    UNREVIEWED: 0,
    KEPT: 0,
    SECURED: 0,
    MARKED_FOR_DELETION: 0,
    REVOKED: 0
  };
  const categoryBreakdown = {};

  for (const account of accounts) {
    if (typeof account.ghostScore === 'number') {
      totalGhostScore += account.ghostScore;
    }

    // Dormant count
    if (account.isDormant || (account.ageInMonths && account.ageInMonths >= 12)) {
      dormantCount++;
    }

    // Risk count
    const rawRisk = account.riskLevel || 'Low';
    const upperRisk = rawRisk.toUpperCase();
    const isHigh = upperRisk === 'HIGH' || (typeof account.ghostScore === 'number' && account.ghostScore >= 70);

    if (isHigh) {
      highRiskCount++;
      riskBreakdown.High = (riskBreakdown.High || 0) + 1;
    } else if (upperRisk === 'MEDIUM' || upperRisk === 'MED') {
      riskBreakdown.Medium = (riskBreakdown.Medium || 0) + 1;
    } else {
      riskBreakdown.Low = (riskBreakdown.Low || 0) + 1;
    }

    // Status count
    const status = account.status || 'UNREVIEWED';
    if (status && status !== 'UNREVIEWED') {
      reviewedCount++;
    }
    if (statusBreakdown[status] !== undefined) {
      statusBreakdown[status]++;
    } else {
      statusBreakdown[status] = 1;
    }

    // Category breakdown
    const cat = account.category || 'General Service';
    categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
  }

  const avgGhostScore = totalDiscovered > 0 ? Math.round(totalGhostScore / totalDiscovered) : 0;

  return {
    totalDiscovered,
    dormantCount,
    highRiskCount,
    reviewedCount,
    ghostScore: avgGhostScore,
    riskBreakdown,
    statusBreakdown,
    categoryBreakdown
  };
}

/**
 * 3. POST /api/audit/action
 * Updates an audited account's user action state (e.g. KEPT, SECURED, MARKED_FOR_DELETION, REVOKED, REMOVE_RECORD).
 * Request body: { domain: string, action: string, notes?: string }
 */
router.post('/action', async (req, res) => {
  try {
    const { domain, action, notes } = req.body;

    if (!domain) {
      return res.status(400).json({
        success: false,
        error: 'Missing domain in request body.'
      });
    }

    if (!action) {
      return res.status(400).json({
        success: false,
        error: `Missing action. Allowed actions: ${storeService.ALLOWED_STATUSES.join(', ')}`
      });
    }

    const cleanAction = action.toUpperCase().trim();

    // Handle permanent asset removal
    if (cleanAction === 'REMOVE_RECORD' || cleanAction === 'DELETE_RECORD') {
      await storeService.removeAccount(domain);
      const remainingAccounts = await storeService.getAccounts();
      const updatedStats = computeAuditStats(remainingAccounts);

      return res.json({
        success: true,
        removedDomain: domain,
        message: `Account record for "${domain}" permanently removed from audit store.`,
        stats: updatedStats
      });
    }

    const updatedAccount = await storeService.updateAccountStatus(domain, action, notes);
    const remainingAccounts = await storeService.getAccounts();
    const updatedStats = computeAuditStats(remainingAccounts);

    res.json({
      success: true,
      message: `Account status for "${domain}" successfully updated to "${action}".`,
      account: updatedAccount,
      stats: updatedStats
    });
  } catch (error) {
    console.error('Updating account status failed:', error.message);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

/**
 * 3b. DELETE /api/audit/asset/:domain
 * Permanently removes an asset record from audit_store.json
 */
router.delete('/asset/:domain', async (req, res) => {
  try {
    const { domain } = req.params;

    if (!domain) {
      return res.status(400).json({
        success: false,
        error: 'Missing domain in delete request.'
      });
    }

    await storeService.removeAccount(domain);
    const remainingAccounts = await storeService.getAccounts();
    const updatedStats = computeAuditStats(remainingAccounts);

    res.json({
      success: true,
      removedDomain: domain,
      message: `Account record for "${domain}" successfully deleted.`,
      stats: updatedStats
    });
  } catch (error) {
    console.error('Deleting asset failed:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 3c. POST /api/audit/clear & DELETE /api/audit/cache
 * Clears data/audit_store.json
 */
router.post('/clear', async (req, res) => {
  try {
    await storeService.clearStore();
    res.json({
      success: true,
      message: 'Audit cache cleared successfully.',
      stats: computeAuditStats([])
    });
  } catch (error) {
    console.error('Failed to clear audit store:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/cache', async (req, res) => {
  try {
    await storeService.clearStore();
    res.json({
      success: true,
      message: 'Audit cache cleared successfully.',
      stats: computeAuditStats([])
    });
  } catch (error) {
    console.error('Failed to clear audit store:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 4. GET /api/audit/stats
 * Aggregates high-level metrics across all audited accounts in storage.
 * Returns: { totalDiscovered, dormantCount, highRiskCount, reviewedCount, ... }
 */
router.get('/stats', async (req, res) => {
  try {
    let accounts = await storeService.getAccounts();

    // If store is empty and ?mock=true is requested, generate mock data for demo
    if (accounts.length === 0 && (req.query.mock === 'true' || req.query.demo === 'true')) {
      const mockRaw = getMockRawEmails();
      const parsed = extractServiceMetadata(mockRaw);
      const scored = parsed.map((a) => evaluateRisk(a));
      accounts = await storeService.saveAccounts(scored);
    }

    const stats = computeAuditStats(accounts);

    res.json({
      success: true,
      totalDiscovered: stats.totalDiscovered,
      highRiskCount: stats.highRiskCount,
      dormantCount: stats.dormantCount,
      reviewedCount: stats.reviewedCount,
      ghostScore: stats.ghostScore,
      stats
    });
  } catch (error) {
    console.error('Failed to compute audit statistics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
