'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
type Counts={leiEntities:number;leiSourceVersions?:number;leiCountries?:number;secTickerAssociations:number;
 leiRelationships?:number|null;leiReportingExceptions?:number|null;indiaEntities?:number|null;indiaIssued?:number|null;
 secIssuers?:number;secFinancialFacts:number;secIssuersWithFinancials?:number;researchRuns:number};
type Run={runId:number;source?:string;status:string;publishDate:string|null;officialRecords:number|null;rowsRead:number;rowsValid:number;
 rowsRejected:number;rowsInserted:number;rowsChanged:number;finishedAt:string|null;retrievalPath:string|null};
type Status={connected:boolean;status:string;counts:Counts|null;aiConfigured?:boolean;note:string;databaseBytes?:number|null;
 freshness?:{gleif:Run[];staleNotInLatestPublication:number|null;sec:{status:string};
  jobs:{job:string;status:string;finishedAt:string|null}[]}|null;ai?:{configured:boolean;reachable:boolean;model:string|null}|null;
 latencyMs?:number;checkedAt?:string};
type Result={source:'GLEIF'|'SEC';identifier:string;name:string;country:string;status?:string;
 sourceUrl:string;ticker?:string;exchange?:string;matchType?:string};
type Flag={code:string;severity:'info'|'low'|'medium'|'high';title:string;explanation:string;evidence:Record<string,unknown>};
type Detail={entity:{lei:string;name:string;country:string;jurisdiction:string;status:string;registrationStatus:string;
  lastUpdate:string;nextRenewal:string;address:string;headquarters:string;category:string;registeredAs:string;
  legalForm?:string;otherNames?:string;initialRegistrationDate?:string;sourceUrl:string};
 provenance:{currentVersionPublishedAt:string|null;firstSeenAt:string;lastChangedAt:string;sourceSha256:string;
  latestCompletePublicationDate:string|null;presentInLatestPublication:boolean|null};
 versions:{observedAt:string;publishDate:string|null}[];flags:Flag[];missingFields:string[];
 secNameCandidates:{cik:string;name:string;ticker:string}[]};
type Research={sections:{deterministicCalculations:{deterministicSummary:string};
 aiInterpretation:{model:string;text:string;latencyMs:number}|null;missingOrUnverified:string[]};auditId:number;createdAt:string};
const fmt=(n:number|null|undefined)=>n===null||n===undefined?'—':new Intl.NumberFormat('en-US').format(n);
const day=(s:string|null|undefined)=>s?s.slice(0,10):'—';
export default function DgxEngineBrowser(){
 const [status,setStatus]=useState<Status|null>(null);
 const [q,setQ]=useState('');
 const [country,setCountry]=useState('IN');
 const [records,setRecords]=useState<Result[]>([]);
 const [origin,setOrigin]=useState<'dgx'|'live'>('dgx');
 const [busy,setBusy]=useState(false);
 const [searched,setSearched]=useState(false);
 const [error,setError]=useState('');
 const [detail,setDetail]=useState<Detail|null>(null);
 const [detailError,setDetailError]=useState('');
 const [token,setToken]=useState('');
 const [question,setQuestion]=useState('Summarise this entity’s identity evidence, data freshness and open questions.');
 const [research,setResearch]=useState<Research|null>(null);
 const [researchBusy,setResearchBusy]=useState(false);
 const [researchError,setResearchError]=useState('');
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
  setBusy(true);setError('');setSearched(false);setDetail(null);setResearch(null);
  try{
   const params=new URLSearchParams({q:term,limit:'30'});
   if(country)params.set('country',country);
   const res=await fetch('/api/engine/search?'+params.toString(),{cache:'no-store'});
   if(!res.ok)throw new Error('unavailable');
   const result=await res.json() as {records?:Result[]};
   setRecords(result.records||[]);setOrigin('dgx');setSearched(true);
  }catch{
   // Graceful degradation: the official live GLEIF API still answers when the DGX is unreachable.
   try{
    const live=await fetch('/api/lei/search?q='+encodeURIComponent(term),{cache:'no-store'});
    const data=await live.json() as {results?:{lei:string;name:string;country:string;registrationStatus:string;sourceUrl:string}[]};
    setRecords((data.results||[]).filter(r=>!country||r.country===country).map(r=>({source:'GLEIF',identifier:r.lei,name:r.name,
     country:r.country,status:r.registrationStatus,sourceUrl:r.sourceUrl})));
    setOrigin('live');setSearched(true);
    setError('The private index is unreachable, so these results come live from the official GLEIF API.');
   }catch{setRecords([]);setError('Neither the private index nor the live GLEIF API could complete this search.');}
  }
  finally{setBusy(false);}
 }
 async function inspect(lei:string){
  setDetail(null);setDetailError('');setResearch(null);setResearchError('');
  try{
   const r=await fetch('/api/engine/lei/'+lei,{cache:'no-store'});
   const d=await r.json();
   if(!r.ok)throw new Error((d as {error?:string}).error||'unavailable');
   setDetail(d as Detail);
  }catch(e){setDetailError(e instanceof Error?e.message:'Record unavailable.');}
 }
 async function runResearch(){
  if(!detail)return;
  setResearchBusy(true);setResearchError('');setResearch(null);
  try{
   const r=await fetch('/api/engine/lei/'+detail.entity.lei+'/research',{method:'POST',cache:'no-store',
    headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({question})});
   const d=await r.json();
   if(!r.ok)throw new Error((d as {error?:string}).error||'Research unavailable.');
   setResearch(d as Research);
  }catch(e){setResearchError(e instanceof Error?e.message:'Research unavailable.');}
  finally{setResearchBusy(false);}
 }
 const runs=status?.freshness?.gleif||[];
 const latest=runs.find(r=>!r.source||r.source==='GLEIF_GOLDEN_COPY');
 const rr=runs.find(r=>r.source==='GLEIF_RR');
 return <div className="cq-engine-shell">
  <div className="cq-engine-summary">
   <div><span className="eyebrow">PRIVATE DATA ENGINE / STORAGE STATUS</span>
    <h2>{status?.connected?'Your private intelligence infrastructure is connected.':'Source discovery remains available.'}</h2>
    <p>{status?.note||'Checking the private CREQOR intelligence service.'}</p></div>
   <Link href="/directory">Open live worldwide GLEIF search ↗</Link>
  </div>
  {status?.connected&&status.counts?<>
   <div className="cq-engine-stats" aria-label="Private DGX stored-record counts">
    {[
     ['Indian legal entities',status.counts.indiaEntities??null],
     ['Global legal entities (LEI)',status.counts.leiEntities],
     ['Reported group relationships',status.counts.leiRelationships??null],
     ['Audited research analyses',status.counts.researchRuns]
    ].map(([label,value,text])=><div key={String(label)}>
     <strong>{text?String(text):fmt(value as number|null)}</strong><span>{label}</span>
    </div>)}
   </div>
   <dl className="cq-engine-freshness" aria-label="Source freshness and backend health">
    <div><dt>GLEIF publication</dt><dd>{latest?day(latest.publishDate)+' · '+latest.status:'not imported'}</dd></div>
    <div><dt>Official records in publication</dt><dd>{fmt(latest?.officialRecords)}</dd></div>
    <div><dt>Latest run: valid / rejected</dt><dd>{latest?fmt(latest.rowsValid)+' / '+fmt(latest.rowsRejected):'—'}</dd></div>
    <div><dt>Not in latest publication</dt><dd>{fmt(status.freshness?.staleNotInLatestPublication)}</dd></div>
    <div><dt>Relationship data (Level 2)</dt><dd>{rr?day(rr.publishDate)+' · '+rr.status:'not imported'}</dd></div>
    <div><dt>Local AI model</dt><dd>{status.ai?.reachable&&status.ai.configured?status.ai.model:'unavailable — deterministic analysis only'}</dd></div>
    <div><dt>Backend check</dt><dd>{status.latencyMs!==undefined?status.latencyMs+' ms':'—'} · {day(status.checkedAt)}</dd></div>
    <div><dt>Retrieval path</dt><dd>{latest?.retrievalPath==='operator-relay'?'operator relay (official archive, SHA-256 verified)':latest?.retrievalPath||'—'}</dd></div>
   </dl>
  </>:<div className="cq-engine-unconfigured"><strong>Not yet connected</strong>
   <p>No records are attributed to DGX until its database, migrations and authenticated HTTPS gateway are operational. Global legal-entity discovery still works independently.</p>
  </div>}
  <form className="cq-engine-search" onSubmit={e=>{e.preventDefault();void search();}}>
   <label htmlFor="cq-dgx-name">{status?.connected?'Search the private company index':'Search companies (live GLEIF while the private index is offline)'}</label>
   <div><input id="cq-dgx-name" type="search" value={q} onChange={e=>setQ(e.target.value)}
     placeholder="Legal company name, LEI or SEC ticker" minLength={2} maxLength={100}/>
    <select value={country} onChange={e=>setCountry(e.target.value)} aria-label="Country">
     <option value="">All countries</option>
     {['IN','US','AE','GB','DE','JP','SG','SA','ZA','NA','AU','CA','FR','BR','VN','TZ','CH','NL','LU','IE','CN','HK']
      .map(c=><option key={c} value={c}>{c}</option>)}
    </select>
    <button type="submit" disabled={busy||q.trim().length<2}>{busy?'Searching…':'Search records'}</button></div>
  </form>
  {error&&<p role="alert" className="cq-engine-error">{error}</p>}
  {searched&&<div className="cq-engine-results" aria-label="Source-linked indexed search results">
   {records.length?records.map((r,i)=><div key={r.source+':'+r.identifier+':'+i} className="cq-engine-result">
    <span className="cq-engine-record-tag">{origin==='live'?'LIVE':r.source}</span>
    <div><strong>{r.name}</strong><small>{r.country} · {r.source==='SEC'?'CIK '+r.identifier+(r.ticker?' · '+r.ticker:''):'LEI '+r.identifier}
     {r.status?' · '+r.status:''}{r.matchType==='contains'?' · name contains query':''}</small></div>
    {r.source==='GLEIF'&&origin==='dgx'&&<button type="button" className="cq-engine-inspect" onClick={()=>void inspect(r.identifier)}>Inspect</button>}
    <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer">Original record ↗</a>
   </div>):<p>No matching stored records. Try the live directory; GLEIF coverage is larger than this local index.</p>}
  </div>}
  {detailError&&<p role="alert" className="cq-engine-error">{detailError}</p>}
  {detail&&<section className="cq-engine-detail" aria-label="Indexed entity evidence">
   <header><span className="eyebrow">LEI {detail.entity.lei}</span><h3>{detail.entity.name}</h3>
    <p>{[detail.entity.country,detail.entity.jurisdiction,detail.entity.category,detail.entity.legalForm].filter(Boolean).join(' · ')}</p></header>
   <dl className="cq-engine-facts">
    <div><dt>Registration status</dt><dd>{detail.entity.registrationStatus}</dd></div>
    <div><dt>Entity status</dt><dd>{detail.entity.status}</dd></div>
    <div><dt>Last reference update</dt><dd>{day(detail.entity.lastUpdate)}</dd></div>
    <div><dt>Next renewal</dt><dd>{day(detail.entity.nextRenewal)}</dd></div>
    <div><dt>Registry number</dt><dd>{detail.entity.registeredAs||'not provided'}</dd></div>
    <div><dt>Legal address</dt><dd>{detail.entity.address||'not provided'}</dd></div>
    <div><dt>Source publication</dt><dd>{day(detail.provenance.currentVersionPublishedAt)} · {detail.versions.length} stored version{detail.versions.length===1?'':'s'}</dd></div>
    <div><dt>In latest publication</dt><dd>{detail.provenance.presentInLatestPublication===null?'unknown':detail.provenance.presentInLatestPublication?'yes':'no'}</dd></div>
   </dl>
   {detail.entity.otherNames&&<p className="cq-engine-note"><strong>Source name variants:</strong> {detail.entity.otherNames}</p>}
   <h4>Identity screening leads</h4>
   {detail.flags.length?<ul className="cq-engine-flags">{detail.flags.map(f=><li key={f.code} data-severity={f.severity}>
    <span>{f.severity}</span><div><strong>{f.title}</strong><p>{f.explanation}</p></div></li>)}</ul>:
    <p className="cq-engine-note">No deterministic identity leads for this record.</p>}
   {detail.missingFields.length>0&&<p className="cq-engine-note"><strong>Not provided by the source:</strong> {detail.missingFields.join(', ')}</p>}
   {detail.secNameCandidates.length>0&&<p className="cq-engine-note"><strong>SEC issuers with the identical name (name match only, not a verified link):</strong> {detail.secNameCandidates.map(s=>s.name+' (CIK '+s.cik+')').join('; ')}</p>}
   <div className="cq-engine-actions"><a href={detail.entity.sourceUrl} target="_blank" rel="noopener noreferrer">Original GLEIF record ↗</a>
    <Link href={'/lei/'+detail.entity.lei}>Open full company profile ↗</Link></div>
   <form className="cq-engine-research" onSubmit={e=>{e.preventDefault();void runResearch();}}>
    <h4>Analyst research (local AI, audited)</h4>
    <label htmlFor="cq-research-q">Question</label>
    <textarea id="cq-research-q" value={question} onChange={e=>setQuestion(e.target.value)} maxLength={1000} rows={2}/>
    <label htmlFor="cq-research-token">Analyst access token</label>
    <div><input id="cq-research-token" type="password" autoComplete="off" value={token} onChange={e=>setToken(e.target.value)} placeholder="Held only in this page"/>
     <button type="submit" disabled={researchBusy||!token||question.trim().length<5}>{researchBusy?'Analysing…':'Run research'}</button></div>
   </form>
   {researchError&&<p role="alert" className="cq-engine-error">{researchError}</p>}
   {research&&<div className="cq-engine-answer" aria-label="Research result">
    <h5>Deterministic summary (verified source + rules)</h5><pre>{research.sections.deterministicCalculations.deterministicSummary}</pre>
    <h5>AI interpretation {research.sections.aiInterpretation?'· '+research.sections.aiInterpretation.model:''}</h5>
    {research.sections.aiInterpretation?<pre>{research.sections.aiInterpretation.text}</pre>:<p>Not available; the deterministic summary above is the answer.</p>}
    {research.sections.missingOrUnverified.length>0&&<><h5>Missing or unverified</h5><ul>{research.sections.missingOrUnverified.map(m=><li key={m}>{m}</li>)}</ul></>}
    <small>Audit record #{research.auditId} · {research.createdAt}</small>
   </div>}
  </section>}
  <p className="cq-engine-caveat">Identity records do not establish beneficial ownership, live market prices, valuations or regulated credit ratings. Screening leads are prompts for investigation, not findings of wrongdoing. SEC financial statements are registrant-reported and must be compared using their exact periods and filing dates.</p>
 </div>;
}
