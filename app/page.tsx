import {HomeSections} from '@/components/sections-primary';
import Link from 'next/link';
import HomeHero from '@/components/home-hero';

const capabilities=[
 {number:'01',eyebrow:'DISCOVER',title:'Find the company, not just the name.',copy:'Resolve issuer identities, aliases and identifiers before assessing the financial story.',href:'/explore',visual:'identity'},
 {number:'02',eyebrow:'VALUE',title:'A number you can take apart.',copy:'Build scenarios, challenge growth assumptions and understand the enterprise-to-equity bridge.',href:'/lab',visual:'valuation'},
 {number:'03',eyebrow:'VERIFY',title:'Make evidence the advantage.',copy:'Separate official filings, company claims and model estimates—with clear limitations.',href:'/verification',visual:'proof'}
];
export default function Home(){
 return <>
  <HomeHero/>
  <section className="v2-principle-strip" aria-label="Product principles"><div><span>01 / SOURCE</span><strong>Know where it came from.</strong></div><div><span>02 / CALCULATE</span><strong>See how it was derived.</strong></div><div><span>03 / CHALLENGE</span><strong>Understand what could change.</strong></div></section>
  <section id="capabilities" className="v2-capabilities-section">
   <div className="v2-section-heading"><div><span className="eyebrow">AN INTEGRATED WORKSPACE</span><h2>From first search<br/><em>to better judgement.</em></h2></div><p>Three connected ways to see a business more clearly. Use the tools independently or follow the evidence from discovery through valuation.</p></div>
   <div className="v2-capability-grid">{capabilities.map(x=><Link href={x.href} key={x.number} className={'v2-capability v2-capability-'+x.visual}>
     <div className="v2-capability-top"><span>{x.number} / {x.eyebrow}</span><span className="v2-card-arrow">↗</span></div>
     {x.visual==='identity'?<div className="v2-card-viz v2-identity-viz"><div className="v2-viz-entity"><span className="v2-shape-logo">◇</span><span>ENTITY RESOLUTION<small>Registration / identifier / issuer</small></span><span>✓</span></div><div className="v2-viz-branches"><span/><span/><span/></div></div>:x.visual==='valuation'?<div className="v2-card-viz v2-valuation-viz"><div className="v2-viz-axis">VALUE / MODEL SCENARIOS</div><svg viewBox="0 0 330 118" aria-hidden="true"><path d="M0 94H330M0 50H330" stroke="#B3D1BD" strokeOpacity=".3" strokeDasharray="4 5"/><path d="M0 100 49 91 96 82 143 91 188 54 237 64 277 32 330 12" stroke="#79D5A0" strokeWidth="2.8" fill="none"/><path d="M0 100 49 91 96 82 143 91 188 54 237 64 277 32 330 12V118H0Z" fill="#79D5A0" fillOpacity=".1"/><circle cx="277" cy="32" r="4.5" fill="#B8FFCB"/></svg><div className="v2-viz-scenarios"><span>BEAR</span><span>BASE</span><span>BULL</span></div></div>:<div className="v2-card-viz v2-proof-viz"><div className="v2-proof-stack"><span className="v2-proof-paper first"/><span className="v2-proof-paper second"/><span className="v2-proof-paper third"><span>✓</span></span></div><span className="v2-proof-label">CLAIM → SOURCE → REVIEW</span></div>}
     <div className="v2-capability-copy"><h3>{x.title}</h3><p>{x.copy}</p></div>
   </Link>)}</div>
  </section>
  <section className="v2-evidence-section">
   <div className="v2-evidence-intro"><span className="eyebrow">THE CREQOR STANDARD</span><h2>Less noise.<br/><em>More knowing.</em></h2><p>Financial research should never ask you to trust an unexplained number. We put the evidence and assumptions where they belong: in view.</p><Link href="/methodology">Explore our research methodology <span>↗</span></Link></div>
   <div className="v2-evidence-right">
     <div className="v2-evidence-row"><span>01</span><div><h3>Official source before opinion</h3><p>Company identities and financial records come from identifiable, dated sources.</p></div><b>↗</b></div>
     <div className="v2-evidence-row"><span>02</span><div><h3>Deterministic valuation</h3><p>Models calculate the numbers; AI helps ask better questions about them.</p></div><b>↗</b></div>
     <div className="v2-evidence-row"><span>03</span><div><h3>Uncertainty is information</h3><p>Missing inputs and conflicting evidence are made visible, not disguised as certainty.</p></div><b>↗</b></div>
   </div>
  </section>
  <section className="v2-intelligence-cta"><div className="v2-cta-copy"><span className="eyebrow">PRIVATE INTELLIGENCE / DGX ARCHITECTURE</span><h2>Ask the harder question.<br/><em>Demand a clearer answer.</em></h2><p>Use the private analyst to interrogate financial assumptions and uncover missing evidence. The gateway is securely disabled until configured.</p><Link href="/analyst" className="v2-primary-cta">Enter AI analyst <span>↗</span></Link></div><div className="v2-cta-glyph" aria-hidden="true"><span>✳</span><i/><i/><i/></div></section>
 
 <HomeSections/>
 </>;
}