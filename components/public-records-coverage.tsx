'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
type Coverage={referenceRecords:number|null;asOf:string|null;locallyIndexed:number;locallyIndexedOperational:boolean};
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
   <p>{data.locallyIndexedOperational?
   new Intl.NumberFormat('en-US').format(data.locallyIndexed)+' legal entities indexed locally':
   'CREQOR bulk index not yet activated; live global source search is available.'}</p>
   <Link href="/directory">Explore official records ↗</Link>
  </div>
 </section>;
}
