import {test,expect} from '@playwright/test';

/**
 * Account journey against the connected engine. Creates a throwaway account, adds a
 * company to the watchlist, exports data, then deletes the account (leaves no data).
 * Skips when the engine is not connected or does not offer accounts yet.
 */
test('sign up, watch a company, export and delete the account',async({page,request})=>{
 const status=await (await request.get('/api/engine/status')).json();
 test.skip(!status.connected,'requires a connected DGX engine');
 test.skip(!status.features?.accounts,'accounts not deployed on this engine');
 const email=`e2e-${Date.now()}-${Math.floor(Math.random()*1e6)}@example.com`,password='e2e research phrase '+Date.now();
 await page.goto('/signup?next=/lei/335800ZJKU9GPQRE2U66');
 await page.getByLabel('Name').fill('E2E Analyst');
 await page.getByLabel('Email').fill(email);
 await page.getByLabel('Password',{exact:true}).fill(password);
 await page.getByRole('button',{name:'Create account'}).click();
 await expect(page).toHaveURL(/\/lei\/335800ZJKU9GPQRE2U66/);
 await page.getByRole('button',{name:/Add to watchlist/}).click();
 await expect(page.getByRole('button',{name:/On your watchlist/})).toBeVisible();
 await page.goto('/account');
 await expect(page.getByRole('heading',{name:'E2E Analyst'})).toBeVisible();
 await expect(page.getByRole('link',{name:'335800ZJKU9GPQRE2U66'})).toBeVisible();
 const exported=await page.request.get('/api/account/export');
 expect(exported.status()).toBe(200);
 expect((await exported.json()).user.email).toBe(email);
 await page.getByRole('button',{name:'Delete my account…'}).click();
 await page.getByLabel('Confirm with your password').fill(password);
 await page.getByRole('button',{name:'Delete permanently'}).click();
 await expect(page).toHaveURL(/\/$/);
 await page.goto('/account');
 await expect(page).toHaveURL(/\/signin/);
});

test('account and workspace APIs refuse anonymous and cross-site requests',async({request,baseURL})=>{
 expect((await request.get('/api/workspace/items')).status()).toBe(401);
 expect((await request.get('/api/account/export')).status()).toBe(401);
 expect((await request.post('/api/workspace/items',{data:{kind:'note',title:'x',payload:{}},headers:{Origin:'https://evil.example'}})).status()).toBe(403);
 expect((await request.post('/api/account/register',{data:{email:'x@example.com',password:'x'},headers:{Origin:'https://evil.example'}})).status()).toBe(403);
 expect((await request.post('/api/account/delete',{data:{password:'x'},headers:{Origin:new URL(baseURL!).origin}})).status()).toBe(401);
});

test('sign-in rejects open redirects',async({page})=>{
 await page.goto('/signin?next=//evil.example/x');
 await expect(page.getByRole('heading',{name:'Sign in'})).toBeVisible();
 const hrefs=await page.locator('a[href*="signup"]').getAttribute('href');
 expect(hrefs).toBe('/signup?next='+encodeURIComponent('/account'));
});
