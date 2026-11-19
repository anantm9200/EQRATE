import test from 'node:test';
import assert from 'node:assert/strict';
import {screenLegalEntity,missingIdentityFields} from '../lib/identity-intelligence';
import {parseGoldenCsvRow} from '../lib/gleif-golden-copy';
import {sourceFingerprint} from '../lib/catalogue-store';
import type {LeiEntity} from '../lib/gleif';

const base:LeiEntity={lei:'529900T8BM49AURSDO55',name:'Sample Holdings Limited',country:'GB',jurisdiction:'GB',
 status:'ACTIVE',registrationStatus:'ISSUED',lastUpdate:'2026-01-10T00:00:00Z',nextRenewal:'2027-01-10T00:00:00Z',
 registeredAs:'01234567',category:'GENERAL',address:'1 Test Street, London, GB',headquarters:'1 Test Street, London, GB',
 sourceUrl:'https://search.gleif.org/#/record/529900T8BM49AURSDO55'};
test('a clean, current, independently validated record raises no adverse leads',()=>{
 const flags=screenLegalEntity({...base,validationSources:'FULLY_CORROBORATED',headquartersCountry:'GB'},{asOf:'2026-06-01',sameNameOtherLeis:0});
 assert.deepEqual(flags,[]);
});
test('lapsed, duplicate and overdue registrations are leads with source evidence',()=>{
 const lapsed=screenLegalEntity({...base,registrationStatus:'LAPSED'},{asOf:'2026-06-01'});
 assert.equal(lapsed[0].code,'REGISTRATION_LAPSED');
 assert.equal(lapsed[0].evidence.registrationStatus,'LAPSED');
 const dup=screenLegalEntity({...base,registrationStatus:'DUPLICATE'},{asOf:'2026-06-01'});
 assert.equal(dup[0].severity,'high');
 const overdue=screenLegalEntity({...base,nextRenewal:'2026-03-01T00:00:00Z'},{asOf:'2026-06-01'});
 assert.equal(overdue[0].code,'RENEWAL_DATE_PASSED');
 assert.equal(overdue[0].evidence.overdueDays,92);
});
test('contextual leads: cross-border HQ, shared names, successor, stale publication',()=>{
 const flags=screenLegalEntity({...base,headquartersCountry:'LU',successorLei:'5493001KJTIIGC8Y1R12',validationSources:'ENTITY_SUPPLIED_ONLY'},
  {asOf:'2026-06-01',sameNameOtherLeis:6,presentInLatestPublication:false,successorIndexed:true});
 const codes=flags.map(f=>f.code);
 for(const c of ['CROSS_BORDER_HEADQUARTERS','SHARED_LEGAL_NAME','SUCCESSOR_DECLARED','ABSENT_FROM_LATEST_PUBLICATION','WEAK_VALIDATION_ENTITY_SUPPLIED_ONLY'])
  assert.ok(codes.includes(c),c);
 assert.equal(flags.find(f=>f.code==='SHARED_LEGAL_NAME')?.severity,'medium');
 const order=['high','medium','low','info'];
 for(let i=1;i<flags.length;i++)assert.ok(order.indexOf(flags[i-1].severity)<=order.indexOf(flags[i].severity));
});
test('missing source fields are listed explicitly',()=>{
 assert.deepEqual(missingIdentityFields({...base,registeredAs:'',headquarters:''}).slice(0,2),['registeredAs','headquarters']);
});
test('golden copy parser keeps name variants and registration metadata only when present',()=>{
 const row={LEI:'529900T8BM49AURSDO55','Entity.LegalName':'Sample Holdings Limited','Entity.LegalAddress.Country':'GB',
  'Entity.OtherEntityNames.OtherEntityName.1':'Sample Holdings Ltd','Entity.TransliteratedOtherEntityNames.TransliteratedOtherEntityName.1':'SAMPLE HOLDINGS LIMITED',
  'Entity.LegalForm.EntityLegalFormCode':'H0PO','Registration.InitialRegistrationDate':'2014-02-01T00:00:00Z',
  'Registration.ManagingLOU':'213800WAVVOPS85N2205','Registration.ValidationSources':'FULLY_CORROBORATED',
  'Entity.HeadquartersAddress.Country':'gb','Entity.SuccessorEntity.1.SuccessorLEI':'not-an-lei'};
 const e=parseGoldenCsvRow(row)!;
 assert.equal(e.otherNames,'Sample Holdings Ltd','case-insensitive duplicate of legal name is dropped');
 assert.equal(e.legalForm,'H0PO');
 assert.equal(e.managingLou,'213800WAVVOPS85N2205');
 assert.equal(e.headquartersCountry,'GB');
 assert.equal('successorLei' in e,false,'malformed successor LEI is not stored');
 assert.equal('entityCreationDate' in e,false);
});
test('fingerprint is stable for live-API records without optional Golden Copy fields',()=>{
 assert.equal(sourceFingerprint(base),sourceFingerprint({...base,otherNames:'',legalForm:undefined}));
 assert.notEqual(sourceFingerprint(base),sourceFingerprint({...base,otherNames:'Other Name'}));
});
