import {NextResponse} from 'next/server';
import {getFeaturedCompanyUniverse} from '@/lib/company-universe';
export const runtime='nodejs';
export const maxDuration=30;

export async function GET(){
 try{
  const data=await getFeaturedCompanyUniverse();
  return NextResponse.json({...data,source:'GLEIF',
   caveat:'Only GLEIF LEI identity records are provided. Company accounts, trading status, market price and ratings are not asserted.'},
   {status:200,headers:{'Cache-Control':'public,s-maxage=3600,stale-while-revalidate=14400'}});
 }catch{
  return NextResponse.json({records:[],source:'GLEIF',
   error:'Featured official records are temporarily unavailable; the full searchable directory remains accessible.'},
   {status:503,headers:{'Cache-Control':'no-store'}});
 }
}
