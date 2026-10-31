# 🛡️ GhostGuard Chrome Extension (Manifest V3)

> **Real-Time Digital Perimeter Defender** browser extension for GhostGuard. Actively inspects your current tab perimeter, identifies dormant and high-risk ghost accounts, enables 1-click remediation, and tracks unreviewed exposure in real-time.

---

## 📦 Features

- **Active Tab Perimeter Defender**: Inspects active browser tabs in real time. Flags whether the current site hosts a registered identity from your audited footprint, displays its Ghost Score and risk tier, or confirms no record exists.
- **Dynamic Action Badge Counter**: Background Service Worker tracks unreviewed assets across tabs:
  - Pulses a red `!` alert badge when visiting high-risk or unreviewed ghost accounts.
  - Displays persistent unreviewed inventory counts in muted emerald.
- **In-Popup Micro-Action Toolbar**:
  - **Keep** (✓): Marks accounts verified and updates state store.
  - **Secure** (🛡️): Launches service security settings in a new tab and updates status.
  - **Revoke** (🔗): Opens Google Third-Party Connections to sever OAuth scopes.
  - Features smooth resolving animations and immediate badge/counter decrements.
- **1-Click Footprint Export & Security Report**: Generates and downloads lightweight JSON audit summaries directly from the browser popup.
- **Live Sync**: Refreshes telemetry without needing to open the web dashboard.
- **Offline Resilience**: Gracefully displays cached audit data and offline alerts when `localhost:5000` is restarting.
- **Moss-Forest Aesthetic**: Built with dark-olive canvas (`#19251c`), moss containers (`#233327`), sage accents (`#b8d8b2`), and custom scrollbars.

---

## 🛠️ Installation Instructions

Follow these simple steps to install the unpacked extension in Google Chrome (or Chromium browsers like Brave, Edge, Arc):

### Step 1: Open Chrome Extensions
In your Chrome address bar, navigate to:
```text
chrome://extensions/
```

### Step 2: Enable Developer Mode
In the top-right corner of the Extensions page, toggle the **"Developer mode"** switch to **ON**.

### Step 3: Load Unpacked Extension
1. Click the **"Load unpacked"** button in the top-left toolbar.
2. Select the `extension/` directory from this repository:
   ```text
   c:\Users\artif\Documents\Projects\GhostGuard\extension
   ```
3. Click **Select Folder**.

### Step 4: Pin and Launch
1. Click the Extensions puzzle icon in the top-right toolbar.
2. Click the pin icon next to **GhostGuard - Real-Time Digital Perimeter Defender**.
3. Browse any website (e.g. `github.com` or `airbnb.com`) to observe real-time perimeter protection and risk indicators!

---

## ⚙️ Backend Requirements

Ensure your local GhostGuard server is running:

```bash
# In the project root:
npm run dev
# or
npm start
```

- Backend API: `http://localhost:5000`
- Web Dashboard: `http://localhost:3000/dashboard`
