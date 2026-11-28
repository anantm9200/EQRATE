import {NextResponse} from 'next/server';
import {engineCatalogueStatus} from '@/lib/engine-catalogue';
export const runtime='nodejs';
export async function GET(){
 const status=await engineCatalogueStatus();
 return NextResponse.json({...status,source:'GLEIF',verifiedFinancialStatements:false,
  licensedMarketData:false,creditRatings:false},{headers:{'Cache-Control':'no-store'}});
}
