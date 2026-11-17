'use client';
import {useMemo,useState} from 'react';
import {useRouter} from 'next/navigation';
import {createAssessment,computeAssessment,formatMillions,formatPerShare,type Assessment,type NumberKey,type Method} from '@/lib/assessment';

type Mode='listed'|'revenue'|'dcf';
type Inputs={price:string;shares:string;revenue:string;multiple:string;netDebt:string;fcf:string;growth:string;wacc:string;terminal:string;years:string};
const example:Inputs={price:'24.60',shares:'120',revenue:'380',multiple:'2.1',netDebt:'45',fcf:'18',growth:'8',wacc:'13',terminal:'3',years:'5'};
const fields:{id:keyof Inputs;label:string;detail:string}[]=[
 {id:'price',label:'Share price',detail:'Per share'},
 {id:'shares',label:'Outstanding shares',detail:'Millions'},
 {id:'revenue',label:'Annual revenue',detail:'Millions'},
 {id:'multiple',label:'EV / revenue multiple',detail:'× revenue'},
 {id:'netDebt',label:'Net debt',detail:'Millions'},
 {id:'fcf',label:'Starting free cash flow',detail:'Millions'},
 {id:'growth',label:'Annual growth',detail:'Percent'},
 {id:'wacc',label:'Discount rate',detail:'Percent'},
 {id:'terminal',label:'Terminal growth',detail:'Percent'},
 {id:'years',label:'Forecast period',detail:'Years'},
];
const modes:{id:Mode;label:string;desc:string;required:(keyof Inputs)[]}[]=[
 {id:'listed',label:'Listed',desc:'Market-cap arithmetic',required:['price','shares']},
 {id:'revenue',label:'Private',desc:'Revenue-multiple estimate',required:['revenue','multiple','netDebt']},
 {id:'dcf',label:'Cash flow',desc:'Five-year DCF model',required:['fcf','growth','wacc','terminal','years','netDebt']}
];
function toNumber(s:string){return s.trim()===''?null:Number(s);}
function valueText(v:number|null,currency:string){return v===null||!Number.isFinite(v)?'Awaiting inputs':formatMillions(v,currency);}
export default function QuickValuation(){
 const router=useRouter();
 const [mode,setMode]=useState<Mode>('revenue');
 const [currency,setCurrency]=useState('USD');
 const [company,setCompany]=useState('');
 const [inputs,setInputs]=useState<Inputs>(example);
 const [demo,setDemo]=useState(true);
 const [warning,setWarning]=useState('');
 const [displayDetails,setDisplayDetails]=useState(false);
 const active=modes.find(m=>m.id===mode)!;
 const calculated=useMemo(()=>{
  const a=createAssessment(new Date().toISOString().slice(0,10));
  a.name=company.trim();
  a.kind=mode==='listed'?'listed':'unlisted';
  a.currency=currency;
  a.active=mode==='listed'?[]:[mode==='revenue'?'revenueMultiple':'dcf'];
  const assign=(key:NumberKey,source:keyof Inputs)=>{a.fields[key]=toNumber(inputs[source]);};
  assign('sharePrice','price');assign('sharesMillions','shares');
  assign('revenue','revenue');assign('revenueMultiple','multiple');
  assign('netDebt','netDebt');assign('freeCashFlow','fcf');
  assign('growthPct','growth');assign('discountPct','wacc');
  assign('terminalPct','terminal');assign('forecastYears','years');
  const result=computeAssessment(a);
  const method=result.methods.find(m=>m.status==='calculated');
  const record=result.methods[0];
  const equity=mode==='listed'?result.marketCap:method?.equityValue??null;
  const enterprise=mode==='listed'?null:method?.enterpriseValue??null;
  const debt=a.fields.netDebt;
  return {a,result,equity,enterprise,debt,method,record};
 },[mode,currency,company,inputs]);
 const detail=mode==='listed'?'Shares × entered price':mode==='revenue'?'Revenue × peer multiple − net debt':'Discounted cash flows − net debt';
 const invalid=calculated.record?.status==='invalid'?calculated.record.detail:'';
 function change(key:keyof Inputs,value:string){setDemo(false);setInputs(old=>({...old,[key]:value}));setWarning('');}
 function clear(){setInputs({price:'',shares:'',revenue:'',multiple:'',netDebt:'',fcf:'',growth:'',wacc:'',terminal:'',years:''});setDemo(false);setWarning('');}
 function sendToWorkbench(){
  if(calculated.equity===null){setWarning(invalid||'Enter the required financial inputs to continue.');return;}
  try{
   const a:Assessment={...calculated.a,analystNotes:demo?'Illustrative example inputs; replace with sourced financial data before drawing any conclusion.':'Draft created from the landing calculator. Source records and review are still required.'};
   sessionStorage.setItem('creqor.workbench.handoff.v1',JSON.stringify(a));
   router.push('/workbench');
  }catch{setWarning('Could not transfer the assessment. You can enter the figures manually in the workbench.');}
 }
 const graphNumerator=Math.max(0,Math.abs(calculated.equity??0));
 const graphEV=Math.max(0,Math.abs(calculated.enterprise??0));
 const graphDebt=Math.max(0,Math.abs(calculated.debt??0));
 const graphMax=Math.max(graphNumerator,graphEV,graphDebt,1);
 return <section className="terminal" aria-labelledby="terminal-title">
  <div className="terminal-label"><span><i className="terminal-dot"/> LIVE CALCULATION ENGINE</span><span className="terminal-status">{demo?'SYNTHETIC EXAMPLE':'USER INPUT / UNVERIFIED'}</span></div>
  <div className="terminal-head">
   <div><span className="terminal-overline">01 / CHOOSE YOUR METHOD</span><h2 id="terminal-title">Find the number. <em>See the logic.</em></h2></div>
   <select aria-label="Currency for illustrative valuation" value={currency} onChange={e=>setCurrency(e.target.value)}>
    {['USD','INR','AED','EUR','GBP','NAD'].map(c=><option key={c} value={c}>{c}</option>)}
   </select>
  </div>
  <div className="terminal-tabs" role="tablist" aria-label="Valuation method">
   {modes.map(m=><button key={m.id} role="tab" aria-selected={mode===m.id} className={mode===m.id?'active':''} onClick={()=>{setMode(m.id);setWarning('')}}>{m.label}</button>)}
  </div>
  <div className="terminal-form">
   <label className="terminal-company-field"><span>COMPANY / OPTIONAL</span><input placeholder="Name the business…" value={company} maxLength={150} onChange={e=>setCompany(e.target.value)}/></label>
   <div className="terminal-input-grid">{active.required.map(id=>{
    const field=fields.find(f=>f.id===id)!;
    return <label className="terminal-input" key={id}><span>{field.label}</span><div><input type="number" inputMode="decimal" value={inputs[id]} step={id==='years'?'1':'any'} placeholder="—" onChange={e=>change(id,e.target.value)}/><small>{field.detail}</small></div></label>;
   })}</div>
  </div>
  <div className="terminal-result">
   <div className="terminal-result-top"><span>CALCULATED {mode==='listed'?'MARKET CAP':'EQUITY VALUE'}</span><span>{currency} / MILLIONS</span></div>
   <div className="terminal-primary-figure" aria-live="polite">{valueText(calculated.equity,currency)}</div>
   <p>{invalid||detail} · {mode==='listed'?'Manual quote, not live exchange data.':'Model estimate, not an observed market price.'}</p>
   <div className="terminal-bridge" aria-label="Calculation components">
    <div><span>{mode==='listed'?'Calculated equity value':'Enterprise value'}</span><i style={{width:((mode==='listed'?graphNumerator:graphEV)/graphMax*100)+'%'}}/><strong>{valueText(mode==='listed'?calculated.equity:calculated.enterprise,currency)}</strong></div>
    {mode!=='listed'&&<div><span>Net debt adjustment</span><i style={{width:(graphDebt/graphMax*100)+'%'}}/><strong>{calculated.debt===null?'Awaiting inputs':formatMillions(calculated.debt,currency)}</strong></div>}
   </div>
  </div>
  {warning&&<p className="terminal-warning" role="alert">{warning}</p>}
  <div className="terminal-actions"><button className="terminal-main-button" type="button" onClick={sendToWorkbench}>Continue in workbench <span>↗</span></button>
   <button className="terminal-small-button" type="button" onClick={clear}>Clear inputs</button>
  </div>
  <button className="terminal-method-toggle" type="button" aria-expanded={displayDetails} onClick={()=>setDisplayDetails(v=>!v)}>
    {displayDetails?'Hide':'Show'} calculation details <span>{displayDetails?'−':'+'}</span>
  </button>
  {displayDetails&&<div className="terminal-details"><p><strong>{active.desc}:</strong> {detail}.</p><p>All inputs shown are user-entered or explicitly synthetic. The platform has no licence-connected price feed or independent issuer verification in this calculator. No investment recommendation or credit rating is generated.</p><p>Transfer the inputs into the full workbench to attach evidence and export a draft report.</p></div>}
 </section>;
}
