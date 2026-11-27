import {NextResponse} from 'next/server';
import {callDgxEngine} from '@/lib/dgx-gateway';
import {currentIdentity} from '@/lib/session';
import {sameOriginJson,engineError} from '@/lib/api-guard';
export const runtime='nodejs';
export async function GET(req:Request){
 const url=new URL(req.url);
 const me=await currentIdentity(url.searchParams.get('org'));
 if(!me?.org)return NextResponse.json({error:'Sign in required'},{status:401});
 const kind=url.searchParams.get('kind')||undefined;
 try{
  const data=await callDgxEngine<{items:unknown[]}>('/v1/workspace/items',{identity:{userId:me.userId,orgId:me.org.orgId},params:kind?{kind}:undefined});
  return NextResponse.json({org:me.org,...data},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return engineError(e);}
}
export async function POST(req:Request){
 const refused=sameOriginJson(req);if(refused)return refused;
 const me=await currentIdentity(new URL(req.url).searchParams.get('org'));
 if(!me?.org)return NextResponse.json({error:'Sign in required'},{status:401});
 const body=await req.json().catch(()=>null);
 if(!body||typeof body!=='object')return NextResponse.json({error:'Invalid request'},{status:400});
 try{return NextResponse.json(await callDgxEngine('/v1/workspace/items',{method:'POST',identity:{userId:me.userId,orgId:me.org.orgId},body,timeoutMs:15000}),{status:201});}
 catch(e){return engineError(e);}
}
