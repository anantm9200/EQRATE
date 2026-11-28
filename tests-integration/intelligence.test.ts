import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createAssessment,computeAssessment} from '../lib/assessment';
import {reviewAssessment,buildSensitivity,buildScenarios} from '../lib/research-intelligence';
import {runForensicIntelligence} from '../lib/forensic-intelligence';
import {analyzePortfolio} from '../lib/portfolio-intelligence';
import {calculateDcf} from '../lib/valuation';

const base=process.env.ENGINE_URL!,token=process.env.DGX_ENGINE_TOKEN!;
const post=async(p:string,body:unknown,auth=true)=>{
 const r=await fetch(base+p,{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+token}:{})},body:typeof body==='string'?body:JSON.stringify(body)});
 return {status:r.status,body:await r.json() as any};
};
const wire=<T>(x:T):T=>JSON.parse(JSON.stringify(x));
function sample(){
 const a=createAssessment('2026-11-01');
 a.id='assessment-int-1';a.name='Synthetic Integration Co';a.kind='listed';
 Object.assign(a.fields,{revenue:180,ebitda:24,netDebt:15,freeCashFlow:13,growthPct:6,discountPct:13,terminalPct:3,forecastYears:5,assets:120,liabilities:42,revenueMultiple:2.1,ebitdaMultiple:8,sharesMillions:10,sharePrice:40});
 a.evidence=[{id:'e1',title:'Registry',url:'https://example.org/r',kind:'official_filing',claim:'identity',asOf:'2026-01-01',notes:''}];
 return a;
}

test('engine computes assessment intelligence identically to the libraries',async()=>{
 const a=sample();
 const r=await post('/v1/intelligence/assessment',{assessment:wire(a),asOf:'2026-11-28'});
 assert.equal(r.status,200);
 assert.equal(r.body.computedBy,'creqor-dgx-engine');assert.equal(typeof r.body.methodology,'string');
 assert.deepEqual(r.body.result,wire(computeAssessment(a)));
 assert.deepEqual(r.body.review,wire(reviewAssessment(a,'2026-11-28')));
 assert.deepEqual(r.body.sensitivity,wire(buildSensitivity(a)));
 assert.deepEqual(r.body.scenarios,wire(buildScenarios(a)));
});
test('engine forensic and portfolio routes match the libraries',async()=>{
 const a=sample(),b={...sample(),id:'assessment-int-2',asOf:'2025-01-01'};
 const f=await post('/v1/intelligence/forensic',{assessment:wire(a),asOf:'2026-11-28'});
 assert.equal(f.status,200);assert.equal(f.body.computedBy,'creqor-dgx-engine');
 assert.deepEqual(f.body.report,wire(runForensicIntelligence(a,'2026-11-28')));
 const p=await post('/v1/intelligence/portfolio',{assessments:wire([a,b]),asOf:'2026-11-28'});
 assert.equal(p.status,200);assert.equal(p.body.computedBy,'creqor-dgx-engine');
 assert.deepEqual(p.body.portfolio,wire(analyzePortfolio([a,b])));
 assert.equal(p.body.summaries.length,2);
});
test('engine DCF batch matches the valuation library, including per-case errors',async()=>{
 const c={baseFreeCashFlow:100,annualGrowth:.06,discountRate:.11,terminalGrowth:.03,forecastYears:5,netDebt:25,sharesOutstanding:50};
 const r=await post('/v1/valuation/dcf',{cases:[c,{...c,discountRate:.02}]});
 assert.equal(r.status,200);assert.equal(r.body.computedBy,'creqor-dgx-engine');
 assert.deepEqual(r.body.results[0],{ok:true,result:wire(calculateDcf(c))});
 assert.equal(r.body.results[1].ok,false);assert.match(r.body.results[1].error,/Discount rate must exceed terminal growth/);
});
test('intelligence routes require the engine token, validate strictly and cap bodies at 250 KB',async()=>{
 assert.equal((await post('/v1/valuation/dcf',{cases:[]},false)).status,401);
 const bad=await post('/v1/intelligence/assessment',{assessment:{...wire(sample()),kind:'public'}});
 assert.equal(bad.status,400);assert.equal(bad.body.code,'BAD_ASSESSMENT');
 assert.equal((await post('/v1/intelligence/forensic','{not json')).status,400);
 const big=await post('/v1/intelligence/portfolio',JSON.stringify({assessments:[],pad:'x'.repeat(260_000)}));
 assert.equal(big.status,413);
 const get=await fetch(base+'/v1/intelligence/assessment',{headers:{Authorization:'Bearer '+token}});
 assert.equal(get.status,405);
});
