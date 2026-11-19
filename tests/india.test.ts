import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeIndianIdentifier,regionFromAddress,indiaLeads} from '../lib/india';
import {parseRelationshipRow,parseExceptionRow,requireHeaders,RR_REQUIRED} from '../lib/gleif-relationships';

test('CIN decodes listing, industry code, ROC state, year and class exactly',()=>{
 const d=decodeIndianIdentifier('L17110MH1973PLC019786');
 assert.deepEqual(d,{kind:'CIN',value:'L17110MH1973PLC019786',listingCode:'L',listing:'Listed',industryCode:'17110',
  rocState:'MH',incorporationYear:1973,companyClass:'PLC',companyClassLabel:'Public limited company',registrationNumber:'019786'});
 const u=decodeIndianIdentifier('U72200KA2001PTC029165');
 assert.equal(u?.kind==='CIN'&&u.listing,'Unlisted');
 const unknown=decodeIndianIdentifier('U72200KA2001PLN029165');
 assert.equal(unknown?.kind==='CIN'&&unknown.companyClassLabel,'not decoded','undocumented class codes are never guessed');
});
test('GSTIN decodes GST state and PAN holder type; other identifiers are not decoded',()=>{
 const g=decodeIndianIdentifier('27AADCK6948D1ZE');
 assert.deepEqual(g,{kind:'GSTIN',value:'27AADCK6948D1ZE',stateCode:'27',state:'Maharashtra',pan:'AADCK6948D',panHolderType:'C',panHolderLabel:'Company'});
 for(const v of ['LTMF/O/E/VAF/09/09/0016','8804','AAA-1234','',null])assert.equal(decodeIndianIdentifier(v as string),null);
 assert.equal(decodeIndianIdentifier('U72200KA1700PTC029165'),null,'implausible year rejected');
});
test('region comes from the ISO 3166-2 code in the reported address',()=>{
 assert.deepEqual(regionFromAddress('1 MG Road, Bengaluru, IN-KA, 560001, IN'),{code:'KA',name:'Karnataka'});
 assert.deepEqual(regionFromAddress('Raipur, IN-CG, 492001, IN'),{code:'CG',name:'Chhattisgarh'});
 assert.equal(regionFromAddress('Mumbai, 400001, IN'),null);
});
test('India consistency leads compare CIN against the reported address and creation date',()=>{
 const leads=indiaLeads({registeredAs:'L17110MH1973PLC019786',address:'Ahmedabad, IN-GJ, 380001, IN',entityCreationDate:'1975-01-01'});
 assert.deepEqual(leads.map(l=>l.code).sort(),['CIN_LISTED','CIN_STATE_DIFFERS_FROM_ADDRESS','CIN_YEAR_DIFFERS_FROM_CREATION_DATE']);
 assert.deepEqual(indiaLeads({registeredAs:'U72200TG2001PTC029165',address:'Hyderabad, IN-TS, 500001, IN'}),[],'TG and TS both mean Telangana');
 assert.equal(indiaLeads({registeredAs:'LTMF/O/E/VAF/09/09/0016'})[0].code,'INDIAN_IDENTIFIER_NOT_DECODED');
});
test('GLEIF relationship rows keep only LEI-to-LEI facts with periods and quantifiers',()=>{
 requireHeaders(['Relationship.StartNode.NodeID','Relationship.EndNode.NodeID','Relationship.RelationshipType','x'],RR_REQUIRED);
 assert.throws(()=>requireHeaders(['LEI'],RR_REQUIRED),/SCHEMA_MISSING/);
 const row={'Relationship.StartNode.NodeID':'335800ABCDEFGHIJKL12','Relationship.StartNode.NodeIDType':'LEI',
  'Relationship.EndNode.NodeID':'5493001KJTIIGC8Y1R12','Relationship.EndNode.NodeIDType':'LEI',
  'Relationship.RelationshipType':'IS_DIRECTLY_CONSOLIDATED_BY','Relationship.RelationshipStatus':'ACTIVE',
  'Relationship.Period.1.startDate':'2024-04-01T00:00:00Z','Relationship.Period.1.endDate':'2025-03-31T00:00:00Z','Relationship.Period.1.periodType':'ACCOUNTING_PERIOD',
  'Relationship.Period.2.startDate':'2019-06-01T00:00:00Z','Relationship.Period.2.periodType':'RELATIONSHIP_PERIOD',
  'Relationship.Quantifiers.1.MeasurementMethod':'ACCOUNTING_CONSOLIDATION','Relationship.Quantifiers.1.QuantifierAmount':'100','Relationship.Quantifiers.1.QuantifierUnits':'PERCENTAGE',
  'Registration.RegistrationStatus':'PUBLISHED','Registration.ManagingLOU':'335800FVH4MOKZS9VH40'};
 const r=parseRelationshipRow(row)!;
 assert.equal(r.childLei,'335800ABCDEFGHIJKL12');
 assert.equal(r.parentLei,'5493001KJTIIGC8Y1R12');
 assert.equal(r.accountingStart,'2024-04-01');
 assert.equal(r.relationshipStart,'2019-06-01');
 assert.equal(r.quantifiers,'100 PERCENTAGE (ACCOUNTING_CONSOLIDATION)');
 assert.match(r.sha256,/^[a-f0-9]{64}$/);
 assert.equal(parseRelationshipRow({...row,'Relationship.EndNode.NodeID':row['Relationship.StartNode.NodeID']}),null,'self-links rejected');
 assert.equal(parseRelationshipRow({...row,'Relationship.EndNode.NodeIDType':'OTHER'}),null);
});
test('reporting exceptions keep official reasons and reject rows without one',()=>{
 const e=parseExceptionRow({LEI:'335800ABCDEFGHIJKL12','Exception.Category':'ULTIMATE_ACCOUNTING_CONSOLIDATION_PARENT','Exception.Reason.1':'NATURAL_PERSONS'})!;
 assert.deepEqual(e.reasons,['NATURAL_PERSONS']);
 assert.equal(parseExceptionRow({LEI:'335800ABCDEFGHIJKL12','Exception.Category':'DIRECT_ACCOUNTING_CONSOLIDATION_PARENT'}),null);
});
