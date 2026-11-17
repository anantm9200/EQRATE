import {test,expect} from '@playwright/test';

const viewports=[
 {name:'compact-phone',width:320,height:760},
 {name:'phone',width:375,height:812},
 {name:'wide-phone',width:430,height:932},
 {name:'tablet',width:768,height:1024},
 {name:'laptop',width:1024,height:768},
 {name:'desktop',width:1440,height:900}
];

for(const viewport of viewports){
 test('hero is usable at '+viewport.name+' ('+viewport.width+'px)',async({page})=>{
  await page.setViewportSize({width:viewport.width,height:viewport.height});
  await page.goto('/');
  const hero=page.locator('.c3-hero');
  const title=hero.getByRole('heading',{name:/Know the company/i});
  const search=hero.getByRole('combobox',{name:/search official US company registry/i});
  await expect(hero).toBeVisible();
  await expect(title).toBeVisible();
  await expect(search).toBeVisible();
  const bounds=await page.evaluate(()=>{
   const elements=[
    document.querySelector('.c3-hero h1'),
    document.querySelector('.c3-hero .search-input-wrap'),
    document.querySelector('.v2-header .brand'),
    document.querySelector('.v2-menu-button')
   ];
   return elements.map(el=>{
    if(!el)return null;
    const rect=el.getBoundingClientRect();
    return {left:rect.left,right:rect.right,width:rect.width,top:rect.top};
   });
  });
  for(const box of bounds){
   expect(box,'Important hero control must exist').not.toBeNull();
   expect(box!.left,'No horizontal left clipping').toBeGreaterThanOrEqual(-1);
   expect(box!.right,'No horizontal right clipping').toBeLessThanOrEqual(viewport.width+1);
  }
  const overflow=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,window:window.innerWidth}));
  expect(overflow.doc,'No horizontal page overflow').toBeLessThanOrEqual(overflow.window+2);
  await page.screenshot({path:'test-results/screenshots/hero-'+viewport.name+'.png'});
 });
}

test('search provides an honest empty or configured state',async({page})=>{
 await page.goto('/');
 const search=page.getByRole('combobox',{name:/search official US company registry/i});
 await search.fill('Apple');
 await expect(page.locator('.search-results')).toBeVisible();
 await expect(page.locator('.search-results')).toContainText(/SEC|Apple|unavailable|issuer|registry|configure/i);
});

test('full-screen navigation opens and closes with Escape',async({page})=>{
 await page.setViewportSize({width:375,height:812});
 await page.goto('/');
 await page.getByRole('button',{name:'Open full-screen navigation'}).click();
 const nav=page.getByRole('navigation',{name:'Full navigation'});
 await expect(nav).toBeVisible();
 const rect=await page.locator('.v2-menu-panel').boundingBox();
 expect(rect?.width).toBeGreaterThanOrEqual(374);
 await page.keyboard.press('Escape');
 await expect(page.locator('.v2-menu-panel')).toHaveAttribute('aria-hidden','true');
});

test('reduced motion disables decorative hero movement',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/');
 const result=await page.locator('.c3-pane-stack').evaluate(el=>getComputedStyle(el).animationName);
 expect(result).toBe('none');
});
