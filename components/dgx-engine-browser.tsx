'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
type Counts={leiEntities:number;secTickerAssociations:number;secFinancialFacts:number;researchRuns:number};
type Status={connected:boolean;status:string;counts:Counts|null;aiConfigured?:boolean;note:string};
type Result={source:'GLEIF'|'SEC';identifier:string;name:string;country:string;status?:string;
 sourceUrl:string;ticker?:string;exchange?:string};
export default function DgxEngineBrowser(){
 const [status,setStatus]=useState<Status|null>(null);
 const [q,setQ]=useState('');
 const [country,setCountry]=useState('');
 const [records,setRecords]=useState<Result[]>([]);
 const [busy,setBusy]=useState(false);
 const [searched,setSearched]=useState(false);
 const [error,setError]=useState('');
 useEffect(()=>{
  const abort=new AbortController();
  fetch('/api/engine/status',{signal:abort.signal,cache:'no-store'})
   .then(r=>r.json()).then(s=>{if(!abort.signal.aborted)setStatus(s as Status);})
   .catch(()=>{if(!abort.signal.aborted)setStatus({connected:false,status:'unavailable',counts:null,
    note:'Private engine status could not be checked.'});});
  return ()=>abort.abort();
 },[]);
 async function search(){
  const term=q.trim();if(term.length<2||term.length>100)return;
  setBusy(true);setError('');setSearched(false);
  try{
   const params=new URLSearchParams({q:term,limit:'30'});
   if(country)params.set('country',country);
   const res=await fetch('/api/engine/search?'+params.toString(),{cache:'no-store'});
   if(!res.ok)throw new Error('unavailable');
   const result=await res.json() as {records?:Result[]};
   setRecords(result.records||[]);setSearched(true);
  }catch{setRecords([]);setError('The DGX catalogue could not complete this search. Use the live registry while connectivity is restored.');}
  finally{setBusy(false);}
 }
 return <div className="cq-engine-shell">
  <div className="cq-engine-summary">
   <div><span className="eyebrow">PRIVATE DATA ENGINE / STORAGE STATUS</span>
    <h2>{status?.connected?'Your private intelligence infrastructure is connected.':'Source discovery remains available.'}</h2>
    <p>{status?.note||'Checking the private CREQOR intelligence service.'}</p></div>
   <Link href="/directory">Open live worldwide GLEIF search ↗</Link>
  </div>
  {status?.connected&&status.counts?<div className="cq-engine-stats" aria-label="Private DGX stored-record counts">
   {[
    ['Imported LEI entities',status.counts.leiEntities],
    ['SEC ticker associations',status.counts.secTickerAssociations],
    ['SEC financial fact rows',status.counts.secFinancialFacts],
    ['Saved research analyses',status.counts.researchRuns]
   ].map(([label,value])=><div key={String(label)}>
    <strong>{new Intl.NumberFormat('en-US').format(Number(value))}</strong><span>{label}</span>
   </div>)}
  </div>:<div className="cq-engine-unconfigured"><strong>Not yet connected</strong>
   <p>No records are attributed to DGX until its database, migrations and authenticated HTTPS gateway are operational. Global legal-entity discovery still works independently.</p>
  </div>}
  {status?.connected&&<form className="cq-engine-search" onSubmit={e=>{e.preventDefault();void search();}}>
   <label htmlFor="cq-dgx-name">Search the private company index</label>
   <div><input id="cq-dgx-name" type="search" value={q} onChange={e=>setQ(e.target.value)}
     placeholder="Legal company name or SEC ticker" minLength={2} maxLength={100}/>
    <select value={country} onChange={e=>setCountry(e.target.value)} aria-label="Country">
     <option value="">All countries</option>
     {['US','IN','AE','GB','DE','JP','SG','SA','ZA','NA','AU','CA','FR','BR','VN','TZ']
      .map(c=><option key={c} value={c}>{c}</option>)}
    </select>
    <button type="submit" disabled={busy||q.trim().length<2}>{busy?'Searching…':'Search indexed records'}</button></div>
   </form>}
  {error&&<p role="alert" className="cq-engine-error">{error}</p>}
  {searched&&<div className="cq-engine-results" aria-label="Source-linked indexed search results">
   {records.length?records.map((r,i)=><div key={r.source+':'+r.identifier+':'+i} className="cq-engine-result">
    <span className="cq-engine-record-tag">{r.source}</span>
    <div><strong>{r.name}</strong><small>{r.country} · {r.source==='SEC'?'CIK '+r.identifier+(r.ticker?' · '+r.ticker:''):'LEI '+r.identifier}</small></div>
    <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer">Original record ↗</a>
   </div>):<p>No matching stored records. Try the live directory; GLEIF coverage is larger than this local index.</p>}
   </div>}
  <p className="cq-engine-caveat">Identity records do not establish beneficial ownership, live market prices, valuations or regulated credit ratings. SEC financial statements are registrant-reported and must be compared using their exact periods and filing dates.</p>
 </div>;
}
