import Link from 'next/link';
import Orbit from '@/components/orbit';
import CompanySearch from '@/components/search';
export default function Home(){
 const tools=[
  {number:'01 / DISCOVER',title:'Know the company.',copy:'Resolve entities, identifiers and corporate relationships before drawing conclusions.',url:'/explore',art:'orbit'},
  {number:'02 / VALUE',title:'Make numbers explainable.',copy:'Model valuation assumptions and see exactly where each estimate comes from.',url:'/lab',art:'plot'},
  {number:'03 / QUESTION',title:'Look beyond the headline.',copy:'Private AI research with evidence boundaries and explicit uncertainty.',url:'/analyst',art:'bars'}
 ];
 return <>
 <section className="hero"><div className="hero-layout">
   <div className="hero-copy"><div className="pill"><span className="status-dot"/> THE NEXT STANDARD IN COMPANY INTELLIGENCE</div>
   <h1>Every company<br/>has a story.<br/><em>Find the truth in it.</em></h1>
   <p className="hero-subcopy">Discover. Verify. Value. A clearer way to understand what a business is worth — and why.</p>
   <div className="hero-search-wrap"><CompanySearch/></div>
   <div className="hero-cta"><Link className="text-link" href="/lab">Enter the valuation lab <span>↗</span></Link><Link className="ghost-link" href="/methodology">How CREQOR works ↗</Link></div>
   </div><Orbit/></div><div className="hero-floor"><span>EVIDENCE FIRST</span><span>MODELS, NOT GUESSWORK</span><span>INDEPENDENT ANALYSIS</span></div>
 </section>
 <section className="feature-strip" aria-label="Our principles"><div><span>01 / IDENTIFY</span><strong>One company. One identity.</strong></div><div><span>02 / VALIDATE</span><strong>Sources you can inspect.</strong></div><div><span>03 / VALUE</span><strong>Calculations you can challenge.</strong></div><div><span>04 / EXPLAIN</span><strong>Intelligence with context.</strong></div></section>
 <section className="section-pad"><div className="section-heading"><div><span className="eyebrow muted">AN INTELLIGENCE WORKSPACE</span><h2>Go deeper.<br/><em>Without the noise.</em></h2></div><p className="section-lead">A focused research environment built to turn complex financial questions into clear, traceable analysis.</p></div><div className="explore-grid">
 {tools.map(t=><Link href={t.url} key={t.title} className={'feature-card '+(t.art==='orbit'?'primary':'')}><span className="card-index">{t.number}</span><span className="card-arrow">↗</span>{t.art==='orbit'&&<div className="card-art"/>}{t.art==='plot'&&<svg className="sparkline" viewBox="0 0 350 130" fill="none"><path d="M0 105 42 80 80 90 122 54 165 64 213 40 257 48 290 22 350 3" stroke="currentColor" strokeWidth="2"/><path d="M0 105 42 80 80 90 122 54 165 64 213 40 257 48 290 22 350 3v130H0Z" fill="currentColor" fillOpacity=".08"/></svg>}{t.art==='bars'&&<div className="mini-bars"><i/><i/><i/><i/><i/><i/></div>}<h3>{t.title}</h3><p>{t.copy}</p></Link>)}
 </div></section>
 <section className="section-pad trust-section"><div className="trust-heading"><div><span className="eyebrow" style={{color:'#91dca9'}}>BUILT ON WHAT MATTERS</span><h2>Trust isn't a badge.<br/><em>It's a trail of evidence.</em></h2></div><p className="section-lead">The strongest number is one you can reproduce. Every method must withstand a second look.</p></div>
 <div className="trust-grid"><div className="trust-tile"><span>01 / PROVENANCE</span><div className="trust-graphic">⌁</div><h3>Trace the source.</h3><p>Distinguish official filings, third-party sources and reported estimates.</p></div><div className="trust-tile"><span>02 / TRANSPARENCY</span><div className="trust-graphic two">◇</div><h3>See the assumptions.</h3><p>Explore the model, inputs, timing and sensitivity behind a valuation.</p></div><div className="trust-tile"><span>03 / INDEPENDENCE</span><div className="trust-graphic three">✓</div><h3>Question the result.</h3><p>Separate verified facts, model output and AI interpretations.</p></div></div>
 <Link className="method-link" href="/methodology">Explore our methodology <span>↗</span></Link>
 </section>
 <section className="section-pad" style={{background:'#eaf5ec'}}><div className="section-heading"><div><span className="eyebrow muted">NEXT-GENERATION RESEARCH</span><h2>Powered by intelligence.<br/><em>Grounded in evidence.</em></h2></div><p className="section-lead">CREQOR's private research gateway is designed for the DGX, while financial calculations remain deterministic and independently testable.</p></div>
 <div className="content-grid"><Link className="panel" href="/analyst"><span className="micro-label">PRIVATE INFERENCE</span><div className="hero-viz"><span>✳</span></div><h3 style={{marginTop:25}}>Ask a harder question. ↗</h3><p>Surface contradictions, research gaps and competing interpretations.</p></Link><Link className="panel" href="/lab"><span className="micro-label">VALUATION ENGINE</span><div className="hero-viz"><svg viewBox="0 0 350 160" width="80%" aria-hidden="true"><path d="M0 130 80 115 130 125 180 82 220 90 270 39 350 15" fill="none" stroke="#b9f9c7" strokeWidth="3"/><circle cx="270" cy="39" r="5" fill="#b9f9c7"/></svg></div><h3 style={{marginTop:25}}>Move the assumptions. ↗</h3><p>Study how changing financial inputs changes enterprise and equity value.</p></Link></div></section>
 </>;
}