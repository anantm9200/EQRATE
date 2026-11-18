import type {IntelligenceSignal,IntelligenceSource} from './intelligence-engine';

export type FinancialMetricKey='revenue'|'netIncome'|'operatingIncome'|'operatingCashFlow'|'assets'|'equity'|'cash';
export type AnnualObservation={
 key:FinancialMetricKey;label:string;value:number;unit:'USD';
 start:string|null;end:string;filed:string;accession:string;form:string;
 concept:string;sourceId:string;
};
export type FinancialPeriod={end:string;metrics:Partial<Record<FinancialMetricKey,AnnualObservation>>};
export type FinancialIndicator={
 id:string;label:string;value:number;unit:'percent'|'ratio';
 interpretation:string;sourceIds:string[];
};
export type SecIntelligenceReport={
 type:'sec-financials';asOf:string;subject:{name:string;cik:string;tickers:string[];exchanges:string[]};
 periods:FinancialPeriod[];signals:IntelligenceSignal[];
 indicators:FinancialIndicator[];sources:IntelligenceSource[];
 coverage:{reportedMetricTypes:number;totalMetricTypes:number;historicalPeriods:number;label:string};
 disclosure:string;latestPeriodEnd:string|null;
};
type RawFact={val?:unknown;start?:unknown;end?:unknown;filed?:unknown;form?:unknown;accn?:unknown};
type FactGroup={units?:{USD?:RawFact[]}};
type CompanyFacts={cik?:unknown;facts?:{'us-gaap'?:Record<string,FactGroup>}};
const definitions:{key:FinancialMetricKey;label:string;duration:boolean;concepts:string[]}[]=[
 {key:'revenue',label:'Revenue',duration:true,concepts:['RevenueFromContractWithCustomerExcludingAssessedTax','Revenues','SalesRevenueNet']},
 {key:'netIncome',label:'Net income',duration:true,concepts:['NetIncomeLoss']},
 {key:'operatingIncome',label:'Operating income',duration:true,concepts:['OperatingIncomeLoss']},
 {key:'operatingCashFlow',label:'Operating cash flow',duration:true,concepts:['NetCashProvidedByUsedInOperatingActivities']},
 {key:'assets',label:'Total assets',duration:false,concepts:['Assets']},
 {key:'equity',label:'Shareholder equity',duration:false,concepts:['StockholdersEquity']},
 {key:'cash',label:'Cash and equivalents',duration:false,concepts:['CashAndCashEquivalentsAtCarryingValue']}
];
const MS=86400000;
function dayValid(v:unknown):v is string{
 return typeof v==='string'&&/^\d{4}-\d\d-\d\d$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(Date.parse(v)).toISOString().slice(0,10)===v;
}
function annualCandidate(row:RawFact,duration:boolean,asOf:string):row is RawFact&{val:number;end:string;filed:string;accn:string;form:string}{
 if(typeof row.val!=='number'||!Number.isFinite(row.val)||Math.abs(row.val)>1e18)return false;
 if(!dayValid(row.end)||!dayValid(row.filed)||row.end>asOf||row.filed>asOf)return false;
 if(row.form!=='10-K'&&row.form!=='10-K/A')return false;
 if(typeof row.accn!=='string'||!/^\d{10}-\d{2}-\d{6}$/.test(row.accn))return false;
 if(duration){
  if(!dayValid(row.start))return false;
  const length=(Date.parse(row.end)-Date.parse(row.start))/MS;
  return length>=270&&length<=390;
 }
 return row.start===undefined||row.start===null;
}
function sourceId(accession:string){return 'sec:'+accession;}
export function analyseCompanyFacts(payload:CompanyFacts,cik:string,subject:{name:string;tickers:string[];exchanges:string[]},asOf=new Date().toISOString().slice(0,10)):SecIntelligenceReport{
 if(!/^\d{10}$/.test(cik))throw new Error('INVALID_CIK');
 if(!dayValid(asOf))throw new Error('INVALID_AS_OF');
 if(String(payload?.cik??'').padStart(10,'0')!==cik)throw new Error('CIK_MISMATCH');
 const gaap=payload?.facts?.['us-gaap']||{};
 const byMetric=new Map<FinancialMetricKey,Map<string,AnnualObservation>>();
 for(const metric of definitions){
  const byEnd=new Map<string,AnnualObservation>();
  for(const concept of metric.concepts){
   const rows=gaap[concept]?.units?.USD;
   if(!Array.isArray(rows))continue;
   for(const row of rows){
    if(!annualCandidate(row,metric.duration,asOf))continue;
    const obs:AnnualObservation={
     key:metric.key,label:metric.label,value:row.val,unit:'USD',
     start:typeof row.start==='string'?row.start:null,
     end:row.end,filed:row.filed,accession:row.accn,form:row.form,
     concept,sourceId:sourceId(row.accn)
    };
    const existing=byEnd.get(row.end);
    // Prefer the most recent filed amendment for the *same* period and same concept.
    // Do not overwrite a higher-priority concept with a lower-priority alias.
    if(!existing || (existing.concept===concept && obs.filed>existing.filed)){
     byEnd.set(row.end,obs);
    }
   }
  }
  byMetric.set(metric.key,byEnd);
 }
 // Use the union of source reporting-period ends. Never let an older metric
 // silently dictate the latest fiscal period when other current metrics exist.
 const ends=[...new Set(definitions.flatMap(m=>[...(byMetric.get(m.key)?.keys()||[])]))];
 ends.sort((a,b)=>b.localeCompare(a));
 const periods:FinancialPeriod[]=ends.slice(0,4).map(end=>{
  const metrics:FinancialPeriod['metrics']={};
  for(const def of definitions){
   const fact=byMetric.get(def.key)?.get(end);
   if(fact)metrics[def.key]=fact;
  }
  return {end,metrics};
 });
 const used=new Map<string,IntelligenceSource>();
 for(const period of periods)for(const obs of Object.values(period.metrics)){
  if(!obs)continue;
  if(used.has(obs.sourceId))continue;
  used.set(obs.sourceId,{
   id:obs.sourceId,authority:'U.S. Securities and Exchange Commission',
   label:obs.form+' filing '+obs.accession,reference:obs.accession,date:obs.filed,
   url:'https://www.sec.gov/Archives/edgar/data/'+String(Number(cik))+'/'+obs.accession.replaceAll('-','')+'/'+obs.accession+'-index.htm'
  });
 }
 const sources=[...used.values()];
 const signal:SecIntelligenceReport['signals']=[];
 function add(id:string,level:IntelligenceSignal['level'],title:string,description:string,why:string,refs:string[],group:IntelligenceSignal['group']='Financials'){
  signal.push({id,level,group,title,description,why,sourceIds:[...new Set(refs)]});
 }
 const current=periods[0],prior=periods[1];
 const m=(period:FinancialPeriod|undefined,key:FinancialMetricKey)=>period?.metrics[key];
 const pair=(a:AnnualObservation|undefined,b:AnnualObservation|undefined)=>{
  if(!a||!b)return false;
  const days=(Date.parse(a.end)-Date.parse(b.end))/MS;
  if(days<330||days>400)return false;
  if(a.start&&b.start){
   const lenA=(Date.parse(a.end)-Date.parse(a.start))/MS;
   const lenB=(Date.parse(b.end)-Date.parse(b.start))/MS;
   if(Math.abs(lenA-lenB)>22)return false;
  }
  return true;
 };
 const indicators:FinancialIndicator[]=[];
 function indicator(id:string,label:string,value:number,unit:FinancialIndicator['unit'],refs:string[],interpretation:string){
  if(Number.isFinite(value)&&Math.abs(value)<=1e8)indicators.push({id,label,value,unit,sourceIds:[...new Set(refs)],interpretation});
 }
 const rev=m(current,'revenue'),oldRev=m(prior,'revenue'),net=m(current,'netIncome'),op=m(current,'operatingIncome'),
  ocf=m(current,'operatingCashFlow'),equity=m(current,'equity');
 if(current&&!rev&&periods.slice(1).some(p=>Boolean(p.metrics.revenue))){
  add('latest-revenue-missing','review','Current-period revenue unavailable',
   'The latest supported annual period is '+current.end+', but no supported annual revenue observation is available for that exact period.',
   'Older revenue observations must not be carried forward or presented as current figures.',
   Object.values(current.metrics).filter(Boolean).map(x=>x!.sourceId),'Evidence');
 }
 if(rev&&oldRev&&pair(rev,oldRev)&&oldRev.value>0){
  const growth=(rev.value/oldRev.value-1)*100;
  indicator('revenue-growth','Annual reported revenue change',growth,'percent',[rev.sourceId,oldRev.sourceId],
   'Change between two comparable annual XBRL periods; not a forecast or industry benchmark.');
  if(growth<-5)add('revenue-contracting','review','Revenue declined year on year',
   'Reported revenue changed by '+growth.toFixed(1)+'% across comparable annual periods.',
   'A decline merits context on divestitures, currency, changes in scope and demand.',[rev.sourceId,oldRev.sourceId]);
 }else if(rev&&oldRev&&!pair(rev,oldRev))
  add('period-mismatch','review','Revenue periods are not directly comparable',
   'The latest annual observations do not form comparable roughly 12-month reporting periods.',
   'Fiscal calendar changes and different period lengths can distort growth calculations.',[rev.sourceId,oldRev.sourceId],'Reporting');
 if(rev&&rev.value>0&&net&&net.end===rev.end){
  indicator('net-margin','Reported net margin',net.value/rev.value*100,'percent',[rev.sourceId,net.sourceId],
   'Net income divided by revenue for matching fiscal period end; cross-sector interpretation varies.');
 }
 if(rev&&rev.value>0&&op&&op.end===rev.end)
  indicator('operating-margin','Reported operating margin',op.value/rev.value*100,'percent',[rev.sourceId,op.sourceId],
   'Operating income divided by revenue for matching annual period end.');
 if(net&&net.value<0)add('net-loss','attention','Annual net loss reported',
  'Net income for '+net.end+' is negative.',
  'A loss alone does not establish distress; review noncash items, sector context and prior periods.',[net.sourceId]);
 if(ocf&&ocf.value<0)add('negative-operating-cash','attention','Negative annual operating cash flow',
  'Operating cash flow for '+ocf.end+' is negative.',
  'Analyse working-capital timing, investing cycles and cash-burn persistence before drawing conclusions.',[ocf.sourceId]);
 if(net&&ocf&&net.end===ocf.end&&net.value>0){
  indicator('cash-conversion','Operating cash flow / net income',ocf.value/net.value,'ratio',[ocf.sourceId,net.sourceId],
   'Reported operating cash flow divided by positive annual net income; a diagnostic, not a quality rating.');
  if(ocf.value<0)add('profit-cash-divergence','attention','Profit reported without positive operating cash flow',
   'Positive annual net income coincides with negative operating cash flow for the same period end.',
   'Reconcile accruals, cash collections, working capital and noncash items.',[ocf.sourceId,net.sourceId]);
 }
 if(equity&&equity.value<0)add('negative-book-equity','review','Negative reported book equity',
  'Reported stockholders’ equity is negative for '+equity.end+'.',
  'Book equity is not market capitalisation; review capital structure and sector conventions.',[equity.sourceId]);
 if(periods.length===0)add('coverage-empty','review','No eligible annual US GAAP facts',
  'No supported annual USD observations could be extracted from SEC companyfacts.',
  'The filer may report under other taxonomies or concepts, or the required facts may be missing.',[], 'Evidence');
 const presentMetricTypes=current?Object.keys(current.metrics).length:0;
 if(current&&presentMetricTypes<4)add('coverage-incomplete','review','Limited annual metric coverage',
  'Only '+presentMetricTypes+' of '+definitions.length+' supported metrics are available for '+current.end+'.',
  'Missing reporting concepts must remain unavailable rather than estimated.',Object.values(current.metrics).filter(Boolean).map(x=>x!.sourceId),'Evidence');
 if(current){
  const age=Math.floor((Date.parse(asOf)-Date.parse(current.end))/MS);
  if(age>550)add('annual-period-older','review','Latest supported annual period is older',
   'The latest covered annual period ended '+current.end+' ('+age+' days before the assessment date).',
   'Check newer quarterly filings, later annual reports and issuer changes before relying on these observations.',Object.values(current.metrics).filter(Boolean).map(x=>x!.sourceId),'Reporting');
 }
 return {
  type:'sec-financials',asOf,
  subject:{name:subject.name,cik,tickers:subject.tickers,exchanges:subject.exchanges},
  periods,signals:signal,indicators,sources,
  coverage:{reportedMetricTypes:presentMetricTypes,totalMetricTypes:definitions.length,historicalPeriods:periods.length,label:'Supported US GAAP observations — not a financial quality score'},
  latestPeriodEnd:current?.end||null,
  disclosure:'All financial numbers are issuer-reported SEC XBRL observations, not independent audited verification by CREQOR. Dates and taxonomies may differ; annual periods are compared only when aligned. No price, market capitalisation, credit rating or investment recommendation is produced.'
 };
}
export async function getSecIntelligence(cik:string,subject:{name:string;tickers:string[];exchanges:string[]},asOf=new Date().toISOString().slice(0,10)):Promise<SecIntelligenceReport>{
 if(!/^\d{10}$/.test(cik))throw new Error('INVALID_CIK');
 const agent=process.env.SEC_USER_AGENT;
 if(!agent)throw new Error('SEC_NOT_CONFIGURED');
 const response=await fetch('https://data.sec.gov/api/xbrl/companyfacts/CIK'+cik+'.json',{
  headers:{'User-Agent':agent,'Accept':'application/json'},
  signal:AbortSignal.timeout(14000),next:{revalidate:21600}
 });
 if(!response.ok)throw new Error('SEC_UPSTREAM_'+response.status);
 return analyseCompanyFacts(await response.json() as CompanyFacts,cik,subject,asOf);
}
