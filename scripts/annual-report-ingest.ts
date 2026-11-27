/**
 * Ingest one annual-report PDF that the operator relay placed in the imports folder.
 *
 *   tsx scripts/annual-report-ingest.ts --lei=<LEI> --file=/var/creqor/imports/reports/<sha>.pdf \
 *     --source-url=https://company.example/ar-2025.pdf --fiscal-year=2025 --retrieved-at=ISO [--published-at=YYYY-MM-DD]
 *
 * - Identified by SHA-256: an unchanged document is never processed twice.
 * - Text extraction uses `pdftotext -layout` with a timeout and output cap, inside the
 *   ingest container (no network, read-only root). Nothing in the PDF is executed.
 * - Figures come only from the deterministic Schedule III parser; validators decide
 *   between `validator_passed` and `pending` review. Documents are stored privately as
 *   evidence and are never republished.
 */
import {createHash} from 'node:crypto';
import {readFile,stat} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {getSourceCataloguePool} from '../lib/catalogue-store';
import {extractStatements,reviewStatusFor} from '../lib/annual-report-parser';

const run=promisify(execFile);
const arg=(n:string)=>process.argv.find(x=>x.startsWith('--'+n+'='))?.slice(n.length+3);

async function main(){
 const lei=(arg('lei')||'').toUpperCase();
 const file=arg('file')||'';
 const sourceUrl=arg('source-url')||'';
 const fiscalYear=Number(arg('fiscal-year'));
 const retrievedAt=arg('retrieved-at')||new Date().toISOString();
 const publishedAt=arg('published-at')||null;
 if(!/^[A-Z0-9]{20}$/.test(lei))throw new Error('BAD_LEI');
 if(!/^\/var\/creqor\/imports\/reports\/[0-9a-f]{64}\.pdf$/.test(file))throw new Error('BAD_FILE_PATH');
 if(!/^https:\/\/[^\s]+$/.test(sourceUrl))throw new Error('BAD_SOURCE_URL');
 if(!Number.isInteger(fiscalYear)||fiscalYear<1990||fiscalYear>2100)throw new Error('BAD_FISCAL_YEAR');
 if(publishedAt&&!/^\d{4}-\d{2}-\d{2}$/.test(publishedAt))throw new Error('BAD_PUBLISHED_AT');
 const bytes=(await stat(file)).size;
 if(bytes<1000||bytes>200*1024*1024)throw new Error('BAD_FILE_SIZE');
 const buf=await readFile(file);
 if(buf.subarray(0,5).toString('latin1')!=='%PDF-')throw new Error('NOT_A_PDF');
 const sha=createHash('sha256').update(buf).digest('hex');
 if(!file.endsWith(sha+'.pdf'))throw new Error('SHA_MISMATCH');

 const pool=getSourceCataloguePool();
 const existing=await pool.query<{document_id:string;status:string}>('SELECT document_id,status FROM cq_financial_documents WHERE sha256=$1',[sha]);
 if(existing.rowCount&&existing.rows[0].status==='facts_extracted'){
  console.log(JSON.stringify({step:'skip',reason:'document already processed',documentId:existing.rows[0].document_id}));
  await pool.end();return;
 }
 const entity=await pool.query('SELECT 1 FROM cq_lei_catalogue WHERE lei=$1',[lei]);
 if(!entity.rowCount)throw new Error('LEI_NOT_INDEXED');

 const {stdout}=await run('pdftotext',['-layout','-enc','UTF-8',file,'-'],{timeout:180000,maxBuffer:64*1024*1024});
 const pages=stdout.split('\f');
 const result=extractStatements(pages);

 const c=await pool.connect();
 try{
  await c.query('BEGIN');
  const doc=existing.rowCount?existing.rows[0].document_id:(await c.query<{document_id:string}>(
   `INSERT INTO cq_financial_documents (lei,source_id,document_type,fiscal_year,source_url,retrieval_path,retrieved_at,published_at,sha256,bytes,content_type,storage_path,page_count,status)
    VALUES ($1,'COMPANY_ANNUAL_REPORT','annual_report',$2,$3,'operator-relay',$4,$5,$6,$7,'application/pdf',$8,$9,'text_extracted') RETURNING document_id`,
   [lei,fiscalYear,sourceUrl,retrievedAt,publishedAt,sha,bytes,'reports/'+sha+'.pdf',pages.length])).rows[0].document_id;
  // A figure becomes public when the report is published; if unknown, when it was retrieved.
  const knownAt=publishedAt?publishedAt+'T00:00:00Z':retrievedAt;
  let inserted=0;
  for(const f of result.figures){
   const status=reviewStatusFor(f,result.validations);
   const r=await c.query(`INSERT INTO cq_financial_observations (lei,document_id,original_label,normalized_concept,statement,period_type,period_end,fiscal_year,scope,
     currency,unit_label,unit_multiplier,source_value,normalized_value,page,extraction_method,extraction_confidence,review_status,known_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'INR',$10,$11,$12,$12::numeric*$11::numeric,$13,'deterministic_table',$14,$15,$16)
    ON CONFLICT (document_id,normalized_concept,period_end,scope) DO NOTHING`,
    [lei,doc,f.label,f.concept,f.statement==='cash_flow'?'cash_flow':f.statement,f.statement==='balance'?'instant':'annual',f.periodEnd,f.fiscalYear,f.scope,
     f.unitLabel,f.unitMultiplier,f.value,f.page,status==='validator_passed'?0.95:0.8,status,knownAt]);
   inserted+=r.rowCount||0;
  }
  const outcome=result.figures.length?'facts_extracted':'failed';
  await c.query('UPDATE cq_financial_documents SET status=$2,status_detail=$3,updated_at=now() WHERE document_id=$1',
   [doc,outcome,JSON.stringify({pages:result.pages,validations:result.validations,warnings:result.warnings}).slice(0,8000)]);
  await c.query('COMMIT');
  console.log(JSON.stringify({step:'done',documentId:doc,sha256:sha,statementPages:result.pages.length,figures:result.figures.length,inserted,
   validations:{passed:result.validations.filter(v=>v.passed).length,failed:result.validations.filter(v=>v.passed===false).length}}));
  if(!result.figures.length)process.exitCode=3;
 }catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}finally{c.release();await pool.end();}
}
main().catch(e=>{console.error(JSON.stringify({step:'error',code:e instanceof Error?e.message.slice(0,120):'UNKNOWN'}));process.exit(1);});
