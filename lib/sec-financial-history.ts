import {createHash} from 'node:crypto';
import {getSourceCataloguePool} from './catalogue-store';

export const SEC_FINANCIAL_CONCEPTS=[
 'RevenueFromContractWithCustomerExcludingAssessedTax','Revenues','SalesRevenueNet',
 'NetIncomeLoss','OperatingIncomeLoss','NetCashProvidedByUsedInOperatingActivities',
 'Assets','Liabilities','StockholdersEquity','CashAndCashEquivalentsAtCarryingValue',
 'LongTermDebt','LongTermDebtCurrent','CommonStockSharesOutstanding',
 'WeightedAverageNumberOfDilutedSharesOutstanding','NetCashProvidedByUsedInInvestingActivities',
 'PaymentsToAcquirePropertyPlantAndEquipment',
 // Profitability, liquidity, leverage and EBITDA inputs for the deterministic analysis engine.
 'GrossProfit','CostOfRevenue','AssetsCurrent','LiabilitiesCurrent','LongTermDebtNoncurrent',
 'DebtCurrent','ShortTermBorrowings','DepreciationDepletionAndAmortization',
 'DepreciationAndAmortization','InterestExpense','NetCashProvidedByUsedInFinancingActivities',
 'EntityCommonStockSharesOutstanding'
] as const;
export type FinancialFact={
 cik:number;taxonomy:'us-gaap'|'dei';concept:string;unit:'USD'|'shares';
 periodStart:string;periodEnd:string;fiscalYear:number;fiscalPeriod:string;
 form:'10-K'|'10-Q'|'10-K/A'|'10-Q/A';accession:string;filed:string;value:number;
 sourceUrl:string;sourceSha256:string;
};
const forms=new Set(['10-K','10-Q','10-K/A','10-Q/A']);
const dateOk=(s:unknown)=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&
 Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
const SEC_FACT_PREFIX='https://data.sec.gov/api/xbrl/companyfacts/CIK';
export function parseSecFinancialHistory(input:unknown,cik:number):FinancialFact[]{
 if(!Number.isSafeInteger(cik)||cik<1)throw new Error('SEC_INVALID_CIK');
 const doc=input as {cik?:unknown;facts?:Record<string,Record<string,{units?:Record<string,unknown>}>>};
 if(Number(doc?.cik)!==cik||!doc?.facts||typeof doc.facts!=='object')
  throw new Error('SEC_COMPANYFACTS_BAD_IDENTITY');
 const sourceUrl=SEC_FACT_PREFIX+String(cik).padStart(10,'0')+'.json';
 const byId=new Map<string,FinancialFact>();
 const concepts=new Set<string>(SEC_FINANCIAL_CONCEPTS);
 for(const taxonomy of ['us-gaap','dei'] as const){
  const facts=doc.facts[taxonomy]||{};
  for(const concept of Object.keys(facts)){
   if(!concepts.has(concept))continue;
   const units=facts[concept]?.units;
   if(!units||typeof units!=='object')continue;
   const unit:FinancialFact['unit']=concept.includes('Shares')?'shares':'USD';
   const entries=units[unit];
   if(!Array.isArray(entries))continue;
   for(const raw of entries){
    if(!raw||typeof raw!=='object')continue;
    const row=raw as Record<string,unknown>;
    if(typeof row.val!=='number'||!Number.isFinite(row.val)||Math.abs(row.val)>Number.MAX_SAFE_INTEGER)continue;
    const value=row.val,fiscalYear=Number(row.fy);
    const form=String(row.form||''),periodStart=row.start===undefined?'':String(row.start);
    const periodEnd=String(row.end||''),filed=String(row.filed||'');
    const accession=String(row.accn||''),fiscalPeriod=String(row.fp||'');
    if(!Number.isFinite(value)||Math.abs(value)>1e28||
       !Number.isSafeInteger(fiscalYear)||fiscalYear<1990||fiscalYear>2200||
       !forms.has(form)||!dateOk(periodEnd)||!dateOk(filed)||
       (periodStart!==''&&!dateOk(periodStart))||
       !/^\d{10}-\d{2}-\d{6}$/.test(accession)||
       fiscalPeriod.length>12)continue;
    const normalized={cik,taxonomy,concept,unit,periodStart,periodEnd,
     fiscalYear,fiscalPeriod,form:form as FinancialFact['form'],
     accession,filed,value,sourceUrl};
    const sourceSha256=createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
    const result={...normalized,sourceSha256};
    byId.set([cik,taxonomy,concept,unit,accession,periodStart,periodEnd].join(':'),result);
   }
  }
 }
 return [...byId.values()].sort((a,b)=>b.periodEnd.localeCompare(a.periodEnd)||
  b.filed.localeCompare(a.filed)||a.concept.localeCompare(b.concept));
}
export async function fetchSecFinancialHistory(cik:number):Promise<FinancialFact[]>{
 const userAgent=process.env.SEC_USER_AGENT;
 if(!userAgent||!/\S+@\S+\.\S+/.test(userAgent))throw new Error('SEC_CONTACT_NOT_CONFIGURED');
 if(!Number.isSafeInteger(cik)||cik<1)throw new Error('SEC_INVALID_CIK');
 const url=SEC_FACT_PREFIX+String(cik).padStart(10,'0')+'.json';
 const response=await fetch(url,{headers:{'User-Agent':userAgent,'Accept':'application/json'},
  signal:AbortSignal.timeout(25000),cache:'no-store'});
 // 404: the registrant has no XBRL companyfacts (e.g. non-XBRL filer). Not a failure, not zero.
 if(response.status===404)throw new Error('SEC_NO_XBRL_COMPANYFACTS');
 if(!response.ok||new URL(response.url).hostname!=='data.sec.gov')
  throw new Error('SEC_FINANCIAL_SOURCE_UNAVAILABLE');
 return parseSecFinancialHistory(await response.json(),cik);
}
export async function persistSecFinancialHistory(cik:number,records:FinancialFact[]):Promise<number>{
 if(!Number.isSafeInteger(cik)||cik<1||!Array.isArray(records)||records.length>40000||
  records.some(f=>f.cik!==cik))throw new Error('SEC_FINANCIAL_BATCH_REJECTED');
 const client=await getSourceCataloguePool().connect();
 let changed=0;
 try{
  await client.query('BEGIN');
  for(let offset=0;offset<records.length;offset+=600){
   const batch=records.slice(offset,offset+600);
   const result=await client.query(`
   INSERT INTO public.cq_sec_financial_facts
   (cik,taxonomy,concept,unit,period_start,period_end,fiscal_year,fiscal_period,form,accession,filed,value,source_url,source_sha256)
   SELECT r.cik,r.taxonomy,r.concept,r.unit,r."periodStart",r."periodEnd"::date,
    r."fiscalYear",r."fiscalPeriod",r.form,r.accession,r.filed::date,r.value,r."sourceUrl",r."sourceSha256"::char(64)
   FROM jsonb_to_recordset($1::jsonb) AS r
    (cik integer,taxonomy text,concept text,unit text,"periodStart" text,
     "periodEnd" text,"fiscalYear" integer,"fiscalPeriod" text,form text,
     accession text,filed text,value numeric,"sourceUrl" text,"sourceSha256" text)
   ON CONFLICT(cik,taxonomy,concept,unit,accession,period_start,period_end)
   DO UPDATE SET value=EXCLUDED.value,source_sha256=EXCLUDED.source_sha256,ingested_at=now()
   WHERE public.cq_sec_financial_facts.source_sha256 IS DISTINCT FROM EXCLUDED.source_sha256
   RETURNING cik
   `,[JSON.stringify(batch)]);
   changed+=result.rowCount??0;
  }
  await client.query(`INSERT INTO public.cq_sec_fact_sync_state
   (cik,source_url,last_success_at,last_status,fact_count,updated_at)
   VALUES($1,$2,now(),'ok',$3,now())
   ON CONFLICT(cik) DO UPDATE SET last_success_at=EXCLUDED.last_success_at,
   last_status='ok',fact_count=EXCLUDED.fact_count,error_code=NULL,updated_at=now()`,
  [cik,SEC_FACT_PREFIX+String(cik).padStart(10,'0')+'.json',records.length]);
  await client.query('COMMIT');
  return changed;
 }catch(e){await client.query('ROLLBACK');throw e;}
 finally{client.release();}
}
