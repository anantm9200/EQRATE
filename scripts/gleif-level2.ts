/**
 * Import GLEIF Level 2 data (relationship records or reporting exceptions) from an
 * official Golden Copy archive, with the same provenance ledger as the LEI import.
 *
 *   tsx scripts/gleif-level2.ts --kind=rr --archive=/var/creqor/imports/rr.csv.zip \
 *     --metadata=/var/creqor/imports/rr-latest.json --expected-sha256=<hex> [--retrieved-at=ISO]
 *   tsx scripts/gleif-level2.ts --kind=repex ...
 */
import {createReadStream} from 'node:fs';
import {readFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pipeline} from 'node:stream/promises';
import {resolve} from 'node:path';
import {parse} from 'csv-parse';
import * as unzipper from 'unzipper';
import {parseGoldenCopyMetadata} from '../lib/public-records-coverage';
import {catalogueConfigured,startBulkRun,checkpointBulkRun,getSourceCataloguePool,type BulkRunProgress} from '../lib/catalogue-store';
import {parseRelationshipRow,parseExceptionRow,upsertRelationships,upsertExceptions,requireHeaders,
 RR_REQUIRED,REPEX_REQUIRED,type Relationship,type ReportingException} from '../lib/gleif-relationships';

function arg(name:string){const a=process.argv.find(x=>x.startsWith('--'+name+'='));return a?a.slice(name.length+3):undefined;}
async function main(){
 if(!catalogueConfigured())throw new Error('DATABASE_URL_NOT_CONFIGURED');
 const kind=arg('kind');
 if(kind!=='rr'&&kind!=='repex')throw new Error('INVALID_KIND (rr|repex)');
 const archive=resolve(arg('archive')||''),metadata=resolve(arg('metadata')||'');
 const expected=(arg('expected-sha256')||'').toLowerCase();
 if(!/^[a-f0-9]{64}$/.test(expected))throw new Error('EXPECTED_SHA256_REQUIRED');
 const retrievedAt=arg('retrieved-at')||new Date().toISOString();
 if(!Number.isFinite(Date.parse(retrievedAt)))throw new Error('INVALID_RETRIEVED_AT');
 const meta=parseGoldenCopyMetadata(JSON.parse(await readFile(metadata,'utf8')));
 const size=(await stat(archive)).size;
 if(size!==meta.csvArchiveBytes)throw new Error('GLEIF_L2_ARCHIVE_SIZE_MISMATCH');
 const h=createHash('sha256');await pipeline(createReadStream(archive),h);
 const sha=h.digest('hex');
 if(sha!==expected)throw new Error('GLEIF_L2_ARCHIVE_SHA256_MISMATCH');
 const {runId}=await startBulkRun({source:kind==='rr'?'GLEIF_RR':'GLEIF_REPEX',publishDate:meta.publishDate,
  reportedRecords:meta.recordCount,sourceUrl:meta.csvUrl,archiveSha256:sha,archiveBytes:size,
  retrievedAt:new Date(retrievedAt).toISOString(),retrievalPath:arg('archive')?'operator-relay':'direct',rowLimit:null},false);
 console.log(JSON.stringify({step:'start',kind,runId,publishDate:meta.publishDate,officialRecords:meta.recordCount,sha256:sha}));
 const dir=await unzipper.Open.file(archive);
 const csv=dir.files.filter(x=>x.type==='File'&&x.path.toLowerCase().endsWith('.csv'));
 if(csv.length!==1)throw new Error('GLEIF_L2_ARCHIVE_INVALID');
 const parser=parse({columns:(hdr:string[])=>{requireHeaders(hdr,kind==='rr'?RR_REQUIRED:REPEX_REQUIRED);return hdr;},
  bom:true,skip_empty_lines:true,relax_column_count:true,max_record_size:100000});
 (await csv[0].stream()).pipe(parser);
 const p:BulkRunProgress={rowsRead:0,rowsValid:0,rowsRejected:0,rowsInserted:0,rowsChanged:0};
 let buffer:(Relationship|ReportingException)[]=[];
 const flush=async()=>{
  if(!buffer.length)return;
  const r=kind==='rr'?await upsertRelationships(buffer as Relationship[],runId):await upsertExceptions(buffer as ReportingException[],runId);
  p.rowsInserted+=r.inserted;p.rowsChanged+=r.changed;buffer=[];
  await checkpointBulkRun(runId,p);
 };
 try{
  for await(const raw of parser){
   p.rowsRead++;
   const rec=kind==='rr'?parseRelationshipRow(raw):parseExceptionRow(raw);
   if(rec){buffer.push(rec);p.rowsValid++;}else p.rowsRejected++;
   if(buffer.length>=1000)await flush();
   if(p.rowsRead%250000===0)console.log(JSON.stringify({step:'import',...p}));
  }
  await flush();
  const quality=p.rowsValid===0||p.rowsRejected>Math.max(50,p.rowsRead*0.02);
  await checkpointBulkRun(runId,p,{status:quality?'failed':'complete',errorCode:quality?'GLEIF_L2_DATA_QUALITY_CHECK_FAILED':undefined});
  const table=kind==='rr'?'cq_lei_relationships':'cq_lei_reporting_exceptions';
  const db=getSourceCataloguePool();
  const stale=await db.query<{n:string}>(`SELECT count(*)::text n FROM public.${table} WHERE last_seen_run_id IS DISTINCT FROM $1`,[runId]);
  const total=await db.query<{n:string}>(`SELECT count(*)::text n FROM public.${table}`);
  console.log(JSON.stringify({step:'complete',kind,runId,...p,storedRows:Number(total.rows[0].n),
   staleNotInLatestPublication:Number(stale.rows[0].n),officialRecords:meta.recordCount,publishDate:meta.publishDate}));
  if(quality)process.exitCode=1;
 }catch(e){
  await checkpointBulkRun(runId,p,{status:'failed',errorCode:e instanceof Error?e.message.slice(0,200):'GLEIF_L2_FAILED'}).catch(()=>{});
  throw e;
 }finally{await getSourceCataloguePool().end().catch(()=>{});}
}
main().catch(e=>{console.error(e instanceof Error?e.message:'GLEIF_L2_IMPORT_FAILED');process.exitCode=1;});
