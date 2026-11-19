import {NextRequest,NextResponse} from 'next/server';
import {callDgxEngine,dgxGatewayConfigured,rateLimited,clientKey} from '@/lib/dgx-gateway';
export const runtime='nodejs';
/** Public read-only stored SEC financial history with deterministic analysis. */
export async function GET(req:NextRequest,{params}:{params:Promise<{cik:string}>}){
 const raw=(await params).cik;
 if(!/^\d{1,10}$/.test(raw)||Number(raw)<1)return NextResponse.json({error:'A valid SEC CIK is required.'},{status:400});
 if(!dgxGatewayConfigured())return NextResponse.json({error:'Private index not connected.'},{status:503});
 if(rateLimited(clientKey(req.headers,'fin'),30))return NextResponse.json({error:'Rate limit exceeded.'},{status:429});
 try{
  const data=await callDgxEngine<Record<string,unknown>>('/v1/financials/'+Number(raw),{timeoutMs:15000});
  return NextResponse.json(data,{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'Private financial store unavailable.'},{status:503});}
}
