export type AccountType = 'bank' | 'credit_card' | 'investment';
export type TransactionType = 'expense' | 'income' | 'transfer' | 'card_payment' | 'investment' | 'other';
export type TransactionStatus = 'needs_review' | 'reviewed' | 'exported';
export interface Company { id: string; legalName: string; businessNumber?: string; province?: string; baseCurrency: string; fiscalYearStart: string; createdAt: string; }
export interface Account { id: string; companyId: string; name: string; institution?: string; accountType: AccountType; currency: string; openingBalance: number; openingDate?: string; active: boolean; }
export interface Category { id: string; companyId: string; name: string; active: boolean; sortOrder: number; }
export interface Transaction { id: string; companyId: string; accountId: string; transactionDate: string; description: string; originalDescription?: string; payee?: string; transactionType: TransactionType; amount: number; currency: string; debit?: number; credit?: number; balance?: number; categoryId?: string; taxAmount?: number; status: TransactionStatus; importBatchId?: string; notes?: string; createdAt: string; updatedAt: string; }
export interface TransactionSplit { id: string; companyId: string; transactionId: string; categoryId: string; amount: number; taxAmount?: number; }
export interface Receipt { id: string; companyId: string; transactionId?: string; fileName: string; mimeType: string; size: number; blob: Blob; uploadedAt: string; }
export interface ImportBatch { id: string; companyId: string; accountId: string; fileName: string; importedAt: string; rowCount: number; duplicateCount: number; }
export interface FiscalYear { id: string; companyId: string; name: string; startDate: string; endDate: string; }
export interface Note { id: string; companyId: string; title: string; body: string; createdAt: string; updatedAt: string; }
