import type {Metadata} from 'next';
import Link from 'next/link';
import {callDgxEngine,dgxGatewayConfigured} from '@/lib/dgx-gateway';
import {IN_REGION,CIN_CLASS} from '@/lib/india';
import {BarList,ColumnChart,StatTile} from '@/components/data-bars';
import IndiaCompanySearch from '@/components/india-company-search';

export const metadata:Metadata={title:'India company intelligence | CREQOR',
 description:'Every Indian legal entity with an LEI, decoded from official GLEIF records: states, company classes, listing status, incorporation history and corporate groups.'};
export const dynamic='force-dynamic';

type Overview={
 totals:{entities:number;issued:number;lapsed:number;otherStatus:number;withCin:number;listedByCin:number;unlistedByCin:number;
  withGstin:number;withAddressRegion:number;withReportedUltimateParent:number};
 byRegion:{code:string;name:string;entities:number;issued:number}[];
 byCompanyClass:{code:string;label:string;entities:number;listed:number}[];
 byIncorporationDecade:{decade:number;entities:number}[];
 byIncorporationYearRecent:{year:number;entities:number}[];
 byPanHolderType:{code:string;label:string;entities:number}[];
 ultimateParentCountries:{country:string;entities:number}[];
 largestGroups:{lei:string;name:string|null;country:string|null;indianEntities:number}[];
 ultimateParentExceptions:{reason:string;entities:number}[];
 notes:string[];
};
type Status={freshness?:{gleif:{source?:string;status:string;publishDate:string|null}[]}};
const nf=new Intl.NumberFormat('en-IN');
const lakh=(n:number)=>n>=100000?(n/100000).toFixed(n>=1000000?1:2).replace(/\.?0+$/,'')+' lakh':nf.format(n);
const REASON:Record<string,string>={NATURAL_PERSONS:'Controlled by individuals',NON_CONSOLIDATING:'Parent does not consolidate',
 NO_KNOWN_PERSON:'No known controller',NON_PUBLIC:'Withheld: non-public',BINDING_LEGAL_COMMITMENTS:'Withheld: legal commitments',
 LEGAL_OBSTACLES:'Withheld: legal obstacles',DISCLOSURE_DETRIMENTAL:'Withheld: detrimental',CONSENT_NOT_OBTAINED:'Withheld: no consent',
 DETRIMENT_NOT_EXCLUDED:'Withheld: detriment not excluded'};

export default async function IndiaPage(){
 let data:Overview|null=null,status:Status|null=null;
 if(dgxGatewayConfigured()){
  [data,status]=await Promise.all([
   callDgxEngine<Overview>('/v1/india/overview',{timeoutMs:20000}).catch(()=>null),
   callDgxEngine<Status>('/v1/status',{timeoutMs:8000}).catch(()=>null)]);
 }
 const runs=status?.freshness?.gleif||[];
 const lei=runs.find(r=>r.source==='GLEIF_GOLDEN_COPY'&&r.status==='complete');
 const rr=runs.find(r=>r.source==='GLEIF_RR'&&r.status==='complete');
 const regions=Object.entries(IN_REGION).filter(([c])=>!['CT','OR','TG','UT','DN','DD'].includes(c))
  .map(([code,label])=>({code,label})).sort((a,b)=>a.label.localeCompare(b.label));
 const classes=Object.entries(CIN_CLASS).map(([code,label])=>({code,label}));
 return <>
 <section className="in-hero">
  <div className="in-hero-inner">
   <span className="in-kicker">CREQOR / INDIA COMPANY INTELLIGENCE</span>
   <h1>Every Indian company,<br/><em>traced to its source.</em></h1>
   <p>{data?lakh(data.totals.entities)+' Indian legal entities':'Indian legal entities'} from the official GLEIF register, with Corporate Identity Numbers decoded, states mapped and corporate groups linked. Identity first: no invented financials, prices or ratings.</p>
   <div className="in-hero-links"><a href="#in-search-title">Search Indian companies ↓</a><Link href="/engine">Private intelligence engine ↗</Link></div>
   {lei&&<p className="in-source-line">GLEIF Golden Copy {lei.publishDate?.slice(0,10)}{rr?' · relationships '+rr.publishDate?.slice(0,10):''} · imported to CREQOR&rsquo;s private DGX</p>}
  </div>
 </section>
 {!data?<section className="in-section"><div className="cq-engine-unconfigured"><strong>India analytics are temporarily unavailable</strong>
  <p>The private index could not be reached. Indian companies remain searchable through the <Link href="/directory?country=IN">live GLEIF directory</Link>. Nothing on this page is estimated while the source is offline.</p></div></section>:<>
 <section className="in-section in-stats" aria-label="India headline figures">
  <StatTile label="Indian legal entities" value={nf.format(data.totals.entities)} note={nf.format(data.totals.issued)+' with a current (issued) LEI'}/>
  <StatTile label="Companies with a CIN" value={nf.format(data.totals.withCin)} note={nf.format(data.totals.listedByCin)+' listed · '+nf.format(data.totals.unlistedByCin)+' unlisted'}/>
  <StatTile label="States and UTs represented" value={String(data.byRegion.filter(r=>r.name!=='not decoded').length)} note={nf.format(data.totals.withAddressRegion)+' addresses carry a state code'}/>
  <StatTile label="Part of a reported group" value={nf.format(data.totals.withReportedUltimateParent)} note="entities reporting an ultimate parent"/>
 </section>
 <section className="in-section in-grid-2">
  <div><div className="in-section-head"><span className="in-kicker">WHERE</span><h2>Registered address by state</h2>
   <p>ISO 3166-2 state code in the legal address reported to GLEIF.</p></div>
   <BarList title="Indian legal entities by state / UT" caption="Top 15 · hover or focus a bar for its share" unit="entities"
    total={data.totals.withAddressRegion}
    rows={data.byRegion.filter(r=>r.name!=='not decoded').slice(0,15).map(r=>({key:r.code,label:r.name,value:r.entities,detail:nf.format(r.issued)+' issued'}))}/></div>
  <div><div className="in-section-head"><span className="in-kicker">WHAT</span><h2>Company class from the CIN</h2>
   <p>The three-letter class in each Corporate Identity Number.</p></div>
   <BarList title="Companies by CIN class" caption={nf.format(data.totals.withCin)+' companies with a CIN'} unit="companies" total={data.totals.withCin}
    rows={data.byCompanyClass.slice(0,10).map(c=>({key:c.code,label:c.label==='not decoded'?c.code+' (not decoded)':c.label,value:c.entities,
     detail:nf.format(c.listed)+' listed'}))}/></div>
 </section>
 <section className="in-section in-grid-2">
  <div><div className="in-section-head"><span className="in-kicker">WHEN</span><h2>Incorporation year from the CIN</h2>
   <p>Year embedded in the CIN, for companies that reported one.</p></div>
   <ColumnChart title="Companies by decade of incorporation" unit="companies"
    rows={data.byIncorporationDecade.filter(d=>d.decade>=1900).map(d=>({key:String(d.decade),label:String(d.decade),value:d.entities}))}/></div>
  <div><div className="in-section-head"><span className="in-kicker">RECENT</span><h2>New companies, last 12 years</h2>
   <p>Companies in the index by CIN incorporation year. LEI coverage lags new incorporations.</p></div>
   <ColumnChart title="Companies by recent incorporation year" unit="companies"
    rows={data.byIncorporationYearRecent.map(y=>({key:String(y.year),label:"'"+String(y.year).slice(2),value:y.entities}))}/></div>
 </section>
 <section className="in-section in-grid-2">
  <div><div className="in-section-head"><span className="in-kicker">WHO CONTROLS</span><h2>Country of the ultimate parent</h2>
   <p>For Indian entities that report an ultimate accounting-consolidation parent.</p></div>
   <BarList title="Indian entities by ultimate parent country" unit="entities" total={data.totals.withReportedUltimateParent}
    rows={data.ultimateParentCountries.slice(0,10).map(c=>({key:c.country,label:c.country==='IN'?'India (domestic group)':c.country,value:c.entities}))}/></div>
  <div><div className="in-section-head"><span className="in-kicker">GROUPS</span><h2>Largest groups in India</h2>
   <p>Ultimate parents with the most Indian entities. Open one to see its tree.</p></div>
   <BarList title="Ultimate parents by number of Indian entities" unit="Indian entities"
    rows={data.largestGroups.slice(0,10).map(g=>({key:g.lei,label:(g.name||g.lei)+(g.country?' ('+g.country+')':''),value:g.indianEntities,href:'/lei/'+g.lei}))}/></div>
 </section>
 {data.ultimateParentExceptions.length>0&&<section className="in-section">
  <div className="in-section-head"><span className="in-kicker">TRANSPARENCY</span><h2>Why no ultimate parent is reported</h2>
   <p>Official reporting-exception reasons filed by Indian entities instead of naming a parent.</p></div>
  <BarList title="Indian entities by reporting-exception reason" unit="entities"
   rows={data.ultimateParentExceptions.map(e=>({key:e.reason,label:REASON[e.reason]||e.reason,value:e.entities}))}/>
 </section>}
 </>}
 <IndiaCompanySearch regions={regions} classes={classes}/>
 <section className="in-section in-notes"><h2>How to read these figures</h2>
  <ul>{(data?.notes||['Figures appear when the private index is reachable.']).map(n=><li key={n}>{n}</li>)}
   <li>Financial statements of Indian companies are not part of this index. MCA filings and exchange disclosures will be added only through licensed or officially open channels.</li></ul></section>
 </>;
}
