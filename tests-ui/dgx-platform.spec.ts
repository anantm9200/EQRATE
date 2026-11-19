import {test,expect} from '@playwright/test';

test('private DGX engine is honest about connectivity and never invents indexed counts',async({page})=>{
 await page.goto('/engine');
 await expect(page.getByRole('heading',{name:/Evidence at scale/i})).toBeVisible();
 const res=await page.request.get('/api/engine/status');
 expect(res.ok()).toBe(true);
 const status=await res.json();
 expect(typeof status.connected).toBe('boolean');
 if(!status.connected){
  await expect(page.getByText('Not yet connected')).toBeVisible();
  await expect(page.getByRole('link',{name:/Open live worldwide GLEIF search/i})).toHaveAttribute('href','/directory');
  await expect(page.locator('.cq-engine-stats')).toHaveCount(0);
 }else{
  await expect(page.getByLabel('Private DGX stored-record counts')).toBeVisible();
  expect(status.counts.leiEntities).toBeGreaterThanOrEqual(0);
 }
});
test('DGX research route requires analyst authentication before any model or database access',async({request})=>{
 const r=await request.post('/api/engine/research',{data:{cik:'0000320193',question:'Explain source coverage'}});
 expect(r.status()).toBe(401);
 const text=await r.text();
 expect(text).not.toMatch(/DGX_ENGINE_TOKEN|DATABASE_URL|postgresql:\/\//i);
});
test('private company search validates query bounds and fails safely when not connected',async({request})=>{
 const invalid=await request.get('/api/engine/search?q=a');
 expect(invalid.status()).toBe(400);
 const status=await (await request.get('/api/engine/status')).json();
 if(!status.connected){
  const offline=await request.get('/api/engine/search?q=Apple');
  expect(offline.status()).toBe(503);
  expect(await offline.text()).not.toContain('DGX_ENGINE_TOKEN');
 }
});
for(const width of [320,375,768,1440]){
 test('private engine page has no horizontal overflow at '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:850});
  await page.goto('/engine');
  await expect(page.getByRole('heading',{name:/Evidence at scale/i})).toBeVisible();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  expect(overflow).toBeLessThanOrEqual(2);
 });
}
test('connected engine: search, inspect provenance and identity leads, analyst research is token-gated',async({page,request})=>{
 const status=await (await request.get('/api/engine/status')).json();
 test.skip(!status.connected||!status.counts?.leiEntities,'requires a connected DGX with indexed records');
 await page.goto('/engine');
 await expect(page.getByLabel('Source freshness and backend health')).toBeVisible();
 await page.getByLabel('Search the private company index').fill('bank');
 await page.getByRole('button',{name:'Search records'}).click();
 const results=page.getByLabel('Source-linked indexed search results');
 await expect(results.locator('.cq-engine-result').first()).toBeVisible();
 await results.getByRole('button',{name:'Inspect'}).first().click();
 const detail=page.getByLabel('Indexed entity evidence');
 await expect(detail).toBeVisible();
 await expect(detail.getByText('Source publication')).toBeVisible();
 await expect(detail.getByRole('heading',{name:'Identity screening leads'})).toBeVisible();
 const lei=(await detail.locator('header .eyebrow').innerText()).replace('LEI ','').trim();
 expect(lei).toMatch(/^[A-Z0-9]{20}$/);
 const unauth=await request.post('/api/engine/lei/'+lei+'/research',{data:{question:'Summarise the identity evidence.'}});
 expect(unauth.status()).toBe(401);
 const api=await (await request.get('/api/engine/lei/'+lei)).json();
 expect(api.entity.lei).toBe(lei);
 expect(api.provenance.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
});
test('engine LEI and financial routes validate identifiers before contacting the DGX',async({request})=>{
 expect((await request.get('/api/engine/lei/not-an-lei')).status()).toBe(400);
 expect((await request.get('/api/engine/financials/abc')).status()).toBe(400);
 expect((await request.post('/api/engine/valuation/0',{data:{}})).status()).toBe(400);
});
test('India hub shows decoded Indian figures or an honest offline state, and searches by filter',async({page,request})=>{
 const status=await (await request.get('/api/engine/status')).json();
 await page.goto('/india');
 await expect(page.getByRole('heading',{name:/Every Indian company/i})).toBeVisible();
 if(!status.connected){await expect(page.getByText('India analytics are temporarily unavailable')).toBeVisible();return;}
 await expect(page.getByText('Indian legal entities',{exact:true})).toBeVisible();
 await expect(page.getByRole('figure').filter({hasText:'Indian legal entities by state / UT'})).toBeVisible();
 await expect(page.getByText('Maharashtra').first()).toBeVisible();
 await page.getByLabel('State / UT').selectOption('KA');
 await page.getByLabel('Listing (CIN)').selectOption('L');
 await expect(page.getByText(/matching entities/)).toBeVisible();
 const first=page.locator('.in-results a').first();
 await expect(first).toContainText(/Karnataka/);
 await first.click();
 await expect(page).toHaveURL(/\/lei\/[A-Z0-9]{20}$/);
 await expect(page.getByRole('heading',{name:/Corporate Identity Number decoded/})).toBeVisible();
 await expect(page.getByText('Listed',{exact:true})).toBeVisible();
});
test('India entity filters are validated before contacting the DGX',async({request})=>{
 expect((await request.get('/api/engine/india/entities?region=Karnataka')).status()).toBe(400);
 expect((await request.get('/api/engine/india/entities?listing=X')).status()).toBe(400);
 expect((await request.get('/api/engine/india/entities?page=9999')).status()).toBe(400);
 expect((await request.get('/api/engine/lei/short/group')).status()).toBe(400);
});
for(const width of [320,375,768,1440]){
 test('India hub has no horizontal overflow at '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:900});
  await page.goto('/india');
  await expect(page.getByRole('heading',{name:/Every Indian company/i})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(2);
 });
}
