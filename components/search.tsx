'use client';
import {useEffect,useId,useState} from 'react';
import Link from 'next/link';
type Entity={cik:string;name:string;ticker:string;exchange:string};
export default function CompanySearch({variant='hero'}:{variant?:'hero'|'full'}){
 const [q,setQ]=useState('');const [results,setResults]=useState<Entity[]>([]);
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [open,setOpen]=useState(false);const [registryUnavailable,setRegistryUnavailable]=useState(false);
 const id=useId();
 useEffect(()=>{
   const value=q.trim();
   if(value.length<2){setResults([]);setMessage('');setBusy(false);setRegistryUnavailable(false);return;}
   const controller=new AbortController();
   const timer=setTimeout(async()=>{
    setBusy(true);
    try{
     const response=await fetch('/api/search?q='+encodeURIComponent(value),{signal:controller.signal});
     const data=await response.json();
     if(!controller.signal.aborted){
       setResults(Array.isArray(data.results)?data.results:[]);
       setRegistryUnavailable(!response.ok);
       setMessage(data.message||(!data.results?.length?'No matching issuer found in the available US SEC registry.':''));
     }
    }catch{if(!controller.signal.aborted){setResults([]);setRegistryUnavailable(true);setMessage('The connected registry is not available yet. You can continue through the SEC directly.');}}
    finally{if(!controller.signal.aborted)setBusy(false);}
   },270);
   return()=>{clearTimeout(timer);controller.abort()};
 },[q]);
 return <div className={'company-search search-variant-'+variant}>
  <div className="search-input-wrap">
   <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="10.8" cy="10.8" r="7.3"/><path d="m16 16 5 5"/></svg>
   <input id={id} role="combobox" aria-expanded={open&&q.trim().length>=2} aria-controls={id+'-results'} aria-autocomplete="list"
     value={q} onChange={e=>{setQ(e.target.value);setOpen(true)}} onFocus={()=>setOpen(true)}
     onKeyDown={e=>{if(e.key==='Escape'){setOpen(false);(e.target as HTMLInputElement).blur()}}}
     aria-label="Search official US company registry" placeholder="Search by company, ticker or CIK…" autoComplete="off"/>
   {q?<button className="v2-search-clear" type="button" onClick={()=>{setQ('');setResults([]);setOpen(false);setMessage('');setRegistryUnavailable(false)}} aria-label="Clear search">×</button>:null}
   <span className="search-hint">{busy?'SEARCHING…':'US / SEC'}</span>
  </div>
  {open&&q.trim().length>=2&&<div id={id+'-results'} className="search-results" role="listbox" aria-label="Company matches">
   {results.map(e=><Link role="option" aria-selected={false} key={e.cik+'-'+e.ticker} href={'/company/'+e.cik} onClick={()=>setOpen(false)}>
    <span><strong>{e.name}</strong><small>{e.exchange} · CIK {e.cik}</small></span><span className="result-ticker">{e.ticker} ↗</span>
   </Link>)}{busy&&!results.length?<p>Searching official issuer records…</p>:null}{message&&<p role="status">{message}</p>}{registryUnavailable&&<a className="c3-sec-fallback" href="https://www.sec.gov/search-filings" target="_blank" rel="noopener noreferrer">Continue with the official SEC company search ↗</a>}
  </div>}
  <p className="search-footnote"><span className="status-dot"/> US SEC company lookup requires an active registry connection. No share prices are supplied here.</p>
 </div>;
}