# Database Design

## Status

Firebase is the confirmed database direction. Firestore is the proposed database for GhostGuard persistence. No database integration or finalized schema exists yet.

This document intentionally does not invent finalized collections, fields, indexes, retention periods, or security rules.

## Proposed Firestore direction

Firestore may persist user-scoped GhostGuard data, including identity records, provider connection metadata, user classifications, and approved audit information. The final model must be designed around least privilege, ownership checks, data minimization, and the distinction between local records and external services.

### Collections and schemas

**PENDING.** The following are design areas, not finalized collection names or schemas:

- User profile and preferences.
- GhostGuard account/service records.
- Identity mind-map relationships or derived graph data.
- Provider connection and OAuth state.
- Action history or audit events.
- Preservation metadata and retention state.

Field names, required/optional status, data types, document relationships, subcollections, indexes, security rules, and lifecycle policies are all **PENDING**.

## Data boundaries

- Local GhostGuard record deletion must be distinguishable from external OAuth revocation.
- External account deletion is outside the initial scope and must not be modeled as an implemented action.
- Provider tokens and other secrets require a separately reviewed storage strategy; they must not be casually stored in client-readable documents.
- Gmail-derived data should be minimized, purpose-limited, and retained only according to an approved policy.
- Every user-scoped read and write must enforce ownership and authorization.

## Open database decisions

- **PENDING:** Firebase project/environment layout.
- **PENDING:** Firebase Authentication provider and user identifier strategy.
- **PENDING:** Collection and document schema.
- **PENDING:** Firestore security rules.
- **PENDING:** Composite indexes and query patterns.
- **PENDING:** Data retention, deletion, and preservation policy.
- **PENDING:** Emulator and migration strategy.
- **PENDING:** Audit logging detail and export requirements.
