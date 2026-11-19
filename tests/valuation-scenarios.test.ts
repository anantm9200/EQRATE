import test from 'node:test';
import assert from 'node:assert/strict';
import {runValuation,type ValuationRequest} from '../lib/valuation-scenarios';
import {calculateDcf} from '../lib/valuation';

const src=(value:number,reference='0000000001-26-000001')=>({value,provenance:'source' as const,reference});
const base:ValuationRequest={
 currency:'USD',baseFreeCashFlow:src(100),forecastYears:5,
 cases:[{label:'bull',annualGrowthPct:8,discountPct:9,terminalGrowthPct:3},
  {label:'base',annualGrowthPct:5,discountPct:10,terminalGrowthPct:2.5},
  {label:'bear',annualGrowthPct:0,discountPct:12,terminalGrowthPct:1.5}],
 bridge:{totalDebt:src(300),cash:src(100)},sharesOutstanding:src(50)
};
test('bear/base/bull scenarios match the reference DCF and EV-to-equity bridge',()=>{
 const r=runValuation(base);
 assert.deepEqual(r.scenarios.map(s=>s.label),['bear','base','bull']);
 const ref=calculateDcf({baseFreeCashFlow:100,annualGrowth:.05,discountRate:.10,terminalGrowth:.025,forecastYears:5,netDebt:200,sharesOutstanding:50});
 const b=r.scenarios[1];
 assert.equal(b.enterpriseValue,ref.enterpriseValue);
 assert.equal(b.equityValue,ref.enterpriseValue-200);
 assert.equal(b.perShare,(ref.enterpriseValue-200)/50);
 assert.ok(Math.abs(b.presentValueOfForecast+b.presentValueOfTerminal-b.enterpriseValue)<1e-6);
 assert.ok(r.scenarios[0].equityValue<b.equityValue&&b.equityValue<r.scenarios[2].equityValue);
 assert.equal(r.bridge.enterpriseToEquityAdjustment,200);
 assert.equal(r.kind,'analyst-scenario');
 assert.match(r.disclosure,/Not market capitalisation/);
});
test('sensitivity matrix leaves undefined cells null instead of inventing values',()=>{
 const r=runValuation({...base,sensitivity:{discountPct:[8,10,3],terminalGrowthPct:[2,3,4]}});
 assert.equal(r.sensitivity!.equityValue.length,3);
 assert.equal(typeof r.sensitivity!.equityValue[2][0],'number','discount 3% > terminal 2%: defined');
 assert.equal(r.sensitivity!.equityValue[2][1],null,'discount 3% = terminal 3%: undefined');
 assert.equal(r.sensitivity!.equityValue[2][2],null,'discount 3% < terminal 4%: undefined');
 assert.ok((r.sensitivity!.equityValue[0][0] as number)>(r.sensitivity!.equityValue[1][0] as number),'higher discount lowers value');
 assert.ok((r.sensitivity!.equityValue[1][1] as number)>(r.sensitivity!.equityValue[1][0] as number),'higher terminal growth raises value');
});
test('multiples and net asset value use the same bridge and explicit inputs',()=>{
 const r=runValuation({...base,multiples:{metric:'ebitda',metricValue:src(80),low:6,mid:8,high:10},
  bookValue:{assets:src(1000),liabilities:src(600)}});
 assert.deepEqual(r.multiples!.enterpriseValue,{low:480,mid:640,high:800});
 assert.deepEqual(r.multiples!.equityValue,{low:280,mid:440,high:600});
 assert.equal(r.multiples!.perShare.mid,8.8);
 assert.equal(r.netAssetValue!.bookEquity,400);
 assert.equal(r.netAssetValue!.perShare,8);
});
test('no implied per-share value without an applicable share count',()=>{
 const r=runValuation({...base,sharesOutstanding:undefined});
 assert.equal(r.scenarios[1].perShare,null);
});
test('invalid or missing assumptions are rejected, never defaulted',()=>{
 assert.throws(()=>runValuation({...base,cases:[{label:'base',annualGrowthPct:5,discountPct:2,terminalGrowthPct:3}]}),/INVALID_CASE/);
 assert.throws(()=>runValuation({...base,bridge:{cash:src(1)}}),/INPUT_REQUIRED_TOTAL_DEBT/);
 assert.throws(()=>runValuation({...base,baseFreeCashFlow:{value:100,provenance:'source'}}),/SOURCE_REFERENCE_REQUIRED/);
 assert.throws(()=>runValuation({...base,sharesOutstanding:{value:0,provenance:'assumption'}}),/NON_POSITIVE/);
 assert.throws(()=>runValuation({...base,currency:'usd'}),/CURRENCY/);
 assert.throws(()=>runValuation({...base,cases:[base.cases[1],base.cases[1]]}),/DUPLICATE/);
 assert.throws(()=>runValuation({...base,multiples:{metric:'revenue',metricValue:src(1),low:5,mid:4,high:6}}),/MULTIPLES/);
 assert.throws(()=>runValuation({...base,baseFreeCashFlow:src(Number.NaN)}),/INVALID_BASE/);
});
