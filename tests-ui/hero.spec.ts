import {test,expect} from '@playwright/test';
const viewports=[
 {name:'compact-phone',width:320,height:760},{name:'phone',width:375,height:812},
 {name:'wide-phone',width:430,height:932},{name:'tablet',width:768,height:1024},
 {name:'laptop',width:1024,height:768},{name:'desktop',width:1440,height:900}
];
for(const viewport of viewports){
 test('unified research landing page at '+viewport.name,async({page})=>{
  await page.setViewportSize({width:viewport.width,height:viewport.height});
  await page.goto('/');
  const hero=page.locator('.ux-hero');
  await expect(hero.getByRole('heading',{name:/Know the company/i})).toBeVisible();
  await expect(hero.getByRole('link',{name:/Explore companies/i})).toBeVisible();
  await expect(hero.getByRole('link',{name:/Build a valuation/i})).toBeVisible();
  await expect(page.getByRole('tab',{name:/02 Model/i})).toBeVisible();
  await expect(page.getByText(/ILLUSTRATIVE EQUITY ESTIMATE/i)).toBeVisible();
  const dims=await page.evaluate(()=>{
   const header=document.querySelector('.v2-header')!.getBoundingClientRect();
   const hero=document.querySelector('.ux-hero')!.getBoundingClientRect();
   const content=document.querySelector('.ux-hero-copy')!.getBoundingClientRect();
   const preview=document.querySelector('.ux-preview')!.getBoundingClientRect();
   return {headerBottom:header.bottom,heroTop:hero.top,heroBottom:hero.bottom,contentLeft:content.left,previewRight:preview.right,doc:document.documentElement.scrollWidth,viewport:innerWidth};
  });
  expect(dims.doc,'No page-level overflow').toBeLessThanOrEqual(viewport.width+2);
  expect(dims.contentLeft).toBeGreaterThanOrEqual(-1);
  expect(dims.previewRight).toBeLessThanOrEqual(viewport.width+1);
  expect(dims.heroTop).toBeGreaterThanOrEqual(dims.headerBottom-2);
  if(viewport.width>=1200)expect(dims.heroBottom,'Desktop hero fills at least a screen').toBeGreaterThanOrEqual(viewport.height-2);
  await page.screenshot({path:'test-results/screenshots/unified-'+viewport.name+'.png'});
 });
}
test('the homepage DCF model recalculates as the discount rate changes',async({page})=>{
 await page.goto('/');
 const input=page.getByRole('slider',{name:'Illustrative DCF discount rate'});
 const figure=page.locator('.ux-model-value strong');
 await expect(figure).toBeVisible();
 const start=await figure.innerText();
 await input.fill('16');
 await expect(figure).not.toHaveText(start);
 await input.fill('8');
 await expect(figure).not.toHaveText(start);
 await expect(page.getByText(/hypothetical/i).first()).toBeVisible();
});
test('company discovery, valuation and research journeys are reachable',async({page})=>{
 await page.goto('/');
 await page.locator('.ux-hero').getByRole('link',{name:/Build a valuation/i}).click();
 await expect(page).toHaveURL(/\/workbench$/);
 await page.goto('/');
 await page.getByRole('tab',{name:/01 Discover/i}).click();
 await page.getByRole('link',{name:/Explore real entity records/i}).click();
 await expect(page).toHaveURL(/\/explore$/);
 await page.goto('/');
 await page.getByRole('tab',{name:/03 Evidence/i}).click();
 await expect(page.getByText(/checklist/i).first()).toBeVisible();
 await page.getByRole('checkbox',{name:/Legal identity/}).check();
 await expect(page.locator('.ux-evidence-head')).toContainText('1 / 3');
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
test('reduced-motion preference removes transitions and animations',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/');
 const animations=await page.locator('.ux-workflow-card').first().evaluate(el=>{
  const computed=getComputedStyle(el);return {animation:computed.animationDuration,transition:computed.transitionDuration};
 });
 expect(parseFloat(animations.animation)).toBeLessThanOrEqual(0.001);
 expect(parseFloat(animations.transition)).toBeLessThanOrEqual(0.001);
});
