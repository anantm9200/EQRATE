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
/** Analyst-only: source-grounded identity research with optional local-model interpretation (audited on the DGX). */
export async function POST(req:NextRequest,{params}:{params:Promise<{lei:string}>}){
 if(!authorized(req.headers.get('authorization')||'',process.env.CREQOR_ANALYST_ACCESS_TOKEN||''))
  return NextResponse.json({error:'Analyst authorization required.'},{status:401});
 const lei=(await params).lei.toUpperCase();
 if(!/^[A-Z0-9]{20}$/.test(lei))return NextResponse.json({error:'A valid LEI is required.'},{status:400});
 if(!dgxGatewayConfigured())return NextResponse.json({error:'Private DGX intelligence engine is not connected.'},{status:503});
 let question='';
 try{const raw=await req.text();if(raw.length>4000)return NextResponse.json({error:'Request too large.'},{status:413});
  const body=JSON.parse(raw) as {question?:unknown};question=typeof body.question==='string'?body.question.trim():'';}
 catch{return NextResponse.json({error:'Invalid JSON.'},{status:400});}
 if(question.length<5||question.length>1000)return NextResponse.json({error:'Question must be 5-1000 characters.'},{status:400});
 try{
  const result=await callDgxEngine<Record<string,unknown>>('/v1/lei/'+lei+'/research',{method:'POST',body:{question},timeoutMs:55000});
  return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
 }catch(e){
  const status=(e as {status?:number}).status===404?404:503;
  return NextResponse.json({error:status===404?'LEI not in the private index.':'Research engine unavailable. No response was fabricated.'},{status});
 }
}
