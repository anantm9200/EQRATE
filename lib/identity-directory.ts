/**
 * Server-only identity reads for the website. CREQOR's private DGX index (the imported
 * GLEIF Golden Copy) is always the primary source; the live GLEIF API is used only as an
 * explicitly labelled last resort when the engine cannot be reached.
 */
import {callDgxEngine,dgxGatewayConfigured,type DgxStatus} from './dgx-gateway';
import {getLEI,listLEIRecords,searchLEI,DIRECTORY_PAGE_SIZE,type LeiDirectoryPage,type LeiEntity} from './gleif';
import {getFeaturedCompanyUniverse,type CompanyUniverseRecord} from './company-universe';

export const LIVE_FALLBACK_NOTE='Shown from the live GLEIF API because the private index was unavailable.';
/** Deepest directory page served by the private index (bounded offset of 60 × 200 rows). */
export const ENGINE_DIRECTORY_MAX_PAGE=200;
/** The live GLEIF API only pages through its first 10,000 records per filter. */
export const LIVE_DIRECTORY_MAX_PAGE=Math.floor(10000/DIRECTORY_PAGE_SIZE);

export type DirectoryFilters={q:string;country:string;page:number};
/** Validates browser-supplied filters before anything is sent upstream. */
export function directoryFilters(input:{q?:string|null;country?:string|null;page?:string|number|null}):DirectoryFilters{
 const q=(input.q||'').trim();
 const country=(input.country||'').trim().toUpperCase();
 const raw=String(input.page??'1');
 if(!/^\d{1,4}$/.test(raw))throw new Error('INVALID_PAGE');
 const page=Number(raw);
 if(page<1||page>ENGINE_DIRECTORY_MAX_PAGE)throw new Error('INVALID_PAGE');
 if(q.length>90||(q.length>0&&q.length<2))throw new Error('INVALID_QUERY');
 if(country&&!/^[A-Z]{2}$/.test(country))throw new Error('INVALID_COUNTRY');
 return {q,country,page};
}

/** True when the failure means "the engine could not answer", not "the request was wrong". */
export function engineUnreachable(e:unknown):boolean{
 const status=(e as {status?:number})?.status;
 return typeof status!=='number'||status>=500||status===429;
}
const upstreamStatus=(e:unknown)=>(e as {status?:number})?.status;

/** Directory page from the engine; live GLEIF only if the engine is unreachable. */
export async function loadDirectory(f:DirectoryFilters):Promise<LeiDirectoryPage>{
 if(dgxGatewayConfigured()){
  try{return await loadIndexedDirectory(f);}
  catch(e){if(!engineUnreachable(e))throw e;}
 }
 if(f.page>LIVE_DIRECTORY_MAX_PAGE)throw new Error('LIVE_PAGE_OUT_OF_RANGE');
 const live=await listLEIRecords(f);
 return {...live,origin:'live-gleif-fallback',maxPage:LIVE_DIRECTORY_MAX_PAGE,notice:LIVE_FALLBACK_NOTE+' '+live.notice};
}

/** Private-index directory only (the indexed catalogue never substitutes live data). */
export async function loadIndexedDirectory(f:DirectoryFilters):Promise<LeiDirectoryPage>{
 const params:{q?:string;country?:string;page:string}={page:String(f.page)};
 if(f.q)params.q=f.q;
 if(f.country)params.country=f.country;
 return {...await callDgxEngine<LeiDirectoryPage>('/v1/directory',{params,timeoutMs:12000}),origin:'private-index'};
}

export type EngineLeiResult<T>={kind:'ok';detail:T}|{kind:'missing'}|{kind:'unreachable'};
export async function engineLei<T>(lei:string):Promise<EngineLeiResult<T>>{
 if(!dgxGatewayConfigured())return {kind:'unreachable'};
 try{return {kind:'ok',detail:await callDgxEngine<T>('/v1/lei/'+lei.toUpperCase(),{timeoutMs:10000})};}
 catch(e){return upstreamStatus(e)===404?{kind:'missing'}:{kind:'unreachable'};}
}

type SearchRecord={source:'GLEIF'|'SEC';identifier:string;name:string;country:string;status?:string;sourceUrl:string};
/** Name/LEI search: engine first; live GLEIF only when the engine is unreachable. */
export async function searchEntities(q:string):Promise<{results:LeiEntity[];total:number;published:string;origin:'private-index'|'live-gleif-fallback'}>{
 if(dgxGatewayConfigured()){
  try{
   const data=await callDgxEngine<{records:SearchRecord[]}>('/v1/search',{query:{q,limit:12},timeoutMs:9000});
   const results=data.records.filter(r=>r.source==='GLEIF').map(r=>({lei:r.identifier,name:r.name,country:r.country,
    jurisdiction:'',status:'',registrationStatus:r.status||'UNKNOWN',lastUpdate:'',nextRenewal:'',registeredAs:'',
    category:'',address:'',headquarters:'',sourceUrl:r.sourceUrl}));
   return {results,total:results.length,published:'',origin:'private-index'};
  }catch(e){if(!engineUnreachable(e))throw e;}
 }
 return {...await searchLEI(q),origin:'live-gleif-fallback'};
}

/** Single LEI record for the API: engine first; live GLEIF only when the engine is unreachable. */
export async function loadLeiRecord(lei:string):Promise<{record:LeiEntity|null;origin:'private-index'|'live-gleif-fallback'}>{
 const r=await engineLei<{entity:LeiEntity}>(lei);
 if(r.kind==='ok')return {record:r.detail.entity,origin:'private-index'};
 if(r.kind==='missing')return {record:null,origin:'private-index'};
 return {record:await getLEI(lei),origin:'live-gleif-fallback'};
}

export async function loadFeatured():Promise<{records:CompanyUniverseRecord[];attempted:number;origin:'private-index'|'live-gleif-fallback'}>{
 if(dgxGatewayConfigured()){
  try{return {...await callDgxEngine<{records:CompanyUniverseRecord[];attempted:number}>('/v1/featured',{timeoutMs:15000}),origin:'private-index'};}
  catch(e){if(!engineUnreachable(e))throw e;}
 }
 return {...await getFeaturedCompanyUniverse(),origin:'live-gleif-fallback'};
}

export type GoldenCopyPublication={runId:number;publishDate:string|null;officialRecords:number|null;rowsRead:number;
 importedAt:string|null;archiveSha256:string|null};
export type EngineIdentityStatus=DgxStatus&{goldenCopy?:GoldenCopyPublication|null;countsAsOf?:string|null;
 counts:DgxStatus['counts']&{indiaEntities?:number|null}};
/** Engine status, or null when the engine is not configured / not reachable. */
export async function engineIdentityStatus():Promise<EngineIdentityStatus|null>{
 if(!dgxGatewayConfigured())return null;
 return callDgxEngine<EngineIdentityStatus>('/v1/status',{timeoutMs:10000}).catch(()=>null);
}
