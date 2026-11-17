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
  const fold=await page.evaluate(()=>{
    const header=document.querySelector('.v2-header')!.getBoundingClientRect();
    const hero=document.querySelector('.c3-hero')!.getBoundingClientRect();
    const content=document.querySelector('.c3-hero-message')!.getBoundingClientRect();
    const artwork=document.querySelector('.c3-hero-graphic')!.getBoundingClientRect();
    const bottom=document.querySelector('.c3-hero-bottom')!.getBoundingClientRect();
    return {header:{top:header.top,bottom:header.bottom},hero:{top:hero.top,bottom:hero.bottom,height:hero.height},content:{left:content.left,right:content.right,top:content.top,bottom:content.bottom},artwork:{top:artwork.top,bottom:artwork.bottom},bottom:{top:bottom.top,bottom:bottom.bottom}};
  });
  expect(fold.header.bottom,'Header within first fold').toBeLessThan(viewport.height);
  expect(fold.hero.top,'Hero begins under header').toBeGreaterThanOrEqual(fold.header.bottom-2);
  expect(fold.hero.bottom,'Hero ends at viewport bottom').toBeLessThanOrEqual(viewport.height+2);
  expect(fold.hero.bottom,'Hero fills viewport').toBeGreaterThanOrEqual(viewport.height-2);
  expect(fold.bottom.bottom,'Bottom navigation stays in first fold').toBeLessThanOrEqual(viewport.height+2);
  expect(fold.content.top,'Content is visible in hero').toBeGreaterThanOrEqual(fold.header.bottom-2);
  expect(fold.content.bottom,'Content is not clipped by bottom navigation').toBeLessThanOrEqual(fold.bottom.top+2);
  expect(fold.artwork.top,'Artwork begins within the first fold').toBeLessThan(viewport.height-40);
  const radii=await page.evaluate(()=>{
    const selectors='button, [role="button"], a.primary-button, a.secondary-button, a.v2-primary-cta, a.v2-ai-link, a.v2-cta-round, a.round-link';
    return [...document.querySelectorAll<HTMLElement>(selectors)].map(el=>{
      const s=getComputedStyle(el);
      return {tag:el.tagName,cls:el.className,radius:Math.max(...[s.borderTopLeftRadius,s.borderTopRightRadius,s.borderBottomLeftRadius,s.borderBottomRightRadius].map(parseFloat))};
    });
  });
  for(const control of radii) expect(control.radius,'Button corner radius: '+control.cls).toBeLessThanOrEqual(9);

  const searchWidget=page.locator('.c3-hero-search .company-search');
  await expect(searchWidget).toBeVisible();
  const widgetHeight=await searchWidget.evaluate(node=>node.getBoundingClientRect().height);
  expect(widgetHeight,'Search should not inherit full hero-section height').toBeLessThan(180);
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
