# GhostGuard Architecture

## System architecture overview

GhostGuard is planned as a frontend-first Next.js application with Firebase-backed persistence and future provider integrations.

```text
Browser
  |
  v
Next.js App Router frontend
  |-- Landing page and public content
  |-- Authentication UI
  |-- Authenticated dashboard
  |-- Digital identity mind map (@xyflow/react)
  |-- Theme, motion, and accessible interaction layers
  |
  +--> Planned application/backend boundary
          |-- Session and authorization checks
          |-- GhostGuard domain operations
          |-- Firebase Authentication (pending configuration)
          |-- Firestore (proposed database)
          |-- Gmail OAuth/discovery (future, permissioned)
```

The backend boundary and provider flow remain planned only. The current frontend uses local demonstration state and does not connect to Firebase, Gmail, or any API.

## Frontend architecture

- Next.js App Router provides routing, layouts, metadata, and the application shell.
- JavaScript is the project language.
- React Server Components remain the default for non-interactive page content.
- Client Components are reserved for interactive controls, browser APIs, theme state, animations requiring client execution, and the future mind map.
- Tailwind CSS provides styling and responsive layout primitives.
- Framer Motion provides restrained, purposeful transitions and motion.
- Lucide React provides consistent iconography, including the future Sun and Moon theme controls.
- `@xyflow/react` provides the future digital identity mind map.
- Shared components should encode the design tokens, accessible states, responsive typography, cards, navigation, dialogs, and action confirmations rather than duplicating styles in pages.
- The dashboard security route uses a dedicated presentation component for demo security status, recommendations, and activity. It does not imply live scanning or provider security operations.
- The dashboard overview contains a separate India-focused 3D Earth visualization. This is intentionally independent from the interactive `@xyflow/react` Identity Map at `/dashboard/identity-map`.
- `IndiaGlobe` is a shared client-side Three.js component used on the dashboard overview and authentication pages. It renders a textured sphere with lighting, atmospheric glow, India-region network points, subtle rotation, pointer drag interaction, and a WebGL-unavailable fallback. The Earth texture is loaded from the Three.js public example asset at `https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg`; the Three.js repository and examples are distributed under the MIT license. The visualization remains demo data and does not claim authoritative security activity or account geography.

### Frontend demo authentication boundary

The current authentication flow is a browser-local demonstration only:

1. Registration validates the form and stores a demo registration record in `localStorage`.
2. Registration redirects to `/login` rather than opening the dashboard.
3. Login validates the submitted email and password against that demo record.
4. Successful login stores a demo session and redirects to `/dashboard`.
5. Dashboard routes check for the demo session and redirect to `/login` when absent.
6. Logout removes the demo session and returns to `/login`.

This is not real authentication and must be replaced with an approved Firebase Authentication or other backend session design before production use.

### Theme architecture

A centralized client-side theme provider manages dark/light state, persists the preference in `localStorage`, restores it after reload, and exposes the current theme to the navbar and all themed surfaces. A small layout bootstrap reads the stored preference before hydration to reduce initial theme flashing. The theme remains local frontend state until a future user-preference persistence decision is made.

## Backend architecture (planned)

The future backend must provide a narrow, authenticated domain boundary for:

- Reading and updating a user's GhostGuard records.
- Applying local record actions with explicit authorization.
- Recording provider connection state and audit-relevant events as approved.
- Coordinating provider operations without exposing sensitive credentials to the client.
- Enforcing least privilege and validating ownership on every user-scoped operation.

The exact implementation is **PENDING**. Possible Next.js route handlers, server actions, or a separate service must not be selected without a documented decision.

## Authentication approach

**PENDING finalization.** Firebase Authentication is a likely direction because Firebase is the confirmed database direction, but the provider, sign-in methods, session strategy, account recovery behavior, and security rules are not finalized. Do not present Firebase Authentication as implemented.

## Firebase integration direction

Firebase is the confirmed platform direction for persistence. Firestore is the proposed database, and Firebase Authentication is a candidate for identity. Integration should eventually include:

- Environment-specific Firebase configuration.
- Server/client boundary rules for Firebase access.
- Authenticated user ownership checks.
- Firestore security rules reviewed alongside the data model.
- Explicit handling for provider tokens and sensitive fields.
- Emulator/local-development guidance before production use.

Firebase packages, project configuration, security rules, indexes, and deployment settings remain unimplemented and partly **PENDING**.

## Gmail discovery flow

Gmail discovery is a future, permissioned flow and is not implemented:

1. The user sees an explanation of what discovery can and cannot do.
2. The user explicitly starts a provider authorization flow.
3. GhostGuard requests only the minimum approved OAuth scopes.
4. The provider returns authorized data through a future server-side integration.
5. GhostGuard extracts candidate account/service references using documented heuristics.
6. Candidates are shown for user review and confirmation before becoming GhostGuard records.
7. The user can manually add, dismiss, or edit records.
8. The user can revoke the OAuth connection separately from deleting local records.

Discovery must be described as partial and heuristic. It cannot find every account. Provider authorization, token storage, refresh/revocation behavior, data retention, and exact discovery signals are **PENDING**.

## Action boundaries

- **KEEP:** a user classification indicating the account should remain in their inventory; exact persistence semantics are **PENDING**.
- **SECURE:** a guided security-improvement action; the exact checklist and provider operations are **PENDING**.
- **REVOKE:** revokes an external OAuth connection or permission where supported; it does not delete the external account.
- **DELETE:** deletes a local GhostGuard record in the initial scope; it does not delete the external account.
- **PRESERVE:** marks information for retention or evidence purposes; exact retention and export behavior are **PENDING**.

External account deletion is outside the initial scope.
