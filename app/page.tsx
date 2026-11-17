import Link from 'next/link';
import PlatformPreview from '@/components/platform-preview';

export const metadata={
 title:'Company intelligence, made clear',
 description:'Explore legal entities, model company valuations and document evidence with CREQOR. Built for transparent listed and private-company research.'
};

const journeys=[
 {number:'01',title:'Discover',headline:'Start with the right company.',copy:'Search legal entities and examine the identity behind a name before you study its value.',href:'/explore',action:'Explore companies',mark:'⌕'},
 {number:'02',title:'Value',headline:'See what drives the estimate.',copy:'Work with six valuation methods, test scenarios and see how assumptions change the outcome.',href:'/workbench',action:'Open the workbench',mark:'◈'},
 {number:'03',title:'Review',headline:'Keep the reasoning together.',copy:'Capture source references, revisit saved assessments and export work for a closer look.',href:'/desk',action:'Open the research desk',mark:'≋'}
];

export default function Home(){return <>
 <section className="ux-hero" aria-labelledby="ux-hero-title">
  <div className="fx-hero-atmosphere" aria-hidden="true"><span/><span/><span/></div>
  <div className="ux-hero-inner">
   <div className="ux-hero-copy">
    <span className="ux-eyebrow"><span className="ux-dot"/> CREQOR / COMPANY INTELLIGENCE</span>
    <h1 id="ux-hero-title">Know the company.<br/><em>Understand the value.</em></h1>
    <p>Find the business behind the name. Test the numbers behind the valuation. Keep the evidence behind every conclusion.</p>
    <div className="ux-hero-actions">
     <Link href="/explore" className="ux-button ux-button-primary">Explore companies <span aria-hidden="true">↗</span></Link>
     <Link href="/workbench" className="ux-button ux-button-secondary">Build a valuation <span aria-hidden="true">↗</span></Link>
    </div>
   </div>
   <PlatformPreview/>
   <div className="ux-hero-end"><span>DISCOVER <i/> MODEL <i/> DOCUMENT</span><a href="#workflows">EXPLORE THE PLATFORM <span aria-hidden="true">↓</span></a></div>
  </div>
 </section>

 <section className="ux-section ux-workflows" id="workflows" aria-labelledby="ux-workflows-title">
  <div className="ux-section-heading">
   <span className="ux-kicker">MADE FOR THE WAY YOU RESEARCH</span>
   <h2 id="ux-workflows-title">Clarity at every stage.</h2>
   <p>Three connected ways to move from a company name to a research decision.</p>
  </div>
  <div className="ux-workflow-grid">
   {journeys.map(item=><Link className="ux-workflow-card" href={item.href} key={item.number}>
    <div className="ux-card-header"><span>{item.number} / {item.title.toUpperCase()}</span><span className="ux-card-arrow" aria-hidden="true">↗</span></div>
    <div className="ux-card-art" aria-hidden="true"><span>{item.mark}</span><i/><i/></div>
    <div className="ux-card-body"><h3>{item.headline}</h3><p>{item.copy}</p><span className="ux-card-action">{item.action} <span aria-hidden="true">↗</span></span></div>
   </Link>)}
  </div>
 </section>

 <section className="ux-section ux-method" aria-labelledby="ux-method-title">
  <div className="ux-method-intro">
   <span className="ux-kicker">BUILT AROUND THE EVIDENCE</span>
   <h2 id="ux-method-title">A number means more<br/>when you can explain it.</h2>
   <p>CREQOR separates the company, the financial assumptions, the calculation and the supporting records. Each remains visible to the person reviewing the work.</p>
   <Link href="/methodology" className="ux-text-link">Explore the methodology <span aria-hidden="true">↗</span></Link>
  </div>
  <div className="ux-method-steps">
   <div><span>01</span><strong>Identify</strong><p>Know which legal entity and security you're researching.</p></div>
   <div><span>02</span><strong>Calculate</strong><p>Use transparent methods and inspect how each input affects the result.</p></div>
   <div><span>03</span><strong>Substantiate</strong><p>Keep dated documents, assumptions and unresolved questions together.</p></div>
   <div><span>04</span><strong>Export</strong><p>Produce a reviewable draft with source references and model limits.</p></div>
  </div>
 </section>

 <section className="ux-section ux-distinction" aria-labelledby="ux-distinction-title">
  <div className="ux-section-heading">
   <span className="ux-kicker">PRECISION MATTERS</span>
   <h2 id="ux-distinction-title">Two kinds of value.<br/>One important distinction.</h2>
   <p>A publicly traded market capitalisation and an estimated private-company equity value are different measures. We keep them that way.</p>
  </div>
  <div className="ux-distinction-grid">
   <article><div className="ux-card-header"><span>LISTED COMPANIES</span><span>01</span></div><h3>Market capitalisation</h3><p>Share price multiplied by applicable shares outstanding. It needs a dated, properly sourced quote and a matched share count.</p><div className="ux-equation"><span>Observed-price calculation</span><strong>Price × Shares</strong></div><Link href="/workbench" className="ux-text-link">Calculate from your inputs ↗</Link></article>
   <article><div className="ux-card-header"><span>PRIVATE COMPANIES</span><span>02</span></div><h3>Estimated equity value</h3><p>Build a reasoned estimate from cash flows, comparable businesses, assets or documented transactions—and show the assumptions.</p><div className="ux-equation"><span>Model-based estimate</span><strong>Methods + Evidence</strong></div><Link href="/workbench" className="ux-text-link">Model a private company ↗</Link></article>
  </div>
 </section>

 <section className="ux-section ux-integrity" aria-labelledby="ux-integrity-title">
  <div className="ux-integrity-copy">
   <span className="ux-kicker">TRANSPARENCY, BY DESIGN</span>
   <h2 id="ux-integrity-title">Useful intelligence.<br/>Without invented certainty.</h2>
   <p>Valuation calculations, local research drafts and reports are available today. Live global prices, independent published ratings and the private AI gateway require additional integrations.</p>
   <Link href="/status" className="ux-text-link">See what's connected <span aria-hidden="true">↗</span></Link>
  </div>
  <div className="ux-integrity-list">
   <div><span className="ux-status-dot is-live"/><strong>Valuation modelling and sensitivity</strong><small>AVAILABLE</small></div>
   <div><span className="ux-status-dot is-live"/><strong>Saved research drafts and exports</strong><small>AVAILABLE</small></div>
   <div><span className="ux-status-dot is-pending"/><strong>Licensed prices and private AI analysis</strong><small>NOT FULLY CONNECTED</small></div>
  </div>
 </section>
 </>;}
