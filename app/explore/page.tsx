import CompanySearch from '@/components/search';
import Link from 'next/link';
export const metadata={title:'Company explorer',description:'Find official company identities before assessing financial information.'};
export default function Explore(){return <>
 <section className="page-hero v2-page-hero">
  <div className="v2-page-topline"><span className="eyebrow">01 / COMPANY DISCOVERY</span><span>VERIFY THE ENTITY / THEN THE NUMBERS</span></div>
  <div className="v2-page-hero-grid">
   <div><h1>Every analysis begins<br/><em>with the right company.</em></h1><p>Resolve a company's official identity before drawing a conclusion. One issuer, one canonical starting point.</p></div>
   <div className="v2-page-art v2-explore-art" aria-hidden="true"><div className="v2-explore-art-node">◇</div><span className="v2-art-orbit o1"/><span className="v2-art-orbit o2"/><span className="v2-art-orbit o3"/><span className="v2-art-chip a">IDENTITY</span><span className="v2-art-chip b">SOURCE</span></div>
  </div>
 </section>
 <section className="body-wrap v2-explore-body">
  <div className="v2-explore-search-panel"><div className="v2-explore-search-head"><div><span className="eyebrow">OFFICIAL ISSUER DIRECTORY</span><h2>Find a company.</h2></div><span className="v2-registry-status">DATA SOURCE / US SEC</span></div><CompanySearch variant="full"/></div>
  <div className="v2-explore-steps"><article><span>01</span><h3>Resolve the name.</h3><p>Match a company to official CIK, ticker and exchange records.</p></article><article><span>02</span><h3>Inspect the filing.</h3><p>Open reported financial highlights with source dates and official links.</p></article><article><span>03</span><h3>Question the value.</h3><p>Develop an independent scenario instead of guessing a market cap.</p></article></div>
  <div className="v2-explore-bottom"><p>Coverage currently begins with SEC-recorded US companies. India, UAE and African registries need approved source integration. An unavailable metric is never silently represented as zero.</p><Link href="/compare">Compare two issuers <span>↗</span></Link></div>
 </section>
 </>}