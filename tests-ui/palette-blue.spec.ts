import {test,expect} from '@playwright/test';

const isDecorativeGreen=(value:string)=>{
 const match=value.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
 if(!match)return false;
 const [r,g,b]=match.slice(1,4).map(Number).map(x=>x/255);
 const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min,light=(max+min)/2;
 if(!d)return false;
 let hue=max===r?((g-b)/d)%6:max===g?(b-r)/d+2:(r-g)/d+4;
 hue=(hue*60+360)%360;
 const saturation=d/(1-Math.abs(2*light-1));
 return hue>=78&&hue<=178&&saturation>=.07;
};
test('originally green homepage valuation cards are blue and neutral throughout',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await page.goto('/');
 await page.locator('.ux-distinction-grid').scrollIntoViewIfNeeded();
 const samples=await page.evaluate(()=>{
  const selectors=['.ux-distinction-grid article','.ux-distinction-grid h3',
   '.ux-distinction-grid p','.ux-card-header span','.ux-equation',
   '.ux-equation strong','.ux-equation span','.ux-distinction-grid .ux-text-link',
   '.ux-section-heading h2'];
  return selectors.flatMap(selector=>Array.from(document.querySelectorAll(selector))
   .map(el=>{const s=getComputedStyle(el);return{selector,
    color:s.color,background:s.backgroundColor,border:s.borderTopColor};}));
 });
 expect(samples.length).toBeGreaterThan(14);
 for(const s of samples)for(const key of ['color','background','border'] as const)
  expect(isDecorativeGreen(s[key]),s.selector+' '+key+' '+s[key]).toBe(false);
 const equation=await page.locator('.ux-equation strong').first().evaluate(el=>getComputedStyle(el).color);
 expect(equation).toBe('rgb(48, 95, 185)');
 const progress=await page.locator('.fx-scroll-progress').evaluate(el=>getComputedStyle(el).backgroundImage);
 expect(progress).toContain('rgb(48, 95, 185)');
});
for(const route of ['/','/directory','/workbench','/desk','/intelligence','/lab','/compare']){
 test('primary copy on '+route+' has no decorative forest-green typography',async({page})=>{
  await page.goto(route,{waitUntil:'domcontentloaded'});
  const headings=await page.locator('main h1,main h2,main h3').evaluateAll(els=>els.slice(0,22)
   .filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0;})
   .map(el=>({text:(el.textContent||'').slice(0,38),color:getComputedStyle(el).color})));
  expect(headings.length).toBeGreaterThan(0);
  for(const heading of headings)expect(isDecorativeGreen(heading.color),route+' '+heading.text).toBe(false);
 });
}
