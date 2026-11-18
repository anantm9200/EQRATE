import {test,expect} from '@playwright/test';

test('portfolio intelligence explains change detection using locally saved company drafts',async({page})=>{
 const entries=[
  {id:'assessment-history-a',name:'Synthetic Northwind Ltd',identifier:'REG-123',country:'India',currency:'USD',kind:'unlisted',asOf:'2025-01-01',fields:{revenue:10},evidence:[{id:'a-id',title:'Illustrative registry note',url:'https://example.org/company/123',kind:'user_provided',claim:'identity',asOf:'2025-01-01',notes:'Synthetic only'}]},
  {id:'assessment-history-b',name:'Synthetic Northwind Ltd',identifier:'REG-123',country:'India',currency:'USD',kind:'unlisted',asOf:'2026-01-01',fields:{revenue:25},evidence:[{id:'b-id',title:'Illustrative registry note',url:'https://example.org/company/123',kind:'user_provided',claim:'identity',asOf:'2026-01-01',notes:'Synthetic only'}]}
 ];
 await page.addInitScript(records=>localStorage.setItem('creqor.assessment-workspace.v1',JSON.stringify(records)),entries);
 await page.goto('/intelligence');
 const section=page.getByRole('region',{name:'Cross-company intelligence'});
 await expect(section).toBeVisible();
 await expect(section.getByText('Material change in entered revenue')).toBeVisible();
 await expect(section.getByText('One evidence URL supports different companies')).toHaveCount(0);
 await expect(section.getByText(/These are research leads—not verified affiliations or ratings/i)).toBeVisible();
});

test('cross-jurisdiction registration number is flagged without inventing a corporate relationship',async({page})=>{
 const entries=[
  {id:'assessment-alpha-a',name:'Synthetic Atlas Ltd',identifier:'REG-123',country:'India',currency:'USD',kind:'unlisted',asOf:'2025-01-01',fields:{revenue:1},evidence:[]},
  {id:'assessment-alpha-b',name:'Synthetic Atlas Ltd',identifier:'REG-123',country:'Namibia',currency:'USD',kind:'unlisted',asOf:'2026-01-01',fields:{revenue:100},evidence:[]}
 ];
 await page.addInitScript(records=>localStorage.setItem('creqor.assessment-workspace.v1',JSON.stringify(records)),entries);
 await page.goto('/intelligence');
 const section=page.getByRole('region',{name:'Cross-company intelligence'});
 await expect(section.getByText('Registration identifier appears in different jurisdictions')).toBeVisible();
 await expect(section.getByText('Material change in entered revenue')).toHaveCount(0);
});
