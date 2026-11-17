'use client';
import {useState} from 'react';
import Link from 'next/link';

type View='identify'|'value'|'verify';
const views:{
 id:View;index:string;label:string;eyebrow:string;title:string;detail:string;href:string;action:string;
}[]=[
 {id:'identify',index:'01',label:'Identify',eyebrow:'LEGAL ENTITY / SOURCE',title:'Start with the right company.',detail:'Resolve the legal identity before comparing claims or numbers.',href:'/explore',action:'Find a company'},
 {id:'value',index:'02',label:'Value',eyebrow:'MODELS / ASSUMPTIONS',title:'Follow every assumption.',detail:'Build valuation cases and see what changes the outcome.',href:'/workbench',action:'Open the workbench'},
 {id:'verify',index:'03',label:'Verify',eyebrow:'PROVENANCE / RESEARCH',title:'Make the evidence visible.',detail:'Keep sources, dates and unanswered questions attached to the analysis.',href:'/verification',action:'View evidence standards'}
];
export default function HeroStage(){
 const [active,setActive]=useState<View>('identify');
 const view=views.find(x=>x.id===active)!;
 return <div className={'v6-stage v6-stage-'+active} aria-label="Explore the CREQOR research process">
  <div className="v6-stage-bar"><span><i/> THE RESEARCH LENS</span><span>CREQOR / {view.index}</span></div>
  <div className="v6-stage-art" aria-hidden="true">
   <div className="v6-art-grid"/>
   <svg className="v6-art-svg" viewBox="0 0 560 415" preserveAspectRatio="xMidYMid meet" role="img">
    <defs>
      <linearGradient id="v6-fill" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stopColor="#c2fbd7" stopOpacity=".34"/><stop offset="100%" stopColor="#64b99c" stopOpacity=".035"/></linearGradient>
      <linearGradient id="v6-edge" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stopColor="#c8ffe0" stopOpacity=".8"/><stop offset="100%" stopColor="#75d0ae" stopOpacity=".15"/></linearGradient>
      <radialGradient id="v6-halo"><stop offset="0%" stopColor="#7df5b5" stopOpacity=".22"/><stop offset="100%" stopColor="#74ddad" stopOpacity="0"/></radialGradient>
    </defs>
    <ellipse cx="288" cy="206" rx="223" ry="178" fill="url(#v6-halo)"/>
    <g stroke="#97dfb4" strokeOpacity=".16" fill="none">
      <circle cx="280" cy="205" r="168"/><circle cx="280" cy="205" r="133"/>
      <ellipse cx="280" cy="205" rx="220" ry="75" transform="rotate(-28 280 205)"/>
      <path d="M280 12V397M28 205H532" strokeDasharray="3 8"/>
    </g>
    <g className="v6-orbit-lines" stroke="url(#v6-edge)" fill="none" strokeWidth="1.1">
      <path d="M121 249 279 341 440 246 281 154Z"/>
      <path d="M121 209 279 301 440 206 281 114Z"/>
      <path d="M121 169 279 261 440 166 281 74Z"/>
      <path d="M121 169v80M279 261v80M440 166v80M281 74v80"/>
    </g>
    <g className="v6-layer v6-layer-one">
      <path d="M121 169 281 74 440 166 279 261Z" fill="url(#v6-fill)" stroke="url(#v6-edge)"/>
      <path d="M142 169 281 86 419 166 279 248Z" fill="none" stroke="#d1ffe2" strokeOpacity=".23"/>
      <path d="M196 166 281 116 362 163 279 214Z" fill="none" stroke="#a5e8c1" strokeOpacity=".4"/>
      <circle cx="280" cy="166" r="11" fill="#caffdd" opacity=".92"/>
      <circle cx="280" cy="166" r="21" fill="none" stroke="#dcffe9" strokeOpacity=".45"/>
    </g>
    <g className="v6-layer v6-layer-two">
      <path d="M121 209 281 114 440 206 279 301Z" fill="url(#v6-fill)" fillOpacity=".9" stroke="url(#v6-edge)"/>
      <path d="M174 211 280 149 387 210 280 272Z" fill="none" stroke="#e1ffe9" strokeOpacity=".4"/>
      <path d="M212 211 280 171 351 210 280 250Z" fill="none" stroke="#8df4b5" strokeOpacity=".45"/>
      <circle cx="280" cy="209" r="9" fill="#c6ffe0"/>
    </g>
    <g className="v6-layer v6-layer-three">
      <path d="M121 249 281 154 440 246 279 341Z" fill="url(#v6-fill)" stroke="url(#v6-edge)"/>
      <path d="M181 248 281 187 380 248 281 308Z" fill="none" stroke="#d9ffe5" strokeOpacity=".3"/>
      <circle cx="281" cy="249" r="10" fill="#b4f5ca"/>
    </g>
    <g stroke="#d3ffe0" strokeOpacity=".58" fill="none"><path d="M120 168 71 140 35 140"/><path d="M438 205 478 182 527 182"/><path d="M281 339v36h65"/></g>
    <g fill="#d5ffe3"><circle cx="35" cy="140" r="3"/><circle cx="527" cy="182" r="3"/><circle cx="346" cy="375" r="3"/></g>
   </svg>
   <span className="v6-art-index v6-index-a">01 / IDENTITY</span>
   <span className="v6-art-index v6-index-b">02 / VALUATION</span>
   <span className="v6-art-index v6-index-c">03 / EVIDENCE</span>
  </div>
  <div className="v6-stage-story">
   <span>{view.eyebrow}</span>
   <h2>{view.title}</h2>
   <p>{view.detail}</p>
   <Link href={view.href}>{view.action} <span aria-hidden="true">↗</span></Link>
  </div>
  <div className="v6-stage-tabs" role="tablist" aria-label="Explore the research process">
   {views.map(v=><button type="button" key={v.id} role="tab" aria-selected={active===v.id} className={active===v.id?'active':''} onClick={()=>setActive(v.id)}><span>{v.index}</span>{v.label}</button>)}
  </div>
 </div>;
}
