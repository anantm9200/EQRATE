import test from 'node:test';
import assert from 'node:assert/strict';
import {corporateLinkLeads,type CorporateLinks} from '../services/dgx/relationships';

const edge=(over:Record<string,unknown>={})=>({lei:'5493001KJTIIGC8Y1R12',name:'PARENT PLC',country:'GB',registrationStatus:'ISSUED',indexed:true,
 type:'IS_DIRECTLY_CONSOLIDATED_BY',status:'ACTIVE',relationshipRegistrationStatus:'PUBLISHED',validationSources:'FULLY_CORROBORATED',
 relationshipStart:'',relationshipEnd:'',accountingStart:'',accountingEnd:'',quantifiers:'',lastUpdate:'',...over});
const base:CorporateLinks={directParent:null,ultimateParent:null,otherParents:[],directChildren:{total:0,sample:[]},ultimateChildren:0,exceptions:[]};
test('no Level 2 data at all yields no leads (null links mean "not imported", not "no parent")',()=>{
 assert.deepEqual(corporateLinkLeads(null),[]);
});
test('missing parent with no exception is a data-gap lead for both levels',()=>{
 assert.deepEqual(corporateLinkLeads(base).map(l=>l.code),['NO_DIRECT_PARENT_DATA','NO_ULTIMATE_PARENT_DATA']);
});
test('reporting exceptions explain absence; withheld parents are low-severity leads',()=>{
 const leads=corporateLinkLeads({...base,exceptions:[{category:'DIRECT_ACCOUNTING_CONSOLIDATION_PARENT',reasons:['NATURAL_PERSONS']},
  {category:'ULTIMATE_ACCOUNTING_CONSOLIDATION_PARENT',reasons:['NON_PUBLIC']}]});
 assert.equal(leads.find(l=>l.code==='PARENT_EXCEPTION_DIRECT')?.severity,'info');
 assert.equal(leads.find(l=>l.code==='PARENT_EXCEPTION_ULTIMATE')?.severity,'low');
 assert.match(leads.find(l=>l.code==='PARENT_EXCEPTION_DIRECT')!.explanation,/natural persons/);
});
test('parents that are missing from the index, lapsed or inactive raise leads',()=>{
 const leads=corporateLinkLeads({...base,directParent:edge({indexed:false,name:null}) as never,
  ultimateParent:edge({type:'IS_ULTIMATELY_CONSOLIDATED_BY',registrationStatus:'LAPSED',status:'INACTIVE'}) as never});
 const codes=leads.map(l=>l.code);
 assert.ok(codes.includes('PARENT_NOT_IN_INDEX_DIRECT'));
 assert.ok(codes.includes('PARENT_REGISTRATION_LAPSED_ULTIMATE'));
 assert.ok(codes.includes('RELATIONSHIP_INACTIVE_ULTIMATE'));
});
