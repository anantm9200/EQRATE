import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {dgxEndpoint} from '../lib/dgx-gateway';
import {parseCompareRequest,COMPARE_REPORTED,COMPARE_RATIOS} from '../services/dgx/compare-routes';

const A='5493009CMPAAAAAAAA11',B='5493009CMPBBBBBBBB22';
test('compare request accepts exactly two distinct LEIs and an optional ISO date',()=>{
 assert.deepEqual(parseCompareRequest({leis:[A,B.toLowerCase()]}),{leis:[A,B],asOf:undefined});
 assert.deepEqual(parseCompareRequest({leis:[A,B],asOf:'2025-03-31'}),{leis:[A,B],asOf:'2025-03-31'});
 for(const bad of [null,[],[A,B],{},{leis:[A]},{leis:[A,B,A]},{leis:[A,'short']},{leis:[A,7]},{leis:'x'}])
  assert.throws(()=>parseCompareRequest(bad),/^Error: BAD_/,JSON.stringify(bad));
 assert.throws(()=>parseCompareRequest({leis:[A,A.toLowerCase()]}),/BAD_COMPARE_SAME_LEI/);
 for(const asOf of ['2025-13-45','yesterday',20250331])assert.throws(()=>parseCompareRequest({leis:[A,B],asOf}),/BAD_AS_OF/);
});
test('compare covers reported figures and ratios already produced by the financial profile',()=>{
 assert.deepEqual(COMPARE_REPORTED.map(x=>x.key),['revenue','netIncome','operatingCashFlow','totalAssets','totalLiabilities','bookEquity','currentAssets','currentLiabilities']);
 const profile=readFileSync('services/dgx/financials.ts','utf8');
 for(const r of COMPARE_RATIOS)assert.match(profile,new RegExp(r.key+':'),r.key+' must come from financialProfile metrics');
});
test('the gateway allows the compare route and the engine wires it to compare-routes',()=>{
 assert.equal(dgxEndpoint('/v1/compare','https://gw.example.com/').pathname,'/v1/compare');
 assert.throws(()=>dgxEndpoint('/v1/compare/extra','https://gw.example.com/'),/UNSUPPORTED_ROUTE/);
 const server=readFileSync('services/dgx/server.ts','utf8');
 assert.match(server,/req\.method==='POST'&&url\.pathname==='\/v1\/compare'.*compareCompanies\(/);
});
test('compare UI is served from the private engine, never from SEC routes',()=>{
 const client=readFileSync('components/compare-client.tsx','utf8');
 assert.match(client,/\/api\/engine\/search/);assert.match(client,/\/api\/engine\/compare/);assert.match(client,/\/api\/engine\/lei\//);
 assert.doesNotMatch(client,/\/api\/search|\/api\/company\/|\bSEC\b|\bCIK\b/);assert.doesNotMatch(client,/ticker/i);
});
test('SEC routes answer 410 Gone and SEC-only pages are retired',()=>{
 for(const f of ['app/api/search/route.ts','app/api/issuers/route.ts','app/api/company/[cik]/facts/route.ts'])
  assert.match(readFileSync(f,'utf8'),/secGone\(\)/,f);
 const gone=readFileSync('lib/sec-disabled.ts','utf8');
 assert.match(gone,/status:410/);assert.match(gone,/\/api\/engine\//);
 assert.match(readFileSync('app/company/[cik]/page.tsx','utf8'),/permanentRedirect\('\/directory'\)/);
 assert.doesNotMatch(readFileSync('app/explore/page.tsx','utf8'),/components\/search'|\bCompanySearch\b/);
 assert.doesNotMatch(readFileSync('components/site-shell.tsx','utf8'),/['"]\/(issuers|company)['"/]/);
 for(const f of ['lib/sec.ts','lib/sec-facts.ts','components/search.tsx'])assert.equal(existsSync(f),false,f+' removed: SEC collection is disabled');
});
