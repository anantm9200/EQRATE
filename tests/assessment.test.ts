import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createAssessment,computeAssessment,parseAssessment,formatMillions,methodNames,numberKeys} from '../lib/assessment';

function filled(){
 const a=createAssessment('2026-11-17');a.name='Synthetic Sample Ltd';a.country='India';a.currency='USD';
 a.fields={revenue:100,ebitda:20,netDebt:25,assets:150,liabilities:50,assetAdjustment:5,freeCashFlow:10,growthPct:0,discountPct:10,terminalPct:0,forecastYears:1,sharesMillions:50,sharePrice:12,revenueMultiple:3,ebitdaMultiple:8,transactionConsideration:30,transactionStakePct:10,fundingAmount:12,fundingEquityPct:15};
 return a;
}
test('blank assessment does not invent numbers or issue a rating',()=>{
 const a=createAssessment('2026-11-17');const r=computeAssessment(a);
 assert.equal(r.marketCap,null);assert.equal(r.blended,null);assert.equal(r.status,'insufficient');assert.equal(r.readyMethods,0);assert.equal(r.ratingDraft,null);
 for(const m of r.methods)assert.equal(m.status,'missing');
});
test('private six-method valuations are deterministic with known synthetic inputs',()=>{
 const r=computeAssessment(filled());
 const expected={dcf:75,revenueMultiple:275,ebitdaMultiple:135,netAssets:105,transaction:300,funding:80};
 for(const [id,value] of Object.entries(expected)){
  const row=r.methods.find(x=>x.id===id);
  assert.equal(row?.status,'calculated',id);
  assert.ok(Math.abs((row?.equityValue||0)-value)<1e-8,id);
 }
 assert.ok(Math.abs((r.blended||0)-(970/6))<1e-8);
 assert.ok(Math.abs((r.blendedPerShare||0)-(970/6/50))<1e-8);
 assert.equal(r.status,'draft');
});
test('listed manual market cap is price multiplied by matching shares in millions',()=>{
 const a=filled();a.kind='listed';const r=computeAssessment(a);
 assert.equal(r.marketCap,600);
 assert.match(r.marketCapMessage,/not an independently observed live quote/);
});
test('reject impossible transaction and funding ownership',()=>{
 const a=filled();a.fields.transactionStakePct=0;a.fields.fundingEquityPct=120;
 const r=computeAssessment(a);
 assert.equal(r.methods.find(x=>x.id==='transaction')?.status,'invalid');
 assert.equal(r.methods.find(x=>x.id==='funding')?.status,'invalid');
});
test('reject invalid perpetual growth and discount rates',()=>{
 const a=filled();a.fields.discountPct=2;a.fields.terminalPct=4;
 assert.equal(computeAssessment(a).methods.find(x=>x.id==='dcf')?.status,'invalid');
});
test('financial institutions do not use default EBITDA multiple model',()=>{
 const a=filled();a.industry='Banking';
 const r=computeAssessment(a);const x=r.methods.find(x=>x.id==='ebitdaMultiple');
 assert.equal(x?.status,'invalid');assert.match(x?.detail||'',/financial institutions/);
});
test('zero method weights produce no misleading blended estimate',()=>{
 const a=filled();for(const m of Object.keys(methodNames) as (keyof typeof methodNames)[])a.weights[m]=0;
 assert.equal(computeAssessment(a).blended,null);
});
test('negative net debt is handled as net cash in enterprise-to-equity bridge',()=>{
 const a=filled();a.fields.netDebt=-10;
 assert.equal(computeAssessment(a).methods.find(x=>x.id==='revenueMultiple')?.equityValue,310);
});
test('analyst-entered scores remain a draft and require all six categories',()=>{
 const a=filled();a.ratings.financialStrength=90;
 assert.equal(computeAssessment(a).ratingDraft,null);
 for(const k of Object.keys(a.ratings) as (keyof typeof a.ratings)[])a.ratings[k]=70;
 assert.equal(computeAssessment(a).ratingDraft,70);
});
test('export import validates user data and preserves explicit input zeros',()=>{
 const a=filled();a.fields.growthPct=0;
 a.evidence.push({id:'src1',title:'Synthetic test evidence',url:'https://example.org/filing',kind:'user_provided',claim:'financials',asOf:'2026-11-17',notes:'SYNTHETIC — do not publish'});
 const imported=parseAssessment(JSON.parse(JSON.stringify(a)));
 assert.equal(imported.fields.growthPct,0);
 assert.equal(imported.evidence.length,1);
 assert.equal(imported.evidence[0].kind,'user_provided');
 assert.equal(computeAssessment(imported).sourceCount,1);
});
test('import rejects unknown shape and drops invalid numeric fields',()=>{
 assert.throws(()=>parseAssessment({kind:'unlisted'}),/Missing company name/);
 const a=filled();(a.fields as unknown as Record<string,unknown>).revenue='invalid';
 assert.equal(parseAssessment(a).fields.revenue,null);
});
test('input record has required financial fields and currency formatting',()=>{
 assert.ok(numberKeys.includes('sharesMillions'));assert.match(formatMillions(1.25,'USD'),/1\.25/);
});
