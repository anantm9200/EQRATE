import type {Metadata} from 'next';
import Link from 'next/link';
import DgxEngineBrowser from '@/components/dgx-engine-browser';
export const metadata:Metadata={title:'Private intelligence engine — CREQOR',
 description:'Source-backed private company index, reviewed annual-report financials and DGX intelligence infrastructure.',
 robots:{index:false,follow:true}};
export default function EnginePage(){return <>
 <section className="page-hero">
  <span className="eyebrow">CREQOR / PRIVATE INTELLIGENCE INFRASTRUCTURE</span>
  <h1>Evidence at scale.<br/><em>Intelligence with provenance.</em></h1>
  <p>Dedicated company records, financial history and model-assisted analysis from a private DGX engine. The original public sources remain the authority.</p>
 </section>
 <DgxEngineBrowser/>
 <section className="cq-engine-links">
  <Link href="/intelligence">Open forensic assessment workspace ↗</Link>
  <Link href="/lab">Open valuation laboratory ↗</Link>
  <Link href="/compare">Compare two companies ↗</Link>
 </section>
 </>;}
