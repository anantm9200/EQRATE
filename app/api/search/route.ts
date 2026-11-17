import { NextRequest,NextResponse } from 'next/server';
import { getSecEntities } from '@/lib/sec';
export const runtime='nodejs';
export async function GET(request:NextRequest){
  const q=(request.nextUrl.searchParams.get('q')||'').trim().slice(0,80);
  if(q.length<2) return NextResponse.json({results:[],message:'Type at least two characters.'});
  try{
    const all=await getSecEntities();
    const needle=q.toLowerCase();
    const results=all.filter(x=>x.name.toLowerCase().includes(needle)||x.ticker.toLowerCase().startsWith(needle)||x.cik.includes(needle))
      .sort((a,b)=>Number(b.ticker.toLowerCase()===needle)-Number(a.ticker.toLowerCase()===needle)||
        Number(b.name.toLowerCase().startsWith(needle))-Number(a.name.toLowerCase().startsWith(needle)))
      .slice(0,12);
    return NextResponse.json({results,source:'US Securities and Exchange Commission',market:'US',note:'Entity data, not market prices.'},{headers:{'Cache-Control':'public,max-age=120,stale-while-revalidate=300'}});
  }catch(e){
    const issue=e instanceof Error?e.message:'UNKNOWN';
    return NextResponse.json({results:[],code:issue==='SEC_NOT_CONFIGURED'?'REGISTRY_NOT_CONFIGURED':'REGISTRY_UNAVAILABLE',message:issue==='SEC_NOT_CONFIGURED'?'CREQOR’s SEC search connection has not been configured yet.':'The official US registry is temporarily unavailable.'},{status:503});
  }
}