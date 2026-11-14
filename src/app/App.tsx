import DocumentInbox from './DocumentInbox';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  LayoutDashboard, Receipt, Landmark, CreditCard, FolderOpen, ChartNoAxesCombined,
  FileSpreadsheet, Settings, ArrowLeftRight, Plus, Search, Bell, ChevronDown,
  Pencil, Trash2, X, Tags, Check, AlertCircle, Wallet
} from 'lucide-react';
import { db } from '../database/db';
import { initializeDatabase } from '../database/seed';
import type { Account, Category, Transaction, TransactionType } from '../types';

const nav = [
  ['Dashboard', LayoutDashboard], ['Transactions', ArrowLeftRight], ['Bank Accounts', Landmark],
  ['Credit Cards', CreditCard], ['Receipts & Documents', FolderOpen], ['Investment Ledger', ChartNoAxesCombined],
  ['Portfolio Snapshots', ChartNoAxesCombined], ['Account Transfers', ArrowLeftRight],
  ['Reports & Exports', FileSpreadsheet], ['Settings', Settings]
] as const;
const money = (value: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value);
const today = () => new Date().toISOString().slice(0, 10);
const transactionTypes: { value: TransactionType; label: string }[] = [
  { value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' },
  { value: 'transfer', label: 'Transfer' }, { value: 'card_payment', label: 'Credit card payment' },
  { value: 'investment', label: 'Investment' }, { value: 'other', label: 'Other' }
];

type SplitDraft = { categoryId: string; amount: string; taxAmount: string };
type Draft = { transactionDate: string; description: string; payee: string; accountId: string; transactionType: TransactionType; amount: string; categoryId: string; taxAmount: string; notes: string; splits: SplitDraft[] };
const emptyDraft = (accountId = ''): Draft => ({ transactionDate: today(), description: '', payee: '', accountId, transactionType: 'expense', amount: '', categoryId: '', taxAmount: '', notes: '', splits: [] });

export default function App() {
  const [active, setActive] = useState('Dashboard');
  const [companyId, setCompanyId] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showInactive, setShowInactive] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => { initializeDatabase().then(setCompanyId).catch(console.error); }, []);
  const transactions = useLiveQuery(() => companyId ? db.transactions.where('companyId').equals(companyId).toArray() : [], [companyId], []);
  const categories = useLiveQuery(() => companyId ? db.categories.where('companyId').equals(companyId).sortBy('sortOrder') : [], [companyId], []);
  const accounts = useLiveQuery(() => companyId ? db.accounts.where('companyId').equals(companyId).toArray() : [], [companyId], []);
  const splits = useLiveQuery(() => companyId ? db.transactionSplits.where('companyId').equals(companyId).toArray() : [], [companyId], []);
  const activeCategories = categories.filter(c => c.active);
  const sortedTransactions = useMemo(() => [...transactions].sort((a,b) => b.transactionDate.localeCompare(a.transactionDate) || b.createdAt.localeCompare(a.createdAt)), [transactions]);
  const filteredTransactions = useMemo(() => sortedTransactions.filter(t => {
    const haystack = `${t.description} ${t.payee ?? ''} ${t.notes ?? ''}`.toLowerCase();
    return (!search || haystack.includes(search.toLowerCase())) && (typeFilter === 'all' || t.transactionType === typeFilter) && (categoryFilter === 'all' || t.categoryId === categoryFilter || splits.some(s => s.transactionId === t.id && s.categoryId === categoryFilter));
  }), [sortedTransactions, search, typeFilter, categoryFilter, splits]);
  const expenses = transactions.filter(t => t.transactionType === 'expense').reduce((sum,t) => sum + t.amount, 0);
  const income = transactions.filter(t => t.transactionType === 'income').reduce((sum,t) => sum + t.amount, 0);
  const uncategorised = transactions.filter(t => t.transactionType === 'expense' && !t.categoryId && !splits.some(s => s.transactionId === t.id)).length;
  const accountName = (id: string) => accounts.find(a => a.id === id)?.name ?? 'Unknown account';
  const categoryNameFor = (id?: string) => categories.find(c => c.id === id)?.name ?? 'Uncategorised';

  function openNewTransaction() {
    setEditing(null); setDraft(emptyDraft(accounts[0]?.id ?? '')); setFormError(''); setModalOpen(true);
  }
  async function openEditTransaction(t: Transaction) {
    const transactionSplits = await db.transactionSplits.where('transactionId').equals(t.id).toArray();
    setEditing(t);
    setDraft({ transactionDate: t.transactionDate, description: t.description, payee: t.payee ?? '', accountId: t.accountId, transactionType: t.transactionType, amount: String(t.amount), categoryId: t.categoryId ?? '', taxAmount: t.taxAmount == null ? '' : String(t.taxAmount), notes: t.notes ?? '', splits: transactionSplits.map(s => ({ categoryId: s.categoryId, amount: String(s.amount), taxAmount: s.taxAmount == null ? '' : String(s.taxAmount) })) });
    setFormError(''); setModalOpen(true);
  }
  async function saveTransaction(event: FormEvent) {
    event.preventDefault(); setFormError('');
    const amount = Number(draft.amount);
    if (!draft.description.trim() || !draft.accountId || !draft.transactionDate || !Number.isFinite(amount) || amount <= 0) { setFormError('Enter a description, account, date and an amount greater than zero.'); return; }
    const validSplits = draft.splits.filter(s => s.categoryId && Number(s.amount) > 0);
    if (draft.splits.length && validSplits.length !== draft.splits.length) { setFormError('Complete or remove every split line.'); return; }
    if (validSplits.length) {
      const splitTotal = validSplits.reduce((sum,s) => sum + Number(s.amount), 0);
      if (Math.abs(splitTotal - amount) > 0.005) { setFormError(`Split total (${money(splitTotal)}) must equal the transaction amount (${money(amount)}).`); return; }
    }
    const now = new Date().toISOString();
    const record: Transaction = { id: editing?.id ?? crypto.randomUUID(), companyId, accountId: draft.accountId, transactionDate: draft.transactionDate, description: draft.description.trim(), originalDescription: editing?.originalDescription, payee: draft.payee.trim() || undefined, transactionType: draft.transactionType, amount, currency: 'CAD', categoryId: validSplits.length ? undefined : (draft.categoryId || undefined), taxAmount: draft.taxAmount === '' ? undefined : Number(draft.taxAmount), status: 'needs_review', notes: draft.notes.trim() || undefined, createdAt: editing?.createdAt ?? now, updatedAt: now };
    await db.transaction('rw', db.transactions, db.transactionSplits, async () => {
      await db.transactions.put(record);
      await db.transactionSplits.where('transactionId').equals(record.id).delete();
      if (validSplits.length) await db.transactionSplits.bulkAdd(validSplits.map(s => ({ id: crypto.randomUUID(), companyId, transactionId: record.id, categoryId: s.categoryId, amount: Number(s.amount), taxAmount: s.taxAmount === '' ? undefined : Number(s.taxAmount) })));
    });
    setModalOpen(false); setEditing(null);
  }
  async function deleteTransaction(t: Transaction) {
    if (!window.confirm(`Delete transaction “${t.description}”?`)) return;
    await db.transaction('rw', db.transactions, db.transactionSplits, async () => { await db.transactions.delete(t.id); await db.transactionSplits.where('transactionId').equals(t.id).delete(); });
  }
  async function saveCategory() {
    const name = categoryName.trim();
    if (!name) { setCategoryError('Enter a category name.'); return; }
    if (categories.some(c => c.name.toLowerCase() === name.toLowerCase() && c.id !== editingCategoryId)) { setCategoryError('A category with this name already exists.'); return; }
    if (editingCategoryId) await db.categories.update(editingCategoryId, { name });
    else await db.categories.add({ id: crypto.randomUUID(), companyId, name, active: true, sortOrder: categories.length });
    setCategoryName(''); setEditingCategoryId(null); setCategoryError('');
  }
  async function toggleCategory(category: Category) {
    const directUsed = await db.transactions.where('categoryId').equals(category.id).count();
    const splitUsed = await db.transactionSplits.where('categoryId').equals(category.id).count();
    const used = directUsed + splitUsed;
    if (category.active && used && !window.confirm(`This category is used by ${used} transaction allocation(s). Deactivate it? Existing records will be preserved.`)) return;
    await db.categories.update(category.id, { active: !category.active });
  }

  return <div className="shell">
    <aside className="sidebar"><div className="brand"><div className="brand-mark">MC</div><div><strong>My Company Book</strong><small>CANADIAN CORPORATE BOOKKEEPING</small></div></div><div className="company-switch"><span className="company-dot"/><span>My Corporation</span><ChevronDown size={15}/></div>
      <nav>{nav.map(([label,Icon])=><button key={label} className={active===label?'nav-item active':'nav-item'} onClick={()=>setActive(label)}><Icon size={18}/><span>{label}</span></button>)}<button className={active==='Categories'?'nav-item active':'nav-item'} onClick={()=>setActive('Categories')}><Tags size={18}/><span>Categories</span></button></nav>
      <div className="sidebar-bottom"><div className="local-pill"><span/> Local database · Saved on this device</div><button className="nav-item" onClick={()=>setActive('Settings')}><Settings size={18}/>Settings</button></div>
    </aside>
    <main className="main"><header className="topbar"><div className="breadcrumb">My Company Book <span>/</span> {active}</div><div className="top-actions"><button className="icon-btn" aria-label="Notifications"><Bell size={18}/></button><div className="avatar">MC</div></div></header>
      <section className="content"><div className="page-heading"><div><div className="eyebrow">CORPORATE FINANCE</div><h1>{active}</h1><p>{active === 'Transactions' ? 'Record, review and categorise your company activity.' : active === 'Categories' ? 'Manage the categories used to organise your transactions.' : 'Your company finances, organised in one place.'}</p></div>{(active === 'Dashboard' || active === 'Transactions') && <button className="primary-btn" onClick={openNewTransaction}><Plus size={17}/> New transaction</button>}</div>
      {active === 'Dashboard' && <>
        <div className="stats-grid">{[['Total expenses',money(expenses),'Recorded expenses'],['Total income',money(income),'Recorded income'],['Net result',money(income-expenses),'Income minus expenses'],['Needs attention',String(uncategorised),'Uncategorised expenses']].map(([label,value,sub])=><div className="stat-card" key={label}><span>{label}</span><strong>{value}</strong><small>{sub}</small></div>)}</div>
        <div className="dashboard-grid"><div className="panel"><div className="panel-head"><div><h2>Recent activity</h2><p>Latest recorded transactions</p></div><button className="text-btn" onClick={()=>setActive('Transactions')}>View all</button></div>{sortedTransactions.length ? <div className="recent-list">{sortedTransactions.slice(0,5).map(t=><div className="recent-row" key={t.id}><div className="recent-icon"><Wallet size={16}/></div><div className="recent-info"><strong>{t.description}</strong><small>{t.transactionDate} · {categoryNameFor(t.categoryId)}</small></div><b className={t.transactionType==='income'?'positive':''}>{t.transactionType==='income'?'+':'−'}{money(t.amount)}</b></div>)}</div> : <div className="empty-state"><div className="empty-icon"><Receipt size={22}/></div><strong>No transactions yet</strong><span>Add your first transaction or import a statement later.</span></div>}</div>
          <div className="panel"><div className="panel-head"><div><h2>Expenses by category</h2><p>Recorded expense allocation</p></div></div>{expenses ? <div className="category-summary">{categories.filter(c=>c.active).map(c=>{const total=transactions.filter(t=>t.transactionType==='expense' && t.categoryId===c.id).reduce((sum,t)=>sum+t.amount,0)+splits.filter(s=>s.categoryId===c.id).reduce((sum,s)=>sum+s.amount,0);return total>0?<div className="category-bar" key={c.id}><div><span>{c.name}</span><b>{money(total)}</b></div><i><span style={{width:`${Math.min(100,total/expenses*100)}%`}}/></i></div>:null;})}</div>:<div className="empty-state"><div className="empty-icon"><Receipt size={22}/></div><strong>No expense data yet</strong><span>Recorded expenses will appear here.</span></div>}</div></div>
        <div className="panel recent"><div className="panel-head"><div><h2>Bookkeeping overview</h2><p>{transactions.length} transaction(s) saved locally</p></div><button className="text-btn" onClick={()=>setActive('Categories')}>Manage categories</button></div></div>
      </>}
      {active === 'Transactions' && <div className="panel"><div className="toolbar"><div className="search-box"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search description, payee or notes"/></div><select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}><option value="all">All types</option>{transactionTypes.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}</select><select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)}><option value="all">All categories</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><span className="result-count">{filteredTransactions.length} records</span></div>
        {filteredTransactions.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Date</th><th>Description</th><th>Account</th><th>Type</th><th>Category</th><th className="numeric">Amount</th><th>Status</th><th></th></tr></thead><tbody>{filteredTransactions.map(t=>{const tSplits=splits.filter(s=>s.transactionId===t.id);return <tr key={t.id}><td>{t.transactionDate}</td><td><strong>{t.description}</strong>{t.payee&&<small>{t.payee}</small>}</td><td>{accountName(t.accountId)}</td><td><span className="type-chip">{transactionTypes.find(x=>x.value===t.transactionType)?.label}</span></td><td>{tSplits.length ? <span>{tSplits.length} categories</span> : categoryNameFor(t.categoryId)}</td><td className={`numeric amount-cell ${t.transactionType==='income'?'positive':''}`}>{t.transactionType==='income'?'+':t.transactionType==='expense'?'−':''}{money(t.amount)}</td><td><span className="status-chip">Needs review</span></td><td><div className="row-actions"><button title="Edit" onClick={()=>openEditTransaction(t)}><Pencil size={15}/></button><button title="Delete" onClick={()=>deleteTransaction(t)}><Trash2 size={15}/></button></div></td></tr>;})}</tbody></table></div> : <div className="table-empty"><Search size={19}/><span>{transactions.length ? 'No transactions match these filters.' : 'No transactions yet. Add one manually to get started.'}</span></div>}</div>}
      {active === 'Categories' && <div className="panel categories-panel"><div className="category-form"><div><h2>{editingCategoryId ? 'Rename category' : 'Add a category'}</h2><p>Categories already used by transactions are preserved when deactivated.</p></div><div className="category-add"><input value={categoryName} onChange={e=>setCategoryName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void saveCategory();}} placeholder="Category name"/><button className="primary-btn" onClick={()=>void saveCategory()}><Plus size={16}/>{editingCategoryId?'Save':'Add category'}</button>{editingCategoryId&&<button className="icon-btn" onClick={()=>{setEditingCategoryId(null);setCategoryName('');setCategoryError('');}}><X size={17}/></button>}</div>{categoryError&&<div className="form-error">{categoryError}</div>}</div><div className="category-list-head"><strong>{categories.filter(c=>c.active).length} active categories</strong><label><input type="checkbox" checked={showInactive} onChange={e=>setShowInactive(e.target.checked)}/> Show inactive</label></div><div className="category-list">{categories.filter(c=>showInactive||c.active).map(c=><div className={`category-item ${!c.active?'inactive':''}`} key={c.id}><div><strong>{c.name}</strong><small>{c.active?'Active':'Inactive'}</small></div><div className="row-actions"><button title="Rename" onClick={()=>{setEditingCategoryId(c.id);setCategoryName(c.name);setCategoryError('');}}><Pencil size={15}/></button><button title={c.active?'Deactivate':'Restore'} onClick={()=>void toggleCategory(c)}>{c.active?<X size={16}/>:<Check size={16}/>}</button></div></div>)}</div></div>}
      {active === 'Receipts & Documents' && <DocumentInbox/>}
      {!['Dashboard','Transactions','Categories','Receipts & Documents'].includes(active) && <div className="panel module-placeholder"><div className="empty-icon"><Receipt size={22}/></div><h2>{active}</h2><p>This module is planned for a later development step. Your transaction and category data is already stored locally.</p><button className="secondary-btn" onClick={()=>setActive('Dashboard')}>Back to dashboard</button></div>}
      </section>
    </main>
    {modalOpen && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModalOpen(false);}}><form className="transaction-modal" onSubmit={saveTransaction}><div className="modal-head"><div><h2>{editing?'Edit transaction':'New transaction'}</h2><p>All fields are stored locally on this device.</p></div><button type="button" className="icon-btn" onClick={()=>setModalOpen(false)}><X size={19}/></button></div><div className="form-grid"><label>Date<input type="date" value={draft.transactionDate} onChange={e=>setDraft({...draft,transactionDate:e.target.value})} required/></label><label>Type<select value={draft.transactionType} onChange={e=>setDraft({...draft,transactionType:e.target.value as TransactionType,categoryId:''})}>{transactionTypes.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}</select></label><label className="full-field">Description<input value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})} placeholder="e.g. Office supplies" required/></label><label>Payee / Merchant<input value={draft.payee} onChange={e=>setDraft({...draft,payee:e.target.value})} placeholder="Optional"/></label><label>Account<select value={draft.accountId} onChange={e=>setDraft({...draft,accountId:e.target.value})} required>{accounts.map((a:Account)=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label><label>Amount (CAD)<input type="number" min="0.01" step="0.01" value={draft.amount} onChange={e=>setDraft({...draft,amount:e.target.value})} placeholder="0.00" required/></label><label>Tax amount (CAD)<input type="number" min="0" step="0.01" value={draft.taxAmount} onChange={e=>setDraft({...draft,taxAmount:e.target.value})} placeholder="Optional"/></label>{draft.transactionType==='expense'&&<label className="full-field">Category<select value={draft.categoryId} onChange={e=>setDraft({...draft,categoryId:e.target.value})} disabled={draft.splits.length>0}><option value="">Uncategorised</option>{activeCategories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}<label className="full-field">Notes<textarea value={draft.notes} onChange={e=>setDraft({...draft,notes:e.target.value})} rows={2} placeholder="Optional notes"/></label></div>
      {draft.transactionType==='expense'&&<div className="split-section"><div className="split-heading"><div><strong>Split transaction</strong><small>Allocate one transaction across multiple categories.</small></div><button type="button" className="secondary-btn" onClick={()=>setDraft({...draft,categoryId:'',splits:[...draft.splits,{categoryId:'',amount:'',taxAmount:''}]})}><Plus size={14}/> Add split</button></div>{draft.splits.map((s,i)=><div className="split-row" key={i}><select value={s.categoryId} onChange={e=>setDraft({...draft,splits:draft.splits.map((x,j)=>j===i?{...x,categoryId:e.target.value}:x)})}><option value="">Choose category</option>{activeCategories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><input type="number" min="0.01" step="0.01" placeholder="Amount" value={s.amount} onChange={e=>setDraft({...draft,splits:draft.splits.map((x,j)=>j===i?{...x,amount:e.target.value}:x)})}/><button type="button" className="icon-btn" onClick={()=>setDraft({...draft,splits:draft.splits.filter((_,j)=>j!==i)})}><Trash2 size={15}/></button></div>)}{draft.splits.length>0&&<div className="split-total">Allocated: {money(draft.splits.reduce((sum,s)=>sum+(Number(s.amount)||0),0))} / {money(Number(draft.amount)||0)}</div>}</div>}
      {formError&&<div className="form-error"><AlertCircle size={15}/>{formError}</div>}<div className="modal-footer"><button type="button" className="secondary-btn" onClick={()=>setModalOpen(false)}>Cancel</button><button type="submit" className="primary-btn"><Check size={16}/>{editing?'Save changes':'Save transaction'}</button></div></form></div>}
  </div>;
}
