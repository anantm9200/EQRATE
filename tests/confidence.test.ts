import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assessConfidence,CORE_CONCEPTS,type EvidenceFact} from '../lib/confidence';

const fact=(concept:string,value:number,o:Partial<EvidenceFact>={}):EvidenceFact=>({concept,value,fiscalYear:2025,periodEnd:'2025-03-31',
 scope:'consolidated',reviewStatus:'accepted',extractionMethod:'deterministic_table',extractionConfidence:1,sourceKind:'company_report',...o});
const full=()=>[fact('revenue',1000),fact('netIncome',100),fact('operatingCashFlow',120),fact('totalAssets',2000),
 fact('totalLiabilities',1200),fact('bookEquity',800),fact('currentAssets',600),fact('currentLiabilities',300)];

test('complete, reviewed, current, consistent evidence scores high',()=>{
 const r=assessConfidence(full(),new Date('2025-09-30'));
 // 0.3·1 + 0.2·1 + 0.25·1 + 0.15·0.9 + 0.1·1 = 0.985
 assert.equal(r.score,99);assert.equal(r.grade,'high');assert.equal(r.fiscalYear,2025);
});
test('no evidence is insufficient, never a numeric score',()=>{
 const r=assessConfidence([]);assert.equal(r.score,null);assert.equal(r.grade,'insufficient');
});
test('missing core figures lower completeness and name what is missing',()=>{
 const r=assessConfidence(full().filter(f=>!['revenue','netIncome','operatingCashFlow','totalLiabilities','bookEquity'].includes(f.concept)),new Date('2025-09-30'));
 assert.equal(r.grade,'insufficient');
 assert.match(r.components[0].explanation,/Missing: revenue, netIncome/);
 assert.equal(CORE_CONCEPTS.length,8);
});
test('stale and unreviewed evidence lowers confidence',()=>{
 const stale=assessConfidence(full(),new Date('2028-06-30')); // 39 months after period end
 assert.equal(stale.components[1].score,0);
 const pending=assessConfidence(full().map(f=>({...f,reviewStatus:'pending' as const})),new Date('2025-09-30'));
 assert.ok(pending.score!<assessConfidence(full(),new Date('2025-09-30')).score!);
});
test('balance-sheet identity break lowers consistency; untestable is neutral, not a failure',()=>{
 const broken=full().map(f=>f.concept==='bookEquity'?{...f,value:500}:f);
 assert.ok(assessConfidence(broken,new Date('2025-09-30')).components[4].score!<1);
 const untestable=assessConfidence(full().filter(f=>f.concept!=='bookEquity'),new Date('2025-09-30'));
 assert.equal(untestable.components[4].score,null);
});
test('rejected facts are ignored and consolidated figures are preferred',()=>{
 const r=assessConfidence([...full().map(f=>({...f,scope:'standalone' as const})),fact('revenue',999,{reviewStatus:'rejected'})],new Date('2025-09-30'));
 assert.match(r.components[0].explanation,/standalone/);
});
