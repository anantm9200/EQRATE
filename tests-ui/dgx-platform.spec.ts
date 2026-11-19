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
