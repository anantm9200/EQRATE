import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createAssessment,computeAssessment,type Assessment} from '../lib/assessment';
import {reviewAssessment,buildSensitivity,buildScenarios} from '../lib/research-intelligence';
import {runForensicIntelligence} from '../lib/forensic-intelligence';
import {analyzePortfolio} from '../lib/portfolio-intelligence';
import {portfolioSummary} from '../lib/intelligence-summary';
import {calculateDcf} from '../lib/valuation';
import {dgxEndpoint} from '../lib/dgx-gateway';
import {assessmentIntelligence,forensicIntelligence,portfolioIntelligence,dcfValuation,validateAssessment,IntelligenceInputError,COMPUTED_BY,METHODOLOGY} from '../services/dgx/intelligence-routes';

/** What the browser actually sends: the assessment after a JSON round trip. */
const wire=<T>(x:T):T=>JSON.parse(JSON.stringify(x));
function listed():Assessment{
 const a=createAssessment('2026-11-01');
 a.id='assessment-fixture-listed';a.name='Synthetic Listed Co';a.identifier='5493001KJTIIGC8Y1R12';a.kind='listed';a.industry='Manufacturing';
 Object.assign(a.fields,{revenue:180,ebitda:24,netDebt:15,freeCashFlow:13,growthPct:6,discountPct:13,terminalPct:3,forecastYears:5,
  assets:120,liabilities:42,revenueMultiple:2.1,ebitdaMultiple:8,sharesMillions:10,sharePrice:40,transactionConsideration:30,transactionStakePct:12});
 a.weights.revenueMultiple=2;a.weights.funding=NaN;
 a.ratings={financialStrength:70,growth:60,valuation:55,governance:80,marketPosition:40,resilience:65};
 a.evidence=[
  {id:'e1',title:'Registry',url:'https://example.org/registry',kind:'official_filing',claim:'identity',asOf:'2026-01-01',notes:''},
  {id:'e2',title:'Price',url:'https://example.org/quote',kind:'independent_third_party',claim:'share-price',asOf:'2023-05-01',notes:''},
  {id:'e3',title:'Price again',url:'https://example.org/quote',kind:'independent_third_party',claim:'share-price',asOf:'2023-05-01',notes:''},
  {id:'e4',title:'Bad link',url:'http://insecure.example/x',kind:'other',claim:'cash-flow',asOf:'not a date',notes:'x'}
 ];
 return a;
}
function unlisted():Assessment{
 const a=createAssessment('2025-06-30');
 a.id='assessment-fixture-unlisted';a.name='Synthetic Listed Co';a.identifier='5493001KJTIIGC8Y1R12';a.country='Namibia';
 Object.assign(a.fields,{revenue:60,ebitda:90,freeCashFlow:200,netDebt:-5,discountPct:3,terminalPct:4,growthPct:2,forecastYears:5,fundingAmount:20,fundingEquityPct:10});
 a.evidence=[{id:'u1',title:'Registry',url:'https://example.org/registry',kind:'user_provided',claim:'identity',asOf:'2025-06-01',notes:''}];
 return a;
}
const fixtures=[listed(),unlisted(),createAssessment('2026-11-28')];

test('assessment route returns exactly what the libraries compute',()=>{
 for(const a of fixtures){
  const sent=wire(a);
  const out=assessmentIntelligence({assessment:sent,asOf:'2026-11-28',sensitivity:{discountStep:.5,terminalStep:.25},scenarios:{growthShift:3,discountShift:1}});
  assert.equal(out.computedBy,COMPUTED_BY);assert.equal(out.methodology,METHODOLOGY.assessment);
  assert.deepEqual(out.result,computeAssessment(a));
  assert.deepEqual(out.review,reviewAssessment(a,'2026-11-28'));
  assert.deepEqual(out.sensitivity,buildSensitivity(a,.5,.25));
  assert.deepEqual(out.scenarios,buildScenarios(a,3,1));
  const defaults=assessmentIntelligence({assessment:sent});
  assert.deepEqual(defaults.sensitivity,buildSensitivity(a));assert.deepEqual(defaults.scenarios,buildScenarios(a));
 }
});
test('forensic route returns exactly the forensic library report',()=>{
 for(const a of fixtures){
  const out=forensicIntelligence({assessment:wire(a),asOf:'2026-11-28'});
  assert.equal(out.computedBy,COMPUTED_BY);assert.equal(out.methodology,METHODOLOGY.forensic);
  assert.deepEqual(out.report,runForensicIntelligence(a,'2026-11-28'));
 }
});
test('portfolio route returns the portfolio library output plus per-record summaries',()=>{
 const out=portfolioIntelligence({assessments:wire(fixtures),asOf:'2026-11-28'});
 assert.equal(out.computedBy,COMPUTED_BY);assert.equal(out.methodology,METHODOLOGY.portfolio);
 assert.deepEqual(out.portfolio,analyzePortfolio(fixtures));
 assert.deepEqual(out.summaries,fixtures.map(a=>portfolioSummary(a,'2026-11-28')));
 assert.ok(out.portfolio.alerts.length>0,'fixture exercises the cross-company rules');
});
test('DCF route returns the valuation library result or its exact error per case',()=>{
 const base={baseFreeCashFlow:100,annualGrowth:.06,discountRate:.11,terminalGrowth:.03,forecastYears:5,netDebt:25,sharesOutstanding:50};
 const cases=[base,{...base,discountRate:.03},{...base,forecastYears:40},{...base,netDebt:NaN},{...base,sharesOutstanding:undefined}];
 const out=dcfValuation(wire({cases}));
 assert.equal(out.computedBy,COMPUTED_BY);assert.equal(out.methodology,METHODOLOGY.dcf);
 cases.forEach((c,i)=>{
  let expected:unknown;
  try{expected={ok:true,result:calculateDcf(c)};}catch(e){expected={ok:false,error:(e as Error).message};}
  assert.deepEqual(out.results[i],expected,'case '+i);
 });
 assert.equal(out.results[3].ok,false,'a blank (null) input is reported as missing, as in the browser');
});
test('strict validation rejects malformed or oversized input',()=>{
 const good=wire(listed());
 const rejects=(fn:()=>unknown)=>assert.throws(fn,(e:unknown)=>e instanceof IntelligenceInputError);
 rejects(()=>assessmentIntelligence(null));
 rejects(()=>assessmentIntelligence([]));
 rejects(()=>assessmentIntelligence({assessment:good,extra:1}));
 rejects(()=>assessmentIntelligence({assessment:{...good,kind:'public'}}));
 rejects(()=>assessmentIntelligence({assessment:{...good,surprise:true}}));
 rejects(()=>assessmentIntelligence({assessment:{...good,fields:{...good.fields,revenue:'100'}}}));
 rejects(()=>assessmentIntelligence({assessment:{...good,active:['dcf','dcf']}}));
 rejects(()=>assessmentIntelligence({assessment:{...good,evidence:[{...good.evidence[0],claim:'rumour'}]}}));
 rejects(()=>assessmentIntelligence({assessment:{...good,name:'x'.repeat(251)}}));
 rejects(()=>assessmentIntelligence({assessment:good,sensitivity:{discountStep:7}}));
 rejects(()=>assessmentIntelligence({assessment:good,asOf:'yesterday'}));
 rejects(()=>forensicIntelligence({assessment:good,asOf:'2026-13-45'}));
 rejects(()=>portfolioIntelligence({assessments:Array(31).fill(good)}));
 rejects(()=>dcfValuation({cases:[]}));
 rejects(()=>dcfValuation({cases:Array(41).fill({})}));
 rejects(()=>dcfValuation({cases:[{baseFreeCashFlow:'1'}]}));
 rejects(()=>validateAssessment({...good,evidence:Array(81).fill(good.evidence[0])}));
});
test('gateway allow-lists the intelligence routes and the engine wires them before its 404',()=>{
 for(const p of ['/v1/intelligence/assessment','/v1/intelligence/forensic','/v1/intelligence/portfolio','/v1/valuation/dcf'])
  assert.equal(dgxEndpoint(p,'https://gw.example.com/').pathname,p);
 for(const p of ['/v1/intelligence/other','/v1/valuation/dcfx','/v1/intelligence'])
  assert.throws(()=>dgxEndpoint(p,'https://gw.example.com/'),/UNSUPPORTED_ROUTE/);
 const server=readFileSync('services/dgx/server.ts','utf8');
 assert.ok(server.indexOf('intelligenceRoute(')>server.indexOf('validToken(auth,token)'),'intelligence routes sit behind engine auth');
 assert.ok(server.indexOf('intelligenceRoute(')<server.lastIndexOf("json(res,404,{error:'Not found'})"));
});
test('website consumers fetch the engine and label browser fallback honestly',()=>{
 const hook=readFileSync('lib/use-engine.ts','utf8');
 assert.match(hook,/AbortController/);
 assert.match(hook,/ENGINE_DEBOUNCE_MS=300/);
 assert.match(hook,/Computed in your browser — private engine unreachable/);
 for(const c of ['assessment-workbench','analysis-cockpit','research-desk','forensic-intelligence-hub','forensic-report-panel','lab-client']){
  const src=readFileSync('components/'+c+'.tsx','utf8');
  assert.match(src,/EngineProvenance/,c);
  assert.doesNotMatch(src,/\b(computeAssessment|reviewAssessment|buildSensitivity|buildScenarios|runForensicIntelligence|analyzePortfolio|calculateDcf)\(/,c+' must not compute intelligence directly');
 }
});
