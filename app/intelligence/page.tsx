import IntelligenceCommandCentre from '@/components/intelligence-command-centre';
import Link from 'next/link';
export const metadata={
 title:'Company Intelligence Command Centre | CREQOR',
 description:'Source-linked global legal-entity intelligence and SEC annual financial research. Trace each finding to GLEIF or official issuer filings.'
};
export default function Intelligence(){
 return <>
  <section className="iq-hero" aria-labelledby="iq-hero-title"><div className="iq-hero-glow" aria-hidden="true"/>
   <div className="iq-hero-inner"><span className="iq-kicker"><span className="iq-dot"/> CREQOR / THE INTELLIGENCE ENGINE</span>
    <h1 id="iq-hero-title">Intelligence that<br/><em>shows its work.</em></h1>
    <p>Discover the company. Investigate the evidence. Understand what changed—and precisely which source supports it.</p>
    <div className="iq-hero-links"><Link href="/directory">Explore global entities ↗</Link><Link href="/workbench">Value a business ↗</Link></div>
   </div>
  </section>
  <IntelligenceCommandCentre/>
  <section className="iq-outro"><span className="iq-kicker">NEXT / FROM FACTS TO JUDGEMENT</span><h2>The evidence comes first.<br/>The conclusion comes later.</h2><p>CREQOR separates observed reference data, financial calculations, analyst assumptions and unsupported conclusions. Private-company financials, live quotes, comprehensive sector comparisons and model-assisted document analysis will require further licensed sources or secure integrations.</p><Link href="/methodology">See the methodology and limitations ↗</Link></section>
 </>;
}
