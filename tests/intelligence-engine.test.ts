import {test} from 'node:test';
import assert from 'node:assert/strict';
import {analyseLEI} from '../lib/intelligence-engine';
import type {LeiEntity} from '../lib/gleif';
const base:LeiEntity={
 lei:'5493001KJTIIGC8Y1R12',name:'Synthetic Test Company',country:'US',jurisdiction:'US-DE',
 status:'ACTIVE',registrationStatus:'ISSUED',lastUpdate:'2026-11-01T00:00:00Z',
 nextRenewal:'2027-11-01T00:00:00Z',registeredAs:'TEST-REG-1',category:'GENERAL',
 address:'Example Street, US',headquarters:'Example Street, US',
 sourceUrl:'https://search.gleif.org/#/record/5493001KJTIIGC8Y1R12'
};
test('source-linked LEI facts never turn into creditworthiness claims',()=>{
 const report=analyseLEI(base,'2026-11-18');
 assert.equal(report.type,'legal-identity');
 assert.equal(report.completeness.percent,100);
 assert.equal(report.subject.identifier,base.lei);
 assert.equal(report.sources.length,1);
 assert.equal(report.signals.find(s=>s.id==='issued')?.level,'context');
 assert.ok(report.signals.every(s=>s.sourceIds[0]==='gleif:'+base.lei));
 assert.match(report.disclosure,/not independently verify/);
});
test('lapsed records and past renewal dates flag LEI maintenance only',()=>{
 const report=analyseLEI({...base,registrationStatus:'LAPSED',nextRenewal:'2025-01-01T00:00:00Z'},'2026-11-18');
 assert.equal(report.signals.find(s=>s.id==='registration-review')?.level,'attention');
 assert.equal(report.signals.find(s=>s.id==='renewal-overdue')?.level,'attention');
 assert.match(report.signals.find(s=>s.id==='renewal-overdue')?.why||'',/not business solvency/);
});
test('jurisdiction differences do not masquerade as adverse findings',()=>{
 const report=analyseLEI({...base,country:'GB',jurisdiction:'US-DE'},'2026-11-18');
 assert.equal(report.signals.find(s=>s.id==='cross-border')?.level,'context');
});
test('incomplete records show missing data without falsifying evidence',()=>{
 const report=analyseLEI({...base,registeredAs:'',address:'',lastUpdate:'2022-05-01'},'2026-11-18');
 assert.ok(report.completeness.percent<100);
 assert.ok(report.signals.some(s=>s.id==='registration-id-missing'));
 assert.ok(report.signals.some(s=>s.id==='old-reference'));
});
test('invalid LEI and as-of date are rejected',()=>{
 assert.throws(()=>analyseLEI({...base,lei:'not-an-lei'}),/INVALID_LEI/);
 assert.throws(()=>analyseLEI(base,'2026-13-99'),/INVALID_AS_OF/);
});
