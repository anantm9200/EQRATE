import {calculateDcf} from './valuation';

/**
 * Deterministic valuation scenarios with explicit provenance on every input.
 * Inputs are either `source` (a stored, filing-referenced figure) or `assumption`
 * (supplied by the analyst). Nothing is defaulted: a missing discount rate, growth
 * rate, multiple or share count is an error, not a guess. Outputs are illustrative
 * analyst scenarios — not observed market capitalisation, prices or ratings.
 */
export type Provenance='source'|'assumption';
export type Input={value:number;provenance:Provenance;reference?:string};
export type ScenarioCase={label:'bear'|'base'|'bull';annualGrowthPct:number;discountPct:number;terminalGrowthPct:number};
export type ValuationRequest={
 currency:string;
 baseFreeCashFlow:Input;
 forecastYears:number;
 cases:ScenarioCase[];
 bridge:{totalDebt?:Input;cash?:Input;minorityInterest?:Input;preferredEquity?:Input};
 sharesOutstanding?:Input;
 sensitivity?:{discountPct:number[];terminalGrowthPct:number[];growthPct?:number};
 multiples?:{metric:'revenue'|'ebitda';metricValue:Input;low:number;mid:number;high:number};
 bookValue?:{assets:Input;liabilities:Input};
};
export type ScenarioOutput={label:ScenarioCase['label'];assumptions:ScenarioCase;enterpriseValue:number;
 equityValue:number;perShare:number|null;presentValueOfForecast:number;presentValueOfTerminal:number;terminalShareOfEv:number};
export type ValuationResult={kind:'analyst-scenario';currency:string;scenarios:ScenarioOutput[];
 bridge:{enterpriseToEquityAdjustment:number;components:Record<string,Input|null>};
 sensitivity:{discountPct:number[];terminalGrowthPct:number[];growthPct:number;equityValue:(number|null)[][];perShare:(number|null)[][]}|null;
 multiples:{metric:string;metricValue:Input;enterpriseValue:{low:number;mid:number;high:number};equityValue:{low:number;mid:number;high:number};
  perShare:{low:number|null;mid:number|null;high:number|null}}|null;
 netAssetValue:{bookEquity:number;perShare:number|null;basis:string}|null;
 inputs:Record<string,Input|undefined>;disclosure:string};

const fin=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n);
function checkInput(name:string,i:Input|undefined,required:boolean,opts:{positive?:boolean}={}):void{
 if(!i){if(required)throw new Error('VALUATION_INPUT_REQUIRED_'+name);return;}
 if(!fin(i.value)||Math.abs(i.value)>1e16||!['source','assumption'].includes(i.provenance))throw new Error('VALUATION_INVALID_'+name);
 if(opts.positive&&i.value<=0)throw new Error('VALUATION_NON_POSITIVE_'+name);
 if(i.provenance==='source'&&(!i.reference||i.reference.length>300))throw new Error('VALUATION_SOURCE_REFERENCE_REQUIRED_'+name);
}
function checkCase(c:ScenarioCase){
 if(!['bear','base','bull'].includes(c.label)||![c.annualGrowthPct,c.discountPct,c.terminalGrowthPct].every(fin)||
  Math.abs(c.annualGrowthPct)>60||c.discountPct<=0||c.discountPct>40||c.terminalGrowthPct<-5||c.terminalGrowthPct>6||
  c.terminalGrowthPct>=c.discountPct)throw new Error('VALUATION_INVALID_CASE_'+String(c.label).toUpperCase());
}
export function runValuation(req:ValuationRequest):ValuationResult{
 if(!/^[A-Z]{3}$/.test(req.currency))throw new Error('VALUATION_INVALID_CURRENCY');
 checkInput('BASE_FREE_CASH_FLOW',req.baseFreeCashFlow,true);
 if(!Number.isSafeInteger(req.forecastYears)||req.forecastYears<1||req.forecastYears>15)throw new Error('VALUATION_INVALID_FORECAST_YEARS');
 if(!Array.isArray(req.cases)||req.cases.length<1||req.cases.length>3)throw new Error('VALUATION_CASES_REQUIRED');
 const labels=new Set(req.cases.map(c=>c.label));
 if(labels.size!==req.cases.length)throw new Error('VALUATION_DUPLICATE_CASE');
 req.cases.forEach(checkCase);
 const b=req.bridge||{};
 checkInput('TOTAL_DEBT',b.totalDebt,true);checkInput('CASH',b.cash,true);
 checkInput('MINORITY_INTEREST',b.minorityInterest,false);checkInput('PREFERRED_EQUITY',b.preferredEquity,false);
 checkInput('SHARES_OUTSTANDING',req.sharesOutstanding,false,{positive:true});
 const adjustment=b.totalDebt!.value-b.cash!.value+(b.minorityInterest?.value??0)+(b.preferredEquity?.value??0);
 const shares=req.sharesOutstanding?.value;
 const perShare=(equity:number)=>shares?equity/shares:null;
 const scenarios=req.cases.map(c=>{
  const r=calculateDcf({baseFreeCashFlow:req.baseFreeCashFlow.value,annualGrowth:c.annualGrowthPct/100,
   discountRate:c.discountPct/100,terminalGrowth:c.terminalGrowthPct/100,forecastYears:req.forecastYears,netDebt:adjustment,
   sharesOutstanding:shares});
  const pvForecast=r.projectedCashFlows.reduce((s,cf,i)=>s+cf/Math.pow(1+c.discountPct/100,i+1),0);
  const pvTerminal=r.enterpriseValue-pvForecast;
  return {label:c.label,assumptions:c,enterpriseValue:r.enterpriseValue,equityValue:r.equityValue,perShare:r.impliedPerShare,
   presentValueOfForecast:pvForecast,presentValueOfTerminal:pvTerminal,
   terminalShareOfEv:r.enterpriseValue!==0?pvTerminal/r.enterpriseValue:0};
 }).sort((a,b)=>['bear','base','bull'].indexOf(a.label)-['bear','base','bull'].indexOf(b.label));
 let sensitivity:ValuationResult['sensitivity']=null;
 if(req.sensitivity){
  const {discountPct,terminalGrowthPct}=req.sensitivity;
  const growthPct=req.sensitivity.growthPct??req.cases.find(c=>c.label==='base')?.annualGrowthPct;
  if(!fin(growthPct)||!Array.isArray(discountPct)||!Array.isArray(terminalGrowthPct)||
   discountPct.length<1||discountPct.length>9||terminalGrowthPct.length<1||terminalGrowthPct.length>9||
   ![...discountPct,...terminalGrowthPct].every(fin))throw new Error('VALUATION_INVALID_SENSITIVITY');
  const equity=discountPct.map(d=>terminalGrowthPct.map(g=>{
   if(g>=d||d<=0)return null; // undefined cell, not an error and never a fabricated number
   return calculateDcf({baseFreeCashFlow:req.baseFreeCashFlow.value,annualGrowth:growthPct/100,discountRate:d/100,
    terminalGrowth:g/100,forecastYears:req.forecastYears,netDebt:adjustment}).equityValue;
  }));
  sensitivity={discountPct,terminalGrowthPct,growthPct,equityValue:equity,
   perShare:equity.map(row=>row.map(v=>v===null?null:perShare(v)))};
 }
 let multiples:ValuationResult['multiples']=null;
 if(req.multiples){
  const m=req.multiples;
  checkInput('MULTIPLE_METRIC',m.metricValue,true);
  if(!['revenue','ebitda'].includes(m.metric)||![m.low,m.mid,m.high].every(fin)||m.low<=0||m.low>m.mid||m.mid>m.high||m.high>100)
   throw new Error('VALUATION_INVALID_MULTIPLES');
  const ev={low:m.metricValue.value*m.low,mid:m.metricValue.value*m.mid,high:m.metricValue.value*m.high};
  const eq={low:ev.low-adjustment,mid:ev.mid-adjustment,high:ev.high-adjustment};
  multiples={metric:m.metric,metricValue:m.metricValue,enterpriseValue:ev,equityValue:eq,
   perShare:{low:perShare(eq.low),mid:perShare(eq.mid),high:perShare(eq.high)}};
 }
 let nav:ValuationResult['netAssetValue']=null;
 if(req.bookValue){
  checkInput('BOOK_ASSETS',req.bookValue.assets,true);checkInput('BOOK_LIABILITIES',req.bookValue.liabilities,true);
  const bookEquity=req.bookValue.assets.value-req.bookValue.liabilities.value;
  nav={bookEquity,perShare:perShare(bookEquity),basis:'reported total assets - total liabilities (book value, not fair value)'};
 }
 for(const s of scenarios)if(![s.enterpriseValue,s.equityValue].every(v=>fin(v)&&Math.abs(v)<1e18))throw new Error('VALUATION_OUTSIDE_SAFE_RANGE');
 return {kind:'analyst-scenario',currency:req.currency,scenarios,
  bridge:{enterpriseToEquityAdjustment:adjustment,components:{totalDebt:b.totalDebt??null,cash:b.cash??null,
   minorityInterest:b.minorityInterest??null,preferredEquity:b.preferredEquity??null}},
  sensitivity,multiples,netAssetValue:nav,
  inputs:{baseFreeCashFlow:req.baseFreeCashFlow,sharesOutstanding:req.sharesOutstanding},
  disclosure:'Illustrative analyst scenarios. Growth, discount and terminal rates and any multiples are analyst assumptions; '+
   'source inputs are registrant-reported figures with filing references. Not market capitalisation, a price target or a credit rating.'};
}
