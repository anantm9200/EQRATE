import type {FinancialFact} from './sec-financial-history';

/**
 * Deterministic financial analysis over source-attributed SEC companyfacts.
 * - A missing input yields null plus a reason. A missing value is never zero.
 * - Annual flows use only 10-K / 10-K/A durations of a fiscal year (340-380 days).
 * - Balance-sheet values are instants at the fiscal year end.
 * - When a later filing reports a different value for the same concept and period,
 *   the latest filed value is used and the change is surfaced as a restatement.
 * - No prices, market capitalisation or ratings are produced here.
 */
export type AnalysisFact=Pick<FinancialFact,'concept'|'value'|'periodStart'|'periodEnd'|'filed'|'form'|'unit'|'accession'|'sourceUrl'>;
export type SourcedValue={value:number;concept:string;accession:string;filed:string;form:string;sourceUrl:string;
 restated:boolean;originalValue:number|null};
export type DerivedValue={value:number|null;basis:string;missing:string[]};
export type AnnualPeriod={
 periodEnd:string;periodStart:string|null;
 reported:Record<string,SourcedValue|null>;
 derived:{grossProfit:DerivedValue;ebitda:DerivedValue;freeCashFlow:DerivedValue;totalDebt:DerivedValue;
  workingCapital:DerivedValue;netDebt:DerivedValue};
 ratios:Record<string,DerivedValue>;
};
export type FinancialSignal={code:string;direction:'deterioration'|'improvement'|'data-quality';
 severity:'info'|'low'|'medium'|'high';periodEnd:string|null;explanation:string;evidence:Record<string,unknown>};
export type FinancialAnalysis={periods:AnnualPeriod[];trends:Record<string,DerivedValue>;signals:FinancialSignal[];
 coverage:{annualPeriods:number;firstPeriod:string|null;lastPeriod:string|null;amendedFilings:number;restatedValues:number};
 methodology:string[]};

export const FLOW_CONCEPTS:Record<string,string[]>={
 revenue:['RevenueFromContractWithCustomerExcludingAssessedTax','Revenues','SalesRevenueNet'],
 costOfRevenue:['CostOfRevenue'],
 grossProfit:['GrossProfit'],
 operatingIncome:['OperatingIncomeLoss'],
 netIncome:['NetIncomeLoss'],
 operatingCashFlow:['NetCashProvidedByUsedInOperatingActivities'],
 investingCashFlow:['NetCashProvidedByUsedInInvestingActivities'],
 financingCashFlow:['NetCashProvidedByUsedInFinancingActivities'],
 capex:['PaymentsToAcquirePropertyPlantAndEquipment'],
 depreciation:['DepreciationDepletionAndAmortization','DepreciationAndAmortization'],
 interestExpense:['InterestExpense']
};
export const INSTANT_CONCEPTS:Record<string,string[]>={
 assets:['Assets'],liabilities:['Liabilities'],equity:['StockholdersEquity'],
 cash:['CashAndCashEquivalentsAtCarryingValue'],currentAssets:['AssetsCurrent'],
 currentLiabilities:['LiabilitiesCurrent'],longTermDebt:['LongTermDebt'],
 longTermDebtNoncurrent:['LongTermDebtNoncurrent'],longTermDebtCurrent:['LongTermDebtCurrent','DebtCurrent'],
 shortTermBorrowings:['ShortTermBorrowings']
};
const ANNUAL_FORMS=new Set(['10-K','10-K/A']);
const days=(a:string,b:string)=>(Date.parse(b)-Date.parse(a))/86400000;
const isAnnualFlow=(f:AnalysisFact)=>ANNUAL_FORMS.has(f.form)&&f.unit==='USD'&&Boolean(f.periodStart)&&
 days(f.periodStart,f.periodEnd)>=340&&days(f.periodStart,f.periodEnd)<=380;
const isInstant=(f:AnalysisFact)=>ANNUAL_FORMS.has(f.form)&&!f.periodStart;

function pick(facts:AnalysisFact[],concepts:string[],match:(f:AnalysisFact)=>boolean):SourcedValue|null{
 for(const concept of concepts){
  const rows=facts.filter(f=>f.concept===concept&&match(f));
  if(!rows.length)continue;
  rows.sort((a,b)=>b.filed.localeCompare(a.filed)||b.accession.localeCompare(a.accession));
  const latest=rows[0],earliest=rows[rows.length-1];
  const distinct=new Set(rows.map(r=>r.value));
  return {value:latest.value,concept,accession:latest.accession,filed:latest.filed,form:latest.form,
   sourceUrl:latest.sourceUrl,restated:distinct.size>1,originalValue:distinct.size>1?earliest.value:null};
 }
 return null;
}
const ok=(v:SourcedValue|null|undefined):v is SourcedValue=>Boolean(v);
function derived(value:number|null,basis:string,missing:string[]=[]):DerivedValue{
 return {value:value!==null&&Number.isFinite(value)?value:null,basis,missing};
}
function ratio(num:number|null|undefined,den:number|null|undefined,basis:string,names:[string,string],scale=1,requirePositiveDen=true):DerivedValue{
 const missing=[num==null?names[0]:'',den==null?names[1]:''].filter(Boolean);
 if(missing.length)return derived(null,basis,missing);
 if(den===0||(requirePositiveDen&&(den as number)<0))return derived(null,basis+' (undefined: non-positive denominator)',[]);
 return derived(((num as number)/(den as number))*scale,basis);
}
const val=(v:SourcedValue|null|undefined)=>v?.value??null;

export function analyzeFinancials(facts:AnalysisFact[],options:{maxYears?:number;asOf?:string}={}):FinancialAnalysis{
 const maxYears=Math.max(1,Math.min(options.maxYears??10,20));
 const usable=facts.filter(f=>Number.isFinite(f.value));
 const anchorConcepts=[...FLOW_CONCEPTS.revenue,...FLOW_CONCEPTS.netIncome];
 const ends=[...new Set(usable.filter(f=>isAnnualFlow(f)&&anchorConcepts.includes(f.concept)).map(f=>f.periodEnd))]
  .sort((a,b)=>b.localeCompare(a)).slice(0,maxYears);
 const periods:AnnualPeriod[]=ends.map(end=>{
  const reported:Record<string,SourcedValue|null>={};
  let periodStart:string|null=null;
  for(const [key,concepts] of Object.entries(FLOW_CONCEPTS)){
   reported[key]=pick(usable,concepts,f=>f.periodEnd===end&&isAnnualFlow(f));
  }
  for(const [key,concepts] of Object.entries(INSTANT_CONCEPTS)){
   reported[key]=pick(usable,concepts,f=>f.periodEnd===end&&isInstant(f)&&f.unit==='USD');
  }
  // Cover-page share count is dated after the fiscal year end (filing date); accept
  // a 10-K cover value dated 0-150 days after year end, else the balance-sheet instant.
  reported.sharesOutstanding=pick(usable,['EntityCommonStockSharesOutstanding'],
   f=>f.unit==='shares'&&ANNUAL_FORMS.has(f.form)&&days(end,f.periodEnd)>=0&&days(end,f.periodEnd)<=150)||
   pick(usable,['CommonStockSharesOutstanding'],f=>f.unit==='shares'&&f.periodEnd===end&&isInstant(f));
  const rev=usable.find(f=>f.periodEnd===end&&isAnnualFlow(f)&&anchorConcepts.includes(f.concept));
  periodStart=rev?.periodStart||null;
  const r=reported;
  const gp=ok(r.grossProfit)?derived(r.grossProfit.value,'reported GrossProfit'):
   derived(val(r.revenue)!==null&&val(r.costOfRevenue)!==null?val(r.revenue)!-val(r.costOfRevenue)!:null,
    'revenue - cost of revenue',[!r.revenue?'revenue':'',!r.costOfRevenue?'costOfRevenue':''].filter(Boolean));
  const ebitda=derived(val(r.operatingIncome)!==null&&val(r.depreciation)!==null?val(r.operatingIncome)!+val(r.depreciation)!:null,
   'operating income + depreciation & amortisation',[!r.operatingIncome?'operatingIncome':'',!r.depreciation?'depreciation':''].filter(Boolean));
  const fcf=derived(val(r.operatingCashFlow)!==null&&val(r.capex)!==null?val(r.operatingCashFlow)!-Math.abs(val(r.capex)!):null,
   'operating cash flow - |capital expenditure| (same fiscal year)',[!r.operatingCashFlow?'operatingCashFlow':'',!r.capex?'capex':''].filter(Boolean));
  let debt:DerivedValue;
  if(ok(r.longTermDebt))debt=derived(r.longTermDebt.value+(val(r.shortTermBorrowings)??0),
   'LongTermDebt (incl. current maturities)'+(r.shortTermBorrowings?' + ShortTermBorrowings':''));
  else if(r.longTermDebtNoncurrent||r.longTermDebtCurrent||r.shortTermBorrowings){
   const parts=[r.longTermDebtNoncurrent,r.longTermDebtCurrent,r.shortTermBorrowings].filter(ok);
   debt=derived(parts.reduce((s,p)=>s+p.value,0),'sum of reported components: '+parts.map(p=>p.concept).join(' + '));
  }else debt=derived(null,'no reported debt concept',['debt']);
  const wc=derived(val(r.currentAssets)!==null&&val(r.currentLiabilities)!==null?val(r.currentAssets)!-val(r.currentLiabilities)!:null,
   'current assets - current liabilities',[!r.currentAssets?'currentAssets':'',!r.currentLiabilities?'currentLiabilities':''].filter(Boolean));
  const netDebt=derived(debt.value!==null&&val(r.cash)!==null?debt.value-val(r.cash)!:null,'total debt - cash and equivalents',
   [debt.value===null?'debt':'',!r.cash?'cash':''].filter(Boolean));
  return {periodEnd:end,periodStart,reported,
   derived:{grossProfit:gp,ebitda,freeCashFlow:fcf,totalDebt:debt,workingCapital:wc,netDebt},ratios:{}};
 });
 // Ratios (need prior year for averages / growth).
 for(let i=0;i<periods.length;i++){
  const p=periods[i],prev=periods[i+1];
  const r=p.reported;
  const comparablePrev=prev&&days(prev.periodEnd,p.periodEnd)>=340&&days(prev.periodEnd,p.periodEnd)<=380?prev:undefined;
  const avg=(a:number|null,b:number|null|undefined)=>a!==null&&b!=null?(a+b)/2:null;
  const avgEquity=avg(val(r.equity),comparablePrev?val(comparablePrev.reported.equity):null);
  const avgAssets=avg(val(r.assets),comparablePrev?val(comparablePrev.reported.assets):null);
  const growth=(cur:number|null,old:number|null|undefined,name:string):DerivedValue=>{
   if(!comparablePrev)return derived(null,'year-over-year change',['comparable prior fiscal year']);
   if(cur===null||old==null)return derived(null,'year-over-year change',[name]);
   if(old<=0)return derived(null,'year-over-year change (undefined: prior value not positive)');
   return derived(100*(cur-old)/old,'year-over-year change');
  };
  p.ratios={
   grossMarginPct:ratio(p.derived.grossProfit.value,val(r.revenue),'gross profit / revenue',['grossProfit','revenue'],100),
   operatingMarginPct:ratio(val(r.operatingIncome),val(r.revenue),'operating income / revenue',['operatingIncome','revenue'],100),
   netMarginPct:ratio(val(r.netIncome),val(r.revenue),'net income / revenue',['netIncome','revenue'],100),
   fcfMarginPct:ratio(p.derived.freeCashFlow.value,val(r.revenue),'free cash flow / revenue',['freeCashFlow','revenue'],100),
   returnOnEquityPct:avgEquity!==null?ratio(val(r.netIncome),avgEquity,'net income / average equity',['netIncome','averageEquity'],100):
    ratio(val(r.netIncome),val(r.equity),'net income / ending equity (no comparable prior year)',['netIncome','equity'],100),
   returnOnAssetsPct:avgAssets!==null?ratio(val(r.netIncome),avgAssets,'net income / average assets',['netIncome','averageAssets'],100):
    ratio(val(r.netIncome),val(r.assets),'net income / ending assets (no comparable prior year)',['netIncome','assets'],100),
   currentRatio:ratio(val(r.currentAssets),val(r.currentLiabilities),'current assets / current liabilities',['currentAssets','currentLiabilities']),
   debtToEquity:ratio(p.derived.totalDebt.value,val(r.equity),'total debt / equity',['totalDebt','equity']),
   liabilitiesToAssets:ratio(val(r.liabilities),val(r.assets),'total liabilities / total assets',['liabilities','assets']),
   cashConversion:ratio(val(r.operatingCashFlow),val(r.netIncome),'operating cash flow / net income',['operatingCashFlow','netIncome']),
   interestCoverage:ratio(val(r.operatingIncome),val(r.interestExpense),'operating income / interest expense',['operatingIncome','interestExpense']),
   revenueGrowthPct:growth(val(r.revenue),comparablePrev?val(comparablePrev.reported.revenue):null,'revenue'),
   netIncomeGrowthPct:growth(val(r.netIncome),comparablePrev?val(comparablePrev.reported.netIncome):null,'netIncome'),
   debtGrowthPct:growth(p.derived.totalDebt.value,comparablePrev?.derived.totalDebt.value,'totalDebt'),
   workingCapitalChange:derived(comparablePrev&&p.derived.workingCapital.value!==null&&comparablePrev.derived.workingCapital.value!==null?
    p.derived.workingCapital.value-comparablePrev.derived.workingCapital.value:null,'change in working capital vs prior fiscal year')
  };
 }
 const trends=computeTrends(periods);
 const signals=computeSignals(periods,usable,options.asOf);
 const amended=new Set(usable.filter(f=>f.form.endsWith('/A')).map(f=>f.accession)).size;
 const restated=periods.reduce((n,p)=>n+Object.values(p.reported).filter(v=>v?.restated).length,0);
 return {periods,trends,signals,
  coverage:{annualPeriods:periods.length,firstPeriod:periods.at(-1)?.periodEnd??null,lastPeriod:periods[0]?.periodEnd??null,
   amendedFilings:amended,restatedValues:restated},
  methodology:[
   'Annual flows: 10-K/10-K/A facts with a 340-380 day duration ending on the fiscal year end.',
   'Balance-sheet items: instants at the fiscal year end. Latest filed value wins; earlier differing values are reported as restatements.',
   'Missing inputs produce null with the missing field named. No value is ever imputed or set to zero.',
   'Free cash flow = operating cash flow - |capital expenditure|; EBITDA = operating income + D&A, both only when every input is reported for the same year.',
   'Growth rates compare consecutive fiscal years 340-380 days apart with a positive base.'
  ]};
}
function computeTrends(periods:AnnualPeriod[]):Record<string,DerivedValue>{
 const chron=[...periods].reverse();
 const cagr=(years:number):DerivedValue=>{
  if(chron.length<years+1)return derived(null,years+'-year revenue CAGR',[String(years+1)+' annual periods']);
  const last=chron.at(-1)!,first=chron[chron.length-1-years];
  const a=val(first.reported.revenue),b=val(last.reported.revenue);
  if(a===null||b===null)return derived(null,years+'-year revenue CAGR',['revenue']);
  const span=days(first.periodEnd,last.periodEnd)/365.25;
  if(a<=0||b<=0||Math.abs(span-years)>0.2)return derived(null,years+'-year revenue CAGR (undefined: non-positive endpoint or irregular span)');
  return derived(100*(Math.pow(b/a,1/span)-1),years+'-year revenue CAGR');
 };
 const yoy=chron.map(p=>p.ratios.revenueGrowthPct?.value).filter((v):v is number=>v!==null&&v!==undefined);
 let vol:DerivedValue=derived(null,'standard deviation of annual revenue growth',['3 comparable growth rates']);
 if(yoy.length>=3){const m=yoy.reduce((s,v)=>s+v,0)/yoy.length;
  vol=derived(Math.sqrt(yoy.reduce((s,v)=>s+(v-m)**2,0)/(yoy.length-1)),'sample standard deviation of annual revenue growth (pp)');}
 const om=chron.map((p,i)=>({x:i,y:p.ratios.operatingMarginPct?.value})).filter((p):p is {x:number;y:number}=>p.y!=null);
 let slope:DerivedValue=derived(null,'least-squares slope of operating margin (pp per year)',['3 operating margins']);
 if(om.length>=3){const mx=om.reduce((s,p)=>s+p.x,0)/om.length,my=om.reduce((s,p)=>s+p.y,0)/om.length;
  const den=om.reduce((s,p)=>s+(p.x-mx)**2,0);
  slope=derived(den?om.reduce((s,p)=>s+(p.x-mx)*(p.y-my),0)/den:null,'least-squares slope of operating margin (pp per year)');}
 return {revenueCagr3yPct:cagr(3),revenueCagr5yPct:cagr(5),revenueGrowthVolatilityPp:vol,operatingMarginTrendPpPerYear:slope};
}
function computeSignals(periods:AnnualPeriod[],facts:AnalysisFact[],asOf?:string):FinancialSignal[]{
 const out:FinancialSignal[]=[];
 const today=asOf&&/^\d{4}-\d{2}-\d{2}$/.test(asOf)?asOf:new Date().toISOString().slice(0,10);
 if(!periods.length){
  out.push({code:'NO_ANNUAL_HISTORY',direction:'data-quality',severity:'medium',periodEnd:null,
   explanation:'No eligible 10-K annual revenue or net income history is stored for this registrant.',evidence:{}});
  return out;
 }
 const latest=periods[0];
 if(days(latest.periodEnd,today)>456)out.push({code:'STALE_DISCLOSURE',direction:'data-quality',severity:'medium',periodEnd:latest.periodEnd,
  explanation:'The most recent stored annual period ended more than 15 months ago. A newer annual report may be missing or delayed.',
  evidence:{latestAnnualPeriodEnd:latest.periodEnd,asOf:today}});
 for(const key of ['revenue','netIncome','operatingCashFlow'])if(!latest.reported[key])out.push({code:'MISSING_'+key.toUpperCase(),
  direction:'data-quality',severity:'low',periodEnd:latest.periodEnd,explanation:'The latest annual period has no reported '+key+' in the stored source facts.',evidence:{field:key}});
 for(let i=0;i<periods.length;i++){
  const p=periods[i],r=p.reported;
  const ni=val(r.netIncome),ocf=val(r.operatingCashFlow);
  if(ni!==null&&ocf!==null&&ni>0&&ocf<0)out.push({code:'PROFIT_WITHOUT_OPERATING_CASH',direction:'deterioration',severity:'high',periodEnd:p.periodEnd,
   explanation:'Reported net income was positive while operating cash flow was negative. Review receivables, inventory and revenue recognition.',
   evidence:{netIncome:ni,operatingCashFlow:ocf,accessions:[r.netIncome?.accession,r.operatingCashFlow?.accession]}});
  const rg=p.ratios.revenueGrowthPct?.value,ng=p.ratios.netIncomeGrowthPct?.value;
  if(rg!=null&&ng!=null&&rg>10&&ng<-25)out.push({code:'REVENUE_PROFIT_DIVERGENCE',direction:'deterioration',severity:'medium',periodEnd:p.periodEnd,
   explanation:'Revenue grew materially while net income fell sharply. Review cost structure, one-off items and impairments.',
   evidence:{revenueGrowthPct:round(rg),netIncomeGrowthPct:round(ng)}});
  const dg=p.ratios.debtGrowthPct?.value,debt=p.derived.totalDebt.value,assets=val(r.assets);
  if(dg!=null&&dg>50&&debt!==null&&assets!==null&&assets>0&&debt/assets>0.1)out.push({code:'DEBT_SURGE',direction:'deterioration',severity:'medium',periodEnd:p.periodEnd,
   explanation:'Total reported debt rose by more than half in one year and exceeds 10% of assets.',
   evidence:{debtGrowthPct:round(dg),totalDebt:debt,debtToAssets:round(debt/assets,4),basis:p.derived.totalDebt.basis}});
  const prev=periods[i+1];
  const om=p.ratios.operatingMarginPct?.value,pom=prev?.ratios.operatingMarginPct?.value;
  if(om!=null&&pom!=null&&p.ratios.revenueGrowthPct?.missing.length===0){
   if(om-pom<=-5)out.push({code:'OPERATING_MARGIN_DETERIORATION',direction:'deterioration',severity:'medium',periodEnd:p.periodEnd,
    explanation:'Operating margin fell by at least 5 percentage points versus the prior fiscal year.',evidence:{operatingMarginPct:round(om),priorOperatingMarginPct:round(pom)}});
   if(om-pom>=5)out.push({code:'OPERATING_MARGIN_IMPROVEMENT',direction:'improvement',severity:'info',periodEnd:p.periodEnd,
    explanation:'Operating margin rose by at least 5 percentage points versus the prior fiscal year.',evidence:{operatingMarginPct:round(om),priorOperatingMarginPct:round(pom)}});
  }
  const eq=val(r.equity);
  if(eq!==null&&eq<0)out.push({code:'NEGATIVE_EQUITY',direction:'deterioration',severity:'medium',periodEnd:p.periodEnd,
   explanation:'Reported stockholders’ equity is negative (can reflect buybacks or accumulated losses; check context).',evidence:{stockholdersEquity:eq}});
  const cr=p.ratios.currentRatio?.value;
  if(cr!=null&&cr<1)out.push({code:'CURRENT_RATIO_BELOW_ONE',direction:'deterioration',severity:'low',periodEnd:p.periodEnd,
   explanation:'Current liabilities exceed current assets.',evidence:{currentRatio:round(cr,3)}});
  for(const [key,v] of Object.entries(r))if(v?.restated&&v.originalValue!==null&&Math.abs(v.value-v.originalValue)>Math.max(1,Math.abs(v.originalValue)*0.01))
   out.push({code:'RESTATED_VALUE',direction:'data-quality',severity:Math.abs(v.value-v.originalValue)>Math.abs(v.originalValue)*0.1?'high':'medium',periodEnd:p.periodEnd,
    explanation:'A later filing reports a different value for '+key+' for this period (difference above 1%).',
    evidence:{field:key,concept:v.concept,originalValue:v.originalValue,latestValue:v.value,latestAccession:v.accession,latestFiled:v.filed}});
 }
 const amendments=[...new Set(facts.filter(f=>f.form==='10-K/A').map(f=>f.accession))];
 if(amendments.length>=2)out.push({code:'MULTIPLE_ANNUAL_AMENDMENTS',direction:'data-quality',severity:'low',periodEnd:null,
  explanation:'The registrant filed several amended annual reports containing XBRL financial data.',evidence:{amendedAnnualFilings:amendments.length,accessions:amendments.slice(0,10)}});
 const order={high:0,medium:1,low:2,info:3};
 return out.sort((a,b)=>order[a.severity]-order[b.severity]||(b.periodEnd||'').localeCompare(a.periodEnd||''));
}
function round(v:number,dp=2){const f=10**dp;return Math.round(v*f)/f;}
