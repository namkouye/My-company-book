export type DocumentKind = 'bank_statement' | 'receipt' | 'invoice' | 'other';

export interface StoredDocument {
  id: string;
  companyId: string;
  kind: DocumentKind;
  fileName: string;
  mimeType: string;
  size: number;
  blob: Blob;
  uploadedAt: string;
  extractedText?: string;
  extractedDate?: string;
  extractedMerchant?: string;
  extractedSubtotal?: number;
  extractedTax?: number;
  extractedTotal?: number;
  extractionSource?: 'pdf-text' | 'ocr' | 'pdf-text+ocr';
  reviewStatus: 'new' | 'matched' | 'needs_review';
  matchedTransactionId?: string;
}
