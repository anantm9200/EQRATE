import test from 'node:test';
import assert from 'node:assert/strict';
import {parseGoldenCsvRow,validateGoldenCsvHeader} from '../lib/gleif-golden-copy';
const fixture={
 LEI:'529900T8BM49AURSDO55','Entity.LegalName':'Sample Holdings Limited',
 'Entity.LegalAddress.Country':'GB','Entity.LegalAddress.City':'London',
 'Entity.LegalAddress.FirstAddressLine':'1 Test Street',
 'Entity.LegalJurisdiction':'GB','Entity.EntityStatus':'ACTIVE',
 'Registration.RegistrationStatus':'ISSUED','Registration.LastUpdateDate':'2026-11-18T08:00:00Z',
 'Registration.NextRenewalDate':'2027-11-18T08:00:00Z'
};
test('accepts official GLEIF CDF fields with exact LEI and preserves provenance',()=>{
 validateGoldenCsvHeader(Object.keys(fixture));
 const r=parseGoldenCsvRow(fixture);
 assert.equal(r?.lei,fixture.LEI);
 assert.equal(r?.name,'Sample Holdings Limited');
 assert.equal(r?.country,'GB');
 assert.match(r?.address||'',/1 Test Street/);
 assert.equal(r?.sourceUrl,'https://search.gleif.org/#/record/'+fixture.LEI);
});
test('rejects absent headers and malformed names/identifiers without inventing identity',()=>{
 assert.throws(()=>validateGoldenCsvHeader(['Entity.LegalName']),/SCHEMA_MISSING_LEI/);
 assert.equal(parseGoldenCsvRow({...fixture,LEI:'bad'}),null);
 assert.equal(parseGoldenCsvRow({...fixture,'Entity.LegalName':''}),null);
 assert.equal(parseGoldenCsvRow({...fixture,'Entity.LegalAddress.Country':'USA'}),null);
});
