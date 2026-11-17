import {test,expect} from '@playwright/test';
test('analysis cockpit recalculates DCF matrix and exports values',async({page})=>{
 await page.goto('/workbench');
 await page.getByRole('button',{name:'Try sample data'}).click();
 await page.getByRole('tab',{name:/03 Analysis/}).click();
 await expect(page.getByText('What if the market demands a different return?')).toBeVisible();
 const matrix=page.locator('.ic-matrix tbody');
 await expect(matrix.locator('tr')).toHaveCount(5);
 await expect(page.locator('.ic-matrix-cell.is-base')).not.toHaveText('n/a');
 await page.getByRole('button',{name:/Export sensitivity CSV/}).click();
 await expect(page.getByRole('status')).toContainText(/exported/i);
});
test('scenario application updates exact financial assumptions with explicit confirmation',async({page})=>{
 page.on('dialog',d=>d.accept());
 await page.goto('/workbench');
 await page.getByRole('button',{name:'Try sample data'}).click();
 await page.getByRole('tab',{name:/03 Analysis/}).click();
 await page.locator('.ic-scenario-bear').getByRole('button',{name:/Apply to draft/}).click();
 await expect(page.getByRole('tab',{name:/02 Valuation/})).toHaveAttribute('aria-selected','true');
 await expect(page.getByLabel('Annual FCF growth (%)')).toHaveValue('4');
 await expect(page.getByLabel('Discount rate / WACC (%)')).toHaveValue('15');
});
test('research desk supports local saving, searching, opening and comparison',async({page})=>{
 await page.goto('/workbench');
 await page.getByPlaceholder('Enter company name').fill('Synthetic Desk Entry');
 await page.getByRole('button',{name:'Save locally'}).click();
 await page.goto('/desk');
 await expect(page.getByText('Synthetic Desk Entry').first()).toBeVisible();
 await page.getByRole('textbox',{name:'Find saved company research'}).fill('synthetic');
 await expect(page.locator('.rd-entry')).toHaveCount(1);
 await page.getByRole('button',{name:'Duplicate'}).click();
 await expect(page.locator('.rd-entry')).toHaveCount(2);
 await page.locator('.rd-entry').first().getByRole('checkbox').check();
 await page.locator('.rd-entry').last().getByRole('checkbox').check();
 await page.getByRole('button',{name:/Compare selected/}).click();
 await expect(page.getByRole('region',{name:'Comparison of saved draft research'})).toBeVisible();
 await page.locator('.rd-entry').first().getByRole('button',{name:'Open'}).click();
 await expect(page).toHaveURL(/\/workbench$/);
 await expect(page.getByPlaceholder('Enter company name')).toHaveValue(/Synthetic Desk Entry/);
});
test('mobile research desk and sensitivity do not overflow the viewport',async({page})=>{
 await page.setViewportSize({width:375,height:812});
 for(const route of ['/desk','/workbench']){
  await page.goto(route);
  if(route==='/workbench'){await page.getByRole('tab',{name:/03 Analysis/}).click();}
  const dimensions=await page.evaluate(()=>({pageWidth:document.documentElement.scrollWidth,viewport:innerWidth}));
  expect(dimensions.pageWidth).toBeLessThanOrEqual(dimensions.viewport+2);
 }
});
