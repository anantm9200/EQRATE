'use client';
import Link from 'next/link';
import {useState} from 'react';
const paths=[
 {id:'discover',eyebrow:'01 / DISCOVER',title:'Find a company',subtitle:'Start with its identity.',description:'Search for a legal entity and begin with the right business, not a similar-sounding name.',href:'/explore',cta:'Open company explorer',glyph:'⌕',details:['Company identity','Legal entity records','Source context']},
 {id:'value',eyebrow:'02 / VALUE',title:'Understand its value',subtitle:'Explore what drives the number.',description:'Work through valuation methods, compare assumptions and see how the outcome changes.',href:'/workbench',cta:'Open valuation workbench',glyph:'◇',details:['Six valuation methods','Scenario analysis','Sensitivity testing']},
 {id:'research',eyebrow:'03 / ORGANISE',title:'Build a research case',subtitle:'Keep your reasoning together.',description:'Reopen saved assessments, compare drafts and export the work for further review.',href:'/desk',cta:'Open research desk',glyph:'≋',details:['Local saved drafts','Side-by-side comparison','Evidence references']}
] as const;
export default function ResearchJourney(){
 const [active,setActive]=useState<(typeof paths)[number]['id']>('discover');
 const current=paths.find(p=>p.id===active)!;
 return <div className="sweet-journey">
  <div className="sweet-journey-options" role="tablist" aria-label="Choose a research workflow">
   {paths.map(p=><button key={p.id} type="button" role="tab" id={'journey-tab-'+p.id} aria-controls="journey-panel" aria-selected={active===p.id} onClick={()=>setActive(p.id)} className={'sweet-journey-option'+(active===p.id?' is-active':'')}><span>{p.eyebrow}</span><strong>{p.title}</strong><i aria-hidden="true">{active===p.id?'↗':'→'}</i></button>)}
  </div>
  <div className="sweet-journey-detail" role="tabpanel" id="journey-panel" aria-labelledby={'journey-tab-'+current.id} key={current.id}>
   <div className="sweet-journey-orbit" aria-hidden="true"><div className="sweet-journey-orbit-outer"/><div className="sweet-journey-orbit-inner"/><span>{current.glyph}</span><small>CREQOR / {current.eyebrow}</small></div>
   <div className="sweet-journey-copy"><span className="sweet-kicker">{current.eyebrow}</span><h3>{current.subtitle}</h3><p>{current.description}</p><div className="sweet-journey-tags">{current.details.map(x=><span key={x}>{x}</span>)}</div><Link href={current.href}>{current.cta} <span>↗</span></Link></div>
  </div>
 </div>
}
