import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseSecFinancialHistory} from '../lib/sec-financial-history';
import {summarizeAnnualFinancials,scenarioFromReportedCashFlow} from '../lib/dgx-finance';
import {dgxGatewayConfigured,callDgxEngine} from '../lib/dgx-gateway';

const CIK=320193;
const endA='2025-09-27',startA='2024-09-29';
const endB='2024-09-28',startB='2023-10-01';
function record(value:number,form='10-K',periodEnd=endA,periodStart=startA,filed='2025-11-01'){
 return {val:value,start:periodStart,end:periodEnd,fy:2025,fp:'FY',
  form,accn:'0000320193-25-000101',filed};
}
const fixture={
 cik:CIK,facts:{'us-gaap':{
  RevenueFromContractWithCustomerExcludingAssessedTax:{units:{USD:[
   record(200),record(100,'10-K',endB,startB,'2024-11-01')]}},
  NetIncomeLoss:{units:{USD:[record(20)]}},
  NetCashProvidedByUsedInOperatingActivities:{units:{USD:[record(35)]}},
  PaymentsToAcquirePropertyPlantAndEquipment:{units:{USD:[record(15)]}},
  Assets:{units:{USD:[{val:400,end:endA,fy:2025,fp:'FY',form:'10-K',
   accn:'0000320193-25-000101',filed:'2025-11-01'}]}},
  OperatingIncomeLoss:{units:{USD:[{...record(99),val:null}]}}
 }}
};
test('official financial history preserves fiscal windows, accession, units and source',()=>{
 const facts=parseSecFinancialHistory(fixture,CIK);
 assert.ok(facts.length>=5);
 const row=facts.find(f=>f.concept==='RevenueFromContractWithCustomerExcludingAssessedTax'&&f.periodEnd===endA);
 assert.equal(row?.value,200);
 assert.equal(row?.periodStart,startA);
 assert.equal(row?.accession,'0000320193-25-000101');
 assert.equal(row?.unit,'USD');
 assert.equal(row?.sourceUrl,'https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json');
 assert.match(row?.sourceSha256||'',/^[a-f0-9]{64}$/);
 assert.ok(!facts.some(f=>f.concept==='OperatingIncomeLoss'),'null source value must never become zero');
});
test('reject wrong issuer identity and malformed source rows',()=>{
 assert.throws(()=>parseSecFinancialHistory(fixture,1045810),/BAD_IDENTITY/);
 const input=structuredClone(fixture);
 (input.facts['us-gaap'].Assets.units.USD as unknown[]).push({
  val:1e20,end:endA,fy:2025,fp:'FY',form:'10-K',accn:'0000320193-25-000101',filed:'2025-11-01'
 });
 const out=parseSecFinancialHistory(input,CIK);
 assert.ok(!out.some(r=>r.value===1e20),'unsafe integer precision must not enter calculations');
});
test('calculates comparable annual financials and free cash flow without invented prices',()=>{
 const facts=parseSecFinancialHistory(fixture,CIK);
 const annual=summarizeAnnualFinancials(facts);
 assert.equal(annual[0].periodEnd,endA);
 assert.equal(annual[0].reportedRevenue,200);
 assert.equal(annual[0].reportedNetIncome,20);
 assert.equal(annual[0].derivedFreeCashFlow,20);
 assert.equal(annual[0].revenueYoYPct,100);
 assert.equal(annual[0].netMarginPct,10);
 assert.equal(annual[0].sourceFacts.length,4);
 assert.equal('marketCap' in annual[0],false);
});
test('explicit-scenario DCF uses SEC sourced FCF but requires valid analyst assumptions',()=>{
 const [annual]=summarizeAnnualFinancials(parseSecFinancialHistory(fixture,CIK));
 const model=scenarioFromReportedCashFlow(annual,{annualGrowthPct:4,discountPct:11,
  terminalGrowthPct:2,forecastYears:5,netDebtUSD:4,sharesOutstanding:10});
 assert.equal(model.kind,'illustrative-dcf');
 assert.ok(model.equityValueUSD>0&&model.enterpriseValueUSD>0);
 assert.ok(model.disclosure.includes('not observed market capitalisation'));
 assert.throws(()=>scenarioFromReportedCashFlow(annual,{annualGrowthPct:8,discountPct:3,
  terminalGrowthPct:4,forecastYears:5,netDebtUSD:0}),/INVALID_SCENARIO/);
 assert.throws(()=>scenarioFromReportedCashFlow({...annual,derivedFreeCashFlow:null},{
  annualGrowthPct:4,discountPct:11,terminalGrowthPct:2,forecastYears:5,netDebtUSD:0}),
 /REPORTED_OPERATING_CASH_FLOW_AND_CAPEX_REQUIRED/);
});
test('private DGX gateway fails closed without a complete server-side configuration',async()=>{
 const previous={url:process.env.DGX_ENGINE_HTTPS_URL,token:process.env.DGX_ENGINE_TOKEN};
 try{
  delete process.env.DGX_ENGINE_HTTPS_URL;delete process.env.DGX_ENGINE_TOKEN;
  assert.equal(dgxGatewayConfigured(),false);
  await assert.rejects(()=>callDgxEngine('/v1/status'),/NOT_CONNECTED/);
  process.env.DGX_ENGINE_HTTPS_URL='http://example.invalid/';
  process.env.DGX_ENGINE_TOKEN='z'.repeat(40);
  await assert.rejects(()=>callDgxEngine('/v1/status'),/REQUIRES_HTTPS/);
 }finally{
  if(previous.url===undefined)delete process.env.DGX_ENGINE_HTTPS_URL;
  else process.env.DGX_ENGINE_HTTPS_URL=previous.url;
  if(previous.token===undefined)delete process.env.DGX_ENGINE_TOKEN;
  else process.env.DGX_ENGINE_TOKEN=previous.token;
 }
});
test('private stack binds loopback, keeps secrets out of Docker builds and excludes public raw model port',()=>{
 const compose=readFileSync('infrastructure/dgx/compose.yaml','utf8');
 const server=readFileSync('services/dgx/server.ts','utf8');
 const ignore=readFileSync('.dockerignore','utf8');
 assert.match(compose,/127\.0\.0\.1:5432:5432/);
 assert.match(compose,/DGX_ENGINE_BIND_HOST: "127\.0\.0\.1"/);
 assert.doesNotMatch(compose,/0\.0\.0\.0:8001|0\.0\.0\.0:8188/);
 assert.match(server,/timingSafeEqual/);
 assert.match(server,/PRIVATE_BIND_ADDRESS_REQUIRED/);
 assert.match(ignore,/\.env\.\*/);
});
