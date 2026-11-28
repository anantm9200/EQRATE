import {NextRequest,NextResponse} from 'next/server';
import {loadLeiRecord,LIVE_FALLBACK_NOTE} from '@/lib/identity-directory';
export const runtime='nodejs';
export async function GET(_request:NextRequest,{params}:{params:Promise<{lei:string}>}){
 const {lei}=await params;
 if(!/^[A-Z0-9]{20}$/i.test(lei))return NextResponse.json({error:'Invalid Legal Entity Identifier.'},{status:400});
 try{
  const {record,origin}=await loadLeiRecord(lei.toUpperCase());
  if(!record)return NextResponse.json({error:origin==='private-index'?'LEI not in the private index.':'LEI record not found.',origin},{status:404});
  const live=origin==='live-gleif-fallback';
  return NextResponse.json({record,origin,source:'Global Legal Entity Identifier Foundation',...(live?{fallbackNote:LIVE_FALLBACK_NOTE}:{})},
   {headers:{'Cache-Control':live?'no-store':'public,s-maxage=600,stale-while-revalidate=1800'}});
 }catch{return NextResponse.json({error:'LEI lookup unavailable.'},{status:503});}
}
