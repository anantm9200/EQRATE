'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
type Company={lei:string;name:string|null;registrationStatus:string|null;addedAt:string;recordChangedAt:string|null;
 recordChangedPublication:string|null;changedSinceAdded:boolean;newFinancialDocuments:number;alert:boolean};
/** Changes in official records and stored evidence since each company was added to a watchlist. */
export default function WatchAlerts(){
 const [data,setData]=useState<Company[]|null>(null);const [error,setError]=useState('');
 useEffect(()=>{fetch('/api/workspace/alerts',{cache:'no-store'}).then(async r=>{
  if(!r.ok)throw new Error((await r.json().catch(()=>null))?.error||'Alerts unavailable.');
  setData((await r.json()).companies);}).catch(e=>{setError(e.message);setData([]);});},[]);
 if(data===null)return <p className="cq-engine-note">Checking your watched companies…</p>;
 if(error)return <p role="alert" className="ac-error">{error}</p>;
 if(!data.length)return <p className="cq-engine-note">No watched companies yet.</p>;
 const alerts=data.filter(c=>c.alert);
 return <><p className="cq-engine-note">{alerts.length?`${alerts.length} of ${data.length} watched companies have changes to review.`:`No changes since you added these ${data.length} companies.`}</p>
  <ul className="in-results">{data.map(c=><li key={c.lei} className="ac-item"><div>
   <Link href={'/lei/'+c.lei}><strong>{c.name||c.lei}</strong></Link>
   <span className="in-result-meta">{[c.changedSinceAdded?`Official record changed (publication ${c.recordChangedPublication?.slice(0,10)})`:null,
    c.newFinancialDocuments?`${c.newFinancialDocuments} new financial document(s)`:null,
    c.registrationStatus&&c.registrationStatus!=='ISSUED'?`LEI status ${c.registrationStatus}`:null].filter(Boolean).join(' · ')||'No change since added'}</span>
   <span className="in-result-ids">Added {c.addedAt.slice(0,10)}</span></div>
   {c.alert&&<span className="in-pill">Review</span>}</li>)}</ul></>;
}
