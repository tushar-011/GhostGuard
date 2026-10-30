# GhostGuard Decisions

This log separates decisions that are confirmed from proposals and unresolved decisions. Historical entries must be preserved when a decision changes.

## Confirmed decisions

| Decision | Status | Notes |
| --- | --- | --- |
| Product name is GhostGuard | Confirmed | Use GhostGuard in product-facing language. |
| Project/package name is `ghostguard` | Confirmed | Preserve the existing package name. |
| Use Next.js App Router | Confirmed | The repository is an App Router project. |
| Use JavaScript, not TypeScript | Confirmed | Do not introduce TypeScript without an explicit decision change. |
| Use Tailwind CSS | Confirmed | Tailwind is present in the current frontend setup. |
| Use Framer Motion | Confirmed | Use for future product motion. |
| Use Lucide React | Confirmed | Use for future icons, including Sun and Moon. |
| Use `@xyflow/react` for the mind map | Confirmed | Mind-map implementation is future work. |
| Firebase is the database direction | Confirmed | Do not represent PostgreSQL, Neon, or Supabase as the database choice. |
| Frontend development comes first | Confirmed | Backend and Gmail integration are deferred. |
| External account deletion is outside initial scope | Confirmed | REVOKE and local DELETE must not be described as external deletion. |
| Gmail discovery is not complete account discovery | Confirmed | Product language must never claim it finds every account. |
| Frontend development precedes integrations | Confirmed | The current phase uses local state and demonstration data only. |
| Theme state is local frontend state for Phase 2 | Confirmed | The provider persists to localStorage; no backend preference sync exists. |

## Proposals

| Proposal | Status | Notes |
| --- | --- | --- |
| Use Firestore for persistence | Proposed | Firebase is confirmed; Firestore is the proposed database and needs final design approval. |
| Consider Firebase Authentication | Proposed | A likely fit, but provider and configuration are not finalized. |
| Use a narrow authenticated backend boundary | Proposed | Exact route handler, server action, or service shape is pending. |
| Use a centralized theme provider | Proposed/required direction | Required for future theme behavior; implementation is deferred. |

## Pending decisions

- Authentication provider, methods, sessions, recovery, and Firebase configuration.
- Firestore collections, schemas, indexes, security rules, and retention.
- Backend/API boundary and provider token handling.
- Gmail scopes, discovery heuristics, consent, revocation, and data lifecycle.
- Account normalization, deduplication, and confidence model.
- Exact KEEP, SECURE, REVOKE, DELETE, and PRESERVE semantics.
- Audit, preservation, export, and deletion requirements.
- Final design tokens, component conventions, and accessibility acceptance criteria.
- Whether the Security dashboard gets a dedicated information architecture or extends the overview model.

## Decision history

No prior GhostGuard product decisions were found beyond the confirmed project rules recorded above. Future changes should add a new entry or update the relevant status with an explanation rather than removing history.
