import {test,expect} from '@playwright/test';

test('homepage distinguishes official global source coverage from zero locally indexed records',async({page})=>{
 await page.route('**/api/public-records/coverage',async r=>r.fulfill({status:200,
  contentType:'application/json',body:JSON.stringify({
   source:'GLEIF',referenceRecords:3497788,asOf:'2026-11-18 08:00:00',
   locallyIndexed:0,locallyIndexedOperational:false
  })}));
 await page.route('**/api/companies/featured',async r=>r.fulfill({status:200,
  contentType:'application/json',body:JSON.stringify({source:'GLEIF',records:[]})}));
 await page.goto('/');
 const coverage=page.getByRole('region',{name:/official public legal-entity dataset coverage/i});
 await expect(coverage).toContainText('3,497,788');
 await expect(coverage).toContainText(/not CREQOR's stored company count/i);
 await expect(coverage).toContainText(/bulk index not yet activated/i);
 await expect(page.getByRole('link',{name:/Explore official records/i})).toHaveAttribute('href','/directory');
});

test('public coverage source outage does not invent counts or block the homepage',async({page})=>{
 await page.route('**/api/public-records/coverage',async r=>r.fulfill({status:503,
  contentType:'application/json',body:JSON.stringify({error:'upstream unavailable'})}));
 await page.route('**/api/companies/featured',async r=>r.fulfill({status:200,
  contentType:'application/json',body:JSON.stringify({records:[]})}));
 await page.goto('/');
 await expect(page.getByRole('heading',{name:/Know the company/i})).toBeVisible();
 await expect(page.getByText('3,497,788')).toHaveCount(0);
});

test('coverage figures come from the private engine, never from a website-side GLEIF fetch',async({request})=>{
 const res=await request.get('/api/public-records/coverage');
 expect(res.ok()).toBeTruthy();
 const body=await res.json();
 expect(body.source).toBe('GLEIF');
 if(!body.locallyIndexedOperational){
  // Without the engine there is no publication metadata to report; nothing is fetched or estimated.
  expect(body.referenceRecords).toBeNull();
  expect(body.asOf).toBeNull();
  expect(body.locallyIndexed).toBe(0);
 }else{
  expect(body.indexLocation).toBe('private-engine');
  expect(body.locallyIndexed).toBeGreaterThan(0);
 }
});

test('SEC issuer area does not fabricate public companies when no database is connected',async({page})=>{
 await page.goto('/issuers');
 await expect(page.getByRole('heading',{name:/Real public issuers/i})).toBeVisible();
 const status=await page.request.get('/api/catalogue/status');
 const info=await status.json();
 if(info.status!=='ready'){
  await expect(page.getByText(/SEC issuer catalogue is ready to ingest/i)).toBeVisible();
  await expect(page.getByRole('link',{name:/Explore live GLEIF companies/i})).toHaveAttribute('href','/directory');
 }
});
