export type SecEntity = { cik: string; name: string; ticker: string; exchange: string };
type SecRow={cik_str:number;title:string;ticker:string;exchange:string};
let cached: {expires:number;entities:SecEntity[]} | null=null;
const SEC_BASE='https://www.sec.gov/files/company_tickers_exchange.json';
export async function getSecEntities(): Promise<SecEntity[]> {
  if (!process.env.SEC_USER_AGENT) throw new Error('SEC_NOT_CONFIGURED');
  if (cached && cached.expires>Date.now()) return cached.entities;
  const response=await fetch(SEC_BASE,{headers:{'User-Agent':process.env.SEC_USER_AGENT,'Accept':'application/json'},signal:AbortSignal.timeout(12000),next:{revalidate:21600}});
  if (!response.ok) throw new Error('SEC_UPSTREAM_ERROR');
  const payload=await response.json() as {fields:string[];data:(string|number)[][]};
  const indexes={cik:payload.fields.indexOf('cik'),name:payload.fields.indexOf('name'),ticker:payload.fields.indexOf('ticker'),exchange:payload.fields.indexOf('exchange')};
  if (Object.values(indexes).some(x=>x<0)||!Array.isArray(payload.data)) throw new Error('SEC_SCHEMA_ERROR');
  const entities=payload.data.map(row=>({cik:String(row[indexes.cik]).padStart(10,'0'),name:String(row[indexes.name]),ticker:String(row[indexes.ticker]),exchange:String(row[indexes.exchange])}));
  cached={expires:Date.now()+6*60*60*1000,entities};
  return entities;
}
export type CompanyDetail={name:string;cik:string;tickers:string[];exchanges:string[];sicDescription:string;fiscalYearEnd:string;stateOfIncorporation:string};
export async function getSecCompany(cik:string):Promise<CompanyDetail|null>{
  if(!process.env.SEC_USER_AGENT) return null;
  if(!/^\d{10}$/.test(cik)) return null;
  const response=await fetch('https://data.sec.gov/submissions/CIK'+cik+'.json',{
    headers:{'User-Agent':process.env.SEC_USER_AGENT,'Accept':'application/json'},
    signal:AbortSignal.timeout(12000),next:{revalidate:86400}
  });
  if(!response.ok) return null;
  const data=await response.json();
  if(String(data.cik).padStart(10,'0')!==cik) return null;
  return {name:String(data.name||''),cik,tickers:Array.isArray(data.tickers)?data.tickers:[],
    exchanges:Array.isArray(data.exchanges)?data.exchanges:[],
    sicDescription:String(data.sicDescription||''),fiscalYearEnd:String(data.fiscalYearEnd||''),
    stateOfIncorporation:String(data.stateOfIncorporation||'')};
}