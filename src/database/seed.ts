import { db } from './db';

export const DEFAULT_CATEGORIES = [
  'Taxes', 'Advertising', 'Meals & Entertainment', 'Interest & Bk charges',
  'Fees, Dues & Licenses', 'CUSTOM tax', 'Supplies & Consumables', 'Professional Fees',
  'Commercial Rent', 'Salaries', 'Automobile/Van Travel', 'Telephone & Communications',
  'Training', 'Gas', 'Insurance', 'MAINTENANCE Repairs'
];

export async function initializeDatabase() {
  const existing = await db.companies.toArray();
  if (existing.length) {
    const company = existing[0];
    const accounts = await db.accounts.where('companyId').equals(company.id).count();
    if (!accounts) {
      await db.accounts.add({ id: crypto.randomUUID(), companyId: company.id, name: 'Main bank account', accountType: 'bank', currency: 'CAD', openingBalance: 0, active: true });
    }
    const categoryCount = await db.categories.where('companyId').equals(company.id).count();
    if (!categoryCount) {
      await db.categories.bulkAdd(DEFAULT_CATEGORIES.map((name, sortOrder) => ({ id: crypto.randomUUID(), companyId: company.id, name, active: true, sortOrder })));
    }
    return company.id;
  }

  const id = crypto.randomUUID();
  const today = new Date().toISOString().slice(0, 10);
  await db.transaction('rw', db.companies, db.categories, db.fiscalYears, db.accounts, async () => {
    await db.companies.add({ id, legalName: 'My Corporation', baseCurrency: 'CAD', fiscalYearStart: `${new Date().getFullYear()}-01-01`, createdAt: new Date().toISOString() });
    await db.categories.bulkAdd(DEFAULT_CATEGORIES.map((name, sortOrder) => ({ id: crypto.randomUUID(), companyId: id, name, active: true, sortOrder })));
    await db.fiscalYears.add({ id: crypto.randomUUID(), companyId: id, name: 'Initial fiscal year', startDate: `${new Date().getFullYear()}-01-01`, endDate: `${new Date().getFullYear()}-12-31` });
    await db.accounts.add({ id: crypto.randomUUID(), companyId: id, name: 'Main bank account', accountType: 'bank', currency: 'CAD', openingBalance: 0, openingDate: today, active: true });
  });
  return id;
}

export async function seedCompany(company: { legalName: string; province?: string; fiscalYearStart: string }) {
  const id = crypto.randomUUID();
  await db.transaction('rw', db.companies, db.categories, db.fiscalYears, db.accounts, async () => {
    await db.companies.add({ id, legalName: company.legalName, province: company.province, baseCurrency: 'CAD', fiscalYearStart: company.fiscalYearStart, createdAt: new Date().toISOString() });
    await db.categories.bulkAdd(DEFAULT_CATEGORIES.map((name, sortOrder) => ({ id: crypto.randomUUID(), companyId: id, name, active: true, sortOrder })));
    await db.fiscalYears.add({ id: crypto.randomUUID(), companyId: id, name: 'Initial fiscal year', startDate: company.fiscalYearStart, endDate: '' });
    await db.accounts.add({ id: crypto.randomUUID(), companyId: id, name: 'Main bank account', accountType: 'bank', currency: 'CAD', openingBalance: 0, active: true });
  });
  return id;
}
