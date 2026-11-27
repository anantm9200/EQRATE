/**
 * Server-only connection to CREQOR's private DGX engine.
 * Endpoint is configured by the operator, never by the requesting browser.
 * DGX_ENGINE_HTTPS_URL is an HTTPS origin with an optional fixed base path
 * (for example https://host.example/creqor-engine/), always ending in '/'.
 */
export function dgxGatewayConfigured():boolean{
 return Boolean(process.env.DGX_ENGINE_HTTPS_URL&&process.env.DGX_ENGINE_TOKEN);
}
export const DGX_ROUTE=/^\/v1\/(status|search|research|india\/(overview|entities)|financials\/\d{1,10}|valuation\/\d{1,10}|lei\/[A-Z0-9]{20}(\/(research|group|financials))?|auth\/(register|verify)|account(\/(export|delete|mfa(\/(setup|enable|disable))?))?|workspace\/(alerts|items(\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})?))$/;
export function dgxEndpoint(path:string,base=process.env.DGX_ENGINE_HTTPS_URL||''):URL{
 if(!DGX_ROUTE.test(path))throw new Error('DGX_UNSUPPORTED_ROUTE');
 let url:URL;
 try{url=new URL(base);}catch{throw new Error('DGX_GATEWAY_REQUIRES_HTTPS');}
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||
  !/^(\/[a-z0-9][a-z0-9-]{0,39})*\/$/.test(url.pathname)||!url.hostname||url.port&&url.port!=='443')
  throw new Error('DGX_GATEWAY_REQUIRES_HTTPS');
 return new URL(url.pathname+path.slice(1),url.origin);
}
export async function callDgxEngine<T>(path:string,options:{
 method?:'GET'|'POST'|'PUT'|'DELETE';body?:object;timeoutMs?:number;query?:{q:string;country?:string;limit?:number};
 params?:Partial<Record<'q'|'region'|'class'|'listing'|'status'|'page'|'kind'|'asOf',string>>;
 /** Signed-in identity from the website session; only sent to account/workspace routes. */
 identity?:{userId:string;orgId?:string};
}={}):Promise<T>{
 if(!dgxGatewayConfigured())throw new Error('DGX_ENGINE_NOT_CONNECTED');
 const token=process.env.DGX_ENGINE_TOKEN!;
 if(token.length<32)throw new Error('DGX_ENGINE_TOKEN_TOO_SHORT');
 const clientId=process.env.DGX_ACCESS_CLIENT_ID||'';
 const clientSecret=process.env.DGX_ACCESS_CLIENT_SECRET||'';
 if(Boolean(clientId)!==Boolean(clientSecret))throw new Error('DGX_ACCESS_CREDENTIAL_PAIR_REQUIRED');
 const headers:Record<string,string>={'Authorization':'Bearer '+token,
  'Accept':'application/json','Content-Type':'application/json'};
 if(clientId){headers['CF-Access-Client-Id']=clientId;headers['CF-Access-Client-Secret']=clientSecret;}
 const url=dgxEndpoint(path);
 if(options.query){
  if(path!=='/v1/search')throw new Error('DGX_QUERY_NOT_ALLOWED');
  url.searchParams.set('q',options.query.q);
  if(options.query.country)url.searchParams.set('country',options.query.country);
  if(options.query.limit)url.searchParams.set('limit',String(options.query.limit));
 }
 if(options.identity){
  if(!/^\/v1\/(account|workspace)/.test(path))throw new Error('DGX_IDENTITY_NOT_ALLOWED');
  headers['X-Creqor-User']=options.identity.userId;
  if(options.identity.orgId)headers['X-Creqor-Org']=options.identity.orgId;
 }
 if(options.params){
  const only=(k:string)=>Object.keys(options.params!).every(x=>x===k);
  if(path!=='/v1/india/entities'&&!(path==='/v1/workspace/items'&&only('kind'))&&!(/^\/v1\/lei\/[A-Z0-9]{20}\/financials$/.test(path)&&only('asOf')))throw new Error('DGX_QUERY_NOT_ALLOWED');
  for(const [k,v] of Object.entries(options.params))if(v)url.searchParams.set(k,v);
 }
 const response=await fetch(url,{method:options.method||'GET',headers,redirect:'error',
  body:options.body?JSON.stringify(options.body):undefined,
  signal:AbortSignal.timeout(Math.max(1000,Math.min(options.timeoutMs||9000,55000))),cache:'no-store'});
 if(!response.ok){
  const err=new Error('DGX_ENGINE_UPSTREAM_'+response.status) as Error&{status?:number;body?:unknown};
  err.status=response.status;
  err.body=await response.json().catch(()=>null);
  throw err;
 }
 const size=Number(response.headers.get('content-length')||0);
 if(size>2000000)throw new Error('DGX_ENGINE_RESPONSE_TOO_LARGE');
 const text=await response.text();
 if(text.length>2000000)throw new Error('DGX_ENGINE_RESPONSE_TOO_LARGE');
 return JSON.parse(text) as T;
}
/** Small in-memory per-client limiter for public read routes (per serverless instance). */
const buckets=new Map<string,{hits:number;expires:number}>();
export function rateLimited(key:string,limit:number,windowMs=60000):boolean{
 const now=Date.now(),prior=buckets.get(key);
 const next=!prior||prior.expires<now?{hits:1,expires:now+windowMs}:{hits:prior.hits+1,expires:prior.expires};
 buckets.set(key,next);
 if(buckets.size>5000)for(const [k,v] of buckets)if(v.expires<now)buckets.delete(k);
 return next.hits>limit;
}
export function clientKey(headers:Headers,scope:string):string{
 return scope+':'+(headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'anonymous');
}
export type DgxRun={runId:number;source?:string;status:string;publishDate:string|null;officialRecords:number|null;rowsRead:number;
 rowsValid:number;rowsRejected:number;rowsInserted:number;rowsChanged:number;startedAt:string;finishedAt:string|null;
 retrievedAt:string|null;retrievalPath:string|null;archiveSha256:string|null};
export type DgxStatus={
 status:string;storage:string;
 counts:{leiEntities:number|null;leiSourceVersions?:number;leiCountries?:number;secTickerAssociations:number;secIssuers?:number;
  secFinancialFacts:number;secIssuersWithFinancials?:number;researchRuns:number};
 databaseBytes?:number;
 freshness?:{gleif:DgxRun[];staleNotInLatestPublication:number|null;
  sec:{issuersImported:number;issuersWithFinancials:number;status:string};
  jobs:{job:string;status:string;startedAt:string;finishedAt:string|null;errorCode:string|null}[]};
 ai?:{configured:boolean;reachable:boolean;model:string|null};
 aiConfigured:boolean;note:string;
};
