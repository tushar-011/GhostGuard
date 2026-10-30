<div align="center">

# 🛡️ GhostGuard

### Autonomous Orphaned Identity & Digital Footprint Auditor

[![Next.js](https://img.shields.io/badge/Next.js-14+-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%26%20Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Express](https://img.shields.io/badge/Express.js-Backend%20API-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald?style=for-the-badge)](LICENSE)

*Discover, analyze, score, and remediate forgotten registrations, dormant accounts, and unmonitored attack surfaces across your digital life.*

[Features](#-key-features) • [Architecture](#-architecture) • [Getting Started](#-getting-started) • [Database Schema](#-firestore-schema) • [Remediation Workflow](#-remediation-engine)

</div>

---

## 💡 The Problem

Every year, an average Internet user signs up for dozens of digital platforms, newsletters, dev tools, and web apps. Over time, these become **orphaned accounts**:
- **Forgotten & Unmonitored:** Users lose track of which services store their personal data.
- **Reused Passwords:** Forgotten logins frequently use older passwords that are vulnerable to credential stuffing.
- **Silent Data Breaches:** When a dormant third-party service suffers a security incident, users remain unaware while their exposed credentials circulate on the dark web.

**GhostGuard solves this** by non-intrusively auditing registration receipts, OAuth links, and confirmation artifacts directly from your Gmail inbox, constructing an interactive digital footprint map, calculating an automated **Ghost Risk Score**, and offering actionable remediation workflows.

---

## ✨ Key Features

- 🔍 **Zero-Knowledge Inbox Discovery:** Scans Gmail headers and registration confirmations to catalog registered services without reading or saving personal email contents.
- 📊 **Multi-Factor Ghost Scoring:** Calculates risk per service ($0-100$) by factoring in account dormancy, domain sensitivity (financial, developer, productivity, general), and credential hygiene.
- 🌐 **Interactive Footprint Directory:** Categorized service breakdown with dynamic filtering (Financial, Developer, Productivity, Social, General) and risk pills.
- ⚡ **Real-Time Remediation Hub:**
  - **Keep:** Explicitly approve trusted accounts and mark them as reviewed.
  - **Secure:** Direct routing to service password and security panels to reset credentials.
  - **Revoke:** One-click launchpad to Google Account Security permissions for OAuth token revocation.
  - **Remove Record:** Purge cataloged entries and update live telemetry in real time.
- 🔐 **Dual Auth & Multi-User Isolation:** Firebase Email/Password and Google OAuth with seamless Firestore persistence. Actions survive across sessions and devices.
- 🧩 **Synchronized Chrome Extension (Manifest V3):** Real-time workspace telemetry monitor featuring health checks, total asset counts, and immediate threat counts styled in GhostGuard's moss-forest aesthetic.

---

## 🏛️ Architecture

```text
┌────────────────────────────────────────────────────────┐
│             Next.js 14 Frontend Client                 │
│  (Dark Forest UI, Tabbed Settings, Live Inventory Map) │
└──────────────────────────┬─────────────────────────────┘
                           │
             Bearer Firebase ID Token (JWT)
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│               Node.js / Express Backend                │
│   (Auth Middleware, Risk Engine, Gmail Parser SDK)     │
└───────────────┬────────────────────────┬───────────────┘
                │                        │
  Google OAuth2 Read Tokens              │ Firebase Admin SDK
                ▼                        ▼
┌────────────────────────┐  ┌─────────────────────────┐
│      Google APIs       │  │     Cloud Firestore     │
│    (Gmail Readonly)    │  │  (Multi-User Isolation) │
└────────────────────────┘  └─────────────────────────┘
```

---

## 🗄️ Firestore Schema

User data and remediation states are isolated by Firebase `uid`:

```text
users/{uid}
 ├── profile
 │    └── email, displayName, createdAt, settings
 ├── connectedAccounts/gmail
 │    └── provider, email, connectionStatus, connectedAt
 ├── scans/{scanId}
 │    └── timestamp, totalDiscovered, highRiskCount, rawCount
 ├── threats/{domain}
 │    └── serviceName, domain, category, ghostScore, riskLevel, status, lastDetected
 └── auditLogs/{logId}
      └── action (REMEDIATION_KEPT, REMEDIATION_SECURED, etc.), targetId, timestamp
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18.0.0 or higher
- **npm** v9.0.0 or higher
- A **Google Cloud Console** project with the Gmail API enabled and OAuth credentials configured.
- A **Firebase** project with Authentication (Email/Password & Google) and Cloud Firestore enabled.

### 1. Clone the Repository
```bash
git clone https://github.com/tushar-011/GhostGuard.git
cd GhostGuard
```

### 2. Backend Setup
Install dependencies:
```bash
npm install
```

Configure environment variables in `.env`:
```env
PORT=5000
FRONTEND_URL=http://localhost:3000

# Google OAuth Credentials (for Gmail Audit)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/auth/google/callback

# Firebase Admin SDK
FIREBASE_PROJECT_ID=ghostguard-4db57
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
```

Place your Firebase Admin private key at the root of the project as `serviceAccountKey.json` (already excluded via `.gitignore`).

Start the backend:
```bash
npm run dev
```

### 3. Frontend Setup
Navigate to the frontend directory:
```bash
cd frontend
npm install
```

Configure environment variables in `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000

# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=ghostguard-4db57.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=ghostguard-4db57
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=ghostguard-4db57.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=808611102393
NEXT_PUBLIC_FIREBASE_APP_ID=1:808611102393:web:...
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-...
```

Start the Next.js development server:
```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

### 4. Chrome Extension Setup
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** using the toggle switch in the top right.
3. Click **Load unpacked** in the top left.
4. Select the `extension/` folder located inside the GhostGuard project.
5. The GhostGuard icon will appear in your Chrome toolbar, synchronizing live telemetry with `http://localhost:5000`.

---

## 🛡️ Remediation Engine

When GhostGuard audits an account, it assigns one of the following remediation states, stored directly in Cloud Firestore:

| Status | Label | Description | Action Triggered |
| :--- | :--- | :--- | :--- |
| `UNREVIEWED` | Needs Attention | Discovered asset pending user review. | Initial audit scan |
| `KEPT` | Retained | Verified active service trusted by the user. | `POST /api/audit/action` -> `KEPT` |
| `SECURED` | Secured | Credentials updated, 2FA enabled, or password changed. | `POST /api/audit/action` -> `SECURED` |
| `REVOKED` | Revoked | Third-party access revoked via Google OAuth settings. | `POST /api/audit/action` -> `REVOKED` |
| `DELETED` | Removed | Purged from threat directory and audit footprint. | `DELETE /api/audit/asset/:domain` |

---

## 🔒 Security & Privacy Guarantees

- **No Plaintext Passwords:** GhostGuard never collects, stores, transmits, or inspects passwords.
- **Zero Raw Email Storage:** Gmail messages are evaluated ephemerally in-memory to detect authentication domains and discarded immediately.
- **Secret Scanning Safeguards:** All service account keys, session tokens, and local cache databases are permanently ignored via `.gitignore` to prevent secret exposure.
- **Multi-Tenant Isolation:** All database reads and writes are strictly scoped to the authenticated caller's Firebase `uid`.

```text
┌────────────────────────────────────────────────────────┐
│             Next.js 14 Frontend Client                 │
│  (Dark Forest UI, Tabbed Settings, Live Inventory Map) │
└──────────────────────────┬─────────────────────────────┘
                           │
             Bearer Firebase ID Token (JWT)
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│               Node.js / Express Backend                │
│   (Auth Middleware, Risk Engine, Gmail Parser SDK)     │
└───────────────┬────────────────────────┬───────────────┘
                │                        │
  Google OAuth2 Read Tokens              │ Firebase Admin SDK
                ▼                        ▼
┌────────────────────────┐  ┌─────────────────────────┐
│      Google APIs       │  │     Cloud Firestore     │
│    (Gmail Readonly)    │  │  (Multi-User Isolation) │
└────────────────────────┘  └─────────────────────────┘
```

---

## 🗄️ Firestore Schema

User data and remediation states are isolated by Firebase `uid`:

```text
users/{uid}
 ├── profile
 │    └── email, displayName, createdAt, settings
 ├── connectedAccounts/gmail
 │    └── provider, email, connectionStatus, connectedAt
 ├── scans/{scanId}
 │    └── timestamp, totalDiscovered, highRiskCount, rawCount
 ├── threats/{domain}
 │    └── serviceName, domain, category, ghostScore, riskLevel, status, lastDetected
 └── auditLogs/{logId}
      └── action (REMEDIATION_KEPT, REMEDIATION_SECURED, etc.), targetId, timestamp
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18.0.0 or higher
- **npm** v9.0.0 or higher
- A **Google Cloud Console** project with the Gmail API enabled and OAuth credentials configured.
- A **Firebase** project with Authentication (Email/Password & Google) and Cloud Firestore enabled.

### 1. Clone the Repository
```bash
git clone https://github.com/tushar-011/GhostGuard.git
cd GhostGuard
```

### 2. Backend Setup
Install dependencies:
```bash
npm install
```

Configure environment variables in `.env`:
```env
PORT=5000
FRONTEND_URL=http://localhost:3000

# Google OAuth Credentials (for Gmail Audit)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/auth/google/callback

# Firebase Admin SDK
FIREBASE_PROJECT_ID=ghostguard-4db57
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
```

Place your Firebase Admin private key at the root of the project as `serviceAccountKey.json` (already excluded via `.gitignore`).

Start the backend:
```bash
npm run dev
```

### 3. Frontend Setup
Navigate to the frontend directory:
```bash
cd frontend
npm install
```

Configure environment variables in `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000

# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=ghostguard-4db57.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=ghostguard-4db57
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=ghostguard-4db57.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=808611102393
NEXT_PUBLIC_FIREBASE_APP_ID=1:808611102393:web:...
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-...
```

Start the Next.js development server:
```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

### 4. Chrome Extension Setup
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** using the toggle switch in the top right.
3. Click **Load unpacked** in the top left.
4. Select the `extension/` folder located inside the GhostGuard project.
5. The GhostGuard icon will appear in your Chrome toolbar, synchronizing live telemetry with `http://localhost:5000`.

---

## 🛡️ Remediation Engine

When GhostGuard audits an account, it assigns one of the following remediation states, stored directly in Cloud Firestore:

| Status | Label | Description | Action Triggered |
| :--- | :--- | :--- | :--- |
| `UNREVIEWED` | Needs Attention | Discovered asset pending user review. | Initial audit scan |
| `KEPT` | Retained | Verified active service trusted by the user. | `POST /api/audit/action` -> `KEPT` |
| `SECURED` | Secured | Credentials updated, 2FA enabled, or password changed. | `POST /api/audit/action` -> `SECURED` |
| `REVOKED` | Revoked | Third-party access revoked via Google OAuth settings. | `POST /api/audit/action` -> `REVOKED` |
| `DELETED` | Removed | Purged from threat directory and audit footprint. | `DELETE /api/audit/asset/:domain` |

---

## 🔒 Security & Privacy Guarantees

- **No Plaintext Passwords:** GhostGuard never collects, stores, transmits, or inspects passwords.
- **Zero Raw Email Storage:** Gmail messages are evaluated ephemerally in-memory to detect authentication domains and discarded immediately.
- **Secret Scanning Safeguards:** All service account keys, session tokens, and local cache databases are permanently ignored via `.gitignore` to prevent secret exposure.
- **Multi-Tenant Isolation:** All database reads and writes are strictly scoped to the authenticated caller's Firebase `uid`.
