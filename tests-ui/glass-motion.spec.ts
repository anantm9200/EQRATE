import {test,expect} from '@playwright/test';

test('liquid glass is visibly translucent with an independently blurred background',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await page.goto('/');
 const surface=page.locator('.ux-preview');
 await expect(surface).toBeVisible();
 const values=await page.evaluate(()=>{
  const glass=getComputedStyle(document.querySelector('.ux-preview')!);
  const header=getComputedStyle(document.querySelector('.site-header')!);
  return {filter:glass.backdropFilter||glass.getPropertyValue('-webkit-backdrop-filter'),background:glass.backgroundColor,headerFilter:header.backdropFilter||header.getPropertyValue('-webkit-backdrop-filter'),headerPosition:header.position,atmosphere:document.querySelectorAll('.fx-hero-atmosphere span').length};
 });
 expect(values.filter).toContain('blur(');
 expect(values.headerFilter).toContain('blur(');
 expect(values.headerPosition).toBe('sticky');
 expect(values.atmosphere).toBe(3);
});

test('sensitivity illustration stays tied to real DCF inputs',async({page})=>{
 await page.goto('/');
 const figure=page.locator('.ux-model-value strong');
 const cursor=page.locator('.fx-chart-cursor');
 const value=await figure.innerText(),initial=await cursor.getAttribute('cx');
 await page.getByRole('slider',{name:'Illustrative DCF discount rate'}).fill('16');
 await expect(figure).not.toHaveText(value);
 await expect(cursor).not.toHaveAttribute('cx',initial!);
 await expect(page.locator('.ux-live-curve svg')).toHaveAttribute('aria-label',/equity value decreases/i);
});

test('hover keeps card hitboxes stable instead of sliding under the pointer',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await page.goto('/');
 const card=page.locator('.ux-workflow-card').first();
 await card.scrollIntoViewIfNeeded();
 await page.waitForTimeout(850);
 const before=await card.boundingBox();
 expect(before).not.toBeNull();
 await page.mouse.move(before!.x+before!.width*.5,before!.y+before!.height*.5);
 await page.waitForTimeout(360);
 const after=await card.boundingBox();
 expect(after).not.toBeNull();
 expect(Math.abs(after!.x-before!.x)).toBeLessThan(1);
 expect(Math.abs(after!.y-before!.y)).toBeLessThan(1);
 expect(Math.abs(after!.width-before!.width)).toBeLessThan(1);
 expect(Math.abs(after!.height-before!.height)).toBeLessThan(1);
 const transform=await card.evaluate(el=>getComputedStyle(el).transform);
 expect(transform).toBe('none');
});


for(const width of [320,375,768,1440]){
 test('motion and glass preserve mobile/desktop layout at '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:850});
  await page.goto('/');
  await expect(page.locator('.ux-preview')).toBeVisible();
  await expect(page.locator('.ux-live-curve svg')).toBeVisible();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(2);
 });
}

test('reduced motion disables atmosphere, reveal animations and scroll progress',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/');
 const results=await page.evaluate(()=>{
  const atmosphere=getComputedStyle(document.querySelector('.fx-hero-atmosphere span')!);
  const panel=getComputedStyle(document.querySelector('.ux-preview')!);
  const progress=getComputedStyle(document.querySelector('.fx-scroll-progress')!);
  return {atmosphere:atmosphere.animationName,panel:panel.animationName,progress:progress.display};
 });
 expect(results).toEqual({atmosphere:'none',panel:'none',progress:'none'});
});
