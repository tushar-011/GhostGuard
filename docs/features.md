# GhostGuard Features

## Feature status

The requested frontend surfaces are implemented with local demonstration state. Backend, Firebase, authentication, Gmail, and provider operations remain future work.

## Landing page

The landing page introduces GhostGuard as a privacy-first digital identity management product. It communicates product value, explains the difference between discovery and account control, sets accurate expectations, and provides paths to authentication or continued exploration.

It must use the global GhostGuard visual language: premium cybersecurity SaaS, glassmorphism used deliberately, subtle gradients, elegant cards, and clean responsive surfaces.

## Authentication

The login and signup screens provide frontend-only validation, password visibility controls, terms acceptance, and demo success feedback. The demo journey is Register → Login → Dashboard: registration stores a browser-local demo record and redirects to Login; Login validates that record and creates a browser-local demo session; dashboard routes redirect logged-out visitors to Login; and Logout clears the demo session. No real account, password, Firebase Authentication session, or backend identity is created. The authentication provider and production flow remain **PENDING**.

## User dashboard

The dashboard frontend provides an overview of demonstration records and identity state. It includes:

- Account/service summary.
- Search, filtering, and status controls.
- Entry points for manual additions and future discovery.
- Clear action affordances and confirmation states.
- Privacy and connection settings.
- A route to the digital identity mind map.
- A separate India-focused digital globe visualization on the overview page.

The final information architecture and dashboard metrics are **PENDING**.

## Digital identity mind map

The identity-map route visualizes demonstration data as connected nodes and relationships using `@xyflow/react`. It supports zoom/pan, fit view, node selection, a details panel, responsive layout, and category/status styling. The production graph model and accessibility alternative are **PENDING**.

The Identity Map remains independent from the dashboard globe and continues to use `@xyflow/react`.

The reusable IndiaGlobe visualization appears on the dashboard overview, Login, and Register pages. It is a Three.js textured Earth with realistic ocean/land imagery, lighting, atmospheric glow, pointer rotation, and violet/cyan network points positioned over the India region. It remains a frontend demonstration and does not claim live security activity or authoritative account geography. If WebGL is unavailable, the component displays an explicit fallback message.

The dashboard overview also provides Quick Actions for opening the account form, running a clearly labelled demo scan result, opening the Identity Map, and opening the demo Security report. Dashboard global search matches demo account names, email addresses, and categories.

## Gmail account discovery

Gmail discovery is a future, explicit OAuth flow. It may identify candidate services from authorized Gmail data, but it will be partial and heuristic. GhostGuard must never claim it finds every account.

The experience must:

- Explain permissions before consent.
- Request minimum necessary scopes.
- Let the user review candidates before saving them.
- Identify uncertainty and possible duplicates.
- Provide a way to disconnect/revoke the provider connection.
- Explain what remains stored after revocation.

OAuth scopes, provider APIs, extraction signals, token lifecycle, retention, and exact UX are **PENDING**. This feature is outside the current implementation phase.

## Manual account addition

The account-management frontend supports search, category filtering, local account addition, detail views, action feedback, and local record deletion. Production fields, validation, persistence, and duplicate behavior are **PENDING**.

## Account actions

The product will distinguish these actions:

- **KEEP:** retain the local record as part of the user's inventory.
- **SECURE:** guide the user through security improvements; provider operations are not assumed.
- **REVOKE:** revoke an external OAuth connection or permission where supported. This does not delete the external account.
- **DELETE:** delete the local GhostGuard record. This does not delete the external account.
- **PRESERVE:** retain an item or evidence according to a future preservation policy.

Each potentially destructive or irreversible action must explain its scope, require appropriate confirmation, and report success or failure honestly. External account deletion is outside the initial scope.

## Privacy and security requirements

- Use explicit consent for provider connections.
- Follow least-privilege OAuth scopes.
- Never claim complete account discovery.
- Keep local record operations distinct from external provider operations.
- Do not implement external account deletion in the initial scope.
- Validate ownership and authorization for every authenticated operation.
- Minimize collection of Gmail-derived content and avoid storing unnecessary message contents.
- Protect provider tokens and sensitive data from client exposure.
- Provide clear disconnect, revocation, deletion, and retention explanations.
- Use accessible contrast, labels, focus states, keyboard operation, and readable text.
- Include confirmation and error states that do not silently fail.
- Define retention and deletion behavior before storing sensitive data.

## Global design requirements

### Dark theme

Midnight Navy `#080B18` background, Electric Violet `#8B5CF6` primary accent, Ice Cyan `#22D3EE` secondary accent, white/light readable text, and a premium cybersecurity SaaS glassmorphism visual language.

### Light theme

Clean white background, soft lavender and light-blue surfaces, dark readable text, Electric Violet `#8B5CF6` primary accent, and Ice Cyan `#22D3EE` secondary accent.

### Typography

Use Marella for the homepage hero heading, Recoleta for section and product headings, and Open Sans for body and interface text. Headings should be large, elegant, and prominent; hero headings need strong hierarchy; body text must remain comfortably readable; spacing, line height, and responsive sizing must be consistent across desktop, tablet, and mobile. The exact Marella and Recoleta files remain pending because no supplied licensed files are currently present.

### Theme controls

The main navbar and dashboard header include a functional Dark/Light toggle with Lucide Sun and Moon icons. A centralized theme provider persists the choice in `localStorage`, restores it after reload, bootstraps the initial theme, transitions smoothly, and themes pages and components with accessible contrast. Persistence is local frontend state only.
