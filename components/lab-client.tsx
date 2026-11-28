'use client';
import {useMemo,useState} from 'react';
import type {DcfInput} from '@/lib/valuation';
import {useDcfCases} from '@/lib/use-engine';
import EngineProvenance from '@/components/engine-provenance';
const initial={baseFreeCashFlow:100,annualGrowth:6,discountRate:11,terminalGrowth:3,forecastYears:5,netDebt:25,sharesOutstanding:50};
type Field=keyof typeof initial;
const fields:{key:Field;label:string;suffix:string;help:string}[]=[
 {key:'baseFreeCashFlow',label:'Starting annual free cash flow',suffix:'USD million',help:'Cash flow before projected growth'},
 {key:'annualGrowth',label:'Annual cash-flow growth',suffix:'%',help:'Illustrative annual change'},
 {key:'discountRate',label:'Discount rate / WACC',suffix:'%',help:'Required return applied to cash flows'},
 {key:'terminalGrowth',label:'Long-run terminal growth',suffix:'%',help:'Must be below discount rate'},
 {key:'forecastYears',label:'Forecast horizon',suffix:'years',help:'1 to 30 years'},
 {key:'netDebt',label:'Net debt and adjustments',suffix:'USD million',help:'Subtract net debt to bridge to equity'},
 {key:'sharesOutstanding',label:'Fully diluted shares',suffix:'million shares',help:'Illustrative per-share calculation'}
];
function outputNumber(n:number){return new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(n)}
function inputFrom(x:typeof initial):DcfInput{
 return {baseFreeCashFlow:x.baseFreeCashFlow,annualGrowth:x.annualGrowth/100,discountRate:x.discountRate/100,
 terminalGrowth:x.terminalGrowth/100,forecastYears:x.forecastYears,netDebt:x.netDebt,sharesOutstanding:x.sharesOutstanding};
}
const discountDeltas=[-2,-1,0,1,2],terminalDeltas=[-1,-.5,0,.5,1];
export default function LabClient(){
 const [values,setValues]=useState(initial);const [scenario,setScenario]=useState<'bear'|'base'|'bull'>('base');
 const adjusted=useMemo(()=>scenario==='base'?values:scenario==='bear'?{...values,annualGrowth:values.annualGrowth-3,discountRate:values.discountRate+1.5,terminalGrowth:values.terminalGrowth-.5}:{...values,annualGrowth:values.annualGrowth+3,discountRate:values.discountRate-1,terminalGrowth:values.terminalGrowth+.5},[scenario,values]);
 // One batch to the private DGX engine: the selected scenario followed by the 5×5 sensitivity grid.
 const cases=useMemo(()=>[inputFrom(adjusted),...discountDeltas.flatMap(d=>terminalDeltas.map(t=>inputFrom({...values,discountRate:values.discountRate+d,terminalGrowth:values.terminalGrowth+t})))],[adjusted,values]);
 const engine=useDcfCases(cases);
 const outcomes=engine.value;
 const calculation=outcomes[0]?.ok?{result:outcomes[0].result,error:''}:{result:null,error:outcomes[0]&&!outcomes[0].ok?outcomes[0].error:'Invalid inputs'};
 const sensitivity=discountDeltas.map((d,i)=>({delta:d,values:terminalDeltas.map((_,j)=>{const o=outcomes[1+i*terminalDeltas.length+j];return o?.ok?o.result.equityValue:null;})}));
 function update(key:Field,value:string){setValues(v=>({...v,[key]:value.trim()===''?NaN:Number(value)}))}
 const result=calculation.result;
 return <div className="lab-grid">
  <div className="panel"><span className="micro-label">DCF / INPUT CONSOLE</span><h3>Make every assumption count.</h3><p style={{marginBottom:24}}>Edit the financial inputs. Results update immediately, with no AI deciding the arithmetic.</p>
    <div className="form-grid">{fields.map(field=><div className="field" key={field.key}><label htmlFor={field.key}>{field.label}</label><div style={{position:'relative'}}><input id={field.key} type="number" inputMode="decimal" step={field.key==='forecastYears'?1:'any'} value={Number.isNaN(values[field.key])?'':values[field.key]} onChange={e=>update(field.key,e.target.value)}/></div><small className="muted" style={{fontSize:'.63rem'}}>{field.suffix} · {field.help}</small></div>)}</div>
    <div className="button-row" style={{marginTop:27}}><button className="secondary-button" onClick={()=>{setValues(initial);setScenario('base')}}>Reset illustrative inputs ↺</button><span className="source-note" style={{margin:0}}>Inputs are hypothetical, not a company estimate.</span></div>
  </div>
  <div className="panel dark lab-result"><span className="micro-label">HYPOTHETICAL EQUITY VALUATION</span><EngineProvenance view={engine}/>
   <div className="lab-scenarios" role="group" aria-label="Valuation scenario">{(['bear','base','bull'] as const).map(s=><button key={s} type="button" aria-pressed={scenario===s} className={scenario===s?'active':''} onClick={()=>setScenario(s)}>{s} case</button>)}</div>
   {result?<><div className="metric-small">ESTIMATED EQUITY VALUE / USD MILLION</div><div className="result-big">$ {outputNumber(result.equityValue)}M</div><p>DCF scenario output using the selected hypothetical inputs. Not a publicly traded market capitalisation.</p>
   <div className="metric-list"><div><span className="metric-small">ENTERPRISE VALUE</span><strong>$ {outputNumber(result.enterpriseValue)}M</strong></div><div><span className="metric-small">IMPLIED / SHARE</span><strong>{result.impliedPerShare===null?'Not available':'$ '+outputNumber(result.impliedPerShare)}</strong></div><div><span className="metric-small">TERMINAL VALUE</span><strong>$ {outputNumber(result.terminalValue)}M</strong></div><div><span className="metric-small">NET DEBT</span><strong>$ {outputNumber(adjusted.netDebt)}M</strong></div></div>
   <svg viewBox="0 0 400 118" className="lab-chart" role="img" aria-label="Illustrative projected cash flow growth chart"><defs><linearGradient id="linefill" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#7d9bd0" stopOpacity=".32"/><stop offset="1" stopColor="#7d9bd0" stopOpacity="0"/></linearGradient></defs><path d={'M0 114 '+result.projectedCashFlows.map((x,i)=>'L'+(i*400/Math.max(1,result.projectedCashFlows.length-1))+' '+(102-80*Math.max(0,Math.min(1,(x-(Math.min(...result.projectedCashFlows)-1))/(Math.max(...result.projectedCashFlows)-Math.min(...result.projectedCashFlows)+1))))).join(' ')} stroke="#a4bce6" strokeWidth="2" fill="none"/><path d="M0 115H400" stroke="rgba(234,255,235,.18)"/></svg>
   </>:<div className="notice warning" role="alert">{calculation.error}</div>}
   <p className="source-note" style={{color:'#abb9d0'}}>No market-data feed is implied. The same financial inputs can be independently reproduced using the documented DCF formula.</p>
  </div>
  <div className="panel"><span className="micro-label">SENSITIVITY / LIVE CALCULATION</span><h3>Where the answer changes.</h3><p style={{marginBottom:24}}>Equity value in USD millions, at different discount rates (rows) and terminal growth rates (columns). Unavailable combinations are shown as —.</p><div className="table-wrap"><table className="data-table"><thead><tr><th>WACC ↓ / growth →</th>{[-1,-.5,0,.5,1].map(x=><th key={x}>{outputNumber(values.terminalGrowth+x)}%</th>)}</tr></thead><tbody>{sensitivity.map(row=><tr key={row.delta}><td><strong>{outputNumber(values.discountRate+row.delta)}%</strong></td>{row.values.map((n,i)=><td key={i} style={{background:row.delta===0&&i===2?'#dee3eb':''}}>{n===null?'—':outputNumber(n)}</td>)}</tr>)}</tbody></table></div></div>
 </div>;
}