import {NextRequest,NextResponse} from 'next/server';
import {callDgxEngine,dgxGatewayConfigured,rateLimited,clientKey} from '@/lib/dgx-gateway';
export const runtime='nodejs';
/** Two-company comparison from reviewed annual-report financials on the DGX (`POST {leis:[a,b],asOf?}`). */
export async function POST(req:NextRequest){
 const body=await req.json().catch(()=>null) as {leis?:unknown;asOf?:unknown}|null;
 const leis=Array.isArray(body?.leis)?(body!.leis as unknown[]).map(x=>typeof x==='string'?x.toUpperCase():''):[];
 if(leis.length!==2||!leis.every(x=>/^[A-Z0-9]{20}$/.test(x)))return NextResponse.json({error:'Provide exactly two valid LEIs.'},{status:400});
 if(leis[0]===leis[1])return NextResponse.json({error:'Choose two different companies.'},{status:400});
 const asOf=body?.asOf;
 if(asOf!==undefined&&asOf!==null&&asOf!==''&&(typeof asOf!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(asOf)))
  return NextResponse.json({error:'asOf must be YYYY-MM-DD.'},{status:400});
 if(!dgxGatewayConfigured())return NextResponse.json({error:'Private index not connected.'},{status:503});
 if(rateLimited(clientKey(req.headers,'compare'),20))return NextResponse.json({error:'Rate limit exceeded.'},{status:429});
 try{
  return NextResponse.json(await callDgxEngine('/v1/compare',{method:'POST',body:{leis,...(asOf?{asOf}:{})},timeoutMs:20000}),{headers:{'Cache-Control':'no-store'}});
 }catch(e){
  const status=(e as {status?:number}).status;
  if(status===404)return NextResponse.json({error:'One of these LEIs is not in the private index.'},{status:404});
  if(status===400)return NextResponse.json({error:'Invalid comparison request.'},{status:400});
  return NextResponse.json({error:'Comparison unavailable.'},{status:503});
 }
}
