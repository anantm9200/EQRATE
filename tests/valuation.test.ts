import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateDcf,calculateMarketCap} from '../lib/valuation';
test('market cap uses applicable shares, not free float',()=>{
 assert.equal(calculateMarketCap(42,1_000_000),42_000_000);
 assert.throws(()=>calculateMarketCap(-1,100));
});
test('DCF formula discounts annual and terminal free cash flow correctly',()=>{
 const result=calculateDcf({baseFreeCashFlow:100,annualGrowth:0,discountRate:.1,terminalGrowth:0,forecastYears:1,netDebt:50,sharesOutstanding:10});
 assert.ok(Math.abs(result.enterpriseValue-1000)<1e-8);
 assert.ok(Math.abs(result.equityValue-950)<1e-8);
 assert.ok(Math.abs(result.impliedPerShare!-95)<1e-8);
});
test('net debt bridges enterprise to equity one time',()=>{
 const values={baseFreeCashFlow:80,annualGrowth:.05,discountRate:.12,terminalGrowth:.02,forecastYears:5};
 const a=calculateDcf({...values,netDebt:0});
 const b=calculateDcf({...values,netDebt:120});
 assert.equal(Math.round((a.equityValue-b.equityValue)*1e6)/1e6,120);
});
test('invalid terminal spread is rejected',()=>{
 assert.throws(()=>calculateDcf({baseFreeCashFlow:100,annualGrowth:.05,discountRate:.02,terminalGrowth:.03,forecastYears:5,netDebt:0}),/Discount rate/);
});
test('non-finite inputs and invalid share counts are rejected',()=>{
 const good={baseFreeCashFlow:100,annualGrowth:.02,discountRate:.1,terminalGrowth:.02,forecastYears:5,netDebt:0};
 assert.throws(()=>calculateDcf({...good,netDebt:NaN}),/finite/);
 assert.throws(()=>calculateDcf({...good,sharesOutstanding:0}),/Share count/);
});