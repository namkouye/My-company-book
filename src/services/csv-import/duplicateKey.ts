import type { Transaction } from '../../types';
export function transactionFingerprint(t: Pick<Transaction,'accountId'|'transactionDate'|'amount'|'description'>): string {
  const description = t.description.toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,80);
  return [t.accountId,t.transactionDate,Number(t.amount).toFixed(2),description].join('|');
}
