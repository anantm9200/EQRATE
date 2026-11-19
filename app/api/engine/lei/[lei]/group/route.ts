import {NextRequest,NextResponse} from 'next/server';
import {callDgxEngine,dgxGatewayConfigured,rateLimited,clientKey} from '@/lib/dgx-gateway';
export const runtime='nodejs';
/** Public corporate-group view built from official GLEIF relationship records. */
export async function GET(req:NextRequest,{params}:{params:Promise<{lei:string}>}){
 const lei=(await params).lei.toUpperCase();
 if(!/^[A-Z0-9]{20}$/.test(lei))return NextResponse.json({error:'A valid LEI is required.'},{status:400});
 if(!dgxGatewayConfigured())return NextResponse.json({error:'Private index not connected.'},{status:503});
 if(rateLimited(clientKey(req.headers,'group'),30))return NextResponse.json({error:'Rate limit exceeded.'},{status:429});
 try{
  const data=await callDgxEngine<Record<string,unknown>>('/v1/lei/'+lei+'/group',{timeoutMs:15000});
  return NextResponse.json(data,{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'Group data unavailable.'},{status:503});}
}
