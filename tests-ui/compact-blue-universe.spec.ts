import {test,expect} from '@playwright/test';

test('homepage immediately exposes product and company discovery without a full-height empty hero',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await page.route('**/api/companies/featured',async route=>route.fulfill({
  status:200,contentType:'application/json',
  body:JSON.stringify({source:'GLEIF',records:[
   {lei:'12345678901234567890',name:'SYNTHETIC INDUSTRIES INC.',country:'US',status:'ACTIVE',registrationStatus:'ISSUED',jurisdiction:'US-DE',sourceUrl:'https://search.gleif.org/#/record/12345678901234567890'},
   {lei:'98765432109876543210',name:'SYNTHETIC HOLDINGS LTD.',country:'GB',status:'ACTIVE',registrationStatus:'ISSUED',jurisdiction:'GB',sourceUrl:'https://search.gleif.org/#/record/98765432109876543210'}
  ]})}));
 await page.goto('/');
 const hero=page.locator('.ux-hero-copy');
 await expect(hero).toBeVisible();
 const below=page.locator('.cq-universe-company').first();
 await expect(below).toBeVisible();
 await expect(below).toHaveAttribute('href','/lei/12345678901234567890');
 const area=await page.locator('.ux-hero-copy').boundingBox();
 const companies=await page.locator('.cq-universe').boundingBox();
 expect(area).not.toBeNull();expect(companies).not.toBeNull();
 expect(companies!.y).toBeLessThan(600);
 const color=await page.locator('.ux-button-primary').evaluate(el=>getComputedStyle(el).backgroundColor);
 expect(color).toBe('rgb(48, 95, 185)');
});
for(const path of ['/directory','/workbench','/desk','/intelligence','/lab','/compare','/status']){
 test('compact consistent page hero and first tool visible near fold on '+path,async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.route('**/api/companies/featured',async route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({source:'GLEIF',records:[]})}));
  await page.goto(path);
  const hero=page.locator(path==='/directory'?'.gd-hero':path==='/workbench'?'.wk-page-hero':path==='/desk'?'.rd-hero':path==='/status'?'.status-head':'.page-hero').first();
  await expect(hero).toBeVisible();
  // Wait for route-level styles to hydrate before sampling computed geometry.
  await expect(hero).toHaveCSS('padding-left',/^([0-9.]+)(px|%)$/);
  const metrics=await hero.evaluate(el=>{
   const css=getComputedStyle(el);
   const pixels=(value:string)=>value.endsWith('%')?parseFloat(value)*window.innerWidth/100:parseFloat(value);
   return {h:el.getBoundingClientRect().height,padLeft:pixels(css.paddingLeft),padRight:pixels(css.paddingRight),background:css.backgroundImage};
  });
  expect(metrics.h,'Hero is too tall: '+path).toBeLessThan(345);
  expect(Math.abs(metrics.padLeft-43.2)).toBeLessThan(2);
  expect(Math.abs(metrics.padRight-43.2)).toBeLessThan(2);
  expect(metrics.background).toBe('none');
 });
}
test('featured company source failure does not invent company cards',async({page})=>{
 await page.route('**/api/companies/featured',async route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({records:[],error:'Upstream unavailable'})}));
 await page.goto('/');
 const universe=page.locator('.cq-universe');
 await expect(universe.getByText(/Live featured records are unavailable/i)).toBeVisible();
 await expect(universe.locator('.cq-universe-company')).toHaveCount(0);
 await expect(universe.getByRole('link',{name:/Apple/i})).toHaveAttribute('href','/directory?q=Apple');
});
for(const width of [320,375,768,1440]){
 test('navy company universe and 3% container stay responsive at '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:900});
  await page.route('**/api/companies/featured',async route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({records:[]})}));
  for(const path of ['/','/directory','/desk','/intelligence']){
   await page.goto(path);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
   expect(overflow,path+' at '+width).toBeLessThanOrEqual(2);
  }
 });
}
