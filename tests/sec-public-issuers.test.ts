import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSecIssuerSource,secSourceConfigured} from '../lib/sec-public-issuers';
const fixture={fields:['cik','name','ticker','exchange'],data:[
 [320193,'Apple Inc.','AAPL','Nasdaq'],
 [1045810,'NVIDIA CORP','NVDA','Nasdaq'],
 [320193,'Apple Inc.','AAPL','Nasdaq'],
 [1045810,'NVIDIA CORP','NVDA2','OTC'],
 [-5,'Not real','BAD','NYSE'],
 [320193,'','EMPTY','Nasdaq']
]};
test('SEC ticker file preserves source identities, ticker classes and de-duplicates exact pairs',()=>{
 const data=parseSecIssuerSource(fixture);
 assert.equal(data.length,3);
 assert.equal(data[0].cik,320193);
 assert.equal(data[0].ticker,'AAPL');
 assert.equal(data[0].sourceUrl,'https://www.sec.gov/files/company_tickers_exchange.json');
 assert.match(data[0].sourceFingerprint,/^[a-f0-9]{64}$/);
 assert.equal(data.filter(x=>x.cik===1045810).length,2);
});
test('SEC import refuses incompatible feeds and empty fabricated rows',()=>{
 assert.throws(()=>parseSecIssuerSource({fields:['name','cik'],data:fixture.data}),/SCHEMA_CHANGED/);
 assert.throws(()=>parseSecIssuerSource({fields:fixture.fields,data:[]}),/SOURCE_EMPTY/);
});
test('SEC identification must have explicit contact email, never made-up credentials',()=>{
 const original=process.env.SEC_USER_AGENT;
 try{
  delete process.env.SEC_USER_AGENT;
  assert.equal(secSourceConfigured(),false);
  process.env.SEC_USER_AGENT='CREQOR public intelligence contact@example.org';
  assert.equal(secSourceConfigured(),true);
 }finally{if(original===undefined)delete process.env.SEC_USER_AGENT;else process.env.SEC_USER_AGENT=original;}
});
