import {test} from 'node:test';
import assert from 'node:assert/strict';
import {altmanZ,piotroskiF,beneishM,type AnnualFinancials} from '../lib/risk-scores';

// Reference values computed independently from the published formulas (see docs/execution/TEST_RESULTS.md).
const base:AnnualFinancials={fiscalYear:2025,currentAssets:500,currentLiabilities:300,totalAssets:2000,retainedEarnings:400,
 ebit:250,totalLiabilities:1000,marketValueEquity:1500,bookEquity:1000,revenue:2400};

test('Altman variant follows industry and market-equity availability',()=>{
 assert.equal(altmanZ(base,'industrial').model,'Altman Z');
 assert.equal(altmanZ(base,'industrial').value,2.912);
 assert.equal(altmanZ(base,'industrial').zone,'grey');
 const noMarket={...base,marketValueEquity:undefined};
 assert.equal(altmanZ(noMarket,'industrial').model,"Altman Z'");
 assert.equal(altmanZ(noMarket,'industrial').value,2.247);
 assert.equal(altmanZ(base,'services').model,"Altman Z''");
 assert.equal(altmanZ(base,'services').value,3.198);
 assert.equal(altmanZ(base,'services').zone,'safe');
});
test('Altman never scores financial institutions and never fills missing inputs with zero',()=>{
 for(const i of ['bank','insurance','investment'] as const){const r=altmanZ(base,i);assert.equal(r.applicable,false);assert.equal(r.value,null);}
 const r=altmanZ({...base,retainedEarnings:undefined},'services');
 assert.equal(r.value,null);assert.deepEqual(r.missing,['retainedEarnings']);
 assert.equal(altmanZ({...base,totalLiabilities:0},'services').value,null);
});

const cur:AnnualFinancials={fiscalYear:2025,revenue:1200,costOfRevenue:700,receivables:180,currentAssets:600,ppeNet:900,totalAssets:2000,
 depreciation:90,sga:150,currentLiabilities:300,longTermDebt:500,operatingCashFlow:100,incomeContinuingOps:160,netIncome:160,sharesOutstanding:100};
const prev:AnnualFinancials={fiscalYear:2024,revenue:1000,costOfRevenue:600,receivables:120,currentAssets:550,ppeNet:850,totalAssets:1800,
 depreciation:85,sga:130,currentLiabilities:280,longTermDebt:450,operatingCashFlow:120,incomeContinuingOps:120,netIncome:120,sharesOutstanding:100};
const prevPrev:AnnualFinancials={fiscalYear:2023,totalAssets:1700};

test('Beneish M matches the independent reference and labels it a screen',()=>{
 const r=beneishM(cur,prev,'industrial');
 assert.equal(r.value,-1.891);assert.equal(r.zone,'not elevated');
 assert.match(r.notes.join(' '),/not evidence/);
});
test('Beneish M reports undefined indices and missing inputs instead of guessing',()=>{
 assert.deepEqual(beneishM({...cur,sga:undefined},prev,'industrial').missing,['current.sga']);
 const zero=beneishM(cur,{...prev,receivables:0},'industrial');
 assert.equal(zero.value,null);assert.match(zero.notes[0],/DSRI/);
 assert.equal(beneishM(cur,prev,'bank').applicable,false);
});
test('Piotroski F reports a 0–9 score only when all nine signals are evaluable',()=>{
 const partial=piotroskiF(cur,prev,undefined,'industrial');
 assert.equal(partial.value,null);
 assert.ok(partial.evaluated<9);
 const full=piotroskiF(cur,prev,{...prevPrev,totalAssets:1700},'industrial');
 // prior-year ROA and turnover need the prior-prior assets; prior-year revenue/assets come from prev.
 assert.equal(full.evaluated,9);
 // Signals: ROA>0 ✓, CFO>0 ✓, ΔROA (0.0889>0.0706) ✓, CFO>NI ✗, leverage 0.25 vs 0.25 ✗,
 // current ratio 2.0 vs 1.964 ✓, no issuance ✓, gross margin 0.4167 vs 0.4 ✓, turnover 0.667 vs 0.588 ✓ → 7.
 assert.equal(full.value,7);assert.equal(full.zone,'moderate');
});
