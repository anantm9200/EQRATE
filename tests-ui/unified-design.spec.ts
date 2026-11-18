import {test,expect} from '@playwright/test';

/**
 * The site has many route-specific stylesheets. These tests verify the
 * final, shared design contract using computed CSS rather than source matches.
 */
const pages=[
 ['/', '.ux-hero-inner','.ux-hero'],
 ['/directory','.gd-hero','.gd-hero'],
 ['/workbench','.wk-page-hero','.wk-page-hero'],
 ['/desk','.rd-hero','.rd-hero'],
 ['/explore','.lei-explore-hero','.lei-explore-hero'],
 ['/lab','.page-hero','.page-hero'],
 ['/compare','.page-hero','.page-hero'],
 ['/intelligence','.page-hero','.page-hero'],
 ['/research','.page-hero','.page-hero'],
 ['/verification','.page-hero','.page-hero'],
 ['/methodology','.page-hero','.page-hero'],
 ['/watchlist','.page-hero','.page-hero'],
 ['/status','.status-head','.status-head'],
 ['/analyst','.page-hero','.page-hero']
] as const;

for(const [path,heroGutter,heroBackground] of pages){
 test('unified solid hero + 3% gutters on '+path,async({page})=>{
  await page.setViewportSize({width:1280,height:820});
  await page.goto(path);
  const a=page.locator(heroGutter).first();
  const b=page.locator(heroBackground).first();
  await expect(a).toBeVisible();
  const metrics=await a.evaluate(el=>{
   const s=getComputedStyle(el);
   return {padLeft:parseFloat(s.paddingLeft),padRight:parseFloat(s.paddingRight)};
  });
  const expected=1280*.03;
  expect(Math.abs(metrics.padLeft-expected)).toBeLessThan(1.5);
  expect(Math.abs(metrics.padRight-expected)).toBeLessThan(1.5);
  const paint=await b.evaluate(el=>{
   const s=getComputedStyle(el);
   return {image:s.backgroundImage,background:s.backgroundColor};
  });
  expect(paint.image).toBe('none');
  expect(paint.background).not.toBe('rgba(0, 0, 0, 0)');
 });
}

test('header, footer and prefooter use exactly the same compact 1.5% gutter',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await page.goto('/');
 const paddings=await page.evaluate(()=>{
  const selectors=['.site-header.v2-header','.v2-prefooter','.v2-footer'];
  return selectors.map(q=>{
   const el=document.querySelector(q);
   if(!el)throw new Error('Missing '+q);
   const style=getComputedStyle(el);
   return {selector:q,left:parseFloat(style.paddingLeft),right:parseFloat(style.paddingRight),gradient:style.backgroundImage};
  });
 });
 for(const item of paddings){
  expect(Math.abs(item.left-21.6),item.selector).toBeLessThan(1);
  expect(Math.abs(item.right-21.6),item.selector).toBeLessThan(1);
  expect(item.gradient,item.selector).toBe('none');
 }
});

test('public sections and glass panels have solid backgrounds while accent gradients remain',async({page})=>{
 await page.goto('/');
 for(const selector of ['.ux-hero','.ux-workflows','.signal-section','.signal-shell','.signal-graph','.ux-preview','.ux-workflow-card','.v2-prefooter','.v2-footer']){
  const image=await page.locator(selector).first().evaluate(el=>getComputedStyle(el).backgroundImage);
  expect(image,selector).toBe('none');
 }
 const accent=await page.locator('.signal-shell-mark').first().evaluate(el=>getComputedStyle(el).backgroundImage);
 expect(accent).toContain('gradient(');
});

for(const width of [320,375,768,1440]){
 test('core pages have no sideways overflow at '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:860});
  for(const path of ['/','/directory','/workbench','/desk','/intelligence','/status']){
   await page.goto(path);
   await expect(page.locator('main')).toBeVisible();
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
   expect(overflow,path+' at '+width).toBeLessThanOrEqual(2);
  }
 });
}
