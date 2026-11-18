import test from 'node:test';
import assert from 'node:assert/strict';
import type {LeiEntity} from '../lib/gleif';
import {CATALOGUE_REGIONS,sourceFingerprint,catalogueStatus,
 listIndexedRecords,synchronizeCatalogue} from '../lib/catalogue-store';

function record(name='TEST LEGAL ENTITY',country='AE'):LeiEntity{
 const lei='529900T8BM49AURSDO55';
 return {lei,name,country,jurisdiction:country,status:'ACTIVE',registrationStatus:'ISSUED',
  lastUpdate:'2026-11-18',nextRenewal:'2027-11-18',registeredAs:'TEST-ONLY',
  category:'GENERAL',address:'Synthetic example',headquarters:'Synthetic example',
  sourceUrl:'https://search.gleif.org/#/record/'+lei};
}
test('source version fingerprints are stable for one normalized official record',()=>{
 const a=record();
 assert.equal(sourceFingerprint(a),sourceFingerprint({...a}));
 assert.match(sourceFingerprint(a),/^[a-f0-9]{64}$/);
 assert.notEqual(sourceFingerprint(a),sourceFingerprint({...a,name:'SOME OTHER LEGAL ENTITY'}));
 assert.notEqual(sourceFingerprint(a),sourceFingerprint({...a,registrationStatus:'LAPSED'}));
});
test('source index rejects invented, malformed and nonofficial registry records',()=>{
 const a=record();
 assert.throws(()=>sourceFingerprint({...a,sourceUrl:'https://example.org/' + a.lei}),/BAD_ENTITY/);
 assert.throws(()=>sourceFingerprint({...a,lei:'fake'}),/BAD_ENTITY/);
 assert.throws(()=>sourceFingerprint({...a,name:''}),/BAD_ENTITY/);
});
test('public catalogue queries validate bounding constraints BEFORE contacting a database',async()=>{
 for(const invalid of [{page:0},{page:1001},{q:'a'},{q:'a'.repeat(91)},{country:'USA'},{country:'a1'}]){
  await assert.rejects(()=>listIndexedRecords(invalid),/INVALID_FILTER/,JSON.stringify(invalid));
 }
});
test('catalogue sync strictly bounds country, page and batch before any database action',async()=>{
 await assert.rejects(()=>synchronizeCatalogue('United States',3),/INVALID_SYNC_ARGUMENTS/);
 await assert.rejects(()=>synchronizeCatalogue('US',9),/INVALID_SYNC_ARGUMENTS/);
 await assert.rejects(()=>synchronizeCatalogue('US',0),/INVALID_SYNC_ARGUMENTS/);
 await assert.rejects(()=>synchronizeCatalogue('US',3,1000),/INVALID_SYNC_ARGUMENTS/);
 assert.equal(CATALOGUE_REGIONS.length,16);
});
test('catalogue without a configured DB reports zero records rather than fictional cached companies',async()=>{
 const original=process.env.DATABASE_URL;
 try{
  delete process.env.DATABASE_URL;
  const status=await catalogueStatus();
  assert.equal(status.status,'unconfigured');
  assert.equal(status.indexed,0);
  assert.equal(status.configured,false);
 }finally{
  if(original===undefined)delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL=original;
 }
});
