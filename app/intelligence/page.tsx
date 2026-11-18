import ForensicIntelligenceHub from '@/components/forensic-intelligence-hub';
import {IntelligenceSections} from '@/components/sections-primary';
export const metadata={title:'Forensic company intelligence',description:'Run source-to-claim mapping, valuation divergence review, data anomaly detection and an evidence-backed investigation queue on locally saved CREQOR company assessments.'};
export default function Intelligence(){return <>
 <section className="page-hero"><span className="eyebrow">COMPANY INTELLIGENCE / SOURCE-LED FORENSICS</span><h1>Every signal has a reason.<br/><em>Every conclusion needs proof.</em></h1><p>Investigate business identity, financial inputs, valuation disagreement and provenance with an explainable engine that never invents company facts.</p></section>
 <ForensicIntelligenceHub/>
 <IntelligenceSections/>
 </>;}
