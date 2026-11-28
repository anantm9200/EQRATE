import type {Metadata} from 'next';
import Link from 'next/link';
import GlobalDirectory from '@/components/global-directory';
import type {LeiDirectoryPage} from '@/lib/gleif';
import {directoryFilters,loadDirectory} from '@/lib/identity-directory';

export const metadata:Metadata={title:'Global company directory | CREQOR',description:'Explore real legal entities across the world from the GLEIF Golden Copy. Search by company name, browse by country, save bookmarks and open source-linked company profiles.'};
// Served per request from CREQOR's private index (live GLEIF only as a labelled last resort).
export const dynamic='force-dynamic';
export default async function DirectoryPage({searchParams}:{searchParams:Promise<{q?:string;country?:string}>}){
 const search=await searchParams;
 const q=(search.q||'').trim().slice(0,90);
 const country=(search.country||'').trim().toUpperCase();
 let initial:LeiDirectoryPage|null=null;
 let initialError='';
 try{
  if(q.length===1)throw new Error('Enter at least two letters to search by name.');
  initial=await loadDirectory(directoryFilters({q,country:/^[A-Z]{2}$/.test(country)?country:'',page:1}));
 }catch(e){initialError=e instanceof Error&&e.message==='Enter at least two letters to search by name.'?e.message:'The company directory is temporarily unavailable. You can retry from the directory.';}
 return <>
 <section className="gd-hero"><div className="gd-hero-light" aria-hidden="true"/><div className="gd-hero-inner">
  <div className="gd-hero-brow"><span className="gd-source-dot"/> CREQOR / THE GLOBAL COMPANY DIRECTORY</div>
  <h1>Every company starts<br/>with an <em>identity.</em></h1>
  <p>Find real businesses worldwide, explore their legal identities and build the research that comes next.</p>
  <div className="gd-hero-steps"><span>FIND THE ENTITY</span><i/> <span>OPEN THE SOURCE</span><i/> <span>BUILD THE VALUATION</span></div>
 </div></section>
 <GlobalDirectory initial={initial} initialQuery={q} initialCountry={/^[A-Z]{2}$/.test(country)?country:''} initialError={initialError}/>
 <section className="gd-next"><div><span className="gd-kicker">BEYOND ENTITY IDENTIFICATION</span><h2>Found the company?<br/><em>Understand the business.</em></h2><p>Open a legal-entity record to take its name, LEI, country and source reference into the valuation workbench. Financials and ratings still require proper evidence.</p><Link href="/workbench">Start a company assessment ↗</Link></div><Link href="/explore">Search one company in detail ↗</Link></section>
 </>;
}
