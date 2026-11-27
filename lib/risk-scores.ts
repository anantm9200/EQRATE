/**
 * CREQOR Risk and Forensics — deterministic screening models from published definitions.
 *
 * - Altman Z (1968, public manufacturers), Z' (private manufacturers, book equity),
 *   Z'' (non-manufacturers / emerging markets, four variables, no sales term).
 * - Piotroski F-score (2000), nine binary signals.
 * - Beneish M-score (1999), eight-variable model.
 *
 * Rules: missing inputs are never treated as zero. A model that needs a missing input
 * returns `null` with the missing fields named. Models are gated by industry: none of
 * these were estimated on banks, insurers or investment vehicles, so they are not
 * applied to them. Outputs are analytical screening indicators, not ratings or findings.
 */

export type Industry='industrial'|'services'|'technology'|'bank'|'insurance'|'investment'|'utility'|'real_estate'|'other';

/** One fiscal year of normalized figures in a single currency and unit. `undefined` = not reported. */
export type AnnualFinancials={
 fiscalYear:number;
 revenue?:number;costOfRevenue?:number;sga?:number;depreciation?:number;
 ebit?:number;netIncome?:number;incomeContinuingOps?:number;operatingCashFlow?:number;
 totalAssets?:number;currentAssets?:number;currentLiabilities?:number;totalLiabilities?:number;
 receivables?:number;ppeNet?:number;longTermDebt?:number;retainedEarnings?:number;
 bookEquity?:number;sharesOutstanding?:number;
 /** Observed market value of equity (price × shares, dated). Never estimated here. */
 marketValueEquity?:number;
};

export type ModelResult<T>={model:string;applicable:boolean;value:number|null;zone?:T;
 missing:string[];notes:string[];components?:Record<string,number|null>};

const FINANCIAL:Industry[]=['bank','insurance','investment'];
const fin=(x:number|undefined):x is number=>typeof x==='number'&&Number.isFinite(x);
function need(y:AnnualFinancials,fields:(keyof AnnualFinancials)[],prefix=''){
 return fields.filter(f=>!fin(y[f] as number|undefined)).map(f=>prefix+String(f));
}
function ratio(a:number,b:number):number|null{return b===0?null:a/b;}
const round=(x:number,d=4)=>Math.round(x*10**d)/10**d;

export type AltmanZone='safe'|'grey'|'distress';
/**
 * Selects the Altman variant that fits the company:
 *  - industrial with observed market equity → Z (1968)
 *  - industrial without market equity       → Z' (book equity)
 *  - services/technology/utility/real estate/other → Z'' (no asset-turnover term)
 */
export function altmanZ(y:AnnualFinancials,industry:Industry):ModelResult<AltmanZone>{
 if(FINANCIAL.includes(industry))
  return {model:'Altman Z',applicable:false,value:null,missing:[],notes:['Not applicable to banks, insurers or investment vehicles; the model was not estimated on them.']};
 const manufacturing=industry==='industrial';
 const useMarket=manufacturing&&fin(y.marketValueEquity);
 const variant=manufacturing?(useMarket?'Z':"Z'"):"Z''";
 const fields:(keyof AnnualFinancials)[]=['currentAssets','currentLiabilities','totalAssets','retainedEarnings','ebit','totalLiabilities',
  useMarket?'marketValueEquity':'bookEquity',...(manufacturing?['revenue' as const]:[])];
 const missing=need(y,fields);
 if(missing.length)return {model:'Altman '+variant,applicable:true,value:null,missing,notes:['Required inputs not reported; no score is estimated.']};
 if(y.totalAssets!<=0||y.totalLiabilities!<=0)
  return {model:'Altman '+variant,applicable:true,value:null,missing:[],notes:['Total assets and total liabilities must be positive.']};
 const x1=(y.currentAssets!-y.currentLiabilities!)/y.totalAssets!;
 const x2=y.retainedEarnings!/y.totalAssets!;
 const x3=y.ebit!/y.totalAssets!;
 const x4=(useMarket?y.marketValueEquity!:y.bookEquity!)/y.totalLiabilities!;
 const x5=manufacturing?y.revenue!/y.totalAssets!:null;
 let z:number,safe:number,distress:number;
 if(variant==='Z'){z=1.2*x1+1.4*x2+3.3*x3+0.6*x4+1.0*x5!;safe=2.99;distress=1.81;}
 else if(variant==="Z'"){z=0.717*x1+0.847*x2+3.107*x3+0.420*x4+0.998*x5!;safe=2.90;distress=1.23;}
 else{z=6.56*x1+3.26*x2+6.72*x3+1.05*x4;safe=2.60;distress=1.10;}
 const zone:AltmanZone=z>safe?'safe':z<distress?'distress':'grey';
 return {model:'Altman '+variant,applicable:true,value:round(z,3),zone,missing:[],
  components:{x1:round(x1),x2:round(x2),x3:round(x3),x4:round(x4),x5:x5===null?null:round(x5)},
  notes:[`Zones for ${variant}: distress < ${distress}, safe > ${safe}.`,
   ...(manufacturing&&!useMarket?["Observed market value of equity unavailable; Z' uses book equity."]:[])]};
}

export type PiotroskiSignal={name:string;passed:boolean|null;detail:string};
/** Piotroski F-score from the current year and the two prior years (prior-prior needed for average/beginning assets). */
export function piotroskiF(cur:AnnualFinancials,prev:AnnualFinancials,prevPrev?:AnnualFinancials,industry:Industry='other'):
 ModelResult<'strong'|'moderate'|'weak'>&{signals:PiotroskiSignal[];evaluated:number}{
 if(FINANCIAL.includes(industry))
  return {model:'Piotroski F',applicable:false,value:null,missing:[],notes:['Not applicable to financial institutions.'],signals:[],evaluated:0};
 // ROA uses beginning-of-year total assets, as in Piotroski (2000).
 const roa=(y:AnnualFinancials,begin?:AnnualFinancials)=>fin(y.netIncome)&&begin&&fin(begin.totalAssets)&&begin.totalAssets>0?y.netIncome/begin.totalAssets:null;
 const cfoA=(y:AnnualFinancials,begin?:AnnualFinancials)=>fin(y.operatingCashFlow)&&begin&&fin(begin.totalAssets)&&begin.totalAssets>0?y.operatingCashFlow/begin.totalAssets:null;
 const lev=(y:AnnualFinancials)=>fin(y.longTermDebt)&&fin(y.totalAssets)&&y.totalAssets>0?y.longTermDebt/y.totalAssets:null;
 const cr=(y:AnnualFinancials)=>fin(y.currentAssets)&&fin(y.currentLiabilities)?ratio(y.currentAssets,y.currentLiabilities):null;
 const gm=(y:AnnualFinancials)=>fin(y.revenue)&&fin(y.costOfRevenue)&&y.revenue!==0?(y.revenue-y.costOfRevenue)/y.revenue:null;
 const turn=(y:AnnualFinancials,begin?:AnnualFinancials)=>fin(y.revenue)&&begin&&fin(begin.totalAssets)&&begin.totalAssets>0?y.revenue/begin.totalAssets:null;
 const cmp=(a:number|null,b:number|null,f:(a:number,b:number)=>boolean)=>a===null||b===null?null:f(a,b);
 const roaCur=roa(cur,prev),roaPrev=roa(prev,prevPrev),cfoCur=cfoA(cur,prev);
 const signals:PiotroskiSignal[]=[
  {name:'Positive ROA',passed:roaCur===null?null:roaCur>0,detail:'Net income / beginning total assets > 0'},
  {name:'Positive operating cash flow',passed:fin(cur.operatingCashFlow)?cur.operatingCashFlow>0:null,detail:'CFO > 0'},
  {name:'Improving ROA',passed:cmp(roaCur,roaPrev,(a,b)=>a>b),detail:'ROA higher than prior year'},
  {name:'Cash flow exceeds earnings',passed:cmp(cfoCur,roaCur,(a,b)=>a>b),detail:'CFO / assets > ROA (accrual quality)'},
  {name:'Lower leverage',passed:cmp(lev(cur),lev(prev),(a,b)=>a<b),detail:'Long-term debt / total assets fell'},
  {name:'Higher current ratio',passed:cmp(cr(cur),cr(prev),(a,b)=>a>b),detail:'Current ratio rose'},
  {name:'No new shares issued',passed:fin(cur.sharesOutstanding)&&fin(prev.sharesOutstanding)?cur.sharesOutstanding<=prev.sharesOutstanding:null,detail:'Shares outstanding did not increase'},
  {name:'Higher gross margin',passed:cmp(gm(cur),gm(prev),(a,b)=>a>b),detail:'Gross margin rose'},
  {name:'Higher asset turnover',passed:cmp(turn(cur,prev),turn(prev,prevPrev),(a,b)=>a>b),detail:'Revenue / beginning assets rose'}
 ];
 const evaluated=signals.filter(s=>s.passed!==null).length;
 const score=signals.filter(s=>s.passed===true).length;
 const missing=signals.filter(s=>s.passed===null).map(s=>s.name);
 // A partial score is not comparable to the 0–9 scale; report it only when all nine are evaluable.
 const complete=evaluated===9;
 return {model:'Piotroski F',applicable:true,value:complete?score:null,
  zone:complete?(score>=8?'strong':score<=2?'weak':'moderate'):undefined,
  missing,signals,evaluated,
  notes:complete?['Score 8–9 strong, 0–2 weak (Piotroski 2000).']:
   [`${evaluated} of 9 signals evaluable (${score} passed); no 0–9 score is reported with missing inputs.`]};
}

/** Beneish (1999) eight-variable M-score. Above −1.78 = elevated manipulation-likelihood screen. */
export function beneishM(cur:AnnualFinancials,prev:AnnualFinancials,industry:Industry):ModelResult<'elevated'|'not elevated'>{
 if(FINANCIAL.includes(industry))
  return {model:'Beneish M',applicable:false,value:null,missing:[],notes:['Not applicable to financial institutions.']};
 const f:(keyof AnnualFinancials)[]=['revenue','costOfRevenue','receivables','currentAssets','ppeNet','totalAssets','depreciation','sga',
  'currentLiabilities','longTermDebt','operatingCashFlow'];
 const missing=[...need(cur,f,'current.'),...need(prev,f,'prior.')];
 const inc=fin(cur.incomeContinuingOps)?cur.incomeContinuingOps:cur.netIncome;
 if(!fin(inc))missing.push('current.incomeContinuingOps');
 if(missing.length)return {model:'Beneish M',applicable:true,value:null,missing,notes:['Required inputs not reported; no score is estimated.']};
 const c=cur as Required<AnnualFinancials>,p=prev as Required<AnnualFinancials>;
 const parts={
  DSRI:ratio(c.receivables/c.revenue,p.receivables/p.revenue),
  GMI:ratio((p.revenue-p.costOfRevenue)/p.revenue,(c.revenue-c.costOfRevenue)/c.revenue),
  AQI:ratio(1-(c.currentAssets+c.ppeNet)/c.totalAssets,1-(p.currentAssets+p.ppeNet)/p.totalAssets),
  SGI:ratio(c.revenue,p.revenue),
  DEPI:ratio(p.depreciation/(p.depreciation+p.ppeNet),c.depreciation/(c.depreciation+c.ppeNet)),
  SGAI:ratio(c.sga/c.revenue,p.sga/p.revenue),
  LVGI:ratio((c.currentLiabilities+c.longTermDebt)/c.totalAssets,(p.currentLiabilities+p.longTermDebt)/p.totalAssets),
  TATA:ratio((inc as number)-c.operatingCashFlow,c.totalAssets)
 };
 const undefinedParts=Object.entries(parts).filter(([,v])=>v===null||!Number.isFinite(v)).map(([k])=>k);
 if(undefinedParts.length)return {model:'Beneish M',applicable:true,value:null,missing:[],components:parts,
  notes:['Index undefined (zero denominator): '+undefinedParts.join(', ')+'.']};
 const v=parts as Record<keyof typeof parts,number>;
 const m=-4.84+0.920*v.DSRI+0.528*v.GMI+0.404*v.AQI+0.892*v.SGI+0.115*v.DEPI-0.172*v.SGAI+4.679*v.TATA-0.327*v.LVGI;
 return {model:'Beneish M',applicable:true,value:round(m,3),zone:m>-1.78?'elevated':'not elevated',missing:[],
  components:Object.fromEntries(Object.entries(v).map(([k,x])=>[k,round(x)])),
  notes:['Threshold −1.78 (Beneish 1999). A screening prompt for review, not evidence of manipulation.']};
}
