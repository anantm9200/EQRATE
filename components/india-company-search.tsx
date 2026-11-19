'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';

type Option={code:string;label:string};
type Row={lei:string;name:string;registrationStatus:string;region:string|null;regionName:string|null;registeredAs:string;
 companyClass:string|null;companyClassLabel:string|null;listing:string|null;incorporationYear:number|null};
type Page={total:number;page:number;hasMore:boolean;records:Row[]};
const nf=new Intl.NumberFormat('en-IN');
/** Filterable search over Indian legal entities in the private index. */
export default function IndiaCompanySearch({regions,classes}:{regions:Option[];classes:Option[]}){
 const [q,setQ]=useState('');
 const [region,setRegion]=useState('');
 const [cls,setCls]=useState('');
 const [listing,setListing]=useState('');
 const [status,setStatus]=useState('ISSUED');
 const [page,setPage]=useState(1);
 const [data,setData]=useState<Page|null>(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const active=q.trim().length>=2||Boolean(region||cls||listing);
 useEffect(()=>{
  const term=q.trim();
  // Every criteria change cancels the previous request; no stale response can land.
  if(term.length===1||!active){setBusy(false);setError('');if(!active)setData(null);return;}
  const ctrl=new AbortController();
  let cancelled=false;
  const t=setTimeout(async()=>{
   setBusy(true);setError('');
   try{
    const p=new URLSearchParams({page:String(page)});
    if(term)p.set('q',term);if(region)p.set('region',region);if(cls)p.set('class',cls);
    if(listing)p.set('listing',listing);if(status)p.set('status',status);
    const r=await fetch('/api/engine/india/entities?'+p.toString(),{cache:'no-store',signal:ctrl.signal});
    if(!r.ok)throw new Error();
    const d=await r.json() as Page;
    if(!cancelled)setData(d);
   }catch{if(!cancelled){setData(null);setError('The India index is temporarily unavailable. The live GLEIF directory still works.');}}
   finally{if(!cancelled)setBusy(false);}
  },term?280:0);
  return ()=>{cancelled=true;clearTimeout(t);ctrl.abort();};
 },[q,region,cls,listing,status,page,active]);
 const reset=(f:()=>void)=>{f();setPage(1);};
 return <section className="in-search" aria-labelledby="in-search-title">
  <div className="in-section-head"><span className="in-kicker">SEARCH INDIAN COMPANIES</span>
   <h2 id="in-search-title">Find an Indian legal entity.</h2>
   <p>Search 4 lakh+ Indian LEI registrations by name, state, company class and CIN listing status. Every result opens a source-linked profile.</p></div>
  <form className="in-filters" onSubmit={e=>e.preventDefault()} role="search">
   <label className="in-field in-field-wide"><span>Company name starts with</span>
    <input type="search" value={q} onChange={e=>reset(()=>setQ(e.target.value))} placeholder="e.g. Tata, Reliance, Infosys" maxLength={90}/></label>
   <label className="in-field"><span>State / UT</span>
    <select value={region} onChange={e=>reset(()=>setRegion(e.target.value))}><option value="">All states</option>
     {regions.map(r=><option key={r.code} value={r.code}>{r.label}</option>)}</select></label>
   <label className="in-field"><span>Company class (CIN)</span>
    <select value={cls} onChange={e=>reset(()=>setCls(e.target.value))}><option value="">All classes</option>
     {classes.map(c=><option key={c.code} value={c.code}>{c.label}</option>)}</select></label>
   <label className="in-field"><span>Listing (CIN)</span>
    <select value={listing} onChange={e=>reset(()=>setListing(e.target.value))}><option value="">Any</option>
     <option value="L">Listed</option><option value="U">Unlisted</option></select></label>
   <label className="in-field"><span>LEI status</span>
    <select value={status} onChange={e=>reset(()=>setStatus(e.target.value))}><option value="">Any</option>
     <option value="ISSUED">Issued (current)</option><option value="LAPSED">Lapsed</option><option value="RETIRED">Retired</option></select></label>
  </form>
  <div className="in-results-meta" aria-live="polite">{busy?'Searching…':data?nf.format(data.total)+' matching entities':'Type at least two letters of a name, or choose a state, class or listing to begin.'}</div>
  {error&&<p className="cq-engine-error" role="alert">{error} <Link href="/directory?country=IN">Open live directory ↗</Link></p>}
  {data&&<ul className="in-results">
   {data.records.map(r=><li key={r.lei}><Link href={'/lei/'+r.lei}>
    <strong>{r.name}</strong>
    <span className="in-result-meta">{[r.regionName||r.region,r.companyClassLabel,r.listing,r.incorporationYear?'Inc. '+r.incorporationYear:null].filter(Boolean).join(' · ')||'Identifier not decoded'}</span>
    <span className="in-result-ids"><span>LEI {r.lei}</span>{r.registeredAs&&<span>{r.registeredAs}</span>}<span className={'in-pill'+(r.registrationStatus==='ISSUED'?'':' is-muted')}>{r.registrationStatus}</span></span>
   </Link></li>)}
   {!data.records.length&&<li className="in-empty">No Indian entities match these filters.</li>}
  </ul>}
  {data&&(data.page>1||data.hasMore)&&<div className="in-pager">
   <button type="button" disabled={page<=1||busy} onClick={()=>setPage(p=>p-1)}>← Previous</button>
   <span>Page {data.page}</span>
   <button type="button" disabled={!data.hasMore||busy} onClick={()=>setPage(p=>p+1)}>Next →</button></div>}
 </section>;
}
