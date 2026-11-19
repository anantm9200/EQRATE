import {NextResponse} from 'next/server';
import {callDgxEngine,dgxGatewayConfigured} from '@/lib/dgx-gateway';
export const runtime='nodejs';
/** Public aggregate view of Indian legal entities in the private index (no personal data). */
export async function GET(){
 if(!dgxGatewayConfigured())return NextResponse.json({error:'Private index not connected.'},{status:503});
 try{
  const data=await callDgxEngine<Record<string,unknown>>('/v1/india/overview',{timeoutMs:20000});
  return NextResponse.json(data,{headers:{'Cache-Control':'public, s-maxage=900, stale-while-revalidate=3600'}});
 }catch{return NextResponse.json({error:'India overview unavailable.'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
