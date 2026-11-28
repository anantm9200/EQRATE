import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {Pool} from 'pg';
import {createHash} from 'node:crypto';

const base=process.env.ENGINE_URL!,token=process.env.DGX_ENGINE_TOKEN!;
const owner=new Pool({connectionString:process.env.OWNER_DATABASE_URL});
after(()=>owner.end());
const post=async(body:unknown,auth=true)=>{
 const r=await fetch(base+'/v1/compare',{method:'POST',headers:{...(auth?{Authorization:'Bearer '+token}:{}),'Content-Type':'application/json'},body:JSON.stringify(body)});
 return {status:r.status,body:await r.json() as any};
};
// Distinct from the LEIs used by other integration test files (they share one database).
const A='5493009CMPAAAAAAAA11',B='5493009CMPBBBBBBBB22',C='5493009CMPCCCCCCCC33',UNKNOWN='5493009CMPZZZZZZZZ99';

async function company(lei:string,name:string){
 await owner.query(`INSERT INTO cq_lei_catalogue(lei,legal_name,country_code,source_url,source_payload,source_sha256) VALUES ($1,$2,'IN',$3,'{}',repeat('c',64))`,
  [lei,name,'https://search.gleif.org/#/record/'+lei]);
}
async function figures(lei:string,currency:string,rows:[string,string,string,number,number][]){
 const doc=(await owner.query(`INSERT INTO cq_financial_documents(lei,source_id,document_type,fiscal_year,source_url,retrieval_path,retrieved_at,published_at,sha256,bytes,content_type,storage_path,status)
  VALUES ($1,'COMPANY_ANNUAL_REPORT','annual_report',2025,$2,'operator-relay',now(),'2025-05-20',$3,5000,'application/pdf',$4,'facts_extracted') RETURNING document_id`,
  [lei,'https://example.invalid/'+lei+'.pdf',createHash('sha256').update(lei).digest('hex'),'reports/'+lei+'.pdf'])).rows[0].document_id;
 for(const [c,st,pe,v,fy] of rows)await owner.query(`INSERT INTO cq_financial_observations(lei,document_id,original_label,normalized_concept,statement,period_type,period_end,fiscal_year,scope,currency,unit_label,unit_multiplier,source_value,normalized_value,page,extraction_method,extraction_confidence,review_status,known_at)
  VALUES ($1,$2,$3,$3,$4,$5,$6,$7,'consolidated',$9,'crore',10000000,$8,$8::numeric*10000000,101,'deterministic_table',0.95,'validator_passed','2025-05-20')`,
  [lei,doc,c,st,st==='balance'?'instant':'annual',pe,fy,v,currency]);
}

before(async()=>{
 await company(A,'COMPARE ALPHA LIMITED');await company(B,'COMPARE BETA LIMITED');await company(C,'COMPARE GAMMA LIMITED');
 await figures(A,'INR',[['revenue','income','2025-03-31',1000,2025],['revenue','income','2024-03-31',800,2024],['netIncome','income','2025-03-31',100,2025],
  ['totalAssets','balance','2025-03-31',2000,2025],['bookEquity','balance','2025-03-31',500,2025]]);
 await figures(B,'INR',[['revenue','income','2025-03-31',4000,2025],['netIncome','income','2025-03-31',-200,2025],['currentAssets','balance','2025-03-31',900,2025],
  ['currentLiabilities','balance','2025-03-31',300,2025]]);
});

test('compare aligns fiscal years across two companies and marks every gap explicitly',async()=>{
 const r=await post({leis:[A,B]});
 assert.equal(r.status,200);
 assert.equal(r.body.comparable,true);
 assert.deepEqual(r.body.leis,[A,B]);
 assert.deepEqual(r.body.fiscalYears,[2025,2024],'union of fiscal years, latest first');
 assert.deepEqual(r.body.companies.map((c:any)=>[c.name,c.available,c.currency,c.scope]),
  [['COMPARE ALPHA LIMITED',true,'INR','consolidated'],['COMPARE BETA LIMITED',true,'INR','consolidated']]);
 const metric=(k:string)=>r.body.metrics.find((m:any)=>m.metric===k);
 const rev25=metric('revenue').years.find((y:any)=>y.fiscalYear===2025).values;
 assert.equal(rev25[0].status,'reported');assert.equal(rev25[0].value,1000*1e7,'absolute normalized value');
 assert.equal(rev25[0].page,101);assert.equal(rev25[0].sourceUrl,'https://example.invalid/'+A+'.pdf');
 assert.equal(rev25[1].value,4000*1e7);
 const rev24=metric('revenue').years.find((y:any)=>y.fiscalYear===2024).values;
 assert.equal(rev24[0].value,800*1e7);
 assert.deepEqual(rev24[1],{value:null,status:'not_reported'},'B has no FY2024 — a gap, never zero');
 const ta=metric('totalAssets').years.find((y:any)=>y.fiscalYear===2025).values;
 assert.equal(ta[1].status,'not_reported');assert.equal(ta[1].value,null);
 assert.ok(r.body.gaps.some((g:any)=>g.lei===B&&g.metric==='totalAssets'&&g.fiscalYear===2025&&g.status==='not reported'));
 assert.ok(!r.body.gaps.some((g:any)=>g.lei===A&&g.metric==='revenue'),'reported figures are not listed as gaps');
 const margin=metric('netMargin').years.find((y:any)=>y.fiscalYear===2025).values;
 assert.equal(margin[0].status,'computed');assert.ok(Math.abs(margin[0].value-0.1)<1e-12);
 assert.ok(Math.abs(margin[1].value-(-0.05))<1e-12);
 const cr=metric('currentRatio').years.find((y:any)=>y.fiscalYear===2025).values;
 assert.deepEqual(cr[0],{value:null,status:'not_computable'},'missing inputs: no ratio');
 assert.ok(Math.abs(cr[1].value-3)<1e-12);
 const growth=metric('revenueGrowth').years.find((y:any)=>y.fiscalYear===2025).values;
 assert.ok(Math.abs(growth[0].value-0.25)<1e-12);assert.equal(growth[1].status,'not_computable');
 assert.deepEqual(r.body.caveats,[]);
});

test('compare is honest when a company has no reviewed financials: no figures, explicit reason',async()=>{
 const r=await post({leis:[A,C]});
 assert.equal(r.status,200);
 assert.equal(r.body.comparable,false);
 const gamma=r.body.companies[1];
 assert.equal(gamma.available,false);assert.match(gamma.reason,/No reviewed financial statements/);
 assert.deepEqual(gamma.fiscalYears,[]);
 for(const m of r.body.metrics)for(const y of m.years)assert.deepEqual(y.values[1],{value:null,status:'not_reported'});
 assert.match(r.body.note,/never estimated/);
 const none=await post({leis:[B,C],asOf:'2025-01-01'});
 assert.equal(none.status,200);
 assert.equal(none.body.comparable,false,'nothing was public before publication');
 assert.deepEqual(none.body.fiscalYears,[]);
 assert.ok(none.body.companies.every((c:any)=>c.available===false));
 assert.match(none.body.note,/either company/);
});

test('compare rejects malformed, duplicate and unindexed requests',async()=>{
 assert.equal((await post({leis:[A,B]},false)).status,401);
 assert.equal((await post({leis:[A]})).status,400);
 assert.equal((await post({leis:[A,B,C]})).status,400);
 assert.equal((await post({leis:[A,'short']})).status,400);
 assert.equal((await post({leis:[A,A.toLowerCase()]})).status,400,'same company twice');
 assert.equal((await post({leis:[A,B],asOf:'yesterday'})).status,400);
 assert.equal((await post([A,B])).status,400);
 const missing=await post({leis:[A,UNKNOWN]});
 assert.equal(missing.status,404);
});
