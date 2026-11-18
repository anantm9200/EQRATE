import {test,expect} from '@playwright/test';

test('research workspace animates a real DCF scenario while in view',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await page.goto('/');
 const workspace=page.locator('.ux-motion-workspace');
 await workspace.scrollIntoViewIfNeeded();
 const slider=page.getByRole('slider',{name:'Illustrative DCF discount rate'});
 const first=await slider.inputValue();
 await expect(workspace.getByRole('button',{name:'Pause animated valuation demo'})).toBeVisible();
 await expect.poll(()=>slider.inputValue(),{timeout:9500}).not.toBe(first);
 await expect(page.locator('.ux-motion-figure')).toContainText('$');
 await expect(page.locator('.ux-motion-cursor-glow')).toBeVisible();
});

test('manual valuation input pauses autoplay without altering the calculated model',async({page})=>{
 await page.goto('/');
 const workspace=page.locator('.ux-motion-workspace');
 await workspace.scrollIntoViewIfNeeded();
 const slider=page.getByRole('slider',{name:'Illustrative DCF discount rate'});
 await slider.fill('16');
 await expect(workspace.getByRole('button',{name:'Play animated valuation demo'})).toBeVisible();
 const frozen=await slider.inputValue();
 await page.waitForTimeout(3550);
 expect(await slider.inputValue()).toBe(frozen);
 await expect(page.locator('.ux-model-range output')).toHaveText('16.0%');
 await workspace.getByRole('button',{name:'Play animated valuation demo'}).click();
 await expect(workspace.getByRole('button',{name:'Pause animated valuation demo'})).toBeVisible();
 await expect.poll(()=>slider.inputValue(),{timeout:9500}).not.toBe(frozen);
});

test('discover and evidence tabs animate without losing evidence selections',async({page})=>{
 await page.goto('/');
 const panel=page.locator('.ux-motion-workspace');
 await panel.getByRole('tab',{name:/01 Discover/}).click();
 await expect(panel.getByText('The right company, first.')).toBeVisible();
 await panel.getByRole('tab',{name:/03 Evidence/}).click();
 await panel.getByRole('checkbox',{name:/Legal identity/}).check();
 await expect(panel.locator('.ux-evidence-head')).toContainText('1 / 3');
 await panel.getByRole('tab',{name:/02 Model/}).click();
 await panel.getByRole('tab',{name:/03 Evidence/}).click();
 await expect(panel.getByRole('checkbox',{name:/Legal identity/})).toBeChecked();
});

test('reduced motion disables autoplay and unnecessary animations',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/');
 const panel=page.locator('.ux-motion-workspace');
 await panel.scrollIntoViewIfNeeded();
 await expect(panel.getByRole('button',{name:'Play animated valuation demo'})).toBeDisabled();
 const value=await page.getByRole('slider',{name:'Illustrative DCF discount rate'}).inputValue();
 await page.waitForTimeout(3450);
 expect(await page.getByRole('slider',{name:'Illustrative DCF discount rate'}).inputValue()).toBe(value);
 const css=await panel.evaluate(el=>({
  pulse:getComputedStyle(el.querySelector('.ux-motion-cursor-glow')!).animationName,
  sheen:getComputedStyle(el.querySelector('.ux-preview-top')!,'::after').animationName
 }));
 expect(css.pulse).toBe('none');
 expect(css.sheen).toBe('none');
});

for(const width of [320,375,768,1440]){
 test('animated research workspace fits '+width+'px without horizontal overflow',async({page})=>{
  await page.setViewportSize({width,height:800});
  await page.goto('/');
  await expect(page.locator('.ux-motion-workspace')).toBeVisible();
  const widthInfo=await page.evaluate(()=>({actual:document.documentElement.scrollWidth,limit:window.innerWidth}));
  expect(widthInfo.actual).toBeLessThanOrEqual(widthInfo.limit+2);
 });
}
