'use client';
import {useState} from 'react';
const suggestions=['What documents establish a defensible market cap?','How should I compare listed and unlisted businesses?','Which valuation assumptions should I challenge?'];
export default function AnalystClient(){
 const [question,setQuestion]=useState('');const [evidence,setEvidence]=useState('');const [key,setKey]=useState('');
 const [result,setResult]=useState('');const [status,setStatus]=useState('');const [loading,setLoading]=useState(false);
 async function ask(e:React.FormEvent){e.preventDefault();setLoading(true);setStatus('');setResult('');
  try{const response=await fetch('/api/analyst',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:JSON.stringify({question,evidence})});
   const data=await response.json();if(!response.ok)setStatus(data.error||'Research request failed.');else{setResult(data.answer);setStatus((data.sourceStatus||'Evidence status unavailable.')+(data.analysisType==='deterministic'?' · Private model unavailable; no AI answer was generated.':''));}
  }catch{setStatus('Private intelligence service could not be reached.');}finally{setLoading(false);}
 }
 return <div className="content-grid" style={{alignItems:'start'}}>
  <div className="panel"><span className="micro-label">DGX / PRIVATE INTELLIGENCE</span><h3>Ask CREQOR.</h3><p style={{marginBottom:22}}>Financial research and critical questioning from a protected DGX-powered model gateway. Do not treat AI output as a verified source.</p>
  <form onSubmit={ask} style={{display:'grid',gap:18}}><div className="field"><label htmlFor="analyst-question">Your question</label><textarea id="analyst-question" required minLength={5} maxLength={2000} value={question} onChange={e=>setQuestion(e.target.value)} placeholder="What would I need to prove a company's valuation?"/></div>
  <div className="field"><label htmlFor="analyst-evidence">Evidence / document notes (optional)</label><textarea id="analyst-evidence" maxLength={12000} value={evidence} onChange={e=>setEvidence(e.target.value)} placeholder="Paste a cited, dated filing excerpt or calculation assumptions..."/></div>
  <div className="field"><label htmlFor="analyst-key">Analyst access key</label><input id="analyst-key" type="password" value={key} onChange={e=>setKey(e.target.value)} placeholder="Required for private DGX access" autoComplete="off"/></div>
  <div className="button-row"><button type="submit" className="primary-button" disabled={loading||!question.trim()||!key}>{loading?'Examining evidence…':'Run research ↗'}</button><button type="button" className="secondary-button" onClick={()=>{setQuestion('');setEvidence('');setResult('');setStatus('')}}>Clear</button></div>
  </form>{status&&<div className={'notice '+(result?'':'warning')} style={{marginTop:22}} role="status">{status}</div>}{result&&<div className="response" aria-live="polite">{result}</div>}
  </div>
  <div><div className="panel dark"><span className="micro-label">PRIVATE COMPUTE / PUBLIC ACCOUNTABILITY</span><h3>AI proposes.<br/>Evidence decides.</h3><p>CREQOR uses DGX-hosted AI for interpretation and research, while financial formulas remain separate and repeatable. Entity research on company profiles and this open-question desk both run on CREQOR’s private DGX engine, are audited there, and require an analyst access key. If the private model is unavailable, the desk says so instead of inventing an answer.</p><div className="hero-viz" style={{marginTop:23}}><span>✳</span></div></div>
  <div className="panel" style={{marginTop:20}}><span className="micro-label">START WITH A QUESTION</span><div style={{display:'grid',gap:12,marginTop:20}}>{suggestions.map(s=><button key={s} onClick={()=>setQuestion(s)} style={{display:'flex',justifyContent:'space-between',textAlign:'left',border:'1px solid #dfe8f5',background:'#f4f7fc',padding:'14px',color:'#1c2d42',fontSize:'.78rem'}}>{s}<span>↗</span></button>)}</div></div></div>
 </div>;
}