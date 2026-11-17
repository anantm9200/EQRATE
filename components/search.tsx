'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
type Entity={cik:string;name:string;ticker:string;exchange:string};
export default function CompanySearch({variant='hero'}:{variant?:'hero'|'full'}){
 const [q,setQ]=useState('');const [results,setResults]=useState<Entity[]>([]);const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
 useEffect(()=>{
  if(q.trim().length<2){setResults([]);setMessage('');setBusy(false);return;}
  const controller=new AbortController();
  const timer=setTimeout(async()=>{
   setBusy(true);
   try{const res=await fetch('/api/search?q='+encodeURIComponent(q.trim()),{signal:controller.signal});
    const data=await res.json();if(!controller.signal.aborted){setResults(data.results||[]);setMessage(data.message||(!data.results?.length?'No matching SEC-listed entities found.':''));}
   }catch{if(!controller.signal.aborted){setResults([]);setMessage('Search temporarily unavailable.');}}
   finally{if(!controller.signal.aborted)setBusy(false);}
  },280);return()=>{clearTimeout(timer);controller.abort()};
 },[q]);
 return <div className={'company-search '+variant}>
   <div className="search-input-wrap"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="10.8" cy="10.8" r="7.3"/><path d="m16 16 5 5"/></svg>
   <input value={q} onChange={e=>setQ(e.target.value)} aria-label="Search public companies" placeholder="Company name, ticker or CIK..." autoComplete="off"/>
   <span className="search-hint">{busy?'SEARCHING':'US / SEC'}</span></div>
   {q.trim().length>=2&&<div className="search-results" role="status">{results.map(e=><Link key={e.cik+'-'+e.ticker} href={'/company/'+e.cik}><span><strong>{e.name}</strong><small>{e.exchange} · CIK {e.cik}</small></span><span className="result-ticker">{e.ticker} ↗</span></Link>)}{message&&<p>{message}</p>}</div>}
   <div className="search-footnote"><span className="status-dot"/> Official US company identities via SEC. Prices and valuations require separate evidence.</div>
 </div>;
}