# 👻 GhostGuard Chrome Extension (Manifest V3)

> Browser companion for the **GhostGuard Digital Ghost Town & Orphaned Asset Auditor**. Inspect your digital footprint, monitor dormant accounts, review security risk levels, and trigger audits directly from your browser toolbar.

---

## 📦 Features

- **Live Backend Sync**: Connects to the local GhostGuard backend (`http://localhost:5000`).
- **One-Click Inbox Scan**: Queries the Gmail API for registration, activation, and onboarding emails.
- **Risk Metrics Bar**: Displays Total Assets, Ghost/Dormant Candidates, and High-Risk Exposure counts.
- **Actionable Findings Feed**: Quick action buttons (`Secure` and `Revoke`) that persist decisions to the backend state store in real-time.
- **One-Click Dashboard Access**: Instantly jumps to the full interactive Mind Map visualization on `http://localhost:3000/dashboard`.
- **Zero External Dependencies**: Bundled locally with no external CDN requirements.

---

## 🛠️ Installation Instructions

Follow these simple steps to install the unpacked extension in Google Chrome (or Chromium-based browsers like Edge, Brave, or Arc):

### Step 1: Open Chrome Extensions
In your Chrome address bar, navigate to:
```text
chrome://extensions/
```

### Step 2: Enable Developer Mode
In the top-right corner of the Extensions page, toggle the **"Developer mode"** switch to **ON**.

```text
+-------------------------------------------------------------+
| Extensions                                [x] Developer mode|
+-------------------------------------------------------------+
```

### Step 3: Load Unpacked Extension
1. Click the **"Load unpacked"** button that appears in the top-left toolbar.
2. In the file picker, select the `extension/` directory from this project:
   ```text
   c:\Users\artif\Documents\Projects\GhostGuard\extension
   ```
3. Click **Select Folder**.

### Step 4: Pin and Launch
1. Click the puzzle icon (Extensions menu) in the top-right toolbar of Google Chrome.
2. Click the pin icon next to **GhostGuard - Orphaned Asset Auditor**.
3. Click the GhostGuard ghost icon to open the audit popup window!

---

## ⚙️ Backend Requirements

Before using the extension, ensure your local GhostGuard server is running:

```bash
# In the project root:
npm run dev
# or
npm start
```

- Backend API: `http://localhost:5000`
- Web Dashboard: `http://localhost:3000/dashboard`

If you are not yet authenticated with Google, the extension popup will display an **"Authenticate with Google"** button to initiate the read-only OAuth flow with one click.

