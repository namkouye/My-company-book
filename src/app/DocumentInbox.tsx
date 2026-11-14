import { useEffect, useState } from 'react';
import Papa from 'papaparse';
import { db } from '../database/db';
import type { StoredDocument } from '../types/documents';
import type { Account, Transaction } from '../types';
import { readDocument, type ReadProgress } from '../services/documents/readDocument';
import { UploadCloud, FileText, Image as ImageIcon, FileSpreadsheet, Search, CheckCircle2, AlertCircle, Trash2, ArrowRight, LoaderCircle, ScanText, Eye, ChevronDown, ChevronUp } from 'lucide-react';

type CsvRow = Record<string,string>;
const money=(v:string)=>{ const n=Number(String(v??'').replace(/[$,\s]/g,'').replace(/[()]/g,'-')); return Number.isFinite(n)?Math.abs(n):0; };
const norm=(v:string)=>v.toLowerCase().replace(/[^a-z0-9]/g,'');
const pick=(row:CsvRow, terms:string[])=>{ const key=Object.keys(row).find(k=>terms.some(t=>norm(k).includes(t))); return key?row[key]:''; };
const fmt=(value?:number)=>value==null?'—':new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(value);

export default function DocumentInbox(){
 const [docs,setDocs]=useState<StoredDocument[]>([]);
 const [transactions,setTransactions]=useState<Transaction[]>([]);
 const [accounts,setAccounts]=useState<Account[]>([]);
 const [busy,setBusy]=useState(false);
 const [busyDoc,setBusyDoc]=useState<string|null>(null);
 const [message,setMessage]=useState('');
 const [query,setQuery]=useState('');
 const [progress,setProgress]=useState<ReadProgress|null>(null);
 const [expanded,setExpanded]=useState<string|null>(null);

 const reload=async()=>{
   const [d,t,a]=await Promise.all([
     db.documents.orderBy('uploadedAt').reverse().toArray(),
     db.transactions.toArray(),
     db.accounts.toArray()
   ]);
   setDocs(d);setTransactions(t);setAccounts(a);
 };
 useEffect(()=>{void reload();},[]);
 const companyId=async()=> (await db.companies.toArray())[0]?.id ?? 'local-company';

 const addFiles=async(files:FileList|null)=>{
   if(!files?.length)return;
   setBusy(true);setMessage('');
   try{
     const cid=await companyId();
     for(const file of Array.from(files)){
       const lower=file.name.toLowerCase();
       const kind=file.type==='text/csv'||lower.endsWith('.csv')?'bank_statement':
         file.type==='application/pdf'?'other':
         file.type.startsWith('image/')?'receipt':'other';
       await db.documents.add({
         id:crypto.randomUUID(),companyId:cid,kind,fileName:file.name,
         mimeType:file.type||'application/octet-stream',size:file.size,
         blob:file,uploadedAt:new Date().toISOString(),reviewStatus:'new'
       });
     }
     await reload();setMessage(`${files.length} document(s) added to your local inbox.`);
   }catch(e){setMessage(e instanceof Error?e.message:'Upload failed.');}
   finally{setBusy(false);}
 };

 const importCsv=async(doc:StoredDocument)=>{
   setBusy(true);setMessage('');
   try{
     const text=await doc.blob.text();
     const parsed=Papa.parse<CsvRow>(text,{header:true,skipEmptyLines:true,dynamicTyping:false});
     if(parsed.errors.length)throw new Error(parsed.errors[0].message);
     const rows=parsed.data;
     if(!rows.length)throw new Error('No transaction rows found in this CSV.');
     let account=accounts.find(a=>a.accountType==='bank');
     const cid=await companyId();
     if(!account){
       account={id:crypto.randomUUID(),companyId:cid,name:'Imported bank account',accountType:'bank',currency:'CAD',openingBalance:0,active:true};
       await db.accounts.add(account);setAccounts([account]);
     }
     let added=0,dupes=0;
     for(const row of rows){
       const date=pick(row,['date','transactiondate','posted']);
       const desc=pick(row,['description','details','payee','merchant','memo']);
       const debit=money(pick(row,['debit','withdrawal','outflow']));
       const credit=money(pick(row,['credit','deposit','inflow']));
       const amountRaw=pick(row,['amount','transactionamount']);
       const amount=debit||credit||money(amountRaw);
       if(!date||!desc||!amount)continue;
       const parsedDate=new Date(date);
       const dateIso=Number.isNaN(parsedDate.getTime())?date:parsedDate.toISOString().slice(0,10);
       const exists=await db.transactions.where('accountId').equals(account.id).filter(t=>t.transactionDate===dateIso&&Math.abs(t.amount)===amount&&norm(t.description)===norm(desc)).first();
       if(exists){dupes++;continue;}
       const tx:Transaction={
         id:crypto.randomUUID(),companyId:cid,accountId:account.id,
         transactionDate:dateIso,description:desc,originalDescription:desc,
         transactionType:debit?'expense':credit?'income':'other',amount,
         currency:account.currency,debit:debit||undefined,credit:credit||undefined,
         status:'needs_review',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()
       };
       await db.transactions.add(tx);added++;
     }
     await db.documents.update(doc.id,{reviewStatus:'needs_review'});
     await reload();
     setMessage(`Imported ${added} transactions. ${dupes} likely duplicates skipped. Please review the imported rows.`);
   }catch(e){setMessage(e instanceof Error?e.message:'Could not import this CSV. Check its columns.');}
   finally{setBusy(false);}
 };

 const extract=async(doc:StoredDocument)=>{
   setBusyDoc(doc.id);setProgress(null);setMessage('');
   try{
     const result=await readDocument(doc.blob,doc.mimeType,setProgress);
     await db.documents.update(doc.id,{
       extractedText:result.text,
       extractedDate:result.date,
       extractedMerchant:result.merchant,
       extractedSubtotal:result.subtotal,
       extractedTax:result.tax,
       extractedTotal:result.total,
       extractionSource:result.source,
       reviewStatus:'needs_review'
     });
     await reload();
     setExpanded(doc.id);
     setMessage(`Text extracted from ${doc.fileName}. Review the suggested fields.`);
   }catch(e){setMessage(e instanceof Error?e.message:'Could not read this document.');}
   finally{setBusyDoc(null);setProgress(null);}
 };

 const matchReceipt=async(doc:StoredDocument,tx:Transaction)=>{
   await db.documents.update(doc.id,{reviewStatus:'matched',matchedTransactionId:tx.id});
   await db.receipts.add({
     id:crypto.randomUUID(),companyId:doc.companyId,transactionId:tx.id,
     fileName:doc.fileName,mimeType:doc.mimeType,size:doc.size,
     blob:doc.blob,uploadedAt:new Date().toISOString()
   });
   await reload();
 };
 const remove=async(doc:StoredDocument)=>{
   if(!window.confirm(`Delete ${doc.fileName} from this browser?`))return;
   await db.documents.delete(doc.id);await reload();
 };
 const filtered=docs.filter(d=>d.fileName.toLowerCase().includes(query.toLowerCase()));
 const suggestions=(doc:StoredDocument)=>{
   if(doc.matchedTransactionId)return [];
   const ranked=[...transactions].map(tx=>{
     let score=0;
     if(doc.extractedDate&&tx.transactionDate===doc.extractedDate)score+=2;
     if(doc.extractedTotal!=null&&Math.abs(tx.amount-doc.extractedTotal)<0.02)score+=3;
     if(doc.extractedMerchant&&norm(tx.description).includes(norm(doc.extractedMerchant)))score+=1;
     return {tx,score};
   }).sort((a,b)=>b.score-a.score);
   return ranked.slice(0,5).map(x=>x.tx);
 };

 return <div className="inbox-page">
   <div className="inbox-intro">
     <div><div className="eyebrow">DOCUMENT WORKFLOW</div><h2>Drop documents. We organise the paperwork.</h2>
       <p>Import bank CSV statements and read PDF statements, receipts and invoices. Extracted information stays in this browser and must be reviewed before bookkeeping use.</p>
     </div>
     <label className="inbox-upload"><UploadCloud size={18}/> Upload documents
       <input type="file" multiple accept=".csv,.pdf,image/png,image/jpeg,image/webp" onChange={e=>void addFiles(e.target.files)}/>
     </label>
   </div>
   <div className="inbox-note"><AlertCircle size={17}/><span><strong>Local-first:</strong> document contents are processed in your browser. The first OCR run downloads the English and French recognition models from the Tesseract delivery service; your receipt image itself is not sent to that service. Keep sensitive files out of GitHub.</span></div>
   <div className="inbox-stats">
     <div><span>Documents</span><strong>{docs.length}</strong></div>
     <div><span>Transactions available to match</span><strong>{transactions.length}</strong></div>
     <div><span>Need review</span><strong>{docs.filter(d=>d.reviewStatus!=='matched').length}</strong></div>
   </div>
   <div className="inbox-toolbar">
     <div className="inbox-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search documents"/></div>
     <span>{busy?<><LoaderCircle size={15} className="spin"/> Processing…</>:message}</span>
   </div>
   {progress&&<div className="doc-progress"><span>{progress.message}</span><div><i style={{width:`${Math.round((progress.progress??0)*100)}%`}}/></div></div>}
   <div className="inbox-list">
     {filtered.length===0?<div className="inbox-empty"><UploadCloud size={30}/><strong>Your document inbox is empty</strong><span>Start by uploading a bank CSV, a PDF statement or a receipt photo.</span></div>:
     filtered.map(doc=>{
       const canRead=doc.mimeType==='application/pdf'||doc.mimeType.startsWith('image/');
       const matches=suggestions(doc);
       return <article className="document-card" key={doc.id}>
         <div className="doc-icon">{doc.kind==='bank_statement'?<FileSpreadsheet/>:doc.mimeType.startsWith('image/')?<ImageIcon/>:<FileText/>}</div>
         <div className="doc-main">
           <strong>{doc.fileName}</strong>
           <small>{doc.kind.replace('_',' ')} · {(doc.size/1024).toFixed(0)} KB · {new Date(doc.uploadedAt).toLocaleString()}</small>
           <div className="doc-status">{doc.reviewStatus==='matched'?<><CheckCircle2 size={14}/> Linked to transaction</>:doc.extractedText?<><CheckCircle2 size={14}/> Text extracted · Needs review</>:<><AlertCircle size={14}/> Awaiting processing or review</>}</div>
         </div>
         <div className="doc-actions">
           {doc.fileName.toLowerCase().endsWith('.csv')&&<button className="secondary-btn" disabled={busy} onClick={()=>void importCsv(doc)}>Import transactions</button>}
           {canRead&&<button className="secondary-btn" disabled={busyDoc===doc.id||busy} onClick={()=>void extract(doc)}>{busyDoc===doc.id?<><LoaderCircle size={14} className="spin"/> Reading…</>:<><ScanText size={14}/> {doc.extractedText?'Read again':'Read document'}</>}</button>}
           <button className="icon-btn" aria-label="Delete document" onClick={()=>void remove(doc)}><Trash2 size={16}/></button>
         </div>
         {doc.extractedText&&<div className="doc-extracted">
           <button className="doc-expand" onClick={()=>setExpanded(expanded===doc.id?null:doc.id)}>
             <span><Eye size={15}/> Extracted information <small>({doc.extractionSource==='ocr'?'OCR':doc.extractionSource==='pdf-text'?'PDF text':'PDF + OCR'})</small></span>
             {expanded===doc.id?<ChevronUp size={16}/>:<ChevronDown size={16}/>}
           </button>
           {expanded===doc.id&&<>
             <div className="doc-fields">
               <div><small>Date</small><strong>{doc.extractedDate??'Not detected'}</strong></div>
               <div><small>Merchant / supplier</small><strong>{doc.extractedMerchant??'Not detected'}</strong></div>
               <div><small>Subtotal</small><strong>{fmt(doc.extractedSubtotal)}</strong></div>
               <div><small>Tax</small><strong>{fmt(doc.extractedTax)}</strong></div>
               <div><small>Total</small><strong>{fmt(doc.extractedTotal)}</strong></div>
             </div>
             <details className="doc-text"><summary>View extracted text</summary><pre>{doc.extractedText}</pre></details>
             <p className="doc-review-warning">These are automatic suggestions, not verified accounting entries. Check the original document before using the values.</p>
           </>}
         </div>}
         {doc.reviewStatus!=='matched'&&(doc.kind==='receipt'||doc.mimeType==='application/pdf')&&transactions.length>0&&<div className="doc-match">
           <strong>Potential transactions to attach this document to</strong>
           {matches.map(tx=><div className="match-row" key={tx.id}>
             <span>{tx.transactionDate} · {tx.description} · {tx.currency} {tx.amount.toFixed(2)}</span>
             <button className="text-btn" onClick={()=>void matchReceipt(doc,tx)}>Attach receipt <ArrowRight size={14}/></button>
           </div>)}
         </div>}
       </article>;
     })}
   </div>
   <p className="inbox-footnote">PDFs with selectable text are read directly. Scanned PDFs and photos use OCR (English and French models in this version). Extraction is heuristic and may miss or misread dates, merchants and taxes. Bank-statement PDF-to-transaction import and automatic matching are not enabled yet; CSV remains the transaction import format.</p>
 </div>;
}
