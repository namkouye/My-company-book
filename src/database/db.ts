import Dexie, { type Table } from 'dexie';
import type { Company, Account, Category, Transaction, TransactionSplit, Receipt, ImportBatch, FiscalYear, Note } from '../types';
class CompanyBookDB extends Dexie {
  companies!: Table<Company, string>; accounts!: Table<Account, string>; categories!: Table<Category, string>;
  transactions!: Table<Transaction, string>; transactionSplits!: Table<TransactionSplit, string>;
  receipts!: Table<Receipt, string>; importBatches!: Table<ImportBatch, string>;
  fiscalYears!: Table<FiscalYear, string>; notes!: Table<Note, string>;
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
  }
}
export const db = new CompanyBookDB();
