import Link from 'next/link';
import AssessmentWorkbench from '@/components/assessment-workbench';
export const metadata={
 title:'Company Valuation Workbench',
 description:'Build an auditable company assessment with verified-source references, deterministic valuation models, scoring drafts, local persistence and exportable reports.'
};
export default function WorkbenchPage(){
 return <>
  <section className="wk-page-hero">
   <div className="wk-page-kicker"><span className="wk-pulse"/> CREQOR / ANALYTICAL WORKSPACE <span className="wk-page-line"/></div>
   <div className="wk-hero-row"><div><h1>Research a company.<br/><em>Build the valuation.</em></h1>
    <p>One working space for company identity, financial analysis, evidence registers and an exportable assessment report.</p>
    <div className="wk-feature-pills"><span>6 valuation methods</span><span>Evidence ledger</span><span>Local saving</span><span>Report export</span></div>
   </div><div className="wk-workflow-visual" aria-hidden="true"><span>IDENTITY</span><i>→</i><span>EVIDENCE</span><i>→</i><span>VALUE</span><i>→</i><span>REPORT</span></div></div>
  </section>
  <AssessmentWorkbench/>
  <section className="wk-next-section"><div><span className="wk-label">NEED OFFICIAL ISSUER DATA?</span><h2>Connect the model to the evidence.</h2><p>Start from the US SEC company explorer when its official data connection is enabled. India, private markets, live exchange quotes and team databases require further approved integrations.</p></div>
    <Link href="/explore">Go to company explorer <span>↗</span></Link></section>
 </>;
}