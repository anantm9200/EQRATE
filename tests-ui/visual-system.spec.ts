import {test,expect} from '@playwright/test';
const routes=['/','/workbench','/desk','/explore','/lab','/compare','/watchlist','/verification','/methodology','/research','/intelligence','/analyst','/status'];
for(const width of [320,375,768,1440]){
 test('no horizontal page overflow across platform at '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:900});
  for(const route of routes){
   await page.goto(route);
   await expect(page.locator('main')).toBeVisible();
   const layout=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:innerWidth}));
   expect(layout.scroll,route+' viewport '+width).toBeLessThanOrEqual(layout.viewport+2);
  }
 });
}
test('hero contains interactive research lens, direct links, and the real product below',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await page.goto('/');
 const hero=page.locator('.v6-hero');
 await expect(hero.getByRole('heading',{name:/Clarity, beyond/i})).toBeVisible();
 await expect(hero.getByRole('link',{name:/Start a company assessment/i})).toHaveAttribute('href','/workbench');
 const tabs=hero.getByRole('tab');
 await expect(tabs).toHaveCount(3);
 await tabs.nth(1).click();
 await expect(hero.getByText('Follow every assumption.')).toBeVisible();
 await tabs.nth(2).click();
 await expect(hero.getByText('Make the evidence visible.')).toBeVisible();
 await expect(page.locator('.v6-start .terminal')).toBeVisible();
 await expect(page.locator('.v6-start .lei-search-widget')).toBeVisible();
 const h=await hero.evaluate(e=>e.getBoundingClientRect().height);
 expect(h).toBeGreaterThanOrEqual(900);
});
test('all actual buttons use corners no larger than nine CSS pixels',async({page})=>{
 await page.goto('/');const paths=['/','/workbench','/desk','/explore','/lab','/compare'];
 for(const path of paths){
  await page.goto(path);
  const offenders=await page.locator('button').evaluateAll(els=>els.flatMap(el=>{
   const style=getComputedStyle(el),radius=parseFloat(style.borderTopLeftRadius);
   return Number.isFinite(radius)&&radius>9.01?[{label:el.textContent?.trim().slice(0,50)||el.getAttribute('aria-label'),radius}]:[];
  }));
  expect(offenders,path).toEqual([]);
 }
});
