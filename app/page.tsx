import Link from 'next/link';
import IntelligenceCanvas from '@/components/intelligence-canvas';
import ResearchJourney from '@/components/research-journey';
import MotionObserver from '@/components/motion-observer';

const jobs=[
 {n:'01',title:'Investors',headline:'An issuer worth understanding.',text:'Inspect the correct legal entity, source its financial records and challenge the assumptions behind its value.',href:'/explore',action:'Find the issuer',icon:'⌕'},
 {n:'02',title:'Founders & advisers',headline:'A private business worth defending.',text:'Estimate equity value using cash flows, transaction evidence, peer multiples and documented assumptions.',href:'/workbench',action:'Build an assessment',icon:'◇'},
 {n:'03',title:'Research teams',headline:'A model somebody can audit.',text:'Save analysis, maintain evidence references and export reproducible draft assessment reports.',href:'/desk',action:'Open the research desk',icon:'⌁'}
];
const steps=[
 {n:'01',tag:'IDENTIFY',head:'Know the exact entity',body:'Legal name, market, security identifier and reporting currency.'},
 {n:'02',tag:'DOCUMENT',head:'Record the sources',body:'Source URL, financial claim, document date and review limitations.'},
 {n:'03',tag:'CALCULATE',head:'Make the value explainable',body:'Six deterministic valuation methods, sensitivity and assumptions.'},
 {n:'04',tag:'DELIVER',head:'Take the report with you',body:'Save locally, export data or print an audit-ready draft.'}
];
export const metadata={title:'Company intelligence and valuation',description:'CREQOR helps analysts value listed and unlisted companies with transparent financial methods and traceable evidence.'};
export default function Home(){return <><MotionObserver/>
 <section className="sweet-hero" aria-labelledby="sweet-title">
  <div className="sweet-hero-halo" aria-hidden="true"/>
  <div className="sweet-hero-copy">
   <span className="sweet-eyebrow"><i/> A CLEARER VIEW OF COMPANY VALUE</span>
   <h1 id="sweet-title">See the whole story.<br/><em>Not just the number.</em></h1>
   <p>From first discovery to final valuation. Clear thinking, visible evidence, and every assumption within reach.</p>
   <div className="sweet-hero-actions"><Link className="sweet-primary" href="/explore">Discover companies <span>↗</span></Link><Link className="sweet-outline" href="/workbench">Open the workbench <span>↗</span></Link></div>
   <div className="sweet-hero-trust"><span>01 / FIND THE ENTITY</span><span>02 / TEST THE VALUE</span><span>03 / TRACE THE EVIDENCE</span></div>
  </div>
  <div className="sweet-showcase"><div className="sweet-showcase-label"><span>A DIFFERENT PERSPECTIVE</span><span>ANALYSIS, NOT A MARKET QUOTE</span></div><IntelligenceCanvas/></div>
  <Link className="sweet-scroll" href="#research-path">EXPLORE THE EXPERIENCE <span>↓</span></Link>
 </section>
 <section className="sweet-journey-section" id="research-path">
  <div className="sweet-section-head"><span className="sweet-kicker">YOUR RESEARCH, YOUR WAY</span><h2>Your next insight.<br/><em>One click away.</em></h2><p>Find the right company. Challenge the valuation. Keep the evidence close. Your research, beautifully connected.</p></div>
  <ResearchJourney/>
 </section>
 <section className="sweet-insight-section">
  <div className="sweet-section-head"><span className="sweet-kicker">FROM QUESTION TO EVIDENCE</span><h2>Clarity changes<br/><em>everything.</em></h2><p>Every important conclusion deserves a clear path back to the facts.</p></div>
  <div className="sweet-insight-grid">
   <article className="sweet-insight-card"><div className="sweet-insight-icon">⌕</div><span>01 / DISCOVERY</span><h3>Know exactly who you're looking at.</h3><p>Start with issuer identity and company records before you interpret financial data.</p><Link href="/explore">Explore company identities ↗</Link></article>
   <article className="sweet-insight-card"><div className="sweet-insight-icon">◈</div><span>02 / ANALYSIS</span><h3>Put assumptions under pressure.</h3><p>Compare deterministic valuation methods, scenarios and sensitivity—not just a headline estimate.</p><Link href="/workbench">Open valuation analysis ↗</Link></article>
   <article className="sweet-insight-card"><div className="sweet-insight-icon">≋</div><span>03 / EVIDENCE</span><h3>Make every claim traceable.</h3><p>Record dated source links, document limitations and export research for review.</p><Link href="/desk">Open your research desk ↗</Link></article>
  </div>
 </section>
  <nav className="command-routebar" aria-label="Direct access to CREQOR tools">
  <Link href="/workbench"><span>START HERE</span><strong>Company workbench</strong><i>↗</i></Link>
  <Link href="/lab"><span>MODEL</span><strong>DCF laboratory</strong><i>↗</i></Link>
  <Link href="/desk"><span>YOUR WORK</span><strong>Research desk</strong><i>↗</i></Link>
  <Link href="/verification"><span>TRUST</span><strong>Evidence standards</strong><i>↗</i></Link>
 </nav>
 <section className="command-section command-jobs" id="for-whom">
  <div className="command-intro sweet-centered-intro"><div><span className="command-mini">BUILT FOR DECISION MAKERS</span><h2>Made for the<br/>curious and decisive.</h2></div><p>The tools you need to ask better questions—and find answers worth trusting.</p></div>
  <div className="command-jobs-grid">{jobs.map(j=><Link key={j.n} href={j.href} className="command-job">
    <div className="command-job-top"><span>{j.n} / {j.title.toUpperCase()}</span><b>↗</b></div>
    <div className="command-job-symbol" aria-hidden="true">{j.icon}<i/><i/></div>
    <div className="command-job-text"><h3>{j.headline}</h3><p>{j.text}</p><span>{j.action} <b>↗</b></span></div>
  </Link>)}</div>
 </section>
 <section className="command-section command-method">
  <div className="command-method-intro sweet-method-intro"><span className="command-mini">THE RESEARCH LOOP</span><h2>Every assumption.<br/><em>Out in the open.</em></h2><p>Every important number should be traceable: a legal entity, specific financial inputs, a reproducible calculation and a source you can inspect.</p><Link href="/methodology">See our methodology ↗</Link></div>
  <div className="command-method-flow">{steps.map(s=><article key={s.n} className="command-step"><div><span>{s.n}</span><small>{s.tag}</small></div><h3>{s.head}</h3><p>{s.body}</p></article>)}</div>
 </section>
 <section className="command-section command-markets">
  <div className="command-intro sweet-centered-intro"><div><span className="command-mini">LISTED ≠ UNLISTED</span><h2>Two worlds.<br/>One clear distinction.</h2></div><p>Observed share prices and estimated business values are not interchangeable. The distinction stays visible in every model.</p></div>
  <div className="command-market-grid">
   <article className="command-market-card"><div className="command-market-top"><span>01 / LISTED</span><span>PUBLIC EQUITY</span></div><h3>Market capitalisation</h3><p>Applicable shares × dated market price. We can calculate it from entered figures; live licensed quotes are not yet connected.</p><div className="command-formula"><small>CALCULATION</small><strong>Price × Shares</strong></div><Link href="/workbench">Calculate market cap ↗</Link></article>
   <article className="command-market-card private"><div className="command-market-top"><span>02 / UNLISTED</span><span>PRIVATE EQUITY</span></div><h3>Estimated equity value</h3><p>DCF, comparables, net assets, funding and stake transactions produce estimates that depend on source quality.</p><div className="command-formula"><small>VALUATION</small><strong>Models + Evidence</strong></div><Link href="/workbench">Build an equity estimate ↗</Link></article>
  </div>
 </section>
 <section className="command-section command-availability">
  <div><span className="command-mini">PRODUCT READINESS</span><h2>Designed for real decisions.<br/><em>Honest about the limits.</em></h2><p>Calculations, browser-saved drafts, source registers and exports work without market-data subscriptions. We don't claim that the SEC connection, global prices, DGX inference or regulated ratings are already running.</p></div>
  <div className="command-status-list">
   <div><span className="command-live"/> <strong>Valuation cockpit, local research desk, exports</strong><small>AVAILABLE</small></div>
   <div><span className="command-muted-dot"/> <strong>Official US issuer records</strong><small>CONFIGURATION REQUIRED</small></div>
   <div><span className="command-muted-dot"/> <strong>Private DGX analyst</strong><small>CONFIGURATION REQUIRED</small></div>
   <div><span className="command-muted-dot"/> <strong>Global prices & published ratings</strong><small>NOT YET CONNECTED</small></div>
  </div>
 </section>
 <section className="command-final"><div><span className="command-mini">START WITH THE WORK</span><h2>Know more.<br/><em>Decide better.</em></h2><p>Use the assessment workspace, question every assumption and take your research with you.</p></div><Link href="/workbench" className="command-main-cta">Open the workbench ↗</Link></section>
 </>;}
