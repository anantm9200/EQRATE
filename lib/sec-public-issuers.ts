import {createHash} from 'node:crypto';
import {getSourceCataloguePool,catalogueConfigured} from './catalogue-store';

export const SEC_ISSUERS_URL='https://www.sec.gov/files/company_tickers_exchange.json';
export type SecIssuer={cik:number;name:string;ticker:string;exchange:string;sourceUrl:typeof SEC_ISSUERS_URL;sourceFingerprint:string};
type SecResponse={fields?:unknown;data?:unknown};
export function parseSecIssuerSource(input:unknown):SecIssuer[]{
 const obj=input as SecResponse;
 if(!obj||!Array.isArray(obj.fields)||JSON.stringify(obj.fields)!==JSON.stringify(['cik','name','ticker','exchange'])||
  !Array.isArray(obj.data))throw new Error('SEC_ISSUER_SCHEMA_CHANGED');
 const seen=new Set<string>();
 const result:SecIssuer[]=[];
 for(const item of obj.data){
  if(!Array.isArray(item)||item.length!==4)continue;
  const [cikRaw,nameRaw,tickerRaw,exchangeRaw]=item as unknown[];
  const cik=Number(cikRaw),name=String(nameRaw||'').trim(),ticker=String(tickerRaw||'').trim().toUpperCase();
  const exchange=String(exchangeRaw||'').trim();
  if(!Number.isSafeInteger(cik)||cik<1||cik>9999999999||!name||name.length>500||
   !/^[A-Z0-9.\/-]{1,32}$/.test(ticker)||exchange.length>100)continue;
  const key=cik+':'+ticker;
  if(seen.has(key))continue;
  seen.add(key);
  const sourceFingerprint=createHash('sha256').update(JSON.stringify([cik,name,ticker,exchange])).digest('hex');
  result.push({cik,name,ticker,exchange,sourceUrl:SEC_ISSUERS_URL,sourceFingerprint});
 }
 if(!result.length)throw new Error('SEC_ISSUER_SOURCE_EMPTY');
 return result;
}
export function secSourceConfigured():boolean{
 return Boolean(process.env.SEC_USER_AGENT&&/\S+@\S+\.\S+/.test(process.env.SEC_USER_AGENT));
}
export async function fetchSecPublicIssuers():Promise<{records:SecIssuer[];retrievedAt:string}>{
 if(!secSourceConfigured())throw new Error('SEC_USER_AGENT_NOT_CONFIGURED');
 const r=await fetch(SEC_ISSUERS_URL,{headers:{'User-Agent':process.env.SEC_USER_AGENT!,
  Accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(25000)});
 if(!r.ok||new URL(r.url).hostname!=='www.sec.gov')throw new Error('SEC_ISSUERS_SOURCE_ERROR');
 const records=parseSecIssuerSource(await r.json());
 return {records,retrievedAt:new Date().toISOString()};
}
export async function ingestSecIssuerBatch(records:SecIssuer[],retrievedAt:string):Promise<{seen:number;changed:number}>{
 if(!Array.isArray(records)||records.length>1000)throw new Error('SEC_BATCH_LIMIT');
 if(!Number.isFinite(Date.parse(retrievedAt)))throw new Error('SEC_BAD_TIMESTAMP');
 if(!records.length)return {seen:0,changed:0};
 const pool=getSourceCataloguePool(),client=await pool.connect();
 const body=JSON.stringify(records);
 try{
  await client.query('BEGIN');
  const changed=await client.query(`
   INSERT INTO public.cq_sec_issuers(cik,ticker,legal_name,exchange,source_url,source_sha256,source_retrieved_at)
   SELECT r.cik,r.ticker,r.name,r.exchange,r."sourceUrl",r."sourceFingerprint"::char(64),$2::timestamptz
   FROM jsonb_to_recordset($1::jsonb) AS r
    (cik integer,ticker text,name text,exchange text,"sourceUrl" text,"sourceFingerprint" text)
   ON CONFLICT(cik,ticker) DO UPDATE SET
    legal_name=EXCLUDED.legal_name,exchange=EXCLUDED.exchange,
    source_sha256=EXCLUDED.source_sha256,source_retrieved_at=EXCLUDED.source_retrieved_at,
    last_changed_at=now()
   WHERE public.cq_sec_issuers.source_sha256 IS DISTINCT FROM EXCLUDED.source_sha256
   RETURNING cik
  `,[body,retrievedAt]);
  await client.query(`
   INSERT INTO public.cq_sec_issuer_observations
    (cik,ticker,source_sha256,name_at_observation,exchange_at_observation)
   SELECT r.cik,r.ticker,r."sourceFingerprint"::char(64),r.name,r.exchange
   FROM jsonb_to_recordset($1::jsonb) AS r
    (cik integer,ticker text,name text,exchange text,"sourceFingerprint" text)
   ON CONFLICT(cik,ticker,source_sha256) DO NOTHING
  `,[body]);
  await client.query('COMMIT');
  return {seen:records.length,changed:changed.rowCount??0};
 }catch(e){await client.query('ROLLBACK');throw e;}
 finally{client.release();}
}
export type SecIssuerSearch={q?:string;exchange?:string;page?:number};
export async function listIndexedSecIssuers(filters:SecIssuerSearch={}):Promise<{
 source:'SEC';total:number;page:number;pageSize:60;records:SecIssuer[];hasMore:boolean
}>{
 const q=(filters.q||'').trim().toLowerCase(),exchange=(filters.exchange||'').trim();
 const page=filters.page||1;
 if(q.length>90||(q.length>0&&q.length<2)||!Number.isSafeInteger(page)||page<1||page>2000||
  exchange.length>35||!/^[a-zA-Z0-9. _-]*$/.test(exchange))throw new Error('SEC_ISSUER_INVALID_FILTER');
 const clauses:string[]=[],params:(string|number)[]=[];
 if(q){params.push(q.replace(/[\\%_]/g,'\\$&')+'%');clauses.push('(lower(legal_name) LIKE $'+params.length+" ESCAPE '\\\\' OR lower(ticker) LIKE $"+params.length+" ESCAPE '\\\\')");}
 if(exchange){params.push(exchange);clauses.push('exchange = $'+params.length);}
 const sql=clauses.length?' WHERE '+clauses.join(' AND '):'';
 const db=getSourceCataloguePool();
 const count=await db.query<{n:string}>('SELECT count(*)::text n FROM public.cq_sec_issuers'+sql,params);
 const total=Number(count.rows[0]?.n||0);
 const rows=await db.query<{cik:number;legal_name:string;ticker:string;exchange:string;source_sha256:string}>(
  'SELECT cik,legal_name,ticker,exchange,source_sha256 FROM public.cq_sec_issuers'+sql+
  ' ORDER BY lower(legal_name),ticker LIMIT $'+(params.length+1)+' OFFSET $'+(params.length+2),
  [...params,60,(page-1)*60]);
 return {source:'SEC',total,page,pageSize:60,hasMore:page*60<total,
  records:rows.rows.map(r=>({cik:r.cik,name:r.legal_name,ticker:r.ticker,exchange:r.exchange,
   sourceUrl:SEC_ISSUERS_URL,sourceFingerprint:r.source_sha256.trim()}))};
}
export async function secIssuerIndexStatus():Promise<{configured:boolean;count:number;status:'ready'|'unconfigured'|'unavailable'}>{
 if(!catalogueConfigured())return{configured:false,count:0,status:'unconfigured'};
 try{
  const r=await getSourceCataloguePool().query<{n:string}>('SELECT count(*)::text n FROM public.cq_sec_issuers');
  return{configured:true,count:Number(r.rows[0]?.n||0),status:'ready'};
 }catch{return{configured:true,count:0,status:'unavailable'};}
}
