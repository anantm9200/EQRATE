import {calculateDcf} from './valuation';

export type CompanyKind='listed'|'unlisted';
export type Method='dcf'|'revenueMultiple'|'ebitdaMultiple'|'netAssets'|'transaction'|'funding';
export type ClaimType='identity'|'financials'|'cash-flow'|'capitalisation'|'share-price'|'transaction'|'funding'|'assets'|'peer-multiple'|'other';
export type SourceKind='official_filing'|'audited_financials'|'independent_third_party'|'company_provided'|'user_provided'|'other';
export type Evidence={id:string;title:string;url:string;kind:SourceKind;claim:ClaimType;asOf:string;notes:string};
export type NumberKey='revenue'|'ebitda'|'netDebt'|'assets'|'liabilities'|'assetAdjustment'|'freeCashFlow'|'growthPct'|'discountPct'|'terminalPct'|'forecastYears'|'sharesMillions'|'sharePrice'|'revenueMultiple'|'ebitdaMultiple'|'transactionConsideration'|'transactionStakePct'|'fundingAmount'|'fundingEquityPct';
export type FinancialInputs=Record<NumberKey,number|null>;
export const numberKeys:NumberKey[]=['revenue','ebitda','netDebt','assets','liabilities','assetAdjustment','freeCashFlow','growthPct','discountPct','terminalPct','forecastYears','sharesMillions','sharePrice','revenueMultiple','ebitdaMultiple','transactionConsideration','transactionStakePct','fundingAmount','fundingEquityPct'];
export const methodNames:Record<Method,string>={
 dcf:'Discounted cash flow',revenueMultiple:'Revenue multiple',
 ebitdaMultiple:'EBITDA multiple',netAssets:'Adjusted net assets',
 transaction:'Documented stake transaction',funding:'Funding round post-money'
};
export const methodUnits:Record<Method,string>={
 dcf:'PV of projected cash flows',revenueMultiple:'EV / revenue',
 ebitdaMultiple:'EV / EBITDA',netAssets:'Assets − liabilities + adjustments',
 transaction:'Equity stake consideration / ownership %',funding:'Primary investment / investor equity %'
};
export type RatingCategory='financialStrength'|'growth'|'valuation'|'governance'|'marketPosition'|'resilience';
export const ratingWeights:Record<RatingCategory,number>={financialStrength:25,growth:20,valuation:20,governance:15,marketPosition:10,resilience:10};
export const ratingNames:Record<RatingCategory,string>={financialStrength:'Financial strength',growth:'Growth and operations',valuation:'Valuation attractiveness',governance:'Governance and transparency',marketPosition:'Market position',resilience:'Risk and resilience'};
export const ratingCategories=Object.keys(ratingWeights) as RatingCategory[];
export type Assessment={
 id:string;name:string;identifier:string;country:string;industry:string;kind:CompanyKind;currency:string;asOf:string;
 fields:FinancialInputs;active:Method[];weights:Record<Method,number>;
 evidence:Evidence[];ratings:Record<RatingCategory,number|null>;
 analystNotes:string;updatedAt:string;
};
export type MethodResult={id:Method;label:string;status:'calculated'|'missing'|'invalid';equityValue?:number;enterpriseValue?:number;impliedPerShare?:number|null;detail:string;requirements:ClaimType[]};
export type AssessmentResult={
 methods:MethodResult[];marketCap:number|null;marketCapMessage:string;
 blended:number|null;blendedPerShare:number|null;sourceCount:number;
 ratingDraft:number|null;ratingCoverage:number;
 readyMethods:number;status:'insufficient'|'draft';
};
export function createAssessment(today:string):Assessment{
 const fields=Object.fromEntries(numberKeys.map(k=>[k,null])) as FinancialInputs;
 const weights={dcf:1,revenueMultiple:1,ebitdaMultiple:1,netAssets:1,transaction:1,funding:1};
 return {id:'assessment-'+Math.random().toString(36).slice(2,11),name:'',identifier:'',country:'India',industry:'General',kind:'unlisted',currency:'USD',asOf:today,
   fields,active:['dcf','revenueMultiple','ebitdaMultiple','netAssets','transaction','funding'],weights,evidence:[],
   ratings:{financialStrength:null,growth:null,valuation:null,governance:null,marketPosition:null,resilience:null},analystNotes:'',updatedAt:new Date().toISOString()};
}
function required(fields:FinancialInputs,keys:NumberKey[]):boolean{
 return keys.every(key=>fields[key]!==null && Number.isFinite(fields[key]));
}
function moneyInput(x:number|null,label:string,opts?:{allowNegative?:boolean;positive?:boolean}):number{
 if(x===null || !Number.isFinite(x)) throw new Error(label+' is required.');
 if(opts?.positive && x<=0) throw new Error(label+' must be greater than zero.');
 if(!opts?.allowNegative && !opts?.positive && x<0) throw new Error(label+' must be non-negative.');
 return x;
}
function percentage(x:number|null,label:string):number{
 const v=moneyInput(x,label,{positive:true});
 if(v>100)throw new Error(label+' must not exceed 100%.');
 return v;
}
function makeMethod(a:Assessment,id:Method):MethodResult{
 const f=a.fields;const label=methodNames[id];
 const needs:Record<Method,NumberKey[]>={
   dcf:['freeCashFlow','growthPct','discountPct','terminalPct','forecastYears','netDebt'],
   revenueMultiple:['revenue','revenueMultiple','netDebt'],
   ebitdaMultiple:['ebitda','ebitdaMultiple','netDebt'],
   netAssets:['assets','liabilities'],
   transaction:['transactionConsideration','transactionStakePct'],
   funding:['fundingAmount','fundingEquityPct']
 };
 const evidence:Record<Method,ClaimType[]>={
   dcf:['cash-flow','capitalisation'],revenueMultiple:['financials','peer-multiple'],
   ebitdaMultiple:['financials','peer-multiple'],netAssets:['assets'],
   transaction:['transaction'],funding:['funding']
 };
 const defaults={id,label,requirements:evidence[id]};
 if(!required(f,needs[id]))return {...defaults,status:'missing',detail:'Provide '+needs[id].filter(k=>f[k]===null).join(', ')+'.'};
 try{
  const debt=()=>{
   const n=f.netDebt;
   if(n===null||!Number.isFinite(n))throw new Error('Net debt is required.');
   return n;
  };
  let enterpriseValue:number|undefined;let equityValue:number;
  if(id==='dcf'){
   const base=moneyInput(f.freeCashFlow,'Free cash flow',{allowNegative:true});
   const growth=moneyInput(f.growthPct,'Growth rate',{allowNegative:true})/100;
   const discount=moneyInput(f.discountPct,'WACC',{allowNegative:true})/100;
   const terminal=moneyInput(f.terminalPct,'Terminal growth',{allowNegative:true})/100;
   const years=f.forecastYears;
   if(years===null)throw new Error('Forecast years are required.');
   const d=calculateDcf({baseFreeCashFlow:base,annualGrowth:growth,discountRate:discount,terminalGrowth:terminal,forecastYears:years,netDebt:debt()});
   enterpriseValue=d.enterpriseValue;equityValue=d.equityValue;
  }else if(id==='revenueMultiple'){
   const sales=moneyInput(f.revenue,'Revenue');
   const multiple=moneyInput(f.revenueMultiple,'Revenue multiple',{positive:true});
   enterpriseValue=sales*multiple;equityValue=enterpriseValue-debt();
  }else if(id==='ebitdaMultiple'){
   const earnings=moneyInput(f.ebitda,'EBITDA',{positive:true});
   const multiple=moneyInput(f.ebitdaMultiple,'EBITDA multiple',{positive:true});
   if(/^(bank|insurance|nbfc|financial services|lender)/i.test(a.industry.trim()))throw new Error('EBITDA multiple is not a default valuation for financial institutions.');
   enterpriseValue=earnings*multiple;equityValue=enterpriseValue-debt();
  }else if(id==='netAssets'){
   const assets=moneyInput(f.assets,'Total assets');
   const liabilities=moneyInput(f.liabilities,'Total liabilities');
   const adjustment=f.assetAdjustment===null?0:moneyInput(f.assetAdjustment,'Asset adjustments',{allowNegative:true});
   equityValue=assets-liabilities+adjustment;
  }else if(id==='transaction'){
   const consideration=moneyInput(f.transactionConsideration,'Stake consideration',{positive:true});
   const stake=percentage(f.transactionStakePct,'Equity stake percentage');
   equityValue=consideration/(stake/100);
  }else{
   const invested=moneyInput(f.fundingAmount,'New funding',{positive:true});
   const stake=percentage(f.fundingEquityPct,'Post-funding ownership percentage');
   equityValue=invested/(stake/100);
  }
  if(!Number.isFinite(equityValue)||Math.abs(equityValue)>1e15)throw new Error('Model produced an invalid or out-of-range value.');
  if(enterpriseValue!==undefined && !Number.isFinite(enterpriseValue))throw new Error('Enterprise value is invalid.');
  const shares=f.sharesMillions;
  const impliedPerShare=shares!==null&&Number.isFinite(shares)&&shares>0?equityValue/shares:null;
  return {...defaults,status:'calculated',equityValue,enterpriseValue,impliedPerShare,detail:methodUnits[id]};
 }catch(e){return {...defaults,status:'invalid',detail:e instanceof Error?e.message:'Invalid calculation.'};}
}
export function computeAssessment(a:Assessment):AssessmentResult{
 const methods=a.active.map(id=>makeMethod(a,id));
 let marketCap:number|null=null;
 let marketCapMessage='Provide a dated price and applicable shares for the same security class; no external market feed is connected.';
 const f=a.fields;
 if(a.kind==='listed'&&f.sharePrice!==null&&f.sharesMillions!==null){
  try{
   const price=moneyInput(f.sharePrice,'Price per share');
   const shares=moneyInput(f.sharesMillions,'Shares outstanding (millions)',{positive:true});
   marketCap=price*shares;
   if(!Number.isFinite(marketCap)||marketCap>1e15)throw new Error('Market cap is out of range.');
   marketCapMessage='Calculated from analyst-entered price and shares, not an independently observed live quote. One share class only.';
  }catch(e){marketCapMessage=e instanceof Error?e.message:'Invalid market-cap inputs.';marketCap=null;}
 }
 const available=methods.filter((m):m is MethodResult&{equityValue:number}=>m.status==='calculated'&&typeof m.equityValue==='number');
 const weighted=available.filter(m=>Number.isFinite(a.weights[m.id])&&a.weights[m.id]>0);
 const denominator=weighted.reduce((s,m)=>s+a.weights[m.id],0);
 const blended=denominator>0?weighted.reduce((s,m)=>s+m.equityValue*a.weights[m.id],0)/denominator:null;
 const shares=f.sharesMillions;
 const blendedPerShare=blended!==null&&shares!==null&&Number.isFinite(shares)&&shares>0?blended/shares:null;
 const filled=ratingCategories.filter(k=>a.ratings[k]!==null&&Number.isFinite(a.ratings[k])&&a.ratings[k]!>=0&&a.ratings[k]!<=100);
 const ratingDraft=filled.length===ratingCategories.length?ratingCategories.reduce((s,k)=>s+(a.ratings[k] as number)*ratingWeights[k]/100,0):null;
 const outcome=(a.kind==='listed'?marketCap!==null||available.length>0:available.length>0);
 return {methods,marketCap,marketCapMessage,blended,blendedPerShare,sourceCount:a.evidence.length,
   ratingDraft,ratingCoverage:filled.length,readyMethods:available.length,status:outcome?'draft':'insufficient'};
}
export function formatMillions(value:number,currency='USD'):string{
 if(!Number.isFinite(value))return 'Unavailable';
 return new Intl.NumberFormat('en-US',{style:'currency',currency,maximumFractionDigits:2}).format(value)+'m';
}
export function formatPerShare(value:number|null,currency='USD'):string{
 if(value===null||!Number.isFinite(value))return 'Not available';
 return new Intl.NumberFormat('en-US',{style:'currency',currency,maximumFractionDigits:2}).format(value);
}
export function parseAssessment(value:unknown):Assessment{
 if(typeof value!=='object'||value===null||Array.isArray(value))throw new Error('Invalid assessment file.');
 const o=value as Record<string,unknown>;
 if(typeof o.name!=='string'||o.name.length>250)throw new Error('Missing company name.');
 if(o.kind!=='listed'&&o.kind!=='unlisted')throw new Error('Invalid company type.');
 const a=createAssessment(new Date().toISOString().slice(0,10));
 for(const k of ['name','identifier','country','industry','currency','asOf','analystNotes'] as const){
  if(typeof o[k]==='string') (a as unknown as Record<string,unknown>)[k]=(o[k] as string).slice(0,k==='analystNotes'?5000:250);
 }
 a.kind=o.kind;
 if(o.fields&&typeof o.fields==='object'&&!Array.isArray(o.fields)){
  const values=o.fields as Record<string,unknown>;
  for(const k of numberKeys){const n=values[k];a.fields[k]=typeof n==='number'&&Number.isFinite(n)?n:null;}
 }
 if(Array.isArray(o.active))a.active=o.active.filter((x):x is Method=>typeof x==='string'&&Object.prototype.hasOwnProperty.call(methodNames,x)).slice(0,6);
 if(o.weights&&typeof o.weights==='object'&&!Array.isArray(o.weights)){
  const weights=o.weights as Record<string,unknown>;
  for(const k of Object.keys(methodNames) as Method[]){const n=weights[k];a.weights[k]=typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100?n:1;}
 }
 if(o.ratings&&typeof o.ratings==='object'&&!Array.isArray(o.ratings)){
  const ratings=o.ratings as Record<string,unknown>;
  for(const k of ratingCategories){const n=ratings[k];a.ratings[k]=typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100?n:null;}
 }
 if(Array.isArray(o.evidence))a.evidence=o.evidence.slice(0,80).filter((x):x is Record<string,unknown>=>typeof x==='object'&&x!==null&&!Array.isArray(x)).map(x=>({
  id:String(x.id||'src-'+Math.random().toString(36).slice(2,9)).slice(0,80),
  title:String(x.title||'Untitled').slice(0,250),
  url:typeof x.url==='string'&&/^https:\/\//.test(x.url)?x.url.slice(0,1200):'',
  kind:typeof x.kind==='string'&&['official_filing','audited_financials','independent_third_party','company_provided','user_provided','other'].includes(x.kind)?x.kind as SourceKind:'user_provided',
  claim:typeof x.claim==='string'&&['identity','financials','cash-flow','capitalisation','share-price','transaction','funding','assets','peer-multiple','other'].includes(x.claim)?x.claim as ClaimType:'other',
  asOf:typeof x.asOf==='string'?x.asOf.slice(0,10):'',
  notes:typeof x.notes==='string'?x.notes.slice(0,500):''
 }));
 if(typeof o.id==='string'&&/^assessment-[a-z0-9-]+$/.test(o.id))a.id=o.id.slice(0,80);
 return a;
}
