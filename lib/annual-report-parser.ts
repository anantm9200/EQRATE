/**
 * Deterministic extraction of primary financial statements from Indian annual reports.
 *
 * Input: page texts produced by `pdftotext -layout` (one string per page). Indian
 * companies present statements in the Schedule III (Ind AS) format, so line-item labels
 * are standardised ("Revenue from operations", "Total equity", "Net cash generated from
 * operating activities" …). We locate statement pages, read the unit and the period
 * columns from the header, and map recognised labels to normalized concepts.
 *
 * No model is involved: every value is copied from a labelled row on a cited page.
 * Unrecognised rows are ignored; a dash ("–") is not read as zero; validation checks
 * (balance-sheet identity, sub-totals) decide whether figures may skip manual review.
 */
export type StatementKind='balance'|'income'|'cash_flow';
export type Scope='consolidated'|'standalone';
export type ExtractedFigure={concept:string;label:string;statement:StatementKind;scope:Scope;
 periodEnd:string;fiscalYear:number;value:number;unitLabel:string;unitMultiplier:number;page:number};
export type StatementPage={page:number;kind:StatementKind;scope:Scope;unitLabel:string;unitMultiplier:number;periods:string[]};
export type ValidationResult={check:string;passed:boolean|null;detail:string};
export type Extraction={figures:ExtractedFigure[];pages:StatementPage[];validations:ValidationResult[];warnings:string[]};

const UNITS:[RegExp,string,number][]=[
 [/\b(?:in\s+)?(?:₹|rs\.?|inr)\s*(?:in\s+)?crores?\b|\bcrores?\b/i,'crore',1e7],
 [/\b(?:in\s+)?(?:₹|rs\.?|inr)\s*(?:in\s+)?lakhs?\b|\blakhs?\b/i,'lakh',1e5],
 [/\b(?:in\s+)?(?:₹|rs\.?|inr)\s*(?:in\s+)?millions?\b|\bmillions?\b/i,'million',1e6],
 [/\b(?:in\s+)?(?:₹|rs\.?|inr)\s*(?:in\s+)?billions?\b|\bbillions?\b/i,'billion',1e9]
];
const MONTHS:Record<string,string>={jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'};
const DAYS_IN:Record<string,string>={'01':'31','02':'28','03':'31','04':'30','05':'31','06':'30','07':'31','08':'31','09':'30','10':'31','11':'30','12':'31'};

/** Statement titles (Schedule III). Order matters: consolidated before standalone. */
const TITLES:[RegExp,StatementKind][]=[
 [/balance\s+sheet\s+as\s+at/i,'balance'],
 [/statement\s+of\s+profit\s+and\s+loss/i,'income'],
 [/statement\s+of\s+cash\s+flows?/i,'cash_flow']
];

/** Label → concept. Anchored so "Total assets" does not match "Total current assets". */
const CONCEPTS:Record<StatementKind,[RegExp,string][]>={
 balance:[
  [/^total\s+assets$/i,'totalAssets'],[/^total\s+current\s+assets$/i,'currentAssets'],[/^total\s+non-?\s*current\s+assets$/i,'nonCurrentAssets'],
  [/^total\s+equity$/i,'bookEquity'],[/^equity\s+attributable\s+to\s+(?:the\s+)?(?:equity\s+)?(?:share|stock)holders\s+of\s+the\s+(?:company|parent)$/i,'equityAttributableToParent'],
  [/^non-?\s*controlling\s+interests?$/i,'nonControllingInterest'],[/^equity\s+share\s+capital$/i,'shareCapital'],
  [/^total\s+current\s+liabilities$/i,'currentLiabilities'],[/^total\s+non-?\s*current\s+liabilities$/i,'nonCurrentLiabilities'],
  [/^total\s+liabilities$/i,'totalLiabilities'],[/^total\s+equity\s+and\s+liabilities$/i,'totalEquityAndLiabilities'],
  [/^cash\s+and\s+cash\s+equivalents$/i,'cash'],[/^trade\s+receivables$/i,'receivables'],[/^inventories$/i,'inventory'],
  [/^property,?\s+plant\s+and\s+equipment$/i,'ppeNet'],[/^goodwill$/i,'goodwill']
 ],
 income:[
  [/^revenue\s+from\s+operations$/i,'revenue'],[/^total\s+income$/i,'totalIncome'],[/^other\s+income(?:,?\s*net)?$/i,'otherIncome'],
  [/^total\s+expenses$/i,'totalExpenses'],[/^employee\s+benefits?\s+expenses?$/i,'employeeExpense'],
  [/^cost\s+of\s+materials\s+consumed$/i,'costOfMaterials'],[/^finance\s+costs?$/i,'interestExpense'],
  [/^depreciation\s+and\s+amorti[sz]ation\s+expenses?$/i,'depreciation'],[/^profit\s+before\s+(?:exceptional\s+items\s+and\s+)?tax$/i,'profitBeforeTax'],
  [/^total\s+tax\s+expenses?$/i,'incomeTax'],[/^profit\s+for\s+the\s+(?:year|period)$/i,'netIncome']
 ],
 cash_flow:[
  [/^net\s+cash\s+(?:generated\s+)?(?:from|by|used\s+in|\(used\s+in\)|generated\s+from\s*\/\s*\(used\s+in\))\s+operating\s+activities$/i,'operatingCashFlow'],
  [/^net\s+cash\s+(?:generated\s+)?(?:from|used\s+in|\(used\s+in\)|generated\s+from\s*\/\s*\(used\s+in\))\s+investing\s+activities$/i,'investingCashFlow'],
  [/^net\s+cash\s+(?:generated\s+)?(?:from|used\s+in|\(used\s+in\)|generated\s+from\s*\/\s*\(used\s+in\))\s+financing\s+activities$/i,'financingCashFlow']
 ]
};

const NUM=/\(?-?\d{1,3}(?:,\d{2,3})*(?:\.\d+)?\)?|\(?-?\d+(?:\.\d+)?\)?/g;
export function parseAmount(token:string):number|null{
 const t=token.trim();
 if(!/\d/.test(t))return null;
 const neg=/^\(.*\)$/.test(t)||t.startsWith('-');
 const n=Number(t.replace(/[(),\s-]/g,''));
 return Number.isFinite(n)?(neg?-n:n):null;
}
function detectUnit(text:string):[string,number]|null{
 const head=text.split('\n').slice(0,25).join(' ');
 for(const [re,label,mult] of UNITS)if(re.test(head))return [label,mult];
 return null;
}
/** Period-end dates in header order, e.g. "As at 31 March 2025   As at 31 March 2024". */
function detectPeriods(text:string):string[]{
 const head=text.split('\n').slice(0,30).join(' ');
 const found:string[]=[];
 const re=/(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*,?\s+(\d{4})|(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/gi;
 for(const m of head.matchAll(re)){
  const mon=MONTHS[(m[2]||m[4]).slice(0,3).toLowerCase()],day=(m[1]||m[5]).padStart(2,'0'),year=m[3]||m[6];
  const iso=`${year}-${mon}-${day}`;
  if(!found.includes(iso))found.push(iso);
 }
 if(found.length)return found.slice(0,2);
 // "Year ended March 2025" / "FY 2025" style headers without a day: month end is implied.
 for(const m of head.matchAll(/(?:year\s+ended|as\s+at)\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{4})/gi)){
  const mon=MONTHS[m[1].slice(0,3).toLowerCase()];const iso=`${m[2]}-${mon}-${DAYS_IN[mon]}`;
  if(!found.includes(iso))found.push(iso);
 }
 return found.slice(0,2);
}
/** Indian fiscal year is named by the calendar year in which it ends. */
const fiscalYearOf=(periodEnd:string)=>Number(periodEnd.slice(0,4));

export function classifyPage(text:string,page:number):StatementPage|null{
 const head=text.split('\n').slice(0,14).join(' ').replace(/\s+/g,' ');
 for(const [re,kind] of TITLES){
  if(!re.test(head))continue;
  // Index / contents pages list every title with page numbers but contain no totals.
  const body=text.toLowerCase();
  const anchor=kind==='balance'?/total\s+assets/:kind==='income'?/revenue\s+from\s+operations|total\s+income/:/operating\s+activities/;
  if(!anchor.test(body))return null;
  if((head.match(/statement|balance sheet|notes/gi)||[]).length>4)return null;
  const scope:Scope=/consolidated/i.test(head)?'consolidated':'standalone';
  const unit=detectUnit(text);const periods=detectPeriods(text);
  if(!unit||!periods.length)return null;
  return {page,kind,scope,unitLabel:unit[0],unitMultiplier:unit[1],periods};
 }
 return null;
}

function rowLabelAndValues(line:string,columns:number):{label:string;values:(number|null)[]}|null{
 // Split on runs of 2+ spaces (pdftotext -layout keeps columns apart).
 const cells=line.trim().split(/\s{2,}/);
 if(cells.length<2)return null;
 const label=cells[0].replace(/^[A-Za-z]?\)?\s*\(?[ivx]+\)\s*|^\(?[a-z]\)\s*|^\d+\.\s+/i,'').replace(/\s+/g,' ').trim();
 const tail=cells.slice(1);
 // Values are the last `columns` cells; an earlier small integer cell is a note reference.
 const raw=tail.slice(-columns);
 if(raw.length<columns)return null;
 const values=raw.map(c=>/^[–—-]+$/.test(c.trim())?null:(c.match(NUM)?.length===1?parseAmount(c):null));
 if(values.every(v=>v===null))return null;
 return {label,values};
}

export function extractStatements(pages:string[]):Extraction{
 const figures:ExtractedFigure[]=[];const found:StatementPage[]=[];const warnings:string[]=[];
 const seen=new Set<string>();
 pages.forEach((text,i)=>{
  const info=classifyPage(text,i+1);
  if(!info)return;
  // Only the first page of each statement/scope is used; continuation pages are rare in Schedule III.
  const key=info.kind+':'+info.scope;
  if(seen.has(key)){warnings.push(`Additional ${key} page ${info.page} ignored`);return;}
  seen.add(key);found.push(info);
  const taken=new Set<string>();
  for(const line of text.split('\n')){
   const row=rowLabelAndValues(line,info.periods.length);
   if(!row)continue;
   const match=CONCEPTS[info.kind].find(([re])=>re.test(row.label));
   if(!match)continue;
   const concept=match[1];
   if(taken.has(concept))continue; // first occurrence wins (e.g. "Profit for the year" before OCI)
   taken.add(concept);
   row.values.forEach((v,ix)=>{
    if(v===null)return;
    const periodEnd=info.periods[ix];
    figures.push({concept,label:row.label,statement:info.kind,scope:info.scope,periodEnd,fiscalYear:fiscalYearOf(periodEnd),
     value:v,unitLabel:info.unitLabel,unitMultiplier:info.unitMultiplier,page:info.page});
   });
  }
 });
 return {figures,pages:found,validations:validate(figures),warnings};
}

/** Accounting checks that decide whether figures can be marked `validator_passed`. */
export function validate(figures:ExtractedFigure[]):ValidationResult[]{
 const out:ValidationResult[]=[];
 const groups=new Map<string,Map<string,number>>();
 for(const f of figures){const k=f.scope+'|'+f.periodEnd;if(!groups.has(k))groups.set(k,new Map());groups.get(k)!.set(f.concept,f.value);}
 const near=(a:number,b:number)=>Math.abs(a-b)<=Math.max(1,Math.abs(a)*0.0005); // rounding in published tables
 for(const [k,g] of groups){
  const ta=g.get('totalAssets'),tel=g.get('totalEquityAndLiabilities'),eq=g.get('bookEquity');
  const cl=g.get('currentLiabilities'),ncl=g.get('nonCurrentLiabilities'),tl=g.get('totalLiabilities');
  if(ta!==undefined)out.push({check:`${k}: total assets = total equity and liabilities`,
   passed:tel===undefined?null:near(ta,tel),detail:tel===undefined?'Total equity and liabilities not found':`${ta} vs ${tel}`});
  if(ta!==undefined&&eq!==undefined&&(tl!==undefined||(cl!==undefined&&ncl!==undefined))){
   const liab=tl??(cl!+ncl!);
   out.push({check:`${k}: assets = equity + liabilities`,passed:near(ta,eq+liab),detail:`${ta} vs ${eq}+${liab}`});
  }
  const ca=g.get('currentAssets'),nca=g.get('nonCurrentAssets');
  if(ta!==undefined&&ca!==undefined&&nca!==undefined)out.push({check:`${k}: current + non-current assets = total assets`,passed:near(ca+nca,ta),detail:`${ca}+${nca} vs ${ta}`});
  const rev=g.get('revenue'),ti=g.get('totalIncome'),oi=g.get('otherIncome');
  if(rev!==undefined&&ti!==undefined)out.push({check:`${k}: revenue ≤ total income`,passed:rev<=ti+1,detail:`${rev} vs ${ti}`});
  if(rev!==undefined&&ti!==undefined&&oi!==undefined)out.push({check:`${k}: revenue + other income = total income`,passed:near(rev+oi,ti),detail:`${rev}+${oi} vs ${ti}`});
 }
 return out;
}

/** Figures may skip manual review only when every applicable check for their scope/period passed. */
export function reviewStatusFor(f:ExtractedFigure,validations:ValidationResult[]):'validator_passed'|'pending'{
 const key=f.scope+'|'+f.periodEnd;
 const mine=validations.filter(v=>v.check.startsWith(key+':')&&v.passed!==null);
 return mine.length>=2&&mine.every(v=>v.passed)?'validator_passed':'pending';
}
