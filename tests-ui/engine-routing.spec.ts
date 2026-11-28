import {test,expect} from '@playwright/test';

test('valuation lab shows the private engine result and labels it as engine-computed',async({page})=>{
 let calls=0;
 await page.route('**/api/engine/valuation/dcf',async route=>{
  calls++;
  const body=route.request().postDataJSON() as {cases:unknown[]};
  const result={enterpriseValue:5000,equityValue:4242,projectedCashFlows:[1,2,3,4,5],terminalValue:7000,impliedPerShare:84.84};
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
   computedBy:'creqor-dgx-engine',methodology:'creqor-dcf-v1',results:body.cases.map(()=>({ok:true,result}))})});
 });
 await page.goto('/lab');
 const panel=page.locator('.lab-result');
 await expect(panel.locator('.result-big')).toContainText('4,242');
 await expect(panel.locator('.cq-engine-provenance')).toHaveAttribute('data-engine-source','engine');
 await expect(panel.locator('.cq-engine-provenance')).toContainText('Computed by the CREQOR private engine · creqor-dcf-v1');
 expect(calls).toBeGreaterThan(0);
});
test('valuation lab falls back to an in-browser calculation with an honest label when the engine is unreachable',async({page})=>{
 await page.route('**/api/engine/valuation/dcf',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'unreachable'})}));
 await page.goto('/lab');
 const panel=page.locator('.lab-result');
 await expect(panel.locator('.cq-engine-provenance')).toContainText('Computed in your browser — private engine unreachable');
 await expect(panel.locator('.result-big')).not.toContainText('4,242');
});
