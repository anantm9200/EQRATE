'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import PublicRecordsCoverage from '@/components/public-records-coverage';

type RecordView={
 lei:string;name:string;country:string;status:string;registrationStatus:string;
 jurisdiction:string;sourceUrl:string;lastUpdate:string;
};
const examples=['Apple','Microsoft','NVIDIA','Toyota','Siemens','Airbus','HSBC','Unilever','Reliance','Tata'];
const regions=new Intl.DisplayNames(['en'],{type:'region'});
function countryName(code:string){try{return regions.of(code)||code;}catch{return code||'Unspecified';}}

export default function CompanyUniverse({compact=false}:{compact?:boolean}){
 const [records,setRecords]=useState<RecordView[]>([]);
 const [loading,setLoading]=useState(true);
 const [issue,setIssue]=useState('');
 useEffect(()=>{
  const controller=new AbortController();
  (async()=>{
   try{
    const r=await fetch('/api/companies/featured',{signal:controller.signal});
    if(!r.ok)throw new Error('Featured source records are temporarily unavailable.');
    const data=await r.json() as {records?:RecordView[]};
    if(!controller.signal.aborted)setRecords(Array.isArray(data.records)?data.records:[]);
   }catch{
    if(!controller.signal.aborted)setIssue('Live featured records are unavailable. Search individual entities in the company directory.');
   }finally{if(!controller.signal.aborted)setLoading(false);}
  })();
  return ()=>controller.abort();
 },[]);
 const show=compact?records.slice(0,12):records;
 return <section className={'cq-universe'+(compact?' cq-universe-compact':'')} aria-labelledby={compact?'cq-universe-title-home':'cq-universe-title-directory'}>
  <div className="cq-universe-header">
   <div><span className="cq-universe-kicker">LIVE COMPANY UNIVERSE / GLEIF IDENTITY DATA</span>
    <h2 id={compact?'cq-universe-title-home':'cq-universe-title-directory'}>{compact?'Companies to explore.':'Start with real companies.'}</h2>
    <p>Legal entities retrieved from the official GLEIF register. Open a record to see its identifier and source—not a fabricated rating or stock price.</p>
   </div>
   <Link href="/directory" className="cq-universe-more">{compact?'View global directory':'Browse all countries'} <span aria-hidden="true">↗</span></Link>
  </div>
  <PublicRecordsCoverage/>
  {loading?<div className="cq-universe-loading" role="status"><span className="cq-universe-indicator"/> <div><p>Resolving official legal entities from GLEIF…</p><div className="cq-universe-suggestions"><span>Search immediately:</span>{examples.slice(0,6).map(name=><Link href={'/directory?q='+encodeURIComponent(name)} key={name}>{name} ↗</Link>)}</div></div></div>:
   show.length?
    <div className="cq-universe-grid">{show.map(record=><Link href={'/lei/'+encodeURIComponent(record.lei)} className="cq-universe-company" key={record.lei}>
      <span className="cq-universe-avatar" aria-hidden="true">{record.name.trim().slice(0,1)}</span>
      <span className="cq-universe-details"><strong>{record.name}</strong><small>{countryName(record.country)} · {record.registrationStatus||'LEI record'}</small></span>
      <span className="cq-universe-link" aria-hidden="true">↗</span>
     </Link>)}</div>:
    <div className="cq-universe-fallback" role="status">
     <p>{issue||'The featured LEI search returned no exact legal-name matches. Explore the live directory or search a business below.'}</p>
     <div>{examples.map(name=><Link href={'/directory?q='+encodeURIComponent(name)} key={name}>{name} ↗</Link>)}</div>
    </div>
  }
  {show.length>0&&<div className="cq-universe-source">Showing {show.length} official legal-entity records · Identity data only · Search the full directory for more businesses</div>}
 </section>;
}
