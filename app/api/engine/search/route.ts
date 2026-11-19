import {NextRequest,NextResponse} from 'next/server';
import {callDgxEngine,dgxGatewayConfigured} from '@/lib/dgx-gateway';
export const runtime='nodejs';
const rates=new Map<string,{hits:number;expires:number}>();
export async function GET(req:NextRequest){
 const q=(req.nextUrl.searchParams.get('q')||'').trim();
 const country=(req.nextUrl.searchParams.get('country')||'').toUpperCase();
 const limit=Number(req.nextUrl.searchParams.get('limit')||'30');
 if(q.length<2||q.length>100||country&&!/^[A-Z]{2}$/.test(country)||
  !Number.isSafeInteger(limit)||limit<1||limit>50)
  return NextResponse.json({error:'Use a company query of 2–100 characters, optional ISO country and limit 1–50.'},{status:400});
 if(!dgxGatewayConfigured())return NextResponse.json({
  error:'The private catalogue is not connected; browse the live GLEIF directory instead.'},{status:503});
 const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'anonymous';
 const now=Date.now(),prior=rates.get(ip),next=!prior||prior.expires<now?
  {hits:1,expires:now+60000}:{hits:prior.hits+1,expires:prior.expires};
 rates.set(ip,next);
 if(rates.size>2000)for(const [k,v] of rates)if(v.expires<now)rates.delete(k);
 if(next.hits>30)return NextResponse.json({error:'Search limit exceeded.'},{status:429});
 try{
  const result=await callDgxEngine<Record<string,unknown>>('/v1/search',{
   query:{q,...(country?{country}:{}),limit},timeoutMs:12000
  });
  return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
 }catch{
  return NextResponse.json({error:'Private index unavailable. Try the official GLEIF directory.'},
   {status:503,headers:{'Cache-Control':'no-store'}});
 }
}
