import Link from 'next/link';
import GlobalCompanySearch from '@/components/global-company-search';
export const metadata={title:'Global company discovery',description:'Search real global LEI legal entity reference records via GLEIF. Distinguish company identity from financial verification and valuation.'};
export default function Explore(){return <>
 <section className="lei-explore-hero">
  <div className="command-eyebrow"><span className="command-signal"/> GLOBAL ENTITY DISCOVERY / PUBLIC REFERENCE DATA</div>
  <div className="lei-explore-top"><div><h1>Find the company.<br/><em>Know the entity.</em></h1><p>Search global Legal Entity Identifier records by name. See the jurisdiction, LEI and registration status before drawing conclusions about a business.</p><div className="lei-explore-stats"><span>WORLDWIDE LEI DATA</span><i/> <span>NO API KEY REQUIRED</span><i/> <span>ORIGINAL SOURCE LINKS</span></div></div><div className="lei-explore-symbol" aria-hidden="true"><span>◇</span><i/><i/></div></div>
 </section>
 <section className="lei-main">
  <div className="lei-main-header"><div><span className="command-mini">CONNECTED NOW / GLEIF</span><h2>Search registered legal entities.</h2><p>Actual, source-linked data. LEI coverage is substantial but not universal, especially among smaller private companies.</p></div><a href="https://search.gleif.org/" target="_blank" rel="noopener noreferrer">Original GLEIF Search ↗</a></div>
  <GlobalCompanySearch/><div className="gd-explore-link"><Link href="/directory">Browse the global company directory and country listings ↗</Link></div>
 </section>
 <section className="lei-difference">
  <div><span className="command-mini">WHAT YOU'LL LEARN</span><h2>Identity is the beginning.<br/>Not the valuation.</h2><p>An LEI record can identify a legal entity and its registered details. It does not prove the entity is exchange-listed, provide audited financial statements, or establish what its shares are worth.</p><Link href="/workbench">Take an entity into the valuation workbench ↗</Link></div>
  <div className="lei-proof-layers"><div><span>01 / IDENTITY</span><strong>Legal name, LEI, jurisdiction</strong><small>Available through GLEIF</small></div><div><span>02 / FINANCIAL PROOF</span><strong>Filing periods, audited records</strong><small>Source connection and review needed</small></div><div><span>03 / VALUATION</span><strong>Inputs, assumptions, models</strong><small>Build in CREQOR workbench</small></div></div>
 </section>
 </>;}
