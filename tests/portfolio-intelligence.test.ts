import test from 'node:test';
import assert from 'node:assert/strict';
import {createAssessment} from '../lib/assessment';
import {analyzePortfolio} from '../lib/portfolio-intelligence';
function item(name:string,id:string,date='2026-01-01'){
 const a=createAssessment(date);a.name=name;a.identifier=id;a.asOf=date;a.country='IN';return a;
}
test('empty portfolio is stable and makes no conclusions',()=>{
 const r=analyzePortfolio([]);assert.equal(r.companies,0);assert.equal(r.alerts.length,0);
 assert.equal(r.basis,'analyst-entered-unverified');
});
test('shared identifier and conflicting legal attributes create a reviewable signal',()=>{
 const a=item('Alpha Ltd','LEI-123'),b=item('Other Ltd','LEI-123');
 const r=analyzePortfolio([a,b]);
 assert.equal(r.summary.identityCollisions,1);
 assert.ok(r.alerts.some(x=>x.kind==='conflicting-identity'&&x.priority==='high'));
});
test('same name with different identifiers is not treated as the same entity',()=>{
 const r=analyzePortfolio([item('Example Ltd','111'),item('Example Ltd','222')]);
 assert.ok(r.alerts.some(x=>x.kind==='identity-collision'));
 assert.ok(!r.links.some(x=>x.kind==='shared-identifier'));
});
test('cross-company evidence reuse is surfaced without asserting ownership',()=>{
 const a=item('A','A1'),b=item('B','B1');
 for(const x of [a,b])x.evidence=[{id:x.id,title:'Document',url:'https://filings.example.org/doc?b=2&a=1#page2',kind:'user_provided',claim:'financials',asOf:'2026-01-01',notes:''}];
 b.evidence[0].url='https://filings.example.org/doc?a=1&b=2';
 const r=analyzePortfolio([a,b]);
 assert.equal(r.summary.sharedSources,1);
 assert.ok(r.alerts.some(x=>x.kind==='cross-company-evidence'));
 assert.equal(r.sourceHosts[0].companies,2);
});
test('identical identifier permits period-to-period alerts but currency mismatch disables them',()=>{
 const a=item('A','ID-1','2025-01-01'),b=item('A','ID-1','2026-01-01');
 a.fields.revenue=10;b.fields.revenue=30;
 assert.ok(analyzePortfolio([a,b]).alerts.some(x=>x.kind==='financial-shift'));
 b.currency='INR';
 assert.ok(!analyzePortfolio([a,b]).alerts.some(x=>x.kind==='financial-shift'));
});
test('distinct identifiers never trigger spurious cross-company financial changes',()=>{
 const a=item('A','AAA'),b=item('B','BBB');a.fields.revenue=1;b.fields.revenue=100000;
 assert.ok(!analyzePortfolio([a,b]).alerts.some(x=>x.kind==='financial-shift'));
});
test('no invalid or insecure URLs enter the shared-source graph',()=>{
 const a=item('A','AAA'),b=item('B','BBB');
 for(const x of [a,b])x.evidence=[{id:x.id,title:'Source',url:'http://example.org/a',kind:'other',claim:'other',asOf:'2026-01-01',notes:''}];
 assert.equal(analyzePortfolio([a,b]).summary.sharedSources,0);
});
test('duplicate draft IDs do not count as different companies',()=>{
 const a=item('A','AAA');assert.equal(analyzePortfolio([a,a]).companies,1);
});

test('local registry numbers are country scoped and never merged across borders',()=>{
 const a=item('Northwind Ltd','987654','2025-01-01');
 const b=item('Northwind Ltd','987654','2026-01-01');
 a.country='India';b.country='United Arab Emirates';
 a.fields.revenue=10;b.fields.revenue=1000;
 const result=analyzePortfolio([a,b]);
 assert.ok(!result.links.some(x=>x.kind==='shared-identifier'));
 assert.ok(result.alerts.some(x=>x.id.startsWith('jurisdiction:')));
 assert.ok(!result.alerts.some(x=>x.kind==='financial-shift'));
});

test('potential LEIs remain globally scoped, but country changes require review',()=>{
 const a=item('Alpha PLC','529900T8BM49AURSDO55','2025-01-01');
 const b=item('Alpha PLC','529900T8BM49AURSDO55','2026-01-01');
 a.country='UK';b.country='DE';
 const result=analyzePortfolio([a,b]);
 assert.ok(result.links.some(x=>x.kind==='shared-identifier'));
 assert.ok(result.alerts.some(x=>x.kind==='conflicting-identity'));
 assert.equal(result.basis,'analyst-entered-unverified');
});
