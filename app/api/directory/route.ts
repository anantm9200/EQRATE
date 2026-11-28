import {NextRequest,NextResponse} from 'next/server';
import {directoryFilters,loadDirectory} from '@/lib/identity-directory';
export const runtime='nodejs';

// Served from CREQOR's private Golden Copy index; live GLEIF only as a labelled last resort.
export async function GET(request:NextRequest){
 const params=request.nextUrl.searchParams;
 let filters;
 try{filters=directoryFilters({q:params.get('q'),country:params.get('country'),page:params.get('page')});}
 catch{
  return NextResponse.json({error:'Invalid search, country or page. Use a two-letter country code, at least two letters of a name and a page from 1 to 200.'},{status:400,headers:{'Cache-Control':'no-store'}});
 }
 try{
  const result=await loadDirectory(filters);
  return NextResponse.json(result,{headers:{'Cache-Control':result.origin==='private-index'?'public,s-maxage=180,stale-while-revalidate=600':'no-store'}});
 }catch(e){
  if(e instanceof Error&&e.message==='LIVE_PAGE_OUT_OF_RANGE')
   return NextResponse.json({error:'The private index is unavailable and the live GLEIF API cannot page this deep. Narrow the search or retry shortly.'},{status:503,headers:{'Cache-Control':'no-store'}});
  return NextResponse.json({error:'The company directory is temporarily unavailable. No substitute or fictional company records were returned.'},{status:503,headers:{'Cache-Control':'no-store'}});
 }
}
