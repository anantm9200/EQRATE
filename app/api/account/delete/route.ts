import {NextResponse} from 'next/server';
import {callDgxEngine} from '@/lib/dgx-gateway';
import {currentIdentity} from '@/lib/session';
import {sameOriginJson,engineError} from '@/lib/api-guard';
import {signOut} from '@/auth';
export const runtime='nodejs';
export async function POST(req:Request){
 const refused=sameOriginJson(req);if(refused)return refused;
 const me=await currentIdentity();if(!me)return NextResponse.json({error:'Sign in required'},{status:401});
 const body=await req.json().catch(()=>null) as {password?:unknown}|null;
 try{
  await callDgxEngine('/v1/account/delete',{method:'POST',identity:{userId:me.userId},body:{password:body?.password},timeoutMs:15000});
 }catch(e){return engineError(e);}
 await signOut({redirect:false});
 return NextResponse.json({deleted:true});
}
