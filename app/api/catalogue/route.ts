import {NextRequest,NextResponse} from 'next/server';
import {dgxGatewayConfigured} from '@/lib/dgx-gateway';
import {directoryFilters,loadIndexedDirectory} from '@/lib/identity-directory';
export const runtime='nodejs';
// The indexed catalogue is CREQOR's private DGX index (GLEIF Golden Copy). It never
// substitutes live registry data; /directory carries the labelled live fallback.
export async function GET(request:NextRequest){
 if(!dgxGatewayConfigured())return NextResponse.json({
  error:'Indexed catalogue is not connected. Company search remains available at /directory.',
  source:'GLEIF',ready:false
 },{status:503,headers:{'Cache-Control':'no-store'}});
 const params=request.nextUrl.searchParams;
 let filters;
 try{filters=directoryFilters({q:params.get('q'),country:params.get('country'),page:params.get('page')});}
 catch{return NextResponse.json({error:'Invalid indexed catalogue filters.'},{status:400,headers:{'Cache-Control':'no-store'}});}
 try{
  const data=await loadIndexedDirectory(filters);
  return NextResponse.json({...data,indexed:true},{
   headers:{'Cache-Control':'public,s-maxage=60,stale-while-revalidate=300'}});
 }catch{
  return NextResponse.json({error:'Indexed catalogue currently unavailable. Use the company directory.'},
   {status:503,headers:{'Cache-Control':'no-store'}});
 }
}
