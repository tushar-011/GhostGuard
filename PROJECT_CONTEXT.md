# GhostGuard Project Context

## Project overview

GhostGuard is a privacy-first cybersecurity SaaS product intended to help people understand and manage the digital accounts associated with their identity. The product will present discovered and manually added accounts as a visual digital identity mind map, then provide clear actions for retaining, securing, revoking access, deleting local records, or preserving evidence.

The project is currently at the frontend foundation stage. GhostGuard product UI and frontend-only demonstration behavior are implemented; backend behavior remains intentionally deferred.

## Problem statement

People often lose track of online accounts, connected services, and the permissions granted to them. Existing account-management experiences are fragmented, difficult to audit, and unclear about the difference between removing an integration, deleting a local record, and deleting an external account. GhostGuard aims to make this identity surface understandable while keeping user control and privacy central.

## Target users

- Individuals who want to inventory and understand their online accounts.
- Privacy-conscious users auditing connected services and access.
- Users cleaning up or organizing a digital identity after changing services.
- Future users who need a visual, understandable overview rather than a provider-specific settings page.

## Core features

- A premium landing page explaining the product.
- User authentication.
- A user dashboard for account and identity management.
- A digital identity mind map.
- Gmail-based account discovery, subject to explicit authorization and provider limitations.
- Manual account addition.
- Account actions: KEEP, SECURE, REVOKE, DELETE, and PRESERVE.
- Clear separation between external OAuth revocation, local GhostGuard record deletion, and external account deletion.

External account deletion is outside the initial scope.

## Product scope and limitations

### Initial scope

- Frontend-first product development.
- Responsive landing page and authenticated dashboard experiences.
- A visual model for accounts and identity relationships.
- A safe, explicit user experience for account actions.
- Firebase as the future persistence direction.

### Out of scope for the initial phase

- Backend implementation.
- Gmail integration or live Gmail account discovery.
- External account deletion.
- Any claim that Gmail discovery finds every account a user owns.
- Final authentication provider selection.
- Final Firestore collection and document schemas.

Gmail discovery must be described as a partial, permissioned discovery flow. It cannot guarantee complete account coverage.

## Confirmed technology stack

- Product name: GhostGuard.
- Package/project name: `ghostguard`.
- Framework: Next.js 16 with the App Router.
- Language: JavaScript, not TypeScript.
- Styling: Tailwind CSS 4.
- Animations: Framer Motion.
- Icons: Lucide React.
- Mind map: `@xyflow/react`.
- Database direction: Firebase, with Firestore proposed for persistence.
- Current application entry points: `src/app/layout.js`, `src/app/page.js`, and `src/app/globals.css`.

The current package manifest contains the frontend dependencies above. Firebase is a confirmed direction, but is not yet an implemented dependency or integration.

The latest frontend pass includes focused Login/Register typography and spacing polish. The shared auth branding panel uses the reusable Three.js textured Earth, avoids text overlap, and remains visible on mobile above the form.

The current visual system has since been redesigned around Soft White (#E8E9DF), Sage Green (#A9B887), and Deep Olive (#2E3D28), with complementary dark-mode olive surfaces. The redesign is implemented as shared styling across all existing routes and preserves the frontend-only behavior.

The final typography direction requests Marella for the homepage hero, Recoleta for section and product headings, and Open Sans for body/interface text. Open Sans is loaded centrally through `next/font/google`. Marella and Recoleta font files are not present in the repository and are not available through the configured Next.js Google font loader; the CSS keeps those exact family names with an explicit Georgia serif fallback rather than silently presenting a substitute as the requested font. Warm Ivory (#F5F5EF) and Charcoal Olive (#41483B) remain the supporting surface and text references.

The final visual polish uses Deep Olive-based Section 4 styling, Sage Green primary buttons with Deep Olive text, transparent or dark secondary buttons, restrained destructive styling, and a green-tinted Dashboard Earth renderer. The Dashboard globe remains separate from the Identity Map and is not rendered on authentication pages.

The final UI correction pass restores the Dashboard globe's natural Earth colors and adds wheel zoom, pointer-responsive lighting, marker hover details for demo India connection points, touch-compatible pointer rotation, and a reset-view control. Dashboard workspace/profile avatars now use a visible Lucide fallback icon when no image is available.

## Proposed architecture

### Frontend

The Next.js App Router will own page composition, layouts, metadata, responsive UI, client-side interaction, theme behavior, motion, and the mind-map visualization. Product UI should be split into reusable components as the frontend grows. Server Components should remain the default where interactivity is not required; Client Components should be limited to stateful UI, browser APIs, animations requiring client execution, and the future mind map.

### Backend (planned)

Backend capabilities are intentionally deferred. A future backend boundary will be responsible for authenticated user operations, Firebase access, authorization checks, provider integration, discovery orchestration, and audit-safe action handling. Do not implement this boundary during the documentation phase.

### Data

Firestore is the proposed database. Collections, field-level schemas, indexes, retention rules, and security rules remain pending and must be designed before persistence is implemented.

### External integrations

Gmail discovery is a future, permissioned integration. It should use the minimum required scopes, communicate its limitations, and never imply complete discovery. OAuth revocation is distinct from deleting a GhostGuard record; neither action deletes an external account in the initial scope.

## Current development status

- Documentation foundation completed.
- Frontend Phase 2 completed as a frontend-only implementation.
- Public routes, authentication demo screens, dashboard routes, account management, identity map, contact form, settings, and legal/about pages are implemented.
- Shared responsive public and dashboard shells are implemented.
- Dark/light theme switching is implemented with a centralized provider, localStorage persistence, initial-load bootstrap, and reduced-motion support.
- Visual refinement pass completed for typography hierarchy, centered navigation, scroll-aware navbar styling, and theme-aware identity diagrams.
- Authentication demo navigation now includes the canonical `/signup` registration route and `/forgot-password` recovery route.
- The hero identity visual now includes a lightweight animated digital globe treatment built with CSS, SVG, and Framer Motion.
- Light-theme contrast corrections were applied to authentication and How It Works surfaces.
- Added a reusable GhostGuard App Router loading screen and inline demo form loader.
- Removed nested anchor markup from the authentication mobile logo to prevent hydration warnings.
- Completed the remaining Phase 2 navigation and responsive polish: Security now targets the homepage security section, tablet navigation avoids crowding, homepage sections have clearer boundaries, and the existing hero globe has a subtle dimensional rotation treatment.
- Added an initial-client branded loader gate in `src/app/providers.js` while preserving `src/app/loading.js` for App Router route loading.
- Replaced the overview reuse on `/dashboard/security` with a dedicated frontend-only security dashboard showing demo score, account status, recommendations, and recent activity.
- Added lightweight continent silhouettes, network points, and reduced-motion handling to the existing CSS/SVG globe.
- Added a frontend-only registration record and session boundary: Register now leads to Login, Login validates the demo registration before opening the dashboard, protected dashboard routes redirect logged-out users, and Logout clears the demo session.
- Added a separate India-focused digital globe visualization to the dashboard overview; the interactive React Flow Identity Map remains a separate feature at `/dashboard/identity-map`.
- Promoted the India globe into one reusable `IndiaGlobe` component shared by Dashboard, Login, and Register, with pointer drag rotation, responsive sizing, and reduced-motion support.
- Added functional Dashboard Quick Actions and global demo-account search with useful empty-state feedback.
- All records, metrics, auth flows, account actions, and settings are local demonstration state only.
- No backend, Firebase integration, real authentication, Gmail integration, database schema, or real OAuth revocation has been implemented.

## Pending decisions

- Authentication provider and exact Firebase Authentication configuration.
- Whether Firebase Hosting, another hosting provider, or a later deployment target will be used.
- Exact Firestore collections, document schemas, indexes, and retention policies.
- Backend/API boundary and whether provider operations use Next.js route handlers, server actions, or a separate service.
- Gmail OAuth scopes, consent UX, token storage, refresh/revocation lifecycle, and discovery heuristics.
- Account normalization and duplicate detection rules.
- Precise semantics and confirmation requirements for KEEP, SECURE, REVOKE, DELETE, and PRESERVE.
- Audit-log requirements and export/retention behavior.
- Final design tokens, component library conventions, and accessibility acceptance criteria.

## Important development rules

1. Build the frontend before backend or Gmail functionality.
2. Use JavaScript; do not introduce TypeScript unless this decision is explicitly revisited.
3. Keep Firebase as the database direction. Do not describe PostgreSQL, Neon, or Supabase as the confirmed database.
4. Never claim Gmail discovery finds every account.
5. Always distinguish external OAuth revocation, local GhostGuard record deletion, and external account deletion.
6. External account deletion is outside the initial scope.
7. Mark unknown requirements and schemas as `PENDING`; do not invent finalized decisions.
8. Preserve historical decisions in `docs/decisions.md` rather than silently replacing them.
9. Keep privacy, least-privilege access, explicit consent, accessible confirmation flows, and clear destructive-action warnings central to the UX.
10. Update this file and `docs/development-progress.md` after every major phase.

## Global design system requirements

### Dark theme

- Background: Midnight Navy `#080B18`.
- Primary accent: Electric Violet `#8B5CF6`.
- Secondary accent: Ice Cyan `#22D3EE`.
- Text: white and readable light shades.
- Visual language: premium cybersecurity SaaS, modern glassmorphism, subtle gradients, elegant cards, and clean surfaces.

### Light theme

- Background: clean white.
- Surfaces: soft lavender and light-blue shades.
- Text: dark and highly readable.
- Primary accent: Electric Violet `#8B5CF6`.
- Secondary accent: Ice Cyan `#22D3EE`.
- Visual language: clean, premium, minimal, and professional.

### Typography and sizing

- Use Marella for the homepage hero, Recoleta for section/product headings, and Open Sans for remaining interface content. Exact Marella and Recoleta font files are pending because no supplied licensed files are currently present.
- Main headings are large, bold, and visually prominent.
- Hero headings have strong visual hierarchy.
- Body text is comfortably readable and not unnecessarily small.
- Use consistent font sizes, line heights, and spacing.
- Maintain clear hierarchy between headings, subheadings, body text, and labels.
- Typography must respond appropriately across desktop, tablet, and mobile.

### Theme functionality

The main navbar and dashboard header provide a functional Dark/Light toggle using Lucide Sun and Moon icons. A centralized theme provider manages the selected theme, persists it in `localStorage`, restores it after reload, bootstraps the initial theme, and applies smooth transitions. All pages, sections, cards, forms, navigation elements, and components follow the selected theme while maintaining accessible contrast. Persistence remains local frontend state only.

## Instructions for transferring the project to another AI agent

1. Read this file, `README.md`, `docs/development-progress.md`, `docs/architecture.md`, `docs/features.md`, `docs/database-design.md`, and `docs/decisions.md` before changing code.
2. Inspect the current repository and git status before editing. Preserve unrelated worktree changes.
3. Treat `PENDING` items as unresolved; ask for clarification when an implementation would commit to one.
4. Follow the confirmed stack: Next.js App Router, JavaScript, Tailwind CSS, Framer Motion, Lucide React, and `@xyflow/react`.
5. Implement frontend work first. Do not add backend or Gmail behavior until the scope and integration decisions are finalized.
6. Update the progress and context documents after each major phase.
7. Validate changes with the smallest relevant existing lint, build, or test command.
8. Keep product language honest: discovery is partial, OAuth revocation is not external account deletion, and local record deletion is not external deletion.
