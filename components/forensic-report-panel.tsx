'use client';
import {useState} from 'react';
import type {Assessment} from '@/lib/assessment';
import type {ForensicSignal,SignalSeverity} from '@/lib/forensic-intelligence';
import {useForensicReport} from '@/lib/use-engine';
import EngineProvenance from '@/components/engine-provenance';

const severityNames:Record<SignalSeverity,string>={critical:'BLOCKER',high:'HIGH PRIORITY',review:'REVIEW',info:'INFORMATION'};
function secureCsv(s:string){const v=String(s||'');return '"'+(/^[=+@\-]/.test(v.trim())?"'"+v:v).replace(/"/g,'""')+'"';}
function download(text:string,filename:string,mime:string){
 const url=URL.createObjectURL(new Blob([text],{type:mime}));
 const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
 window.setTimeout(()=>URL.revokeObjectURL(url),500);
}
function filename(s:string){return (s||'company').replace(/[^a-z0-9-_]/gi,'-').slice(0,45)||'company';}
export default function ForensicReportPanel({assessment,compact=false}:{assessment:Assessment;compact?:boolean}){
 const [filter,setFilter]=useState<'all'|SignalSeverity>('all');
 const [traceOpen,setTraceOpen]=useState(false);
 const [openSignals,setOpenSignals]=useState<string[]>([]);
 const forensic=useForensicReport(assessment);
 const report=forensic.value;
 const findings=filter==='all'?report.signals:report.signals.filter(x=>x.severity===filter);
 function exportReport(){
  const payload={...report,computedBy:forensic.source==='engine'?'creqor-dgx-engine':'browser-fallback',exportedAt:new Date().toISOString(),disclaimer:'Unverified analyst input; not an independent rating or advice.'};
  download(JSON.stringify(payload,null,2),'CREQOR-'+filename(assessment.name)+'-forensic-review.json','application/json');
 }
 function exportIssues(){
  const fields=['Priority','Severity','Category','Finding','Observation','Implication','Required action'];
  const rows=[fields,...report.signals.map((s,i)=>[String(i+1),s.severity,s.category,s.headline,s.observation,s.implication,s.action])];
  download(rows.map(r=>r.map(secureCsv).join(',')).join('\r\n'),'CREQOR-'+filename(assessment.name)+'-investigation-queue.csv','text/csv;charset=utf-8');
 }
 return <section className={'fi-report'+(compact?' is-compact':'')} aria-label="CREQOR forensic intelligence review">
  <div className="fi-report-head">
   <div><span className="fi-kicker"><span className="fi-signal"/> DETERMINISTIC COMPANY INTELLIGENCE</span>
    <h3>Follow the evidence. Challenge the numbers.</h3>
    <p>Rules examine your current assessment, surface discrepancies and produce an investigation queue. No source link is treated as independently authenticated.</p>
    <EngineProvenance view={forensic}/>
   </div>
   <div className="fi-report-tools">
    <button type="button" onClick={exportReport}>Export JSON ↗</button>
    <button type="button" onClick={exportIssues} disabled={!report.signals.length}>Export findings CSV ↗</button>
   </div>
  </div>
  <div className="fi-stats" aria-label="Forensic review summary">
   <div><span>Priority warnings</span><strong>{report.summary.critical+report.summary.high}</strong><small>Blocking and high-priority checks</small></div>
   <div><span>Source references</span><strong>{report.summary.sourceLinks}</strong><small>{report.summary.uniqueHosts} different source host(s)</small></div>
   <div><span>Claim-category coverage</span><strong>{report.summary.coverage.referenced}<small> / {report.summary.coverage.required}</small></strong><small>Referenced, not verified</small></div>
   <div><span>Calculated methods</span><strong>{report.summary.calculableMethods}</strong><small>Deterministic arithmetic</small></div>
  </div>
  <div className="fi-grid">
   <div className="fi-dimensions">
    <div className="fi-panel-title"><span>01 / INTELLIGENCE READINESS</span><h4>What is present—and what is not.</h4></div>
    <div className="fi-dimension-list">{report.dimensions.map(item=><div className="fi-dimension" key={item.key}>
     <span className={'fi-indicator '+item.status} aria-hidden="true"/>
     <div><strong>{item.label}</strong><p>{item.detail}</p></div>
     <span className={'fi-dimension-status '+item.status}>{item.status==='referenced'?'REFERENCED':item.status==='incomplete'?'PARTIAL':'MISSING'}</span>
    </div>)}</div>
   </div>
   <div className="fi-queue">
    <div className="fi-panel-title"><span>02 / ACTIONABLE REVIEW SIGNALS</span><h4>What deserves investigation.</h4></div>
    <div className="fi-filters" role="group" aria-label="Filter forensic signals">
     {(['all','critical','high','review'] as const).map(value=><button type="button" key={value} aria-pressed={filter===value} onClick={()=>setFilter(value)} className={filter===value?'is-active':''}>{value==='all'?'All ('+report.signals.length+')':severityNames[value]+' ('+report.signals.filter(s=>s.severity===value).length+')'}</button>)}
    </div>
    <div className="fi-findings">
     {findings.map((item:ForensicSignal)=><article className={'fi-finding fi-'+item.severity} key={item.id}>
      <button type="button" aria-expanded={openSignals.includes(item.id)} onClick={()=>setOpenSignals(old=>old.includes(item.id)?old.filter(x=>x!==item.id):[...old,item.id])}>
       <span className={'fi-severity fi-'+item.severity}>{severityNames[item.severity]}</span>
       <strong>{item.headline}</strong><span className="fi-expand">{openSignals.includes(item.id)?'−':'+'}</span>
      </button>
      <p>{item.observation}</p>
      {openSignals.includes(item.id)&&<div className="fi-finding-details"><p><strong>Why it matters:</strong> {item.implication}</p><p><strong>Next investigation:</strong> {item.action}</p>{item.relatedEvidenceIds.length>0&&<small>Related local evidence references: {item.relatedEvidenceIds.length}</small>}</div>}
     </article>)}
     {findings.length===0&&<div className="fi-empty">No signals for this filter. This does not mean the company or its sources have been verified.</div>}
    </div>
   </div>
  </div>
  <div className="fi-trace">
   <button type="button" className="fi-trace-toggle" aria-expanded={traceOpen} onClick={()=>setTraceOpen(x=>!x)}>
    <span><span className="fi-kicker">03 / SOURCE-TO-CLAIM MAP</span><strong>Explore which references support each claim category</strong></span><span>{traceOpen?'−':'+'}</span>
   </button>
   {traceOpen&&<div className="fi-claims">{report.trace.map(claim=><div className="fi-claim" key={claim.claim}>
    <div><strong>{claim.label}</strong><small>{claim.references} reference(s) · {claim.sourceHosts.length} distinct host label(s)</small></div>
    {claim.entries.length>0?<ul>{claim.entries.map(entry=><li key={entry.id}><span>{entry.title}</span><small>{entry.host} · {entry.asOf||'undated'} · {entry.kind.replace(/_/g,' ')}</small></li>)}</ul>:<p>No recorded source in this claim category.</p>}
   </div>)}</div>}
  </div>
  {report.nextActions.length>0&&<div className="fi-next">
   <span className="fi-kicker">INVESTIGATION QUEUE</span>
   <ol>{report.nextActions.slice(0,5).map(item=><li key={item.signalId}>{item.action}</li>)}</ol>
  </div>}
  <p className="fi-caveat"><strong>Not a company rating.</strong> These checks only inspect user-entered fields, the structure of referenced sources and the maths behind calculated values. CREQOR has not retrieved or independently authenticated the referenced documents, resolved contradictory source content or issued investment advice.</p>
 </section>;
}
