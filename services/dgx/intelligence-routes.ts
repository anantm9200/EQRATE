/**
 * CREQOR DGX engine: deterministic intelligence over user-supplied assessment data.
 *
 * These handlers run the same calculation libraries the website used to run in the
 * browser, unchanged, so the engine result is identical for identical input. The
 * engine is the authoritative computation; the website only proxies and renders.
 * Nothing here touches the database or the model: inputs are strictly validated,
 * computed and returned.
 */
import type {IncomingMessage} from 'node:http';
import {computeAssessment,numberKeys,methodNames,ratingCategories,type Assessment,type Evidence,type Method,type ClaimType,type SourceKind,type FinancialInputs,type RatingCategory} from '../../lib/assessment';
import {reviewAssessment,buildSensitivity,buildScenarios} from '../../lib/research-intelligence';
import {runForensicIntelligence} from '../../lib/forensic-intelligence';
import {analyzePortfolio} from '../../lib/portfolio-intelligence';
import {calculateDcf,type DcfInput} from '../../lib/valuation';
import {portfolioSummary} from '../../lib/intelligence-summary';

export const COMPUTED_BY='creqor-dgx-engine' as const;
export const METHODOLOGY={
 assessment:'creqor-assessment-v1/research-intelligence-v1',
 forensic:'creqor-forensic-v1',
 portfolio:'creqor-portfolio-v1',
 dcf:'creqor-dcf-v1'
} as const;
export const MAX_INTELLIGENCE_BODY=250_000;
const MAX_PORTFOLIO=30;
const MAX_DCF_CASES=40;

export class IntelligenceInputError extends Error{
 constructor(public code:string,message:string){super(message);}
}
const bad=(code:string,message:string)=>new IntelligenceInputError(code,message);

type Obj=Record<string,unknown>;
function isObj(v:unknown):v is Obj{return typeof v==='object'&&v!==null&&!Array.isArray(v);}
function onlyKeys(o:Obj,allowed:readonly string[],where:string){
 for(const k of Object.keys(o))if(!allowed.includes(k))throw bad('BAD_FIELD',where+': unexpected field '+JSON.stringify(k.slice(0,40))+'.');
}
function str(v:unknown,where:string,max:number):string{
 if(typeof v!=='string'||v.length>max)throw bad('BAD_FIELD',where+' must be text of at most '+max+' characters.');
 return v;
}
function finiteOrNull(v:unknown,where:string):number|null{
 if(v===null)return null;
 if(typeof v!=='number'||!Number.isFinite(v))throw bad('BAD_NUMBER',where+' must be a finite number or null.');
 return v;
}
function isoDate(v:unknown,where:string):string{
 if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v+'T00:00:00Z')))
  throw bad('BAD_DATE',where+' must be a YYYY-MM-DD date.');
 return v;
}
const sourceKinds:readonly SourceKind[]=['official_filing','audited_financials','independent_third_party','company_provided','user_provided','other'];
const claimTypes:readonly ClaimType[]=['identity','financials','cash-flow','capitalisation','share-price','transaction','funding','assets','peer-multiple','other'];
const methods=Object.keys(methodNames) as Method[];
const assessmentKeys=['id','name','identifier','country','industry','kind','currency','asOf','fields','active','weights','evidence','ratings','analystNotes','updatedAt'] as const;

/** Strict structural validation. Values are not normalised, so the calculation sees exactly what the analyst entered. */
export function validateAssessment(v:unknown,where='assessment'):Assessment{
 if(!isObj(v))throw bad('BAD_ASSESSMENT',where+' must be an object.');
 onlyKeys(v,assessmentKeys,where);
 for(const k of assessmentKeys)if(!(k in v))throw bad('BAD_ASSESSMENT',where+'.'+k+' is required.');
 if(v.kind!=='listed'&&v.kind!=='unlisted')throw bad('BAD_ASSESSMENT',where+'.kind must be listed or unlisted.');
 if(!isObj(v.fields))throw bad('BAD_ASSESSMENT',where+'.fields must be an object.');
 onlyKeys(v.fields,numberKeys,where+'.fields');
 const fields={} as FinancialInputs;
 for(const k of numberKeys)fields[k]=finiteOrNull(v.fields[k]===undefined?null:v.fields[k],where+'.fields.'+k);
 if(!Array.isArray(v.active)||v.active.length>methods.length)throw bad('BAD_ASSESSMENT',where+'.active must list at most six methods.');
 const active:Method[]=[];
 for(const m of v.active){
  if(typeof m!=='string'||!methods.includes(m as Method)||active.includes(m as Method))throw bad('BAD_ASSESSMENT',where+'.active contains an unknown or repeated method.');
  active.push(m as Method);
 }
 if(!isObj(v.weights))throw bad('BAD_ASSESSMENT',where+'.weights must be an object.');
 onlyKeys(v.weights,methods,where+'.weights');
 // A cleared weight input arrives as null (JSON has no NaN); the library treats both as "not weighted".
 const weights={} as Record<Method,number>;
 for(const m of methods)weights[m]=finiteOrNull(v.weights[m]===undefined?null:v.weights[m],where+'.weights.'+m) as number;
 if(!isObj(v.ratings))throw bad('BAD_ASSESSMENT',where+'.ratings must be an object.');
 onlyKeys(v.ratings,ratingCategories,where+'.ratings');
 const ratings={} as Record<RatingCategory,number|null>;
 for(const k of ratingCategories)ratings[k]=finiteOrNull(v.ratings[k]===undefined?null:v.ratings[k],where+'.ratings.'+k);
 if(!Array.isArray(v.evidence)||v.evidence.length>80)throw bad('BAD_ASSESSMENT',where+'.evidence must be a list of at most 80 records.');
 const evidence:Evidence[]=v.evidence.map((e,i)=>{
  const at=where+'.evidence['+i+']';
  if(!isObj(e))throw bad('BAD_EVIDENCE',at+' must be an object.');
  onlyKeys(e,['id','title','url','kind','claim','asOf','notes'],at);
  if(typeof e.kind!=='string'||!sourceKinds.includes(e.kind as SourceKind))throw bad('BAD_EVIDENCE',at+'.kind is not a known source category.');
  if(typeof e.claim!=='string'||!claimTypes.includes(e.claim as ClaimType))throw bad('BAD_EVIDENCE',at+'.claim is not a known claim category.');
  return {id:str(e.id,at+'.id',80),title:str(e.title,at+'.title',250),url:str(e.url,at+'.url',1200),
   kind:e.kind as SourceKind,claim:e.claim as ClaimType,asOf:str(e.asOf,at+'.asOf',64),notes:str(e.notes,at+'.notes',500)};
 });
 return {id:str(v.id,where+'.id',80),name:str(v.name,where+'.name',250),identifier:str(v.identifier,where+'.identifier',1000),
  country:str(v.country,where+'.country',1000),industry:str(v.industry,where+'.industry',1000),kind:v.kind,
  currency:str(v.currency,where+'.currency',64),asOf:str(v.asOf,where+'.asOf',64),fields,active,weights,evidence,ratings,
  analystNotes:str(v.analystNotes,where+'.analystNotes',5000),updatedAt:str(v.updatedAt,where+'.updatedAt',64)};
}
function choice(v:unknown,where:string,fallback:number,allowed:readonly number[]):number{
 if(v===undefined)return fallback;
 if(typeof v!=='number'||!allowed.includes(v))throw bad('BAD_PARAMETER',where+' must be one of '+allowed.join(', ')+'.');
 return v;
}
function reviewDate(v:unknown):string|undefined{return v===undefined?undefined:isoDate(v,'asOf');}

/** POST /v1/intelligence/assessment */
export function assessmentIntelligence(body:unknown){
 if(!isObj(body))throw bad('BAD_REQUEST','Request body must be a JSON object.');
 onlyKeys(body,['assessment','asOf','sensitivity','scenarios'],'request');
 const a=validateAssessment(body.assessment);
 const asOf=reviewDate(body.asOf);
 const s=body.sensitivity===undefined?{}:body.sensitivity;
 const c=body.scenarios===undefined?{}:body.scenarios;
 if(!isObj(s)||!isObj(c))throw bad('BAD_PARAMETER','sensitivity and scenarios must be objects.');
 onlyKeys(s,['discountStep','terminalStep'],'sensitivity');onlyKeys(c,['growthShift','discountShift'],'scenarios');
 const discountStep=choice(s.discountStep,'sensitivity.discountStep',1,[.25,.5,1,1.5,2]);
 const terminalStep=choice(s.terminalStep,'sensitivity.terminalStep',.5,[.25,.5,1]);
 const growthShift=choice(c.growthShift,'scenarios.growthShift',2,[1,2,3,5]);
 const discountShift=choice(c.discountShift,'scenarios.discountShift',2,[.5,1,2,3]);
 return {computedBy:COMPUTED_BY,methodology:METHODOLOGY.assessment,
  result:computeAssessment(a),review:asOf===undefined?reviewAssessment(a):reviewAssessment(a,asOf),
  sensitivity:buildSensitivity(a,discountStep,terminalStep),scenarios:buildScenarios(a,growthShift,discountShift)};
}
/** POST /v1/intelligence/forensic */
export function forensicIntelligence(body:unknown){
 if(!isObj(body))throw bad('BAD_REQUEST','Request body must be a JSON object.');
 onlyKeys(body,['assessment','asOf'],'request');
 const a=validateAssessment(body.assessment);
 const asOf=reviewDate(body.asOf);
 return {computedBy:COMPUTED_BY,methodology:METHODOLOGY.forensic,
  report:asOf===undefined?runForensicIntelligence(a):runForensicIntelligence(a,asOf)};
}
/** POST /v1/intelligence/portfolio */
export function portfolioIntelligence(body:unknown){
 if(!isObj(body))throw bad('BAD_REQUEST','Request body must be a JSON object.');
 onlyKeys(body,['assessments','asOf'],'request');
 if(!Array.isArray(body.assessments)||body.assessments.length>MAX_PORTFOLIO)
  throw bad('BAD_REQUEST','assessments must be a list of at most '+MAX_PORTFOLIO+' records.');
 const list=body.assessments.map((x,i)=>validateAssessment(x,'assessments['+i+']'));
 const asOf=reviewDate(body.asOf);
 return {computedBy:COMPUTED_BY,methodology:METHODOLOGY.portfolio,
  portfolio:analyzePortfolio(list),summaries:list.map(a=>portfolioSummary(a,asOf))};
}
const dcfKeys=['baseFreeCashFlow','annualGrowth','discountRate','terminalGrowth','forecastYears','netDebt','sharesOutstanding'] as const;
/** POST /v1/valuation/dcf — a batch of DCF cases (a base case plus any sensitivity grid). */
export function dcfValuation(body:unknown){
 if(!isObj(body))throw bad('BAD_REQUEST','Request body must be a JSON object.');
 onlyKeys(body,['cases'],'request');
 if(!Array.isArray(body.cases)||body.cases.length<1||body.cases.length>MAX_DCF_CASES)
  throw bad('BAD_REQUEST','cases must list 1 to '+MAX_DCF_CASES+' DCF inputs.');
 const results=body.cases.map((c,i)=>{
  if(!isObj(c))throw bad('BAD_REQUEST','cases['+i+'] must be an object.');
  onlyKeys(c,dcfKeys,'cases['+i+']');
  // A blank input arrives as null; the library reports a missing (non-finite) input itself.
  const n=(k:typeof dcfKeys[number])=>{const v=finiteOrNull(c[k]===undefined?null:c[k],'cases['+i+'].'+k);return v===null?NaN:v;};
  const input:DcfInput={baseFreeCashFlow:n('baseFreeCashFlow'),annualGrowth:n('annualGrowth'),discountRate:n('discountRate'),
   terminalGrowth:n('terminalGrowth'),forecastYears:n('forecastYears'),netDebt:n('netDebt')};
  if(c.sharesOutstanding!==undefined)input.sharesOutstanding=n('sharesOutstanding');
  try{return {ok:true as const,result:calculateDcf(input)};}
  catch(e){return {ok:false as const,error:e instanceof Error?e.message:'Invalid inputs'};}
 });
 return {computedBy:COMPUTED_BY,methodology:METHODOLOGY.dcf,results};
}

const routes:Record<string,(body:unknown)=>unknown>={
 '/v1/intelligence/assessment':assessmentIntelligence,
 '/v1/intelligence/forensic':forensicIntelligence,
 '/v1/intelligence/portfolio':portfolioIntelligence,
 '/v1/valuation/dcf':dcfValuation
};
async function readJson(req:IncomingMessage):Promise<unknown>{
 const declared=Number(req.headers['content-length']||0);
 if(declared>MAX_INTELLIGENCE_BODY)throw bad('PAYLOAD_TOO_LARGE','Request body exceeds 250 KB.');
 let size=0;const chunks:Buffer[]=[];
 for await(const piece of req){
  const chunk=Buffer.isBuffer(piece)?piece:Buffer.from(piece);
  size+=chunk.length;
  if(size>MAX_INTELLIGENCE_BODY)throw bad('PAYLOAD_TOO_LARGE','Request body exceeds 250 KB.');
  chunks.push(chunk);
 }
 try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw bad('BAD_JSON','Request body is not valid JSON.');}
}
/**
 * Route an authenticated engine request. Returns null when the path is not an intelligence route,
 * so server.ts can fall through to its own routing.
 */
export async function intelligenceRoute(method:string,pathname:string,req:IncomingMessage):Promise<{status:number;body:unknown}|null>{
 const handler=routes[pathname];
 if(!handler)return null;
 if(method!=='POST')return {status:405,body:{error:'Use POST with a JSON body.'}};
 try{
  return {status:200,body:handler(await readJson(req))};
 }catch(e){
  if(e instanceof IntelligenceInputError)
   return {status:e.code==='PAYLOAD_TOO_LARGE'?413:400,body:{error:e.message,code:e.code}};
  throw e;
 }
}
