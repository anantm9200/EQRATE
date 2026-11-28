import {test,expect,type Page} from '@playwright/test';

const A='5493009CMPAAAAAAAA11',B='5493009CMPBBBBBBBB22';
const records=[
 {source:'GLEIF',identifier:A,name:'COMPARE ALPHA LIMITED',country:'IN',status:'ISSUED',matchType:'prefix'},
 {source:'GLEIF',identifier:B,name:'COMPARE BETA LIMITED',country:'IN',status:'ISSUED',matchType:'prefix'}
];
async function mockSearch(page:Page){
 await page.route('**/api/engine/search?**',r=>{
  const q=new URL(r.request().url()).searchParams.get('q')!.toLowerCase();
  return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({records:records.filter(x=>x.name.toLowerCase().includes(q))})});
 });
}
async function pick(page:Page,input:string,query:string,name:string){
 await page.locator('#'+input).fill(query);
 await page.getByRole('option',{name:new RegExp(name)}).click();
}
const unavailable=(lei:string)=>({lei,asOf:'2026-11-28T00:00:00Z',available:false,reason:'No reviewed financial statements are stored for this company yet.',years:[]});

test('compare picks companies by LEI from the private engine and shows an honest empty state without figures',async({page})=>{
 const calls:string[]=[];
 page.on('request',r=>calls.push(new URL(r.url()).pathname));
 await mockSearch(page);
 await page.route('**/api/engine/lei/*/financials',r=>r.fulfill({status:200,contentType:'application/json',
  body:JSON.stringify(unavailable(r.request().url().split('/').at(-2)!))}));
 let body:any=null;
 await page.route('**/api/engine/compare',r=>{body=r.request().postDataJSON();return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
  asOf:'2026-11-28T00:00:00Z',leis:[A,B],comparable:false,fiscalYears:[],metrics:[],gaps:[],caveats:[],
  companies:[{lei:A,name:'COMPARE ALPHA LIMITED',country:'IN',available:false,reason:'No reviewed financial statements are stored for this company yet.',fiscalYears:[]},
   {lei:B,name:'COMPARE BETA LIMITED',country:'IN',available:false,reason:'No reviewed financial statements are stored for this company yet.',fiscalYears:[]}],
  note:'Reviewed financial statements are not stored for either company yet, so no comparison figures are shown. Missing figures are never estimated.'})});});
 await page.goto('/compare');
 await expect(page.getByText(/Choose two companies/)).toBeVisible();
 await expect(page.locator('.body-wrap')).not.toContainText(/SEC|CIK|ticker/);
 await pick(page,'compare-a','alpha','COMPARE ALPHA');
 await pick(page,'compare-b','beta','COMPARE BETA');
 await expect(page.getByTestId('cmp-availability')).toHaveCount(2);
 await expect(page.getByTestId('cmp-availability').first()).toContainText(/No reviewed financial statements stored/);
 await page.getByRole('button',{name:/Compare companies/}).click();
 const empty=page.getByTestId('compare-empty');
 await expect(empty).toContainText(/Reviewed financials are not available yet/);
 await expect(empty).toContainText(/never estimated/);
 await expect(empty.locator('table')).toHaveCount(0);
 await expect(empty).not.toContainText(/\d[\d,.]*\s?(Cr|crore|M|B|K)\b|₹|\$/);
 expect(body).toEqual({leis:[A,B]});
 expect(calls.some(p=>p.startsWith('/api/search')||p.startsWith('/api/company/'))).toBe(false);
});

test('compare renders aligned fiscal years with reported, computed and not-reported cells from the engine',async({page})=>{
 await mockSearch(page);
 await page.route('**/api/engine/lei/*/financials',r=>r.fulfill({status:200,contentType:'application/json',
  body:JSON.stringify({lei:A,available:true,scope:'consolidated',currency:'INR',reported:[{fiscalYear:2025,figures:[]},{fiscalYear:2024,figures:[]}]})}));
 const cell=(value:number|null,status:string,extra={})=>({value,status,...extra});
 await page.route('**/api/engine/compare',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
  asOf:'2026-11-28T00:00:00Z',leis:[A,B],comparable:true,fiscalYears:[2025,2024],caveats:[],
  gaps:[{lei:B,fiscalYear:2024,metric:'revenue',status:'not reported'}],
  companies:[{lei:A,name:'COMPARE ALPHA LIMITED',country:'IN',available:true,scope:'consolidated',currency:'INR',fiscalYears:[2025,2024]},
   {lei:B,name:'COMPARE BETA LIMITED',country:'IN',available:true,scope:'consolidated',currency:'INR',fiscalYears:[2025]}],
  metrics:[{metric:'revenue',label:'Revenue',kind:'reported',years:[
    {fiscalYear:2025,values:[cell(1e10,'reported',{sourceUrl:'https://example.invalid/a.pdf',page:101,periodEnd:'2025-03-31'}),cell(4e10,'reported',{sourceUrl:'https://example.invalid/b.pdf',page:12,periodEnd:'2025-03-31'})]},
    {fiscalYear:2024,values:[cell(8e9,'reported',{sourceUrl:'https://example.invalid/a.pdf',page:99,periodEnd:'2024-03-31'}),cell(null,'not_reported')]}]},
   {metric:'currentRatio',label:'Current ratio',kind:'ratio',years:[
    {fiscalYear:2025,values:[cell(null,'not_computable'),cell(3,'computed')]},{fiscalYear:2024,values:[cell(null,'not_computable'),cell(null,'not_reported')]}]}],
  note:'Reviewed annual-report figures only, aligned by fiscal year.'})}));
 await page.goto('/compare');
 await pick(page,'compare-a','alpha','COMPARE ALPHA');
 await pick(page,'compare-b','beta','COMPARE BETA');
 await page.getByRole('button',{name:/Compare companies/}).click();
 const result=page.getByTestId('compare-result');
 await expect(result.getByRole('heading',{name:'Fiscal year 2025'})).toBeVisible();
 await expect(result.getByRole('heading',{name:'Fiscal year 2024'})).toBeVisible();
 await expect(result.locator('td[data-status="not_reported"]').first()).toHaveText('Not reported');
 await expect(result.locator('td[data-status="not_computable"]').first()).toHaveText('Not computable');
 await expect(result.locator('td[data-status="computed"]')).toHaveText('3.00×');
 await expect(result.locator('td[data-status="reported"]').first()).toContainText('p. 101');
 await expect(result.getByRole('link',{name:/COMPARE ALPHA LIMITED/}).first()).toHaveAttribute('href','/lei/'+A);
 await expect(result).toContainText(/1 reported figure is not reported/);
});

test('former SEC routes are gone and the SEC company page redirects to the directory',async({page})=>{
 for(const p of ['/api/search?q=apple','/api/company/0000320193/facts','/api/issuers']){
  const r=await page.request.get(p);
  expect(r.status(),p).toBe(410);
  expect((await r.json()).code,p).toBe('SEC_DISABLED');
 }
 const r=await page.request.get('/company/0000320193',{maxRedirects:0});
 expect([301,308]).toContain(r.status());
 expect(r.headers()['location']).toMatch(/\/directory$/);
 await page.goto('/explore');
 await expect(page.locator('.lei-sec-section')).toHaveCount(0);
 await expect(page.getByText(/Need a US listed issuer/)).toHaveCount(0);
});
