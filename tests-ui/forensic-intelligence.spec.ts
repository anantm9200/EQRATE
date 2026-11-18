import {test,expect} from '@playwright/test';
test('intelligence console is available, source honest and has a usable synthetic demo',async({page})=>{
 await page.goto('/intelligence');
 await expect(page.getByRole('heading',{name:/Every signal has a reason/i})).toBeVisible();
 await expect(page.getByText(/PRIVATE, LOCAL-FIRST REVIEW/i)).toBeVisible();
 await page.getByRole('button',{name:/Try synthetic example/i}).click();
 await expect(page.getByRole('region',{name:'CREQOR forensic intelligence review'})).toBeVisible();
 await expect(page.getByText('EBITDA exceeds recorded revenue')).toBeVisible();
 await expect(page.getByText('Source dates lie in the future')).toHaveCount(0);
 await expect(page.getByText(/Not a company rating/i)).toBeVisible();
 await page.getByRole('button',{name:/SOURCE-TO-CLAIM MAP/i}).click();
 await expect(page.getByText('Source-to-claim map')).toBeVisible();
});
test('forensic signal filters and explanations work',async({page})=>{
 await page.goto('/intelligence');
 await page.getByRole('button',{name:/Try synthetic example/i}).click();
 const region=page.getByRole('region',{name:'CREQOR forensic intelligence review'});
 await region.locator('.fi-filters').getByRole('button',{name:/HIGH PRIORITY/i}).click();
 await expect(region.locator('.fi-filters').getByRole('button',{name:/HIGH PRIORITY/i})).toHaveAttribute('aria-pressed','true');
 await region.getByRole('button',{name:/All \(/i}).click();
 const item=region.locator('.fi-finding').filter({hasText:'No official entity identifier'});
 // Synthetic example has a DEMO-ONLY identifier; inspect a known anomaly instead.
 const margin=region.locator('.fi-finding').filter({hasText:'EBITDA exceeds recorded revenue'});
 await margin.getByRole('button').click();
 await expect(margin.getByText(/Why it matters:/i)).toBeVisible();
 await expect(margin.getByText(/Next investigation:/i)).toBeVisible();
 expect(await item.count()).toBe(0);
});
test('forensic intelligence also updates inside workbench analysis tab',async({page})=>{
 await page.goto('/workbench');
 await page.getByRole('button',{name:'Try sample data'}).click();
 await page.getByRole('tab',{name:/03 Analysis/i}).click();
 const forensic=page.getByRole('region',{name:'CREQOR forensic intelligence review'});
 await expect(forensic).toBeVisible();
 await expect(forensic.getByText(/has not retrieved or independently authenticated/i).first()).toBeVisible();
});
for(const width of [320,375,768,1440]){
 test('intelligence dashboard fits '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:900});
  await page.goto('/intelligence');
  await page.getByRole('button',{name:/Try synthetic example/i}).click();
  await expect(page.locator('.fi-stats')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(2);
 });
}
test('existing saved assessment appears in intelligence portfolio and can be selected',async({page})=>{
 await page.goto('/workbench');
 await page.getByRole('button',{name:'Try sample data'}).click();
 // The sample uses a synthetic name and is permitted to save locally.
 await page.getByRole('button',{name:'Save locally'}).click();
 await page.goto('/intelligence');
 await expect(page.getByText(/YOUR SAVED RESEARCH/i)).toBeVisible();
 await expect(page.locator('.fi-portfolio-table tbody tr')).toHaveCount(1);
 await expect(page.getByRole('combobox',{name:'Choose assessment for intelligence review'})).toHaveValue(/assessment-/);
});
