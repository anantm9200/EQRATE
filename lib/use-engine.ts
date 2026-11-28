'use client';
import {useEffect,useRef,useState} from 'react';
import {computeAssessment,type Assessment,type AssessmentResult} from '@/lib/assessment';
import {reviewAssessment,buildSensitivity,buildScenarios,type Readiness,type SensitivityTable,type Scenario} from '@/lib/research-intelligence';
import {runForensicIntelligence,type IntelligenceReport} from '@/lib/forensic-intelligence';
import {analyzePortfolio,type PortfolioIntelligence} from '@/lib/portfolio-intelligence';
import {portfolioSummary,type PortfolioSummary} from '@/lib/intelligence-summary';
import {calculateDcf,type DcfInput,type DcfResult} from '@/lib/valuation';

/**
 * Intelligence is computed by CREQOR's private DGX engine (through /api/engine/*).
 * The engine result is authoritative. While a new result is on its way the previous one
 * stays on screen; if the engine cannot be reached the same calculation runs in the
 * browser and is labelled as such, so the tools keep working and the label stays honest.
 */
export type EngineSource='engine'|'browser'|'pending';
export type EngineView<T>={value:T;source:EngineSource;label:string;methodology:string|null};
export const ENGINE_DEBOUNCE_MS=300;
export const ENGINE_PENDING_LABEL='Calculating on the CREQOR private engine…';
export const BROWSER_FALLBACK_LABEL='Computed in your browser — private engine unreachable';
export function engineLabel(methodology:string){return 'Computed by the CREQOR private engine · '+methodology;}
type EngineReply={computedBy?:unknown;methodology?:unknown};

export function useEngine<R extends EngineReply,T>(path:string,body:object,local:()=>T,select:(reply:R)=>T):EngineView<T>{
 const key=JSON.stringify(body);
 const localRef=useRef(local);localRef.current=local;
 const selectRef=useRef(select);selectRef.current=select;
 const [state,setState]=useState<EngineView<T>&{key:string}>(()=>({key,value:local(),source:'pending',label:ENGINE_PENDING_LABEL,methodology:null}));
 useEffect(()=>{
  // Keep the previous result visible while recalculating.
  setState(s=>s.key===key&&s.source!=='pending'?s:{...s,key,source:'pending',label:ENGINE_PENDING_LABEL});
  const controller=new AbortController();
  const timer=window.setTimeout(async()=>{
   let reason='private engine unreachable';
   try{
    const res=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:key,signal:controller.signal,cache:'no-store'});
    if(res.ok){
     const data=await res.json() as R;
     if(data&&data.computedBy==='creqor-dgx-engine'&&typeof data.methodology==='string'){
      const value=selectRef.current(data);
      if(!controller.signal.aborted)setState({key,value,source:'engine',label:engineLabel(data.methodology),methodology:data.methodology});
      return;
     }
    }else if(res.status===429)reason='engine rate limit reached';
    else if(res.status===413)reason='input too large for the private engine';
    else if(res.status===400)reason='private engine rejected the input';
   }catch{/* network failure or malformed reply: fall back below */}
   if(controller.signal.aborted)return;
   setState({key,value:localRef.current(),source:'browser',label:'Computed in your browser — '+reason,methodology:null});
  },ENGINE_DEBOUNCE_MS);
  return ()=>{window.clearTimeout(timer);controller.abort();};
 },[path,key]);
 return state;
}

const today=()=>new Date().toISOString().slice(0,10);
const assessmentKeys=['id','name','identifier','country','industry','kind','currency','asOf','fields','active','weights','evidence','ratings','analystNotes','updatedAt'] as const;
/** Exactly the assessment fields the engine validates (JSON turns a cleared NaN weight into null, which the engine accepts). */
export function assessmentWire(a:Assessment){
 return Object.fromEntries(assessmentKeys.map(k=>[k,a[k]]));
}

export type AssessmentIntelligence={result:AssessmentResult;review:Readiness;sensitivity:SensitivityTable;scenarios:Scenario[]};
export type AssessmentOptions={discountStep:number;terminalStep:number;growthShift:number;discountShift:number};
const defaultOptions:AssessmentOptions={discountStep:1,terminalStep:.5,growthShift:2,discountShift:2};
export function useAssessmentIntelligence(a:Assessment,o:AssessmentOptions=defaultOptions){
 const asOf=today();
 return useEngine<EngineReply&AssessmentIntelligence,AssessmentIntelligence>('/api/engine/intelligence/assessment',
  {assessment:assessmentWire(a),asOf,sensitivity:{discountStep:o.discountStep,terminalStep:o.terminalStep},scenarios:{growthShift:o.growthShift,discountShift:o.discountShift}},
  ()=>({result:computeAssessment(a),review:reviewAssessment(a,asOf),sensitivity:buildSensitivity(a,o.discountStep,o.terminalStep),scenarios:buildScenarios(a,o.growthShift,o.discountShift)}),
  r=>({result:r.result,review:r.review,sensitivity:r.sensitivity,scenarios:r.scenarios}));
}
export function useForensicReport(a:Assessment){
 const asOf=today();
 return useEngine<EngineReply&{report:IntelligenceReport},IntelligenceReport>('/api/engine/intelligence/forensic',
  {assessment:assessmentWire(a),asOf},()=>runForensicIntelligence(a,asOf),r=>r.report);
}
export type PortfolioView={portfolio:PortfolioIntelligence;summaries:PortfolioSummary[]};
export function usePortfolioIntelligence(list:readonly Assessment[]){
 const asOf=today();
 return useEngine<EngineReply&PortfolioView,PortfolioView>('/api/engine/intelligence/portfolio',
  {assessments:list.slice(0,30).map(assessmentWire),asOf},
  ()=>({portfolio:analyzePortfolio(list.slice(0,30)),summaries:list.slice(0,30).map(a=>portfolioSummary(a,asOf))}),
  r=>({portfolio:r.portfolio,summaries:r.summaries}));
}
export type DcfOutcome={ok:true;result:DcfResult}|{ok:false;error:string};
export function useDcfCases(cases:DcfInput[]){
 return useEngine<EngineReply&{results:DcfOutcome[]},DcfOutcome[]>('/api/engine/valuation/dcf',{cases},
  ()=>cases.map(c=>{try{return {ok:true as const,result:calculateDcf(c)};}catch(e){return {ok:false as const,error:e instanceof Error?e.message:'Invalid inputs'};}}),
  r=>r.results);
}
