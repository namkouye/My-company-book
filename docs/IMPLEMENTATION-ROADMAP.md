# My Company Book — Implementation Roadmap

## Phase 0 — Protect the current app

- Keep `main` as the stable preview.
- Develop on `saas-foundation`.
- Never put real financial records or secrets in GitHub.
- Add automated typecheck/build to pull requests.

## Phase 1 — Prepare the data model (next coding phase)

- Audit every Dexie table and every query for company ownership.
- Add company profile fields needed for Canadian corporations and configurable fiscal years.
- Add a company membership concept, even if only one owner is supported initially.
- Add schema versioning and migration tests.
- Correct first-company assumptions in initialization and UI state.
- Add tests for cross-company data isolation at the application layer.

## Phase 2 — Local reliability

- Implement versioned export/import including every table and document Blob.
- Add integrity checks and backup restore tests.
- Add persistent-storage request where supported, with clear explanation that it is not a backup.

## Phase 3 — Backend foundation

- Select provider after reviewing Canadian region, DPA, subprocessors and data-flow documentation.
- Create database schema, authentication and server-side company authorization.
- Add row-level security or equivalent controls and automated tenant-isolation tests.
- Keep privileged keys out of the client.

## Phase 4 — Offline synchronization

- Implement outbox, idempotency, server revisions, retries, tombstones and conflict review.
- Synchronize document metadata and upload blobs safely.
- Test offline edits, reconnects, duplicate requests, device changes and simultaneous edits.

## Phase 5 — Commercial launch foundations

- Add one subscription per company, billing portal and subscription lifecycle handling.
- Add customer export, cancellation and data-retention workflows.
- Complete security review, privacy/legal review, restore drill and pilot testing before launch.

## Release rule

Do not migrate real company books or advertise production-grade security/offline sync until backup/restore, authorization, tenant isolation and synchronization tests pass.
