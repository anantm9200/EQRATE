import {NextResponse} from 'next/server';
import {callDgxEngine} from '@/lib/dgx-gateway';
import {currentIdentity} from '@/lib/session';
import {engineError} from '@/lib/api-guard';
export const runtime='nodejs';
export async function GET(req:Request){
 const me=await currentIdentity(new URL(req.url).searchParams.get('org'));
 if(!me?.org)return NextResponse.json({error:'Sign in required'},{status:401});
 try{return NextResponse.json(await callDgxEngine('/v1/workspace/alerts',{identity:{userId:me.userId,orgId:me.org.orgId},timeoutMs:15000}),{headers:{'Cache-Control':'no-store'}});}
 catch(e){return engineError(e);}
}
