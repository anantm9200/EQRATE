import {test,expect} from '@playwright/test';
const routes=[
 {path:'/explore',slug:'explore',min:4},{path:'/lab',slug:'lab',min:5},
 {path:'/compare',slug:'compare',min:4},{path:'/intelligence',slug:'intelligence',min:5},
 {path:'/research',slug:'research',min:4},{path:'/methodology',slug:'methodology',min:5},
 {path:'/verification',slug:'verification',min:5},{path:'/analyst',slug:'analyst',min:5},
 {path:'/watchlist',slug:'watchlist',min:4}
];
for(const route of routes){
 test(route.slug+' deep research route remains mobile-responsive',async({page})=>{
  await page.setViewportSize({width:375,height:812});
  await page.goto(route.path);
  if(route.slug==='explore'){
   await expect(page.locator('.lei-main')).toBeVisible();
   await expect(page.getByRole('combobox',{name:/Search global LEI legal entity records/i})).toBeVisible();
  }else{
   await expect(page.locator('.cx-section').first()).toBeVisible();
   expect(await page.locator('.cx-section').count()).toBeGreaterThanOrEqual(route.min);
  }
  const size=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:innerWidth}));
  expect(size.scroll,route.path+' horizontal overflow').toBeLessThanOrEqual(size.viewport+2);
 });
}
test('homepage supports the core company personas without excessive marketing scroll',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.goto('/');
 await expect(page.locator('.command-job')).toHaveCount(3);
 await expect(page.locator('.command-routebar a')).toHaveCount(4);
 await expect(page.locator('.command-market-card')).toHaveCount(2);
 await expect(page.locator('.command-hero-actions').getByRole('link',{name:/Start a company assessment/i})).toBeVisible();
 await page.screenshot({path:'test-results/screenshots/command-home-full.png',fullPage:true});
});
test('source methodology FAQ opens through native details',async({page})=>{
 await page.goto('/methodology');
 const q=page.locator('.cx-question-list details').first();
 await q.locator('summary').click();await expect(q).toHaveAttribute('open','');
 await expect(q.locator('p')).toBeVisible();
});
test('status route reads actual health config without assuming upstream data',async({page})=>{
 await page.goto('/status');
 await expect(page.getByText('System readiness.')).toBeVisible();
 await expect(page.getByText('Company valuation engine')).toBeVisible();
 await expect(page.getByText('Official US SEC company search')).toBeVisible();
 await expect(page.getByText('Global market prices and published ratings')).toBeVisible();
 await page.getByRole('button',{name:/Check again/i}).click();
 await expect(page.getByText('Application API')).toBeVisible();
});
test('workbench retains active uncommitted draft after reload',async({page})=>{
 await page.goto('/workbench');
 await page.getByPlaceholder('Enter company name').fill('Unsaved Synthetic Research');
 await page.getByRole('tab',{name:/Valuation/i}).click();
 await page.getByLabel('Annual revenue').fill('314');
 await page.reload();
 await expect(page.locator('.wk-dashboard-header h2')).toContainText('Unsaved Synthetic Research');
 await page.getByRole('tab',{name:/Valuation/i}).click();
 await expect(page.getByLabel('Annual revenue')).toHaveValue('314');
});
