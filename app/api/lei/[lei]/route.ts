import {NextRequest,NextResponse} from 'next/server';
import {getLEI} from '@/lib/gleif';
export const runtime='nodejs';
export async function GET(_request:NextRequest,{params}:{params:Promise<{lei:string}>}){
 const {lei}=await params;
 if(!/^[A-Z0-9]{20}$/i.test(lei))return NextResponse.json({error:'Invalid Legal Entity Identifier.'},{status:400});
 try{
  const record=await getLEI(lei);
  if(!record)return NextResponse.json({error:'LEI record not found.'},{status:404});
  return NextResponse.json({record,source:'Global Legal Entity Identifier Foundation'},{headers:{'Cache-Control':'public,s-maxage=600,stale-while-revalidate=1800'}});
 }catch{return NextResponse.json({error:'GLEIF lookup unavailable.'},{status:503});}
}