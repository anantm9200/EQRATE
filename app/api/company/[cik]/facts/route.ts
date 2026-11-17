import {NextRequest,NextResponse} from 'next/server';
import {getSecFinancialHighlights} from '@/lib/sec-facts';
export const runtime='nodejs';
export async function GET(_request:NextRequest,{params}:{params:Promise<{cik:string}>}){
 const {cik}=await params;
 if(!/^\d{10}$/.test(cik))return NextResponse.json({error:'Invalid SEC CIK'},{status:400});
 if(!process.env.SEC_USER_AGENT)return NextResponse.json({error:'SEC connector is not configured.'},{status:503});
 try{
  const facts=await getSecFinancialHighlights(cik);
  return NextResponse.json({cik,facts,source:'SEC XBRL companyfacts: official issuer-reported financial data',marketCap:null,marketPrice:null,warning:'Values are from individual reported filing periods. No current market prices or independently verified valuations are implied.'},{headers:{'Cache-Control':'public,max-age=600,stale-while-revalidate=3600'}});
 }catch{return NextResponse.json({error:'Official financial data is temporarily unavailable.'},{status:502});}
}