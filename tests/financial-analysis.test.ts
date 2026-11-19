import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeFinancials,type AnalysisFact} from '../lib/financial-analysis';
import {parseSecFinancialHistory} from '../lib/sec-financial-history';

const SRC='https://data.sec.gov/api/xbrl/companyfacts/CIK0000000001.json';
let seq=0;
function flow(concept:string,value:number,end:string,start:string,filed:string,form:AnalysisFact['form']='10-K',accession?:string):AnalysisFact{
 return {concept,value,periodStart:start,periodEnd:end,filed,form,unit:'USD',sourceUrl:SRC,
  accession:accession||('0000000001-'+filed.slice(2,4)+'-'+String(++seq).padStart(6,'0'))};
}
function instant(concept:string,value:number,end:string,filed:string,unit:'USD'|'shares'='USD',form:AnalysisFact['form']='10-K'):AnalysisFact{
 return {concept,value,periodStart:'',periodEnd:end,filed,form,unit,sourceUrl:SRC,accession:'0000000001-'+filed.slice(2,4)+'-'+String(++seq).padStart(6,'0')};
}
// Three fiscal years ending 31 Dec 2023/2024/2025.
const Y=[{end:'2025-12-31',start:'2025-01-01',filed:'2026-02-20'},{end:'2024-12-31',start:'2024-01-01',filed:'2025-02-20'},
 {end:'2023-12-31',start:'2023-01-01',filed:'2024-02-20'}];
function company():AnalysisFact[]{
 const rows:AnalysisFact[]=[];
 const data=[
  {rev:1200,cogs:700,oi:180,ni:120,ocf:200,capex:-50,da:40,int:10,assets:2000,liab:1200,eq:800,cash:150,ca:600,cl:400,ltd:500},
  {rev:1000,cogs:600,oi:200,ni:110,ocf:170,capex:-40,da:35,int:9,assets:1800,liab:1100,eq:700,cash:120,ca:550,cl:380,ltd:300},
  {rev:800,cogs:500,oi:120,ni:70,ocf:100,capex:-30,da:30,int:8,assets:1500,liab:950,eq:550,cash:90,ca:500,cl:350,ltd:280}];
 data.forEach((d,i)=>{const y=Y[i];
  rows.push(flow('Revenues',d.rev,y.end,y.start,y.filed),flow('CostOfRevenue',d.cogs,y.end,y.start,y.filed),
   flow('OperatingIncomeLoss',d.oi,y.end,y.start,y.filed),flow('NetIncomeLoss',d.ni,y.end,y.start,y.filed),
   flow('NetCashProvidedByUsedInOperatingActivities',d.ocf,y.end,y.start,y.filed),
   flow('PaymentsToAcquirePropertyPlantAndEquipment',d.capex,y.end,y.start,y.filed),
   flow('DepreciationDepletionAndAmortization',d.da,y.end,y.start,y.filed),flow('InterestExpense',d.int,y.end,y.start,y.filed),
   instant('Assets',d.assets,y.end,y.filed),instant('Liabilities',d.liab,y.end,y.filed),instant('StockholdersEquity',d.eq,y.end,y.filed),
   instant('CashAndCashEquivalentsAtCarryingValue',d.cash,y.end,y.filed),instant('AssetsCurrent',d.ca,y.end,y.filed),
   instant('LiabilitiesCurrent',d.cl,y.end,y.filed),instant('LongTermDebt',d.ltd,y.end,y.filed));
  // quarterly noise that must never enter annual figures
  rows.push(flow('Revenues',d.rev/4,y.end,y.end.slice(0,4)+'-10-01',y.filed,'10-Q'));
 });
 rows.push({...instant('EntityCommonStockSharesOutstanding',100,'2026-02-10','2026-02-20','shares'),concept:'EntityCommonStockSharesOutstanding'});
 return rows;
}
test('annual analysis computes margins, returns, liquidity, leverage and growth exactly',()=>{
 const a=analyzeFinancials(company(),{asOf:'2026-06-30'});
 assert.equal(a.periods.length,3);
 const p=a.periods[0];
 assert.equal(p.periodEnd,'2025-12-31');
 assert.equal(p.reported.revenue?.value,1200,'quarterly facts must not replace annual revenue');
 assert.equal(p.derived.grossProfit.value,500);
 assert.equal(p.derived.ebitda.value,220);
 assert.equal(p.derived.freeCashFlow.value,150);
 assert.equal(p.derived.totalDebt.value,500);
 assert.equal(p.derived.netDebt.value,350);
 assert.equal(p.derived.workingCapital.value,200);
 assert.equal(p.ratios.grossMarginPct.value?.toFixed(4),(500/1200*100).toFixed(4));
 assert.equal(p.ratios.operatingMarginPct.value,15);
 assert.equal(p.ratios.netMarginPct.value,10);
 assert.equal(p.ratios.returnOnEquityPct.value?.toFixed(6),(120/750*100).toFixed(6),'ROE uses average equity');
 assert.equal(p.ratios.currentRatio.value,1.5);
 assert.equal(p.ratios.revenueGrowthPct.value,20);
 assert.equal(p.ratios.debtGrowthPct.value?.toFixed(4),(200/300*100).toFixed(4));
 assert.equal(p.ratios.interestCoverage.value,18);
 assert.equal(p.ratios.workingCapitalChange.value,30);
 assert.equal(p.reported.sharesOutstanding?.value,100);
 assert.equal(a.trends.revenueCagr3yPct.value,null,'3y CAGR needs four annual periods');
 assert.deepEqual(a.trends.revenueCagr3yPct.missing,['4 annual periods']);
});
test('missing inputs are reported as missing, never converted to zero',()=>{
 const rows=company().filter(f=>!(f.concept==='PaymentsToAcquirePropertyPlantAndEquipment'&&f.periodEnd==='2025-12-31'));
 const p=analyzeFinancials(rows,{asOf:'2026-06-30'}).periods[0];
 assert.equal(p.derived.freeCashFlow.value,null);
 assert.deepEqual(p.derived.freeCashFlow.missing,['capex']);
 assert.equal(p.ratios.fcfMarginPct.value,null);
 assert.ok(p.ratios.fcfMarginPct.missing.includes('freeCashFlow'));
});
test('restatements use the latest filing and are surfaced as signals',()=>{
 const rows=company();
 rows.push(flow('Revenues',1100,'2024-12-31','2024-01-01','2026-02-20','10-K'));// restated in next 10-K
 const a=analyzeFinancials(rows,{asOf:'2026-06-30'});
 const p2024=a.periods.find(p=>p.periodEnd==='2024-12-31')!;
 assert.equal(p2024.reported.revenue?.value,1100);
 assert.equal(p2024.reported.revenue?.restated,true);
 assert.equal(p2024.reported.revenue?.originalValue,1000);
 assert.ok(a.signals.some(s=>s.code==='RESTATED_VALUE'&&s.periodEnd==='2024-12-31'));
 assert.equal(a.coverage.restatedValues>=1,true);
});
test('forensic signals: profit without cash, debt surge, margin deterioration, stale disclosure',()=>{
 const rows=company().map(f=>f.concept==='NetCashProvidedByUsedInOperatingActivities'&&f.periodEnd==='2025-12-31'?{...f,value:-20}:f);
 const a=analyzeFinancials(rows,{asOf:'2027-09-30'});
 const codes=a.signals.map(s=>s.code);
 assert.ok(codes.includes('PROFIT_WITHOUT_OPERATING_CASH'));
 assert.ok(codes.includes('DEBT_SURGE'));
 assert.ok(codes.includes('OPERATING_MARGIN_DETERIORATION'));
 assert.ok(codes.includes('STALE_DISCLOSURE'));
 assert.equal(a.signals[0].severity,'high');
});
test('no annual history yields a data-quality signal rather than invented figures',()=>{
 const a=analyzeFinancials([flow('Revenues',10,'2025-03-31','2025-01-01','2025-05-01','10-Q')]);
 assert.equal(a.periods.length,0);
 assert.equal(a.signals[0].code,'NO_ANNUAL_HISTORY');
});
test('expanded SEC concept set is parsed with correct units',()=>{
 const doc={cik:1,facts:{'us-gaap':{GrossProfit:{units:{USD:[{val:5,start:'2025-01-01',end:'2025-12-31',fy:2025,fp:'FY',form:'10-K',accn:'0000000001-26-000001',filed:'2026-02-01'}]}}},
  dei:{EntityCommonStockSharesOutstanding:{units:{shares:[{val:42,end:'2026-01-31',fy:2025,fp:'FY',form:'10-K',accn:'0000000001-26-000001',filed:'2026-02-01'}]}}}}};
 const facts=parseSecFinancialHistory(doc,1);
 assert.equal(facts.find(f=>f.concept==='GrossProfit')?.unit,'USD');
 assert.equal(facts.find(f=>f.concept==='EntityCommonStockSharesOutstanding')?.unit,'shares');
});
