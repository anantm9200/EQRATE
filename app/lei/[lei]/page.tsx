import Link from 'next/link';
import {cache} from 'react';
import {notFound} from 'next/navigation';
import {getLEI,type LeiEntity} from '@/lib/gleif';
import {callDgxEngine,dgxGatewayConfigured} from '@/lib/dgx-gateway';
import LEIStartAssessment from '@/components/lei-start-assessment';
import CorporateGroup from '@/components/corporate-group';
import LeiResearchPanel from '@/components/lei-research-panel';
import WatchButton from '@/components/watch-button';
import FinancialProfile,{type FinancialProfileData} from '@/components/financial-profile';

export const dynamic='force-dynamic';
type Edge={lei:string;name:string|null;country:string|null;registrationStatus:string|null;indexed:boolean;type:string;status:string;
 relationshipRegistrationStatus:string;relationshipStart:string;accountingStart:string;accountingEnd:string;quantifiers:string};
type Flag={code:string;severity:'info'|'low'|'medium'|'high';title:string;explanation:string};
type Detail={entity:LeiEntity;flags:Flag[];missingFields:string[];
 provenance:{sourceSha256:string;currentVersionPublishedAt:string|null;firstSeenAt:string;lastChangedAt:string;
  latestCompletePublicationDate:string|null;presentInLatestPublication:boolean|null};
 versions:{observedAt:string;publishDate:string|null;sourceSha256:string}[];
 corporate:{directParent:Edge|null;ultimateParent:Edge|null;otherParents:Edge[];
  directChildren:{total:number;sample:{lei:string;name:string|null;country:string|null;registrationStatus:string|null;type:string;status:string}[]};
  ultimateChildren:number;exceptions:{category:string;reasons:string[]}[]}|null;
 india:{identifier:null|({kind:'CIN';value:string;listing:string;industryCode:string;rocState:string;incorporationYear:number;
   companyClass:string;companyClassLabel:string;registrationNumber:string}|{kind:'GSTIN';value:string;stateCode:string;state:string;pan:string;
   panHolderType:string;panHolderLabel:string});addressRegion:{code:string;name:string}|null}|null};

// One upstream round per request: metadata and page share this result.
const load=cache(async function load(lei:string){
 const [live,detail,financials]=await Promise.all([
  getLEI(lei).catch(()=>null),
  dgxGatewayConfigured()?callDgxEngine<Detail>('/v1/lei/'+lei.toUpperCase(),{timeoutMs:10000}).catch(()=>null):Promise.resolve(null),
  dgxGatewayConfigured()?callDgxEngine<FinancialProfileData>('/v1/lei/'+lei.toUpperCase()+'/financials',{timeoutMs:10000}).catch(()=>null):Promise.resolve(null)]);
 return {entity:live||detail?.entity||null,live:Boolean(live),detail,financials};
});
export async function generateMetadata({params}:{params:Promise<{lei:string}>}){
 const {lei}=await params;
 if(!/^[A-Z0-9]{20}$/i.test(lei))return {title:'Legal entity record',robots:{index:false,follow:true}};
 const {entity,detail,financials}=await load(lei.toUpperCase());
 // Index only profiles with original value beyond the public GLEIF record: stored
 // financial statements, or a listed Indian company with decoded identifiers and group data.
 const listed=detail?.india?.identifier?.kind==='CIN'&&detail.india.identifier.listing==='Listed';
 const valuable=Boolean(financials?.available)||listed;
 return {title:entity?entity.name+' — company identity profile | CREQOR':'Legal entity record',
  description:entity?`${entity.name}: legal identity, ${detail?.corporate?'corporate group, ':''}${detail?.india?'India identifiers, ':''}source provenance${financials?.available?' and reviewed financial statements':''} from official records.`:
   'Source-linked legal-entity identity, corporate structure and India identifiers from official GLEIF records.',
  alternates:{canonical:'/lei/'+lei.toUpperCase()},
  robots:{index:valuable,follow:true}};
}
const day=(s:string|null|undefined)=>s?s.slice(0,10):'Not provided';
const regionNames=new Intl.DisplayNames(['en'],{type:'region'});
/** "IN" → "India (IN)"; subdivision or unknown codes are shown exactly as reported. */
function region(code:string|null|undefined){
 if(!code)return 'Not provided';
 if(!/^[A-Z]{2}$/.test(code))return code;
 try{const name=regionNames.of(code);return name&&name!==code?name+' ('+code+')':code;}catch{return code;}
}
const sentence=(s:string)=>s.charAt(0)+s.slice(1).toLowerCase().replaceAll('_',' ');
const EX:Record<string,string>={NATURAL_PERSONS:'controlled by individuals, not a legal-entity parent',NON_CONSOLIDATING:'the controlling entity does not consolidate this entity',
 NO_KNOWN_PERSON:'no known controlling person or entity',NON_PUBLIC:'parent withheld as non-public',NO_LEI:'the parent has no LEI'};
function ParentCard({label,e}:{label:string;e:Edge}){
 return <div className="lp-parent"><span className="in-kicker">{label}</span>
  {e.indexed?<Link href={'/lei/'+e.lei}>{e.name}</Link>:<strong>{e.lei}</strong>}
  <small>{[e.country,e.registrationStatus?'LEI '+e.registrationStatus:null,e.status?'relationship '+e.status:null,
   e.quantifiers||null,e.accountingStart?'accounts '+e.accountingStart+' → '+(e.accountingEnd||'—'):null].filter(Boolean).join(' · ')}</small></div>;
}
export default async function LEIPage({params}:{params:Promise<{lei:string}>}){
 const {lei:raw}=await params;if(!/^[A-Z0-9]{20}$/i.test(raw))notFound();
 const lei=raw.toUpperCase();
 const {entity,live,detail,financials}=await load(lei);
 if(!entity)return <><section className="lei-explore-hero"><span className="command-mini">GLEIF / RECORD UNAVAILABLE</span><h1>We couldn't retrieve this LEI record.</h1><p>The entity lookup may be temporarily unavailable or the identifier may not exist. No company information has been invented.</p></section><section className="lei-detail-bottom"><Link href="/india">Search Indian companies ↗</Link><a href={'https://search.gleif.org/#/record/'+encodeURIComponent(lei)} target="_blank" rel="noopener noreferrer">Check the official GLEIF database ↗</a></section></>;
 const info=[
  {label:'Legal entity',value:entity.name},
  {label:'Legal Entity Identifier',value:entity.lei},
  {label:'Legal jurisdiction',value:region(entity.jurisdiction)},
  {label:'Country',value:region(entity.country)},
  {label:'Entity status',value:entity.status||'Not provided'},
  {label:'LEI registration status',value:entity.registrationStatus||'Not provided'},
  {label:'Registered authority number',value:entity.registeredAs||'Not provided'},
  {label:'Last LEI record update',value:day(entity.lastUpdate)},
  {label:'Next renewal date',value:day(entity.nextRenewal)},
  {label:'Registered address',value:entity.address||'Not provided'},
  {label:'Headquarters address',value:entity.headquarters||'Not provided'}
 ];
 const id=detail?.india?.identifier;
 const c=detail?.corporate;
 const reg=entity.registrationStatus||'';
 const jsonLd={'@context':'https://schema.org','@type':'Organization',name:entity.name,leiCode:entity.lei,
  ...(entity.country?{address:{'@type':'PostalAddress',addressCountry:entity.country}}:{}),
  ...(id?.kind==='CIN'?{identifier:[{'@type':'PropertyValue',propertyID:'CIN',value:id.value}]}:{}),
  ...(c?.ultimateParent?.indexed?{parentOrganization:{'@type':'Organization',name:c.ultimateParent.name,leiCode:c.ultimateParent.lei}}:{}),
  sameAs:[entity.sourceUrl]};
 return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd).replace(/</g,'\\u003c')}}/>
 <section className="lp-hero" aria-labelledby="lp-title"><div className="lp-hero-inner">
  <nav className="lp-crumbs" aria-label="Breadcrumb"><Link href={entity.country==='IN'?'/india':'/directory'}>{entity.country==='IN'?'India company intelligence':'Global directory'}</Link><span aria-hidden="true">/</span><span>Company profile</span></nav>
  <h1 id="lp-title">{entity.name}</h1>
  <ul className="lp-badges" aria-label="Identity summary">
   <li className="lp-lei"><small>LEI</small><code>{entity.lei}</code></li>
   {reg&&<li className={'lp-badge '+(reg==='ISSUED'?'is-good':'is-warn')}><i aria-hidden="true"/>LEI {sentence(reg).toLowerCase()}</li>}
   {entity.status&&<li className="lp-badge">{entity.status==='ACTIVE'?'Active legal entity':sentence(entity.status)}</li>}
   {entity.country&&<li className="lp-badge">{region(entity.country)}</li>}
   {id?.kind==='CIN'&&<li className="lp-badge">{id.listing} · {id.companyClassLabel}</li>}
  </ul>
  <div className="lp-hero-actions"><WatchButton lei={entity.lei} name={entity.name}/></div>
  <p>Legal-entity reference record{detail?' with corporate structure and screening from CREQOR’s private index':''}. An LEI does not establish share prices, audited financials or a valuation.</p>
 </div></section>
 {detail&&<nav className="lp-tabs" aria-label="Profile sections">
  {id&&<a href="#india-identifiers">India identifiers</a>}<a href="#financials">Financials</a>{c&&<a href="#corporate-structure">Corporate structure</a>}
  <a href="#screening">Screening leads ({detail.flags.length})</a><a href="#provenance">Source provenance</a><a href="#research">Analyst research</a></nav>}
 <section className="lei-record-layout">
  <div className="lei-record-data"><div className="lei-block-header"><span className="command-mini">SOURCE-LINKED REFERENCE DATA</span><h2>Entity record</h2></div>
   <div className="lei-fact-list">{info.map(x=><div key={x.label}><span>{x.label}</span><strong>{x.value}</strong></div>)}</div>
   <div className="lei-reference"><strong>Source: Global Legal Entity Identifier Foundation</strong><p>{live?'Live from the GLEIF API.':'From the latest GLEIF Golden Copy imported to CREQOR (the live API was unavailable).'} Registration status refers to the LEI record, not an exchange listing or a financial rating.</p><a href={entity.sourceUrl} target="_blank" rel="noopener noreferrer">Open original GLEIF record ↗</a></div>
  </div>
  <aside className="lei-record-aside"><span className="command-mini">TURN IDENTITY INTO A RESEARCH DRAFT</span><h2>Build a defensible assessment.</h2><p>Bring this legal name, LEI, country and source reference into CREQOR. You still need financial statements, capital structure, peer evidence and assumptions before modelling a valuation.</p>
   <LEIStartAssessment entity={entity}/>
   <div className="lei-source-note"><span>WHAT IS NOT PROVIDED HERE</span><p>Live shares, ownership classes, market capitalisation, audited company accounts, proprietary ratings or investment advice.</p></div>
  </aside>
 </section>
 {detail&&<div className="lp-sections">
  {id&&<section id="india-identifiers" className="lp-section"><div className="in-section-head"><span className="in-kicker">INDIA</span><h2>{id.kind==='CIN'?'Corporate Identity Number decoded':'GSTIN decoded'}</h2>
   <p>Decoded from the identifier this entity reported to GLEIF, using the official format. Confirm current status on the MCA / GST portals.</p></div>
   <dl className="cq-engine-facts">{id.kind==='CIN'?<>
    <div><dt>CIN</dt><dd>{id.value}</dd></div><div><dt>Listing (at CIN issue)</dt><dd>{id.listing}</dd></div>
    <div><dt>Company class</dt><dd>{id.companyClassLabel} ({id.companyClass})</dd></div><div><dt>Year of incorporation</dt><dd>{id.incorporationYear}</dd></div>
    <div><dt>ROC state code</dt><dd>{id.rocState}</dd></div><div><dt>Industry code (as in CIN)</dt><dd>{id.industryCode}</dd></div>
    <div><dt>Registration number</dt><dd>{id.registrationNumber}</dd></div><div><dt>Address state</dt><dd>{detail.india?.addressRegion?.name||'Not in address'}</dd></div></>:<>
    <div><dt>GSTIN</dt><dd>{id.value}</dd></div><div><dt>GST state</dt><dd>{id.state} ({id.stateCode})</dd></div>
    <div><dt>PAN</dt><dd>{id.pan}</dd></div><div><dt>PAN holder type</dt><dd>{id.panHolderLabel}</dd></div>
    <div><dt>Address state</dt><dd>{detail.india?.addressRegion?.name||'Not in address'}</dd></div></>}</dl>
  </section>}
  {c&&<section id="corporate-structure" className="lp-section"><div className="in-section-head"><span className="in-kicker">GROUP</span><h2>Corporate structure</h2>
   <p>Accounting-consolidation relationships reported to GLEIF (Level 2). Not legal or beneficial ownership.</p></div>
   <div className="lp-parents">
    {c.directParent?<ParentCard label="DIRECT PARENT" e={c.directParent}/>:null}
    {c.ultimateParent?<ParentCard label="ULTIMATE PARENT" e={c.ultimateParent}/>:null}
    {c.otherParents.map(p=><ParentCard key={p.lei+p.type} label={p.type.replaceAll('_',' ')} e={p}/>)}
    {c.exceptions.map(e=><div className="lp-parent is-exception" key={e.category}><span className="in-kicker">{e.category.startsWith('DIRECT')?'DIRECT':'ULTIMATE'} PARENT NOT REPORTED</span>
     <strong>{e.reasons.map(r=>EX[r]||r.replaceAll('_',' ').toLowerCase()).join('; ')}</strong><small>Official reporting exception</small></div>)}
    {!c.directParent&&!c.ultimateParent&&!c.exceptions.length&&<p className="cq-engine-note">No parent relationship or reporting exception is recorded for this entity.</p>}
   </div>
   {c.directChildren.total>0&&<><h3 className="lp-sub">Direct subsidiaries and branches ({c.directChildren.total.toLocaleString('en-IN')})</h3>
    <ul className="in-results lp-children">{c.directChildren.sample.map(k=><li key={k.lei+k.type}><Link href={'/lei/'+k.lei}>
     <strong>{k.name||k.lei}</strong><span className="in-result-meta">{[k.country,k.type==='IS_INTERNATIONAL_BRANCH_OF'?'International branch':'Directly consolidated',k.registrationStatus].filter(Boolean).join(' · ')}</span></Link></li>)}</ul></>}
   {(c.ultimateParent||c.ultimateChildren>0)&&<CorporateGroup lei={entity.lei} members={c.ultimateChildren}/>}
  </section>}
  <section id="financials" className="lp-section"><div className="in-section-head"><span className="in-kicker">FINANCIAL · RISK · CONFIDENCE</span><h2>Financial statements</h2>
   <p>From the company’s published annual reports, extracted deterministically with page citations and validated before use. Screening indicators are not ratings.</p></div>
   <FinancialProfile data={financials}/></section>
  <section id="screening" className="lp-section"><div className="in-section-head"><span className="in-kicker">SCREENING</span><h2>Identity and structure leads</h2>
   <p>Deterministic checks on the source records. Prompts for investigation, not findings of wrongdoing.</p></div>
   {detail.flags.length?<ul className="cq-engine-flags">{detail.flags.map(f=><li key={f.code} data-severity={f.severity}><span>{f.severity}</span><div><strong>{f.title}</strong><p>{f.explanation}</p></div></li>)}</ul>:
    <p className="cq-engine-note">No leads raised for this record.</p>}
   {detail.missingFields.length>0&&<p className="cq-engine-note"><strong>Not provided by the source:</strong> {detail.missingFields.join(', ')}</p>}
  </section>
  <section id="provenance" className="lp-section"><div className="in-section-head"><span className="in-kicker">PROVENANCE</span><h2>Where this record comes from</h2></div>
   <dl className="cq-engine-facts">
    <div><dt>Current version published</dt><dd>{day(detail.provenance.currentVersionPublishedAt)}</dd></div>
    <div><dt>First seen by CREQOR</dt><dd>{day(detail.provenance.firstSeenAt)}</dd></div>
    <div><dt>Last changed</dt><dd>{day(detail.provenance.lastChangedAt)}</dd></div>
    <div><dt>In latest publication</dt><dd>{detail.provenance.presentInLatestPublication===null?'Unknown':detail.provenance.presentInLatestPublication?'Yes ('+day(detail.provenance.latestCompletePublicationDate)+')':'No'}</dd></div>
    <div className="lp-wide"><dt>Source fingerprint (SHA-256)</dt><dd><code>{detail.provenance.sourceSha256}</code></dd></div>
    <div><dt>Stored versions</dt><dd>{detail.versions.length}</dd></div></dl>
  </section>
  <section id="research" className="lp-section"><div className="in-section-head"><span className="in-kicker">RESEARCH</span><h2>Ask CREQOR about this entity</h2>
   <p>Grounded in the records above. Answers cite only identifiers in the evidence and are kept in an audit log.</p></div>
   <LeiResearchPanel lei={entity.lei}/>
  </section>
 </div>}
 <section className="lei-detail-bottom"><Link href={entity.country==='IN'?'/india':'/directory'}>← {entity.country==='IN'?'Search Indian companies':'Search another company'}</Link><Link href="/methodology">Understand valuations ↗</Link></section>
 </>;
}
