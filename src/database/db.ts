import Dexie, { type Table } from 'dexie';
import type { Company, Account, Category, Transaction, TransactionSplit, Receipt, ImportBatch, FiscalYear, Note } from '../types';
import type { StoredDocument } from '../types/documents';

class CompanyBookDB extends Dexie {
  companies!: Table<Company, string>;
  accounts!: Table<Account, string>;
  categories!: Table<Category, string>;
  transactions!: Table<Transaction, string>;
  transactionSplits!: Table<TransactionSplit, string>;
  receipts!: Table<Receipt, string>;
  importBatches!: Table<ImportBatch, string>;
  fiscalYears!: Table<FiscalYear, string>;
  notes!: Table<Note, string>;
  documents!: Table<StoredDocument, string>;

  constructor() {
    super('MyCompanyBook');

    this.version(1).stores({
      companies: 'id, legalName',
      accounts: 'id, companyId, accountType, active',
      categories: 'id, companyId, name, active, sortOrder',
      transactions: 'id, companyId, accountId, transactionDate, categoryId, transactionType, status, importBatchId',
      transactionSplits: 'id, transactionId, categoryId',
      receipts: 'id, companyId, transactionId, uploadedAt',
      importBatches: 'id, companyId, accountId, importedAt',
      fiscalYears: 'id, companyId, startDate, endDate',
      notes: 'id, companyId, updatedAt'
    });

    this.version(2).stores({
      companies: 'id, legalName',
      accounts: 'id, companyId, accountType, active',
      categories: 'id, companyId, name, active, sortOrder',
      transactions: 'id, companyId, accountId, transactionDate, categoryId, transactionType, status, importBatchId',
      transactionSplits: 'id, transactionId, categoryId',
      receipts: 'id, companyId, transactionId, uploadedAt',
      importBatches: 'id, companyId, accountId, importedAt',
      fiscalYears: 'id, companyId, startDate, endDate',
      notes: 'id, companyId, updatedAt',
      documents: 'id, companyId, kind, uploadedAt, reviewStatus, matchedTransactionId'
    });

    // V3 makes transaction allocations explicitly company-scoped.
    // Existing allocations inherit the companyId of their parent transaction.
    this.version(3).stores({
      companies: 'id, legalName',
      accounts: 'id, companyId, accountType, active',
      categories: 'id, companyId, name, active, sortOrder',
      transactions: 'id, companyId, accountId, transactionDate, categoryId, transactionType, status, importBatchId',
      transactionSplits: 'id, companyId, transactionId, categoryId',
      receipts: 'id, companyId, transactionId, uploadedAt',
      importBatches: 'id, companyId, accountId, importedAt',
      fiscalYears: 'id, companyId, startDate, endDate',
      notes: 'id, companyId, updatedAt',
      documents: 'id, companyId, kind, uploadedAt, reviewStatus, matchedTransactionId'
    }).upgrade(async (tx) => {
      const splitTable = tx.table('transactionSplits');
      const transactionTable = tx.table('transactions');
      const existingSplits = await splitTable.toArray();

      for (const split of existingSplits) {
        const parentTransaction = await transactionTable.get(split.transactionId);
        await splitTable.update(split.id, {
          companyId: parentTransaction?.companyId ?? '__orphaned__'
        });
      }
    });
  }
}

export const db = new CompanyBookDB();
