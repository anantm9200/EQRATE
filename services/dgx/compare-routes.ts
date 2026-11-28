/**
 * Side-by-side comparison of two companies (by LEI) from reviewed annual-report financials
 * stored on the DGX (`cq_financial_observations`, via `financialProfile`). Fiscal years are
 * aligned across both companies; every cell says whether the figure was reported, computed,
 * or is missing. Nothing is estimated, converted or filled in: a gap stays a gap.
 */
import type {Pool} from 'pg';
import {financialProfile} from './financials';

type Profile=Awaited<ReturnType<typeof financialProfile>>;
type Available=Exclude<Profile,{reported?:undefined}>;
const isAvailable=(p:Profile):p is Available=>p.available&&Array.isArray(p.reported);
export type CompareCell={value:number|null;status:'reported'|'computed'|'not_reported'|'not_computable';
 sourceUrl?:string;page?:number|null;periodEnd?:string};

export const COMPARE_REPORTED=[
 {key:'revenue',label:'Revenue'},{key:'netIncome',label:'Net income'},{key:'operatingCashFlow',label:'Operating cash flow'},
 {key:'totalAssets',label:'Total assets'},{key:'totalLiabilities',label:'Total liabilities'},{key:'bookEquity',label:'Book equity'},
 {key:'currentAssets',label:'Current assets'},{key:'currentLiabilities',label:'Current liabilities'}
] as const;
export const COMPARE_RATIOS=[
 {key:'revenueGrowth',label:'Revenue growth (year on year)'},{key:'netMargin',label:'Net margin'},
 {key:'returnOnEquity',label:'Return on equity'},{key:'returnOnAssets',label:'Return on assets'},
 {key:'currentRatio',label:'Current ratio'},{key:'liabilitiesToEquity',label:'Liabilities to equity'},
 {key:'cashConversion',label:'Cash conversion (OCF / net income)'},{key:'assetTurnover',label:'Asset turnover'}
] as const;
const MAX_YEARS=5;

/** Validates `{leis:[a,b],asOf?}`; throws BAD_* (mapped to HTTP 400 by the engine). */
export function parseCompareRequest(body:unknown):{leis:[string,string];asOf?:string}{
 if(!body||typeof body!=='object'||Array.isArray(body))throw new Error('BAD_REQUEST');
 const {leis,asOf}=body as {leis?:unknown;asOf?:unknown};
 if(!Array.isArray(leis)||leis.length!==2||!leis.every(x=>typeof x==='string'&&/^[A-Za-z0-9]{20}$/.test(x)))throw new Error('BAD_COMPARE_LEIS');
 const pair=leis.map(x=>(x as string).toUpperCase()) as [string,string];
 if(pair[0]===pair[1])throw new Error('BAD_COMPARE_SAME_LEI');
 if(asOf!==undefined&&asOf!==null&&asOf!==''&&(typeof asOf!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(asOf)||Number.isNaN(Date.parse(asOf))))throw new Error('BAD_AS_OF');
 return {leis:pair,asOf:typeof asOf==='string'&&asOf?asOf:undefined};
}

function reportedCell(p:Available,fy:number,concept:string):CompareCell{
 const year=p.reported.find(y=>y.fiscalYear===fy);
 const f=year?.figures.find(x=>x.concept===concept);
 return f?{value:f.normalizedValue,status:'reported',sourceUrl:f.sourceUrl,page:f.page,periodEnd:f.periodEnd}:{value:null,status:'not_reported'};
}
function ratioCell(p:Available,fy:number,key:string):CompareCell{
 const m=p.metrics.find(x=>x.fiscalYear===fy) as Record<string,number|null>|undefined;
 if(!m)return {value:null,status:'not_reported'};
 const v=m[key];
 return typeof v==='number'&&Number.isFinite(v)?{value:v,status:'computed'}:{value:null,status:'not_computable'};
}

export async function compareCompanies(pool:Pool,body:unknown){
 const {leis,asOf}=parseCompareRequest(body);
 const names=await pool.query<{lei:string;legal_name:string;country_code:string|null}>(
  `SELECT lei,legal_name,country_code FROM public.cq_lei_catalogue WHERE lei=ANY($1::text[])`,[leis]);
 const entity=new Map(names.rows.map(r=>[r.lei.trim(),r]));
 if(leis.some(l=>!entity.has(l)))throw new Error('SOURCE_NOT_INDEXED');
 const profiles=await Promise.all(leis.map(l=>financialProfile(pool,l,asOf)));
 const companies=profiles.map((p,i)=>{
  const e=entity.get(leis[i])!;
  return isAvailable(p)?{lei:leis[i],name:e.legal_name,country:e.country_code?.trim()||null,available:true as const,
   scope:p.scope,currency:p.currency,fiscalYears:p.reported.map(y=>y.fiscalYear)}:
   {lei:leis[i],name:e.legal_name,country:e.country_code?.trim()||null,available:false as const,reason:p.reason,fiscalYears:[] as number[]};
 });
 const avail=profiles.filter(isAvailable);
 const fiscalYears=[...new Set(avail.flatMap(p=>p.reported.map(y=>y.fiscalYear)))].sort((a,b)=>b-a).slice(0,MAX_YEARS);
 const cells=(fn:(p:Available,fy:number)=>CompareCell)=>fiscalYears.map(fy=>({fiscalYear:fy,
  values:profiles.map(p=>isAvailable(p)?fn(p,fy):{value:null,status:'not_reported'} as CompareCell)}));
 const reported=COMPARE_REPORTED.map(m=>({metric:m.key,label:m.label,kind:'reported' as const,years:cells((p,fy)=>reportedCell(p,fy,m.key))}));
 const ratios=COMPARE_RATIOS.map(m=>({metric:m.key,label:m.label,kind:'ratio' as const,years:cells((p,fy)=>ratioCell(p,fy,m.key))}));
 const gaps=reported.flatMap(r=>r.years.flatMap(y=>y.values.map((v,i)=>({v,i})).filter(x=>x.v.status==='not_reported')
  .map(x=>({lei:leis[x.i],fiscalYear:y.fiscalYear,metric:r.metric,status:'not reported' as const}))));
 const [a,b]=companies;
 const caveats:string[]=[];
 if(a.available&&b.available){
  if(a.currency!==b.currency)caveats.push(`Currencies differ (${a.currency} vs ${b.currency}); values are not converted.`);
  if(a.scope!==b.scope)caveats.push(`Statement scope differs (${a.scope} vs ${b.scope}).`);
 }
 const comparable=Boolean(a.available&&b.available);
 return {asOf:profiles[0].asOf,leis,companies,comparable,fiscalYears,metrics:[...reported,...ratios],gaps,caveats,
  note:comparable?'Reviewed annual-report figures only, aligned by fiscal year. Reporting periods and accounting choices may differ; a comparison is not a rating or recommendation.':
   'Reviewed financial statements are not stored for '+(avail.length===0?'either company':'one of these companies')+' yet, so no comparison figures are shown. Missing figures are never estimated.'};
}
