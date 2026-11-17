import {test,expect} from '@playwright/test';

const routes=['/','/workbench','/desk','/explore','/lab','/compare','/analyst','/intelligence','/research','/verification','/methodology','/watchlist','/status'];
for (const width of [375,768,1440]){
 test('typography and layout remain consistent at '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:900});
  for(const route of routes){
   await page.goto(route);
   await expect(page.locator('body')).toBeVisible();
   const result=await page.evaluate(()=>{
    const all=Array.from(document.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6,button,input,textarea,select,nav a'));
    const errors:string[]=[];
    for(const el of all){
     const cs=getComputedStyle(el);
     const expected=/^H[1-6]$/.test(el.tagName)?'montserrat':'inter';
     const actual=cs.fontFamily.toLowerCase();
     if(!actual.includes(expected))errors.push(el.tagName+' '+el.className.toString().slice(0,45)+'='+cs.fontFamily);
    }
    const heading=document.querySelector('h1');
    return {errors:errors.slice(0,14),totalChecked:all.length,overflow:document.documentElement.scrollWidth-innerWidth,heading:heading?getComputedStyle(heading).fontFamily:''};
   });
   expect(result.errors,route+' wrong fonts').toEqual([]);
   expect(result.overflow,route+' horizontal overflow').toBeLessThanOrEqual(2);
   expect(result.totalChecked,route+' elements').toBeGreaterThan(4);
  }
 });
}
test('homepage DCF preview remains interactive with visible value',async({page})=>{
 await page.goto('/');
 await page.getByRole('tab',{name:/02 Model/}).click();
 const figure=page.locator('.ux-model-value strong');
 await expect(figure).toBeVisible();
 const before=await figure.innerText();
 await page.getByRole('slider',{name:'Illustrative DCF discount rate'}).fill('16');
 await expect(figure).not.toHaveText(before);
 await page.getByRole('tab',{name:/03 Evidence/}).click();
 await page.getByRole('checkbox',{name:/Legal identity/}).check();
 await expect(page.locator('.ux-evidence-head')).toContainText('1 / 3');
});
