import {test} from 'node:test';
import assert from 'node:assert/strict';
import {listLEIRecords} from '../lib/gleif';
test('directory renders only source records and preserves source pagination metadata',async()=>{
 const original=globalThis.fetch;
 let requested='';
 globalThis.fetch=(async(input:RequestInfo|URL)=>{
  requested=String(input);
  return new Response(JSON.stringify({data:[{
   id:'12345678901234567890',attributes:{
    lei:'12345678901234567890',entity:{legalName:{name:'Synthetic Issuer Ltd'},status:'ACTIVE',jurisdiction:'AE',category:'GENERAL',legalAddress:{country:'AE'}},
    registration:{status:'ISSUED',lastUpdateDate:'2026-11-17T00:00:00Z'}
   }
  }],meta:{pagination:{total:100},goldenCopy:{publishDate:'2026-11-17'}}}),{status:200});
 }) as typeof fetch;
 try{
  const data=await listLEIRecords({country:'AE',page:1});
  assert.equal(new URL(requested).searchParams.get('filter[entity.legalAddress.country]'),'AE');
  assert.equal(data.total,100);assert.equal(data.hasMore,true);
  assert.equal(data.results.length,1);assert.equal(data.results[0].name,'Synthetic Issuer Ltd');
  assert.equal(data.results[0].country,'AE');
  assert.equal(data.results[0].sourceUrl,'https://search.gleif.org/#/record/12345678901234567890');
  assert.equal('marketCap' in data.results[0],false);
 }finally{globalThis.fetch=original;}
});
