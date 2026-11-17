import {test,expect} from '@playwright/test';

const routes=[
 {path:'/',minSections:6,slug:'home'},
 {path:'/explore',minSections:4,slug:'explore'},
 {path:'/lab',minSections:5,slug:'lab'},
 {path:'/compare',minSections:4,slug:'compare'},
 {path:'/intelligence',minSections:5,slug:'intelligence'},
 {path:'/research',minSections:4,slug:'research'},
 {path:'/methodology',minSections:5,slug:'methodology'},
 {path:'/verification',minSections:5,slug:'verification'},
 {path:'/analyst',minSections:5,slug:'analyst'},
 {path:'/watchlist',minSections:4,slug:'watchlist'}
];
for(const route of routes){
 test(route.slug+' has a complete research narrative and no mobile overflow',async({page})=>{
  await page.setViewportSize({width:375,height:812});
  await page.goto(route.path);
  const sections=page.locator('.cx-section');
  await expect(sections.first()).toBeVisible();
  expect(await sections.count(),'Enough meaningful sections on '+route.path).toBeGreaterThanOrEqual(route.minSections);
  await expect(page.locator('.cx-section h2').first()).toBeVisible();
  const widths=await page.evaluate(()=>({
   document:document.documentElement.scrollWidth,
   viewport:window.innerWidth,
   main:document.querySelector('main')?.getBoundingClientRect().width
  }));
  expect(widths.document,'No horizontal overflow on '+route.path).toBeLessThanOrEqual(widths.viewport+2);
  expect(widths.main).toBeGreaterThan(300);
  if(['home','explore','lab','analyst'].includes(route.slug)){
   await page.screenshot({path:'test-results/screenshots/expanded-'+route.slug+'-phone.png',fullPage:true});
  }
 });
}
test('desktop homepage contains distinct editorial sections without overflow',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await page.goto('/');
 await expect(page.getByText('Every angle. One connected picture.')).toBeVisible();
 await expect(page.getByText('Capability, not theatre.')).toBeVisible();
 await page.locator('.cx-questions').scrollIntoViewIfNeeded();
 const dim=await page.evaluate(()=>({document:document.documentElement.scrollWidth,viewport:window.innerWidth}));
 expect(dim.document).toBeLessThanOrEqual(dim.viewport+2);
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.screenshot({path:'test-results/screenshots/expanded-home-desktop.png',fullPage:true});
});
test('native FAQ expands to reveal evidence-based answer',async({page})=>{
 await page.goto('/methodology');
 const faq=page.locator('.cx-question-list details').first();
 await expect(faq).not.toHaveAttribute('open','');
 await faq.locator('summary').click();
 await expect(faq).toHaveAttribute('open','');
 await expect(faq.locator('p')).toBeVisible();
});
test('navigation routes connect to working tools',async({page})=>{
 await page.goto('/');
 const links=page.locator('.cx-route');
 await expect(links.first()).toBeVisible();
 const hrefs=await links.evaluateAll(els=>els.map(a=>a.getAttribute('href')));
 for(const href of hrefs){
  expect(href).toMatch(/^\/(?!\/)/);
 }
});
