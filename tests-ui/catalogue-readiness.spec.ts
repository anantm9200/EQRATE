import {test,expect} from '@playwright/test';

test('source catalogue reports an honest readiness status and never invents a count',async({request})=>{
 const res=await request.get('/api/catalogue/status');
 expect(res.ok()).toBeTruthy();
 const body=await res.json();
 expect(body.source).toBe('GLEIF');
 expect(['ready','unconfigured','unavailable']).toContain(body.status);
 expect(typeof body.indexed).toBe('number');
 expect(body.indexed).toBeGreaterThanOrEqual(0);
 expect(body.verifiedFinancialStatements).toBe(false);
 expect(body.licensedMarketData).toBe(false);
 expect(body.creditRatings).toBe(false);
});

test('website catalogue ingestion is retired: the index is imported on the private engine',async({request})=>{
 const get=await request.get('/api/ops/catalogue-sync');
 expect(get.status()).toBe(410);
 expect((await get.json()).message).toMatch(/private engine/i);
 const post=await request.post('/api/ops/catalogue-sync',{data:{country:'US',pages:2}});
 expect(post.status()).toBe(410);
});

test('indexed catalogue is served by the private engine and falls back to discovery when it is absent',async({page})=>{
 await page.goto('/catalogue');
 await expect(page.getByRole('heading',{name:/Indexed companies/i})).toBeVisible();
 const status=await page.request.get('/api/catalogue/status');
 const body=await status.json();
 if(body.status!=='ready'){
  // Without the private engine, no count is shown and visitors are sent to the directory.
  await expect(page.getByRole('link',{name:/Explore real companies/i})).toHaveAttribute('href','/directory');
  await expect(page.getByText(/indexed legal entities/i)).toHaveCount(0);
  await expect(page.locator('.gd-company')).toHaveCount(0);
 }else{
  // The engine's stored count is shown as reported, and browsing reads the engine directory.
  expect(body.indexed).toBeGreaterThan(0);
  await expect(page.getByText(/indexed legal entities/i)).toBeVisible();
  await expect(page.getByRole('searchbox',{name:'Search global company directory'})).toBeVisible();
 }
});

test('saved research is never silently uploaded into the public entity catalogue',async({page})=>{
 await page.goto('/desk');
 const key='creqor.assessment-workspace.v1';
 await page.evaluate(k=>localStorage.setItem(k,JSON.stringify([{
  id:'assessment-synthetic-example',name:'SYNTHETIC PRIVATE WORKSPACE LTD',
  identifier:'PRIVATE-ONLY',country:'AE',kind:'unlisted',currency:'USD',asOf:'2026-11-18',
  fields:{revenue:12},evidence:[]
 }])),key);
 await page.goto('/catalogue');
 await expect(page.getByText('SYNTHETIC PRIVATE WORKSPACE LTD')).toHaveCount(0);
});
