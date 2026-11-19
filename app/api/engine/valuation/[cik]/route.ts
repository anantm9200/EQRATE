import {NextRequest,NextResponse} from 'next/server';
import {callDgxEngine,dgxGatewayConfigured,rateLimited,clientKey} from '@/lib/dgx-gateway';
export const runtime='nodejs';
/** Deterministic analyst scenarios over stored SEC inputs. Assumptions must be explicit; nothing is defaulted. */
export async function POST(req:NextRequest,{params}:{params:Promise<{cik:string}>}){
 const raw=(await params).cik;
 if(!/^\d{1,10}$/.test(raw)||Number(raw)<1)return NextResponse.json({error:'A valid SEC CIK is required.'},{status:400});
 if(!dgxGatewayConfigured())return NextResponse.json({error:'Private index not connected.'},{status:503});
 if(rateLimited(clientKey(req.headers,'val'),20))return NextResponse.json({error:'Rate limit exceeded.'},{status:429});
 let body:unknown;
 try{const text=await req.text();if(text.length>6000)return NextResponse.json({error:'Request too large.'},{status:413});body=JSON.parse(text);}
 catch{return NextResponse.json({error:'Invalid JSON.'},{status:400});}
 if(!body||typeof body!=='object'||Array.isArray(body))return NextResponse.json({error:'Invalid valuation request.'},{status:400});
 try{
  const data=await callDgxEngine<Record<string,unknown>>('/v1/valuation/'+Number(raw),{method:'POST',body:body as object,timeoutMs:15000});
  return NextResponse.json(data,{headers:{'Cache-Control':'no-store'}});
 }catch(e){
  const status=(e as {status?:number}).status===400?400:503;
  return NextResponse.json({error:status===400?'Assumptions or source inputs are invalid or missing.':'Valuation engine unavailable.'},{status});
 }
}
