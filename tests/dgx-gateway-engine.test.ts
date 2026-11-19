import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dgxEndpoint,rateLimited} from '../lib/dgx-gateway';
import {citationCheck,modelConfiguration} from '../services/dgx/server';

test('gateway accepts an HTTPS origin with a fixed base path and only allow-listed routes',()=>{
 assert.equal(dgxEndpoint('/v1/status','https://spark.example.ts.net/creqor-engine/').toString(),
  'https://spark.example.ts.net/creqor-engine/v1/status');
 assert.equal(dgxEndpoint('/v1/lei/529900T8BM49AURSDO55/research','https://gw.example.com/').toString(),
  'https://gw.example.com/v1/lei/529900T8BM49AURSDO55/research');
 assert.equal(dgxEndpoint('/v1/valuation/320193','https://gw.example.com/').pathname,'/v1/valuation/320193');
 for(const bad of ['http://gw.example.com/','https://gw.example.com/creqor-engine','https://u:p@gw.example.com/',
  'https://gw.example.com/?x=1','https://gw.example.com:8443/','https://gw.example.com/a b/','not a url'])
  assert.throws(()=>dgxEndpoint('/v1/status',bad),/REQUIRES_HTTPS/,bad);
 for(const route of ['/v1/admin','/v1/lei/short','/v1/financials/abc','/v1/search/../status','/health'])
  assert.throws(()=>dgxEndpoint(route,'https://gw.example.com/'),/UNSUPPORTED_ROUTE/,route);
});
test('public read limiter blocks after the configured budget',()=>{
 const key='test:'+Math.random();
 for(let i=0;i<3;i++)assert.equal(rateLimited(key,3),false);
 assert.equal(rateLimited(key,3),true);
});
test('model output citing identifiers absent from the evidence is rejected',()=>{
 const allowed=new Set(['0000320193-25-000079','529900T8BM49AURSDO55']);
 assert.deepEqual(citationCheck('Per 10-K 0000320193-25-000079, revenue rose.',allowed),{ok:true,unknown:[]});
 const bad=citationCheck('See filing 0000999999-24-000001 and LEI 5493001KJTIIGC8Y1R12.',allowed);
 assert.equal(bad.ok,false);
 assert.deepEqual(bad.unknown.sort(),['0000999999-24-000001','5493001KJTIIGC8Y1R12']);
});
test('inference endpoint must stay on loopback',()=>{
 const prev=process.env.DGX_VLLM_ENDPOINT;
 try{
  process.env.DGX_VLLM_ENDPOINT='http://127.0.0.1:8002/v1/chat/completions';
  assert.equal(modelConfiguration().endpoint.port,'8002');
  process.env.DGX_VLLM_ENDPOINT='http://10.0.0.5:8002/v1/chat/completions';
  assert.throws(()=>modelConfiguration(),/LOOPBACK/);
  process.env.DGX_VLLM_ENDPOINT='https://api.example.com/v1/chat/completions';
  assert.throws(()=>modelConfiguration(),/LOOPBACK/);
 }finally{if(prev===undefined)delete process.env.DGX_VLLM_ENDPOINT;else process.env.DGX_VLLM_ENDPOINT=prev;}
});
test('engine and ingest containers never receive the owner password or a shared env file',()=>{
 const compose=readFileSync('infrastructure/dgx/compose.yaml','utf8');
 assert.doesNotMatch(compose,/env_file/);
 const engine=compose.slice(compose.indexOf('  engine:'),compose.indexOf('  ingest:'));
 assert.doesNotMatch(engine,/CREQOR_DB_PASSWORD|CREQOR_INGEST_DB_PASSWORD/);
 assert.match(engine,/creqor_app:/);
 assert.match(compose.slice(compose.indexOf('  ingest:')),/creqor_ingest:/);
 assert.doesNotMatch(compose,/0\.0\.0\.0/);
 const migration=readFileSync('db/migrations/004_operational_platform.sql','utf8');
 assert.doesNotMatch(migration,/PASSWORD\s+'/i,'no credentials in migrations');
 assert.doesNotMatch(migration,/GRANT[^;]*DELETE/i,'runtime roles never get DELETE');
});
