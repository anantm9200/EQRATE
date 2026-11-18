import {NextResponse} from 'next/server';
import {catalogueStatus} from '@/lib/catalogue-store';
export const runtime='nodejs';
export async function GET(){
 const status=await catalogueStatus();
 return NextResponse.json({...status,source:'GLEIF',verifiedFinancialStatements:false,
  licensedMarketData:false,creditRatings:false},{headers:{'Cache-Control':'no-store'}});
}
