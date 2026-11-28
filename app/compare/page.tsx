import {CompareSections} from '@/components/sections-primary';
import CompareClient from '@/components/compare-client';
export const metadata={title:'Compare companies',description:'Compare reviewed annual-report financials for two companies side by side, aligned by fiscal year, with every gap marked as not reported.'};
export default function Compare(){return <><section className="page-hero"><span className="eyebrow">PEERS / COMPARE / EVALUATE</span><h1>Two companies.<br/><em>One clearer picture.</em></h1><p>Compare source-linked financial values rather than unexplained ratings. Pick any two legal entities by name or LEI.</p></section><section className="body-wrap"><CompareClient/></section>
 <CompareSections/>
 </>}
