import {test,expect} from '@playwright/test';
const viewports=[
 {name:'compact-phone',width:320,height:760},{name:'phone',width:375,height:812},
 {name:'wide-phone',width:430,height:932},{name:'tablet',width:768,height:1024},
 {name:'laptop',width:1024,height:768},{name:'desktop',width:1440,height:900}
];
for(const viewport of viewports){
 test('functional hero at '+viewport.name,async({page})=>{
  await page.setViewportSize({width:viewport.width,height:viewport.height});
  await page.goto('/');
  const hero=page.locator('.command-hero');
  await expect(hero.getByRole('heading',{name:/Value the business/i})).toBeVisible();
  await expect(page.getByRole('tab',{name:'Private'})).toBeVisible();
  await expect(page.getByText(/SYNTHETIC EXAMPLE/i)).toBeVisible();
  await expect(page.locator('.terminal-primary-figure')).toContainText('753');
  const dims=await page.evaluate(()=>{
   const header=document.querySelector('.v2-header')!.getBoundingClientRect();
   const hero=document.querySelector('.command-hero')!.getBoundingClientRect();
   const content=document.querySelector('.command-hero-copy')!.getBoundingClientRect();
   const calc=document.querySelector('.terminal')!.getBoundingClientRect();
   return {header:header.bottom,heroTop:hero.top,heroBottom:hero.bottom,contentLeft:content.left,calcRight:calc.right,doc:document.documentElement.scrollWidth,viewport:innerWidth};
  });
  expect(dims.doc,'No page-level overflow').toBeLessThanOrEqual(viewport.width+2);
  expect(dims.contentLeft).toBeGreaterThanOrEqual(-1);
  expect(dims.calcRight).toBeLessThanOrEqual(viewport.width+1);
  expect(dims.heroTop).toBeGreaterThanOrEqual(dims.header-2);
  if(viewport.width>=1200)expect(dims.heroBottom,'Desktop hero fills one screen').toBeGreaterThanOrEqual(viewport.height-2);
  await page.screenshot({path:'test-results/screenshots/command-'+viewport.name+'.png'});
 });
}
test('listed market cap and private multiple are calculated from visible inputs',async({page})=>{
 await page.goto('/');
 await page.getByRole('tab',{name:'Listed'}).click();
 await expect(page.locator('.terminal-primary-figure')).toContainText('2,952');
 await page.getByRole('tab',{name:'Private'}).click();
 await page.getByLabel('Annual revenue').fill('200');
 await page.getByLabel('EV / revenue multiple').fill('2');
 await page.getByLabel('Net debt').fill('50');
 await expect(page.locator('.terminal-primary-figure')).toContainText('350');
 await expect(page.getByText(/USER INPUT \/ UNVERIFIED/i)).toBeVisible();
});
test('calculator transfers selected inputs to full workbench',async({page})=>{
 await page.goto('/');
 await page.getByPlaceholder('Name the business…').fill('Test Transfer Limited');
 await page.getByLabel('Annual revenue').fill('125');
 await page.getByLabel('EV / revenue multiple').fill('3');
 await page.getByLabel('Net debt').fill('25');
 await expect(page.locator('.terminal-primary-figure')).toContainText('350');
 await page.getByRole('button',{name:/Continue in workbench/i}).click();
 await expect(page).toHaveURL(/\/workbench/);
 await expect(page.locator('.wk-dashboard-header h2')).toContainText('Test Transfer Limited');
 await expect(page.getByLabel('Annual revenue')).toHaveValue('125');
 await expect(page.getByLabel('Net debt / equity adjustments')).toHaveValue('25');
 await page.getByRole('tab',{name:/Report/i}).click();
 await expect(page.locator('.wk-table-wrap tbody')).toContainText('350');
});
test('clear calculator inputs stops output and protects against false data',async({page})=>{
 await page.goto('/');
 await page.getByRole('button',{name:/Clear inputs/i}).click();
 await expect(page.locator('.terminal-primary-figure')).toContainText(/Awaiting inputs/);
 await page.getByRole('button',{name:/Continue in workbench/i}).click();
 await expect(page.getByRole('alert')).toContainText(/Enter the required/i);
});
test('keyboard command menu filters and navigates',async({page})=>{
 await page.goto('/');
 await page.keyboard.press('Control+k');
 const dialog=page.getByRole('dialog',{name:'Navigate CREQOR'});
 await expect(dialog).toBeVisible();
 await page.getByRole('textbox',{name:'Find a tool or page'}).fill('workbench');
 await expect(dialog.getByRole('button',{name:/Company workbench/i})).toBeVisible();
 await page.keyboard.press('Enter');
 await expect(page).toHaveURL(/\/workbench/);
});
test('full-screen menu closes with Escape and restores page',async({page})=>{
 await page.setViewportSize({width:375,height:812});
 await page.goto('/');
 await page.getByRole('button',{name:'Open full-screen navigation'}).click();
 await expect(page.getByRole('navigation',{name:'Full navigation'})).toBeVisible();
 await page.keyboard.press('Escape');
 await expect(page.locator('.v2-menu-panel')).toHaveAttribute('aria-hidden','true');
});
test('reduced-motion preference disables decorative hero animation',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/');
 const animation=await page.locator('.command-backdrop i').first().evaluate(e=>getComputedStyle(e).animationName);
 expect(animation).toBe('none');
});
