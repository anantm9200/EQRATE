import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DIRECTORY_PAGE_SIZE,directoryUrl,type LeiEntity} from '../lib/gleif';
import {selectFeaturedEntity,getFeaturedCompanyUniverse,FEATURED_ENTITY_NAMES} from '../lib/company-universe';

function entity(name:string,lei:string,registrationStatus='ISSUED',status='ACTIVE'):LeiEntity{
 return {name,lei,registrationStatus,status,country:'US',jurisdiction:'US-DE',
  lastUpdate:'2026-11-01',nextRenewal:'2027-11-01',registeredAs:'SYNTHETIC',
  category:'GENERAL',address:'',headquarters:'',sourceUrl:'https://search.gleif.org/#/record/'+lei};
}
test('global directory requests 60 verified-source records per page and retains bounded pagination',()=>{
 assert.equal(DIRECTORY_PAGE_SIZE,60);
 assert.equal(directoryUrl({page:1}).searchParams.get('page[size]'),'60');
 assert.equal(directoryUrl({page:2,country:'IN'}).searchParams.get('page[number]'),'2');
 assert.throws(()=>directoryUrl({page:500}),/INVALID_PAGE/);
});
test('featured company selector never turns similar-sounding subsidiaries into an exact legal identity',()=>{
 const data=[entity('APPLE BANK LIMITED','12345678901234567890'),entity('APPLE INC.','12345678901234567891')];
 const selection=selectFeaturedEntity('APPLE INC.',data);
 assert.equal(selection?.name,'APPLE INC.');
 assert.equal(selectFeaturedEntity('APPLE CORPORATION',data),null);
});
test('featured identity selection prefers current LEI registration without suggesting audited financial verification',()=>{
 const stale=entity('AIRBUS SE','12345678901234567890','LAPSED','INACTIVE');
 const current=entity('Airbus SE','12345678901234567891','ISSUED','ACTIVE');
 assert.equal(selectFeaturedEntity('Airbus SE',[stale,current])?.lei,current.lei);
});
test('featured company universe returns only authentic parsed response records and tolerates provider failures',async()=>{
 const old=globalThis.fetch;
 let attempts=0;
 globalThis.fetch=(async(input:RequestInfo|URL)=>{
  attempts++;
  const requested=new URL(String(input)).searchParams.get('filter[entity.legalName]');
  if(requested==='APPLE INC.'){
   const record={id:'12345678901234567890',attributes:{
    lei:'12345678901234567890',entity:{legalName:{name:'APPLE INC.'},status:'ACTIVE',
      legalAddress:{country:'US'},jurisdiction:'US-DE'},registration:{status:'ISSUED',lastUpdateDate:'2026-11-01'}}};
   return new Response(JSON.stringify({data:[record]}),{status:200});
  }
  return new Response(JSON.stringify({error:'test failure'}),{status:503});
 }) as typeof fetch;
 try{
  const result=await getFeaturedCompanyUniverse();
  assert.equal(attempts,FEATURED_ENTITY_NAMES.length+1); // one GLEIF directory fallback after incomplete name matches
  assert.equal(result.attempted,FEATURED_ENTITY_NAMES.length);
  assert.equal(result.records.length,1);
  assert.equal(result.records[0].name,'APPLE INC.');
  assert.equal(result.records[0].lei,'12345678901234567890');
  assert.equal('marketCap' in result.records[0],false);
  assert.equal('rating' in result.records[0],false);
 }finally{globalThis.fetch=old;}
});

test('featured discovery fills gaps only with official indexed source records',async()=>{
 const old=globalThis.fetch;
 globalThis.fetch=(async(input:RequestInfo|URL)=>{
  const url=new URL(String(input));
  if(url.searchParams.get('page[size]')==='60'){
   const rows=Array.from({length:15},(_,i)=>{
    const lei=String(i+1).padStart(20,'0');
    return {id:lei,attributes:{lei,entity:{legalName:{name:'Synthetic GLEIF Fixture '+(i+1)},
      status:'ACTIVE',legalAddress:{country:'US'}},
      registration:{status:'ISSUED',lastUpdateDate:'2026-11-18'}}};
   });
   return new Response(JSON.stringify({data:rows,meta:{pagination:{total:15}}}),{status:200});
  }
  return new Response('{}',{status:503});
 }) as typeof fetch;
 try{
  const result=await getFeaturedCompanyUniverse();
  assert.equal(result.records.length,FEATURED_ENTITY_NAMES.length);
  assert.ok(result.records.every(x=>x.sourceUrl.startsWith('https://search.gleif.org/#/record/')));
  assert.ok(result.records.every(x=>x.name.startsWith('Synthetic GLEIF Fixture ')));
 }finally{globalThis.fetch=old;}
});
