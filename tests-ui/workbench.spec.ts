import {test,expect} from '@playwright/test';

test("workbench opens and models a private company’s revenue and EBITDA values",async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await page.goto('/workbench');
 await expect(page.getByRole('heading',{name:/Research a company/i})).toBeVisible();
 await page.getByPlaceholder('Enter company name').fill('Synthetic Test Entity');
 await page.getByRole('tab',{name:/02 Valuation/i}).click();
 await page.getByLabel('Annual revenue').fill('100');
 await page.getByLabel('Annual EBITDA').fill('20');
 await page.getByLabel('Net debt / equity adjustments').fill('25');
 await page.getByLabel('EV / revenue multiple').fill('3');
 await page.getByLabel('EV / EBITDA multiple').fill('8');
 await page.getByRole('tab',{name:/06 Report/i}).click();
 await expect(page.getByRole('heading',{name:'Valuation methods'})).toBeVisible();
 const rows=page.locator('.wk-table-wrap tbody tr');
 await expect(rows.filter({hasText:'Revenue multiple'})).toContainText('275');
 await expect(rows.filter({hasText:'EBITDA multiple'})).toContainText('135');
 await expect(page.getByText(/DRAFT ANALYST ESTIMATE/i).first()).toBeVisible();
 await page.screenshot({path:'test-results/screenshots/workbench-desktop.png',fullPage:true});
});
test('workbench persists a user assessment locally and reloads it',async({page})=>{
 await page.goto('/workbench');
 await page.getByPlaceholder('Enter company name').fill('Synthetic Saved Co');
 await page.getByRole('button',{name:'Save locally'}).click();
 await expect(page.getByRole('status')).toContainText(/saved locally/i);
 await page.reload();
 const savedId=await page.locator('#wk-saved option').last().getAttribute('value');
 await page.getByLabel('Open saved company assessment').selectOption(savedId!);
 await expect(page.getByPlaceholder('Enter company name')).toHaveValue('Synthetic Saved Co');
});
test('evidence register accepts HTTPS records and preserves status as user supplied',async({page})=>{
 await page.goto('/workbench');
 await page.getByRole('tab',{name:/04 Evidence/i}).click();
 await page.getByPlaceholder('e.g. FY2025 audited accounts').fill('Synthetic audited accounts');
 await page.getByPlaceholder('https://…').fill('https://example.org/document');
 await page.locator('.wk-evidence-form input[type=date]').fill('2025-12-31');
 await page.getByRole('button',{name:'+ Record evidence'}).click();
 await expect(page.getByText('Synthetic audited accounts')).toBeVisible();
 await expect(page.getByRole('status')).toContainText(/not been independently verified/i);
 await page.getByRole('tab',{name:/06 Report/i}).click();
 await expect(page.locator('.wk-report-sources')).toContainText('Synthetic audited accounts');
});
test('all assessment tabs work without horizontal overflow on mobile',async({page})=>{
 await page.setViewportSize({width:375,height:812});
 await page.goto('/workbench');
 for(const name of ['Company','Valuation','Analysis','Evidence','Score draft','Report']){
  await page.getByRole('tab',{name:new RegExp(name)}).click();
  const widths=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,view:innerWidth}));
  expect(widths.doc,name+' must not overflow').toBeLessThanOrEqual(widths.view+2);
 }
 await page.screenshot({path:'test-results/screenshots/workbench-phone.png',fullPage:true});
});
test('workbench is reachable from site navigation and homepage',async({page})=>{
 await page.goto('/');
 await expect(page.locator('.command-hero-actions').getByRole('link',{name:/Start a company assessment/i})).toBeVisible();
 await page.locator('.command-hero-actions').getByRole('link',{name:/Start a company assessment/i}).click();
 await expect(page).toHaveURL(/\/workbench$/);
});
