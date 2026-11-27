import {NextResponse} from 'next/server';
import {callDgxEngine} from '@/lib/dgx-gateway';
import {currentIdentity} from '@/lib/session';
import {engineError} from '@/lib/api-guard';
export const runtime='nodejs';
export async function GET(){
 const me=await currentIdentity();if(!me)return NextResponse.json({error:'Sign in required'},{status:401});
 try{
  const data=await callDgxEngine('/v1/account/export',{identity:{userId:me.userId},timeoutMs:20000});
  return new NextResponse(JSON.stringify(data,null,1),{headers:{'Content-Type':'application/json',
   'Content-Disposition':'attachment; filename="creqor-account-export.json"','Cache-Control':'no-store'}});
 }catch(e){return engineError(e);}
}
