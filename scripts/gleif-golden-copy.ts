/**
 * Import the official GLEIF Golden Copy full LEI registry into CREQOR.
 * Operator-only. Never run a ~500 MB archive download inside a Vercel request.
 *
 * npm run catalogue:golden-copy -- --dry-run --limit=500
 * npm run catalogue:golden-copy -- --limit=100000
 * npm run catalogue:golden-copy -- --archive=/path/to/official.csv.zip
 * npm run catalogue:golden-copy -- --limit=all
 *
 * Fully sourced, streamed and bounded. No synthetic company records.
 */
import {mkdtemp,stat,rm,open as openFile} from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pipeline} from 'node:stream/promises';
import {Readable} from 'node:stream';
import {parse} from 'csv-parse';
import * as unzipper from 'unzipper';
import {fetchGoldenCopyMetadata,type GoldenCopyMetadata} from '../lib/public-records-coverage';
import {parseGoldenCsvRow,validateGoldenCsvHeader} from '../lib/gleif-golden-copy';
import {catalogueConfigured,upsertSourcedBatch} from '../lib/catalogue-store';
import type {LeiEntity} from '../lib/gleif';

type Options={dryRun:boolean;limit:number;batchSize:number;archive:string|null};
function parseOptions(args:string[]):Options{
 const map=new Map<string,string>();
 let dryRun=false;
 for(const a of args){
  if(a==='--dry-run'){dryRun=true;continue;}
  const match=a.match(/^--([a-z-]+)=(.*)$/);
  if(!match||!['limit','batch-size','archive'].includes(match[1]))throw new Error('UNKNOWN_CLI_ARGUMENT: '+a);
  if(map.has(match[1]))throw new Error('DUPLICATE_CLI_ARGUMENT');
  map.set(match[1],match[2]);
 }
 const num=(key:string,def:number,max:number):number=>{
  const raw=map.get(key);
  const n=raw===undefined?def:raw==='all'?max:Number(raw);
  if(!Number.isSafeInteger(n)||n<1||n>max)throw new Error('INVALID_'+key.toUpperCase());
  return n;
 };
 return {dryRun,limit:num('limit',100000,10000000),batchSize:num('batch-size',750,1000),
  archive:map.get('archive')?resolve(map.get('archive')!):null};
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
 const file=await stat(target);
 if(file.size<=1000||file.size>1500000000)throw new Error('GLEIF_ARCHIVE_BAD_SIZE');
 if(meta.csvArchiveBytes>0&&Math.abs(file.size-meta.csvArchiveBytes)>Math.max(5000,meta.csvArchiveBytes*.04))
  throw new Error('GLEIF_ARCHIVE_SIZE_MISMATCH');
}
export async function importGoldenArchive(path:string,options:Options):Promise<{
 read:number;valid:number;invalid:number;updated:number;publishDate:string|null
}>{
 const directory=await unzipper.Open.file(path);
 const csv=directory.files.filter(f=>f.type==='File'&&f.path.toLowerCase().endsWith('.csv'));
 if(csv.length!==1||csv[0].path.includes('..')||csv[0].uncompressedSize>12000000000)
  throw new Error('GLEIF_ARCHIVE_INVALID_CSV_CONTENTS');
 const parser=parse({columns:(header:string[])=>{
   validateGoldenCsvHeader(header);
   return header;
  },bom:true,skip_empty_lines:true,relax_column_count:true,max_record_size:100000});
 const input=await csv[0].stream();
 input.pipe(parser);
 let read=0,valid=0,invalid=0,updated=0;
 const buffer:LeiEntity[]=[];
 async function flush(){
  if(!buffer.length)return;
  if(!options.dryRun){
   const result=await upsertSourcedBatch(buffer);
   updated+=result.changed;
  }
  buffer.length=0;
 }
 for await(const raw of parser){
  read++;
  const record=parseGoldenCsvRow(raw as Record<string,string>);
  if(record){buffer.push(record);valid++;}else invalid++;
  if(buffer.length>=options.batchSize)await flush();
  if(read%25000===0)console.log(JSON.stringify({step:'import',rowsRead:read,valid,invalid,changed:updated}));
  if(read>=options.limit)break;
 }
 // Destroy the stream on --limit to stop extraction immediately.
 if(read>=options.limit){parser.destroy();input.destroy();}
 await flush();
 return {read,valid,invalid,updated,publishDate:null};
}
async function main(){
 const options=parseOptions(process.argv.slice(2));
 if(!options.dryRun&&!catalogueConfigured())
  throw new Error('DATABASE_URL_NOT_CONFIGURED: No DB writes attempted. Use --dry-run, or connect an approved dedicated Postgres first.');
 const temp=options.archive?null:await mkdtemp(join(tmpdir(),'creqor-gleif-'));
 let archive=options.archive;
 let meta:GoldenCopyMetadata|null=null;
 try{
  if(!archive){
   meta=await fetchGoldenCopyMetadata();
   console.log(JSON.stringify({step:'source',date:meta.publishDate,officialRecords:meta.recordCount,
    archiveBytes:meta.csvArchiveBytes,mode:options.dryRun?'dry-run':'database-import',limit:options.limit}));
   archive=join(temp!,'official-gleif.csv.zip');
   await retrieveArchive(meta,archive);
  }else console.log(JSON.stringify({step:'local-archive',mode:options.dryRun?'dry-run':'database-import',
   path:'operator-supplied file',limit:options.limit}));
  const stats=await importGoldenArchive(archive,options);
  console.log(JSON.stringify({step:'complete',...stats,officialPublishDate:meta?.publishDate||null,
   source:'GLEIF',persisted:!options.dryRun}));
  if(stats.read===0||stats.valid===0||stats.invalid>Math.max(20,stats.read*.05))
   throw new Error('GLEIF_IMPORT_DATA_QUALITY_CHECK_FAILED');
 }finally{if(temp)await rm(temp,{recursive:true,force:true});}
}
main().catch(e=>{console.error(e instanceof Error?e.message:'GLEIF_IMPORT_FAILED');process.exitCode=1;});
