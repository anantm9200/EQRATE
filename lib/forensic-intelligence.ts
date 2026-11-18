import {computeAssessment,type Assessment,type ClaimType,type Evidence,type Method} from './assessment';
import {getModelRange} from './research-intelligence';

/**
 * CREQOR deterministic forensic intelligence v1.
 *
 * All results are rule-based checks of analyst-entered material.
 * This module DOES NOT fetch/verify URLs, attest records, infer a security
 * listing, issue a credit rating or express an investment recommendation.
 * No fabricated confidence percentage is generated.
 */
export type SignalSeverity='critical'|'high'|'review'|'info';
export type SignalCategory='identity'|'provenance'|'freshness'|'financials'|'valuation'|'integrity';
export type ForensicSignal={
 id:string;severity:SignalSeverity;category:SignalCategory;headline:string;
 observation:string;implication:string;action:string;relatedEvidenceIds:string[];
};
export type ClaimTrace={claim:ClaimType;label:string;references:number;sourceHosts:string[];newestDate:string|null;oldestDate:string|null;entries:{id:string;title:string;host:string;asOf:string;kind:Evidence['kind']}[]};
export type IntelligenceDimension={key:string;label:string;status:'missing'|'incomplete'|'referenced';detail:string;action:string};
export type IntelligenceReport={
 engine:'creqor-forensic-v1';generatedFor:string;asOf:string;basis:'analyst-entered-unverified';
 summary:{signals:number;critical:number;high:number;review:number;sourceLinks:number;uniqueHosts:number;calculableMethods:number;coverage:{referenced:number;required:number}};
 signals:ForensicSignal[];trace:ClaimTrace[];dimensions:IntelligenceDimension[];
 limitations:string[];nextActions:{signalId:string;priority:number;action:string}[];
};
const claimLabels:Record<ClaimType,string>={
 identity:'Legal identity',financials:'Financial statements','cash-flow':'Cash-flow evidence',
 capitalisation:'Capital structure','share-price':'Quoted share price',transaction:'Stake transaction',
 funding:'Funding round',assets:'Asset records','peer-multiple':'Comparable-company multiples',other:'Other documents'
};
const sourceMethods:Record<Method,ClaimType[]>={
 dcf:['cash-flow','capitalisation'],
 revenueMultiple:['financials','peer-multiple'],
 ebitdaMultiple:['financials','peer-multiple'],
 netAssets:['assets'],
 transaction:['transaction'],
 funding:['funding']
};
const severityPriority:Record<SignalSeverity,number>={critical:0,high:1,review:2,info:3};
function isoDate(text:string):number|null{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(text))return null;
 const date=Date.parse(text+'T00:00:00.000Z');
 return Number.isFinite(date)&&new Date(date).toISOString().slice(0,10)===text?date:null;
}
function sourceHost(url:string):string|null{
 try{
  const link=new URL(url);
  return link.protocol==='https:'&&!link.username&&!link.password?link.hostname.toLowerCase():null;
 }catch{return null;}
}
const round=(value:number)=>Math.round(value*10)/10;
export function runForensicIntelligence(assessment:Assessment,asOf:string=new Date().toISOString().slice(0,10)):IntelligenceReport{
 const today=isoDate(asOf);
 if(today===null)throw new Error('Invalid review date; use YYYY-MM-DD.');
 const model=computeAssessment(assessment);
 const range=getModelRange(assessment);
 const evidence=assessment.evidence;
 const signals:ForensicSignal[]=[];
 const push=(signal:ForensicSignal)=>{if(!signals.some(x=>x.id===signal.id))signals.push(signal);};
 const references=evidence.filter(e=>sourceHost(e.url)!==null);
 const hosts=[...new Set(references.map(e=>sourceHost(e.url)!).filter(Boolean))];
 const validDated=evidence.filter(e=>sourceHost(e.url)!==null&&isoDate(e.asOf)!==null);
 const required=new Set<ClaimType>(['identity']);
 model.methods.filter(m=>m.status==='calculated').forEach(m=>sourceMethods[m.id].forEach(c=>required.add(c)));
 if(assessment.kind==='listed'&&model.marketCap!==null){required.add('share-price');required.add('capitalisation');}
 const traced=new Set(validDated.filter(e=>isoDate(e.asOf)!<=today).map(e=>e.claim));
 const coverage={required:required.size,referenced:[...required].filter(c=>traced.has(c)).length};

 if(!assessment.name.trim())push({id:'identity-unset',severity:'critical',category:'identity',headline:'Registered entity is missing',observation:'No legal name was entered.',implication:'Sources and financial figures cannot be attributed to a defined legal entity.',action:'Identify the registered entity before drawing financial conclusions.',relatedEvidenceIds:[]});
 if(!assessment.identifier.trim())push({id:'identifier-unset',severity:'high',category:'identity',headline:'No official entity identifier',observation:'No LEI, CIK, CIN, registration ID or other exact identifier was entered.',implication:'Similar company names and subsidiaries could be confused.',action:'Link the exact registered identifier to an official identity source.',relatedEvidenceIds:[]});
 if(!evidence.some(e=>e.claim==='identity'&&sourceHost(e.url)!==null&&isoDate(e.asOf)!==null))push({id:'identity-source',severity:'high',category:'identity',headline:'Entity identity has no dated source reference',observation:'No dated HTTPS identity reference is registered.',implication:'The company name and identifier have not been substantiated by a traceable reference.',action:'Add a registry reference identifying the precise legal entity.',relatedEvidenceIds:[]});
 if(model.readyMethods===0&&model.marketCap===null)push({id:'missing-financial-model',severity:'high',category:'valuation',headline:'No completed valuation model',observation:'The active calculation methods do not have sufficient valid inputs.',implication:'There is no reproducible estimate to inspect.',action:'Complete the required financial fields for one valuation method.',relatedEvidenceIds:[]});
 if(!evidence.length)push({id:'no-evidence',severity:'critical',category:'provenance',headline:'No evidence register',observation:'The assessment has no recorded source references.',implication:'None of the claims can be traced to supporting documents.',action:'Create a dated source register before relying on the assessment.',relatedEvidenceIds:[]});

 const badUrls=evidence.filter(e=>sourceHost(e.url)===null);
 if(badUrls.length)push({id:'source-link-invalid',severity:'high',category:'provenance',headline:'Some source links are invalid or insecure',observation:badUrls.length+' evidence reference(s) do not have usable credential-free HTTPS URLs.',implication:'These references cannot be followed as secure links.',action:'Replace invalid links with exact HTTPS document locations.',relatedEvidenceIds:badUrls.map(e=>e.id)});
 const future=evidence.filter(e=>isoDate(e.asOf)!==null&&isoDate(e.asOf)!>today);
 if(future.length)push({id:'source-future',severity:'high',category:'freshness',headline:'Source dates lie in the future',observation:future.length+' dated reference(s) occur after the review date.',implication:'The research chronology is inconsistent.',action:'Correct the publication dates or the assessment as-of date.',relatedEvidenceIds:future.map(e=>e.id)});
 const unparseable=evidence.filter(e=>isoDate(e.asOf)===null);
 if(unparseable.length)push({id:'source-date-invalid',severity:'high',category:'provenance',headline:'Some evidence dates are absent or invalid',observation:unparseable.length+' source date(s) are missing or not real calendar dates.',implication:'Recency and comparability cannot be assessed reliably.',action:'Record each document’s actual publication or reporting date.',relatedEvidenceIds:unparseable.map(e=>e.id)});
 const stale=evidence.filter(e=>{const d=isoDate(e.asOf);return d!==null&&today-d>730*86400000;});
 if(stale.length)push({id:'source-stale',severity:'review',category:'freshness',headline:'Older supporting documents',observation:stale.length+' source(s) precede the review date by over 24 months.',implication:'Historical documents may no longer represent current operations or capital structure.',action:'Add current filing periods, keeping historical records where relevant.',relatedEvidenceIds:stale.map(e=>e.id)});
 const used=new Map<string,string[]>();
 for(const e of evidence){
  const key=e.url.trim().toLowerCase()+'|'+e.claim+'|'+e.asOf;
  used.set(key,[...(used.get(key)||[]),e.id]);
 }
 const duplicates=[...used.values()].filter(list=>list.length>1).flat();
 if(duplicates.length)push({id:'duplicate-references',severity:'review',category:'provenance',headline:'Duplicate source references',observation:duplicates.length+' register entries repeat the same source, claim type and date.',implication:'Duplicate references can create the appearance of stronger support.',action:'Consolidate repeated entries and retain one traceable citation.',relatedEvidenceIds:duplicates});
 if(references.length>=3&&hosts.length===1)push({id:'host-concentration',severity:'review',category:'provenance',headline:'Source concentration on one host',observation:references.length+' links use one source host.',implication:'Multiple links from the same publisher are not independent corroboration.',action:'Seek independent primary or external sources for material claims.',relatedEvidenceIds:references.map(e=>e.id)});

 const requiredMissing=[...required].filter(c=>!traced.has(c));
 if(requiredMissing.length)push({id:'evidence-coverage',severity:'high',category:'provenance',headline:'Method-required evidence categories are missing',observation:requiredMissing.map(c=>claimLabels[c]).join(', ')+' have no valid dated reference.',implication:'Calculated values have missing source-category support.',action:'Add exact dated sources for the missing categories; registration is not independent verification.',relatedEvidenceIds:[]});
 if(assessment.kind==='listed'&&model.marketCap!==null){
  const datedPrice=validDated.filter(e=>e.claim==='share-price'&&isoDate(e.asOf)!<=today);
  if(datedPrice.length){
   const latest=Math.max(...datedPrice.map(e=>isoDate(e.asOf)!));
   if(today-latest>7*86400000)push({id:'listed-quote-age',severity:'high',category:'freshness',headline:'Listed market-price source may be outdated',observation:'The most recent referenced share-price date is more than seven calendar days before the review.',implication:'A manual market-cap calculation may not reflect a recent exchange quote.',action:'Obtain a licensed, timestamped price and matching share count for the same class.',relatedEvidenceIds:datedPrice.map(e=>e.id)});
  }
 }
 const f=assessment.fields;
 const financialIds=evidence.filter(e=>['financials','cash-flow'].includes(e.claim)).map(e=>e.id);
 if(f.revenue!==null&&f.revenue>0&&f.ebitda!==null&&f.ebitda>f.revenue){
  push({id:'margin-anomaly',severity:'review',category:'financials',headline:'EBITDA exceeds recorded revenue',observation:'Entered EBITDA ('+round(f.ebitda)+') exceeds revenue ('+round(f.revenue)+') in millions.',implication:'Units, scope, unusual income, or field mapping may not match.',action:'Reconcile both figures to the same period, currency and reporting basis.',relatedEvidenceIds:financialIds});
 }
 if(f.revenue!==null&&f.revenue>0&&f.freeCashFlow!==null&&f.freeCashFlow>f.revenue*1.5){
  push({id:'cash-flow-anomaly',severity:'review',category:'financials',headline:'Free cash flow is unusually high against revenue',observation:'Entered free cash flow is over 150% of entered revenue.',implication:'One-off disposals, changes in working capital, or mismatched reporting periods may be involved.',action:'Confirm the cash-flow reconciliation, scope and fiscal period.',relatedEvidenceIds:financialIds});
 }
 if(f.assets!==null&&f.liabilities!==null&&f.liabilities>f.assets)push({id:'negative-book-equity',severity:'review',category:'financials',headline:'Book liabilities exceed recorded assets',observation:'Book equity calculated from entered totals is negative.',implication:'Negative book equity does not establish insolvency but requires examination.',action:'Review liabilities, off-balance-sheet arrangements and adjusted asset assumptions.',relatedEvidenceIds:evidence.filter(e=>e.claim==='assets').map(e=>e.id)});
 if(range.count>=2&&range.spreadPct!==null&&range.spreadPct>75)push({id:'model-divergence',severity:'high',category:'valuation',headline:'Valuation methods materially disagree',observation:'The model range spans '+round(range.spreadPct)+'% of the median across '+range.count+' calculated methods.',implication:'A blended estimate can conceal divergent methods or incompatible assumptions.',action:'Inspect peer selection, enterprise-to-equity bridges and method weights.',relatedEvidenceIds:[]});
 if(assessment.kind==='listed'&&model.marketCap!==null&&model.blended!==null&&model.marketCap>0&&model.blended>0){
  const ratio=Math.max(model.marketCap,model.blended)/Math.min(model.marketCap,model.blended);
  if(ratio>2)push({id:'market-model-gap',severity:'review',category:'valuation',headline:'Modelled equity value differs substantially from entered market cap',observation:'The larger of the modelled value and manual market-cap calculation is '+round(ratio)+'× the smaller.',implication:'Timing, security class and analyst assumptions may not be comparable.',action:'Check dated price, shares, currency, model period and enterprise-to-equity bridge.',relatedEvidenceIds:evidence.filter(e=>e.claim==='share-price'||e.claim==='capitalisation').map(e=>e.id)});
 }
 const trace=(Object.keys(claimLabels) as ClaimType[]).map(claim=>{
  const entries=evidence.filter(e=>e.claim===claim);
  const dates=entries.map(e=>isoDate(e.asOf)).filter((x):x is number=>x!==null).sort((a,b)=>a-b);
  return {claim,label:claimLabels[claim],references:entries.length,
   sourceHosts:[...new Set(entries.map(e=>sourceHost(e.url)||'invalid / missing'))],
   oldestDate:dates.length?new Date(dates[0]).toISOString().slice(0,10):null,
   newestDate:dates.length?new Date(dates[dates.length-1]).toISOString().slice(0,10):null,
   entries:entries.map(e=>({id:e.id,title:e.title,host:sourceHost(e.url)||'invalid / missing',asOf:e.asOf,kind:e.kind}))
  };
 }).filter(x=>required.has(x.claim)||x.references>0);
 const dimensions:IntelligenceDimension[]=[
  {key:'identity',label:'Entity resolution',status:assessment.name.trim()&&assessment.identifier.trim()&&traced.has('identity')?'referenced':assessment.name.trim()?'incomplete':'missing',detail:'Registered name, identifier and dated registry reference.',action:'Reconcile a unique legal identifier to the relevant company and its group.'},
  {key:'financial',label:'Financial statement support',status:traced.has('financials')||traced.has('cash-flow')?'referenced':model.readyMethods?'incomplete':'missing',detail:'Financial claims mapped to dated supporting records.',action:'Attach accounts and reconcile reporting periods, units and consolidation scope.'},
  {key:'capital',label:'Capital structure',status:traced.has('capitalisation')?'referenced':f.sharesMillions!==null||f.netDebt!==null?'incomplete':'missing',detail:'Share classes, dilution, outstanding shares and financing bridge.',action:'Match share counts and net debt to a particular date and class.'},
  {key:'valuation',label:'Valuation reproducibility',status:model.readyMethods>0?'referenced':'missing',detail:model.readyMethods+' method(s) calculable; arithmetic only.',action:'Complete calculation inputs and compare method assumptions.'},
  {key:'provenance',label:'Evidence traceability',status:required.size>0&&coverage.referenced===coverage.required?'referenced':coverage.referenced?'incomplete':'missing',detail:coverage.referenced+' of '+coverage.required+' required claim categories have dated HTTPS references.',action:'Resolve missing categories and independently inspect document content.'},
  {key:'review',label:'Independent verification',status:'missing',detail:'No submitted source has been independently authenticated by this rule engine.',action:'Verify originals, contradictions and scope with an authorised reviewer.'}
 ];
 signals.sort((a,b)=>severityPriority[a.severity]-severityPriority[b.severity]||a.id.localeCompare(b.id));
 const nextActions=signals.filter(s=>s.severity!=='info').slice(0,8).map((s,i)=>({signalId:s.id,priority:i+1,action:s.action}));
 return {
  engine:'creqor-forensic-v1',generatedFor:assessment.name||'Untitled company',asOf,basis:'analyst-entered-unverified',
  summary:{signals:signals.length,critical:signals.filter(s=>s.severity==='critical').length,
   high:signals.filter(s=>s.severity==='high').length,review:signals.filter(s=>s.severity==='review').length,
   sourceLinks:references.length,uniqueHosts:hosts.length,calculableMethods:model.readyMethods,coverage},
  signals,trace,dimensions,
  limitations:[
   'Source links and dates are user-entered; CREQOR has not fetched, authenticated or read their content.',
   'Source host counts are not independent verification, and source categories are not quality scores.',
   'Flags are rule-based screening prompts, not findings of fraud, illegality, audit failure or financial distress.',
   'Financial model outputs depend on analyst-supplied figures and do not constitute observed market prices, credit ratings or investment advice.'
  ],nextActions
 };
}
