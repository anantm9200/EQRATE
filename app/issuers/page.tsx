import type {Metadata} from 'next';
import Link from 'next/link';
import SecIssuerDirectory from '@/components/sec-issuer-directory';
import {secIssuerIndexStatus,listIndexedSecIssuers} from '@/lib/sec-public-issuers';
export const dynamic='force-dynamic';
export const metadata:Metadata={
 title:'SEC public issuer directory — CREQOR',
 description:'Explore source-attributed U.S. SEC ticker and CIK associations, with official filings links.',
 robots:{index:false,follow:true}
};
export default async function Issuers(){
 const status=await secIssuerIndexStatus();
 const initial=status.status==='ready'?await listIndexedSecIssuers().catch(()=>null):null;
 return <>
  <section className="page-hero">
   <span className="eyebrow">CREQOR / OFFICIAL PUBLIC RECORDS</span>
   <h1>Real public issuers.<br/><em>Traceable filings.</em></h1>
   <p>SEC-reported company names, CIK identifiers, tickers and exchanges. Open the original filing history to investigate the facts.</p>
  </section>
  {initial?<SecIssuerDirectory initial={initial}/>:
   <section className="cq-issuers cq-issuers-unavailable">
    <span className="eyebrow">SOURCE INDEX / NOT CONNECTED</span>
    <h2>The SEC issuer catalogue is ready to ingest.</h2>
    <p>Official source integration and database schema are implemented. The indexed service will display genuine issuer records after an authorised database and a compliant SEC contact identity are configured. No companies are invented while the index is inactive.</p>
    <Link href="/directory">Explore live GLEIF companies ↗</Link>
   </section>}
 </>;
}
