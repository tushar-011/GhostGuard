const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { oauth2Client, SCOPES } = require('../config/googleAuth');
const firestoreService = require('../services/firestoreService');
const { isFirebaseConfigured, isInitialized } = require('../config/firebaseAdmin');

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
  const isGoogleAuthenticated = Boolean(
    oauth2Client.credentials &&
    (oauth2Client.credentials.access_token || oauth2Client.credentials.refresh_token)
  );
  const isFirebaseAuthenticated = Boolean(req.user && req.user.firebase);
  const isAuthenticated = isGoogleAuthenticated || isFirebaseAuthenticated;

  const effectiveUser = req.user || (isGoogleAuthenticated ? authenticatedUser : null);
  const effectiveEmail = req.user?.email || (isGoogleAuthenticated && authenticatedUser ? authenticatedUser.email : null);

  res.json({
    success: true,
    authenticated: isAuthenticated,
    firebase: isFirebaseAuthenticated,
    user: effectiveUser,
    email: effectiveEmail,
    message: isAuthenticated
      ? (isFirebaseAuthenticated ? 'Authenticated with Firebase' : 'Authenticated with Google')
      : 'Not authenticated'
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

// 5. User Profile endpoint
router.post('/profile', async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required to update user profile.'
      });
    }

    const { email, displayName, name, settings } = req.body;
    const profilePayload = {
      email: email || req.user.email || '',
      displayName: displayName || name || req.user.name || '',
      settings: settings || {}
    };

    const hasFirebase = typeof isInitialized === 'function' ? isInitialized() : Boolean(isFirebaseConfigured);
    if (hasFirebase && !req.user.isLocal) {
      const updated = await firestoreService.upsertUserProfile(req.user.uid, profilePayload);
      return res.json({
        success: true,
        source: 'firestore',
        profile: updated
      });
    }

    // Local session update
    if (authenticatedUser) {
      authenticatedUser.name = profilePayload.displayName || authenticatedUser.name;
    }
    return res.json({
      success: true,
      source: 'local',
      profile: profilePayload
    });
  } catch (error) {
    console.error('Failed to update user profile:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
