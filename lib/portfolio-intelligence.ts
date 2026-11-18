import type {Assessment, Evidence} from './assessment';
import {computeAssessment} from './assessment';

export type PortfolioLink = {
 id:string;kind:'shared-identifier'|'shared-source'|'name-collision';
 companies:[string,string];companyNames:[string,string];detail:string;
 priority:'high'|'review';evidenceIds:string[];
};
export type PortfolioAlert = {
 id:string;kind:'conflicting-identity'|'cross-company-evidence'|'valuation-shift'|'financial-shift'|'identity-collision';
 companyIds:string[];headline:string;reason:string;nextAction:string;
 priority:'high'|'review';evidenceIds:string[];
};
export type PortfolioIntelligence = {
 engine:'creqor-portfolio-v1';basis:'analyst-entered-unverified';
 companies:number;links:PortfolioLink[];alerts:PortfolioAlert[];
 sourceHosts:{host:string;companies:number;references:number}[];
 summary:{high:number;review:number;sharedSources:number;identityCollisions:number};
 limitations:string[];
};
const key=(s:string)=>s.trim().toLocaleLowerCase('en-US').replace(/\s+/g,' ');
function sourceIdentity(s:string):string|null{
 try{
  const u=new URL(s);
  if(u.protocol!=='https:'||u.username||u.password)return null;
  u.hash='';u.searchParams.sort();
  return u.toString().replace(/\/$/,'');
 }catch{return null;}
}
function host(s:string){try{return new URL(s).hostname.toLowerCase();}catch{return null;}}
function pair(a:Assessment,b:Assessment):[string,string]{return [a.id,b.id].sort() as [string,string];}
function pairNames(a:Assessment,b:Assessment):[string,string]{return a.id<b.id?[a.name,b.name]:[b.name,a.name];}
function days(s:string):number|null{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return null;
 const n=Date.parse(s+'T00:00:00Z');
 return Number.isFinite(n)&&new Date(n).toISOString().slice(0,10)===s?n:null;
}
function newer(a:Assessment,b:Assessment){return (days(a.asOf)||0)>=(days(b.asOf)||0)?[a,b]:[b,a];}
function relativeChange(a:number,b:number){return Math.abs(a-b)/Math.max(Math.abs(a),Math.abs(b),1);}
export function analyzePortfolio(input:readonly Assessment[]):PortfolioIntelligence{
 // Deduplicate drafts by internal ID; do not deduplicate distinct legal entities by name.
 const records=[...new Map(input.map(a=>[a.id,a])).values()].slice(0,30);
 const links:PortfolioLink[]=[],alerts:PortfolioAlert[]=[];
 const sourceMap=new Map<string,{companies:Set<string>;refs:number}>();
 for(const a of records)for(const e of a.evidence){
  const uri=sourceIdentity(e.url);
  if(!uri)continue;
  const h=host(uri)!;
  const item=sourceMap.get(h)||{companies:new Set<string>(),refs:0};
  item.companies.add(a.id);item.refs++;sourceMap.set(h,item);
 }
 for(let i=0;i<records.length;i++)for(let j=i+1;j<records.length;j++){
  const a=records[i],b=records[j],ids=pair(a,b),names=pairNames(a,b);
  const idMatch=Boolean(key(a.identifier)&&key(a.identifier)===key(b.identifier));
  const nameMatch=Boolean(key(a.name)&&key(a.name)===key(b.name));
  if(idMatch){
   links.push({id:'identifier:'+ids.join(':'),kind:'shared-identifier',companies:ids,companyNames:names,detail:'Two drafts use the same registered identifier. This could be repeat coverage or incorrect entity attribution.',priority:'high',evidenceIds:[]});
   if(key(a.name)!==key(b.name)||key(a.country)!==key(b.country)){
    alerts.push({id:'identity:'+ids.join(':'),kind:'conflicting-identity',companyIds:ids,headline:'Conflicting identity attributes for one identifier',reason:'Drafts sharing an identifier disagree on the name or jurisdiction.',nextAction:'Resolve both against the same dated primary registry record; do not automatically merge.',priority:'high',evidenceIds:[]});
   }
  }else if(nameMatch){
   links.push({id:'name:'+ids.join(':'),kind:'name-collision',companies:ids,companyNames:names,detail:'The registered names match, but identifiers do not. A name is not a unique company key.',priority:'review',evidenceIds:[]});
   alerts.push({id:'collision:'+ids.join(':'),kind:'identity-collision',companyIds:ids,headline:'Same company name, different identifiers',reason:'Possible subsidiaries, similarly named businesses, duplicate records or an entry error.',nextAction:'Check legal identifiers and parent-child relationships in primary registries.',priority:'review',evidenceIds:[]});
  }
  const matched=new Map<string,{left:Evidence[];right:Evidence[]}>();
  for(const [side,list] of [['left',a.evidence],['right',b.evidence]] as const){
   for(const evidence of list){
    const url=sourceIdentity(evidence.url);if(!url)continue;
    const entry=matched.get(url)||{left:[],right:[]};
    entry[side].push(evidence);matched.set(url,entry);
   }
  }
  for(const [url,items] of matched){
   if(!items.left.length||!items.right.length)continue;
   const evidenceIds=[...items.left,...items.right].map(e=>e.id);
   links.push({id:'source:'+ids.join(':')+':'+url,kind:'shared-source',companies:ids,companyNames:names,detail:'Both assessments reference the same document URL. It may relate to a group or multiple entities.',priority:'review',evidenceIds});
   if(!idMatch){
    alerts.push({id:'source:'+ids.join(':')+':'+url,kind:'cross-company-evidence',companyIds:ids,headline:'One evidence URL supports different companies',reason:'Source reuse may be legitimate but the record scope needs to be checked.',nextAction:'Inspect document issuer, consolidated group and the exact claims being supported.',priority:'review',evidenceIds});
   }
  }
  // Trend comparisons only make sense for drafts of the same known legal entity,
  // with the same currency and different dated assessment periods.
  if(!idMatch||key(a.currency)!==key(b.currency)||a.asOf===b.asOf)continue;
  const [latest,older]=newer(a,b);
  for(const field of ['revenue','ebitda','assets','liabilities'] as const){
   const current=latest.fields[field],previous=older.fields[field];
   if(current===null||previous===null||relativeChange(current,previous)<0.5)continue;
   alerts.push({id:'trend:'+ids.join(':')+':'+field,kind:'financial-shift',companyIds:ids,headline:'Material change in entered '+field,reason:'The reported figure differs by at least 50% across two dated drafts. Fiscal periods and consolidation scope may differ.',nextAction:'Reconcile periods, units, currency, restatements and source filings before attributing the change to operations.',priority:'review',evidenceIds:[]});
  }
  const now=computeAssessment(latest).blended,old=computeAssessment(older).blended;
  if(now!==null&&old!==null&&relativeChange(now,old)>=0.5){
   alerts.push({id:'valuation:'+ids.join(':'),kind:'valuation-shift',companyIds:ids,headline:'Large change in modelled equity value',reason:'Analyst-entered blended values differ by at least 50% between dated drafts; assumptions or method weights may have changed.',nextAction:'Compare method inputs, evidence dates, share class, capital bridge and applied weights.',priority:'review',evidenceIds:[]});
  }
 }
 const priority=(s:'high'|'review')=>s==='high'?0:1;
 links.sort((a,b)=>priority(a.priority)-priority(b.priority)||a.id.localeCompare(b.id));
 alerts.sort((a,b)=>priority(a.priority)-priority(b.priority)||a.id.localeCompare(b.id));
 const sourceHosts=[...sourceMap].map(([h,v])=>({host:h,companies:v.companies.size,references:v.refs})).sort((a,b)=>b.companies-a.companies||b.references-a.references||a.host.localeCompare(b.host));
 return {engine:'creqor-portfolio-v1',basis:'analyst-entered-unverified',companies:records.length,links,alerts,sourceHosts,
 summary:{high:alerts.filter(x=>x.priority==='high').length,review:alerts.filter(x=>x.priority==='review').length,sharedSources:links.filter(x=>x.kind==='shared-source').length,identityCollisions:links.filter(x=>x.kind==='shared-identifier'||x.kind==='name-collision').length},
 limitations:['Matches are candidate relationships, not verified ownership or affiliation.','Only locally saved assessments are compared; no external company graph or provider data is queried.','Financial change flags compare entered observations, not audited time series.','Repeated source hosts or URLs do not count as independent corroboration.']};
}
