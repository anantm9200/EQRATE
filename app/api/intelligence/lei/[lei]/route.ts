import {NextRequest,NextResponse} from 'next/server';
import {getLEI} from '@/lib/gleif';
import {analyseLEI} from '@/lib/intelligence-engine';
export const runtime='nodejs';
export async function GET(_request:NextRequest,{params}:{params:Promise<{lei:string}>}){
 const {lei}=await params;
 if(!/^[A-Z0-9]{20}$/i.test(lei))return NextResponse.json({error:'A valid 20-character LEI is required.'},{status:400,headers:{'Cache-Control':'no-store'}});
 try{
  const entity=await getLEI(lei);
  if(!entity)return NextResponse.json({error:'The legal-entity record could not be found.'},{status:404});
  const report=analyseLEI(entity);
  return NextResponse.json(report,{headers:{'Cache-Control':'public,s-maxage=300,stale-while-revalidate=600'}});
 }catch{
  return NextResponse.json({error:'The GLEIF intelligence source is temporarily unavailable. No signals were manufactured.'},{status:503,headers:{'Cache-Control':'no-store'}});
 }
}
