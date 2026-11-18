import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createAssessment,type Assessment,type Evidence} from '../lib/assessment';
import {runForensicIntelligence} from '../lib/forensic-intelligence';

function fixture():Assessment{
 const a=createAssessment('2026-11-18');
 a.name='Synthetic Test Holdings';a.kind='unlisted';a.identifier='DEMO-ONLY';
 a.fields.revenue=100;a.fields.ebitda=140;a.fields.netDebt=20;
 a.fields.freeCashFlow=170;a.fields.growthPct=6;a.fields.discountPct=13;a.fields.terminalPct=3;a.fields.forecastYears=5;
 a.fields.assets=70;a.fields.liabilities=90;a.fields.revenueMultiple=3;
 a.active=['dcf','revenueMultiple','netAssets'];
 return a;
}
function source(id:string,claim:Evidence['claim'],date='2026-04-01',host='example.org'):Evidence{
 return {id,title:'Synthetic '+id,url:'https://'+host+'/'+id,kind:'user_provided',claim,asOf:date,notes:'Not real'};
}
test('empty draft surfaces meaningful blockers, not a fabricated intelligence score',()=>{
 const report=runForensicIntelligence(createAssessment('2026-11-18'),'2026-11-18');
 assert.equal(report.engine,'creqor-forensic-v1');
 assert.equal(report.basis,'analyst-entered-unverified');
 assert.ok(report.summary.critical>=2);
 assert.ok(report.signals.some(s=>s.id==='identity-unset'));
 assert.ok(report.signals.some(s=>s.id==='no-evidence'));
 assert.equal(report.summary.coverage.referenced,0);
 assert.equal(report.dimensions.find(d=>d.key==='review')?.status,'missing');
 assert.ok(!('confidenceScore' in report));
});
test('financial anomaly screening explains violations without declaring fraud',()=>{
 const report=runForensicIntelligence(fixture(),'2026-11-18');
 assert.ok(report.signals.some(s=>s.id==='margin-anomaly'));
 assert.ok(report.signals.some(s=>s.id==='cash-flow-anomaly'));
 assert.ok(report.signals.some(s=>s.id==='negative-book-equity'));
 assert.ok(report.signals.every(s=>s.action.length>4&&s.implication.length>4&&s.observation.length>4));
 assert.ok(report.limitations.some(s=>s.includes('fraud')));
});
test('multiple-method divergence is a review signal, not an independent rating',()=>{
 const a=fixture();const r=runForensicIntelligence(a,'2026-11-18');
 assert.ok(r.signals.some(s=>s.id==='model-divergence'));
 assert.ok(r.summary.calculableMethods>=2);
});
test('recorded links map to claims without pretending to read source content',()=>{
 const a=fixture();
 a.evidence=[source('id','identity'),source('cf','cash-flow'),source('cap','capitalisation'),source('finance','financials','2026-01-01','another.example')];
 const r=runForensicIntelligence(a,'2026-11-18');
 assert.equal(r.summary.sourceLinks,4);
 assert.equal(r.summary.uniqueHosts,2);
 assert.equal(r.trace.find(x=>x.claim==='cash-flow')?.references,1);
 assert.equal(r.dimensions.find(d=>d.key==='review')?.status,'missing');
 assert.ok(r.summary.coverage.referenced>=3);
 assert.ok(r.summary.coverage.referenced<=r.summary.coverage.required);
});
test('duplicate, stale, future, invalid date and insecure URL issues are detected',()=>{
 const a=fixture();
 a.evidence=[
  source('same','identity','2024-01-01'),
  {...source('same','identity','2024-01-01'),id:'repeat'},
  source('future','cash-flow','2028-01-01'),
  source('invalid','financials','2026-02-30'),
  {...source('bad','assets'),url:'http://insecure.example/file'}
 ];
 const r=runForensicIntelligence(a,'2026-11-18');
 for(const id of ['duplicate-references','source-stale','source-future','source-date-invalid','source-link-invalid'])assert.ok(r.signals.some(s=>s.id===id),id);
 assert.equal(r.trace.find(x=>x.claim==='identity')?.references,2);
});
test('dated sources after the review date do not count toward evidence coverage',()=>{
 const a=fixture();a.evidence=[source('future','identity','2029-01-01')];
 const r=runForensicIntelligence(a,'2026-11-18');
 assert.equal(r.summary.coverage.referenced,0);
 assert.ok(r.signals.some(s=>s.id==='source-future'));
});
test('one-host source concentration highlights that multiple URLs are not independent',()=>{
 const a=fixture();
 a.evidence=[source('identity','identity'),source('cash','cash-flow'),source('peer','peer-multiple')];
 const r=runForensicIntelligence(a,'2026-11-18');
 assert.ok(r.signals.some(s=>s.id==='host-concentration'));
 assert.equal(r.summary.uniqueHosts,1);
});
test('stale share-price and modelled-versus-market gap preserve unverified interpretation',()=>{
 const a=fixture();a.kind='listed';a.fields.sharesMillions=10;a.fields.sharePrice=100;
 a.evidence=[source('identity','identity'),source('price','share-price','2025-01-01'),source('capital','capitalisation')];
 const r=runForensicIntelligence(a,'2026-11-18');
 assert.ok(r.signals.some(s=>s.id==='listed-quote-age'));
 assert.equal(r.summary.sourceLinks,3);
 assert.ok(r.limitations.some(s=>s.includes('market prices')));
});
test('calendar-date validation prevents impossible assessment review dates',()=>{
 assert.throws(()=>runForensicIntelligence(fixture(),'2026-02-30'),/Invalid review date/);
});
test('exportable findings are deterministically ordered and contain a priority action queue',()=>{
 const a=fixture();const first=runForensicIntelligence(a,'2026-11-18'),second=runForensicIntelligence(a,'2026-11-18');
 assert.deepEqual(first,second);
 assert.ok(first.nextActions.length>0);
 assert.ok(first.nextActions.every((item,i)=>item.priority===i+1));
 const rank={critical:0,high:1,review:2,info:3};
 for(let i=1;i<first.signals.length;i++)assert.ok(rank[first.signals[i-1].severity]<=rank[first.signals[i].severity]);
});
