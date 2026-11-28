import test from 'node:test';
import assert from 'node:assert/strict';
import {callDgxEngine,dgxEndpoint} from '../lib/dgx-gateway';
import {directoryFilters,loadDirectory,loadIndexedDirectory,loadLeiRecord,engineLei,searchEntities,loadFeatured,
 LIVE_FALLBACK_NOTE,LIVE_DIRECTORY_MAX_PAGE} from '../lib/identity-directory';

const LEI='5493001KJTIIGC8Y1R12';
const entity={lei:LEI,name:'EXAMPLE INDUSTRIES LIMITED',country:'IN',jurisdiction:'IN',status:'ACTIVE',registrationStatus:'ISSUED',
 lastUpdate:'2026-11-01',nextRenewal:'2027-11-01',registeredAs:'',category:'GENERAL',address:'',headquarters:'',
 sourceUrl:'https://search.gleif.org/#/record/'+LEI};
const gleifRecord={id:LEI,attributes:{lei:LEI,entity:{legalName:{name:'EXAMPLE INDUSTRIES LIMITED'},status:'ACTIVE',
 legalAddress:{country:'IN'},jurisdiction:'IN'},registration:{status:'ISSUED',lastUpdateDate:'2026-11-01'}}};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});

/** Runs fn with the DGX gateway configured (or not) and fetch replaced by a recorder. */
async function withEngine(configured:boolean,handler:(url:URL)=>Response|Promise<Response>,fn:(calls:URL[])=>Promise<void>){
 const old={fetch:globalThis.fetch,url:process.env.DGX_ENGINE_HTTPS_URL,token:process.env.DGX_ENGINE_TOKEN};
 const calls:URL[]=[];
 if(configured){process.env.DGX_ENGINE_HTTPS_URL='https://gw.example.com/';process.env.DGX_ENGINE_TOKEN='t'.repeat(40);}
 else{delete process.env.DGX_ENGINE_HTTPS_URL;delete process.env.DGX_ENGINE_TOKEN;}
 globalThis.fetch=(async(input:RequestInfo|URL)=>{const u=new URL(String(input));calls.push(u);return handler(u);}) as typeof fetch;
 try{await fn(calls);}
 finally{
  globalThis.fetch=old.fetch;
  if(old.url===undefined)delete process.env.DGX_ENGINE_HTTPS_URL;else process.env.DGX_ENGINE_HTTPS_URL=old.url;
  if(old.token===undefined)delete process.env.DGX_ENGINE_TOKEN;else process.env.DGX_ENGINE_TOKEN=old.token;
 }
}
const isEngine=(u:URL)=>u.hostname==='gw.example.com';
const isGleif=(u:URL)=>u.hostname==='api.gleif.org';

test('directory filters are validated before anything is sent upstream',()=>{
 assert.deepEqual(directoryFilters({q:' Tata ',country:'in',page:'3'}),{q:'Tata',country:'IN',page:3});
 for(const bad of [{page:'0'},{page:'201'},{page:'2.5'},{page:'abc'},{q:'x'},{q:'y'.repeat(91)},{country:'USA'},{country:'1A'}])
  assert.throws(()=>directoryFilters(bad),/INVALID_/,JSON.stringify(bad));
 assert.equal(directoryFilters({page:'200'}).page,200);
});
test('gateway allow-lists the identity routes and only their directory parameters',async()=>{
 assert.equal(dgxEndpoint('/v1/directory','https://gw.example.com/').pathname,'/v1/directory');
 assert.equal(dgxEndpoint('/v1/featured','https://gw.example.com/').pathname,'/v1/featured');
 await withEngine(true,()=>json({}),async()=>{
  await assert.rejects(()=>callDgxEngine('/v1/directory',{params:{region:'MH'}}),/DGX_QUERY_NOT_ALLOWED/);
  await assert.rejects(()=>callDgxEngine('/v1/india/entities',{params:{country:'IN'}}),/DGX_QUERY_NOT_ALLOWED/);
  await assert.rejects(()=>callDgxEngine('/v1/status',{params:{q:'x'}}),/DGX_QUERY_NOT_ALLOWED/);
 });
});
test('directory is served from the private index when the engine answers; live GLEIF is not called',async()=>{
 const page={results:[entity],total:1,page:2,pageSize:60,hasMore:false,published:'2026-11-27',source:'GLEIF',notice:'n',maxPage:200};
 await withEngine(true,()=>json(page),async calls=>{
  const r=await loadDirectory({q:'Example',country:'IN',page:2});
  assert.equal(r.origin,'private-index');
  assert.equal(r.results[0].lei,LEI);
  assert.equal(calls.length,1);
  assert.equal(calls[0].pathname,'/v1/directory');
  assert.equal(calls[0].searchParams.get('q'),'Example');
  assert.equal(calls[0].searchParams.get('country'),'IN');
  assert.equal(calls[0].searchParams.get('page'),'2');
  assert.equal(calls.some(isGleif),false);
 });
});
test('live GLEIF is used only when the engine is unreachable, and the page is labelled',async()=>{
 await withEngine(true,u=>isEngine(u)?json({error:'down'},503):json({data:[gleifRecord],meta:{pagination:{total:1}}}),async calls=>{
  const r=await loadDirectory({q:'',country:'IN',page:1});
  assert.equal(r.origin,'live-gleif-fallback');
  assert.ok(r.notice.startsWith(LIVE_FALLBACK_NOTE));
  assert.equal(r.maxPage,LIVE_DIRECTORY_MAX_PAGE);
  assert.deepEqual(calls.map(u=>u.hostname),['gw.example.com','api.gleif.org']);
 });
 await withEngine(true,u=>isEngine(u)?json({error:'down'},503):json({data:[]}),async calls=>{
  await assert.rejects(()=>loadDirectory({q:'',country:'',page:LIVE_DIRECTORY_MAX_PAGE+1}),/LIVE_PAGE_OUT_OF_RANGE/);
  assert.equal(calls.some(isGleif),false,'never asks GLEIF for a page it cannot serve');
 });
 await withEngine(false,()=>json({data:[gleifRecord]}),async calls=>{
  assert.equal((await loadDirectory({q:'',country:'',page:1})).origin,'live-gleif-fallback');
  assert.equal(calls.every(isGleif),true);
 });
});
test('a rejected request is not masked by a live fallback, and the indexed catalogue never falls back',async()=>{
 await withEngine(true,u=>isEngine(u)?json({error:'Invalid'},400):json({data:[gleifRecord]}),async calls=>{
  await assert.rejects(()=>loadDirectory({q:'Ex',country:'',page:1}),/DGX_ENGINE_UPSTREAM_400/);
  assert.equal(calls.some(isGleif),false);
 });
 await withEngine(true,u=>isEngine(u)?json({error:'down'},503):json({data:[gleifRecord]}),async calls=>{
  await assert.rejects(()=>loadIndexedDirectory({q:'',country:'',page:1}),/DGX_ENGINE_UPSTREAM_503/);
  assert.equal(calls.some(isGleif),false);
 });
});
test('LEI records: engine first, a 404 is reported as not indexed, live only when unreachable',async()=>{
 await withEngine(true,()=>json({entity}),async calls=>{
  assert.deepEqual(await loadLeiRecord(LEI),{record:entity,origin:'private-index'});
  assert.equal(calls.some(isGleif),false);
 });
 await withEngine(true,u=>isEngine(u)?json({error:'LEI not in the private index'},404):json({data:gleifRecord}),async calls=>{
  assert.deepEqual(await engineLei(LEI),{kind:'missing'});
  assert.deepEqual(await loadLeiRecord(LEI),{record:null,origin:'private-index'});
  assert.equal(calls.some(isGleif),false);
 });
 await withEngine(true,u=>isEngine(u)?json({error:'down'},502):json({data:gleifRecord}),async()=>{
  assert.deepEqual(await engineLei(LEI),{kind:'unreachable'});
  const r=await loadLeiRecord(LEI);
  assert.equal(r.origin,'live-gleif-fallback');
  assert.equal(r.record?.lei,LEI);
 });
});
test('entity search maps only GLEIF identities from the engine and never invents fields',async()=>{
 const records=[{source:'GLEIF',identifier:LEI,name:'EXAMPLE INDUSTRIES LIMITED',country:'IN',status:'ISSUED',sourceUrl:entity.sourceUrl,matchType:'prefix'},
  {source:'SEC',identifier:'0000320193',name:'EXAMPLE INC',country:'US',sourceUrl:'https://www.sec.gov/',matchType:'prefix'}];
 await withEngine(true,()=>json({records}),async calls=>{
  const r=await searchEntities('Example');
  assert.equal(r.origin,'private-index');
  assert.equal(r.results.length,1);
  assert.equal(r.results[0].lei,LEI);
  assert.equal(r.results[0].registrationStatus,'ISSUED');
  assert.equal(r.results[0].address,'');
  assert.equal(calls[0].pathname,'/v1/search');
  assert.equal(calls[0].searchParams.get('limit'),'12');
 });
});
test('featured entities come from the engine with their response shape',async()=>{
 const card={lei:LEI,name:entity.name,country:'IN',jurisdiction:'IN',registrationStatus:'ISSUED',status:'ACTIVE',sourceUrl:entity.sourceUrl,lastUpdate:'2026-11-01'};
 await withEngine(true,()=>json({records:[card],attempted:18,resolved:1}),async calls=>{
  const r=await loadFeatured();
  assert.equal(r.origin,'private-index');
  assert.deepEqual(r.records,[card]);
  assert.equal(r.attempted,18);
  assert.equal(calls[0].pathname,'/v1/featured');
  assert.equal(calls.some(isGleif),false);
 });
});
