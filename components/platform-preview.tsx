'use client';
import Link from 'next/link';
import {useEffect,useMemo,useRef,useState} from 'react';
import {calculateDcf} from '@/lib/valuation';

type View='discover'|'model'|'evidence';
const tabs:{id:View;name:string;number:string}[]=[
 {id:'discover',name:'Discover',number:'01'},
 {id:'model',name:'Model',number:'02'},
 {id:'evidence',name:'Evidence',number:'03'}
];
const proof=['Legal identity','Financial source','Capital structure'];
const demoRates=[12,15,10,14,9.5,13.5];

/** Tween numbers without touching the underlying DCF model. Reduced motion snaps immediately. */
function useAnimatedNumber(target:number,reduced:boolean){
 const [displayed,setDisplayed]=useState(target);
 const current=useRef(target);
 useEffect(()=>{
  if(reduced||!Number.isFinite(target)){
   current.current=target;
   setDisplayed(target);
   return;
  }
  const start=current.current;
  const diff=target-start;
  if(Math.abs(diff)<.001)return;
  let frame=0;
  let begin:number|null=null;
  const tick=(now:number)=>{
   if(begin===null)begin=now;
   const progress=Math.min(1,(now-begin)/760);
   const eased=1-Math.pow(1-progress,3);
   const next=start+diff*eased;
   current.current=next;
   setDisplayed(next);
   if(progress<1)frame=window.requestAnimationFrame(tick);
  };
  frame=window.requestAnimationFrame(tick);
  return()=>window.cancelAnimationFrame(frame);
 },[target,reduced]);
 return displayed;
}
export default function PlatformPreview(){
 const [view,setView]=useState<View>('model');
 const [discount,setDiscount]=useState(12);
 const [checks,setChecks]=useState<boolean[]>([false,false,false]);
 const [playing,setPlaying]=useState(true);
 const [inView,setInView]=useState(false);
 const [pageVisible,setPageVisible]=useState(true);
 const [reducedMotion,setReducedMotion]=useState(false);
 const previewRef=useRef<HTMLDivElement>(null);
 const demoIndex=useRef(0);

 useEffect(()=>{
  const media=window.matchMedia('(prefers-reduced-motion: reduce)');
  const sync=()=>setReducedMotion(media.matches);
  sync();media.addEventListener('change',sync);
  return()=>media.removeEventListener('change',sync);
 },[]);
 useEffect(()=>{
  const sync=()=>setPageVisible(document.visibilityState==='visible');
  document.addEventListener('visibilitychange',sync);sync();
  return()=>document.removeEventListener('visibilitychange',sync);
 },[]);
 useEffect(()=>{
  const node=previewRef.current;
  if(!node)return;
  if(!('IntersectionObserver' in window)){setInView(true);return;}
  const observer=new IntersectionObserver(([entry])=>setInView(entry.isIntersecting),{threshold:.16});
  observer.observe(node);
  return()=>observer.disconnect();
 },[]);
 useEffect(()=>{
  if(!playing||reducedMotion||!inView||!pageVisible||view!=='model')return;
  const timer=window.setInterval(()=>{
   demoIndex.current=(demoIndex.current+1)%demoRates.length;
   setDiscount(demoRates[demoIndex.current]);
  },3200);
  return()=>window.clearInterval(timer);
 },[playing,reducedMotion,inView,pageVisible,view]);

 const output=useMemo(()=>calculateDcf({
  baseFreeCashFlow:18,annualGrowth:.06,discountRate:discount/100,
  terminalGrowth:.02,forecastYears:5,netDebt:45
 }),[discount]);
 const animatedEquity=useAnimatedNumber(output.equityValue,reducedMotion);
 const animatedEnterprise=useAnimatedNumber(output.enterpriseValue,reducedMotion);
 const curve=useMemo(()=>{
  const values=Array.from({length:21},(_,i)=>{
   const rate=8+i*.5;
   return {rate,value:calculateDcf({baseFreeCashFlow:18,annualGrowth:.06,discountRate:rate/100,terminalGrowth:.02,forecastYears:5,netDebt:45}).equityValue};
  });
  const low=Math.min(...values.map(p=>p.value)),high=Math.max(...values.map(p=>p.value));
  const xy=values.map((p,i)=>({x:10+i*15,y:75-(p.value-low)/(high-low||1)*59}));
  const line=xy.map((p,i)=>(i?'L':'M')+p.x+' '+p.y.toFixed(2)).join(' ');
  return {line,area:line+' L310 82 L10 82 Z',xy};
 },[]);
 const position=Math.max(0,Math.min(20,(discount-8)*2));
 const left=Math.floor(position),right=Math.ceil(position),fraction=position-left;
 const focus={
  x:curve.xy[left].x*(1-fraction)+curve.xy[right].x*fraction,
  y:curve.xy[left].y*(1-fraction)+curve.xy[right].y*fraction
 };
 const money=(n:number)=>new Intl.NumberFormat('en-US',{maximumFractionDigits:1,minimumFractionDigits:1}).format(n);
 const complete=checks.filter(Boolean).length;
 return <div ref={previewRef} className={'ux-preview ux-motion-workspace'+(playing&&!reducedMotion&&view==='model'?' is-playing':'')} aria-label="Interactive CREQOR research workflow preview">
  <div className="ux-preview-top">
   <div className="ux-preview-brand"><span className="ux-preview-mark">◈</span><div><strong>Research workspace</strong><small>Explore a clearer way to work</small></div></div>
   <span className="ux-preview-demo"><span className="ux-dot"/> INTERACTIVE DEMONSTRATION</span>
  </div>
  <div className="ux-preview-tabs" role="tablist" aria-label="Explore research workflow preview">
   {tabs.map(t=><button role="tab" type="button" id={'ux-tab-'+t.id} aria-controls="ux-preview-panel" aria-selected={view===t.id} key={t.id} onClick={()=>setView(t.id)} className={view===t.id?'is-active':''}><small>{t.number}</small>{t.name}</button>)}
  </div>
  <div className="ux-preview-content" role="tabpanel" id="ux-preview-panel" aria-labelledby={'ux-tab-'+view} key={view}>
   {view==='discover'&&<>
    <div className="ux-preview-description"><span className="ux-preview-overline">01 / ENTITY DISCOVERY</span><h3>The right company, first.</h3><p>Know which entity you're looking at before assigning meaning to its numbers.</p><Link href="/explore" className="ux-preview-action">Explore real entity records ↗</Link></div>
    <div className="ux-identity-card"><div className="ux-identity-head"><span className="ux-mini-symbol">◇</span><span>RESEARCH CHECKLIST</span></div>
      <div><span>Legal entity</span><strong>Exact registered name</strong></div><div><span>Identifier</span><strong>LEI, CIK or registration number</strong></div><div><span>Jurisdiction</span><strong>Country and filing source</strong></div>
      <small>Illustrative workflow · No company selected</small>
    </div>
   </>}
   {view==='model'&&<>
    <div className="ux-preview-description"><span className="ux-preview-overline">02 / VALUATION LAB</span><h3>See what moves the value.</h3><p>Adjust the discount rate and watch the model recalculate. Every figure here is hypothetical.</p><Link href="/workbench" className="ux-preview-action">Open the complete workbench ↗</Link></div>
    <div className="ux-model-card">
     <div className="ux-model-head"><span>ILLUSTRATIVE EQUITY ESTIMATE</span><div className="ux-model-head-controls"><span>USD / MILLIONS</span><button type="button" className="ux-motion-toggle" aria-pressed={playing&&!reducedMotion} aria-label={playing&&!reducedMotion?'Pause animated valuation demo':'Play animated valuation demo'} disabled={reducedMotion} title={reducedMotion?'Motion disabled by your accessibility preference':playing?'Pause automatic sensitivity demonstration':'Play automatic sensitivity demonstration'} onClick={()=>setPlaying(x=>!x)}><span aria-hidden="true">{playing&&!reducedMotion?'Ⅱ':'▶'}</span> {playing&&!reducedMotion?'Pause':'Play'} motion</button></div></div>
     <div className="ux-model-value"><strong className="ux-motion-figure" aria-label={'Illustrative equity value '+money(output.equityValue)+' million US dollars'}>${money(animatedEquity)}<small>m</small></strong><span>DCF model</span></div>
     <div className="ux-live-curve"><div className="ux-curve-meta"><span>VALUE SENSITIVITY</span><span>8–18% DISCOUNT RATE</span></div><svg viewBox="0 0 320 88" preserveAspectRatio="none" role="img" aria-label="Calculated equity value decreases as the discount rate rises from 8 to 18 percent">
       <defs><linearGradient id="ux-curve-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#32a266" stopOpacity=".24"/><stop offset="100%" stopColor="#32a266" stopOpacity="0"/></linearGradient></defs>
       <path d={curve.area} fill="url(#ux-curve-fill)" className="fx-chart-area"/>
       <path d={curve.line} fill="none" stroke="#24894e" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" className="fx-chart-line"/>
       <line x1={focus.x} x2={focus.x} y1="8" y2="82" stroke="#2d8b51" strokeDasharray="3 5" strokeOpacity=".35" className="ux-motion-crosshair"/>
       <circle cx={focus.x} cy={focus.y} r="9" fill="#36a46b" fillOpacity=".12" className="ux-motion-cursor-glow" aria-hidden="true"/>
       <circle cx={focus.x} cy={focus.y} r="4.1" stroke="#fff" strokeWidth="2" fill="#247f4a" className="fx-chart-cursor"/>
      </svg><div className="ux-motion-track" aria-hidden="true"><span key={playing+'-'+discount} /></div></div>
     <div className="ux-model-range"><div><label htmlFor="ux-discount">Discount rate</label><output htmlFor="ux-discount">{discount.toFixed(1)}%</output></div>
      <input id="ux-discount" aria-label="Illustrative DCF discount rate" type="range" min="8" max="18" step=".5" value={discount} onChange={e=>{setPlaying(false);setDiscount(Number(e.target.value));}}/><div className="ux-slider-ends"><span>8%</span><span>18%</span></div>
     </div>
     <div className="ux-model-foot"><span>Enterprise value <strong>${money(animatedEnterprise)}m</strong></span><span>Net debt <strong>$45.0m</strong></span></div>
    </div>
   </>}
   {view==='evidence'&&<>
    <div className="ux-preview-description"><span className="ux-preview-overline">03 / EVIDENCE REGISTER</span><h3>A source behind every claim.</h3><p>Check what your analysis needs. This is a workflow demo, not document verification.</p><Link href="/verification" className="ux-preview-action">Review evidence standards ↗</Link></div>
    <div className="ux-evidence-card"><div className="ux-evidence-head"><span>REVIEW CHECKLIST</span><strong>{complete} / 3 marked</strong></div>
     {proof.map((label,i)=><label key={label} className="ux-evidence-item"><input type="checkbox" checked={checks[i]} onChange={e=>setChecks(old=>old.map((v,j)=>i===j?e.target.checked:v))}/><span>{label}</span><small>{checks[i]?'Marked for review':'Not yet marked'}</small></label>)}
     <div className="ux-evidence-bar"><span style={{width:complete/3*100+'%'}}/></div>
     <small>These checks are not independently verified.</small>
    </div>
   </>}
  </div>
  <div className="ux-preview-foot"><span><span className="ux-dot"/> MODELS ARE EXPLAINABLE. DATA MUST BE SOURCED.</span><Link href="/workbench">OPEN CREQOR <span aria-hidden="true">↗</span></Link></div>
 </div>;
}
