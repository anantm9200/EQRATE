import {NextResponse} from 'next/server';
import {callDgxEngine,dgxGatewayConfigured,rateLimited,clientKey} from '@/lib/dgx-gateway';
import {sameOriginJson,engineError} from '@/lib/api-guard';
export const runtime='nodejs';
export async function POST(req:Request){
 const refused=sameOriginJson(req);if(refused)return refused;
 if(!dgxGatewayConfigured())return NextResponse.json({error:'Accounts are not available right now.'},{status:503});
 if(rateLimited(clientKey(req.headers,'register'),5,600000))return NextResponse.json({error:'Too many sign-ups from this network; try later.'},{status:429});
 const body=await req.json().catch(()=>null) as {email?:unknown;password?:unknown;name?:unknown}|null;
 if(!body)return NextResponse.json({error:'Invalid request'},{status:400});
 try{
  await callDgxEngine('/v1/auth/register',{method:'POST',body:{email:body.email,password:body.password,name:body.name},timeoutMs:15000});
  return NextResponse.json({created:true},{status:201});
 }catch(e){
  const code=(e as {body?:{code?:string}}).body?.code;
  if(code==='BAD_PASSWORD_LENGTH')return NextResponse.json({error:'Use a password of at least 12 characters.'},{status:400});
  if(code==='BAD_PASSWORD_WEAK')return NextResponse.json({error:'That password is too easy to guess. Try a longer phrase.'},{status:400});
  if(code==='BAD_EMAIL')return NextResponse.json({error:'Enter a valid email address.'},{status:400});
  return engineError(e);
 }
}
