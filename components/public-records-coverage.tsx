'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
type Coverage={referenceRecords:number|null;asOf:string|null;locallyIndexed:number;locallyIndexedOperational:boolean;
 indexLocation?:'catalogue'|'private-engine'|null;indiaIndexed?:number|null};
const fmt=(n:number)=>new Intl.NumberFormat('en-US').format(n);
function indexedLine(d:Coverage){
 if(!d.locallyIndexedOperational)return 'CREQOR bulk index not yet activated; live global source search is available.';
 if(d.indexLocation==='private-engine')return fmt(d.locallyIndexed)+' legal entities stored in CREQOR’s private index'+
  (d.indiaIndexed?', including '+fmt(d.indiaIndexed)+' Indian entities.':'.');
 return fmt(d.locallyIndexed)+' legal entities indexed locally';
}
export default function PublicRecordsCoverage(){
 const [data,setData]=useState<Coverage|null>(null);
 useEffect(()=>{
  const controller=new AbortController();
  fetch('/api/public-records/coverage',{signal:controller.signal})
   .then(r=>r.ok?r.json():null)
   .then(d=>{if(!controller.signal.aborted&&d)setData(d);})
   .catch(()=>{});
  return ()=>controller.abort();
 },[]);
 if(!data?.referenceRecords)return null;
 return <section className="cq-public-coverage" aria-label="Official public legal-entity dataset coverage">
  <div className="cq-public-coverage-metric"><strong>{new Intl.NumberFormat('en-US').format(data.referenceRecords)}</strong><span>legal-entity records in the official GLEIF index</span></div>
  <div className="cq-public-coverage-detail"><p>Published {data.asOf?.slice(0,10)} · Global public coverage, not CREQOR's stored company count.</p>
   <p>{indexedLine(data)}</p>
   <Link href="/directory">Explore official records ↗</Link>
  </div>
 </section>;
}
