import {calculateDcf} from './valuation';
import type {FinancialFact} from './sec-financial-history';
type InputFact=Pick<FinancialFact,'concept'|'value'|'periodStart'|'periodEnd'|'filed'|'form'|'unit'|'accession'|'sourceUrl'>;
const revenueTags=['RevenueFromContractWithCustomerExcludingAssessedTax','Revenues','SalesRevenueNet'];
export type FinancialSummary={
 periodEnd:string;reportedRevenue:number|null;reportedNetIncome:number|null;
 reportedOperatingCashFlow:number|null;reportedCapex:number|null;
 derivedFreeCashFlow:number|null;netMarginPct:number|null;revenueYoYPct:number|null;
 sourceFacts:{concept:string;value:number;filed:string;periodEnd:string;sourceUrl:string;accession:string}[];
};
const isAnnual=(r:InputFact)=>{
 if(!['10-K','10-K/A'].includes(r.form)||!r.periodStart)return false;
 const span=(Date.parse(r.periodEnd)-Date.parse(r.periodStart))/86400000;
 return Number.isFinite(span)&&span>=270&&span<=390;
};
function latestForPeriod(facts:InputFact[],concepts:string[],periodEnd:string):InputFact|undefined{
 return facts.filter(f=>f.periodEnd===periodEnd&&f.unit==='USD'&&
  concepts.includes(f.concept)&&isAnnual(f))
  .sort((a,b)=>concepts.indexOf(a.concept)-concepts.indexOf(b.concept)||
   b.filed.localeCompare(a.filed))[0];
}
export function summarizeAnnualFinancials(facts:InputFact[],maxYears=6):FinancialSummary[]{
 const years=[...new Set(facts.filter(x=>isAnnual(x)&&x.unit==='USD'&&
  revenueTags.includes(x.concept)).map(x=>x.periodEnd))]
  .sort((a,b)=>b.localeCompare(a)).slice(0,Math.max(1,Math.min(maxYears,10)));
 const result=years.map(periodEnd=>{
  const selected=[latestForPeriod(facts,revenueTags,periodEnd),
   latestForPeriod(facts,['NetIncomeLoss'],periodEnd),
   latestForPeriod(facts,['NetCashProvidedByUsedInOperatingActivities'],periodEnd),
   latestForPeriod(facts,['PaymentsToAcquirePropertyPlantAndEquipment'],periodEnd)];
  const [revenue,netIncome,cashFlow,capex]=selected;
  const reportedRevenue=revenue?.value??null,reportedNetIncome=netIncome?.value??null;
  const reportedOperatingCashFlow=cashFlow?.value??null,reportedCapex=capex?.value??null;
  const derivedFreeCashFlow=reportedOperatingCashFlow!==null&&reportedCapex!==null?
   reportedOperatingCashFlow-Math.abs(reportedCapex):null;
  const netMarginPct=reportedRevenue!==null&&reportedRevenue>0&&reportedNetIncome!==null?
   (reportedNetIncome/reportedRevenue)*100:null;
  return {periodEnd,reportedRevenue,reportedNetIncome,reportedOperatingCashFlow,
   reportedCapex,derivedFreeCashFlow,netMarginPct,revenueYoYPct:null,
   sourceFacts:selected.filter((x):x is InputFact=>Boolean(x)).map(x=>({
    concept:x.concept,value:x.value,filed:x.filed,periodEnd:x.periodEnd,
    sourceUrl:x.sourceUrl,accession:x.accession}))};
 });
 for(let i=0;i<result.length-1;i++){
  const a=result[i],b=result[i+1];
  const days=(Date.parse(a.periodEnd)-Date.parse(b.periodEnd))/86400000;
  if(days>=330&&days<=400&&b.reportedRevenue!==null&&b.reportedRevenue>0&&a.reportedRevenue!==null)
   a.revenueYoYPct=100*(a.reportedRevenue-b.reportedRevenue)/b.reportedRevenue;
 }
 return result;
}
export type ModelAssumptions={annualGrowthPct:number;discountPct:number;terminalGrowthPct:number;
 forecastYears:number;netDebtUSD:number;sharesOutstanding?:number};
export function scenarioFromReportedCashFlow(summary:FinancialSummary,assumptions:ModelAssumptions){
 const {annualGrowthPct,discountPct,terminalGrowthPct,forecastYears,netDebtUSD,sharesOutstanding}=assumptions;
 if(summary.derivedFreeCashFlow===null)
  throw new Error('REPORTED_OPERATING_CASH_FLOW_AND_CAPEX_REQUIRED');
 if(![annualGrowthPct,discountPct,terminalGrowthPct,forecastYears,netDebtUSD].every(Number.isFinite)||
  Math.abs(annualGrowthPct)>100||discountPct<=0||discountPct>75||
  terminalGrowthPct< -20||terminalGrowthPct>=discountPct||
  !Number.isSafeInteger(forecastYears)||forecastYears<1||forecastYears>20||
  Math.abs(netDebtUSD)>1e15||(sharesOutstanding!==undefined&&
   (!Number.isFinite(sharesOutstanding)||sharesOutstanding<=0)))
  throw new Error('INVALID_SCENARIO_ASSUMPTIONS');
 const results=calculateDcf({baseFreeCashFlow:summary.derivedFreeCashFlow,
  annualGrowth:annualGrowthPct/100,discountRate:discountPct/100,
  terminalGrowth:terminalGrowthPct/100,forecastYears,netDebt:netDebtUSD,sharesOutstanding});
 if(!Number.isFinite(results.enterpriseValue)||!Number.isFinite(results.equityValue)||
   Math.abs(results.enterpriseValue)>1e18||Math.abs(results.equityValue)>1e18)
  throw new Error('SCENARIO_OUTSIDE_SAFE_RANGE');
 return {kind:'illustrative-dcf' as const,sourcePeriod:summary.periodEnd,
  baseFreeCashFlowUSD:summary.derivedFreeCashFlow,assumptions,
  enterpriseValueUSD:results.enterpriseValue,equityValueUSD:results.equityValue,
  impliedPerShareUSD:results.impliedPerShare,
  disclosure:'Scenario calculations are not observed market capitalisation or a credit rating. Growth, discount rate, terminal growth and net debt are analyst assumptions; SEC values are source-attributed registrant reports.'};
}
