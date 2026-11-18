'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import {createAssessment,parseAssessment,type Assessment} from '@/lib/assessment';
import {runForensicIntelligence} from '@/lib/forensic-intelligence';
import {analyzePortfolio} from '@/lib/portfolio-intelligence';
import ForensicReportPanel from '@/components/forensic-report-panel';
const savedKey='creqor.assessment-workspace.v1';
const draftKey='creqor.assessment-active-draft.v1';
const handoffKey='creqor.workbench.handoff.v1';
const handoffContext='creqor.workbench.handoff-context.v1';
function sample():Assessment{
 const a=createAssessment('2026-11-18');
 a.name='Synthetic demonstration — no real company';a.identifier='DEMO-ONLY';
 a.country='Example';a.industry='Manufacturing';a.kind='listed';
 a.fields.revenue=100;a.fields.ebitda=123;
 a.fields.freeCashFlow=35;a.fields.growthPct=7;a.fields.discountPct=13;a.fields.terminalPct=3;a.fields.forecastYears=5;
 a.fields.netDebt=25;a.fields.sharesMillions=10;a.fields.sharePrice=90;a.fields.assets=90;a.fields.liabilities=115;
 a.fields.revenueMultiple=3.5;a.fields.ebitdaMultiple=6;
 a.active=['dcf','revenueMultiple','ebitdaMultiple','netAssets'];
 a.evidence=[
  {id:'demo-identity',title:'Synthetic identity reference',url:'https://example.org/registry',kind:'user_provided',claim:'identity',asOf:'2025-01-01',notes:'Not a real record'},
  {id:'demo-price',title:'Old illustrative price record',url:'https://example.org/quote',kind:'user_provided',claim:'share-price',asOf:'2024-01-01',notes:'Not a real quote'},
  {id:'demo-duplicate',title:'Duplicate illustrative price',url:'https://example.org/quote',kind:'user_provided',claim:'share-price',asOf:'2024-01-01',notes:'Demonstration of duplication'},
  {id:'demo-cash',title:'Synthetic cash flow',url:'https://example.org/cash',kind:'user_provided',claim:'cash-flow',asOf:'2025-01-01',notes:'Not real accounts'}
 ];
 return a;
}
export default function ForensicIntelligenceHub(){
 const [saved,setSaved]=useState<Assessment[]>([]);
 const [selected,setSelected]=useState<Assessment|null>(null);
 const [ready,setReady]=useState(false);
 const [message,setMessage]=useState('');
 const file=useRef<HTMLInputElement>(null);
 useEffect(()=>{
  const items:Assessment[]=[];
  try{const data=JSON.parse(localStorage.getItem(savedKey)||'[]') as unknown;
   if(Array.isArray(data))for(const entry of data.slice(0,30)){try{items.push(parseAssessment(entry))}catch{/*invalid local copy*/}}
  }catch{setMessage('Saved assessments could not be read in this browser. You can still import a JSON file.');}
  setSaved(items);
  try{
   const draft=sessionStorage.getItem(draftKey);
   if(draft)setSelected(parseAssessment(JSON.parse(draft)));
   else if(items.length)setSelected(items[0]);
  }catch{if(items.length)setSelected(items[0]);}
  setReady(true);
 },[]);
 const graph=useMemo(()=>analyzePortfolio(saved),[saved]);
 const portfolio=useMemo(()=>saved.map(item=>{
  const r=runForensicIntelligence(item);
  return {id:item.id,name:item.name,critical:r.summary.critical,high:r.summary.high,coverage:r.summary.coverage,referenced:r.summary.sourceLinks,methods:r.summary.calculableMethods};
 }),[saved]);
 async function importFile(f:File|undefined){
  if(!f)return;
  if(f.size>1024*1024){setMessage('Import limited to 1 MB.');return;}
  try{const a=parseAssessment(JSON.parse(await f.text()));setSelected(a);setMessage('Imported into this session for screening. Nothing was uploaded to a server.');}
  catch(e){setMessage('Import rejected: '+(e instanceof Error?e.message:'Invalid file'));}
  if(file.current)file.current.value='';
 }
 function openDraft(){
  if(!selected)return;
  try{
   sessionStorage.setItem(handoffKey,JSON.stringify(selected));
   sessionStorage.setItem(handoffContext,'saved');
   window.location.href='/workbench';
  }catch{setMessage('Browser storage is unavailable. Export your assessment and import it in the workbench.');}
 }
 return <div className="fi-hub">
  <div className="fi-hub-intro"><span className="fi-kicker"><span className="fi-signal"/> INTELLIGENCE ENGINE / V1 OPERATIONAL</span><h2>Your company investigation console.</h2><p>Screen your assessments for traceability gaps, suspect input relationships, stale references and valuation disagreement. Each signal links to an explanation and a next action.</p></div>
  <div className="fi-hub-source"><span><span className="fi-signal"/> PRIVATE, LOCAL-FIRST REVIEW</span><p>Existing saved assessments are read from this browser; no private documents are transmitted. The optional example contains synthetic figures only.</p></div>
  <div className="fi-hub-actions">
   <label className="fi-selector">ASSESSMENT TO INVESTIGATE<select aria-label="Choose assessment for intelligence review" value={selected?.id||''} onChange={e=>{const a=saved.find(x=>x.id===e.target.value);if(a)setSelected(a);}}>
    <option value="" disabled>Select a saved company</option>
    {selected&&!saved.some(a=>a.id===selected.id)&&<option value={selected.id}>{selected.name||'Active imported assessment'}</option>}
    {saved.map(x=><option key={x.id} value={x.id}>{x.name||'Untitled draft'} · {x.asOf}</option>)}
   </select></label>
   <input ref={file} type="file" accept="application/json,.json" aria-label="Import company assessment JSON" className="fi-sr" onChange={e=>void importFile(e.target.files?.[0])}/>
   <button type="button" onClick={()=>file.current?.click()}>Import assessment JSON ↗</button>
   <button type="button" onClick={()=>{setSelected(sample());setMessage('Synthetic demonstration loaded. None of its company facts or source records are real.');}}>Try synthetic example ↗</button>
   {selected&&<button type="button" className="fi-hub-primary" onClick={openDraft}>Open in workbench ↗</button>}
  </div>
  {message&&<div className="fi-notice" role="status">{message}<button type="button" onClick={()=>setMessage('')} aria-label="Dismiss intelligence message">×</button></div>}
  {!ready?<p className="fi-hub-loading" role="status">Loading locally saved assessments…</p>:selected?<ForensicReportPanel key={selected.id} assessment={selected}/>:<div className="fi-no-assessment"><span>◇</span><h3>Start with a real assessment—or a synthetic example.</h3><p>You can create a company analysis in the valuation workbench, return here for deterministic intelligence screening, or import a previously exported JSON file.</p><div><Link href="/workbench">Create assessment ↗</Link><button type="button" onClick={()=>setSelected(sample())}>Explore example ↗</button></div></div>}
  {saved.length>1&&<section className="fi-portfolio" aria-label="Cross-company intelligence">
   <div className="fi-portfolio-head"><span className="fi-kicker">CROSS-COMPANY INTELLIGENCE / V1</span><h3>Relationships worth investigating.</h3><p>Compare locally saved assessments for reused evidence, overlapping identities and material changes. These are research leads—not verified affiliations or ratings.</p></div>
   <div className="fi-portfolio-table"><table><thead><tr><th scope="col">Signal</th><th scope="col">Companies</th><th scope="col">Reason and next step</th><th scope="col">Priority</th></tr></thead><tbody>
    {graph.alerts.slice(0,25).map(alert=><tr key={alert.id}><th scope="row">{alert.headline}</th><td>{alert.companyIds.map(id=>saved.find(a=>a.id===id)?.name||'Untitled').join(' / ')}</td><td>{alert.reason} {alert.nextAction}</td><td>{alert.priority}</td></tr>)}
    {graph.alerts.length===0&&<tr><td colSpan={4}>No cross-assessment conflicts detected from the current local records. This does not establish that the companies are independently verified.</td></tr>}
   </tbody></table></div>
   <p className="fi-hub-loading">{graph.summary.high} high-priority leads · {graph.summary.review} review leads · {graph.summary.sharedSources} reused document URLs · {graph.summary.identityCollisions} identity overlaps</p>
   {graph.sourceHosts.length>0&&<details><summary>Evidence-host concentration across saved assessments</summary><div className="fi-portfolio-table"><table><thead><tr><th scope="col">Source host</th><th scope="col">Companies</th><th scope="col">References</th></tr></thead><tbody>{graph.sourceHosts.slice(0,15).map(x=><tr key={x.host}><td>{x.host}</td><td>{x.companies}</td><td>{x.references}</td></tr>)}</tbody></table></div></details>}
  </section>}
  {portfolio.length>0&&<section className="fi-portfolio">
   <div className="fi-portfolio-head"><span className="fi-kicker">YOUR SAVED RESEARCH / PORTFOLIO SCREEN</span><h3>Where should the team investigate next?</h3><p>Priority counts reflect the rules applied to your local saved drafts—not independent risk ratings.</p></div>
   <div className="fi-portfolio-table"><table><thead><tr><th scope="col">Company</th><th scope="col">Priority flags</th><th scope="col">Referenced categories</th><th scope="col">Methods</th><th scope="col">Review</th></tr></thead><tbody>
    {[...portfolio].sort((a,b)=>(b.critical*3+b.high)-(a.critical*3+a.high)).map(row=><tr key={row.id}><th scope="row">{row.name}</th><td>{row.critical} critical · {row.high} high</td><td>{row.coverage.referenced} / {row.coverage.required}</td><td>{row.methods}</td><td><button type="button" onClick={()=>{const a=saved.find(x=>x.id===row.id);if(a){setSelected(a);document.querySelector('.fi-hub-intro')?.scrollIntoView({behavior:'smooth',block:'start'});}}}>Investigate ↗</button></td></tr>)}
   </tbody></table></div>
  </section>}
 </div>;
}
