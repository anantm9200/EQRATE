import type {Metadata} from 'next';
import Link from 'next/link';
import GlobalDirectory from '@/components/global-directory';
import {engineCatalogueStatus} from '@/lib/engine-catalogue';
import {directoryFilters,loadIndexedDirectory} from '@/lib/identity-directory';
import type {LeiDirectoryPage} from '@/lib/gleif';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Indexed company catalogue — CREQOR',
 description:'Browse the GLEIF Golden Copy held in CREQOR’s private index, with publication dates, source links and update caveats.',
 robots:{index:false,follow:true}};
export default async function Catalogue({searchParams}:{
 searchParams:Promise<{q?:string;country?:string}>
}){
 const params=await searchParams;
 const q=(params.q||'').trim().slice(0,90);
 const country=(params.country||'').trim().toUpperCase();
 // The catalogue is served by CREQOR's private DGX engine (/v1/status and /v1/directory).
 const status=await engineCatalogueStatus();
 let initial:LeiDirectoryPage|null=null;
 let initialError='';
 if(status.status==='ready'){
  try{initial=await loadIndexedDirectory(directoryFilters({q:q.length===1?'':q,country:/^[A-Z]{2}$/.test(country)?country:'',page:1}));}
  catch{initialError='The indexed catalogue could not complete this search; retry or use the company directory.';}
 }
 const fmt=(n:number)=>new Intl.NumberFormat('en-US').format(n);
 const publication=status.goldenCopy;
 return <>
  <section className="page-hero cq-indexed-hero">
   <span className="eyebrow">CREQOR / SOURCE-ATTRIBUTED COMPANY CATALOGUE</span>
   <h1>Indexed companies.<br/><em>Traceable identities.</em></h1>
   <p>The full GLEIF Golden Copy, imported to CREQOR’s private engine with publication dates, source fingerprints and version history. The original source remains the authority.</p>
  </section>
  {status.status==='ready'?<>
   <section className="cq-indexed-status" aria-label="Indexed catalogue freshness">
    <strong>{fmt(status.indexed)} indexed legal entities</strong>
    <span>{publication?.publishDate?'Golden Copy published '+publication.publishDate.slice(0,10)+(publication.officialRecords?' · '+fmt(publication.officialRecords)+' official records':''):
     status.updatedAt?'Last import '+status.updatedAt.slice(0,10):'No publication date recorded'}</span>
    <Link href="/directory">Browse the company directory ↗</Link>
   </section>
   <GlobalDirectory initial={initial} initialError={initialError}
    initialQuery={q} initialCountry={/^[A-Z]{2}$/.test(country)?country:''}
    apiPath="/api/catalogue" routePath="/catalogue" showFeatured={false}
    sourceNote="GLEIF Golden Copy records held in CREQOR’s private index. Original registry links remain authoritative."/>
  </>:<section className="body-wrap cq-indexed-not-ready">
    <div className="cq-indexed-setup">
     <span className="eyebrow">CATALOGUE / PRIVATE ENGINE {status.status.toUpperCase()}</span>
     <h2>The company directory is available now.</h2>
     <p>{status.note} No company count is invented while the private index cannot be reached.</p>
     <Link href="/directory" className="primary-button">Explore real companies ↗</Link>
    </div>
   </section>}
 </>;
}
