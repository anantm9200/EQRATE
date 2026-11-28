import {NextRequest,NextResponse} from 'next/server';
import {callDgxEngine,dgxGatewayConfigured,rateLimited,clientKey} from '@/lib/dgx-gateway';

/** Browser-supplied intelligence inputs: same ceiling the DGX engine enforces. */
export const INTELLIGENCE_BODY_LIMIT=250_000;
export const ENGINE_UNREACHABLE='The private CREQOR engine is unreachable, so it could not compute this result. Tools fall back to an in-browser calculation that is labelled as such.';
const noStore={'Cache-Control':'no-store'};

/**
 * Website half of a deterministic intelligence route: rate limit, size and JSON checks,
 * then forward to the DGX engine. The website never computes the result itself.
 */
export async function proxyIntelligence(req:NextRequest,enginePath:'/v1/intelligence/assessment'|'/v1/intelligence/forensic'|'/v1/intelligence/portfolio'|'/v1/valuation/dcf',scope:string){
 if(rateLimited(clientKey(req.headers,scope),120))
  return NextResponse.json({error:'Rate limit exceeded; retry shortly.'},{status:429,headers:noStore});
 let body:unknown;
 try{
  const text=await req.text();
  if(text.length>INTELLIGENCE_BODY_LIMIT)return NextResponse.json({error:'Request too large for the engine (250 KB maximum).'},{status:413,headers:noStore});
  body=JSON.parse(text);
 }catch{return NextResponse.json({error:'Invalid JSON.'},{status:400,headers:noStore});}
 if(!body||typeof body!=='object'||Array.isArray(body))
  return NextResponse.json({error:'Request body must be a JSON object.'},{status:400,headers:noStore});
 if(!dgxGatewayConfigured())return NextResponse.json({error:ENGINE_UNREACHABLE,engine:'unreachable'},{status:503,headers:noStore});
 try{
  const data=await callDgxEngine<Record<string,unknown>>(enginePath,{method:'POST',body:body as object,timeoutMs:10000});
  if(data?.computedBy!=='creqor-dgx-engine')throw new Error('DGX_ENGINE_UNEXPECTED_RESPONSE');
  return NextResponse.json(data,{headers:noStore});
 }catch(e){
  const err=e as {status?:number;body?:{error?:unknown;code?:unknown}};
  if(err.status===400||err.status===413){
   const message=typeof err.body?.error==='string'?err.body.error.slice(0,300):'Input rejected by the engine.';
   const code=typeof err.body?.code==='string'?err.body.code.slice(0,80):undefined;
   return NextResponse.json({error:message,code},{status:err.status,headers:noStore});
  }
  return NextResponse.json({error:ENGINE_UNREACHABLE,engine:'unreachable'},{status:503,headers:noStore});
 }
}
