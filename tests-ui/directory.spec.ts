import {test,expect} from '@playwright/test';

const A={
 lei:'12345678901234567890',name:'Synthetic Example Holding Limited',country:'US',
 jurisdiction:'US-DE',status:'ACTIVE',registrationStatus:'ISSUED',category:'GENERAL',
 lastUpdate:'2026-11-17',nextRenewal:'2027-11-17',registeredAs:'EXAMPLE-ONE',
 address:'Somewhere',headquarters:'Example Street',sourceUrl:'https://search.gleif.org/#/record/12345678901234567890'
};
const B={...A,lei:'ABCDEFGHIJ1234567890',name:'Synthetic Research International',registrationStatus:'LAPSED'};
const C={...A,lei:'98765432109876543210',name:'Synthetic Global Markets'};
const API={
 source:'GLEIF',published:'2026-11-17T12:00:00Z',
 notice:'LEI reference data does not establish prices, financials or ratings.',
 total:80,pageSize:36,hasMore:true
};
test('worldwide directory has navigation, filtering and official source disclosures',async({page})=>{
 await page.goto('/directory');
 await expect(page.getByRole('heading',{name:/Every company starts/i})).toBeVisible();
 await expect(page.getByRole('combobox',{name:'Filter companies by country'})).toBeVisible();
 await expect(page.getByRole('searchbox',{name:'Search global company directory'})).toBeVisible();
 await expect(page.getByText('Identity is not a rating.')).toBeVisible();
 await expect(page.getByRole('option',{name:/India \(IN\)/})).toBeAttached();
 await expect(page.getByRole('option',{name:/United Arab Emirates \(AE\)/})).toBeAttached();
 await expect(page.getByRole('option',{name:/Namibia \(NA\)/})).toBeAttached();
});
test('country browsing, pagination, record links and saved companies work',async({page})=>{
 await page.route('**/api/directory?*',async route=>{
  const url=new URL(route.request().url());
  const n=Number(url.searchParams.get('page')||'1');
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...API,
   page:n,results:n===1?[A,B]:[C],hasMore:n===1
  })});
 });
 await page.goto('/directory');
 await page.getByRole('button',{name:'United States'}).click();
 await expect(page.getByRole('combobox',{name:'Filter companies by country'})).toHaveValue('US');
 await expect(page.locator('.gd-company')).toHaveCount(2);
 await expect(page.getByRole('link',{name:'Synthetic Example Holding Limited'})).toHaveAttribute('href','/lei/12345678901234567890');
 await expect(page.locator('.gd-company')).toContainText(['ISSUED','LAPSED']);
 await page.getByRole('button',{name:/Load 36 more companies/i}).click();
 await expect(page.locator('.gd-company')).toHaveCount(3);
 await page.getByRole('button',{name:'Bookmark Synthetic Example Holding Limited'}).click();
 await page.getByRole('button',{name:/Saved \(1\)/}).click();
 await expect(page.locator('.gd-company')).toHaveCount(1);
 await expect(page.locator('.gd-company').first()).toContainText('Synthetic Example Holding Limited');
 await page.reload();
 await page.getByRole('button',{name:/Saved \(1\)/}).click();
 await expect(page.locator('.gd-company')).toHaveCount(1);
});
test('search query is encoded and country filters stay present',async({page})=>{
 const seen:string[]=[];
 await page.route('**/api/directory?*',async route=>{
  seen.push(route.request().url());
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...API,page:1,results:[A],total:1,hasMore:false})});
 });
 await page.goto('/directory');
 await page.getByRole('button',{name:'India'}).click();
 await expect(page.locator('.gd-company')).toHaveCount(1);
 await page.getByRole('searchbox',{name:'Search global company directory'}).fill('Tata & Sons');
 await expect.poll(()=>seen.some(u=>new URL(u).searchParams.get('q')==='Tata & Sons'&&new URL(u).searchParams.get('country')==='IN')).toBe(true);
 await expect(page).toHaveURL(/country=IN/);
});
test('upstream errors never invent company records',async({page})=>{
 await page.route('**/api/directory?*',async route=>{
  await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'GLEIF temporarily unavailable for this test.'})});
 });
 await page.goto('/directory');
 await page.getByRole('button',{name:'Japan'}).click();
 await expect(page.locator('.gd-feedback[role="alert"]')).toContainText('temporarily unavailable');
 await expect(page.locator('.gd-company')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Try again'})).toBeVisible();
});
for(const width of [320,375,768,1440]){
 test('global directory responsive at '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:850});
  await page.goto('/directory');
  const dimensions=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:innerWidth}));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.viewport+2);
  await expect(page.locator('.gd-toolbar')).toBeVisible();
 });
}
test('directory rejects unsound country and pagination parameters',async({request})=>{
 for(const path of ['/api/directory?country=USA','/api/directory?page=0','/api/directory?page=500','/api/directory?q=x']){
  const result=await request.get(path);
  expect(result.status(),path).toBe(400);
 }
});
