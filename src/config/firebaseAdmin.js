require('dotenv').config();
const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

// Compatibility polyfills for firebase-admin v14 modular patterns
if (!admin.credential) {
  admin.credential = { cert: admin.cert };
}
if (!admin.apps) {
  Object.defineProperty(admin, 'apps', {
    get: () => admin.getApps(),
    configurable: true,
  });
}
if (!admin.auth) {
  admin.auth = (app) => getAuth(app);
}
if (!admin.firestore) {
  admin.firestore = (app) => getFirestore(app);
}

let initialized = false;
let db = null;
let auth = null;

try {
  const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
    ? path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
    : path.resolve(process.cwd(), 'serviceAccountKey.json');

  if (fs.existsSync(keyPath)) {
    const serviceAccount = require(keyPath);
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id,
      });
    }
    initialized = true;
    db = getFirestore();
    auth = getAuth();
    console.log('[FirebaseAdmin] Successfully initialized with service account key.');
  } else if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID || 'ghostguard-4db57',
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
    }
    initialized = true;
    db = getFirestore();
    auth = getAuth();
    console.log('[FirebaseAdmin] Successfully initialized via environment variables.');
  } else {
    console.warn(
      '[FirebaseAdmin] Credentials not detected. Running in local fallback mode (data/audit_store.json).'
    );
  }
} catch (error) {
  console.warn(
    `[FirebaseAdmin] Initialization warning: ${error.message}. Running in local fallback mode.`
  );
  initialized = false;
  db = null;
  auth = null;
}

module.exports = {
  admin,
  db,
  auth,
  isInitialized: () => initialized,
  isFirebaseConfigured: initialized,
  get isConfigured() {
    return initialized;
  },
};
