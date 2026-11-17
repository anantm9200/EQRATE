import {AnalystSections} from '@/components/sections-secondary';
import AnalystClient from '@/components/analyst-client';
export const metadata={title:'Private AI analyst',description:'Evidence-aware financial questioning through a protected DGX intelligence gateway.'};
export default function Analyst(){return <>
 <section className="page-hero v2-page-hero">
  <div className="v2-page-topline"><span className="eyebrow">05 / PRIVATE AI ANALYST</span><span>DGX / SECURE SERVER-SIDE INFERENCE</span></div>
  <div className="v2-page-hero-grid"><div><h1>Ask better questions.<br/><em>Challenge the answers.</em></h1><p>Explore assumptions, highlight contradictions and identify gaps in financial evidence. AI interprets; sources determine what can be claimed.</p></div>
  <div className="v2-page-art v2-analyst-art" aria-hidden="true"><span>✳</span><div/><div/></div></div>
 </section>
 <section className="body-wrap v2-analyst-body"><AnalystClient/></section>
 
 <AnalystSections/>
 </>}