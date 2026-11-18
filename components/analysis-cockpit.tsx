'use client';
import {useMemo,useState} from 'react';
import {computeAssessment,formatMillions,type Assessment,type NumberKey} from '@/lib/assessment';
import {buildSensitivity,buildScenarios,reviewAssessment,type Scenario} from '@/lib/research-intelligence';
import ForensicReportPanel from '@/components/forensic-report-panel';

type Props={
 assessment:Assessment;
 onChangeInputs:(inputs:Partial<Record<NumberKey,number>>)=>void;
 onOpenEvidence:()=>void;
 onOpenValuation:()=>void;
 onOpenReport:()=>void;
};
function fmt(n:number|null,currency:string){return n===null?'—':formatMillions(n,currency);}
function signedPct(value:number|null,reference:number|null):string{
 if(value===null||reference===null||Math.abs(reference)<1e-12)return 'n/a';
 return (value>=reference?'+':'')+((value-reference)/Math.abs(reference)*100).toFixed(1)+'% vs base';
}
function riskText(level:'critical'|'attention'|'informational'){
 return level==='critical'?'ACTION REQUIRED':level==='attention'?'REVIEW':'NOTE';
}
export default function AnalysisCockpit({assessment,onChangeInputs,onOpenEvidence,onOpenValuation,onOpenReport}:Props){
 const [discountStep,setDiscountStep]=useState(1);
 const [terminalStep,setTerminalStep]=useState(.5);
 const [growthShift,setGrowthShift]=useState(2);
 const [discountShift,setDiscountShift]=useState(2);
 const [selected,setSelected]=useState<{value:number|null;wacc:number;terminal:number}|null>(null);
 const [feedback,setFeedback]=useState('');
 const result=useMemo(()=>computeAssessment(assessment),[assessment]);
 const review=useMemo(()=>reviewAssessment(assessment),[assessment]);
 const sensitivity=useMemo(()=>buildSensitivity(assessment,discountStep,terminalStep),[assessment,discountStep,terminalStep]);
 const scenarios=useMemo(()=>buildScenarios(assessment,growthShift,discountShift),[assessment,growthShift,discountShift]);
 const available=result.methods.filter(m=>m.status==='calculated'&&typeof m.equityValue==='number');
 const maxValue=Math.max(1,...available.map(m=>Math.abs(m.equityValue||0)));
 const critical=review.findings.filter(x=>x.level==='critical').length;
 const activeCell=selected||{value:sensitivity.baseValue,wacc:assessment.fields.discountPct??0,terminal:assessment.fields.terminalPct??0};
 function applyScenario(s:Scenario){
  if(s.value===null){setFeedback(s.reason||'This case cannot be calculated.');return;}
  if(!window.confirm('Apply the '+s.name.toLowerCase()+' growth, discount and terminal assumptions to the current draft? You can edit them again in Valuation.'))return;
  onChangeInputs({growthPct:s.growthPct,discountPct:s.discountPct,terminalPct:s.terminalPct});
  setSelected(null);setFeedback(s.name+' assumptions applied to the draft. Recalculate and save the assessment when ready.');
  onOpenValuation();
 }
 function exportMatrix(){
  if(!sensitivity.rows.length){setFeedback('Add all required DCF inputs before exporting the matrix.');return;}
  const q=(v:string|number|null)=>'"'+String(v??'').replace(/"/g,'""')+'"';
  const header=['WACC / terminal growth',...sensitivity.rows[0].map(x=>x.terminalPct.toFixed(2)+'%')];
  const data=[header,...sensitivity.rows.map(row=>[row[0].discountPct.toFixed(2)+'%',...row.map(x=>x.equityValue)])];
  const csv=data.map(r=>r.map(q).join(',')).join('\r\n')+'\r\n'+
   ['Label','Analyst-entered scenario; not an independent valuation or market price'].map(q).join(',');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='CREQOR-'+assessment.name.replace(/[^a-z0-9]+/gi,'-').slice(0,50)+'-DCF-sensitivity.csv';
  document.body.appendChild(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1500);
  setFeedback('Sensitivity matrix exported with the exact unrounded model values.');
 }
 return <div className="ic-root">
  <div className="ic-top">
   <div><span className="wk-label">CREQOR / MODEL INTELLIGENCE</span><h3>Find out what moves the valuation.</h3><p>Compare model outcomes, stress-test the DCF and inspect missing source support. Every calculation uses the inputs in this assessment.</p></div>
   <button type="button" className="wk-button wk-outline" onClick={onOpenReport}>Open report ↗</button>
  </div>
  <div className="ic-kpis">
   <div><span>Weighted model estimate</span><strong>{fmt(result.blended,assessment.currency)}</strong><small>Analyst weights · not an observed market price</small></div>
   <div><span>Method value range</span><strong>{review.range.count?fmt(review.range.minimum,assessment.currency)+' — '+fmt(review.range.maximum,assessment.currency):'Insufficient inputs'}</strong><small>{review.range.count} method{review.range.count===1?'':'s'} calculated · same entered currency</small></div>
   <div><span>Method divergence</span><strong>{review.range.spreadPct===null?'—':review.range.spreadPct.toFixed(1)+'%'}</strong><small>Highest minus lowest, relative to method median</small></div>
  </div>
  <section className="ic-block">
   <div className="ic-section-title"><div><span className="wk-label">01 / DCF SENSITIVITY</span><h4>What if the market demands a different return?</h4><p>Change WACC and perpetual growth assumptions. Every cell recalculates the same discounted cash-flow model, including the equity bridge.</p></div>
    <div className="ic-controls">
     <label>WACC step (pp)<select value={discountStep} onChange={e=>{setDiscountStep(Number(e.target.value));setSelected(null)}}>{[.25,.5,1,1.5,2].map(v=><option key={v} value={v}>{v}</option>)}</select></label>
     <label>Terminal step (pp)<select value={terminalStep} onChange={e=>{setTerminalStep(Number(e.target.value));setSelected(null)}}>{[.25,.5,1].map(v=><option key={v} value={v}>{v}</option>)}</select></label>
    </div>
   </div>
   {sensitivity.available?
   <><div className="ic-matrix-wrap"><table className="ic-matrix">
    <thead><tr><th scope="col">WACC ↓ / TERMINAL →</th>{sensitivity.rows[0].map((cell,i)=><th scope="col" key={i}>{cell.terminalPct.toFixed(2)}%</th>)}</tr></thead>
    <tbody>{sensitivity.rows.map((row,i)=><tr key={i}><th scope="row">{row[0].discountPct.toFixed(2)}%</th>{row.map((cell,j)=>{
     const active=(i===2&&j===2);const valid=cell.equityValue!==null;
     return <td key={j}><button type="button" title={valid?'Inspect cell assumptions':cell.reason||'Invalid DCF case'} className={'ic-matrix-cell'+(active?' is-base':'')+(selected?.wacc===cell.discountPct&&selected.terminal===cell.terminalPct?' is-picked':'')} disabled={!valid} onClick={()=>setSelected({value:cell.equityValue,wacc:cell.discountPct,terminal:cell.terminalPct})}>
       {valid?fmt(cell.equityValue,assessment.currency):'n/a'}</button></td>;
    })}</tr>)}</tbody></table></div>
    <div className="ic-matrix-inspect"><div><span>SELECTED CASE</span><strong>{fmt(activeCell.value,assessment.currency)}</strong><small>WACC {activeCell.wacc.toFixed(2)}% · terminal growth {activeCell.terminal.toFixed(2)}%</small></div><div><span>BASE DCF</span><strong>{fmt(sensitivity.baseValue,assessment.currency)}</strong><small>{signedPct(activeCell.value,sensitivity.baseValue)}</small></div><button type="button" className="wk-button wk-outline" onClick={exportMatrix}>Export sensitivity CSV ↗</button></div></>:
   <div className="ic-empty"><strong>DCF sensitivity requires a complete, valid base case.</strong><p>{sensitivity.reason||'Enter the required DCF inputs to begin.'}</p><button type="button" className="wk-button wk-primary" onClick={onOpenValuation}>Edit financial inputs →</button></div>}
  </section>
  <section className="ic-block">
   <div className="ic-section-title"><div><span className="wk-label">02 / SCENARIO ANALYSIS</span><h4>Bear, base and bull.</h4><p>These are explicit sensitivity cases—not forecasts. Bear uses lower growth and higher WACC; bull reverses them.</p></div><div className="ic-controls">
    <label>Growth shift (pp)<select value={growthShift} onChange={e=>setGrowthShift(Number(e.target.value))}>{[1,2,3,5].map(v=><option key={v} value={v}>{v}</option>)}</select></label>
    <label>WACC shift (pp)<select value={discountShift} onChange={e=>setDiscountShift(Number(e.target.value))}>{[.5,1,2,3].map(v=><option key={v} value={v}>{v}</option>)}</select></label>
   </div></div>
   <div className="ic-scenarios">{scenarios.map(s=><article key={s.id} className={'ic-scenario ic-scenario-'+s.id}><div className="ic-scenario-head"><span>{s.name.toUpperCase()}</span><span>{s.value===null?'NOT CALCULABLE':'CALCULATED'}</span></div><strong>{fmt(s.value,assessment.currency)}</strong><p>{s.value===null?s.reason:signedPct(s.value,scenarios[1].value)}</p><div className="ic-scenario-spec"><span>Growth {s.growthPct.toFixed(2)}%</span><span>WACC {s.discountPct.toFixed(2)}%</span><span>Terminal {s.terminalPct.toFixed(2)}%</span></div><button className="wk-button wk-outline" type="button" disabled={s.value===null} onClick={()=>applyScenario(s)}>Apply to draft ↗</button></article>)}</div>
  </section>
  <section className="ic-block">
   <div className="ic-section-title"><div><span className="wk-label">03 / METHOD COMPARISON</span><h4>Where do valuation methods disagree?</h4><p>Method estimates are shown in the current assessment currency. Bars indicate absolute magnitude; signs remain in the numerical values.</p></div></div>
   {available.length?
    <div className="ic-methods">{available.map(m=><div key={m.id} className="ic-method"><div className="ic-method-label"><strong>{m.label}</strong><span>{fmt(m.equityValue??null,assessment.currency)}</span></div><div className="ic-method-track"><span className={m.equityValue!==undefined&&m.equityValue<0?'is-negative':''} style={{width:Math.max(2,Math.abs(m.equityValue||0)/maxValue*100)+'%'}}/></div><small>{m.detail}</small></div>)}</div>:
    <div className="ic-empty"><p>No valuation methods can calculate from the current inputs.</p><button type="button" className="wk-button wk-primary" onClick={onOpenValuation}>Complete the model →</button></div>}
  </section>
  <section className="ic-block">
   <div className="ic-section-title"><div><span className="wk-label">04 / DATA AND EVIDENCE REVIEW</span><h4>What would an independent reviewer challenge?</h4><p>These rules inspect completeness and consistency. They do not authenticate user-supplied documents or issue a confidence score.</p></div><span className={'ic-alert-count'+(critical?' attention':'')}>{critical} blocking gaps</span></div>
   <div className="ic-review-list">{review.findings.map(f=><div key={f.id} className={'ic-review-item level-'+f.level}><span>{riskText(f.level)}</span><div><strong>{f.title}</strong><p>{f.detail}</p></div></div>)}{!review.findings.length&&<div className="ic-review-item"><span>NOTE</span><p>No automatic completeness flags. This does not establish source validity.</p></div>}</div>
   {review.coverage.length>0&&<div className="ic-evidence-map"><h5>Method-to-source coverage</h5>{review.coverage.map(x=><div key={x.method}><strong>{x.label}</strong><span>{x.complete?'Source categories referenced':'Missing: '+x.missing.join(', ')}</span></div>)}</div>}
   <div className="ic-disclosure"><strong>Research status: unverified analyst draft.</strong> Recorded source categories do not confirm document authenticity, the correct issuer, audit scope, or a current traded price. There is no autonomous credit rating or investment recommendation.</div>
   <div className="ic-footer-actions"><button className="wk-button wk-outline" type="button" onClick={onOpenEvidence}>Review source register →</button><button className="wk-button wk-primary" type="button" onClick={onOpenReport}>Generate report →</button></div>
  </section>
  <ForensicReportPanel assessment={assessment} compact/>
  {feedback&&<div className="ic-message" role="status">{feedback}<button type="button" onClick={()=>setFeedback('')} aria-label="Dismiss notification">×</button></div>}
 </div>;
}
