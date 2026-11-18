import {NextRequest,NextResponse} from 'next/server';
import {catalogueConfigured,listIndexedRecords} from '@/lib/catalogue-store';
export const runtime='nodejs';
export async function GET(request:NextRequest){
 if(!catalogueConfigured())return NextResponse.json({
  error:'Indexed catalogue is not configured. Live company search remains available at /directory.',
  source:'GLEIF',ready:false
 },{status:503,headers:{'Cache-Control':'no-store'}});
 const params=request.nextUrl.searchParams;
 const q=(params.get('q')||'').trim();
 const country=(params.get('country')||'').trim();
 const pageRaw=params.get('page')||'1';
 if(!/^\d{1,4}$/.test(pageRaw)||Number(pageRaw)>1000||Number(pageRaw)<1||
  q.length>90||(q.length>0&&q.length<2)||(country&&!/^[A-Za-z]{2}$/.test(country))){
  return NextResponse.json({error:'Invalid indexed catalogue filters.'},{status:400,headers:{'Cache-Control':'no-store'}});
 }
 try{
  const data=await listIndexedRecords({q,country,page:Number(pageRaw)});
  return NextResponse.json({...data,indexed:true},{
   headers:{'Cache-Control':'public,s-maxage=60,stale-while-revalidate=300'}});
 }catch{
  return NextResponse.json({error:'Indexed catalogue currently unavailable. Use the live GLEIF directory.'},
   {status:503,headers:{'Cache-Control':'no-store'}});
 }
}
