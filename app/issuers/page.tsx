import type {Metadata} from 'next';
import Link from 'next/link';
export const metadata:Metadata={
 title:'SEC issuer directory disabled — CREQOR',
 description:'SEC data collection is disabled by policy. Search companies in the CREQOR global directory instead.',
 robots:{index:false,follow:true}
};
export default function Issuers(){
 return <>
  <section className="page-hero">
   <span className="eyebrow">CREQOR / SEC ISSUERS / DISABLED</span>
   <h1>SEC issuer directory.<br/><em>Disabled by policy.</em></h1>
   <p>CREQOR does not collect SEC data. Company identity, reviewed financials and comparisons are served from the CREQOR private engine using global legal entity identifiers (LEIs).</p>
  </section>
  <section className="cq-issuers cq-issuers-unavailable">
   <span className="eyebrow">SOURCE / NOT COLLECTED</span>
   <h2>No SEC issuer records are shown.</h2>
   <p>SEC collection is switched off by the owner. No issuer list, ticker or filing figures are displayed here, and none are invented.</p>
   <Link href="/directory">Search the global company directory ↗</Link>
  </section>
 </>;
}
