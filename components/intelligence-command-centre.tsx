'use client';

import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import type {IdentityIntelligence,IntelligenceSignal} from '@/lib/intelligence-engine';
import type {SecIntelligenceReport,AnnualObservation,FinancialMetricKey} from '@/lib/sec-intelligence';

type Mode='lei'|'sec';
type QueryResult={id:string;name:string;sub:string};
type Report=IdentityIntelligence|SecIntelligenceReport;
const metrics:{key:FinancialMetricKey;label:string}[]=[
 {key:'revenue',label:'Revenue'},{key:'netIncome',label:'Net income'},
 {key:'operatingCashFlow',label:'Operating cash flow'},{key:'operatingIncome',label:'Operating income'},
 {key:'assets',label:'Assets'},{key:'equity',label:'Book equity'}
];
function money(n:number){return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',notation:'compact',maximumFractionDigits:2}).format(n);}
function percent(n:number){return (n>0?'+':'')+n.toFixed(1)+'%';}
function reportName(report:Report){return report.subject.name;}
function tone(level:IntelligenceSignal['level']){return level==='attention'?'attention':level==='review'?'review':'context';}
function saveReport(report:Report){
 const contents=JSON.stringify({...report,exportedAt:new Date().toISOString(),status:'SOURCE-LINKED_RESEARCH_SNAPSHOT_NOT_A_RATING'},null,2);
 const url=URL.createObjectURL(new Blob([contents],{type:'application/json'}));
 const link=document.createElement('a');link.href=url;link.download='CREQOR-intelligence-'+report.subject.identifier?.replace(/[^A-Z0-9]/gi,'')+(report.type==='sec-financials'?report.subject.cik:'')+'.json';
 document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

export default function IntelligenceCommandCentre(){
 const [mode,setMode]=useState<Mode>('lei');
 const [query,setQuery]=useState('');
 const [suggestions,setSuggestions]=useState<QueryResult[]>([]);
 const [searching,setSearching]=useState(false);
 const [searchIssue,setSearchIssue]=useState('');
 const [selected,setSelected]=useState('');
 const [report,setReport]=useState<Report|null>(null);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 const [activeMetric,setActiveMetric]=useState<FinancialMetricKey>('revenue');
 const searchAbort=useRef<AbortController|null>(null);
 const reportAbort=useRef<AbortController|null>(null);
 const hydrated=useRef(false);
 const latestMode=useRef<Mode>('lei');
 latestMode.current=mode;
 useEffect(()=>{
  if(hydrated.current)return;
  hydrated.current=true;
  const params=new URLSearchParams(window.location.search);
  const lei=params.get('lei')||'';
  const cik=params.get('cik')||'';
  if(/^[A-Z0-9]{20}$/i.test(lei)){
   setMode('lei');setSelected(lei.toUpperCase());setQuery(lei.toUpperCase());
  }else if(/^\d{10}$/.test(cik)){
   setMode('sec');setSelected(cik);setQuery(cik);
  }
 },[]);
 useEffect(()=>{
  const term=query.trim();
  if(term.length<2 || selected){setSuggestions([]);setSearching(false);setSearchIssue('');return;}
  const controller=new AbortController();searchAbort.current=controller;
  const timeout=window.setTimeout(async()=>{
   setSearching(true);setSearchIssue('');
   try{
    const path=mode==='lei'?'/api/lei/search?q=':'/api/search?q=';
    const response=await fetch(path+encodeURIComponent(term),{signal:controller.signal});
    const data=await response.json();
    if(!response.ok)throw new Error(data.message||'The official source search is unavailable.');
    if(controller.signal.aborted)return;
    setSuggestions(mode==='lei'?
     (data.results||[]).map((x:{lei:string;name:string;country:string;registrationStatus:string})=>({id:x.lei,name:x.name,sub:(x.country||'Country unavailable')+' · LEI '+x.registrationStatus})):
     (data.results||[]).map((x:{cik:string;name:string;ticker:string;exchange:string})=>({id:x.cik,name:x.name,sub:(x.ticker||'—')+' · '+(x.exchange||'US issuer')+' · CIK '+x.cik})));
   }catch(e){
    if(!controller.signal.aborted){setSuggestions([]);setSearchIssue(e instanceof Error?e.message:'Official source search unavailable.');}
   }finally{if(!controller.signal.aborted)setSearching(false);}
  },300);
  return()=>{clearTimeout(timeout);controller.abort();};
 },[mode,query,selected]);
 useEffect(()=>{
  if(!selected)return;
  const controller=new AbortController();reportAbort.current=controller;
  setLoading(true);setError('');setReport(null);
  const run=async()=>{
   try{
    const path='/api/intelligence/'+(mode==='lei'?'lei/':'sec/')+encodeURIComponent(selected);
    const response=await fetch(path,{signal:controller.signal});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||'Intelligence could not be retrieved.');
    if(!controller.signal.aborted)setReport(data as Report);
   }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Source unavailable.');}
   finally{if(!controller.signal.aborted)setLoading(false);}
  };
  void run();return()=>controller.abort();
 },[mode,selected]);
 function reset(nextMode:Mode=mode){
  searchAbort.current?.abort();reportAbort.current?.abort();
  setMode(nextMode);setSelected('');setQuery('');setSuggestions([]);
  setReport(null);setError('');setSearchIssue('');setActiveMetric('revenue');
  window.history.replaceState(window.history.state,'','/intelligence');
 }
 function inspect(id:string,name:string){
  setSelected(id);setQuery(name);setSuggestions([]);setError('');
  window.history.replaceState(window.history.state,'','/intelligence?'+(mode==='lei'?'lei':'cik')+'='+encodeURIComponent(id));
 }
 const sec=report?.type==='sec-financials'?report:null;
 const lei=report?.type==='legal-identity'?report:null;
 const latest=sec?.periods[0];
 const ordered=[...(report?.signals||[])].sort((a,b)=>(a.level==='attention'?0:a.level==='review'?1:2)-(b.level==='attention'?0:b.level==='review'?1:2));
 const attention=ordered.filter(s=>s.level==='attention').length,needsReview=ordered.filter(s=>s.level==='review').length;
 const maxBar=sec?Math.max(...sec.periods.map(p=>Math.abs(p.metrics[activeMetric]?.value||0)),1):1;
 const count=sec?sec.coverage.reportedMetricTypes:lei?.completeness.present||0;
 const total=sec?sec.coverage.totalMetricTypes:lei?.completeness.total||0;
 return <div className="iq-root">
  <div className="iq-console" aria-label="CREQOR intelligence search console">
   <div className="iq-console-top"><div><span className="iq-dot"/> OFFICIAL SOURCE INTELLIGENCE</div><span>PROVENANCE-FIRST ANALYSIS · NO INVENTED RATINGS</span></div>
   <div className="iq-source-tabs" role="tablist" aria-label="Intelligence sources">
    <button type="button" role="tab" aria-selected={mode==='lei'} className={mode==='lei'?'is-active':''} onClick={()=>reset('lei')}>Global legal-entity intelligence <span>GLEIF</span></button>
    <button type="button" role="tab" aria-selected={mode==='sec'} className={mode==='sec'?'is-active':''} onClick={()=>reset('sec')}>US financial intelligence <span>SEC</span></button>
   </div>
   <div className="iq-search"><div className="iq-input-wrap"><span aria-hidden="true">⌕</span><input aria-label={mode==='lei'?'Search global entity intelligence':'Search US financial intelligence'} type="search" autoComplete="off"
    placeholder={mode==='lei'?'Search a company name or enter a 20-character LEI…':'Search a US company, ticker or 10-digit CIK…'}
    value={query} onChange={e=>{setSelected('');setQuery(e.target.value);setReport(null);setError('');}} maxLength={100}/></div>
    <button type="button" className="iq-search-reset" onClick={()=>reset()}>Clear</button>
   </div>
   {(query.trim().length===20&&mode==='lei'&&/^[A-Z0-9]{20}$/i.test(query.trim())||mode==='sec'&&/^\d{10}$/.test(query.trim()))&&!selected&&
    <button type="button" className="iq-direct" onClick={()=>inspect(query.trim().toUpperCase(),query.trim())}>Analyse this exact {mode==='lei'?'LEI':'SEC CIK'} ↗</button>}
   {searching&&<p className="iq-assist" role="status">Searching official {mode==='lei'?'GLEIF':'SEC'} records…</p>}
   {searchIssue&&<p className="iq-assist iq-alert" role="status">{searchIssue}</p>}
   {!selected&&suggestions.length>0&&<div className="iq-suggestions" role="listbox" aria-label="Official source matches">{suggestions.map(item=>
    <button type="button" role="option" aria-selected={false} key={item.id} onClick={()=>inspect(item.id,item.name)}><span><strong>{item.name}</strong><small>{item.sub}</small></span><span aria-hidden="true">↗</span></button>)}</div>}
   {mode==='sec'&&<p className="iq-console-foot">US annual financials require the SEC connector. <a target="_blank" rel="noopener noreferrer" href="https://www.sec.gov/search-filings">Official SEC EDGAR ↗</a></p>}
   {mode==='lei'&&<p className="iq-console-foot">GLEIF identifies legal entities across jurisdictions. <a target="_blank" rel="noopener noreferrer" href="https://search.gleif.org/">Official GLEIF search ↗</a></p>}
  </div>

  {loading&&<div className="iq-state" role="status"><span className="iq-spinner"/>Retrieving and analysing official reference records…</div>}
  {error&&<div className="iq-state iq-error" role="alert"><strong>Unable to complete source analysis.</strong><p>{error}</p><div><button type="button" onClick={()=>{const id=selected;setSelected('');setTimeout(()=>setSelected(id),0);}}>Retry analysis</button><button type="button" onClick={()=>reset()}>Choose another company</button></div></div>}
  {!report&&!loading&&!error&&<div className="iq-empty">
   <div className="iq-empty-art" aria-hidden="true"><span>◇</span><i/><i/></div>
   <span className="iq-kicker">THE INTELLIGENCE PIPELINE</span>
   <h2>Find the signal.<br/><em>Follow the source.</em></h2>
   <p>Choose a company to generate a transparent snapshot of its official records, data gaps and research questions. No synthetic company facts are inserted.</p>
   <div className="iq-pipeline"><div><strong>01</strong><span>Identify</span><small>Official records</small></div><div><strong>02</strong><span>Analyse</span><small>Deterministic rules</small></div><div><strong>03</strong><span>Explain</span><small>Evidence trail</small></div></div>
   <div className="iq-empty-actions"><Link href="/directory">Browse global companies ↗</Link><Link href="/workbench">Open valuation workbench ↗</Link></div>
  </div>}

  {report&&<div className="iq-report">
   <div className="iq-report-head"><div><span className="iq-kicker">INTELLIGENCE SNAPSHOT / {report.type==='legal-identity'?'GLEIF IDENTITY':'SEC FINANCIALS'}</span><h2>{reportName(report)}</h2><p>{report.type==='legal-identity'?report.subject.identifier:report.subject.cik} · Assessment date {report.asOf} · Source-backed observations</p></div>
    <div className="iq-report-actions"><button type="button" onClick={()=>saveReport(report)}>Export snapshot JSON ↗</button>
     <Link href={report.type==='legal-identity'?'/lei/'+report.subject.identifier:'/company/'+report.subject.cik}>Open source-linked profile ↗</Link></div></div>
   <div className="iq-kpi-grid">
    <div><span>FIELD COVERAGE</span><strong>{count}<small> / {total}</small></strong><p>{sec?sec.coverage.label:lei?.completeness.label}</p></div>
    <div><span>ATTENTION FLAGS</span><strong>{attention}</strong><p>Rule-based signals; inspect the source and context</p></div>
    <div><span>NEEDS REVIEW</span><strong>{needsReview}</strong><p>Evidence, reporting period or reference-data gaps</p></div>
    <div><span>TRACEABLE SOURCES</span><strong>{report.sources.length}</strong><p>Official registry records or filing accessions</p></div>
   </div>

   {lei&&<div className="iq-details-grid">
    <section className="iq-card"><span className="iq-kicker">01 / ENTITY REFERENCE</span><h3>Identity context</h3><dl className="iq-fact-list">
     <div><dt>LEI registration</dt><dd>{lei.record.registrationStatus||'Not available'}</dd></div>
     <div><dt>Entity status</dt><dd>{lei.record.entityStatus||'Not available'}</dd></div>
     <div><dt>Legal jurisdiction</dt><dd>{lei.subject.jurisdiction||'Not available'}</dd></div>
     <div><dt>Country</dt><dd>{lei.subject.country||'Not available'}</dd></div>
     <div><dt>Last LEI update</dt><dd>{lei.record.lastUpdate.slice(0,10)||'Not available'}</dd></div>
     <div><dt>Next LEI renewal</dt><dd>{lei.record.nextRenewal.slice(0,10)||'Not available'}</dd></div>
     <div><dt>Registration number</dt><dd>{lei.record.registeredAs||'Not in reference fields'}</dd></div>
    </dl></section>
    <section className="iq-card iq-source-explainer"><span className="iq-kicker">02 / WHAT THE RECORD PROVES</span><h3>Identity is not valuation.</h3><p>An LEI can identify an entity and its reference-data maintenance status. It cannot establish earnings, listed share classes, share prices, creditworthiness or a defensible market capitalisation.</p><div className="iq-coverage-line"><span style={{width:lei.completeness.percent+'%'}}/></div><small>{lei.completeness.present} of {lei.completeness.total} reference fields populated · {lei.completeness.percent}% coverage</small><Link href="/workbench">Start an evidence-backed assessment ↗</Link></section>
   </div>}

   {sec&&<div className="iq-financial-panel">
    <div className="iq-financial-head"><div><span className="iq-kicker">01 / ANNUAL SEC XBRL</span><h3>Reported financial performance</h3><p>USD, issuer-reported. Metric dates and filing sources are preserved.</p></div>
     <span className="iq-date-label">LATEST SUPPORTED PERIOD {sec.latestPeriodEnd||'UNAVAILABLE'}</span></div>
    <div className="iq-metric-tabs" aria-label="Choose financial metric">{metrics.map(item=><button type="button" key={item.key} aria-pressed={activeMetric===item.key} className={activeMetric===item.key?'is-active':''} onClick={()=>setActiveMetric(item.key)}>{item.label}</button>)}</div>
    {sec.periods.length?<div className="iq-history" aria-label="Reported historical financials">{sec.periods.slice().reverse().map(period=>{
     const fact=period.metrics[activeMetric];
     const size=fact?Math.max(2,Math.abs(fact.value)/maxBar*100):0;
     return <div className="iq-history-row" key={period.end}><span>{period.end}</span><div className="iq-history-track">{fact&&<span className={fact.value<0?'is-negative':''} style={{width:size+'%'}}/>}</div><strong>{fact?money(fact.value):'Not reported'}</strong></div>;
    })}</div>:<div className="iq-data-unavailable">No eligible annual USD observations for the supported US GAAP tags.</div>}
    {latest&&<div className="iq-fact-mini">{metrics.map(item=>{
     const obs=latest.metrics[item.key];
     return <div key={item.key}><span>{item.label}</span><strong>{obs?money(obs.value):'—'}</strong><small>{obs?'Filed '+obs.filed:'No supported fact'}</small></div>;
    })}</div>}
    {sec.indicators.length>0&&<div className="iq-indicators"><span className="iq-kicker">CALCULATED OBSERVATIONS</span><div>{sec.indicators.map(i=><article key={i.id}><span>{i.label}</span><strong>{i.unit==='percent'?percent(i.value):i.value.toFixed(2)+'×'}</strong><small>{i.interpretation}</small></article>)}</div></div>}
   </div>}

   <section className="iq-signals"><div className="iq-section-heading"><span className="iq-kicker">02 / INTELLIGENCE SIGNALS</span><h3>Findings worth investigating.</h3><p>Transparent rules with source references and reasons. No claim that an indicator proves misconduct, default or an investment outcome.</p></div>
    {ordered.length?<div className="iq-signal-list">{ordered.map((s,i)=><details key={s.id} className={'iq-signal iq-'+tone(s.level)}><summary><span className="iq-signal-index">{String(i+1).padStart(2,'0')}</span><span className="iq-signal-copy"><strong>{s.title}</strong><small>{s.description}</small></span><span className="iq-signal-level">{s.level==='attention'?'ATTENTION':s.level==='review'?'REVIEW':'CONTEXT'}</span><span aria-hidden="true" className="iq-signal-open">+</span></summary>
      <div className="iq-signal-details"><p><strong>Why this matters: </strong>{s.why}</p><div><span>SUPPORTING SOURCES</span>{s.sourceIds.length?s.sourceIds.map(id=>{const source=report.sources.find(x=>x.id===id);return source?<a href={source.url} target="_blank" rel="noopener noreferrer" key={id}>{source.authority} · {source.reference} ↗</a>:<span key={id}>Reference {id} unavailable</span>}):<span>No qualifying source observation</span>}</div></div>
     </details>)}</div>:<div className="iq-data-unavailable">No rule-based findings from these supported fields. That does not establish a clean bill of financial health.</div>}
   </section>
   <section className="iq-sources"><div className="iq-section-heading"><span className="iq-kicker">03 / EVIDENCE PROVENANCE</span><h3>Every claim has an origin.</h3><p>Open the issuer filing or legal-entity record and review it yourself.</p></div>
    <div className="iq-sources-grid">{report.sources.map(source=><a href={source.url} key={source.id} target="_blank" rel="noopener noreferrer"><span>{source.authority}</span><strong>{source.label}</strong><small>{source.date||'Date unavailable'} · {source.reference}</small><em aria-hidden="true">↗</em></a>)}</div>
   </section>
   <div className="iq-disclosure"><strong>Method and limits.</strong> {report.disclosure}</div>
  </div>}
 </div>;
}
