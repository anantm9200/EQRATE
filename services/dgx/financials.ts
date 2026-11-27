/**
 * Company financial profile from stored evidence (annual reports), point in time.
 * Combines: reported figures with citations → derived figures (each labelled with its
 * formula) → ratios → risk/forensic screens → CREQOR Confidence. Nothing is estimated:
 * a ratio whose inputs are missing is reported as missing.
 */
import type {Pool} from 'pg';
import {altmanZ,piotroskiF,beneishM,type AnnualFinancials,type Industry} from '../../lib/risk-scores';
import {assessConfidence,type EvidenceFact} from '../../lib/confidence';

type Obs={concept:string;label:string;statement:string;period_end:Date;fiscal_year:number;scope:'consolidated'|'standalone';
 currency:string;unit_label:string;source_value:string;normalized_value:string;page:number|null;review_status:EvidenceFact['reviewStatus'];
 extraction_method:EvidenceFact['extractionMethod'];extraction_confidence:string;document_id:string;source_url:string;title:string|null;known_at:Date};

export async function financialProfile(pool:Pool,lei:string,asOf?:string){
 const at=asOf&&/^\d{4}-\d{2}-\d{2}$/.test(asOf)?asOf+'T23:59:59Z':new Date().toISOString();
 const r=await pool.query<Obs>(`SELECT o.normalized_concept AS concept,o.original_label AS label,o.statement,o.period_end,o.fiscal_year,o.scope,o.currency,o.unit_label,
   o.source_value,o.normalized_value,o.page,o.review_status,o.extraction_method,o.extraction_confidence,o.document_id,d.source_url,d.title,o.known_at
  FROM cq_financials_as_of($1,$2) o JOIN cq_financial_documents d USING (document_id) ORDER BY o.period_end DESC`,[lei,at]);
 if(!r.rowCount)return {lei,asOf:at,available:false,reason:'No reviewed financial statements are stored for this company yet.',years:[]};
 // Consolidated figures are preferred; standalone used only when no consolidated statement exists.
 const scope=r.rows.some(x=>x.scope==='consolidated')?'consolidated':'standalone';
 const rows=r.rows.filter(x=>x.scope===scope);
 const years=[...new Set(rows.map(x=>x.fiscal_year))].sort((a,b)=>b-a).slice(0,10);
 const byYear=new Map(years.map(y=>[y,new Map(rows.filter(x=>x.fiscal_year===y).map(x=>[x.concept,x]))]));
 const val=(y:number,c:string)=>{const o=byYear.get(y)?.get(c);return o?Number(o.normalized_value):undefined;};
 const annual=(y:number):AnnualFinancials=>{
  const cl=val(y,'currentLiabilities'),ncl=val(y,'nonCurrentLiabilities');
  const pbt=val(y,'profitBeforeTax'),fin=val(y,'interestExpense');
  return {fiscalYear:y,revenue:val(y,'revenue'),netIncome:val(y,'netIncome'),operatingCashFlow:val(y,'operatingCashFlow'),
   totalAssets:val(y,'totalAssets'),currentAssets:val(y,'currentAssets'),currentLiabilities:cl,
   totalLiabilities:val(y,'totalLiabilities')??(cl!==undefined&&ncl!==undefined?cl+ncl:undefined),
   bookEquity:val(y,'bookEquity'),receivables:val(y,'receivables'),ppeNet:val(y,'ppeNet'),depreciation:val(y,'depreciation'),
   ebit:pbt!==undefined&&fin!==undefined?pbt+fin:undefined};
 };
 const series=years.map(annual);
 const ratio=(a?:number,b?:number)=>a===undefined||b===undefined||b===0?null:a/b;
 const metrics=series.map((y,i)=>{
  const prev=series[i+1];
  return {fiscalYear:y.fiscalYear,
   revenueGrowth:prev?ratio(y.revenue!==undefined&&prev.revenue!==undefined?y.revenue-prev.revenue:undefined,prev.revenue):null,
   netMargin:ratio(y.netIncome,y.revenue),returnOnEquity:ratio(y.netIncome,y.bookEquity),returnOnAssets:ratio(y.netIncome,y.totalAssets),
   currentRatio:ratio(y.currentAssets,y.currentLiabilities),liabilitiesToEquity:ratio(y.totalLiabilities,y.bookEquity),
   cashConversion:ratio(y.operatingCashFlow,y.netIncome),assetTurnover:ratio(y.revenue,y.totalAssets)};
 });
 const industry:Industry='services'; // Sector classification is not yet sourced; Z'' (no sales term) is the conservative variant.
 const latest=series[0],prior=series[1],prior2=series[2];
 const facts:EvidenceFact[]=rows.map(x=>({concept:x.concept,fiscalYear:x.fiscal_year,periodEnd:x.period_end.toISOString().slice(0,10),scope:x.scope,
  value:Number(x.normalized_value),reviewStatus:x.review_status,extractionMethod:x.extraction_method,
  extractionConfidence:Number(x.extraction_confidence),sourceKind:'company_report'}));
 return {lei,asOf:at,available:true,scope,currency:rows[0].currency,
  reported:years.map(y=>({fiscalYear:y,figures:[...byYear.get(y)!.values()].map(o=>({concept:o.concept,label:o.label,statement:o.statement,
   periodEnd:o.period_end.toISOString().slice(0,10),value:Number(o.source_value),unit:o.unit_label,normalizedValue:Number(o.normalized_value),
   page:o.page,reviewStatus:o.review_status,sourceUrl:o.source_url,documentId:o.document_id,publishedOrKnownAt:o.known_at.toISOString().slice(0,10)}))})),
  derived:[{name:'totalLiabilities',formula:'current liabilities + non-current liabilities (when not reported directly)'},
   {name:'ebit',formula:'profit before tax + finance costs'}],
  metrics,
  risk:{note:'Analytical screening indicators, not credit ratings or findings. Sector not yet classified; models applied for a non-financial company.',
   altman:altmanZ(latest,industry),piotroski:prior?piotroskiF(latest,prior,prior2,industry):null,beneish:prior?beneishM(latest,prior,industry):null},
  confidence:assessConfidence(facts,new Date(at))};
}
