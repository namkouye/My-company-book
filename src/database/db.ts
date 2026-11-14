import Dexie, { type Table } from 'dexie';
import type { Company, Account, Category, Transaction, TransactionSplit, Receipt, ImportBatch, FiscalYear, Note } from '../types';
import type { StoredDocument } from '../types/documents';
class CompanyBookDB extends Dexie {
  companies!: Table<Company, string>; accounts!: Table<Account, string>; categories!: Table<Category, string>;
  transactions!: Table<Transaction, string>; transactionSplits!: Table<TransactionSplit, string>;
  receipts!: Table<Receipt, string>; importBatches!: Table<ImportBatch, string>;
  fiscalYears!: Table<FiscalYear, string>; notes!: Table<Note, string>; documents!: Table<StoredDocument, string>;
  constructor() {
    super('MyCompanyBook');
    this.version(1).stores({
      companies:'id, legalName', accounts:'id, companyId, accountType, active',
      categories:'id, companyId, name, active, sortOrder',
      transactions:'id, companyId, accountId, transactionDate, categoryId, transactionType, status, importBatchId',
      transactionSplits:'id, transactionId, categoryId', receipts:'id, companyId, transactionId, uploadedAt',
      importBatches:'id, companyId, accountId, importedAt', fiscalYears:'id, companyId, startDate, endDate',
      notes:'id, companyId, updatedAt'
    });
    this.version(2).stores({
      companies:'id, legalName', accounts:'id, companyId, accountType, active',
      categories:'id, companyId, name, active, sortOrder',
      transactions:'id, companyId, accountId, transactionDate, categoryId, transactionType, status, importBatchId',
      transactionSplits:'id, transactionId, categoryId', receipts:'id, companyId, transactionId, uploadedAt',
      importBatches:'id, companyId, accountId, importedAt', fiscalYears:'id, companyId, startDate, endDate',
      notes:'id, companyId, updatedAt', documents:'id, companyId, kind, uploadedAt, reviewStatus, matchedTransactionId'
    });
  }
}
export const db = new CompanyBookDB();
