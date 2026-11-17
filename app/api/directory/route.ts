import {NextRequest,NextResponse} from 'next/server';
import {directoryUrl,listLEIRecords} from '@/lib/gleif';
export const runtime='nodejs';

export async function GET(request:NextRequest){
 const params=request.nextUrl.searchParams;
 const q=(params.get('q')||'').trim();
 const country=(params.get('country')||'').trim().toUpperCase();
 const rawPage=params.get('page')||'1';
 const page=Number(rawPage);
 try{
  if(!/^\d+$/.test(rawPage))throw new Error('INVALID_PAGE');
  directoryUrl({q,country,page});
 }catch{
  return NextResponse.json({error:'Invalid search, country or page. Use a two-letter country code and page number within the public GLEIF browse window.'},{status:400,headers:{'Cache-Control':'no-store'}});
 }
 try{
  const result=await listLEIRecords({q,country,page});
  return NextResponse.json(result,{headers:{'Cache-Control':'public,s-maxage=180,stale-while-revalidate=600'}});
 }catch{
  return NextResponse.json({error:'The GLEIF directory is temporarily unavailable. No substitute or fictional company records were returned.'},{status:503,headers:{'Cache-Control':'no-store'}});
 }
}
