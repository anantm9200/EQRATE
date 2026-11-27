import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {Pool} from 'pg';

const base=process.env.ENGINE_URL!,token=process.env.DGX_ENGINE_TOKEN!;
const owner=new Pool({connectionString:process.env.OWNER_DATABASE_URL});
after(()=>owner.end());
const get=async(p:string)=>{const r=await fetch(base+p,{headers:{Authorization:'Bearer '+token}});return {status:r.status,body:await r.json() as any};};
const LEI='5493001KJTIIGC8Y1R12';

test('financial profile: point in time, citations, ratios, screens and confidence',async()=>{
 await owner.query(`INSERT INTO cq_lei_catalogue(lei,legal_name,source_url,source_payload,source_sha256) VALUES ($1,'EXAMPLE INDUSTRIES LIMITED',$2,'{}',repeat('e',64))`,[LEI,'https://search.gleif.org/#/record/'+LEI]);
 const doc=(await owner.query(`INSERT INTO cq_financial_documents(lei,source_id,document_type,fiscal_year,source_url,retrieval_path,retrieved_at,published_at,sha256,bytes,content_type,storage_path,status)
  VALUES ($1,'COMPANY_ANNUAL_REPORT','annual_report',2025,'https://example.invalid/ar25.pdf','operator-relay',now(),'2025-05-20',repeat('f',64),5000,'application/pdf','reports/x.pdf','facts_extracted') RETURNING document_id`,[LEI])).rows[0].document_id;
 const rows:[string,string,string,number,number][]=[['revenue','income','2025-03-31',120000,2025],['revenue','income','2024-03-31',110000,2024],
  ['netIncome','income','2025-03-31',22300,2025],['netIncome','income','2024-03-31',19700,2024],['totalAssets','balance','2025-03-31',100000,2025],
  ['bookEquity','balance','2025-03-31',60000,2025],['currentAssets','balance','2025-03-31',70000,2025],['currentLiabilities','balance','2025-03-31',28000,2025],
  ['nonCurrentLiabilities','balance','2025-03-31',12000,2025],['operatingCashFlow','cash_flow','2025-03-31',25000,2025]];
 for(const [c,st,pe,v,fy] of rows)await owner.query(`INSERT INTO cq_financial_observations(lei,document_id,original_label,normalized_concept,statement,period_type,period_end,fiscal_year,scope,currency,unit_label,unit_multiplier,source_value,normalized_value,page,extraction_method,extraction_confidence,review_status,known_at)
  VALUES ($1,$2,$3,$3,$4,$5,$6,$7,'consolidated','INR','crore',10000000,$8,$8::numeric*10000000,212,'deterministic_table',0.95,'validator_passed','2025-05-20')`,[LEI,doc,c,st,st==='balance'?'instant':'annual',pe,fy,v]);

 const before=await get('/v1/lei/'+LEI+'/financials?asOf=2025-01-01');
 assert.equal(before.status,200);assert.equal(before.body.available,false,'nothing was public before publication');
 const r=await get('/v1/lei/'+LEI+'/financials');
 assert.equal(r.status,200);assert.equal(r.body.available,true);assert.equal(r.body.scope,'consolidated');
 const fy25=r.body.reported.find((y:any)=>y.fiscalYear===2025);
 const rev=fy25.figures.find((f:any)=>f.concept==='revenue');
 assert.equal(rev.value,120000);assert.equal(rev.page,212);assert.equal(rev.sourceUrl,'https://example.invalid/ar25.pdf');
 const m=r.body.metrics.find((x:any)=>x.fiscalYear===2025);
 assert.ok(Math.abs(m.revenueGrowth-10000/110000)<1e-9);assert.ok(Math.abs(m.currentRatio-2.5)<1e-9);
 assert.equal(m.liabilitiesToEquity,40000/60000,'derived total liabilities = current + non-current');
 assert.equal(r.body.risk.altman.value,null);assert.ok(r.body.risk.altman.missing.includes('retainedEarnings'),'missing inputs named, not guessed');
 assert.equal(r.body.confidence.methodology,'creqor-confidence-v1');assert.ok(r.body.confidence.score>0);
 assert.equal((await get('/v1/lei/'+LEI+'/financials?asOf=not-a-date')).body.available,true,'invalid asOf falls back to now, never errors with data');
});
