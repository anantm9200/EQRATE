import {test,expect} from '@playwright/test';
test('global entity explorer accepts real-looking LEI data from API',async({page})=>{
 await page.route('**/api/lei/search?q=*',async route=>{
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
   source:'Global Legal Entity Identifier Foundation',total:1,published:'2026-11-17T08:00:00Z',
   results:[{lei:'12345678901234567890',name:'Example Corporation Ltd.',country:'IN',jurisdiction:'IN-MH',
    registrationStatus:'ISSUED',status:'ACTIVE',lastUpdate:'2026-11-17',nextRenewal:'2027-11-17',
    address:'Mumbai, India',headquarters:'Mumbai',registeredAs:'SYNTHETIC-001',category:'GENERAL',
    sourceUrl:'https://search.gleif.org/#/record/12345678901234567890'}]
  })});
 });
 await page.goto('/explore');
 await expect(page.getByRole('heading',{name:/Find the company/i})).toBeVisible();
 await page.getByRole('combobox',{name:/Search global LEI legal entity records/i}).fill('Example Corporation');
 await expect(page.locator('.lei-results')).toContainText('Example Corporation Ltd.');
 await expect(page.locator('.lei-results')).toContainText('12345678901234567890');
 await expect(page.locator('.lei-results')).toContainText('ISSUED');
 await expect(page.locator('.lei-results a').first()).toHaveAttribute('href','/lei/12345678901234567890');
});
test('global LEI explorer explains correctly that missing identity does not mean nonexistent',async({page})=>{
 await page.route('**/api/lei/search?q=*',async route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({results:[],total:0})}));
 await page.goto('/explore');
 await page.getByRole('combobox',{name:/Search global LEI legal entity records/i}).fill('Fictional Research Company');
 await expect(page.locator('.lei-result-empty')).toContainText('does not mean the company does not exist');
});
test('LEI API rejects invalid identifier with an explicit error',async({request})=>{
 const res=await request.get('/api/lei/NOT-VALID');
 expect(res.status()).toBe(400);
 const data=await res.json();
 expect(data.error).toMatch(/Invalid Legal Entity Identifier/);
});
test('production health response never leaks private DGX secrets',async({request})=>{
 const res=await request.get('/api/health');
 expect(res.ok()).toBeTruthy();
 const data=await res.json();
 expect(data.product).toBe('CREQOR');
 expect(typeof data.officialRegistryConfigured).toBe('boolean');
 expect(typeof data.privateIntelligenceConfigured).toBe('boolean');
 expect(JSON.stringify(data)).not.toMatch(/sk-|api_key|BEGIN PRIVATE KEY/i);
});
