import type {Metadata} from 'next';
import Link from 'next/link';
import GlobalDirectory from '@/components/global-directory';
import {catalogueStatus,listIndexedRecords} from '@/lib/catalogue-store';
import type {LeiDirectoryPage} from '@/lib/gleif';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Indexed company catalogue — CREQOR',
 description:'Browse versioned legal entity snapshots indexed from official GLEIF data, with source links and update caveats.',
 robots:{index:false,follow:true}};
export default async function Catalogue({searchParams}:{
 searchParams:Promise<{q?:string;country?:string}>
}){
 const params=await searchParams;
 const q=(params.q||'').trim().slice(0,90);
 const country=(params.country||'').trim().toUpperCase();
 const status=await catalogueStatus();
 let initial:LeiDirectoryPage|null=null;
 let initialError='';
 if(status.status==='ready'){
  try{initial=await listIndexedRecords({q,country,page:1});}
  catch{initialError='The indexed catalogue could not complete this search; browse live GLEIF records instead.';}
 }
 return <>
  <section className="page-hero cq-indexed-hero">
   <span className="eyebrow">CREQOR / SOURCE-ATTRIBUTED COMPANY CATALOGUE</span>
   <h1>Indexed companies.<br/><em>Traceable identities.</em></h1>
   <p>A persistent record of official GLEIF legal entities, updated by an authenticated ingestion pipeline. The original source remains the authority.</p>
  </section>
  {status.status==='ready'?<>
   <section className="cq-indexed-status" aria-label="Indexed catalogue freshness">
    <strong>{new Intl.NumberFormat('en-US').format(status.indexed)} indexed legal entities</strong>
    <span>{status.updatedAt?'Last content change '+status.updatedAt.slice(0,10):'No change timestamp available'}</span>
    <Link href="/directory">Browse the live registry ↗</Link>
   </section>
   <GlobalDirectory initial={initial} initialError={initialError}
    initialQuery={q} initialCountry={/^[A-Z]{2}$/.test(country)?country:''}
    apiPath="/api/catalogue" routePath="/catalogue" showFeatured={false}
    sourceNote="Indexed copies of public GLEIF legal-entity records. Original registry links remain authoritative."/>
  </>:<section className="body-wrap cq-indexed-not-ready">
    <div className="cq-indexed-setup">
     <span className="eyebrow">CATALOGUE SETUP / {status.status.toUpperCase()}</span>
     <h2>Live discovery is available now.</h2>
     <p>{status.note} The indexed catalogue requires a dedicated PostgreSQL connection, reviewed migration and authenticated ingestion. No company count is invented while it is unavailable.</p>
     <Link href="/directory" className="primary-button">Explore real companies ↗</Link>
    </div>
   </section>}
 </>;
}
