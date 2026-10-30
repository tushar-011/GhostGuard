# 👻 GhostGuard: Digital Ghost Town & Orphaned Asset Auditor

> **Hackathon Prototype Backend Service**  
> Connects to a user's Gmail inbox via Google OAuth 2.0 (read-only), scans for account creation, welcome, and registration emails, extracts third-party services registered over time, evaluates risk, manages account status lifecycle, and formats mind-map graph representations for D3.js and React Flow.

---

## 🚀 Key Features

- **Google OAuth 2.0 Integration**: Uses `googleapis` with read-only scopes (`gmail.readonly`, `userinfo.email`), requesting offline access with refresh token handling.
- **Targeted Inbox Discovery**: Queries Gmail using targeted search syntax to discover account creation and confirmation emails.
- **Smart Asset Parser**: Normalizes domains, strips subdomains, filters Google alerts, and assigns service categories.
- **Risk Assessment Engine (`riskEngine.js`)**:
  - Calculates account age in days and months.
  - Flags accounts older than 12 months as **`Dormant / Ghost Candidate`**.
  - Determines **High**, **Medium**, or **Low** risk based on category and age.
  - Computes a granular **`ghostScore` (0–100)**.
  - Provides category-tailored **`remediationTip`** instructions.
- **State Store (`storeService.js`)**:
  - Lightweight file-based local storage (`data/audit_store.json`).
  - Account lifecycle statuses: `UNREVIEWED`, `KEPT`, `SECURED`, `MARKED_FOR_DELETION`, `REVOKED`.
  - Preserves user decisions across re-scans.
- **Mind-Map Graph Formatter (`graphService.js`)**:
  - Generates hierarchical Node-Edge JSON representations compatible with D3.js and React Flow.
  - Root node &rarr; Category nodes &rarr; Leaf service nodes.
- **Aggregated Analytics**: Quick summary metrics of total discovered, dormant, high risk, and reviewed accounts.

---

## 🔌 API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | API status check |
| `GET` | `/auth/google` | Initiates Google OAuth 2.0 consent flow |
| `GET` | `/auth/google/callback` | OAuth redirect callback handling token exchange |
| `GET` | `/api/audit/scan` | Runs discovery scan, assesses risk, persists to store, and returns assets (supports `?mock=true`) |
| `GET` | `/api/audit/graph` | Returns mind-map node and edge graph JSON for D3.js/React Flow |
| `POST` | `/api/audit/action` | Updates account action status (`KEPT`, `SECURED`, `MARKED_FOR_DELETION`, `REVOKED`) |
| `GET` | `/api/audit/stats` | Returns aggregated metrics (`totalDiscovered`, `dormantCount`, `highRiskCount`, `reviewedCount`) |

---

### POST `/api/audit/action` Body
```json
{
  "domain": "notion.so",
  "action": "SECURED",
  "notes": "Enabled 2FA and verified active team seats"
}
```

---

## 🏃 Running the Application

```bash
# Install dependencies
npm install

# Run automated tests
npm test

# Run development server (with nodemon)
npm run dev

# Run production server
npm start
```
