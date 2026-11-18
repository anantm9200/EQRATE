import test from 'node:test';
import assert from 'node:assert/strict';
import {parseGoldenCopyMetadata} from '../lib/public-records-coverage';
const source={data:{
 publish_date:'2026-11-18 08:00:00',full_file:{csv:{
  url:'https://goldencopy.gleif.org/storage/golden-copy-files/2026/11/18/1302545/20261118-0800-gleif-goldencopy-lei2-golden-copy.csv.zip',
  record_count:3497788,size:510204340,format:'csv'
 }}
}};
test('official metadata exposes real published count, without suggesting local indexing',()=>{
 const r=parseGoldenCopyMetadata(source);
 assert.equal(r.recordCount,3497788);
 assert.equal(r.publishDate,'2026-11-18 08:00:00');
 assert.equal(r.source,'GLEIF');
 assert.equal(r.kind,'official-public-coverage');
});
test('archive metadata rejects redirects, spoofed domains and implausible sizes',()=>{
 for(const bad of ['https://goldencopy.gleif.org.evil.example/x.csv.zip',
  'http://goldencopy.gleif.org/storage/golden-copy-files/2026/11/18/1/x.csv.zip',
  'https://goldencopy.gleif.org/storage/golden-copy-files/2026/11/18/1/../../evil.csv.zip']){
  const input=structuredClone(source);
  input.data.full_file.csv.url=bad;
  assert.throws(()=>parseGoldenCopyMetadata(input),/GLEIF_METADATA_/);
 }
 const missing=structuredClone(source);missing.data.full_file.csv.record_count=0;
 assert.throws(()=>parseGoldenCopyMetadata(missing),/GLEIF_METADATA_INVALID/);
});
