import {calculateDcf} from './valuation';
import {computeAssessment,methodNames,type Assessment,type ClaimType,type Method} from './assessment';

/** All values are in the assessment currency, millions except rates and per-share prices. */
export type SensitivityCell={discountPct:number;terminalPct:number;equityValue:number|null;reason?:string};
export type SensitivityTable={available:boolean;reason:string;rows:SensitivityCell[][];baseValue:number|null;discountStep:number;terminalStep:number};
export type Scenario={id:'bear'|'base'|'bull';name:string;value:number|null;growthPct:number;discountPct:number;terminalPct:number;reason:string};
export type ModelRange={count:number;minimum:number|null;maximum:number|null;median:number|null;spreadPct:number|null};
export type EvidenceCoverage={method:Method;label:string;required:ClaimType[];provided:ClaimType[];missing:ClaimType[];complete:boolean;note:string};
export type ReviewFinding={id:string;level:'critical'|'attention'|'informational';title:string;detail:string};
export type Readiness={findings:ReviewFinding[];coverage:EvidenceCoverage[];range:ModelRange;matchedEvidence:number;sourceCount:number;canCalculate:boolean};

function input(a:Assessment){
 const f=a.fields;
 if(f.freeCashFlow===null||f.growthPct===null||f.discountPct===null||f.terminalPct===null||f.forecastYears===null||f.netDebt===null)
  return null;
 if(![f.freeCashFlow,f.growthPct,f.discountPct,f.terminalPct,f.forecastYears,f.netDebt].every(Number.isFinite))return null;
 return {baseFreeCashFlow:f.freeCashFlow,annualGrowth:f.growthPct/100,
  discountRate:f.discountPct/100,terminalGrowth:f.terminalPct/100,
  forecastYears:f.forecastYears,netDebt:f.netDebt};
}
function dcfAt(a:Assessment,discountPct:number,terminalPct:number,growthPct?:number){
 const data=input(a);
 if(!data)return {value:null,reason:'Enter free cash flow, growth, WACC, terminal growth, forecast years and net debt.'};
 try{
  const result=calculateDcf({...data,discountRate:discountPct/100,terminalGrowth:terminalPct/100,
   annualGrowth:(growthPct??data.annualGrowth*100)/100});
  if(!Number.isFinite(result.equityValue)||Math.abs(result.equityValue)>1e15)throw new Error('Value outside supported range');
  return {value:result.equityValue,reason:''};
 }catch(e){return {value:null,reason:e instanceof Error?e.message:'Invalid DCF case'};}
}
export function buildSensitivity(a:Assessment,discountStep=1,terminalStep=.5):SensitivityTable{
 if(![discountStep,terminalStep].every(x=>Number.isFinite(x)&&x>0&&x<=5))
  throw new Error('Sensitivity increments must be between 0 and 5 percentage points.');
 const data=input(a);
 if(!data)return {available:false,reason:'Add all six DCF inputs to calculate sensitivity.',rows:[],baseValue:null,discountStep,terminalStep};
 const wacc=data.discountRate*100,terminal=data.terminalGrowth*100;
 const rows:Array<SensitivityCell[]>=[];
 for(let row=-2;row<=2;row++){
  const cells:SensitivityCell[]=[];
  for(let col=-2;col<=2;col++){
   const d=Number((wacc+row*discountStep).toFixed(4));
   const t=Number((terminal+col*terminalStep).toFixed(4));
   const value=dcfAt(a,d,t);
   cells.push({discountPct:d,terminalPct:t,equityValue:value.value,reason:value.reason||undefined});
  }
  rows.push(cells);
 }
 const base=dcfAt(a,wacc,terminal);
 return {available:base.value!==null,reason:base.reason,rows,baseValue:base.value,discountStep,terminalStep};
}
export function buildScenarios(a:Assessment,growthShift=2,discountShift=2,terminalShift=.5):Scenario[]{
 const f=a.fields;
 const g=f.growthPct??0,w=f.discountPct??0,t=f.terminalPct??0;
 const defs=[
  {id:'bear' as const,name:'Bear case',growthPct:g-growthShift,discountPct:w+discountShift,terminalPct:t-terminalShift},
  {id:'base' as const,name:'Base case',growthPct:g,discountPct:w,terminalPct:t},
  {id:'bull' as const,name:'Bull case',growthPct:g+growthShift,discountPct:w-discountShift,terminalPct:t+terminalShift}
 ];
 return defs.map(x=>{const d=dcfAt(a,x.discountPct,x.terminalPct,x.growthPct);
  return {...x,value:d.value,reason:d.reason};});
}
export function getModelRange(a:Assessment):ModelRange{
 const values=computeAssessment(a).methods.filter(x=>x.status==='calculated'&&typeof x.equityValue==='number')
  .map(x=>x.equityValue as number).filter(Number.isFinite).sort((x,y)=>x-y);
 if(!values.length)return {count:0,minimum:null,maximum:null,median:null,spreadPct:null};
 const median=values.length%2?values[Math.floor(values.length/2)]:(values[values.length/2-1]+values[values.length/2])/2;
 const min=values[0],max=values[values.length-1];
 // For zero / negative midpoints, percent divergence is not interpretable.
 const spreadPct=median>0?100*(max-min)/median:null;
 return {count:values.length,minimum:min,maximum:max,median,spreadPct:Number.isFinite(spreadPct)?spreadPct:null};
}
export function getEvidenceCoverage(a:Assessment):EvidenceCoverage[]{
 const claims=new Set(a.evidence.filter(x=>/^https:\/\//.test(x.url)&&!!x.asOf).map(x=>x.claim));
 return computeAssessment(a).methods.filter(x=>x.status==='calculated').map(x=>{
  const provided=x.requirements.filter(claim=>claims.has(claim));
  const missing=x.requirements.filter(claim=>!claims.has(claim));
  return {method:x.id,label:methodNames[x.id],required:x.requirements,provided,missing,
   complete:missing.length===0,
   note:missing.length===0?'Referenced source categories entered by analyst; not authenticated or reviewed.':
   'Missing source reference categories: '+missing.join(', ')+'.'};
 });
}
export function reviewAssessment(a:Assessment,nowDate:string=new Date().toISOString().slice(0,10)):Readiness{
 const result=computeAssessment(a),range=getModelRange(a),coverage=getEvidenceCoverage(a);
 const findings:ReviewFinding[]=[];
 const add=(id:string,level:ReviewFinding['level'],title:string,detail:string)=>findings.push({id,level,title,detail});
 if(!a.name.trim())add('identity','critical','Legal entity not identified','Enter the exact registered or reporting company name.');
 if(!a.identifier.trim())add('identifier','attention','Official identifier absent','Add a source-supported LEI, CIK, CIN, ISIN or registration identifier.');
 if(!/^\d{4}-\d\d-\d\d$/.test(a.asOf)||Number.isNaN(Date.parse(a.asOf)))
  add('date','critical','Valuation date incomplete','Set a valid assessment as-of date.');
 if(!result.readyMethods && result.marketCap===null)add('value','critical','No calculable financial result','Enter the required financial inputs for at least one selected method or listed share calculation.');
 if(!a.evidence.length)add('evidence','critical','No supporting documents recorded','Add source URLs and publication dates. Financial outputs cannot be independently substantiated.');
 const sources=a.evidence.filter(x=>/^https:\/\//.test(x.url)&&!!x.asOf);
 const stale=sources.filter(x=>{const d=Date.parse(x.asOf);
  return Number.isFinite(d)&&((Date.parse(nowDate)-d)/(86400000))>730;});
 if(stale.length)add('stale','attention','Older source records',stale.length+' of '+sources.length+' dated source links are more than 24 months old; relevance depends on the metric.');
 if(coverage.some(x=>!x.complete))add('unmapped','attention','Missing method-specific evidence',coverage.filter(x=>!x.complete).map(x=>x.label).join(', ')+' need source references for required claim categories.');
 if(a.kind==='listed'&&result.marketCap!==null){
  if(!sources.some(x=>x.claim==='share-price'))add('price','critical','Share price is not source-linked','Manually entered share price has no matching source reference in the evidence register.');
  if(!sources.some(x=>x.claim==='capitalisation'))add('shares','critical','Share count is not source-linked','The share quantity needs a dated capitalisation or filing reference.');
 }
 if(range.count>=2&&range.spreadPct!==null&&range.spreadPct>50)
  add('divergence','attention','Material disagreement between models','Computed methods span '+range.spreadPct.toFixed(1)+'% of their median. Review peer selection, dates and assumptions.');
 if(result.ratingDraft!==null)add('score','informational','Subjective score remains a draft','All scoring inputs were manually entered; this is not an independent or regulated company rating.');
 if(result.readyMethods) add('models','informational','Arithmetic is reproducible','Completed models use deterministic formulas. Source integrity remains an independent question.');
 return {findings,coverage,range,matchedEvidence:sources.length,sourceCount:a.evidence.length,
  canCalculate:result.readyMethods>0||result.marketCap!==null};
}
