import {test} from 'node:test';
import assert from 'node:assert/strict';
import {searchLEI,getLEI} from '../lib/gleif';

const lei='12345678901234567890';
const record={
 type:'lei-records',id:lei,attributes:{
  lei,entity:{legalName:{name:'Example Corporation Ltd.'},status:'ACTIVE',jurisdiction:'IN-MH',category:'GENERAL',
  legalAddress:{addressLines:['Some Lane'],city:'Mumbai',region:'IN-MH',country:'IN',postalCode:'400001'},
  headquartersAddress:{addressLines:['Other Road'],city:'Mumbai',country:'IN'},registeredAs:'SYNTHETIC-001'},
  registration:{status:'ISSUED',lastUpdateDate:'2026-11-17T04:00:00Z',nextRenewalDate:'2027-11-17T00:00:00Z'}
 }};
test('global entity search uses fixed official GLEIF hostname, encoded parameters and source-only records',async()=>{
 const original=globalThis.fetch;
 let requested='';
 globalThis.fetch=(async(input:RequestInfo|URL)=>{
  requested=String(input);
  return new Response(JSON.stringify({data:[record],meta:{goldenCopy:{publishDate:'2026-11-17T08:00:00Z'},pagination:{total:1}}}),{status:200});
 }) as typeof fetch;
 try{
  const result=await searchLEI('Example Corporation');
  const url=new URL(requested);
  assert.equal(url.origin,'https://api.gleif.org');
  assert.equal(url.searchParams.get('filter[entity.legalName]'),'Example Corporation');
  assert.equal(url.searchParams.get('page[size]'),'12');
  assert.equal(result.results.length,1);
  assert.equal(result.results[0].lei,lei);
  assert.equal(result.results[0].country,'IN');
  assert.equal(result.results[0].registrationStatus,'ISSUED');
  assert.equal(result.results[0].lastUpdate,'2026-11-17T04:00:00Z');
  assert.ok(result.results[0].sourceUrl.startsWith('https://search.gleif.org/'));
  assert.equal('marketCap' in result.results[0],false);
 }finally{globalThis.fetch=original;}
});
test('LEI detail lookup rejects invalid codes before network requests',async()=>{
 const result=await getLEI('NOT-A-LEI');
 assert.equal(result,null);
});
test('lookup resolves an issuer reference record without adding price or rating data',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=(async()=>new Response(JSON.stringify({data:record}),{status:200})) as typeof fetch;
 try{
  const result=await getLEI(lei);
  assert.equal(result?.name,'Example Corporation Ltd.');
  assert.equal(result?.registeredAs,'SYNTHETIC-001');
  assert.equal(result?.address.includes('Mumbai'),true);
 }finally{globalThis.fetch=original;}
});
test('GLEIF search propagates upstream service failures rather than fabricating results',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=(async()=>new Response(JSON.stringify({errors:[{status:'503'}]}),{status:503})) as typeof fetch;
 try{await assert.rejects(()=>searchLEI('Example'),/GLEIF_UPSTREAM_503/);}
 finally{globalThis.fetch=original;}
});
