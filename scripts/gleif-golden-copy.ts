/**
 * Import the official GLEIF Golden Copy full LEI registry into CREQOR.
 * Operator-only. Never run a ~500 MB archive download inside a Vercel request.
 *
 * npm run catalogue:golden-copy -- --dry-run --limit=500
 * npm run catalogue:golden-copy -- --limit=100000
 * npm run catalogue:golden-copy -- --limit=all --resume
 * Operator relay (host cannot reach goldencopy.gleif.org directly):
 * npm run catalogue:golden-copy -- --archive=/var/creqor/imports/x.csv.zip \
 *   --metadata=/var/creqor/imports/x.metadata.json --expected-sha256=<hex> --limit=all
 *
 * Fully sourced, streamed and bounded. No synthetic company records. Every run is
 * recorded in cq_bulk_source_runs with the publication date, archive SHA-256,
 * retrieval time and separate read / valid / rejected / inserted / changed counts.
 */
import {mkdtemp,stat,rm,readFile} from 'node:fs/promises';
import {createReadStream,createWriteStream} from 'node:fs';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pipeline} from 'node:stream/promises';
import {Readable} from 'node:stream';
import {parse} from 'csv-parse';
import * as unzipper from 'unzipper';
import {fetchGoldenCopyMetadata,parseGoldenCopyMetadata,type GoldenCopyMetadata} from '../lib/public-records-coverage';
import {parseGoldenCsvRow,validateGoldenCsvHeader} from '../lib/gleif-golden-copy';
import {catalogueConfigured,upsertSourcedBatch,startBulkRun,checkpointBulkRun,
 getSourceCataloguePool,type BulkRunProgress} from '../lib/catalogue-store';
import type {LeiEntity} from '../lib/gleif';

type Options={dryRun:boolean;resume:boolean;limit:number;all:boolean;batchSize:number;
 archive:string|null;metadata:string|null;expectedSha256:string|null;retrievedAt:string|null};
const MAX_ROWS=10000000;
export function parseOptions(args:string[]):Options{
 const map=new Map<string,string>();
 let dryRun=false,resume=false;
 for(const a of args){
  if(a==='--dry-run'){dryRun=true;continue;}
  if(a==='--resume'){resume=true;continue;}
  const match=a.match(/^--([a-z0-9-]+)=(.*)$/);
  if(!match||!['limit','batch-size','archive','metadata','expected-sha256','retrieved-at'].includes(match[1]))
   throw new Error('UNKNOWN_CLI_ARGUMENT: '+a);
  if(map.has(match[1]))throw new Error('DUPLICATE_CLI_ARGUMENT');
  map.set(match[1],match[2]);
 }
 const num=(key:string,def:number,max:number):number=>{
  const raw=map.get(key);
  const n=raw===undefined?def:raw==='all'?max:Number(raw);
  if(!Number.isSafeInteger(n)||n<1||n>max)throw new Error('INVALID_'+key.toUpperCase());
  return n;
 };
 const sha=map.get('expected-sha256')?.toLowerCase()||null;
 if(sha!==null&&!/^[a-f0-9]{64}$/.test(sha))throw new Error('INVALID_EXPECTED_SHA256');
 const retrievedAt=map.get('retrieved-at')||null;
 if(retrievedAt!==null&&!Number.isFinite(Date.parse(retrievedAt)))throw new Error('INVALID_RETRIEVED_AT');
 const archive=map.get('archive')?resolve(map.get('archive')!):null;
 const metadata=map.get('metadata')?resolve(map.get('metadata')!):null;
 if(archive&&!metadata&&!dryRun)throw new Error('ARCHIVE_REQUIRES_METADATA: provide the official publish metadata JSON for provenance');
 return {dryRun,resume,limit:num('limit',100000,MAX_ROWS),all:map.get('limit')==='all',
  batchSize:num('batch-size',750,1000),archive,metadata,expectedSha256:sha,retrievedAt};
}
async function retrieveArchive(meta:GoldenCopyMetadata,target:string):Promise<void>{
 const response=await fetch(meta.csvUrl,{headers:{Accept:'application/zip'},
  signal:AbortSignal.timeout(720000)});
 if(!response.ok||!response.body)throw new Error('GLEIF_ARCHIVE_DOWNLOAD_'+response.status);
 const finalUrl=new URL(response.url);
 if(!['goldencopy.gleif.org','leidata-preview.gleif.org'].includes(finalUrl.hostname)||
    finalUrl.protocol!=='https:')throw new Error('GLEIF_ARCHIVE_UNTRUSTED_REDIRECT');
 const len=Number(response.headers.get('content-length')||0);
 if(len>0&&len>1500000000)throw new Error('GLEIF_ARCHIVE_TOO_LARGE');
 await pipeline(Readable.fromWeb(response.body as never),createWriteStream(target,{flags:'wx'}));
}
async function verifyArchive(path:string,meta:GoldenCopyMetadata|null,expected:string|null):Promise<{sha256:string;bytes:number}>{
 const file=await stat(path);
 if(file.size<=1000||file.size>1500000000)throw new Error('GLEIF_ARCHIVE_BAD_SIZE');
 if(meta&&meta.csvArchiveBytes>0&&file.size!==meta.csvArchiveBytes)throw new Error('GLEIF_ARCHIVE_SIZE_MISMATCH');
 const hash=createHash('sha256');
 await pipeline(createReadStream(path),hash);
 const sha256=hash.digest('hex');
 if(expected&&expected!==sha256)throw new Error('GLEIF_ARCHIVE_SHA256_MISMATCH');
 return {sha256,bytes:file.size};
}
export async function importGoldenArchive(path:string,options:Options,run:{runId:number;publishedAt:string|null;resumeFromRow:number;prior:BulkRunProgress|null}|null):Promise<
 BulkRunProgress&{limitReached:boolean}>{
 const directory=await unzipper.Open.file(path);
 const csv=directory.files.filter(f=>f.type==='File'&&f.path.toLowerCase().endsWith('.csv'));
 if(csv.length!==1||csv[0].path.includes('..')||csv[0].uncompressedSize>12000000000)
  throw new Error('GLEIF_ARCHIVE_INVALID_CSV_CONTENTS');
 const parser=parse({columns:(header:string[])=>{
   validateGoldenCsvHeader(header);
   return header;
  },bom:true,skip_empty_lines:true,relax_column_count:true,max_record_size:200000});
 const input=await csv[0].stream();
 input.pipe(parser);
 const skip=run?.resumeFromRow??0;
 // On resume, counters continue from the last committed checkpoint (rowsRead is re-counted while skipping).
 const p:BulkRunProgress={rowsRead:0,rowsValid:run?.prior?.rowsValid??0,rowsRejected:run?.prior?.rowsRejected??0,
  rowsInserted:run?.prior?.rowsInserted??0,rowsChanged:run?.prior?.rowsChanged??0};
 const buffer:LeiEntity[]=[];
 let limitReached=false;
 const started=Date.now();
 async function flush(){
  if(!buffer.length)return;
  if(!options.dryRun&&run){
   const result=await upsertSourcedBatch(buffer,{runId:run.runId,publishedAt:run.publishedAt});
   p.rowsInserted+=result.inserted;p.rowsChanged+=result.changed;
  }
  buffer.length=0;
  // Checkpoint only after the batch transaction committed: rowsRead is a safe resume point.
  if(!options.dryRun&&run)await checkpointBulkRun(run.runId,p);
 }
 for await(const raw of parser){
  p.rowsRead++;
  if(p.rowsRead<=skip){continue;}
  const record=parseGoldenCsvRow(raw as Record<string,string>);
  if(record){buffer.push(record);p.rowsValid++;}else p.rowsRejected++;
  if(buffer.length>=options.batchSize)await flush();
  if(p.rowsRead%50000===0)console.log(JSON.stringify({step:'import',...p,
   rowsPerSecond:Math.round((p.rowsRead-skip)/Math.max(1,(Date.now()-started)/1000))}));
  if(!options.all&&p.rowsRead>=options.limit){limitReached=true;break;}
 }
 if(limitReached){parser.destroy();input.destroy();}
 await flush();
 return {...p,limitReached};
}
async function loadMetadata(options:Options):Promise<GoldenCopyMetadata|null>{
 if(options.metadata){
  const raw=JSON.parse(await readFile(options.metadata,'utf8'));
  return parseGoldenCopyMetadata(raw);
 }
 if(options.archive)return null;
 return fetchGoldenCopyMetadata();
}
async function main(){
 const options=parseOptions(process.argv.slice(2));
 if(!options.dryRun&&!catalogueConfigured())
  throw new Error('DATABASE_URL_NOT_CONFIGURED: No DB writes attempted. Use --dry-run, or connect an approved dedicated Postgres first.');
 const temp=options.archive?null:await mkdtemp(join(tmpdir(),'creqor-gleif-'));
 let archive=options.archive;
 let runId:number|null=null;
 let progress:BulkRunProgress={rowsRead:0,rowsValid:0,rowsRejected:0,rowsInserted:0,rowsChanged:0};
 try{
  const meta=await loadMetadata(options);
  console.log(JSON.stringify({step:'source',publishDate:meta?.publishDate||null,officialRecords:meta?.recordCount||null,
   archiveBytes:meta?.csvArchiveBytes||null,mode:options.dryRun?'dry-run':'database-import',
   limit:options.all?'all':options.limit,retrieval:options.archive?'operator-relay':'direct'}));
  if(!archive){archive=join(temp!,'official-gleif.csv.zip');await retrieveArchive(meta!,archive);}
  const verified=await verifyArchive(archive,meta,options.expectedSha256);
  console.log(JSON.stringify({step:'archive-verified',sha256:verified.sha256,bytes:verified.bytes}));
  let run:{runId:number;publishedAt:string|null;resumeFromRow:number;prior:BulkRunProgress|null}|null=null;
  if(!options.dryRun){
   const publishedAt=meta?new Date(meta.publishDate.replace(' ','T')+'Z').toISOString():null;
   const started=await startBulkRun({source:'GLEIF_GOLDEN_COPY',publishDate:meta?.publishDate||null,
    reportedRecords:meta?.recordCount??null,sourceUrl:meta?.csvUrl||'https://www.gleif.org/en/lei-data/gleif-golden-copy',
    archiveSha256:verified.sha256,archiveBytes:verified.bytes,
    retrievedAt:options.retrievedAt?new Date(options.retrievedAt).toISOString():new Date().toISOString(),
    retrievalPath:options.archive?'operator-relay':'direct',rowLimit:options.all?null:options.limit},options.resume);
   runId=started.runId;
   run={runId,publishedAt,resumeFromRow:started.resumeFromRow,prior:started.prior};
   if(started.resumeFromRow)console.log(JSON.stringify({step:'resume',runId,fromRow:started.resumeFromRow}));
  }
  const stats=await importGoldenArchive(archive,options,run);
  progress=stats;
  const quality=stats.rowsRead===0||stats.rowsValid===0||stats.rowsRejected>Math.max(20,stats.rowsRead*.05);
  let stale:number|null=null,confirmed:number|null=null;
  if(runId!==null){
   const status=quality?'failed':stats.limitReached?'partial':'complete';
   await checkpointBulkRun(runId,stats,{status,errorCode:quality?'GLEIF_IMPORT_DATA_QUALITY_CHECK_FAILED':undefined});
   const db=getSourceCataloguePool();
   const c=await db.query<{n:string}>('SELECT count(*)::text n FROM public.cq_lei_catalogue WHERE last_seen_run_id=$1',[runId]);
   confirmed=Number(c.rows[0]?.n||0);
   // Only a complete full-file run can establish that a record left the publication.
   if(status==='complete'){
    // Keep the India identifier view in step with the catalogue (migration 006+).
    try{
     const india=await db.query<{n:string}>('SELECT public.cq_refresh_india_entities()::text n');
     console.log(JSON.stringify({step:'india-view-refreshed',indianEntities:Number(india.rows[0]?.n||0)}));
    }catch(e){
     // The catalogue import itself succeeded; the derived India view is stale until a retry.
     const code=e instanceof Error?e.message.slice(0,160):'INDIA_VIEW_REFRESH_FAILED';
     if(!/does not exist/.test(code)){
      console.error(JSON.stringify({step:'india-view-refresh-failed',code,retry:"SELECT public.cq_refresh_india_entities();"}));
      process.exitCode=3;
     }
    }
    const s=await db.query<{n:string}>('SELECT count(*)::text n FROM public.cq_lei_catalogue WHERE last_seen_run_id IS DISTINCT FROM $1',[runId]);
    stale=Number(s.rows[0]?.n||0);
   }
  }
  console.log(JSON.stringify({step:'complete',runId,...stats,distinctConfirmedInRun:confirmed,
   duplicateRowsInSource:confirmed===null?null:Math.max(0,stats.rowsValid-confirmed),
   staleNotInLatestPublication:stale,officialPublishDate:meta?.publishDate||null,
   officialRecordCount:meta?.recordCount??null,source:'GLEIF',persisted:!options.dryRun}));
  if(quality)throw new Error('GLEIF_IMPORT_DATA_QUALITY_CHECK_FAILED');
 }catch(e){
  if(runId!==null)await checkpointBulkRun(runId,progress,{status:'failed',
   errorCode:e instanceof Error?e.message.slice(0,200):'GLEIF_IMPORT_FAILED'}).catch(()=>{});
  throw e;
 }finally{
  if(temp)await rm(temp,{recursive:true,force:true});
  if(catalogueConfigured())await getSourceCataloguePool().end().catch(()=>{});
 }
}
if(process.argv[1]&&/gleif-golden-copy\.ts$/.test(process.argv[1]))
 main().catch(e=>{console.error(e instanceof Error?e.message:'GLEIF_IMPORT_FAILED');process.exitCode=1;});
