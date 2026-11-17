import {test,expect} from '@playwright/test';

test('liquid glass is visibly translucent with an independently blurred background',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await page.goto('/');
 const surface=page.locator('.ux-preview');
 await expect(surface).toBeVisible();
 const values=await page.evaluate(()=>{
  const glass=getComputedStyle(document.querySelector('.ux-preview')!);
  const header=getComputedStyle(document.querySelector('.site-header')!);
  return {filter:glass.backdropFilter||glass.webkitBackdropFilter,background:glass.backgroundColor,headerFilter:header.backdropFilter||header.webkitBackdropFilter,headerPosition:header.position,atmosphere:document.querySelectorAll('.fx-hero-atmosphere span').length};
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

test('cards track pointer light but reset on pointer exit',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await page.goto('/');
 const card=page.locator('.ux-workflow-card').first();
 await card.scrollIntoViewIfNeeded();
 const rect=await card.boundingBox();
 expect(rect).not.toBeNull();
 await page.mouse.move(rect!.x+rect!.width*.65,rect!.y+rect!.height*.45);
 await expect.poll(()=>card.evaluate(el=>el.style.getPropertyValue('--fx-x'))).toMatch(/%$/);
 await page.mouse.move(0,0);
 await expect.poll(()=>card.evaluate(el=>el.style.getPropertyValue('--fx-x'))).toBe('');
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
