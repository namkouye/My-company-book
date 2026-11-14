# My Company Book

Local-first bookkeeping PWA for Canadian small corporations. English interface; initially one user, one computer, one company per installation.

## GitHub Pages preview

This project is built with Vite. The workflow in `.github/workflows/deploy.yml` builds the app and publishes the `dist` folder to GitHub Pages whenever code is pushed to `main` or `master`. The Vite base path is configured for this repository: `/My-company-book/`.

In GitHub, open **Settings → Pages** and set **Source** to **GitHub Actions**. Then open **Actions** and wait for **Deploy My Company Book to GitHub Pages** to finish successfully.

## Run locally

Requirements: Node.js 20+ (Node.js 22 recommended) and npm.

```bash
npm install
npm run dev
```

## Build and check

```bash
npm run typecheck
npm run build
```

## Current starter status

This is the V1 foundation: React + TypeScript + Vite, Dexie/IndexedDB schema, company/category seeding, CSV parsing utility, duplicate fingerprint utility, and initial navigation/dashboard shell. Most feature screens are still scaffolds; this is not yet a complete bookkeeping application.

## Data principles

- GitHub stores source code only. Never commit company data, bank statements, receipts, exports, backups, or secrets.
- Financial data and receipt files are intended to stay in the local browser database.
- Browser storage is not a backup. Encrypted export/restore must be implemented and tested before using real bookkeeping records.
- CSV imports must be previewed and confirmed.
- Transfers and credit-card payments are not ordinary expenses.
- OCR suggestions require human confirmation.

## Initial expense categories

The 16 default categories reproduce the headings in the supplied `Book keeping 2025-26.xlsx` workbook. Users will be able to add, rename, deactivate, and reorder categories.

## Important

Do not use this starter as the sole repository of business records until backup/restore, data integrity, and accounting workflows have been implemented and tested.
