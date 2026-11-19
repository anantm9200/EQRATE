/**
 * Operator-only financial history backfill against SEC companyfacts.
 * Run on the DGX with restricted Postgres credentials and a compliant
 * SEC_USER_AGENT. Never from a public HTTP request.
 *
 * npm run catalogue:sec-financials -- --limit=50 --delay-ms=600
 */
import {getSourceCataloguePool,catalogueConfigured} from '../lib/catalogue-store';
import {fetchSecFinancialHistory,persistSecFinancialHistory} from '../lib/sec-financial-history';

function intOption(name:string,defaultValue:number,min:number,max:number):number{
 const raw=process.argv.find(a=>a.startsWith('--'+name+'='));
 if(!raw)return defaultValue;
 const n=Number(raw.slice(name.length+3));
 if(!Number.isSafeInteger(n)||n<min||n>max)throw new Error('INVALID_'+name);
 return n;
}
async function main(){
 if(!catalogueConfigured())throw new Error('DATABASE_URL_NOT_CONFIGURED');
 if(!process.env.SEC_USER_AGENT||!/\S+@\S+\.\S+/.test(process.env.SEC_USER_AGENT))
  throw new Error('SEC_USER_AGENT requires a real organisation and monitored contact email');
 const limit=intOption('limit',50,1,5000);
 const delay=intOption('delay-ms',600,350,30000);
 const db=getSourceCataloguePool();
 // Unprocessed and old entries first, with a bounded batch to avoid exhausting API limits.
 const pending=await db.query<{cik:number}>(`
 SELECT DISTINCT s.cik FROM public.cq_sec_issuers s
 LEFT JOIN public.cq_sec_fact_sync_state st ON st.cik=s.cik
 WHERE st.last_success_at IS NULL OR st.last_success_at < now()-interval '7 days'
 ORDER BY s.cik LIMIT $1`,[limit]);
 let success=0,failures=0,seenFacts=0,changed=0;
 for(const {cik} of pending.rows){
  try{
   const facts=await fetchSecFinancialHistory(cik);
   const n=await persistSecFinancialHistory(cik,facts);
   seenFacts+=facts.length;changed+=n;success++;
   console.log(JSON.stringify({cik,status:'ok',sourceFacts:facts.length,changed:n}));
  }catch(e){
   failures++;
   const code=e instanceof Error?e.message:'SEC_FINANCIAL_INGEST_FAILED';
   console.error(JSON.stringify({cik,status:'failed',reason:code.slice(0,95)}));
   await db.query(`INSERT INTO public.cq_sec_fact_sync_state
    (cik,source_url,last_status,error_code,updated_at)
    VALUES($1,$2,'failed',$3,now())
    ON CONFLICT(cik) DO UPDATE SET last_status='failed',error_code=EXCLUDED.error_code,updated_at=now()`,
    [cik,'https://data.sec.gov/api/xbrl/companyfacts/CIK'+String(cik).padStart(10,'0')+'.json',code.slice(0,120)]);
  }
  // Conservative official SEC request pacing; no concurrent bulk floods.
  await new Promise(resolve=>setTimeout(resolve,delay));
 }
 console.log(JSON.stringify({source:'SEC',ciksAttempted:pending.rows.length,success,failures,
  sourceFacts:seenFacts,changed,sourceStatus:'registrant-reported; not independently audited by CREQOR'}));
 if(failures)process.exitCode=1;
}
main().catch(e=>{console.error(e instanceof Error?e.message:'SEC_FINANCIAL_BACKFILL_FAILED');process.exitCode=1;});
