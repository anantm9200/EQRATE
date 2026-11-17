import {test} from 'node:test';
import assert from 'node:assert/strict';
import {directoryUrl,DIRECTORY_PAGE_SIZE} from '../lib/gleif';

test('global directory defaults to source-backed GLEIF paginated list',()=>{
 const url=directoryUrl({});
 assert.equal(url.hostname,'api.gleif.org');
 assert.equal(url.searchParams.get('page[number]'),'1');
 assert.equal(url.searchParams.get('page[size]'),String(DIRECTORY_PAGE_SIZE));
 assert.equal(url.searchParams.has('filter[entity.legalName]'),false);
 assert.equal(url.searchParams.has('filter[entity.legalAddress.country]'),false);
});
test('directory supports combined country and legal name filters safely',()=>{
 const url=directoryUrl({q:'Siemens & Co',country:'de',page:4});
 assert.equal(url.searchParams.get('filter[entity.legalName]'),'Siemens & Co');
 assert.equal(url.searchParams.get('filter[entity.legalAddress.country]'),'DE');
 assert.equal(url.searchParams.get('page[number]'),'4');
 assert.equal(url.host,'api.gleif.org');
});
test('directory rejects unsupported query, country and deep pagination',()=>{
 for(const filters of [
  {q:'x'},{q:'y'.repeat(91)},{country:'USA'},
  {country:'a1'},{page:-1},{page:0},{page:1000},{page:1.5},
 ])assert.throws(()=>directoryUrl(filters),/INVALID_/);
});
test('directory supports browsing across the global API within its published 10k page window',()=>{
 const max=Math.floor(10000/DIRECTORY_PAGE_SIZE);
 assert.equal(directoryUrl({page:max}).searchParams.get('page[number]'),String(max));
 assert.throws(()=>directoryUrl({page:max+1}),/INVALID_PAGE/);
});
