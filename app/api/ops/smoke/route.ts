import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
import {calculateDcf,calculateMarketCap} from '@/lib/valuation';
import {searchLEI} from '@/lib/gleif';
export const runtime='nodejs';
export const dynamic='force-dynamic';
type Check={name:string;ok:boolean;detail:string};
async function checkRoute(name:string,url:string):Promise<Check>{
 try{
  const response=await fetch(url,{method:'HEAD',cache:'no-store',signal:AbortSignal.timeout(9000)});
  return {name,ok:response.ok,detail:'HTTP '+response.status};
 }catch{return {name,ok:false,detail:'Route not responding'};}
}
export async function GET(request:NextRequest){
 const secret=process.env.CRON_SECRET;
 const supplied=request.headers.get('authorization')?.replace(/^Bearer\s+/,'')||'';
 if(!secret||!supplied||supplied.length!==secret.length||
    !timingSafeEqual(Buffer.from(supplied),Buffer.from(secret))){
  return NextResponse.json({error:'Unauthorized'},{status:401,headers:{'Cache-Control':'no-store'}});
 }
 const started=Date.now();
 const checks:Check[]=[];
 try{
  const value=calculateMarketCap(24.6,120);
  const dcf=calculateDcf({baseFreeCashFlow:10,annualGrowth:0,discountRate:.1,terminalGrowth:0,forecastYears:1,netDebt:25});
  checks.push({name:'deterministic-math',ok:Math.abs(value-2952)<.0000001&&Math.abs(dcf.equityValue-75)<.000001,
    detail:'Market cap and DCF synthetic fixtures'});
 }catch{checks.push({name:'deterministic-math',ok:false,detail:'Calculation exception'});}
 const origin=request.nextUrl.origin;
 const [home,workbench,desk,directory,explore,health,lei]=await Promise.all([
  checkRoute('homepage',origin+'/'),
  checkRoute('workbench',origin+'/workbench'),
  checkRoute('research-desk',origin+'/desk'),
  checkRoute('global-directory',origin+'/directory'),
  checkRoute('explore',origin+'/explore'),
  checkRoute('health-route',origin+'/api/health'),
  (async():Promise<Check>=>{
   try{
    const r=await searchLEI('Apple Inc.');
    return {name:'gleif-source',ok:r.results.some(e=>e.lei==='HWUPKR0MPOU8FGXBT394'),
      detail:r.results.length+' matching LEI records returned'};
   }catch{return {name:'gleif-source',ok:false,detail:'GLEIF API unavailable'};}
  })()
 ]);
 checks.push(home,workbench,desk,directory,explore,health,lei);
 const ok=checks.every(x=>x.ok);
 const report={status:ok?'healthy':'degraded',checkedAt:new Date().toISOString(),durationMs:Date.now()-started,checks};
 if(ok)console.info('CREQOR_HOURLY_SMOKE',JSON.stringify(report));
 else console.error('CREQOR_HOURLY_SMOKE_FAILURE',JSON.stringify(report));
 return NextResponse.json(report,{status:ok?200:503,headers:{'Cache-Control':'no-store'}});
}