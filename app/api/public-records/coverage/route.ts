import {NextResponse} from 'next/server';
import {fetchGoldenCopyMetadata} from '@/lib/public-records-coverage';
import {catalogueStatus} from '@/lib/catalogue-store';
export const runtime='nodejs';
export async function GET(){
 const [source,indexed]=await Promise.allSettled([fetchGoldenCopyMetadata(),catalogueStatus()]);
 const metadata=source.status==='fulfilled'?source.value:null;
 const local=indexed.status==='fulfilled'?indexed.value:null;
 return NextResponse.json({
  source:'GLEIF',referenceRecords:metadata?.recordCount??null,
  asOf:metadata?.publishDate??null,sourceUrl:'https://www.gleif.org/en/lei-data/gleif-golden-copy/download-the-golden-copy',
  locallyIndexed:local?.status==='ready'?local.indexed:0,
  locallyIndexedOperational:local?.status==='ready',
  note:'Public GLEIF coverage is NOT the number of companies already indexed in CREQOR. An LEI is not a listed-security identifier or valuation.'
 },{headers:{'Cache-Control':'public,s-maxage=1800,stale-while-revalidate=3600'}});
}
