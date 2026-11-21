import {NextResponse} from 'next/server';
import {fetchGoldenCopyMetadata} from '@/lib/public-records-coverage';
import {catalogueStatus} from '@/lib/catalogue-store';
import {callDgxEngine,dgxGatewayConfigured} from '@/lib/dgx-gateway';
export const runtime='nodejs';
type EngineStatus={counts?:{leiEntities?:number;indiaEntities?:number}};
export async function GET(){
 const [source,indexed,engine]=await Promise.allSettled([
  fetchGoldenCopyMetadata(),catalogueStatus(),
  dgxGatewayConfigured()?callDgxEngine<EngineStatus>('/v1/status',{timeoutMs:8000}):Promise.reject(new Error('DGX_ENGINE_NOT_CONNECTED'))]);
 const metadata=source.status==='fulfilled'?source.value:null;
 const local=indexed.status==='fulfilled'?indexed.value:null;
 // The private DGX index counts only when it reports a stored total; it is never estimated.
 const counts=engine.status==='fulfilled'?engine.value.counts:undefined;
 const engineIndexed=typeof counts?.leiEntities==='number'&&counts.leiEntities>0?counts.leiEntities:null;
 const localReady=local?.status==='ready';
 return NextResponse.json({
  source:'GLEIF',referenceRecords:metadata?.recordCount??null,
  asOf:metadata?.publishDate??null,sourceUrl:'https://www.gleif.org/en/lei-data/gleif-golden-copy/download-the-golden-copy',
  locallyIndexed:localReady?local.indexed:engineIndexed??0,
  locallyIndexedOperational:localReady||engineIndexed!==null,
  indexLocation:localReady?'catalogue':engineIndexed!==null?'private-engine':null,
  indiaIndexed:!localReady&&typeof counts?.indiaEntities==='number'?counts.indiaEntities:null,
  note:'Public GLEIF coverage is NOT the number of companies already indexed in CREQOR. An LEI is not a listed-security identifier or valuation.'
 },{headers:{'Cache-Control':'public,s-maxage=1800,stale-while-revalidate=3600'}});
}
