import {NextResponse} from 'next/server';
import {callDgxEngine} from '@/lib/dgx-gateway';
import {currentIdentity} from '@/lib/session';
import {sameOriginJson,engineError} from '@/lib/api-guard';
export const runtime='nodejs';
const ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
async function handle(req:Request,id:string,method:'PUT'|'DELETE'){
 const refused=sameOriginJson(req);if(refused)return refused;
 if(!ID.test(id))return NextResponse.json({error:'Invalid item'},{status:400});
 const me=await currentIdentity(new URL(req.url).searchParams.get('org'));
 if(!me?.org)return NextResponse.json({error:'Sign in required'},{status:401});
 const body=method==='PUT'?await req.json().catch(()=>null):undefined;
 if(method==='PUT'&&(!body||typeof body!=='object'))return NextResponse.json({error:'Invalid request'},{status:400});
 try{return NextResponse.json(await callDgxEngine('/v1/workspace/items/'+id,{method,identity:{userId:me.userId,orgId:me.org.orgId},body:body??undefined,timeoutMs:15000}));}
 catch(e){return engineError(e);}
}
export async function PUT(req:Request,{params}:{params:Promise<{id:string}>}){return handle(req,(await params).id,'PUT');}
export async function DELETE(req:Request,{params}:{params:Promise<{id:string}>}){return handle(req,(await params).id,'DELETE');}
