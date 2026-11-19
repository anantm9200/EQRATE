import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
import {callDgxEngine,dgxGatewayConfigured} from '@/lib/dgx-gateway';
export const runtime='nodejs';
export const maxDuration=60;
function authorized(header:string,secret:string){
 const provided=header.replace(/^Bearer\s+/i,'');
 const a=Buffer.from(provided),b=Buffer.from(secret);
 return Boolean(secret&&provided&&a.length===b.length&&timingSafeEqual(a,b));
}
export async function POST(req:NextRequest){
 const token=process.env.CREQOR_ANALYST_ACCESS_TOKEN||'';
 if(!authorized(req.headers.get('authorization')||'',token))
  return NextResponse.json({error:'Analyst authorization required.'},{status:401});
 if(!dgxGatewayConfigured())return NextResponse.json({error:'Private DGX intelligence engine is not connected.'},{status:503});
 let body:unknown;
 try{const raw=await req.text();if(raw.length>8000)return NextResponse.json({error:'Request too large.'},{status:413});
  body=JSON.parse(raw);}catch{return NextResponse.json({error:'Invalid JSON.'},{status:400});}
 if(!body||typeof body!=='object'||Array.isArray(body))return NextResponse.json({error:'Invalid research request.'},{status:400});
 const record=body as Record<string,unknown>;
 const cik=String(record.cik||'');
 const question=typeof record.question==='string'?record.question.trim():'';
 if(!/^\d{1,10}$/.test(cik)||question.length<5||question.length>1000)
  return NextResponse.json({error:'Valid SEC CIK and question required.'},{status:400});
 const assumptions=record.assumptions;
 if(assumptions!==undefined&&(!assumptions||typeof assumptions!=='object'||Array.isArray(assumptions)))
  return NextResponse.json({error:'Invalid model assumptions.'},{status:400});
 try{
  const result=await callDgxEngine<Record<string,unknown>>('/v1/research',{
   method:'POST',body:{cik,question,...(assumptions!==undefined?{assumptions}:{})},timeoutMs:49000});
  return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
 }catch{
  return NextResponse.json({error:'Source-grounded research engine unavailable. No response was fabricated.'},{status:503});
 }
}
