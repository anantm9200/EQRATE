import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
import {callDgxEngine,dgxGatewayConfigured,rateLimited,clientKey} from '@/lib/dgx-gateway';
export const runtime='nodejs';
export const maxDuration=60;
function authorized(header:string,secret:string){
 const provided=header.replace(/^Bearer\s+/i,'');
 const a=Buffer.from(provided),b=Buffer.from(secret);
 return Boolean(secret&&provided&&a.length===b.length&&timingSafeEqual(a,b));
}
/** Analyst-only free-form question. Every model call runs on the private DGX engine (audited there). */
export async function POST(req:NextRequest){
 if(!authorized(req.headers.get('authorization')||'',process.env.CREQOR_ANALYST_ACCESS_TOKEN||''))
  return NextResponse.json({error:'Valid analyst access key required.'},{status:401});
 if(rateLimited(clientKey(req.headers,'analyst-ask'),12,900000))
  return NextResponse.json({error:'Request limit reached. Try again later.'},{status:429});
 if(!dgxGatewayConfigured())return NextResponse.json({error:'Private DGX intelligence engine is not connected.'},{status:503});
 let question='',evidence='';
 try{
  const raw=await req.text();
  if(raw.length>40000)return NextResponse.json({error:'Request too large.'},{status:413});
  const body=JSON.parse(raw) as unknown;
  if(!body||typeof body!=='object'||Array.isArray(body))return NextResponse.json({error:'Invalid request.'},{status:400});
  const b=body as {question?:unknown;evidence?:unknown};
  if(b.evidence!==undefined&&b.evidence!==null&&typeof b.evidence!=='string')return NextResponse.json({error:'Evidence must be text.'},{status:400});
  question=typeof b.question==='string'?b.question.trim():'';
  evidence=typeof b.evidence==='string'?b.evidence.trim():'';
 }catch{return NextResponse.json({error:'Invalid JSON.'},{status:400});}
 if(question.length<5||question.length>2000)return NextResponse.json({error:'Question must be 5-2000 characters.'},{status:400});
 if(evidence.length>12000)return NextResponse.json({error:'Evidence must be at most 12,000 characters.'},{status:400});
 try{
  const result=await callDgxEngine<Record<string,unknown>>('/v1/ask',{method:'POST',body:evidence?{question,evidence}:{question},timeoutMs:55000});
  return NextResponse.json({...result,modelSource:'Private DGX engine'},{headers:{'Cache-Control':'no-store'}});
 }catch(e){
  const status=(e as {status?:number}).status;
  if(status===400)return NextResponse.json({error:'The engine rejected the question or evidence.'},{status:400});
  return NextResponse.json({error:'Private intelligence engine unavailable. No response was fabricated.'},{status:503});
 }
}
