import {LabSections} from '@/components/sections-primary';
import LabClient from '@/components/lab-client';
export const metadata={title:'Valuation lab',description:'Interactive DCF calculator with clearly marked hypothetical inputs, scenarios and sensitivity analysis.'};
export default function Lab(){return <>
 <section className="page-hero v2-page-hero">
   <div className="v2-page-topline"><span className="eyebrow">02 / VALUATION LABORATORY</span><span>TRANSPARENT / DETERMINISTIC / TESTABLE</span></div>
   <div className="v2-page-hero-grid"><div><h1>Put the assumptions<br/><em>under the microscope.</em></h1><p>Build discounted cash-flow scenarios, examine implied equity value and find out exactly which inputs move the result.</p></div>
   <div className="v2-page-art v2-lab-art" aria-hidden="true"><span className="v2-lab-art-grid"/><svg viewBox="0 0 350 150" fill="none"><path d="M5 129 59 115 102 120 152 79 207 87 265 40 341 17" stroke="#B6FAC9" strokeWidth="3"/><path d="M5 129 59 115 102 120 152 79 207 87 265 40 341 17V150H5Z" fill="#AFF2C1" fillOpacity=".08"/><circle cx="265" cy="40" r="6" fill="#B6FAC9"/></svg><span className="v2-lab-art-caption">SCENARIOS / INTERACTIVE</span></div></div>
 </section>
 <section className="body-wrap v2-lab-body">
   <div className="v2-lab-disclaimer"><span>● DEMONSTRATION MODEL</span><p>The starting figures are entirely hypothetical. Replace inputs with documented financials before using the analysis for any real company.</p></div>
   <LabClient/>
 </section>
 
 <LabSections/>
 </>}