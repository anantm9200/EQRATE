import {NextRequest,NextResponse} from 'next/server';
import {searchLEI} from '@/lib/gleif';
export const runtime='nodejs';
export async function GET(request:NextRequest){
 const q=(request.nextUrl.searchParams.get('q')||'').trim();
 if(q.length<2)return NextResponse.json({results:[],message:'Enter at least two characters.'});
 if(q.length>90)return NextResponse.json({results:[],message:'Search is limited to 90 characters.'},{status:400});
 try{
  const data=await searchLEI(q);
  return NextResponse.json({...data,source:'Global Legal Entity Identifier Foundation',notice:'LEI reference data does not prove a stock listing, audited financials or a market valuation.'},{headers:{'Cache-Control':'public,s-maxage=120,stale-while-revalidate=600'}});
 }catch{
  return NextResponse.json({results:[],message:'GLEIF entity lookup is temporarily unavailable. Use the original LEI Search.',source:'GLEIF'},{status:503,headers:{'Cache-Control':'no-store'}});
 }
}