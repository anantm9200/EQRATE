import {NextRequest,NextResponse} from 'next/server';
import {callDgxEngine,dgxGatewayConfigured,rateLimited,clientKey} from '@/lib/dgx-gateway';
export const runtime='nodejs';
/** Public filtered listing of Indian legal entities (official GLEIF records, decoded identifiers). */
export async function GET(req:NextRequest){
 const sp=req.nextUrl.searchParams;
 const q=(sp.get('q')||'').trim(),region=(sp.get('region')||'').toUpperCase(),cls=(sp.get('class')||'').toUpperCase();
 const listing=(sp.get('listing')||'').toUpperCase(),status=(sp.get('status')||'').toUpperCase(),page=sp.get('page')||'1';
 if((q&&(q.length<2||q.length>90))||(region&&!/^[A-Z]{2}$/.test(region))||(cls&&!/^[A-Z]{3}$/.test(cls))||
  (listing&&!/^[LU]$/.test(listing))||(status&&!/^[A-Z_]{3,30}$/.test(status))||!/^\d{1,3}$/.test(page)||Number(page)<1||Number(page)>200)
  return NextResponse.json({error:'Invalid filters.'},{status:400});
 if(!dgxGatewayConfigured())return NextResponse.json({error:'Private index not connected.'},{status:503});
 if(rateLimited(clientKey(req.headers,'india'),60))return NextResponse.json({error:'Rate limit exceeded.'},{status:429});
 try{
  const data=await callDgxEngine<Record<string,unknown>>('/v1/india/entities',{timeoutMs:12000,
   params:{q,region,class:cls,listing,status,page}});
  return NextResponse.json(data,{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'India index unavailable.'},{status:503});}
}
