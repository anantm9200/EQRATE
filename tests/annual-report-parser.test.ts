import {test} from 'node:test';
import assert from 'node:assert/strict';
import {extractStatements,parseAmount,reviewStatusFor,classifyPage} from '../lib/annual-report-parser';

// Synthetic pages laid out like `pdftotext -layout` output of a Schedule III report.
// Figures are illustrative and internally consistent; they are not any company's data.
const contents=`CONTENTS
Consolidated Balance Sheet as at 31 March 2025 ............ 210
Consolidated Statement of Profit and Loss ................ 212
Consolidated Statement of Cash Flows ..................... 214`;
const balance=`Example Industries Limited
Consolidated Balance Sheet as at 31 March 2025
                                                                         (₹ crore)
                                               Note     As at 31 March 2025    As at 31 March 2024
ASSETS
Non-current assets
(a) Property, plant and equipment               4            9,100                8,700
(b) Goodwill                                    5            1,200                1,200
Total non-current assets                                    30,000               27,500
Current assets
(a) Inventories                                 9               –                    –
(b) Trade receivables                          10           18,400               16,300
(c) Cash and cash equivalents                  11            4,100                3,900
Total current assets                                        70,000               65,500
Total assets                                               100,000               93,000
EQUITY AND LIABILITIES
Equity share capital                           14              360                  362
Total equity                                                60,000               56,000
Non-current liabilities
Total non-current liabilities                               12,000               11,000
Current liabilities
Total current liabilities                                   28,000               26,000
Total equity and liabilities                               100,000               93,000`;
const pnl=`Example Industries Limited
Consolidated Statement of Profit and Loss for the year ended 31 March 2025
                                                                         (₹ crore)
                                               Note    Year ended 31 March 2025   Year ended 31 March 2024
Revenue from operations                        20           120,000              110,000
Other income                                   21             3,000                2,500
Total income                                                123,000              112,500
Employee benefit expenses                      23            60,000               56,000
Finance costs                                  24               700                  650
Depreciation and amortisation expense                        2,900                2,700
Total expenses                                               93,000               86,000
Profit before tax                                            30,000               26,500
Total tax expense                                            (7,700)              (6,800)
Profit for the year                                          22,300               19,700
Other comprehensive income
Profit for the year attributable to shareholders             22,000               19,500`;
const cash=`Consolidated Statement of Cash Flows for the year ended 31 March 2025
(₹ crore)
                                                       Year ended 31 March 2025   Year ended 31 March 2024
Net cash generated from operating activities                  25,000               21,000
Net cash used in investing activities                         (5,000)              (4,000)
Net cash used in financing activities                        (18,000)             (16,000)`;
const standalone=balance.replace('Consolidated Balance Sheet','Standalone Balance Sheet').replace('100,000               93,000','99,000               92,000');

test('amount parsing handles Indian grouping, parentheses and dashes',()=>{
 assert.equal(parseAmount('1,20,000'),120000);assert.equal(parseAmount('(7,700)'),-7700);
 assert.equal(parseAmount('2,553.24'),2553.24);assert.equal(parseAmount('–'),null);
});
test('contents pages are not mistaken for statements',()=>{assert.equal(classifyPage(contents,1),null);});
test('extracts consolidated statements with unit, periods, pages and concepts',()=>{
 const r=extractStatements([contents,balance,pnl,cash]);
 assert.deepEqual(r.pages.map(p=>[p.kind,p.scope,p.page,p.unitLabel,p.periods.join(',')]),[
  ['balance','consolidated',2,'crore','2025-03-31,2024-03-31'],['income','consolidated',3,'crore','2025-03-31,2024-03-31'],
  ['cash_flow','consolidated',4,'crore','2025-03-31,2024-03-31']]);
 const get=(c:string,p='2025-03-31')=>r.figures.find(f=>f.concept===c&&f.periodEnd===p);
 assert.equal(get('totalAssets')?.value,100000);assert.equal(get('totalAssets')?.unitMultiplier,1e7);
 assert.equal(get('currentAssets')?.value,70000);assert.equal(get('receivables','2024-03-31')?.value,16300);
 assert.equal(get('ppeNet')?.value,9100,'note reference column must not be read as the value');
 assert.equal(get('shareCapital')?.value,360);
 assert.equal(get('inventory'),undefined,'a dash is not zero');
 assert.equal(get('revenue')?.value,120000);assert.equal(get('incomeTax')?.value,-7700);
 assert.equal(get('netIncome')?.value,22300,'first "profit for the year" row wins');
 assert.equal(get('operatingCashFlow')?.value,25000);assert.equal(get('investingCashFlow')?.value,-5000);
 assert.equal(get('revenue')?.fiscalYear,2025);
});
test('validators pass on consistent statements and gate review status',()=>{
 const r=extractStatements([balance,pnl,cash]);
 assert.ok(r.validations.length>=4);assert.ok(r.validations.filter(v=>v.passed!==null).every(v=>v.passed));
 assert.equal(reviewStatusFor(r.figures[0],r.validations),'validator_passed');
 const broken=extractStatements([balance.replace('Total equity and liabilities                               100,000','Total equity and liabilities                               100,900'),pnl]);
 const f=broken.figures.find(x=>x.concept==='totalAssets'&&x.periodEnd==='2025-03-31')!;
 assert.equal(reviewStatusFor(f,broken.validations),'pending');
});
test('standalone and consolidated are kept apart',()=>{
 const r=extractStatements([balance,standalone]);
 assert.deepEqual(r.pages.map(p=>p.scope),['consolidated','standalone']);
 assert.equal(r.figures.find(f=>f.scope==='standalone'&&f.concept==='totalAssets'&&f.periodEnd==='2025-03-31')?.value,99000);
});
