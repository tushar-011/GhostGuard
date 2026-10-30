const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { oauth2Client, SCOPES } = require('../config/googleAuth');

const SESSION_FILE = path.join(__dirname, '../../data/auth_session.json');
let authenticatedUser = null;

// Initialize session from disk if previously saved
try {
  if (fs.existsSync(SESSION_FILE)) {
    const sessionData = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
    if (sessionData.tokens) {
      oauth2Client.setCredentials(sessionData.tokens);
    }
    if (sessionData.user) {
      authenticatedUser = sessionData.user;
    }
    console.log('[Auth] Restored active session from disk for:', authenticatedUser?.email || 'OAuth user');
  }
} catch (e) {
  console.warn('[Auth] Failed to load cached session:', e.message);
}

// 1. Send user to Google's consent screen
router.get('/google', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });
  res.redirect(authUrl);
});

// 2. Google redirects back here with authorization code
router.get('/google/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send('Authorization code missing');
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    let userEmail = '';
    try {
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      if (userInfo && userInfo.data && userInfo.data.email) {
        userEmail = userInfo.data.email;
        authenticatedUser = {
          email: userInfo.data.email,
          name: userInfo.data.name || ''
        };
      }
    } catch (e) {
      console.warn('Could not fetch user profile info:', e.message);
    }

    // Persist session to disk
    try {
      fs.writeFileSync(
        SESSION_FILE,
        JSON.stringify({ tokens, user: authenticatedUser }, null, 2),
        'utf-8'
      );
    } catch (e) {
      console.warn('[Auth] Could not write session to disk:', e.message);
    }

    const emailQuery = userEmail ? `&email=${encodeURIComponent(userEmail)}` : '';
    // Redirect user to the frontend dashboard
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?auth=success${emailQuery}`);
  } catch (error) {
    console.error('Error exchanging OAuth code:', error);
    res.status(500).send('OAuth Authentication Failed');
  }
});

// 3. Status check endpoint
router.get('/status', (req, res) => {
  const isAuthenticated = Boolean(
    oauth2Client.credentials &&
    (oauth2Client.credentials.access_token || oauth2Client.credentials.refresh_token)
  );
  res.json({
    success: true,
    authenticated: isAuthenticated,
    user: isAuthenticated ? authenticatedUser : null,
    email: isAuthenticated && authenticatedUser ? authenticatedUser.email : null,
    message: isAuthenticated ? 'Authenticated with Google' : 'Not authenticated'
  });
});

// 4. Logout endpoint
router.get('/logout', (req, res) => {
  oauth2Client.setCredentials({});
  authenticatedUser = null;
  try {
    if (fs.existsSync(SESSION_FILE)) {
      fs.unlinkSync(SESSION_FILE);
    }
  } catch (e) {
    console.warn('[Auth] Failed to delete session file:', e.message);
  }
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

module.exports = router;
