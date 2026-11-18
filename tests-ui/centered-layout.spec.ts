import {test,expect} from '@playwright/test';

const sections=['.ux-section-heading','.ux-method-intro','.ux-integrity-copy','.ux-workflow-card .ux-card-body','.ux-distinction-grid article'];
for(const width of [375,768,1440]){
 test('homepage sections share a centred editorial axis at '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:900});
  await page.goto('/');
  for(const selector of sections){
   const block=page.locator(selector).first();
   await expect(block,selector).toBeVisible();
   const result=await block.evaluate(el=>{
    const r=el.getBoundingClientRect();const css=getComputedStyle(el);
    return {align:css.textAlign,centre:r.left+r.width/2,viewport:innerWidth};
   });
   expect(result.align,selector+' text alignment').toBe('center');
   // Card contents may be centred within a grid column, not the entire viewport.
   if(!selector.includes('card')&&!selector.includes('article'))expect(Math.abs(result.centre-result.viewport/2),selector+' midpoint').toBeLessThan(24);
  }
  const method=await page.locator('.ux-method').evaluate(el=>getComputedStyle(el).flexDirection);
  expect(method).toBe('column');
  const integrity=await page.locator('.ux-integrity-list').evaluate(el=>getComputedStyle(el).display);
  expect(integrity).toBe('grid');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(2);
 });
}
const routes=['/lab','/compare','/analyst','/explore','/research','/verification','/methodology','/directory','/status','/workbench','/desk'];
for(const width of [375,1440]){
 test('section intros are centred across product routes at '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:900});
  for(const route of routes){
   await page.goto(route);
   const hero=page.locator('h1').first();
   await expect(hero,route+' has an h1').toBeVisible();
   const alignment=await hero.evaluate(el=>getComputedStyle(el).textAlign);
   // The section wrapper centres the heading; text-align is inherited.
   expect(alignment,route+' hero heading').toBe('center');
   for(const selector of ['.cx-intro','.cx-split-copy','.section-heading','.lei-main-header']){
    const blocks=page.locator(selector);
    if(await blocks.count()){
     const block=blocks.first();
     await expect(block).toBeVisible();
     expect(await block.evaluate(el=>getComputedStyle(el).textAlign),route+' '+selector).toBe('center');
    }
   }
   expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),route+' overflow').toBeLessThanOrEqual(2);
  }
 });
}
test('detail layouts and methodology still keep financial tables and inputs left aligned',async({page})=>{
 await page.goto('/methodology');
 const panel=page.locator('.panel').first();
 await expect(panel).toBeVisible();
 await page.goto('/lab');
 const table=page.locator('.cx-table').first();
 await expect(table).toBeVisible();
 expect(await table.locator('td').first().evaluate(el=>getComputedStyle(el).textAlign)).toBe('left');
 await page.goto('/workbench');
 await expect(page.locator('.wk-form-grid').first()).toBeVisible();
 expect(await page.locator('.wk-form-grid').first().evaluate(el=>getComputedStyle(el).textAlign)).toBe('left');
});
test('editorial split becomes a centred narrative followed by visual',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await page.goto('/research');
 const split=page.locator('.cx-section.cx-split').first();
 await expect(split).toBeVisible();
 const layout=await split.evaluate(el=>{
  const copy=el.querySelector('.cx-split-copy')!.getBoundingClientRect();
  const diagram=el.querySelector('.cx-diagram')!.getBoundingClientRect();
  const elStyle=getComputedStyle(el);
  return {direction:elStyle.flexDirection,copyCentre:copy.left+copy.width/2,diagramCentre:diagram.left+diagram.width/2,copyBottom:copy.bottom,diagramTop:diagram.top,viewport:innerWidth};
 });
 expect(layout.direction).toBe('column');
 expect(Math.abs(layout.copyCentre-layout.viewport/2)).toBeLessThan(24);
 expect(Math.abs(layout.diagramCentre-layout.viewport/2)).toBeLessThan(24);
 expect(layout.diagramTop).toBeGreaterThan(layout.copyBottom-1);
});
