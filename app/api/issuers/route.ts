import {NextRequest,NextResponse} from 'next/server';
import {listIndexedSecIssuers,secIssuerIndexStatus} from '@/lib/sec-public-issuers';
export const runtime='nodejs';
export async function GET(req:NextRequest){
 const status=await secIssuerIndexStatus();
 if(status.status!=='ready')return NextResponse.json({error:'SEC issuer index is not yet connected. A dedicated PostgreSQL database and official SEC import are required.',
  source:'SEC',count:0,ready:false},{status:503,headers:{'Cache-Control':'no-store'}});
 const p=req.nextUrl.searchParams;
 const pageRaw=p.get('page')||'1';
 if(!/^\d{1,4}$/.test(pageRaw)||Number(pageRaw)<1||Number(pageRaw)>2000)
  return NextResponse.json({error:'Invalid page.'},{status:400});
 try{
  const data=await listIndexedSecIssuers({q:p.get('q')||'',exchange:p.get('exchange')||'',
   page:Number(pageRaw)});
  return NextResponse.json({...data,provenance:'SEC company_tickers_exchange.json',
   caveat:'Ticker associations are not live market prices, independently verified corporate LEIs, or valuation ratings.'},
  {headers:{'Cache-Control':'public,s-maxage=120,stale-while-revalidate=3600'}});
 }catch(e){
  const invalid=e instanceof Error&&e.message==='SEC_ISSUER_INVALID_FILTER';
  return NextResponse.json({error:invalid?'Invalid ticker/name search or exchange filter.':'The indexed SEC issuer source is currently unavailable.'},
   {status:invalid?400:503,headers:{'Cache-Control':'no-store'}});
 }
}
