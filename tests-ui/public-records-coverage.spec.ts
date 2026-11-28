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

test('SEC issuer area is disabled by policy and never lists or invents issuers',async({page})=>{
 await page.goto('/issuers');
 await expect(page.getByRole('heading',{name:/SEC issuer directory/i})).toBeVisible();
 await expect(page.getByText(/Disabled by policy/i)).toBeVisible();
 await expect(page.getByRole('heading',{name:/No SEC issuer records are shown/i})).toBeVisible();
 await expect(page.getByRole('link',{name:/Search the global company directory/i})).toHaveAttribute('href','/directory');
 await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content',/noindex/);
 await expect(page.locator('table')).toHaveCount(0);
 const api=await page.request.get('/api/issuers');
 expect(api.status()).toBe(410);
 const info=await api.json();
 expect(info.code).toBe('SEC_DISABLED');
 expect(info.note).toMatch(/\/api\/engine\//);
});
