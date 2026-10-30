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
      count: scoredAccounts.length,
      assets: scoredAccounts
    });
  } catch (error) {
    console.error('Audit scan failed:', error);
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
 * 3. POST /api/audit/action
 * Updates an audited account's user action state (e.g. KEPT, SECURED, MARKED_FOR_DELETION, REVOKED).
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

    const updatedAccount = await storeService.updateAccountStatus(domain, action, notes);

    res.json({
      success: true,
      message: `Account status for "${domain}" successfully updated to "${action}".`,
      account: updatedAccount
    });
  } catch (error) {
    console.error('Updating account status failed:', error.message);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ success: false, error: error.message });
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

    const totalDiscovered = accounts.length;

    let dormantCount = 0;
    let highRiskCount = 0;
    let reviewedCount = 0;

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
      // Dormant count
      if (account.isDormant || (account.ageInMonths && account.ageInMonths >= 12)) {
        dormantCount++;
      }

      // Risk count
      const risk = account.riskLevel || 'Low';
      if (risk === 'High') highRiskCount++;
      if (riskBreakdown[risk] !== undefined) {
        riskBreakdown[risk]++;
      }

      // Status count
      const status = account.status || 'UNREVIEWED';
      if (status !== 'UNREVIEWED') {
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

    res.json({
      success: true,
      stats: {
        totalDiscovered,
        dormantCount,
        highRiskCount,
        reviewedCount,
        riskBreakdown,
        statusBreakdown,
        categoryBreakdown
      }
    });
  } catch (error) {
    console.error('Failed to compute audit statistics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
