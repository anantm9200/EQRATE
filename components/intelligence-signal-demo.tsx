'use client';
import {useState} from 'react';
import Link from 'next/link';

type Layer = {key:'identity'|'evidence'|'valuation';tab:string;eyebrow:string;title:string;description:string;steps:{label:string;detail:string}[];signal:string;context:string;route:string;action:string};
const layers:Layer[]=[
 {key:'identity',tab:'Entity identity',eyebrow:'01 / RESOLVE THE ENTITY',title:'A name is a starting point. Not a conclusion.',description:'The legal entity, jurisdiction and identifier must agree before financial records are attributed to a company.',
 steps:[{label:'Company name',detail:'Search input'},{label:'Legal identifier',detail:'Entity key'},{label:'Jurisdiction',detail:'Registry context'},{label:'Source reference',detail:'Review record'}],
 signal:'Identity cannot be verified from a similar name alone.',context:'CREQOR flags identity gaps instead of silently merging different businesses.',route:'/directory',action:'Explore company identities'},
 {key:'evidence',tab:'Evidence trail',eyebrow:'02 / TRACE THE CLAIM',title:'Every claim should lead somewhere.',description:'Sources are mapped to dated claims. Missing references, repeated URLs and stale records become visible investigation leads.',
 steps:[{label:'Financial claim',detail:'Analyst input'},{label:'Document URL',detail:'Recorded source'},{label:'Date & scope',detail:'Context check'},{label:'Open question',detail:'Review action'}],
 signal:'A recorded link is not the same as an authenticated document.',context:'The forensic engine distinguishes traceability from independent verification.',route:'/intelligence',action:'Open forensic intelligence'},
 {key:'valuation',tab:'Valuation logic',eyebrow:'03 / CHALLENGE THE MODEL',title:'The estimate is only as good as the assumptions.',description:'Different valuation methods are calculated separately. Where results diverge, the review workflow explains which assumptions to inspect.',
 steps:[{label:'Financial inputs',detail:'Reporting basis'},{label:'Model methods',detail:'DCF, multiples'},{label:'Value range',detail:'Method divergence'},{label:'Explainable output',detail:'Assumption review'}],
 signal:'A modelled equity value is not a live market quote.',context:'The platform shows calculations and caveats without inventing a confidence score.',route:'/workbench',action:'Inspect valuation methods'}
];
export default function IntelligenceSignalDemo(){
 const [active,setActive]=useState<Layer['key']>('identity');
 const selected=layers.find(layer=>layer.key===active)!;
 return <section className="signal-section" aria-labelledby="signal-title">
  <div className="signal-heading">
   <span className="signal-kicker"><span className="signal-kicker-dot" aria-hidden="true"/> THE INTELLIGENCE UNDERNEATH</span>
   <h2 id="signal-title">Beautiful on the surface.<br/><em>Precise underneath.</em></h2>
   <p>Not another black-box score. Follow how CREQOR turns a company question into an evidence-led investigation.</p>
  </div>
  <div className="signal-shell">
   <div className="signal-shell-head">
    <div className="signal-shell-brand"><span className="signal-shell-mark" aria-hidden="true">◈</span><div><strong>CREQOR / Signal path</strong><small>Interactive methodology illustration · not live company data</small></div></div>
    <span className="signal-system"><i aria-hidden="true"/> EXPLAINABLE BY DESIGN</span>
   </div>
   <div className="signal-tabs" role="tablist" aria-label="Explore CREQOR intelligence layers">
    {layers.map(layer=><button key={layer.key} type="button" role="tab" id={'signal-tab-'+layer.key} aria-controls="signal-layer-panel" aria-selected={active===layer.key} tabIndex={active===layer.key?0:-1} className={active===layer.key?'is-active':''} onClick={()=>setActive(layer.key)}
     onKeyDown={e=>{if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft'&&e.key!=='Home'&&e.key!=='End')return;e.preventDefault();const index=layers.findIndex(l=>l.key===active);const next=e.key==='Home'?0:e.key==='End'?layers.length-1:(index+(e.key==='ArrowRight'?1:-1)+layers.length)%layers.length;setActive(layers[next].key);document.getElementById('signal-tab-'+layers[next].key)?.focus();}}>{layer.tab}</button>)}
   </div>
   <div id="signal-layer-panel" className="signal-layer" role="tabpanel" aria-labelledby={'signal-tab-'+active} tabIndex={0}>
    <div className="signal-copy">
     <span className="signal-phase">{selected.eyebrow}</span>
     <h3>{selected.title}</h3><p>{selected.description}</p>
    </div>
    <div className="signal-graph" aria-label={selected.tab+' research workflow'}>
     <div className="signal-graph-grid" aria-hidden="true"/>
     <div className="signal-graph-line" aria-hidden="true"/>
     {selected.steps.map((step,index)=><div key={step.label} className={'signal-node'+(index===3?' signal-node-last':'')}>
       <span className="signal-node-index">{String(index+1).padStart(2,'0')}</span>
       <span className="signal-node-glyph" aria-hidden="true">{index===0?'⌕':index===1?'⋈':index===2?'◎':'✓'}</span>
       <strong>{step.label}</strong><small>{step.detail}</small>
      </div>)}
    </div>
    <div className="signal-bottom">
     <div className="signal-insight"><span className="signal-insight-icon" aria-hidden="true">↳</span><div><strong>{selected.signal}</strong><p>{selected.context}</p></div></div>
     <Link href={selected.route} className="signal-action">{selected.action}<span aria-hidden="true">↗</span></Link>
    </div>
   </div>
  </div>
  <p className="signal-note">The demonstration describes how the current research tools operate. It does not imply that external records have been independently authenticated.</p>
 </section>;
}
