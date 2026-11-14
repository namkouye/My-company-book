import { db } from './db';
const DEFAULT_CATEGORIES = [
 'Taxes','Advertising','Meals & Entertainment','Interest & Bk charges','Fees, Dues & Licenses',
 'CUSTOM tax','Supplies & Consumables','Professional Fees','Commercial Rent','Salaries',
 'Automobile/Van Travel','Telephone & Communications','Training','Gas','Insurance','MAINTENANCE Repairs'
];
export async function seedCompany(company: { legalName: string; province?: string; fiscalYearStart: string }) {
  const id = crypto.randomUUID();
  await db.transaction('rw', db.companies, db.categories, db.fiscalYears, async () => {
    await db.companies.add({ id, legalName: company.legalName, province: company.province, baseCurrency:'CAD', fiscalYearStart:company.fiscalYearStart, createdAt:new Date().toISOString() });
    await db.categories.bulkAdd(DEFAULT_CATEGORIES.map((name, sortOrder) => ({ id:crypto.randomUUID(), companyId:id, name, active:true, sortOrder })));
    await db.fiscalYears.add({ id:crypto.randomUUID(), companyId:id, name:'Initial fiscal year', startDate:company.fiscalYearStart, endDate:'' });
  });
  return id;
}
