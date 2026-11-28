import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {Pool} from 'pg';

const base=process.env.ENGINE_URL!,token=process.env.DGX_ENGINE_TOKEN!;
const owner=new Pool({connectionString:process.env.OWNER_DATABASE_URL});
after(()=>owner.end());
const get=async(p:string)=>{const r=await fetch(base+p,{headers:{Authorization:'Bearer '+token}});return {status:r.status,body:await r.json() as any};};
const lei=(prefix:string,i:number)=>prefix+String(i).padStart(14,'0');

async function insert(code:string,name:string,country:string,registration:string,extra:Record<string,string>={},entityStatus='ACTIVE'){
 const payload={lei:code,name,country,jurisdiction:country,status:entityStatus,registrationStatus:registration,lastUpdate:'2026-11-01',
  nextRenewal:'2027-11-01',registeredAs:'',category:'GENERAL',address:'',headquarters:'',sourceUrl:'https://search.gleif.org/#/record/'+code,...extra};
 await owner.query(`INSERT INTO cq_lei_catalogue(lei,legal_name,country_code,jurisdiction,entity_status,registration_status,source_url,source_payload,source_sha256)
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,repeat('a',64))`,[code,name,country,country,entityStatus,registration,payload.sourceUrl,JSON.stringify(payload)]);
}

before(async()=>{
 // An older and a partial (row-limited) run must not be reported as the latest publication.
 await owner.query(`INSERT INTO cq_bulk_source_runs(source,source_publish_date,source_reported_records,source_url,status,finished_at)
  VALUES ('GLEIF_GOLDEN_COPY','2026-11-20 08:00:00',3490000,'https://goldencopy.gleif.org/x','complete',now()-interval '7 days')`);
 await owner.query(`INSERT INTO cq_bulk_source_runs(source,source_publish_date,source_reported_records,source_url,status,finished_at,rows_read)
  VALUES ('GLEIF_GOLDEN_COPY','2026-11-27 08:00:00',3497788,'https://goldencopy.gleif.org/y','complete',now(),3497788)`);
 await owner.query(`INSERT INTO cq_bulk_source_runs(source,source_publish_date,source_reported_records,source_url,status,finished_at,row_limit)
  VALUES ('GLEIF_GOLDEN_COPY','2026-11-28 08:00:00',3499000,'https://goldencopy.gleif.org/z','complete',now(),1000)`);
 // Directory fixtures in a dedicated country code: 62 ISSUED and 3 LAPSED that sort first by name.
 for(let i=1;i<=62;i++)await insert(lei('ZZDIR0',i),'ZETA FIXTURE '+String(i).padStart(3,'0')+' LIMITED','ZZ','ISSUED');
 for(let i=1;i<=3;i++)await insert(lei('ZZLAP0',i),'AAA LAPSED FIXTURE '+i,'ZZ','LAPSED');
 // Featured fixtures: exact names (one ISSUED, one LAPSED duplicate), punctuation/case variants, near misses, Indian fill.
 await insert(lei('FTCS00',1),'TATA CONSULTANCY SERVICES LIMITED','IN','LAPSED');
 await insert(lei('FTCS00',2),'TATA CONSULTANCY SERVICES LIMITED','IN','ISSUED');
 await insert(lei('FINF00',1),'Infosys Limited','IN','ISSUED');
 await insert(lei('FAPL00',1),'APPLE INC','US','ISSUED');
 await insert(lei('FAPL00',2),'APPLE INC. EMPLOYEES CREDIT UNION','US','ISSUED');
 await insert(lei('FIND00',1),'BETA LISTED INDUSTRIES LIMITED','IN','ISSUED',{registeredAs:'L12345MH2001PLC123456'});
 await insert(lei('FIND00',2),'ALPHA UNLISTED PRIVATE LIMITED','IN','ISSUED',{registeredAs:'U12345MH2001PTC123456'});
 await insert(lei('FIND00',3),'AARDVARK LAPSED LIMITED','IN','LAPSED',{registeredAs:'L12345MH2001PLC654321'});
 await owner.query('REFRESH MATERIALIZED VIEW public.cq_india_entities');
});

test('directory: ISSUED first then name, 60 per page, exact totals and the latest full publication date',async()=>{
 const p1=await get('/v1/directory?country=zz');
 assert.equal(p1.status,200);
 assert.equal(p1.body.origin,'private-index');
 assert.equal(p1.body.source,'GLEIF');
 assert.equal(p1.body.pageSize,60);
 assert.equal(p1.body.total,65);
 assert.equal(p1.body.totalIsLowerBound,false);
 assert.equal(p1.body.results.length,60);
 assert.equal(p1.body.hasMore,true);
 assert.equal(p1.body.maxPage,200);
 assert.equal(p1.body.published,'2026-11-27 08:00:00','latest complete unlimited run, not the partial one');
 assert.ok(p1.body.results.every((e:any)=>e.registrationStatus==='ISSUED'),'LAPSED records never precede ISSUED ones');
 assert.equal(p1.body.results[0].name,'ZETA FIXTURE 001 LIMITED');
 assert.ok(p1.body.results[0].sourceUrl.startsWith('https://search.gleif.org/#/record/'));
 const p2=await get('/v1/directory?country=ZZ&page=2');
 assert.equal(p2.body.results.length,5);
 assert.equal(p2.body.hasMore,false);
 assert.deepEqual(p2.body.results.map((e:any)=>e.registrationStatus),['ISSUED','ISSUED','LAPSED','LAPSED','LAPSED']);
 assert.equal(p2.body.results[2].name,'AAA LAPSED FIXTURE 1');
 const seen=new Set([...p1.body.results,...p2.body.results].map((e:any)=>e.lei));
 assert.equal(seen.size,65,'pages neither overlap nor skip');
});
test('directory: name prefix filter is literal and invalid parameters are rejected',async()=>{
 const q=await get('/v1/directory?q='+encodeURIComponent('zeta fixture 06')+'&country=ZZ');
 assert.equal(q.status,200);
 assert.deepEqual(q.body.results.map((e:any)=>e.name),['ZETA FIXTURE 060 LIMITED','ZETA FIXTURE 061 LIMITED','ZETA FIXTURE 062 LIMITED']);
 assert.equal(q.body.total,3);
 assert.equal((await get('/v1/directory?q='+encodeURIComponent('zeta%')+'&country=ZZ')).body.total,0,'LIKE wildcards are escaped');
 for(const bad of ['page=0','page=201','page=abc','q=x','country=USA','q='+'y'.repeat(91)])
  assert.equal((await get('/v1/directory?'+bad)).status,400,bad);
 assert.equal((await get('/v1/directory?page=200&country=ZZ')).body.results.length,0,'deepest page is served, empty beyond the data');
});
test('featured: exact normalized names prefer ISSUED, then ISSUED Indian entities with listed CINs first',async()=>{
 const r=await get('/v1/featured');
 assert.equal(r.status,200);
 assert.equal(r.body.origin,'private-index');
 assert.equal(r.body.attempted,18);
 const leis=r.body.records.map((x:any)=>x.lei);
 assert.equal(new Set(leis).size,leis.length,'no duplicates');
 assert.ok(r.body.records.length<=32);
 const names=r.body.records.slice(0,r.body.resolved).map((x:any)=>x.name);
 assert.deepEqual(names,['TATA CONSULTANCY SERVICES LIMITED','Infosys Limited','APPLE INC'],'featured order, normalized exact names only');
 assert.equal(r.body.records[0].lei,lei('FTCS00',2),'ISSUED registration preferred over LAPSED duplicate');
 assert.ok(!leis.includes(lei('FAPL00',2)),'a similarly named entity is never substituted');
 const fill=r.body.records.slice(r.body.resolved);
 assert.ok(fill.length>=2);
 assert.ok(fill.every((x:any)=>x.country==='IN'&&x.registrationStatus==='ISSUED'),'fill is ISSUED Indian entities only');
 assert.ok(!leis.includes(lei('FIND00',3)),'LAPSED entities are not used to fill');
 assert.ok(leis.indexOf(lei('FIND00',1))<leis.indexOf(lei('FIND00',2)),'listed CIN before unlisted');
 assert.deepEqual(Object.keys(r.body.records[0]).sort(),['country','jurisdiction','lastUpdate','lei','name','registrationStatus','sourceUrl','status']);
});
test('status: latest Golden Copy publication metadata from cq_bulk_source_runs',async()=>{
 const r=await get('/v1/status');
 assert.equal(r.status,200);
 assert.equal(r.body.goldenCopy.publishDate,'2026-11-27 08:00:00');
 assert.equal(r.body.goldenCopy.officialRecords,3497788);
 assert.equal(r.body.goldenCopy.rowsRead,3497788);
 assert.ok(r.body.goldenCopy.importedAt);
});
