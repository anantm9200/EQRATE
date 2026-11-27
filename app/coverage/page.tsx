import type {Metadata} from 'next';
import Link from 'next/link';
import {callDgxEngine,dgxGatewayConfigured} from '@/lib/dgx-gateway';
import {StatTile} from '@/components/data-bars';
export const metadata:Metadata={title:'Data coverage',description:'What CREQOR actually holds: legal entities, Indian companies, corporate relationships and reviewed financial statements, counted separately with source dates.'};
export const revalidate=900;
type Status={counts:Record<string,number|null>;freshness?:{gleif?:{source:string;status:string;publishDate:string|null}[]}};
const nf=new Intl.NumberFormat('en-IN');
export default async function Coverage(){
 const s=dgxGatewayConfigured()?await callDgxEngine<Status>('/v1/status',{timeoutMs:12000}).catch(()=>null):null;
 const c=s?.counts||{};
 const pub=(src:string)=>s?.freshness?.gleif?.find(r=>r.source===src&&r.status==='complete')?.publishDate?.slice(0,10)||'—';
 const v=(k:string)=>typeof c[k]==='number'?nf.format(c[k] as number):'—';
 return <>
  <section className="in-hero"><div className="in-hero-inner">
   <span className="in-kicker">CREQOR / DATA COVERAGE</span>
   <h1>What CREQOR holds,<br/><em>counted honestly.</em></h1>
   <p>Each category is counted separately. A legal entity in the index is not a company with financial statements, and a company with some figures is not one with a complete, reviewed profile.</p>
  </div></section>
  {!s?<section className="in-section"><p className="cq-engine-note">The private index could not be reached; no counts are shown rather than estimates.</p></section>:<>
  <section className="in-section"><div className="in-section-head"><span className="in-kicker">IDENTITY</span><h2>Legal entities and groups</h2>
   <p>Official GLEIF Golden Copy publications, imported with SHA-256 verification.</p></div>
   <div className="in-stats">
    <StatTile label="Legal entities (LEI)" value={v('leiEntities')} note={'Publication '+pub('GLEIF_GOLDEN_COPY')}/>
    <StatTile label="Indian legal entities" value={v('indiaEntities')} note={v('indiaIssued')+' with a current LEI'}/>
    <StatTile label="Parent / subsidiary records" value={v('leiRelationships')} note={'Publication '+pub('GLEIF_RR')}/>
    <StatTile label="Countries and territories" value={v('leiCountries')} note="Legal-address country codes"/>
   </div></section>
  <section className="in-section"><div className="in-section-head"><span className="in-kicker">FINANCIAL</span><h2>Financial statements</h2>
   <p>Figures come only from companies’ published annual reports, with page citations, and are used only after validation or review.</p></div>
   <div className="in-stats">
    <StatTile label="Source documents" value={v('financialDocuments')} note="Annual reports held as evidence"/>
    <StatTile label="Companies with any figures" value={v('companiesWithFinancialFigures')} note="Includes figures awaiting review"/>
    <StatTile label="Companies with reviewed figures" value={v('companiesWithReviewedFinancials')} note="Validator-passed or accepted"/>
    <StatTile label="Financial figures" value={v('financialObservations')} note="Each with page, unit and review status"/>
   </div></section>
  <section className="in-section in-notes"><h2>Not included</h2><ul>
   <li>Market prices, market capitalisation and published credit ratings (licensed sources not connected).</li>
   <li>US SEC financial statements (collection disabled by policy).</li>
   <li>Exchange XBRL filings and MCA filings (terms and fees under review).</li>
   </ul><p className="cq-engine-note"><Link href="/methodology">Methodology</Link> · <Link href="/engine">Intelligence engine</Link></p></section></>}
 </>;
}
