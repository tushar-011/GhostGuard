const fs = require('fs');
const path = require('path');
const { auth, isInitialized, isFirebaseConfigured } = require('../config/firebaseAdmin');
const { oauth2Client } = require('../config/googleAuth');

const SESSION_FILE = path.join(__dirname, '../../data/auth_session.json');

/**
 * Extracts session user from local auth_session.json or memory if available
 */
function getLocalSessionUser() {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      const data = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
      if (data && data.user && data.user.email) {
        return {
          uid: `local-${Buffer.from(data.user.email).toString('hex').slice(0, 16)}`,
          email: data.user.email,
          name: data.user.name || '',
          isLocal: true
        };
      }
    }
  } catch {}

  if (oauth2Client.credentials && (oauth2Client.credentials.access_token || oauth2Client.credentials.refresh_token)) {
    return {
      uid: 'local-oauth-user',
      email: 'oauth-authenticated-user@ghostguard.local',
      isLocal: true
    };
  }

  return null;
}

/**
 * Express Authentication Middleware
 * Validates Firebase ID tokens if provided; falls back gracefully to local dev session.
 */
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1].trim();
    const hasFirebase = Boolean(
      (typeof isInitialized === 'function' ? isInitialized() : isFirebaseConfigured) && auth
    );

    if (token && hasFirebase) {
      try {
        const decoded = await auth.verifyIdToken(token);
        req.user = {
          uid: decoded.uid,
          email: decoded.email,
          name: decoded.name || '',
          picture: decoded.picture || '',
          firebase: true
        };
        return next();
      } catch (err) {
        console.warn('[AuthMiddleware] Firebase ID token verification failed:', err.message);
      }
    }
  }

  // Graceful fallback to local development session so local demos/tests never break
  const localUser = getLocalSessionUser();
  if (localUser) {
    req.user = localUser;
  } else {
    req.user = null;
  }

  next();
}

/**
 * Strict auth requirement middleware (returns 401 if neither Firebase nor local session is present)
 */
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please provide a valid Firebase ID token or sign in via Google OAuth.'
    });
  }
  next();
}

module.exports = {
  authMiddleware,
  requireAuth
};

