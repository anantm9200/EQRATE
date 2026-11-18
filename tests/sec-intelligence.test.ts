import {test} from 'node:test';
import assert from 'node:assert/strict';
import {analyseCompanyFacts} from '../lib/sec-intelligence';
const cik='0000320193';
type Row={val:number;start?:string;end:string;filed:string;form:string;accn:string};
const row=(val:number,year:number,duration:boolean,amended=false):Row=>({
 val,...(duration?{start:(year-1)+'-10-01'}:{}),end:year+'-09-30',
 filed:(year+1)+'-'+(amended?'01-20':'01-10'),
 form:amended?'10-K/A':'10-K',
 accn:'0000320193-'+String((year+1)%100).padStart(2,'0')+'-000123'
});
const group=(rows:Row[])=>({units:{USD:rows}});
const subject={name:'Synthetic SEC issuer',tickers:['TEST'],exchanges:['NASDAQ']};
function payload(rev=[100,120,105],net=[10,15,-5],cash=[12,8,-7]){
 const years=[2023,2024,2025];const make=(vals:number[],d=true)=>years.map((y,i)=>row(vals[i],y,d));
 return {cik:320193,facts:{'us-gaap':{
  RevenueFromContractWithCustomerExcludingAssessedTax:group(make(rev)),
  NetIncomeLoss:group(make(net)),OperatingIncomeLoss:group(make([11,17,-2])),
  NetCashProvidedByUsedInOperatingActivities:group(make(cash)),
  Assets:group(make([200,250,260],false)),
  StockholdersEquity:group(make([100,120,125],false)),
  CashAndCashEquivalentsAtCarryingValue:group(make([40,35,25],false))
 }}};
}
test('annual SEC observations preserve source accession and matching fiscal periods',()=>{
 const report=analyseCompanyFacts(payload(),cik,subject,'2026-11-18');
 assert.equal(report.periods.length,3);
 assert.deepEqual(report.periods.map(p=>p.end),['2025-09-30','2024-09-30','2023-09-30']);
 assert.equal(report.periods[0].metrics.revenue?.value,105);
 assert.equal(report.sources[0].authority,'U.S. Securities and Exchange Commission');
 assert.ok(report.sources.every(s=>s.url.startsWith('https://www.sec.gov/Archives/edgar/data/')));
 assert.equal(report.subject.cik,cik);
 assert.equal(report.latestPeriodEnd,'2025-09-30');
});
test('revenue changes and negative operating cash flow yield explainable warnings, not ratings',()=>{
 const report=analyseCompanyFacts(payload(),cik,subject,'2026-11-18');
 const growth=report.indicators.find(i=>i.id==='revenue-growth');
 assert.ok(Math.abs((growth?.value||0)-(-12.5))<1e-6);
 assert.equal(report.signals.find(s=>s.id==='revenue-contracting')?.level,'review');
 assert.equal(report.signals.find(s=>s.id==='net-loss')?.level,'attention');
 assert.equal(report.signals.find(s=>s.id==='negative-operating-cash')?.level,'attention');
 assert.ok(report.signals.every(s=>s.sourceIds.every(id=>report.sources.some(e=>e.id===id))));
 assert.equal('investmentRating' in report,false);
});
test('cash-profit divergence is only flagged for aligned positive profit periods',()=>{
 const x=payload([100,110,120],[4,4,10],[5,5,-3]);
 const report=analyseCompanyFacts(x,cik,subject,'2026-11-18');
 assert.ok(report.signals.some(s=>s.id==='profit-cash-divergence'));
 assert.ok(report.indicators.some(i=>i.id==='cash-conversion'&&i.value<0));
});
test('SEC restatements prefer latest filed row for the same period and same concept',()=>{
 const x=payload();
 x.facts['us-gaap'].RevenueFromContractWithCustomerExcludingAssessedTax.units.USD.push({...row(99,2025,true,true)});
 const report=analyseCompanyFacts(x,cik,subject,'2026-11-18');
 assert.equal(report.periods[0].metrics.revenue?.value,99);
 assert.equal(report.periods[0].metrics.revenue?.form,'10-K/A');
});
test('never compare mismatched 13-month periods or interpolate missing values',()=>{
 const x=payload();x.facts['us-gaap'].RevenueFromContractWithCustomerExcludingAssessedTax.units.USD[2].start='2024-08-01';
 const report=analyseCompanyFacts(x,cik,subject,'2026-11-18');
 assert.ok(!report.indicators.some(i=>i.id==='revenue-growth'));
 assert.ok(report.signals.some(s=>s.id==='latest-revenue-missing'));
 assert.equal(report.periods[0].end,'2025-09-30');
 assert.equal(report.periods[0].metrics.revenue,undefined);
});
test('missing supported metrics stay unavailable with coverage disclosures',()=>{
 const report=analyseCompanyFacts({cik:320193,facts:{'us-gaap':{}}},cik,subject,'2026-11-18');
 assert.equal(report.periods.length,0);
 assert.equal(report.indicators.length,0);
 assert.ok(report.signals.some(s=>s.id==='coverage-empty'));
});
test('CIK mismatch and invalid identifier are rejected before exposing signals',()=>{
 assert.throws(()=>analyseCompanyFacts(payload(),'not-a-cik',subject,'2026-11-18'),/INVALID_CIK/);
 assert.throws(()=>analyseCompanyFacts({cik:42},cik,subject,'2026-11-18'),/CIK_MISMATCH/);
});
