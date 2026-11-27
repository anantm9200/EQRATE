import {NextResponse} from 'next/server';
import {callDgxEngine} from '@/lib/dgx-gateway';
import {currentIdentity} from '@/lib/session';
import {sameOriginJson,engineError} from '@/lib/api-guard';
export const runtime='nodejs';
export async function GET(){
 const me=await currentIdentity();if(!me)return NextResponse.json({error:'Sign in required'},{status:401});
 try{return NextResponse.json(await callDgxEngine('/v1/account/mfa',{identity:{userId:me.userId}}),{headers:{'Cache-Control':'no-store'}});}catch(e){return engineError(e);}
}
export async function POST(req:Request){
 const refused=sameOriginJson(req);if(refused)return refused;
 const me=await currentIdentity();if(!me)return NextResponse.json({error:'Sign in required'},{status:401});
 const body=await req.json().catch(()=>null) as {action?:string;code?:string;password?:string}|null;
 const action=body?.action;
 if(action!=='setup'&&action!=='enable'&&action!=='disable')return NextResponse.json({error:'Unknown action'},{status:400});
 try{
  return NextResponse.json(await callDgxEngine('/v1/account/mfa/'+action,{method:'POST',identity:{userId:me.userId},
   body:action==='enable'?{code:body?.code}:action==='disable'?{password:body?.password}:{},timeoutMs:15000}),{headers:{'Cache-Control':'no-store'}});
 }catch(e){
  if((e as {body?:{code?:string}}).body?.code==='BAD_MFA_CODE')return NextResponse.json({error:'That code did not match. Check the time on your phone and try the next code.'},{status:400});
  return engineError(e);
 }
}
