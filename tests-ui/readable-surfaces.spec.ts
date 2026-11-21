import {test,expect} from '@playwright/test';

/** Relative luminance contrast between two computed rgb() colours. */
function contrast(a:string,b:string){
 const lum=(c:string)=>{const [r,g,bl]=(c.match(/[\d.]+/g)||[]).slice(0,3).map(Number).map(v=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4});
  return .2126*r+.7152*g+.0722*bl;};
 const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p);return (x+.05)/(y+.05);
}
const cases:[string,string][]= [
 ['/methodology','.panel.dark h3'],['/verification','.panel.dark h3'],['/analyst','.panel.dark h3'],
 ['/lab','.lab-result .metric-list strong'],['/workbench','.wk-side-stat strong']
];
for(const [path,selector] of cases){
 test('text on dark panels stays readable: '+path,async({page})=>{
  await page.goto(path);
  const el=page.locator(selector).first();
  await expect(el).toBeVisible();
  const {fg,bg}=await el.evaluate(node=>{
   let n:Element|null=node,bg='rgb(255, 255, 255)';
   while(n){const c=getComputedStyle(n).backgroundColor;if(c!=='rgba(0, 0, 0, 0)'&&!c.endsWith(', 0)')){bg=c;break;}n=n.parentElement;}
   return {fg:getComputedStyle(node).color,bg};
  });
  expect(contrast(fg,bg),selector+' '+fg+' on '+bg).toBeGreaterThanOrEqual(4.5);
 });
}

test('homepage coverage names CREQOR’s private index count when the engine reports one',async({page})=>{
 await page.route('**/api/public-records/coverage',async r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
  source:'GLEIF',referenceRecords:3501010,asOf:'2026-11-20 08:00:00',locallyIndexed:3498919,locallyIndexedOperational:true,
  indexLocation:'private-engine',indiaIndexed:411587})}));
 await page.route('**/api/companies/featured',async r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({source:'GLEIF',records:[]})}));
 await page.goto('/');
 const coverage=page.getByRole('region',{name:/official public legal-entity dataset coverage/i});
 await expect(coverage).toContainText('3,498,919 legal entities stored in CREQOR’s private index, including 411,587 Indian entities.');
 await expect(coverage).not.toContainText(/not yet activated/i);
});

test('private index count still shows when official GLEIF figures are unavailable, without a global count',async({page})=>{
 await page.route('**/api/public-records/coverage',async r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
  source:'GLEIF',referenceRecords:null,asOf:null,locallyIndexed:3498919,locallyIndexedOperational:true,indexLocation:'private-engine',indiaIndexed:411587})}));
 await page.route('**/api/companies/featured',async r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({source:'GLEIF',records:[]})}));
 await page.goto('/');
 const coverage=page.getByRole('region',{name:/official public legal-entity dataset coverage/i});
 await expect(coverage).toContainText('3,498,919');
 await expect(coverage).toContainText(/no global count is shown/i);
 await expect(coverage).not.toContainText(/in the official GLEIF index/i);
});
