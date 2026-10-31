<div align="center">

# 🛡️ GhostGuard

### Autonomous Orphaned Identity, Breach Intelligence & Digital Footprint Auditor

[![Next.js](https://img.shields.io/badge/Next.js-14+-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%26%20Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Express](https://img.shields.io/badge/Express.js-Backend%20API-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald?style=for-the-badge)](LICENSE)

*Discover, track, score, and remediate forgotten registrations, exposed credentials, and dormant attack surfaces across your digital perimeter.*

[Features](#-key-features) • [Architecture](#-architecture) • [Getting Started](#-getting-started) • [Database Schema](#-firestore-schema) • [Remediation & Protocols](#-remediation-engine--safety-protocols)

</div>

---

## 💡 The Problem

Over years of online activity, internet users accumulate hundreds of SaaS accounts, developer sandboxes, newsletters, and consumer services. Eventually, these become **orphaned accounts**:
- **Forgotten Attack Surfaces:** Users lose visibility into which third parties retain their personal records, OAuth permissions, and profile data.
- **Credential Cascades:** Dormant accounts frequently host older, reused passwords that remain susceptible to credential stuffing attacks.
- **Silent Exposure:** When a legacy platform suffers a security breach, users often discover their compromised records years later—if at all.

**GhostGuard solves this** by evaluating account confirmation headers and authentication artifacts directly through Gmail, constructing an interactive digital footprint map, computing dynamic **Ghost Risk Scores**, cross-referencing breach disclosures, and enabling granular or emergency perimeter remediation.

---

## ✨ Key Features

- 🔍 **Zero-Knowledge Inbox Discovery:** Audits Gmail message headers and registration receipts without inspecting, ingesting, or storing personal email contents.
- 📊 **Multi-Factor Ghost Scoring:** Dynamically evaluates risk ($0-100$) by weighting service sensitivity, account dormancy periods, and authentication structures.
- 📅 **Digital Footprint Timeline:** An interactive chronological visualization mapping account creation dates, scan discoveries, dormancy milestones, and security reviews.
- 🚨 **BreachWatch™ Exposure Monitor:** Correlates cataloged services against verified historical data breach databases to surface compromised data classes (passwords, PII) and guide remediation.
- 🤖 **GhostAI Security Advisor:** An intelligent copilot grounded in live footprint context to answer queries and prioritize risk while keeping all destructive actions strictly user-controlled.
- ⚠️ **Emergency Dead Man's Switch:** A password-protected kill-switch protocol inside the security vault that stages all registered entities for bulk decommissioning (`MARKED_FOR_DELETION`) with 1-click disarm capability.
- ⚡ **Granular Remediation Workflows:**
  - **Keep:** Explicitly approve and verify trusted assets.
  - **Secure:** Direct routing to targeted credential and password change endpoints.
  - **Revoke:** Direct launchpad to Google Account Third-Party Security panels.
  - **Remove Record:** Purge footprint entries and instantly recalibrate telemetry counters.
- 🔐 **Dual Authentication & Multi-Tenant Isolation:** Firebase Email/Password and Google OAuth integrations backed by persistent, user-scoped Cloud Firestore rules.
- 🧩 **Real-Time Chrome Extension (Manifest V3):** Features active-tab domain detection, live in-browser security badges, immediate risk flags, and quick-action remediation controls.

---

## 🏛️ Architecture

```text
┌────────────────────────────────────────────────────────┐
│             Next.js 14 Frontend Client                 │
│  (Dark Forest UI, Footprint Timeline, BreachWatch,     │
│   GhostAI Copilot, Emergency Dead Man's Switch Vault)  │
└──────────────────────────┬─────────────────────────────┘
                           │
             Bearer Firebase ID Token (JWT)
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│               Node.js / Express Backend                │
│  (Auth Middleware, Risk Engine, Breach Engine, LLM API)│
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

User state, threat catalogs, and audit logs are strictly scoped by Firebase `uid`:

```text
users/{uid}
 ├── profile
 │    └── email, displayName, deadManArmed, createdAt, settings
 ├── connectedAccounts/gmail
 │    └── provider, email, connectionStatus, connectedAt
 ├── scans/{scanId}
 │    └── timestamp, totalDiscovered, highRiskCount, rawCount
 ├── threats/{domain}
 │    └── serviceName, domain, category, ghostScore, riskLevel, status, previousStatus, detectedDate
 └── auditLogs/{logId}
      └── action (REMEDIATION_KEPT, DEAD_MAN_SWITCH_TRIGGERED, etc.), targetId, timestamp
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18.0.0 or higher
- **npm** v9.0.0 or higher
- A **Google Cloud Console** project with the Gmail API enabled and OAuth 2.0 Client IDs generated.
- A **Firebase** project with Authentication (Email/Password & Google) and Cloud Firestore initialized.

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/tushar-011/GhostGuard.git
cd GhostGuard

# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Backend Configuration
Create a `.env` file in the project root:
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

# Optional: AI Security Advisor (Gemini API)
GEMINI_API_KEY=your_gemini_api_key
```

Place your downloaded Firebase private key in the project root as `serviceAccountKey.json` (protected by `.gitignore`).

Start the backend:
```bash
npm run dev
```

### 3. Frontend Configuration
Create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000

# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=ghostguard-4db57.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=ghostguard-4db57
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=ghostguard-4db57.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

Start the frontend:
```bash
cd frontend
npm run dev
```

Navigate to `http://localhost:3000` in your browser.

### 4. Chrome Extension Setup
1. Open Google Chrome and visit `chrome://extensions/`.
2. Toggle on **Developer mode** in the top-right corner.
3. Click **Load unpacked** and select the `extension/` folder in the project root.
4. The GhostGuard shield icon will appear in the toolbar, monitoring active tabs and connecting with the backend API.

---

## 🛡️ Remediation Engine & Safety Protocols

### Lifecycle States

| Status | UI Badge | Description | Trigger |
| :--- | :--- | :--- | :--- |
| `UNREVIEWED` | Needs Attention | Discovered service pending user evaluation. | Initial inbox audit |
| `KEPT` | Retained | Verified service acknowledged and retained. | Manual approval |
| `SECURED` | Secured | Credentials rotated, 2FA enabled, or settings reviewed. | Password reset action |
| `REVOKED` | Revoked | Third-party access severed via Google Account permissions. | OAuth revocation flow |
| `MARKED_FOR_DELETION` | Queued Deletion | Staged for decommissioning individually or via Dead Man's Switch. | Manual tag or Emergency protocol |
| `DELETED` | Removed | Purged from threat directory and audit telemetry. | Complete record removal |

### Emergency Protocol: Dead Man's Switch
Located inside **Settings > Security & Danger Zone**:
- **Re-Authentication Barrier:** Requires verifying password credentials (or re-authenticating with Google) and entering confirmation text (`"PURGE"`) before execution.
- **Coordinated Staging:** Transitions every discovered asset in Firestore to `MARKED_FOR_DELETION` without destructive, irreversible remote calls during staging.
- **Active Warning & Disarm Protocol:** Displays an emergency warning ribbon across the dashboard, enabling users to disarm the switch and restore previous account states instantly.

---

## 🔒 Security & Privacy Guarantees

- **Zero Email Storage:** Email contents are processed ephemerally in-memory solely to isolate service domain receipts, then immediately dropped.
- **Deterministic Action Bounds:** GhostAI functions strictly as an advisory copilot; destructive mutations, deletions, and revocations remain locked behind user confirmation.
- **Leakage Prevention:** Service accounts, tokens, and active authentication session stores are barred from version control via `.gitignore`.
- **Tenant Scoping:** All Firestore reads, updates, and batch deletions enforce identity validation mapped to the requester's Firebase ID token (`uid`).
