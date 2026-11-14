# My Company Book — SaaS Architecture (working proposal)

## Product scope

My Company Book is a simple bookkeeping product for small Canadian corporations. V1 is designed primarily for one owner/operator per company. The product must remain approachable for users without accounting expertise.

## Product principles

- Canadian small-corporation workflows first: CAD, configurable fiscal year, GST/HST and applicable provincial tax settings.
- One paid subscription covers one company in the initial commercial model.
- One primary user per company in V1; accountant access can be considered later.
- Installable application on desktop and mobile.
- Offline-first data entry: local changes are saved immediately and synchronized when connectivity returns.
- Original financial documents remain retrievable and exportable.
- GitHub contains source code only, never customer records, receipts, exports, credentials or production secrets.

## Proposed application layers

1. Client application: current React + TypeScript + Vite codebase, installable as a PWA initially.
2. Local data layer: Dexie/IndexedDB for offline reads and writes, with a durable outbox of pending changes.
3. Sync layer: authenticated API; idempotent change submission; server revisions; conflict detection; retry handling.
4. Backend: PostgreSQL database, authentication service and private object storage for documents.
5. Billing: subscription provider integrated after identity, company ownership and data isolation are established.

## Backend candidate for evaluation

Supabase is a reasonable MVP candidate because it combines PostgreSQL, Auth and Storage and documents a specific Canada Central AWS region (`ca-central-1`). This is a candidate, not a compliance certification or final vendor decision.

Before production selection, review the current Data Processing Addendum, subprocessors, support/telemetry/logging flows, backup locations, incident terms, deletion process and whether any service data is processed outside Canada. A Canadian primary region alone does not prove that every data flow remains in Canada or that the application is legally compliant.

## Tenant and company model

- `user`: login identity.
- `company`: legal entity and accounting configuration.
- `company_membership`: relationship between a user and a company, even if V1 only supports one owner.
- `subscription`: billing relationship; one active subscription covers one company in V1.
- Every company-owned record has a non-null `company_id`.
- Every server query and storage operation must enforce company authorization on the server, not merely filter records in the UI.
- Use database row-level security (or equivalent server-side authorization) as defence in depth.

## Offline synchronization model

- Each local mutation is written to IndexedDB and to a local outbox in one transaction.
- Each mutation receives a stable ID/idempotency key, entity ID, company ID, operation, local timestamp and base server revision.
- Sync sends pending mutations when online and marks them acknowledged only after server confirmation.
- Server-side authorization verifies the user is allowed to modify the company.
- Server responses provide canonical records/revisions.
- Concurrent edits create an explicit conflict state; never silently overwrite financial records.
- Deletes use tombstones so they can synchronize safely across devices.
- File uploads use resumable/retryable upload flow and are linked to document metadata.

## Data migration

Do not replace or delete the current IndexedDB database during the transition. Add versioned Dexie migrations and a tested export/import path. Before any migration:

1. Create a complete local backup including document blobs.
2. Validate record counts and relationships.
3. Import into the new schema.
4. Verify totals and document readability.
5. Keep rollback instructions until the migration is accepted.

## Deployment separation

- GitHub: source control, code review, issue tracking and CI.
- GitHub Pages: development/demo preview only.
- Production frontend: separate hosting/deployment target.
- Production backend and document storage: selected Canadian region, subject to vendor and legal review.
- Secrets: server-side secret manager/environment variables only; never commit secrets or put privileged service keys in browser code.
