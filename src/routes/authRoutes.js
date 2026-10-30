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
  const uid = req.query.uid || (req.user && !req.user.isLocal ? req.user.uid : '');
  const statePayload = uid ? JSON.stringify({ uid }) : '';

  const authOptions = {
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  };

  if (statePayload) {
    authOptions.state = statePayload;
  }

  const authUrl = oauth2Client.generateAuthUrl(authOptions);
  res.redirect(authUrl);
});

// 2. Google redirects back here with authorization code
router.get('/google/callback', async (req, res) => {
  const { code, state } = req.query;

  if (!code) {
    return res.status(400).send('Authorization code missing');
  }

  let stateUid = '';
  if (state) {
    try {
      const parsed = JSON.parse(state);
      if (parsed && parsed.uid) stateUid = parsed.uid;
    } catch {
      stateUid = state;
    }
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    let userEmail = '';
    let userName = '';
    try {
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      if (userInfo && userInfo.data && userInfo.data.email) {
        userEmail = userInfo.data.email;
        userName = userInfo.data.name || '';
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

    // Link Gmail OAuth tokens to users/{uid}/connectedAccounts/gmail in Firestore
    const targetUid = stateUid || (req.user && !req.user.isLocal ? req.user.uid : null);
    if (targetUid) {
      try {
        await firestoreService.saveUserConnectedAccount(targetUid, 'gmail', {
          tokens,
          connectedEmail: userEmail,
          connectedName: userName,
          provider: 'google-gmail'
        });
        console.log(`[Auth] Linked Gmail OAuth tokens in Firestore for UID: ${targetUid}`);
      } catch (fsErr) {
        console.warn('[Auth] Failed linking connected account in Firestore:', fsErr.message);
      }
    }

    const emailQuery = userEmail ? `&email=${encodeURIComponent(userEmail)}` : '';
    const uidQuery = targetUid ? `&uid=${encodeURIComponent(targetUid)}` : '';
    // Redirect user to the frontend dashboard with confirmation params
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?auth=success&gmail=connected${emailQuery}${uidQuery}`);
  } catch (error) {
    console.error('Error exchanging OAuth code:', error);
    res.status(500).send('OAuth Authentication Failed');
  }
});

// 3. Status check endpoint
router.get('/status', async (req, res) => {
  const isGoogleAuthenticated = Boolean(
    oauth2Client.credentials &&
    (oauth2Client.credentials.access_token || oauth2Client.credentials.refresh_token)
  );
  const isFirebaseAuthenticated = Boolean(req.user && req.user.firebase);

  let hasCloudGmail = false;
  if (req.user && req.user.uid && !req.user.isLocal) {
    try {
      hasCloudGmail = await firestoreService.hasUserConnectedGmail(req.user.uid);
    } catch {}
  }

  const hasGmail = isGoogleAuthenticated || hasCloudGmail;
  const isAuthenticated = isGoogleAuthenticated || isFirebaseAuthenticated;

  const effectiveUser = req.user || (isGoogleAuthenticated ? authenticatedUser : null);
  const effectiveEmail = req.user?.email || (isGoogleAuthenticated && authenticatedUser ? authenticatedUser.email : null);

  res.json({
    success: true,
    authenticated: isAuthenticated,
    firebase: isFirebaseAuthenticated,
    hasGmail,
    connectedGmail: hasGmail,
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
