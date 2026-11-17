export type SecFinancialMetric={key:string;label:string;value:number;unit:'USD';periodEnd:string;filed:string;form:string;accession:string};
const metrics=[
 {key:'Revenue',label:'Annual revenue',concepts:['RevenueFromContractWithCustomerExcludingAssessedTax','Revenues','SalesRevenueNet'],period:'duration'},
 {key:'NetIncome',label:'Annual net income',concepts:['NetIncomeLoss'],period:'duration'},
 {key:'OperatingIncome',label:'Annual operating income',concepts:['OperatingIncomeLoss'],period:'duration'},
 {key:'CashFlow',label:'Annual operating cash flow',concepts:['NetCashProvidedByUsedInOperatingActivities'],period:'duration'},
 {key:'Assets',label:'Total assets',concepts:['Assets'],period:'instant'},
 {key:'Equity',label:'Stockholders equity',concepts:['StockholdersEquity'],period:'instant'},
 {key:'Cash',label:'Cash and cash equivalents',concepts:['CashAndCashEquivalentsAtCarryingValue'],period:'instant'}
] as const;
type FactRow={val:number;start?:string;end:string;filed:string;form:string;accn:string};
export async function getSecFinancialHighlights(cik:string):Promise<SecFinancialMetric[]>{
 if(!process.env.SEC_USER_AGENT||!/^\d{10}$/.test(cik))return [];
 const response=await fetch('https://data.sec.gov/api/xbrl/companyfacts/CIK'+cik+'.json',{
  headers:{'User-Agent':process.env.SEC_USER_AGENT,'Accept':'application/json'},
  signal:AbortSignal.timeout(12000),next:{revalidate:86400}
 });
 if(!response.ok)return [];
 const data=await response.json();
 if(String(data.cik).padStart(10,'0')!==cik)return [];
 const gaap=data?.facts?.['us-gaap'];
 if(!gaap)return [];
 const out:SecFinancialMetric[]=[];
 for(const metric of metrics){
  for(const concept of metric.concepts){
   const rows=gaap[concept]?.units?.USD as FactRow[]|undefined;
   if(!Array.isArray(rows))continue;
   const candidates=rows.filter(row=>row.form==='10-K'&&Number.isFinite(row.val)&&/^\d{4}-\d{2}-\d{2}$/.test(row.end)&&
    (metric.period==='instant'?!row.start:(typeof row.start==='string'&&((Date.parse(row.end)-Date.parse(row.start))/86400000)>=270&&((Date.parse(row.end)-Date.parse(row.start))/86400000)<=390)));
   candidates.sort((a,b)=>b.end.localeCompare(a.end)||b.filed.localeCompare(a.filed));
   const chosen=candidates[0];
   if(!chosen)continue;
   out.push({key:metric.key,label:metric.label,value:chosen.val,unit:'USD',periodEnd:chosen.end,filed:chosen.filed,form:chosen.form,accession:chosen.accn});
   break;
  }
 }
 return out;
}