import {NextRequest,NextResponse} from 'next/server';
import {getSecCompany} from '@/lib/sec';
import {getSecIntelligence} from '@/lib/sec-intelligence';
export const runtime='nodejs';
export async function GET(_request:NextRequest,{params}:{params:Promise<{cik:string}>}){
 const {cik}=await params;
 if(!/^\d{10}$/.test(cik))return NextResponse.json({error:'A valid 10-digit SEC CIK is required.'},{status:400,headers:{'Cache-Control':'no-store'}});
 if(!process.env.SEC_USER_AGENT)return NextResponse.json({error:'The SEC data connector is not configured for this deployment. Set SEC_USER_AGENT to a compliant public contact identity to enable official US issuer intelligence.'},{status:503,headers:{'Cache-Control':'no-store'}});
 try{
  const subject=await getSecCompany(cik);
  if(!subject)return NextResponse.json({error:'Official SEC issuer identity could not be retrieved.'},{status:404,headers:{'Cache-Control':'no-store'}});
  const report=await getSecIntelligence(cik,subject);
  return NextResponse.json(report,{headers:{'Cache-Control':'public,s-maxage=300,stale-while-revalidate=900'}});
 }catch{
  return NextResponse.json({error:'Official SEC intelligence is temporarily unavailable. No financial claims were generated.'},{status:503,headers:{'Cache-Control':'no-store'}});
 }
}
