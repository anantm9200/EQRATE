import {test,expect} from '@playwright/test';

const lei='5493001KJTIIGC8Y1R12',cik='0000320193';
const identity={
 type:'legal-identity',asOf:'2026-11-18',subject:{name:'Synthetic Reference Entity',identifier:lei,country:'US',jurisdiction:'US-DE'},
 record:{registrationStatus:'LAPSED',entityStatus:'ACTIVE',lastUpdate:'2025-06-01',nextRenewal:'2025-09-01',registeredAs:'TEST',address:'Test Street'},
 completeness:{present:10,total:11,percent:91,label:'GLEIF field completeness — not a company rating'},
 sources:[{id:'gleif:'+lei,authority:'Global Legal Entity Identifier Foundation (GLEIF)',label:'Level 1 legal-entity reference record',url:'https://search.gleif.org/#/record/'+lei,date:'2025-06-01',reference:lei}],
 signals:[{id:'renewal-overdue',group:'Identity',level:'attention',title:'Recorded renewal date has passed',description:'The renewal date has passed.',why:'Reference maintenance only; not solvency.',sourceIds:['gleif:'+lei]}],
 disclosure:'Synthetic identity observations are not credit ratings.'
};
const accession='0000320193-26-000123';
const revenue={key:'revenue',label:'Revenue',value:120000000,unit:'USD',start:'2024-10-01',end:'2025-09-30',filed:'2026-01-10',accession,form:'10-K',concept:'Revenues',sourceId:'sec:'+accession};
const sec={
 type:'sec-financials',asOf:'2026-11-18',subject:{name:'Synthetic SEC Issuer',cik,tickers:['TEST'],exchanges:['NASDAQ']},
 periods:[{end:'2025-09-30',metrics:{revenue,netIncome:{...revenue,key:'netIncome',label:'Net income',value:10000000}}},
  {end:'2024-09-30',metrics:{revenue:{...revenue,value:100000000,end:'2024-09-30'}}}],
 signals:[{id:'cashflow',group:'Financials',level:'review',title:'Cash flow needs review',description:'Insufficient source coverage.',why:'Review original XBRL facts.',sourceIds:['sec:'+accession]}],
 indicators:[{id:'revenue-growth',label:'Annual reported revenue change',value:20,unit:'percent',interpretation:'Computed from comparable annual USD observations.',sourceIds:['sec:'+accession]}],
 sources:[{id:'sec:'+accession,authority:'U.S. Securities and Exchange Commission',label:'10-K filing '+accession,reference:accession,date:'2026-01-10',url:'https://www.sec.gov/Archives/edgar/data/320193/000032019326000123/'+accession+'-index.htm'}],
 coverage:{reportedMetricTypes:2,totalMetricTypes:7,historicalPeriods:2,label:'Supported US GAAP observations — not a financial quality score'},
 latestPeriodEnd:'2025-09-30',
 disclosure:'Official issuer-reported XBRL; no market price or independent investment rating.'
};
test('intelligence page is a functioning source-selection workspace',async({page})=>{
 await page.goto('/intelligence');
 await expect(page.getByRole('heading',{name:/Intelligence that/i})).toBeVisible();
 await expect(page.getByRole('tab',{name:/Global legal-entity intelligence/i})).toBeVisible();
 await expect(page.getByRole('tab',{name:/US financial intelligence/i})).toBeVisible();
 await expect(page.getByRole('searchbox',{name:'Search global entity intelligence'})).toBeVisible();
 await expect(page.getByText('Find the signal.')).toBeVisible();
});
test('live GLEIF search populates source-linked signals without issuing a rating',async({page})=>{
 await page.route('**/api/lei/search?q=*',async route=>route.fulfill({
  contentType:'application/json',body:JSON.stringify({results:[{lei,name:'Synthetic Reference Entity',country:'US',registrationStatus:'LAPSED'}]})
 }));
 await page.route('**/api/intelligence/lei/'+lei,async route=>route.fulfill({contentType:'application/json',body:JSON.stringify(identity)}));
 await page.goto('/intelligence');
 await page.getByRole('searchbox',{name:'Search global entity intelligence'}).fill('Synthetic Reference');
 await page.getByRole('option',{name:/Synthetic Reference Entity/i}).click();
 await expect(page.getByRole('heading',{name:'Synthetic Reference Entity'})).toBeVisible();
 await expect(page.getByText('LAPSED',{exact:true})).toBeVisible();
 await expect(page.getByText('Recorded renewal date has passed')).toBeVisible();
 await page.locator('.iq-signal').first().locator('summary').click();
 await expect(page.locator('.iq-signal-details a')).toHaveAttribute('href',identity.sources[0].url);
 await expect(page).toHaveURL(new RegExp('lei='+lei));
 await expect(page.getByText(/field completeness — not a company rating/i)).toBeVisible();
});
test('SEC search shows annual reports, ratios, and exact filing provenance',async({page})=>{
 await page.route('**/api/search?q=*',async route=>route.fulfill({contentType:'application/json',
  body:JSON.stringify({results:[{cik,name:'Synthetic SEC Issuer',ticker:'TEST',exchange:'NASDAQ'}]})}));
 await page.route('**/api/intelligence/sec/'+cik,async route=>route.fulfill({contentType:'application/json',body:JSON.stringify(sec)}));
 await page.goto('/intelligence');
 await page.getByRole('tab',{name:/US financial intelligence/i}).click();
 await page.getByRole('searchbox',{name:'Search US financial intelligence'}).fill('Synthetic SEC');
 await page.getByRole('option',{name:/Synthetic SEC Issuer/i}).click();
 await expect(page.getByRole('heading',{name:'Synthetic SEC Issuer'})).toBeVisible();
 await expect(page.getByText('Annual reported revenue change')).toBeVisible();
 await expect(page.getByText('+20.0%')).toBeVisible();
 await page.getByRole('button',{name:'Net income',exact:true}).click();
 await expect(page.locator('.iq-history-row').last()).toContainText('$10M');
 await expect(page.locator('.iq-sources-grid a').first()).toHaveAttribute('href',sec.sources[0].url);
});
test('unavailable SEC connector produces an honest message, never synthetic financials',async({page})=>{
 await page.route('**/api/intelligence/sec/'+cik,async route=>route.fulfill({status:503,contentType:'application/json',
  body:JSON.stringify({error:'The SEC connector is not configured for this deployment.'})}));
 await page.goto('/intelligence?cik='+cik);
 await expect(page.getByRole('alert')).toContainText('SEC connector is not configured');
 await expect(page.locator('.iq-financial-panel')).toHaveCount(0);
});
for(const width of [320,375,768,1440]){
 test('intelligence search and results fit '+width+'px viewport',async({page})=>{
  await page.setViewportSize({width,height:870});
  await page.route('**/api/intelligence/lei/'+lei,async route=>route.fulfill({contentType:'application/json',body:JSON.stringify(identity)}));
  await page.goto('/intelligence?lei='+lei);
  await expect(page.locator('.iq-report')).toBeVisible();
  await expect(page.locator('.iq-source-tabs')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(2);
 });
}
test('invalid backend identifiers are rejected without fetching upstream data',async({request})=>{
 const invalid=await request.get('/api/intelligence/lei/nope');
 expect(invalid.status()).toBe(400);
 const invalidCik=await request.get('/api/intelligence/sec/123');
 expect(invalidCik.status()).toBe(400);
});
