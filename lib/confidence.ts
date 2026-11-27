/**
 * CREQOR Confidence — how much the evidence behind a company's figures can be relied on.
 *
 * Deliberately separate from financial risk: missing or stale data lowers confidence,
 * it never makes a company look riskier. Every component is explained, and the
 * methodology is versioned so historical scores can be reproduced.
 */
export const CONFIDENCE_METHODOLOGY='creqor-confidence-v1';

export type EvidenceFact={
 concept:string;fiscalYear:number;periodEnd:string;scope:'consolidated'|'standalone';
 value:number;reviewStatus:'pending'|'validator_passed'|'accepted'|'rejected';
 extractionMethod:'deterministic_table'|'model_proposed'|'manual_entry';
 extractionConfidence:number;sourceKind:'regulatory_filing'|'company_report'|'other';
};
export type ConfidenceComponent={name:string;score:number|null;weight:number;explanation:string};
export type ConfidenceResult={methodology:string;score:number|null;grade:'high'|'medium'|'low'|'insufficient';
 components:ConfidenceComponent[];fiscalYear:number|null};

/** Concepts needed for the core statements; their absence lowers completeness. */
export const CORE_CONCEPTS=['revenue','netIncome','operatingCashFlow','totalAssets','totalLiabilities','bookEquity','currentAssets','currentLiabilities'] as const;
const REVIEW_WEIGHT={accepted:1,validator_passed:.8,pending:.3,rejected:0} as const;
const SOURCE_WEIGHT={regulatory_filing:1,company_report:.9,other:.5} as const;
const clamp=(x:number)=>Math.max(0,Math.min(1,x));

function monthsBetween(a:Date,b:Date){return (b.getTime()-a.getTime())/(1000*60*60*24*30.4375);}

export function assessConfidence(facts:EvidenceFact[],asOf:Date=new Date()):ConfidenceResult{
 const usable=facts.filter(f=>f.reviewStatus!=='rejected'&&Number.isFinite(f.value));
 if(!usable.length)return {methodology:CONFIDENCE_METHODOLOGY,score:null,grade:'insufficient',fiscalYear:null,
  components:[{name:'Evidence',score:null,weight:1,explanation:'No usable financial evidence is stored for this company.'}]};
 // Prefer consolidated figures for the latest fiscal year; fall back to standalone.
 const fy=Math.max(...usable.map(f=>f.fiscalYear));
 const latest=usable.filter(f=>f.fiscalYear===fy);
 const scope=latest.some(f=>f.scope==='consolidated')?'consolidated':'standalone';
 const set=latest.filter(f=>f.scope===scope);
 const byConcept=new Map(set.map(f=>[f.concept,f]));

 const present=CORE_CONCEPTS.filter(c=>byConcept.has(c));
 const completeness=present.length/CORE_CONCEPTS.length;

 const periodEnd=new Date(Math.max(...set.map(f=>Date.parse(f.periodEnd))));
 const age=monthsBetween(periodEnd,asOf);
 // Annual reports arrive up to ~15 months after period start; decay to zero at 36 months.
 const timeliness=age<=15?1:clamp(1-(age-15)/21);

 const verification=set.reduce((s,f)=>s+REVIEW_WEIGHT[f.reviewStatus]*clamp(f.extractionConfidence),0)/set.length;
 const sourceQuality=set.reduce((s,f)=>s+SOURCE_WEIGHT[f.sourceKind],0)/set.length;

 // Balance-sheet identity: assets = liabilities + equity within 1 %. Untestable is not a failure.
 const a=byConcept.get('totalAssets')?.value,l=byConcept.get('totalLiabilities')?.value,e=byConcept.get('bookEquity')?.value;
 let consistency:number|null=null,consistencyText='Balance-sheet identity not testable: assets, liabilities or equity missing.';
 if(a!==undefined&&l!==undefined&&e!==undefined&&a!==0){
  const gap=Math.abs(a-(l+e))/Math.abs(a);
  consistency=gap<=.01?1:clamp(1-(gap-.01)/.09);
  consistencyText=`Assets vs liabilities + equity differ by ${(gap*100).toFixed(2)} % (≤ 1 % passes).`;
 }
 const components:ConfidenceComponent[]=[
  {name:'Completeness',score:completeness,weight:.3,explanation:`${present.length} of ${CORE_CONCEPTS.length} core figures for FY${fy} (${scope}).`+
   (present.length<CORE_CONCEPTS.length?' Missing: '+CORE_CONCEPTS.filter(c=>!byConcept.has(c)).join(', ')+'.':'')},
  {name:'Timeliness',score:timeliness,weight:.2,explanation:`Latest period ended ${periodEnd.toISOString().slice(0,10)} (${Math.max(0,Math.round(age))} months before the assessment date).`},
  {name:'Verification',score:verification,weight:.25,explanation:'Review status × extraction confidence: accepted 1.0, validator-passed 0.8, pending 0.3.'},
  {name:'Source quality',score:sourceQuality,weight:.15,explanation:'Regulatory filing 1.0, company report 0.9, other 0.5.'},
  {name:'Consistency',score:consistency,weight:.1,explanation:consistencyText}
 ];
 const scored=components.filter(c=>c.score!==null);
 const weight=scored.reduce((s,c)=>s+c.weight,0);
 const score=Math.round(scored.reduce((s,c)=>s+c.score!*c.weight,0)/weight*100);
 const grade=completeness<.5?'insufficient':score>=80?'high':score>=60?'medium':'low';
 return {methodology:CONFIDENCE_METHODOLOGY,score,grade,components,fiscalYear:fy};
}
