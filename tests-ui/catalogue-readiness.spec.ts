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

test('source catalogue ingestion requires the private cron credential',async({request})=>{
 const unauthenticated=await request.get('/api/ops/catalogue-sync');
 expect(unauthenticated.status()).toBe(401);
 const unauthorized=await request.post('/api/ops/catalogue-sync',{data:{country:'US',pages:2}});
 expect(unauthorized.status()).toBe(401);
});

test('indexed catalogue falls back to live discovery when a DB is absent',async({page})=>{
 await page.goto('/catalogue');
 await expect(page.getByRole('heading',{name:/Indexed companies/i})).toBeVisible();
 const status=await page.request.get('/api/catalogue/status');
 const body=await status.json();
 if(body.status!=='ready'){
  await expect(page.getByRole('link',{name:/Explore real companies/i})).toHaveAttribute('href','/directory');
  await expect(page.locator('.gd-company')).toHaveCount(0);
 }else{
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
