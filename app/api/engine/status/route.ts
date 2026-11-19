import {NextResponse} from 'next/server';
import {callDgxEngine,dgxGatewayConfigured,type DgxStatus} from '@/lib/dgx-gateway';
export const runtime='nodejs';
export async function GET(){
 if(!dgxGatewayConfigured())
  return NextResponse.json({connected:false,status:'not-configured',counts:null,
   note:'CREQOR DGX deployment is prepared but the protected HTTPS gateway is not connected.'},
   {headers:{'Cache-Control':'no-store'}});
 try{
  const status=await callDgxEngine<DgxStatus>('/v1/status',{timeoutMs:9000});
  return NextResponse.json({connected:true,status:'ready',counts:status.counts,
   aiConfigured:status.aiConfigured,
   note:'These are records actually stored on the private DGX PostgreSQL instance, not global source coverage.'},
   {headers:{'Cache-Control':'no-store'}});
 }catch{
  return NextResponse.json({connected:false,status:'unavailable',counts:null,
   note:'The private DGX is not reachable or its database is not ready. Official public-source search remains available.'},
   {headers:{'Cache-Control':'no-store'}});
 }
}
