'use client';
import {useState} from 'react';

type Research={auditId:number;createdAt:string;sections:{deterministicCalculations:{deterministicSummary:string};
 aiInterpretation:{model:string;text:string;latencyMs:number}|null;missingOrUnverified:string[]}};
/** Analyst-only research on one LEI. The access token lives only in this component's memory. */
export default function LeiResearchPanel({lei}:{lei:string}){
 const [token,setToken]=useState('');
 const [question,setQuestion]=useState('Summarise this entity’s identity, corporate structure and data freshness, and list what an analyst should verify next.');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [result,setResult]=useState<Research|null>(null);
 async function run(){
  setBusy(true);setError('');setResult(null);
  try{
   const r=await fetch('/api/engine/lei/'+lei+'/research',{method:'POST',cache:'no-store',
    headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({question})});
   const d=await r.json();
   if(!r.ok)throw new Error((d as {error?:string}).error||'Research unavailable.');
   setResult(d as Research);
  }catch(e){setError(e instanceof Error?e.message:'Research unavailable.');}
  finally{setBusy(false);}
 }
 return <div className="cq-engine-detail lp-research">
  <form className="cq-engine-research" onSubmit={e=>{e.preventDefault();void run();}}>
   <h4>Analyst research · local AI on CREQOR&rsquo;s private DGX</h4>
   <label htmlFor={'q-'+lei}>Question</label>
   <textarea id={'q-'+lei} value={question} onChange={e=>setQuestion(e.target.value)} maxLength={1000} rows={2}/>
   <label htmlFor={'t-'+lei}>Analyst access token</label>
   <div><input id={'t-'+lei} type="password" autoComplete="off" value={token} onChange={e=>setToken(e.target.value)} placeholder="Held only in this page"/>
    <button type="submit" disabled={busy||!token||question.trim().length<5}>{busy?'Analysing…':'Run research'}</button></div>
  </form>
  {error&&<p role="alert" className="cq-engine-error">{error}</p>}
  {result&&<div className="cq-engine-answer" aria-label="Research result">
   <h5>Deterministic summary (verified source + rules)</h5><pre>{result.sections.deterministicCalculations.deterministicSummary}</pre>
   <h5>AI interpretation{result.sections.aiInterpretation?' · '+result.sections.aiInterpretation.model:''}</h5>
   {result.sections.aiInterpretation?<pre>{result.sections.aiInterpretation.text}</pre>:<p>Not available; the deterministic summary above is the answer.</p>}
   {result.sections.missingOrUnverified.length>0&&<><h5>Missing or unverified</h5><ul>{result.sections.missingOrUnverified.map(m=><li key={m}>{m}</li>)}</ul></>}
   <small>Audit record #{result.auditId} · {result.createdAt} · AI output is an interpretation of the cited records, not a finding or rating.</small>
  </div>}
 </div>;
}
