'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';

type Pick={lei:string;name:string;country:string};
type SearchRecord={source:string;identifier:string;name:string;country:string;status?:string};
type Availability={state:'loading'}|{state:'ready';available:boolean;years:number[];currency?:string;scope?:string}|{state:'error'};
type Cell={value:number|null;status:'reported'|'computed'|'not_reported'|'not_computable';sourceUrl?:string;page?:number|null;periodEnd?:string};
type Company={lei:string;name:string;country:string|null;available:boolean;reason?:string;scope?:string;currency?:string;fiscalYears:number[]};
type Comparison={asOf:string;companies:[Company,Company];comparable:boolean;fiscalYears:number[];
 metrics:{metric:string;label:string;kind:'reported'|'ratio';years:{fiscalYear:number;values:[Cell,Cell]}[]}[];
 gaps:{lei:string;fiscalYear:number;metric:string}[];caveats:string[];note:string};

const PERCENT=new Set(['revenueGrowth','netMargin','returnOnEquity','returnOnAssets']);
function money(v:number,currency?:string){
 try{return new Intl.NumberFormat('en',{style:'currency',currency:currency||'USD',notation:'compact',maximumFractionDigits:2}).format(v);}
 catch{return new Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:2}).format(v)+' '+(currency||'');}
}
function show(metric:string,c:Cell,currency?:string){
 if(c.value===null)return c.status==='not_computable'?'Not computable':'Not reported';
 if(PERCENT.has(metric))return (c.value*100).toFixed(1)+'%';
 if(c.status==='computed')return c.value.toFixed(2)+'×';
 return money(c.value,currency);
}

/** Pick one company by name or LEI from the private engine index. */
function CompanyPicker({id,label,value,onPick}:{id:string;label:string;value:Pick|null;onPick:(p:Pick|null)=>void}){
 const [q,setQ]=useState('');const [results,setResults]=useState<SearchRecord[]>([]);const [msg,setMsg]=useState('');
 useEffect(()=>{
  const term=q.trim();
  if(value||term.length<2){setResults([]);setMsg('');return;}
  const ctrl=new AbortController();
  const t=setTimeout(async()=>{
   try{
    const r=await fetch('/api/engine/search?limit=8&q='+encodeURIComponent(term),{cache:'no-store',signal:ctrl.signal});
    const d=await r.json().catch(()=>({}));
    if(!r.ok){setResults([]);setMsg(d.error||'Company search is unavailable.');return;}
    const gleif=((d.records||[]) as SearchRecord[]).filter(x=>x.source==='GLEIF');
    setResults(gleif);setMsg(gleif.length?'':'No matching legal entity in the private index.');
   }catch{if(!ctrl.signal.aborted){setResults([]);setMsg('Company search is unavailable.');}}
  },260);
  return ()=>{clearTimeout(t);ctrl.abort();};
 },[q,value]);
 if(value)return <div className="field"><label htmlFor={id}>{label}</label>
  <div className="cmp-picked" id={id}><strong>{value.name}</strong><small>LEI {value.lei}{value.country?' · '+value.country:''}</small>
   <button type="button" className="secondary-button" onClick={()=>{onPick(null);setQ('');}}>Change</button></div></div>;
 return <div className="field"><label htmlFor={id}>{label}</label>
  <input id={id} placeholder="Company name or 20-character LEI" autoComplete="off" value={q} onChange={e=>setQ(e.target.value)}
   role="combobox" aria-expanded={results.length>0} aria-controls={id+'-results'}/>
  {results.length>0&&<ul className="cmp-results" id={id+'-results'} role="listbox" aria-label={label+' matches'}>
   {results.map(r=><li key={r.identifier}><button type="button" role="option" aria-selected={false}
    onClick={()=>onPick({lei:r.identifier,name:r.name,country:r.country})}>
    <strong>{r.name}</strong><small>LEI {r.identifier}{r.country?' · '+r.country:''}{r.status?' · '+r.status:''}</small></button></li>)}
  </ul>}
  {msg&&<small className="cmp-hint" role="status">{msg}</small>}
 </div>;
}

function useAvailability(pick:Pick|null):Availability|null{
 const [a,setA]=useState<Availability|null>(null);
 useEffect(()=>{
  if(!pick){setA(null);return;}
  let live=true;setA({state:'loading'});
  fetch('/api/engine/lei/'+pick.lei+'/financials',{cache:'no-store'}).then(async r=>{
   const d=await r.json();if(!r.ok)throw new Error();
   if(live)setA({state:'ready',available:Boolean(d.available),years:(d.reported||[]).map((y:{fiscalYear:number})=>y.fiscalYear),currency:d.currency,scope:d.scope});
  }).catch(()=>{if(live)setA({state:'error'});});
  return ()=>{live=false;};
 },[pick]);
 return a;
}
function AvailabilityNote({pick,a}:{pick:Pick|null;a:Availability|null}){
 if(!pick||!a)return null;
 if(a.state==='loading')return <small className="cmp-hint">Checking reviewed financials…</small>;
 if(a.state==='error')return <small className="cmp-hint">Financial availability could not be checked.</small>;
 return <small className="cmp-hint" data-testid="cmp-availability">{a.available?`Reviewed financials: ${a.years.length} fiscal year${a.years.length===1?'':'s'} (${a.scope}, ${a.currency})`:
  'No reviewed financial statements stored for this company yet.'}</small>;
}

export default function CompareClient(){
 const [a,setA]=useState<Pick|null>(null);const [b,setB]=useState<Pick|null>(null);
 const availA=useAvailability(a),availB=useAvailability(b);
 const [result,setResult]=useState<Comparison|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 useEffect(()=>{setResult(null);setError('');},[a,b]);
 async function compare(e:React.FormEvent){
  e.preventDefault();setError('');setResult(null);
  if(!a||!b){setError('Choose two companies from the search results.');return;}
  if(a.lei===b.lei){setError('Choose two different companies.');return;}
  setBusy(true);
  try{
   const r=await fetch('/api/engine/compare',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({leis:[a.lei,b.lei]}),cache:'no-store'});
   const d=await r.json().catch(()=>({}));
   if(!r.ok)throw new Error(d.error||'Comparison unavailable.');
   setResult(d as Comparison);
  }catch(err){setError(err instanceof Error?err.message:'Comparison unavailable.');}
  finally{setBusy(false);}
 }
 return <>
  <div className="panel"><span className="micro-label">PRIVATE ENGINE / REVIEWED ANNUAL REPORTS</span><h3>Choose two companies.</h3>
   <p style={{marginBottom:24}}>Search by company name or LEI. CREQOR compares figures extracted from annual reports and reviewed before use, aligned by fiscal year. Anything not reported stays marked as not reported.</p>
   <form onSubmit={compare}>
    <div className="form-grid">
     <div><CompanyPicker id="compare-a" label="Company A" value={a} onPick={setA}/><AvailabilityNote pick={a} a={availA}/></div>
     <div><CompanyPicker id="compare-b" label="Company B" value={b} onPick={setB}/><AvailabilityNote pick={b} a={availB}/></div>
    </div>
    <button className="primary-button" type="submit" disabled={busy||!a||!b} style={{marginTop:20}}>{busy?'Comparing…':'Compare companies ↗'}</button>
   </form>
   {error&&<div className="notice warning" role="alert" style={{marginTop:19}}>{error}</div>}
  </div>
  {result&&<ComparisonView r={result}/>}
 </>;
}

function ComparisonView({r}:{r:Comparison}){
 const [ca,cb]=r.companies;
 const head=<tr><th>METRIC</th>{r.companies.map(c=><th key={c.lei}><Link href={'/lei/'+c.lei}>{c.name} ↗</Link><div style={{fontSize:'.63rem',fontWeight:400,marginTop:4}}>LEI {c.lei}{c.available?` · ${c.scope} · ${c.currency}`:''}</div></th>)}</tr>;
 if(!r.comparable)return <div className="panel" style={{marginTop:24}} data-testid="compare-empty">
  <span className="micro-label">NO COMPARISON FIGURES</span><h3>Reviewed financials are not available yet.</h3>
  <p>{r.note}</p>
  <ul style={{marginTop:14}}>{r.companies.map(c=><li key={c.lei}><strong>{c.name}</strong>: {c.available?`reviewed financials for ${c.fiscalYears.length} fiscal year${c.fiscalYears.length===1?'':'s'}.`:(c.reason||'No reviewed financial statements are stored yet.')}</li>)}</ul>
  <p className="source-note">Company financials enter CREQOR only from annual reports that have been retrieved and reviewed. Access to annual reports is still being arranged, so no figures are shown and none are estimated.</p>
 </div>;
 return <div className="panel" style={{marginTop:24}} data-testid="compare-result"><span className="micro-label">SOURCE / REVIEWED ANNUAL REPORTS · AS OF {r.asOf.slice(0,10)}</span>
  <h3 style={{marginBottom:18}}>Financial comparison</h3>
  {r.caveats.map(c=><div key={c} className="notice warning" style={{marginBottom:12}}>{c}</div>)}
  {r.fiscalYears.map(fy=><div key={fy} style={{marginTop:18}}><h4>Fiscal year {fy}</h4><div className="table-wrap"><table className="data-table"><thead>{head}</thead><tbody>
   {r.metrics.map(m=>{const y=m.years.find(x=>x.fiscalYear===fy);if(!y)return null;
    return <tr key={m.metric}><td>{m.label}</td>{y.values.map((c,i)=>{const co=i===0?ca:cb;
     return <td key={co.lei} data-status={c.status}>{c.value!==null?<strong>{show(m.metric,c,co.currency)}</strong>:<span className="cmp-gap">{show(m.metric,c)}</span>}
      {c.status==='reported'&&c.sourceUrl&&<div style={{fontSize:'.63rem',marginTop:5}}>Period {c.periodEnd}{c.page?` · p. ${c.page}`:''} · <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer">source ↗</a></div>}</td>;})}</tr>;})}
  </tbody></table></div></div>)}
  <div className="notice" style={{marginTop:20}}>{r.note} {r.gaps.length?`${r.gaps.length} reported figure${r.gaps.length===1?' is':'s are'} not reported in the reviewed statements and shown as gaps, not zero.`:''} Ratios are computed only when every input was reported. No market value, rating or recommendation is inferred.</div>
 </div>;
}
