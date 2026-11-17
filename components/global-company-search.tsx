'use client';
import {useEffect,useId,useState} from 'react';
import Link from 'next/link';
import type {LeiEntity} from '@/lib/gleif';
export default function GlobalCompanySearch(){
 const [query,setQuery]=useState('');const [results,setResults]=useState<LeiEntity[]>([]);
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [total,setTotal]=useState<number|null>(null);const [open,setOpen]=useState(false);
 const id=useId();
 useEffect(()=>{
  const q=query.trim();
  if(q.length<2){setResults([]);setMessage('');setTotal(null);setBusy(false);return;}
  const controller=new AbortController();
  const timer=setTimeout(async()=>{
   setBusy(true);setMessage('');
   try{
    const res=await fetch('/api/lei/search?q='+encodeURIComponent(q),{signal:controller.signal});
    const data=await res.json();
    if(controller.signal.aborted)return;
    if(!res.ok)throw new Error(data.message||'Entity lookup temporarily unavailable.');
    setResults(Array.isArray(data.results)?data.results:[]);setTotal(Number.isFinite(data.total)?data.total:0);
    if(!data.results?.length)setMessage('No matching LEI registered entity in this search. This does not mean the company does not exist.');
   }catch(e){
    if(!controller.signal.aborted){setResults([]);setMessage(e instanceof Error?e.message:'Search unavailable.');setTotal(null);}
   }finally{if(!controller.signal.aborted)setBusy(false);}
  },320);
  return()=>{controller.abort();clearTimeout(timer)};
 },[query]);
 return <div className="lei-search-widget">
  <div className="lei-search-input-shell"><span aria-hidden="true">⌕</span><input id={id} type="search" role="combobox" aria-expanded={open&&query.trim().length>=2} aria-controls={id+'-results'} aria-autocomplete="list" aria-label="Search global LEI legal entity records" placeholder="Search a legal company name…" autoComplete="off" value={query} onChange={e=>{setQuery(e.target.value);setOpen(true)}} onFocus={()=>setOpen(true)} onKeyDown={e=>{if(e.key==='Escape')setOpen(false)}}/>
   {busy&&<span className="lei-search-busy">SEARCHING</span>}
   {!busy&&query&&<button type="button" onClick={()=>{setQuery('');setResults([]);setMessage('');setOpen(false);setTotal(null)}} aria-label="Clear global entity search">×</button>}
  </div>
  {open&&query.trim().length>=2&&<div className="lei-results" role="listbox" id={id+'-results'} aria-label="Global legal entity results">
   <div className="lei-results-head"><span>{busy?'QUERYING GLEIF':total!==null?total+' matching LEI records':'GLEIF / GLOBAL IDENTITY'}</span><span>DATA SOURCE: GLEIF</span></div>
   {results.map(e=><Link key={e.lei} href={'/lei/'+e.lei} role="option" aria-selected={false} onClick={()=>setOpen(false)}>
    <span className="lei-item-logo" aria-hidden="true">◇</span><span className="lei-item-main"><strong>{e.name}</strong><small>{e.country||e.jurisdiction||'Jurisdiction not specified'} · LEI {e.lei}</small></span>
    <span className={'lei-item-status'+(e.registrationStatus==='ISSUED'?' issued':'')}>{e.registrationStatus||'UNKNOWN'}</span><span aria-hidden="true">↗</span>
   </Link>)}
   {message&&<div className="lei-result-empty" role="status">{message} <a href="https://search.gleif.org/" target="_blank" rel="noopener noreferrer">Search at GLEIF ↗</a></div>}
   {busy&&results.length===0&&<div className="lei-result-empty" role="status">Checking the global LEI reference database…</div>}
  </div>}
  <div className="lei-search-footnote"><span className="lei-search-indicator"/> Global LEI identity reference data · no account needed · not a financial audit or share-price feed.</div>
 </div>;
}
