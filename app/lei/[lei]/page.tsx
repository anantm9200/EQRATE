import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getLEI} from '@/lib/gleif';
import LEIStartAssessment from '@/components/lei-start-assessment';

export const revalidate=900;
export async function generateMetadata({params}:{params:Promise<{lei:string}>}){
 const {lei}=await params;
 const entity=await getLEI(lei).catch(()=>null);
 return {title:entity?entity.name+' — global LEI record':'Legal entity record',description:'Global Legal Entity Identifier reference information and source-linked company identity.'};
}
export default async function LEIPage({params}:{params:Promise<{lei:string}>}){
 const {lei}=await params;if(!/^[A-Z0-9]{20}$/i.test(lei))notFound();
 const entity=await getLEI(lei).catch(()=>null);
 if(!entity)return <><section className="lei-explore-hero"><span className="command-mini">GLEIF / RECORD UNAVAILABLE</span><h1>We couldn't retrieve this LEI record.</h1><p>The entity lookup may be temporarily unavailable or the identifier may not exist. No company information has been invented.</p></section><section className="lei-detail-bottom"><Link href="/explore">Return to global search ↗</Link><a href={'https://search.gleif.org/#/record/'+encodeURIComponent(lei)} target="_blank" rel="noopener noreferrer">Check the official GLEIF database ↗</a></section></>;
 const info=[
  {label:'Legal entity',value:entity.name},
  {label:'Legal Entity Identifier',value:entity.lei},
  {label:'Legal jurisdiction',value:entity.jurisdiction||'Not provided'},
  {label:'Country',value:entity.country||'Not provided'},
  {label:'Entity status',value:entity.status||'Not provided'},
  {label:'LEI registration status',value:entity.registrationStatus||'Not provided'},
  {label:'Registered authority number',value:entity.registeredAs||'Not provided'},
  {label:'Last LEI record update',value:entity.lastUpdate.slice(0,10)||'Not provided'},
  {label:'Next renewal date',value:entity.nextRenewal.slice(0,10)||'Not provided'},
  {label:'Registered address',value:entity.address||'Not provided'},
  {label:'Headquarters address',value:entity.headquarters||'Not provided'}
 ];
 return <><section className="lei-record-hero">
  <div className="command-eyebrow"><span className="command-signal"/> VERIFIED SOURCE LOCATION / GLEIF LEI REFERENCE</div>
  <div className="lei-record-hero-main"><div><span className="command-mini">ENTITY IDENTITY / NO MARKET PRICING</span><h1>{entity.name}</h1><p>Global LEI legal-entity reference record. Entity identity and an LEI registration do not independently establish share prices, audited financials, or an equity valuation.</p><div className="lei-record-code"><small>LEI</small><strong>{entity.lei}</strong></div></div>
   <div className="lei-record-seal"><span>◇</span><strong>{entity.registrationStatus}</strong><small>LEI REGISTRATION STATUS</small></div></div>
 </section>
 <section className="lei-record-layout">
  <div className="lei-record-data"><div className="lei-block-header"><span className="command-mini">SOURCE-LINKED REFERENCE DATA</span><h2>Entity record</h2></div>
   <div className="lei-fact-list">{info.map(x=><div key={x.label}><span>{x.label}</span><strong>{x.value}</strong></div>)}</div>
   <div className="lei-reference"><strong>Source: Global Legal Entity Identifier Foundation</strong><p>LEI reference data is published through the GLEIF API. Registration status refers to the LEI record, not the company's exchange listing or a financial rating.</p><a href={entity.sourceUrl} target="_blank" rel="noopener noreferrer">Open original GLEIF record ↗</a></div>
  </div>
  <aside className="lei-record-aside"><span className="command-mini">TURN IDENTITY INTO A RESEARCH DRAFT</span><h2>Build a defensible assessment.</h2><p>Bring this legal name, LEI, country and source reference into CREQOR. You still need to supply financial statements, capital structure, peer evidence and assumptions before modelling a real valuation.</p>
   <LEIStartAssessment entity={entity}/>
   <div className="lei-source-note"><span>WHAT IS NOT PROVIDED HERE</span><p>Live shares, ownership classes, market capitalisation, audited company accounts, proprietary ratings or investment advice.</p></div>
  </aside>
 </section>
 <section className="lei-detail-bottom"><Link href={'/intelligence?lei='+encodeURIComponent(entity.lei)}>Analyse this entity ↗</Link><Link href="/explore">← Search another company</Link><Link href="/methodology">Understand valuations ↗</Link></section>
 </>;
}
