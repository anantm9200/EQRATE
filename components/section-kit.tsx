import Link from 'next/link';
import type {ReactNode} from 'react';

export type Feature={n?:string;eyebrow?:string;title:string;description:string;tag?:string;href?:string;};
export type Step={number?:string;title:string;description:string;foot?:string};
export type Question={question:string;answer:string};
export type RouteLink={href:string;label:string;description:string};

export function EditorialIntro({eyebrow,title,description,light=false}:{
 eyebrow:string;title:string;description?:string;light?:boolean
}){
 return <div className={'cx-intro'+(light?' cx-intro-light':'')}>
  <div className="cx-kicker"><span className="cx-kicker-dot"/>{eyebrow}</div>
  <div className="cx-intro-row"><h2>{title}</h2>{description&&<p>{description}</p>}</div>
 </div>;
}
export function FeatureGallery({eyebrow,title,description,items,dark=false,cols=3}:{
 eyebrow:string;title:string;description?:string;items:Feature[];dark?:boolean;cols?:2|3|4
}){
 return <section className={'cx-section cx-gallery'+(dark?' cx-section-dark':'')}>
  <EditorialIntro eyebrow={eyebrow} title={title} description={description} light={dark}/>
  <div className={'cx-gallery-grid cx-cols-'+cols}>
   {items.map((item,i)=>{
    const body=<><div className="cx-card-meta"><span>{item.eyebrow||item.n||String(i+1).padStart(2,'0')}</span><span aria-hidden="true">{item.href?'↗':'◇'}</span></div>
     <div className={'cx-card-symbol cx-symbol-'+(i%5)} aria-hidden="true"><span>{['✳','⌁','◎','◈','↗'][i%5]}</span><i/><i/></div>
     <div className="cx-card-bottom"><h3>{item.title}</h3><p>{item.description}</p>{item.tag&&<span className="cx-card-tag">{item.tag}</span>}</div></>;
    return item.href?<Link className="cx-card" key={item.title} href={item.href}>{body}</Link>:<article className="cx-card" key={item.title}>{body}</article>;
   })}
  </div>
 </section>;
}
export function ProcessTimeline({eyebrow,title,description,steps,dark=false}:{
 eyebrow:string;title:string;description?:string;steps:Step[];dark?:boolean
}){
 return <section className={'cx-section cx-process'+(dark?' cx-section-dark':'')}>
  <EditorialIntro eyebrow={eyebrow} title={title} description={description} light={dark}/>
  <ol className="cx-timeline">{steps.map((step,i)=><li key={step.title}>
    <div className="cx-timeline-index"><span>{step.number||String(i+1).padStart(2,'0')}</span><i/></div>
    <h3>{step.title}</h3><p>{step.description}</p>{step.foot&&<small>{step.foot}</small>}
  </li>)}</ol>
 </section>;
}
export function DetailSplit({eyebrow,title,description,points,visual='evidence',dark=false,href,linkLabel}:{
 eyebrow:string;title:string;description:string;points:{title:string;description:string}[];visual?:'evidence'|'valuation'|'coverage'|'intelligence'|'comparison';dark?:boolean;href?:string;linkLabel?:string
}){
 return <section className={'cx-section cx-split'+(dark?' cx-section-dark':'')}>
  <div className="cx-split-copy">
   <div className="cx-kicker"><span className="cx-kicker-dot"/>{eyebrow}</div>
   <h2>{title}</h2><p className="cx-split-lead">{description}</p>
   <div className="cx-split-points">{points.map((p,i)=><div className="cx-point" key={p.title}><span>{String(i+1).padStart(2,'0')}</span><div><h3>{p.title}</h3><p>{p.description}</p></div></div>)}</div>
   {href&&<Link className="cx-inline-link" href={href}>{linkLabel||'Explore further'} <span>↗</span></Link>}
  </div>
  <div className={'cx-diagram cx-diagram-'+visual} aria-label={'Illustrative '+visual+' workflow'} role="img">
    <div className="cx-diagram-grid"/>
    <div className="cx-diagram-top"><span>CREQOR / RESEARCH MODEL</span><span>ARCHITECTURE VIEW</span></div>
    <div className="cx-diagram-orbit one"/><div className="cx-diagram-orbit two"/>
    <div className="cx-diagram-center"><span>◈</span><strong>{visual==='valuation'?'MODEL':visual==='coverage'?'ENTITY':visual==='comparison'?'PEERS':visual==='intelligence'?'SIGNAL':'PROOF'}</strong><small>EXPLAINABLE OUTPUT</small></div>
    <div className="cx-diagram-label label-a">01 / INPUT</div><div className="cx-diagram-label label-b">02 / REVIEW</div><div className="cx-diagram-label label-c">03 / RESULT</div>
    <div className="cx-diagram-foot"><span>NO UNSOURCED OUTPUT</span><span className="cx-diagram-dot"/></div>
  </div>
 </section>;
}
export function ComparisonTable({eyebrow,title,description,headers,rows}:{
 eyebrow:string;title:string;description?:string;headers:[string,string,string];rows:{metric:string;a:string;b:string}[]
}){
 return <section className="cx-section cx-table-section">
  <EditorialIntro eyebrow={eyebrow} title={title} description={description}/>
  <div className="cx-table-scroll"><table className="cx-table"><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.metric}><th scope="row">{r.metric}</th><td>{r.a}</td><td>{r.b}</td></tr>)}</tbody></table></div>
 </section>;
}
export function QuestionSection({eyebrow='USEFUL QUESTIONS',title,description,questions}:{
 eyebrow?:string;title:string;description?:string;questions:Question[]
}){
 return <section className="cx-section cx-questions"><EditorialIntro eyebrow={eyebrow} title={title} description={description}/>
  <div className="cx-question-list">{questions.map((q,i)=><details key={q.question}>
    <summary><span className="cx-faq-index">{String(i+1).padStart(2,'0')}</span><span>{q.question}</span><span className="cx-faq-toggle" aria-hidden="true">+</span></summary>
    <p>{q.answer}</p></details>)}</div>
 </section>;
}
export function RouteTiles({eyebrow='CONTINUE YOUR RESEARCH',title='Where to next?',items}:{
 eyebrow?:string;title?:string;items:RouteLink[]
}){
 return <section className="cx-section cx-links"><EditorialIntro eyebrow={eyebrow} title={title}/>
  <div className="cx-link-grid">{items.map((item,i)=><Link href={item.href} key={item.href} className="cx-route"><span className="cx-route-n">{String(i+1).padStart(2,'0')}</span><span className="cx-route-label"><strong>{item.label}</strong><small>{item.description}</small></span><span className="cx-route-arrow" aria-hidden="true">↗</span></Link>)}</div>
 </section>;
}
export function StatementBand({eyebrow,statement,description,href,label}:{
 eyebrow:string;statement:string;description:string;href?:string;label?:string
}){
 return <section className="cx-statement"><div><span className="cx-kicker"><span className="cx-kicker-dot"/>{eyebrow}</span><h2>{statement}</h2></div><div><p>{description}</p>{href&&<Link href={href} className="cx-inline-link">{label||'Explore the methodology'} <span>↗</span></Link>}</div><span className="cx-statement-watermark" aria-hidden="true">◈</span></section>;
}
export function StatusOverview({eyebrow,title,description,items}:{
 eyebrow:string;title:string;description?:string;items:{feature:string;status:'Available'|'Configured separately'|'Planned';detail:string}[]
}){
 return <section className="cx-section cx-status"><EditorialIntro eyebrow={eyebrow} title={title} description={description}/>
  <div className="cx-status-list">{items.map(item=><div className="cx-status-row" key={item.feature}>
   <div><h3>{item.feature}</h3><p>{item.detail}</p></div><span className={'cx-status-tag cx-status-'+item.status.replace(/ /g,'-').toLowerCase()}>{item.status}</span>
  </div>)}</div></section>;
}
export function SectionSpacer({children}: {children:ReactNode}) {return <div className="cx-inline-body">{children}</div>}
