import {NextResponse} from 'next/server';
import {engineIdentityStatus} from '@/lib/identity-directory';
export const runtime='nodejs';
// Official GLEIF publication metadata (publish date, official record count) comes from the
// private engine's record of the latest complete Golden Copy import (cq_bulk_source_runs);
// the website no longer fetches GLEIF metadata itself.
export async function GET(){
 const engine=await engineIdentityStatus();
 const publication=engine?.goldenCopy??null;
 const counts=engine?.counts;
 // The private index counts only when it reports a stored total; it is never estimated.
 const engineIndexed=typeof counts?.leiEntities==='number'&&counts.leiEntities>0?counts.leiEntities:null;
 return NextResponse.json({
  source:'GLEIF',referenceRecords:publication?.officialRecords??null,
  asOf:publication?.publishDate??null,sourceUrl:'https://www.gleif.org/en/lei-data/gleif-golden-copy/download-the-golden-copy',
  locallyIndexed:engineIndexed??0,
  locallyIndexedOperational:engineIndexed!==null,
  indexLocation:engineIndexed!==null?'private-engine':null,
  indiaIndexed:typeof counts?.indiaEntities==='number'?counts.indiaEntities:null,
  note:'Public GLEIF coverage is NOT the number of companies already indexed in CREQOR. An LEI is not a listed-security identifier or valuation.'
 },{headers:{'Cache-Control':engine?'public,s-maxage=1800,stale-while-revalidate=3600':'no-store'}});
}
