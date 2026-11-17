import Link from 'next/link';
import ResearchDesk from '@/components/research-desk';
export const metadata={
 title:'Research desk · Saved company assessments',
 description:'Manage, search, compare, duplicate and export your local CREQOR research drafts across listed and private companies.'
};
export default function DeskPage(){return <>
 <section className="rd-hero"><div><span className="rd-hero-tag">CREQOR / YOUR COMPANY RESEARCH</span>
  <h1>One desk.<br/><em>Every company you're studying.</em></h1>
  <p>Keep your research organised. Reopen valuations, compare draft assessments, manage evidence links and export your work—without pretending these are market quotes.</p>
 </div></section>
 <ResearchDesk/>
 </>;}
