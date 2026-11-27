import {createHash} from 'node:crypto';
import {Pool} from 'pg';
import {listLEIRecords,DIRECTORY_PAGE_SIZE,type LeiDirectoryPage,type LeiEntity} from './gleif';

/** Server-only source catalogue. No user research or private information is persisted. */
export const CATALOGUE_REGIONS=['US','IN','AE','GB','DE','JP','SG','SA','ZA','NA','AU','CA','FR','BR','VN','TZ'] as const;
const MAX_PAGE=Math.floor(10000/DIRECTORY_PAGE_SIZE);
let pool:Pool|undefined;
function database():Pool{
 const url=process.env.DATABASE_URL;
 if(!url)throw new Error('CATALOGUE_NOT_CONFIGURED');
 if(!pool){
  // The connection URI must be supplied securely by the database provider.
  // TLS verification is required when a remote database is used.
  const parsed=new URL(url);
  if(!['postgres:','postgresql:'].includes(parsed.protocol))throw new Error('CATALOGUE_INVALID_DATABASE_URL');
  if(parsed.hostname!=='localhost'&&parsed.hostname!=='127.0.0.1'&&parsed.searchParams.get('sslmode')==='disable')
   throw new Error('CATALOGUE_TLS_REQUIRED');
  const max=Math.min(20,Math.max(1,Number(process.env.PG_POOL_MAX)||3));
  pool=new Pool({connectionString:url,max,idleTimeoutMillis:10000,connectionTimeoutMillis:5000,
   ssl:parsed.hostname==='localhost'||parsed.hostname==='127.0.0.1'?undefined:{rejectUnauthorized:true}});
  // An idle client dropped by the server (restart, failover, timeout) must not crash the
  // process: pg removes the broken client and the next query opens a new connection.
  pool.on('error',err=>console.error(JSON.stringify({event:'DATABASE_IDLE_CLIENT_ERROR',code:(err as {code?:string}).code||'unknown'})));
 }
 return pool;
}
export function catalogueConfigured():boolean{return Boolean(process.env.DATABASE_URL);}
type StoredRecord=LeiEntity&{sourceSha256:string};
function snapshot(entity:LeiEntity):StoredRecord{
 if(!/^[A-Z0-9]{20}$/.test(entity.lei)||!entity.name.trim()||entity.name.length>1000||
    entity.sourceUrl!=='https://search.gleif.org/#/record/'+entity.lei)throw new Error('CATALOGUE_BAD_ENTITY');
 const normalized={lei:entity.lei,name:entity.name.trim(),country:entity.country,
  jurisdiction:entity.jurisdiction,status:entity.status,registrationStatus:entity.registrationStatus,
  lastUpdate:entity.lastUpdate,nextRenewal:entity.nextRenewal,registeredAs:entity.registeredAs,
  category:entity.category,address:entity.address,headquarters:entity.headquarters,sourceUrl:entity.sourceUrl,
  // Optional Golden Copy fields: undefined values are omitted by JSON.stringify, so
  // live-API summaries keep the same fingerprint as before these fields existed.
  otherNames:entity.otherNames||undefined,legalForm:entity.legalForm||undefined,
  entityCreationDate:entity.entityCreationDate||undefined,
  initialRegistrationDate:entity.initialRegistrationDate||undefined,
  managingLou:entity.managingLou||undefined,validationSources:entity.validationSources||undefined,
  registrationAuthorityId:entity.registrationAuthorityId||undefined,
  successorLei:entity.successorLei||undefined,expirationDate:entity.expirationDate||undefined,
  headquartersCountry:entity.headquartersCountry||undefined};
 return {...normalized,sourceSha256:createHash('sha256').update(JSON.stringify(normalized)).digest('hex')};
}
export function sourceFingerprint(entity:LeiEntity):string{return snapshot(entity).sourceSha256;}

export type CatalogueStatus={
 configured:boolean;status:'ready'|'unconfigured'|'unavailable';indexed:number;
 updatedAt:string|null;note:string;
};
export async function catalogueStatus():Promise<CatalogueStatus>{
 if(!catalogueConfigured())return {configured:false,status:'unconfigured',indexed:0,updatedAt:null,
  note:'The database is not configured. Browse the live official GLEIF directory instead.'};
 try{
  const r=await database().query<{n:string,latest:Date|null}>(
   'SELECT count(*)::text n,max(last_changed_at) latest FROM public.cq_lei_catalogue');
  return {configured:true,status:'ready',indexed:Number(r.rows[0]?.n||0),
   updatedAt:r.rows[0]?.latest?.toISOString()||null,
   note:'Indexed records are copies of GLEIF legal entity reference data, not financial or stock-market verification.'};
 }catch{return {configured:true,status:'unavailable',indexed:0,updatedAt:null,
   note:'Catalogue schema, connectivity or permissions need attention. The live directory remains available.'};}
}
export type CatalogueQuery={q?:string;country?:string;page?:number};
export async function listIndexedRecords(filters:CatalogueQuery={}):Promise<LeiDirectoryPage>{
 const q=(filters.q||'').trim().toLowerCase();
 const country=(filters.country||'').trim().toUpperCase();
 const page=filters.page??1;
 if(q.length>90||(q.length>0&&q.length<2)||!Number.isSafeInteger(page)||page<1||page>1000||
   (country!==''&&!/^[A-Z]{2}$/.test(country)))throw new Error('CATALOGUE_INVALID_FILTER');
 const where:string[]=[];
 const params:(string|number)[]=[];
 if(q){params.push(q+'%');where.push('lower(legal_name) LIKE $'+params.length);}
 if(country){params.push(country);where.push('country_code = $'+params.length);}
 const filter=where.length?'WHERE '+where.join(' AND '):'';
 const client=await database().connect();
 try{
  const total=await client.query<{n:string}>('SELECT count(*)::text n FROM public.cq_lei_catalogue '+filter,params);
  const n=Number(total.rows[0]?.n||0);
  const rows=await client.query<{source_payload:LeiEntity}>(
   'SELECT source_payload FROM public.cq_lei_catalogue '+filter+
   ' ORDER BY lower(legal_name),lei LIMIT $'+(params.length+1)+' OFFSET $'+(params.length+2),
   [...params,DIRECTORY_PAGE_SIZE,(page-1)*DIRECTORY_PAGE_SIZE]);
  return {results:rows.rows.map(row=>row.source_payload),total:n,page,
   pageSize:DIRECTORY_PAGE_SIZE,hasMore:page*DIRECTORY_PAGE_SIZE<n,published:'',source:'GLEIF',
   notice:'Cached public GLEIF legal-entity reference data; may be older than its source. No prices, financial statements or ratings are implied.'};
 }finally{client.release();}
}
export type SyncResult={
 source:'GLEIF';country:string;page:number;pagesRequested:number;
 pagesSucceeded:number;fetched:number;changed:number;nextPage:number;
 status:'ok'|'partial'|'failed';warnings:string[];
};
export async function synchronizeCatalogue(country:string,requestedPages=3,overridePage?:number):Promise<SyncResult>{
 const code=country.trim().toUpperCase();
 if(!/^[A-Z]{2}$/.test(code)||!Number.isSafeInteger(requestedPages)||requestedPages<1||requestedPages>8||
  (overridePage!==undefined&&(!Number.isSafeInteger(overridePage)||overridePage<1||overridePage>MAX_PAGE)))
  throw new Error('CATALOGUE_INVALID_SYNC_ARGUMENTS');
 const db=database();
 const client=await db.connect();
 let locked=false;
 const lockName='creqor:gleif:'+code;
 try{
  const r=await client.query<{acquired:boolean}>('SELECT pg_try_advisory_lock(hashtext($1)) AS acquired',[lockName]);
  locked=r.rows[0]?.acquired===true;
  if(!locked)throw new Error('CATALOGUE_SYNC_ALREADY_RUNNING');
 const cursor=await client.query<{next_page:number}>('SELECT next_page FROM public.cq_catalogue_cursors WHERE segment=$1',[code]);
 const start=overridePage??cursor.rows[0]?.next_page??1;
 const pages=Array.from({length:Math.min(requestedPages,MAX_PAGE-start+1)},(_,i)=>start+i);
 // Small bounded concurrent requests; official source failures are never substituted.
 const responses=await Promise.allSettled(pages.map(page=>listLEIRecords({country:code,page})));
 const warnings:string[]=[];
 const records=new Map<string,StoredRecord>();
 for(let i=0;i<responses.length;i++){
  const r=responses[i];
  if(r.status!=='fulfilled'){warnings.push('Official registry unavailable for page '+pages[i]);continue;}
  for(const entity of r.value.results){
   try{const one=snapshot(entity);records.set(one.lei,one);}
   catch{warnings.push('A malformed upstream record was excluded');}
  }
 }
 const successful=responses.filter(x=>x.status==='fulfilled').length;
 const status:SyncResult['status']=successful===0?'failed':successful===pages.length?'ok':'partial';
 const nextPage=(start+pages.length)>MAX_PAGE?1:start+pages.length;
 let changed=0;
 try{
  await client.query('BEGIN');
  const batch=[...records.values()].map(x=>({
   lei:x.lei,name:x.name,country:x.country,jurisdiction:x.jurisdiction,
   status:x.status,registrationStatus:x.registrationStatus,lastUpdate:x.lastUpdate,
   sourceUrl:x.sourceUrl,sourceSha256:x.sourceSha256,payload:x
  }));
  if(batch.length){
   const changedRows=await client.query(`
    INSERT INTO public.cq_lei_catalogue
     (lei,legal_name,country_code,jurisdiction,entity_status,registration_status,last_update,source_url,source_payload,source_sha256)
    SELECT r.lei::char(20),r.name,NULLIF(r.country,'')::char(2),r.jurisdiction,r.status,
      r."registrationStatus",r."lastUpdate",r."sourceUrl",r.payload,r."sourceSha256"::char(64)
    FROM jsonb_to_recordset($1::jsonb) AS r
    (lei text,name text,country text,jurisdiction text,status text,
     "registrationStatus" text,"lastUpdate" text,"sourceUrl" text,"sourceSha256" text,payload jsonb)
    ON CONFLICT(lei) DO UPDATE SET
      legal_name=EXCLUDED.legal_name,country_code=EXCLUDED.country_code,
      jurisdiction=EXCLUDED.jurisdiction,entity_status=EXCLUDED.entity_status,
      registration_status=EXCLUDED.registration_status,last_update=EXCLUDED.last_update,
      source_url=EXCLUDED.source_url,source_payload=EXCLUDED.source_payload,
      source_sha256=EXCLUDED.source_sha256,last_changed_at=now()
    WHERE public.cq_lei_catalogue.source_sha256 IS DISTINCT FROM EXCLUDED.source_sha256
    RETURNING lei
   `,[JSON.stringify(batch)]);
   changed=changedRows.rowCount||0;
   await client.query(`
    INSERT INTO public.cq_lei_observations(lei,source_sha256,source_payload)
    SELECT r.lei::char(20),r."sourceSha256"::char(64),r.payload
    FROM jsonb_to_recordset($1::jsonb)
    AS r(lei text,"sourceSha256" text,payload jsonb)
    ON CONFLICT(lei,source_sha256) DO NOTHING
   `,[JSON.stringify(batch)]);
  }
  await client.query(`INSERT INTO public.cq_catalogue_sync_runs
   (segment,start_page,page_count,fetched,changed,status)
   VALUES($1,$2,$3,$4,$5,$6)`,[code,start,pages.length,records.size,changed,status]);
  // Cursor only advances on a wholly successful batch. Failed pages are retried.
  await client.query(`INSERT INTO public.cq_catalogue_cursors
   (segment,next_page,last_completed_at,last_ingested,last_error,updated_at)
   VALUES($1,$2,now(),$3,$4,now())
   ON CONFLICT(segment) DO UPDATE SET
    next_page=EXCLUDED.next_page,last_completed_at=EXCLUDED.last_completed_at,
    last_ingested=EXCLUDED.last_ingested,last_error=EXCLUDED.last_error,updated_at=now()`,
   [code,status==='ok'?nextPage:start,records.size,warnings.join('; ').slice(0,700)||null]);
  await client.query('COMMIT');
 }catch(e){await client.query('ROLLBACK');throw e;}
 return {source:'GLEIF',country:code,page:start,pagesRequested:pages.length,pagesSucceeded:successful,
  fetched:records.size,changed,nextPage:status==='ok'?nextPage:start,status,warnings};
 }finally{
  if(locked)await client.query('SELECT pg_advisory_unlock(hashtext($1))',[lockName]).catch(()=>{});
  client.release();
 }
}

/** Provenance context for a bulk import: the official publication being applied. */
export type BulkRunContext={runId:number;publishedAt:string|null};
/**
 * Transactional, idempotent bulk ingestion of authoritative GLEIF records.
 * Intended for operator-run Golden Copy imports. Each batch stays bounded.
 * Changed or new records get a new version (observation) linked to the run;
 * unchanged records are only marked as confirmed by this publication.
 */
export async function upsertSourcedBatch(input:LeiEntity[],run?:BulkRunContext):Promise<{seen:number;changed:number;inserted:number}>{
 if(!Array.isArray(input)||input.length>1000)throw new Error('CATALOGUE_BULK_BATCH_LIMIT');
 const records=new Map<string,StoredRecord>();
 for(const item of input){const normalized=snapshot(item);records.set(normalized.lei,normalized);}
 if(!records.size)return {seen:0,changed:0,inserted:0};
 const rows=[...records.values()].map(x=>({
  lei:x.lei,name:x.name,country:x.country,jurisdiction:x.jurisdiction,
  status:x.status,registrationStatus:x.registrationStatus,lastUpdate:x.lastUpdate,
  sourceUrl:x.sourceUrl,sourceSha256:x.sourceSha256,payload:x
 }));
 const runId=run?.runId??null,publishedAt=run?.publishedAt??null;
 const client=await database().connect();
 try{
  await client.query('BEGIN');
  const updated=await client.query<{lei:string;inserted:boolean}>(`
    INSERT INTO public.cq_lei_catalogue
    (lei,legal_name,country_code,jurisdiction,entity_status,registration_status,last_update,source_url,source_payload,source_sha256,
     first_seen_run_id,last_changed_run_id,last_seen_run_id,source_published_at)
    SELECT r.lei::char(20),r.name,NULLIF(r.country,'')::char(2),r.jurisdiction,r.status,
     r."registrationStatus",r."lastUpdate",r."sourceUrl",r.payload,r."sourceSha256"::char(64),
     $2::bigint,$2::bigint,$2::bigint,$3::timestamptz
    FROM jsonb_to_recordset($1::jsonb) AS r
     (lei text,name text,country text,jurisdiction text,status text,
      "registrationStatus" text,"lastUpdate" text,"sourceUrl" text,"sourceSha256" text,payload jsonb)
    ON CONFLICT(lei) DO UPDATE SET
     legal_name=EXCLUDED.legal_name,country_code=EXCLUDED.country_code,
     jurisdiction=EXCLUDED.jurisdiction,entity_status=EXCLUDED.entity_status,
     registration_status=EXCLUDED.registration_status,last_update=EXCLUDED.last_update,
     source_url=EXCLUDED.source_url,source_payload=EXCLUDED.source_payload,
     source_sha256=EXCLUDED.source_sha256,last_changed_at=now(),
     last_changed_run_id=EXCLUDED.last_changed_run_id,last_seen_run_id=EXCLUDED.last_seen_run_id,
     source_published_at=EXCLUDED.source_published_at
    WHERE public.cq_lei_catalogue.source_sha256 IS DISTINCT FROM EXCLUDED.source_sha256
    RETURNING lei,(xmax=0) AS inserted
   `,[JSON.stringify(rows),runId,publishedAt]);
  if(runId!==null){
   // Unchanged records: confirm presence in this publication (HOT update, no new version).
   await client.query(`UPDATE public.cq_lei_catalogue SET last_seen_run_id=$2
    WHERE lei=ANY($1::char(20)[]) AND last_seen_run_id IS DISTINCT FROM $2`,
    [rows.map(r=>r.lei),runId]);
  }
  await client.query(`
    INSERT INTO public.cq_lei_observations(lei,source_sha256,source_payload,run_id)
    SELECT r.lei::char(20),r."sourceSha256"::char(64),r.payload,$2::bigint
    FROM jsonb_to_recordset($1::jsonb) AS r
     (lei text,"sourceSha256" text,payload jsonb)
    ON CONFLICT(lei,source_sha256) DO NOTHING
  `,[JSON.stringify(rows),runId]);
  await client.query('COMMIT');
  const inserted=updated.rows.filter(r=>r.inserted).length;
  return {seen:rows.length,changed:(updated.rowCount??0)-inserted,inserted};
 }catch(e){await client.query('ROLLBACK');throw e;}
 finally{client.release();}
}

export type BulkRunStart={source:'GLEIF_GOLDEN_COPY'|'GLEIF_DELTA'|'GLEIF_RR'|'GLEIF_REPEX';publishDate:string|null;
 reportedRecords:number|null;sourceUrl:string;archiveSha256:string;archiveBytes:number;
 retrievedAt:string|null;retrievalPath:'direct'|'operator-relay';rowLimit:number|null};
/** Open (or resume) a provenance ledger row for one official publication. */
export async function startBulkRun(s:BulkRunStart,resume:boolean):Promise<{runId:number;resumeFromRow:number;prior:BulkRunProgress|null}>{
 if(!/^[a-f0-9]{64}$/.test(s.archiveSha256))throw new Error('BULK_RUN_BAD_ARCHIVE_HASH');
 const db=database();
 if(resume){
  const prior=await db.query<{id:string;rows_read:string;rows_valid:string;rows_rejected:string;rows_inserted:string;changed:string}>(
   `SELECT id::text,rows_read::text,rows_valid::text,rows_rejected::text,rows_inserted::text,changed::text FROM public.cq_bulk_source_runs
   WHERE source=$1 AND archive_sha256=$2 AND status IN ('running','partial','failed')
   ORDER BY id DESC LIMIT 1`,[s.source,s.archiveSha256]);
  if(prior.rows[0]){
   await db.query(`UPDATE public.cq_bulk_source_runs SET status='running',error_code=NULL,row_limit=$2 WHERE id=$1`,
    [Number(prior.rows[0].id),s.rowLimit]);
   const r=prior.rows[0];
   return {runId:Number(r.id),resumeFromRow:Number(r.rows_read),prior:{rowsRead:Number(r.rows_read),rowsValid:Number(r.rows_valid),
    rowsRejected:Number(r.rows_rejected),rowsInserted:Number(r.rows_inserted),rowsChanged:Number(r.changed)}};
  }
 }
 const r=await db.query<{id:string}>(`INSERT INTO public.cq_bulk_source_runs
  (source,source_publish_date,source_reported_records,source_url,processed,changed,status,
   archive_sha256,archive_bytes,retrieved_at,retrieval_path,row_limit)
  VALUES($1,$2,$3,$4,0,0,'running',$5,$6,$7,$8,$9) RETURNING id::text`,
  [s.source,s.publishDate,s.reportedRecords,s.sourceUrl,s.archiveSha256,s.archiveBytes,s.retrievedAt,s.retrievalPath,s.rowLimit]);
 return {runId:Number(r.rows[0].id),resumeFromRow:0,prior:null};
}
export type BulkRunProgress={rowsRead:number;rowsValid:number;rowsRejected:number;rowsInserted:number;rowsChanged:number};
/** Checkpoint after each committed batch so an interrupted import can resume. */
export async function checkpointBulkRun(runId:number,p:BulkRunProgress,final?:{status:'complete'|'partial'|'failed';errorCode?:string}):Promise<void>{
 await database().query(`UPDATE public.cq_bulk_source_runs SET
  rows_read=$2,rows_valid=$3,rows_rejected=$4,rows_inserted=$5,changed=$6,processed=$2,
  status=COALESCE($7,status),error_code=$8,finished_at=CASE WHEN $7 IS NULL THEN NULL ELSE now() END
  WHERE id=$1`,[runId,p.rowsRead,p.rowsValid,p.rowsRejected,p.rowsInserted,p.rowsChanged,
  final?.status??null,final?.errorCode?.slice(0,200)??null]);
}

/** Server/operator-only connection to the approved source catalogue. Never expose to client components. */
export function getSourceCataloguePool():Pool{return database();}
