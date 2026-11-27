import {NextRequest,NextResponse} from 'next/server';
import {callDgxEngine,dgxGatewayConfigured,rateLimited,clientKey} from '@/lib/dgx-gateway';
export const runtime='nodejs';
/** Reviewed financial statements, ratios, screens and confidence, point in time (`asOf=YYYY-MM-DD`). */
export async function GET(req:NextRequest,{params}:{params:Promise<{lei:string}>}){
 const lei=(await params).lei.toUpperCase();
 if(!/^[A-Z0-9]{20}$/.test(lei))return NextResponse.json({error:'A valid LEI is required.'},{status:400});
 const asOf=req.nextUrl.searchParams.get('asOf');
 if(asOf&&!/^\d{4}-\d{2}-\d{2}$/.test(asOf))return NextResponse.json({error:'asOf must be YYYY-MM-DD.'},{status:400});
 if(!dgxGatewayConfigured())return NextResponse.json({error:'Private index not connected.'},{status:503});
 if(rateLimited(clientKey(req.headers,'financials'),30))return NextResponse.json({error:'Rate limit exceeded.'},{status:429});
 try{
  return NextResponse.json(await callDgxEngine('/v1/lei/'+lei+'/financials',{params:asOf?{asOf}:undefined,timeoutMs:15000}),{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'Financial data unavailable.'},{status:503});}
}
