import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createAssessment} from '../lib/assessment';
import {buildSensitivity,buildScenarios,getModelRange,getEvidenceCoverage,reviewAssessment} from '../lib/research-intelligence';

function example(){
 const a=createAssessment('2026-11-17');
 a.name='Synthetic example entity';a.identifier='EXAMPLE-ONLY';a.country='India';a.currency='USD';
 a.fields.freeCashFlow=10;a.fields.growthPct=0;a.fields.discountPct=10;
 a.fields.terminalPct=0;a.fields.forecastYears=1;a.fields.netDebt=25;
 a.fields.revenue=100;a.fields.revenueMultiple=3;
 a.fields.assets=150;a.fields.liabilities=50;
 a.active=['dcf','revenueMultiple','netAssets'];
 return a;
}
test('missing cash flows produce unavailable—not invented—DCF sensitivity',()=>{
 const a=createAssessment('2026-11-17');
 const matrix=buildSensitivity(a);
 assert.equal(matrix.available,false);
 assert.deepEqual(matrix.rows,[]);
 assert.equal(matrix.baseValue,null);
 const cases=buildScenarios(a);assert.ok(cases.every(x=>x.value===null));
});
test('DCF center sensitivity preserves deterministic enterprise-to-equity result',()=>{
 const a=example();
 const matrix=buildSensitivity(a,1,.5);
 assert.equal(matrix.available,true);
 assert.equal(matrix.rows.length,5);
 assert.ok(matrix.rows.every(r=>r.length===5));
 assert.ok(Math.abs((matrix.rows[2][2].equityValue??0)-75)<1e-7);
 assert.ok(Math.abs((matrix.baseValue??0)-75)<1e-7);
 assert.ok((matrix.rows[1][2].equityValue??0)>(matrix.baseValue??0));
 assert.ok((matrix.rows[3][2].equityValue??0)<(matrix.baseValue??0));
 assert.equal(matrix.rows[0][0].discountPct,8);
 assert.equal(matrix.rows[4][4].terminalPct,1);
});
test('sensitivity rejects invalid increments and non-convergent perpetuity cells',()=>{
 const a=example();a.fields.discountPct=1;a.fields.terminalPct=.5;
 const matrix=buildSensitivity(a,1,1);
 assert.equal(matrix.available,true);
 assert.equal(matrix.rows[0][4].equityValue,null);
 assert.throws(()=>buildSensitivity(a,0,1),/increments/);
});
test('explicit bear/base/bull scenarios show expected valuation direction',()=>{
 const [bear,base,bull]=buildScenarios(example(),2,2,.5);
 assert.equal(base.value,75);
 assert.ok(bear.value!==null&&bull.value!==null);
 assert.ok(bear.value!<base.value!);
 assert.ok(bull.value!>base.value!);
 assert.equal(bear.growthPct,-2);
 assert.equal(bull.discountPct,8);
});
test('method spread uses a median and flags divergence instead of invented confidence',()=>{
 const a=example();
 const range=getModelRange(a);
 assert.equal(range.count,3);
 assert.equal(range.minimum,75);
 assert.equal(range.maximum,275);
 assert.equal(range.median,100);
 assert.ok(Math.abs(range.spreadPct!-200)<1e-8);
 const review=reviewAssessment(a,'2026-11-17');
 assert.ok(review.findings.some(x=>x.id==='divergence'&&x.level==='attention'));
 assert.ok(review.findings.some(x=>x.id==='evidence'&&x.level==='critical'));
});
test('recorded source categories are counted but never automatically verified',()=>{
 const a=example();
 a.evidence=[
  {id:'f',title:'Example cash-flow source',url:'https://example.org/accounts',kind:'audited_financials',claim:'cash-flow',asOf:'2026-01-01',notes:'Synthetic test only'},
  {id:'c',title:'Example capitalisation',url:'https://example.org/shares',kind:'official_filing',claim:'capitalisation',asOf:'2026-01-01',notes:''}
 ];
 const coverage=getEvidenceCoverage(a);
 const dcf=coverage.find(x=>x.method==='dcf');
 assert.equal(dcf?.complete,true);
 assert.match(dcf?.note||'',/not authenticated/);
 const rev=coverage.find(x=>x.method==='revenueMultiple');
 assert.equal(rev?.complete,false);
 assert.deepEqual(rev?.missing,['financials','peer-multiple']);
});
test('manual listed price and share count require dated source records',()=>{
 const a=example();a.kind='listed';a.fields.sharePrice=12;a.fields.sharesMillions=100;
 const review=reviewAssessment(a,'2026-11-17');
 assert.ok(review.findings.some(f=>f.id==='price'&&f.level==='critical'));
 assert.ok(review.findings.some(f=>f.id==='shares'&&f.level==='critical'));
});
test('older source dates are flagged, without declaring the company unverified by a numerical score',()=>{
 const a=example();
 a.evidence=[{id:'old',title:'Aged filing',url:'https://example.org/old',kind:'official_filing',claim:'financials',asOf:'2020-01-01',notes:''}];
 const review=reviewAssessment(a,'2026-11-17');
 assert.ok(review.findings.some(f=>f.id==='stale'));
 assert.ok(!('confidenceScore' in review));
});
