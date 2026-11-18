import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
import {CATALOGUE_REGIONS,catalogueConfigured,synchronizeCatalogue} from '@/lib/catalogue-store';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=30;
function authorized(request:NextRequest){
 const expected=process.env.CRON_SECRET||'';
 const actual=request.headers.get('authorization')?.replace(/^Bearer\s+/i,'')||'';
 return Boolean(expected&&actual&&Buffer.byteLength(expected)===Buffer.byteLength(actual)&&
  timingSafeEqual(Buffer.from(expected),Buffer.from(actual)));
}
function respond(body:object,status=200){
 return NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});
}
async function run(country:string,pages:number,page?:number){
 if(!catalogueConfigured())return respond({status:'disabled',message:'DATABASE_URL is not configured. No records were fabricated.'});
 try{
  const result=await synchronizeCatalogue(country,pages,page);
  return respond(result,result.status==='failed'?502:200);
 }catch(e){
  const msg=e instanceof Error?e.message:'CATALOGUE_SYNC_FAILED';
  console.error('CREQOR_CATALOGUE_SYNC_ERROR',msg.replace(/postgres(?:ql)?:\/\/\S+/gi,'[database redacted]'));
  return respond({status:'failed',message:'The source catalogue could not be updated. Check database migration, permissions and upstream availability.'},503);
 }
}
// Vercel Cron sends Authorization: Bearer CRON_SECRET. Rotate a small country
// segment each hour; each country has its own persistent cursor.
export async function GET(request:NextRequest){
 if(!authorized(request))return respond({error:'Unauthorized'},401);
 const hour=Math.floor(Date.now()/3600000);
 const country=CATALOGUE_REGIONS[hour%CATALOGUE_REGIONS.length];
 return run(country,3);
}
export async function POST(request:NextRequest){
 if(!authorized(request))return respond({error:'Unauthorized'},401);
 let body:unknown;
 try{
  const content=await request.text();
  if(content.length>1000)return respond({error:'Sync request exceeds size limit.'},413);
  body=JSON.parse(content);
 }catch{return respond({error:'Invalid JSON body.'},400);}
 if(!body||typeof body!=='object'||Array.isArray(body))return respond({error:'Invalid request.'},400);
 const options=body as Record<string,unknown>;
 const country=options.country;
 const pages=options.pages===undefined?3:options.pages;
 const page=options.page;
 if(typeof country!=='string'||!/^[A-Z]{2}$/.test(country)||typeof pages!=='number'||
    !Number.isInteger(pages)||pages<1||pages>8||
    (page!==undefined&&(typeof page!=='number'||!Number.isInteger(page)||page<1||page>166)))
  return respond({error:'Provide an uppercase two-letter country, 1–8 pages and optional valid page.'},400);
 return run(country,pages,page as number|undefined);
}
