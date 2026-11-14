# My Company Book

Local-first bookkeeping PWA for Canadian small corporations. English interface; single-user, single-computer installation.

## Current starter status
This repository is the V1 foundation: React + TypeScript + Vite, Dexie/IndexedDB schema, company/category seeding, CSV parsing utility, duplicate fingerprint utility, and initial navigation/dashboard shell. Feature screens are scaffolds, not yet completed workflows.

## Requirements
- Node.js 20+
- npm

## Run locally
```bash
npm install
npm run dev
```
Open the local URL printed by Vite.

## Build
```bash
npm run typecheck
npm run build
```

## Data principles
- Financial data and receipt files stay in the local browser database.
- GitHub stores source code only; never commit company data, receipts, exports, secrets, or backups.
- Browser storage is not a backup. Implement and test encrypted export/restore before using real bookkeeping records.
- CSV imports must be previewed and confirmed. Preserve original source descriptions and import batch metadata.
- Transfers and credit-card payments are not ordinary expenses.
- OCR suggestions require human confirmation.

## Initial expense categories
The 16 default categories reproduce the headings in the supplied `Book keeping 2025-26.xlsx` workbook. Users will be able to add, rename, deactivate, and reorder categories.

## Product roadmap
1. Foundation and data model
2. Transactions and categories
3. CSV import wizard
4. Receipts and assisted OCR
5. Dashboard and exports
6. Backup, restore, tests, and release

## Important
This starter is not yet a complete accounting product and should not be used as the sole repository of business records until backup/restore, data integrity, and accounting workflows have been implemented and tested.
