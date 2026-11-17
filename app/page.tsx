import Link from 'next/link';
import QuickValuation from '@/components/quick-valuation';

const jobs=[
 {n:'01',title:'Investors',headline:'An issuer worth understanding.',text:'Inspect the correct legal entity, source its financial records and challenge the assumptions behind its value.',href:'/explore',action:'Find the issuer',icon:'⌕'},
 {n:'02',title:'Founders & advisers',headline:'A private business worth defending.',text:'Estimate equity value using cash flows, transaction evidence, peer multiples and documented assumptions.',href:'/workbench',action:'Build an assessment',icon:'◇'},
 {n:'03',title:'Research teams',headline:'A model somebody can audit.',text:'Save analysis, maintain evidence references and export reproducible draft assessment reports.',href:'/compare',action:'Compare the evidence',icon:'⌁'}
];
const steps=[
 {n:'01',tag:'IDENTIFY',head:'Know the exact entity',body:'Legal name, market, security identifier and reporting currency.'},
 {n:'02',tag:'DOCUMENT',head:'Record the sources',body:'Source URL, financial claim, document date and review limitations.'},
 {n:'03',tag:'CALCULATE',head:'Make the value explainable',body:'Six deterministic valuation methods, sensitivity and assumptions.'},
 {n:'04',tag:'DELIVER',head:'Take the report with you',body:'Save locally, export data or print an audit-ready draft.'}
];
export const metadata={title:'Company intelligence and valuation',description:'CREQOR helps analysts value listed and unlisted companies with transparent financial methods and traceable evidence.'};
export default function Home(){return <>
 <section className="command-hero" aria-labelledby="command-title">
  <div className="command-backdrop" aria-hidden="true"><i/><i/><i/></div>
  <div className="command-hero-main">
   <div className="command-hero-copy">
    <div className="command-eyebrow"><span className="command-signal"/> CREQOR / FINANCIAL INTELLIGENCE <span className="command-eyebrow-line"/></div>
    <h1 id="command-title">Value the business.<br/><em>Show your work.</em></h1>
    <p className="command-lead">Listed or private. Move from financial assumptions to explainable calculations, documented evidence and an assessment you can actually use.</p>
    <div className="command-hero-actions">
     <Link className="command-main-cta" href="/workbench">Start a company assessment <span>↗</span></Link>
     <Link className="command-outline-cta" href="/explore">Explore companies <span>↗</span></Link>
    </div>
    <div className="command-credibility"><div><strong>06</strong><span>Valuation methods</span></div><div><strong>03</strong><span>Export formats</span></div><div><strong>01</strong><span>Evidence register</span></div></div>
    <p className="command-footnote">NO UNSOURCED PRICES · NO INVENTED RATINGS</p>
   </div>
   <div className="command-hero-utility"><QuickValuation/></div>
  </div>
  <div className="command-bottom"><span><span className="command-signal"/> INDEPENDENT THINKING. TRACEABLE NUMBERS.</span><Link href="#for-whom">EXPLORE THE PLATFORM ↓</Link></div>
 </section>
 <nav className="command-routebar" aria-label="Direct access to CREQOR tools">
  <Link href="/workbench"><span>START HERE</span><strong>Company workbench</strong><i>↗</i></Link>
  <Link href="/lab"><span>MODEL</span><strong>DCF laboratory</strong><i>↗</i></Link>
  <Link href="/compare"><span>COMPARE</span><strong>Peer research</strong><i>↗</i></Link>
  <Link href="/verification"><span>TRUST</span><strong>Evidence standards</strong><i>↗</i></Link>
 </nav>
 <section className="command-section command-jobs" id="for-whom">
  <div className="command-intro"><div><span className="command-mini">BUILT FOR DECISION MAKERS</span><h2>Different questions.<br/>One serious workspace.</h2></div><p>A founder, analyst and investor need different answers. CREQOR puts the tools first and the explanation next.</p></div>
  <div className="command-jobs-grid">{jobs.map(j=><Link key={j.n} href={j.href} className="command-job">
    <div className="command-job-top"><span>{j.n} / {j.title.toUpperCase()}</span><b>↗</b></div>
    <div className="command-job-symbol" aria-hidden="true">{j.icon}<i/><i/></div>
    <div className="command-job-text"><h3>{j.headline}</h3><p>{j.text}</p><span>{j.action} <b>↗</b></span></div>
  </Link>)}</div>
 </section>
 <section className="command-section command-method">
  <div className="command-method-intro"><span className="command-mini">THE RESEARCH LOOP</span><h2>More evidence.<br/><em>Less hand-waving.</em></h2><p>Every important number should be traceable: a legal entity, specific financial inputs, a reproducible calculation and a source you can inspect.</p><Link href="/methodology">See our methodology ↗</Link></div>
  <div className="command-method-flow">{steps.map(s=><article key={s.n} className="command-step"><div><span>{s.n}</span><small>{s.tag}</small></div><h3>{s.head}</h3><p>{s.body}</p></article>)}</div>
 </section>
 <section className="command-section command-markets">
  <div className="command-intro"><div><span className="command-mini">LISTED ≠ UNLISTED</span><h2>Two markets.<br/>Different definitions.</h2></div><p>Observed share prices and estimated business values are not interchangeable. The distinction stays visible in every model.</p></div>
  <div className="command-market-grid">
   <article className="command-market-card"><div className="command-market-top"><span>01 / LISTED</span><span>PUBLIC EQUITY</span></div><h3>Market capitalisation</h3><p>Applicable shares × dated market price. We can calculate it from entered figures; live licensed quotes are not yet connected.</p><div className="command-formula"><small>CALCULATION</small><strong>Price × Shares</strong></div><Link href="/workbench">Calculate market cap ↗</Link></article>
   <article className="command-market-card private"><div className="command-market-top"><span>02 / UNLISTED</span><span>PRIVATE EQUITY</span></div><h3>Estimated equity value</h3><p>DCF, comparables, net assets, funding and stake transactions produce estimates that depend on source quality.</p><div className="command-formula"><small>VALUATION</small><strong>Models + Evidence</strong></div><Link href="/workbench">Build an equity estimate ↗</Link></article>
  </div>
 </section>
 <section className="command-section command-availability">
  <div><span className="command-mini">PRODUCT READINESS</span><h2>Functional where it counts.<br/><em>Clear where it isn't.</em></h2><p>Calculations, browser-saved drafts, source registers and exports work without market-data subscriptions. We don't claim that the SEC connection, global prices, DGX inference or regulated ratings are already running.</p></div>
  <div className="command-status-list">
   <div><span className="command-live"/> <strong>Valuations, draft reports, local save</strong><small>AVAILABLE</small></div>
   <div><span className="command-muted-dot"/> <strong>Official US issuer records</strong><small>CONFIGURATION REQUIRED</small></div>
   <div><span className="command-muted-dot"/> <strong>Private DGX analyst</strong><small>CONFIGURATION REQUIRED</small></div>
   <div><span className="command-muted-dot"/> <strong>Global prices & published ratings</strong><small>NOT YET CONNECTED</small></div>
  </div>
 </section>
 <section className="command-final"><div><span className="command-mini">START WITH THE WORK</span><h2>Stop guessing.<br/><em>Start investigating.</em></h2><p>Use the assessment workspace, question every assumption and take your research with you.</p></div><Link href="/workbench" className="command-main-cta">Open the workbench ↗</Link></section>
 </>;}
