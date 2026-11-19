import {NextRequest,NextResponse} from 'next/server';
import {callDgxEngine,dgxGatewayConfigured,rateLimited,clientKey} from '@/lib/dgx-gateway';
export const runtime='nodejs';
/** Public read-only view of one indexed LEI: source record, provenance, versions and deterministic identity leads. */
export async function GET(req:NextRequest,{params}:{params:Promise<{lei:string}>}){
 const lei=(await params).lei.toUpperCase();
 if(!/^[A-Z0-9]{20}$/.test(lei))return NextResponse.json({error:'A valid 20-character LEI is required.'},{status:400});
 if(!dgxGatewayConfigured())return NextResponse.json({error:'Private index not connected.'},{status:503});
 if(rateLimited(clientKey(req.headers,'lei'),60))return NextResponse.json({error:'Rate limit exceeded.'},{status:429});
 try{
  const detail=await callDgxEngine<Record<string,unknown>>('/v1/lei/'+lei,{timeoutMs:12000});
  return NextResponse.json(detail,{headers:{'Cache-Control':'no-store'}});
 }catch(e){
  const status=(e as {status?:number}).status===404?404:503;
  return NextResponse.json({error:status===404?'This LEI is not in the private index yet. Use the live GLEIF record.':'Private index unavailable.'},
   {status,headers:{'Cache-Control':'no-store'}});
 }
}
