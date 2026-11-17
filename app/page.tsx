import Link from 'next/link';
import HeroStage from '@/components/hero-stage';
import QuickValuation from '@/components/quick-valuation';
import GlobalCompanySearch from '@/components/global-company-search';

const paths=[
 {n:'01',title:'Explore',headline:'Find the company behind the name.',text:'Search global legal-entity reference records and start with the right identity, not a guessed ticker.',href:'/explore',action:'Discover companies',icon:'◎'},
 {n:'02',title:'Model',headline:'Build a value you can explain.',text:'Test six valuation approaches, compare scenarios and see the assumptions driving each result.',href:'/workbench',action:'Open the workbench',icon:'⌁'},
 {n:'03',title:'Review',headline:'Keep the proof close to the number.',text:'Organise sources, review missing evidence and manage research across multiple companies.',href:'/desk',action:'Go to research desk',icon:'◇'}
];
const steps=[
 {n:'01',tag:'IDENTIFY',head:'Find the exact entity',body:'Legal name, jurisdiction, identifiers and reporting context.'},
 {n:'02',tag:'MODEL',head:'Choose the right lens',body:'Cash flows, multiples, assets, transactions and funding.'},
 {n:'03',tag:'STRESS TEST',head:'Challenge your answer',body:'Scenario assumptions, sensitivity and disagreement between methods.'},
 {n:'04',tag:'DOCUMENT',head:'Keep an evidence trail',body:'Dated sources, review findings and an exportable research draft.'}
];
export const metadata={
 title:'Research the company behind the number',
 description:'CREQOR is a financial research workspace for listed and private companies. Discover legal entities, build explainable valuations, test assumptions and document the evidence.'
};
export default function Home(){return <>
 <section className="command-hero v6-hero" aria-labelledby="command-title">
  <div className="command-backdrop v6-hero-backdrop" aria-hidden="true"><i/><i/><i/></div>
  <div className="v6-hero-layout">
   <div className="command-hero-copy v6-hero-copy">
    <div className="v6-kicker"><span className="v6-kicker-dot"/> CREQOR <span className="v6-kicker-divider"/> FINANCIAL INTELLIGENCE</div>
    <h1 id="command-title">Clarity, beyond<br/>the <em>number.</em></h1>
    <p className="v6-lead">Research the company. Test the valuation. Keep the evidence in view. One thoughtful workspace for listed and private markets.</p>
    <div className="command-hero-actions v6-hero-actions">
      <Link className="v6-primary-cta" href="/workbench">Start a company assessment <span aria-hidden="true">↗</span></Link>
      <Link className="v6-secondary-cta" href="/explore">Explore companies <span aria-hidden="true">↗</span></Link>
    </div>
    <div className="v6-hero-bottom-line"><span>COMPANY IDENTITIES</span><i/><span>VALUATION MODELS</span><i/><span>EVIDENCE</span></div>
   </div>
   <div className="v6-hero-visual"><HeroStage/></div>
  </div>
  <div className="command-bottom v6-hero-footer"><span><span className="v6-tiny-dot"/> INDEPENDENT RESEARCH · TRANSPARENT METHODS</span><Link href="#tools">DISCOVER THE TOOLS <span aria-hidden="true">↓</span></Link><span className="v6-hero-counter">01 / 05</span></div>
 </section>

 <section className="v6-start" id="tools">
  <div className="v6-section-intro">
   <div><span className="v6-overline">THE WORK STARTS HERE</span><h2>Less noise.<br/><em>More understanding.</em></h2></div>
   <p>A real research platform should make it easier to ask better questions. Start with the legal entity, or go straight into a transparent valuation model.</p>
  </div>
  <div className="v6-tool-grid">
   <div className="v6-find-panel">
    <div className="v6-find-head"><span>01 / IDENTIFY</span><strong>Company discovery</strong></div>
    <h3>Find the right entity.</h3>
    <p>Search global Legal Entity Identifier records. Company registration details are identity references, not audited financials or live market prices.</p>
    <GlobalCompanySearch/>
    <div className="v6-find-divider"/>
    <div className="v6-find-steps">
     <div><span>01</span><p>Resolve the name and jurisdiction</p></div>
     <div><span>02</span><p>Record the actual source</p></div>
     <div><span>03</span><p>Bring identity into the assessment</p></div>
    </div>
    <Link className="v6-text-link" href="/explore">Open global company explorer <span aria-hidden="true">↗</span></Link>
   </div>
   <div className="v6-calc-panel"><QuickValuation/></div>
  </div>
  <div className="v6-tools-caption"><span>LIVE ARITHMETIC · USER-PROVIDED INPUTS</span><p>Calculations are reproducible. They are not independent financial opinions, verified share prices or investment recommendations.</p></div>
 </section>

 <nav className="command-routebar v6-routebar" aria-label="Direct access to CREQOR tools">
  <Link href="/explore"><span>DISCOVER</span><strong>Company explorer</strong><i>↗</i></Link>
  <Link href="/workbench"><span>ANALYSE</span><strong>Valuation workbench</strong><i>↗</i></Link>
  <Link href="/desk"><span>ORGANISE</span><strong>Research desk</strong><i>↗</i></Link>
  <Link href="/lab"><span>MODEL</span><strong>DCF laboratory</strong><i>↗</i></Link>
 </nav>

 <section className="command-section command-jobs v6-journeys" id="for-whom">
  <div className="command-intro v6-section-intro">
   <div><span className="v6-overline">A SERIOUS WAY TO INVESTIGATE</span><h2>One platform.<br/><em>Many ways to question.</em></h2></div>
   <p>For investors, founders and analysts, the goal isn't another dashboard. It's an answer you can take apart, understand and defend.</p>
  </div>
  <div className="command-jobs-grid v6-journey-grid">
   {paths.map((p)=><Link href={p.href} className="command-job v6-journey-card" key={p.n}>
    <div className="command-job-top"><span>{p.n} / {p.title.toUpperCase()}</span><b aria-hidden="true">↗</b></div>
    <div className="v6-journey-art" aria-hidden="true"><span>{p.icon}</span><i/><i/></div>
    <div className="command-job-text"><h3>{p.headline}</h3><p>{p.text}</p><span>{p.action} <b aria-hidden="true">↗</b></span></div>
   </Link>)}
  </div>
 </section>

 <section className="command-section command-method v6-method">
  <div className="command-method-intro"><span className="v6-overline">FROM FACT TO DECISION</span><h2>Every conclusion<br/><em>has a trail.</em></h2><p>CREQOR keeps the distinction between evidence, assumption and calculation visible. That makes research easier to challenge—and improve.</p><Link href="/methodology">Explore our methodology <span aria-hidden="true">↗</span></Link></div>
  <div className="command-method-flow">{steps.map(s=><article key={s.n} className="command-step"><div><span>{s.n}</span><small>{s.tag}</small></div><h3>{s.head}</h3><p>{s.body}</p></article>)}</div>
 </section>

 <section className="command-section command-markets v6-markets">
  <div className="command-intro v6-section-intro"><div><span className="v6-overline">TWO KINDS OF VALUE</span><h2>Listed or private.<br/><em>Different questions.</em></h2></div><p>A market capitalisation is not the same thing as a private-company valuation estimate. CREQOR treats them separately, by design.</p></div>
  <div className="command-market-grid">
   <article className="command-market-card"><div className="command-market-top"><span>01 / PUBLIC MARKETS</span><span>LISTED</span></div><h3>What does the market price?</h3><p>Calculate equity market capitalisation from an entered share price and the applicable share count. No real-time exchange feed is implied.</p><div className="command-formula"><small>MARKET CAPITALISATION</small><strong>Price × Shares</strong></div><Link href="/workbench">Calculate market cap <span aria-hidden="true">↗</span></Link></article>
   <article className="command-market-card private"><div className="command-market-top"><span>02 / PRIVATE MARKETS</span><span>UNLISTED</span></div><h3>What could the business be worth?</h3><p>Model cash flows, peer multiples, adjusted net assets, transactions and funding cases. Track the assumptions and source gaps.</p><div className="command-formula"><small>MODELLED EQUITY VALUE</small><strong>Assumptions + Evidence</strong></div><Link href="/workbench">Build an estimate <span aria-hidden="true">↗</span></Link></article>
  </div>
 </section>

 <section className="command-section command-availability v6-readiness">
  <div><span className="v6-overline">RESEARCH WITH ITS LIMITS IN VIEW</span><h2>Credibility begins<br/><em>with clarity.</em></h2><p>We show what works, what depends on user-supplied data, and what needs external integration. A calculated number should never masquerade as a live price or a verified rating.</p><Link className="v6-text-link" href="/status">Check system readiness <span aria-hidden="true">↗</span></Link></div>
  <div className="command-status-list">
   <div><span className="command-live"/> <strong>Valuation and DCF sensitivity</strong><small>AVAILABLE</small></div>
   <div><span className="command-live"/> <strong>Evidence and research desk</strong><small>AVAILABLE LOCALLY</small></div>
   <div><span className="command-live"/> <strong>Global legal-entity lookup</strong><small>GLEIF SOURCE</small></div>
   <div><span className="command-muted-dot"/> <strong>Licensed prices, DGX and published ratings</strong><small>NOT CONNECTED</small></div>
  </div>
 </section>
 <section className="command-final v6-finale"><div><span className="v6-overline">CREQOR / START THE RESEARCH</span><h2>Know more.<br/><em>Assume less.</em></h2><p>Open a real assessment, question the inputs and keep your reasoning visible.</p></div><Link href="/workbench" className="v6-primary-cta">Open the workbench <span aria-hidden="true">↗</span></Link></section>
 </>;}