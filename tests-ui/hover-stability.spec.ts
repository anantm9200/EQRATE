import {test,expect} from '@playwright/test';

test('interactive signal path changes its explanation without a page jump',async({page})=>{
 await page.goto('/');
 await expect(page.getByRole('heading',{name:/Beautiful on the surface/i})).toBeVisible();
 const evidence=page.getByRole('tab',{name:'Evidence trail'});
 // Live source panels above can still be loading on production; measure only once layout is settled.
 await page.waitForLoadState('networkidle');
 await evidence.scrollIntoViewIfNeeded();
 await page.waitForTimeout(400);
 const before=await evidence.boundingBox();
 await evidence.hover();
 await page.waitForTimeout(300);
 const after=await evidence.boundingBox();
 expect(before).not.toBeNull();
 expect(after).not.toBeNull();
 expect(Math.abs(after!.x-before!.x)).toBeLessThan(1);
 expect(Math.abs(after!.y-before!.y)).toBeLessThan(1);
 await evidence.click();
 await expect(evidence).toHaveAttribute('aria-selected','true');
 await expect(page.getByRole('tabpanel',{name:'Evidence trail'})).toContainText('A recorded link is not the same as an authenticated document.');
 await evidence.press('ArrowRight');
 await expect(page.getByRole('tab',{name:'Valuation logic'})).toHaveAttribute('aria-selected','true');
 await expect(page.getByRole('tabpanel',{name:'Valuation logic'})).toContainText('A modelled equity value is not a live market quote.');
});

test('navigation hover does not shift the full-screen menu items',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await page.goto('/');
 await page.getByRole('button',{name:'Open full-screen navigation'}).click();
 const link=page.getByRole('navigation',{name:'Full navigation'}).getByRole('link',{name:/Company workbench/i});
 await expect(link).toBeVisible();
 const before=await link.boundingBox();
 await link.hover();
 await page.waitForTimeout(320);
 const after=await link.boundingBox();
 expect(before).not.toBeNull();expect(after).not.toBeNull();
 expect(Math.abs(after!.x-before!.x)).toBeLessThan(1);
 expect(Math.abs(after!.width-before!.width)).toBeLessThan(1);
});

test('reduced-motion mode keeps signal path usable',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/');
 const tab=page.getByRole('tab',{name:'Evidence trail'});
 await tab.click();
 await expect(tab).toHaveAttribute('aria-selected','true');
 await expect(page.getByRole('tabpanel',{name:'Evidence trail'})).toContainText(/TRACE THE CLAIM/i);
});
