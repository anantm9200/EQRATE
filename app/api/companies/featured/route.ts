import {NextResponse} from 'next/server';
import {loadFeatured,LIVE_FALLBACK_NOTE} from '@/lib/identity-directory';
export const runtime='nodejs';
export const maxDuration=30;

export async function GET(){
 try{
  const data=await loadFeatured();
  const live=data.origin==='live-gleif-fallback';
  return NextResponse.json({...data,source:'GLEIF',...(live?{fallbackNote:LIVE_FALLBACK_NOTE}:{}),
   caveat:'Only GLEIF LEI identity records are provided. Company accounts, trading status, market price and ratings are not asserted.'},
   {status:200,headers:{'Cache-Control':live?'public,s-maxage=300':'public,s-maxage=3600,stale-while-revalidate=14400'}});
 }catch{
  return NextResponse.json({records:[],source:'GLEIF',
   error:'Featured official records are temporarily unavailable; the full searchable directory remains accessible.'},
   {status:503,headers:{'Cache-Control':'no-store'}});
 }
}
