/**
 * CREQOR source catalogue backfill (operator-run, never a build-time script).
 *
 * Usage after DATABASE_URL + migration:
 * npm run catalogue:backfill -- --country=US --batches=4 --pages=3
 *
 * Uses official GLEIF public records and persistent per-country cursors.
 * Re-runs are idempotent by LEI + source fingerprint.
 */
import {synchronizeCatalogue,CATALOGUE_REGIONS} from '../lib/catalogue-store';

function arg(name:string){return process.argv.slice(2).find(a=>a.startsWith('--'+name+'='))?.slice(name.length+3);}
function bounded(value:string|undefined,defaultValue:number,min:number,max:number):number{
 if(value===undefined)return defaultValue;
 const n=Number(value);
 if(!Number.isSafeInteger(n)||n<min||n>max)throw new Error('Invalid numeric argument');
 return n;
}
async function main(){
 if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is required. Apply migration 001 and use a restricted database identity.');
 const country=(arg('country')||'').toUpperCase();
 const countries=country?[country]:[...CATALOGUE_REGIONS];
 if(countries.some(c=>!/^[A-Z]{2}$/.test(c)))throw new Error('Provide an ISO two-letter --country value');
 const batches=bounded(arg('batches'),3,1,500);
 const pages=bounded(arg('pages'),3,1,8);
 const sleepMs=bounded(arg('sleep-ms'),1800,500,60000);
 let totalFetched=0,totalChanged=0;
 for(const code of countries){
  for(let iteration=0;iteration<batches;iteration++){
   const r=await synchronizeCatalogue(code,pages);
   totalFetched+=r.fetched;totalChanged+=r.changed;
   // Do not print credentials or source payloads in operator logs.
   console.log(JSON.stringify({country:code,batch:iteration+1,status:r.status,
    pagesSucceeded:r.pagesSucceeded,records:r.fetched,updated:r.changed,nextPage:r.nextPage}));
   if(r.status!=='ok')throw new Error('One or more source pages failed; cursor retained for safe retry');
   if(iteration<batches-1||code!==countries[countries.length-1])await new Promise(resolve=>setTimeout(resolve,sleepMs));
  }
 }
 console.log(JSON.stringify({status:'completed',countries:countries.length,recordsFetched:totalFetched,recordsChanged:totalChanged}));
}
main().catch(e=>{console.error(e instanceof Error?e.message:'Backfill failed');process.exitCode=1;});
