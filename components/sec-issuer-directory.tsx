'use client';
import {useCallback,useEffect,useState} from 'react';
import type {SecIssuer} from '@/lib/sec-public-issuers';
type Result={source:'SEC';total:number;page:number;pageSize:60;hasMore:boolean;records:SecIssuer[]};
export default function SecIssuerDirectory({initial}:{initial:Result}){
 const [q,setQ]=useState('');
 const [data,setData]=useState<Result>(initial);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 const [page,setPage]=useState(1);
 const search=useCallback(async(value:string,p:number)=>{
  setLoading(true);setError('');
  try{
   const params=new URLSearchParams({page:String(p)});
   if(value.trim().length>=2)params.set('q',value.trim());
   const r=await fetch('/api/issuers?'+params.toString(),{cache:'no-store'});
   if(!r.ok)throw new Error('SEC_SOURCE_UNAVAILABLE');
   const data=await r.json() as Result;
   setData(data);setPage(p);
  }catch{setError('The SEC issuer catalogue could not complete that search. Retry or open the official SEC filing service.');}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{
  const timer=setTimeout(()=>{void search(q,1);},350);
  return ()=>clearTimeout(timer);
 },[q,search]);
 return <section className="cq-issuers" aria-label="SEC issuer catalogue">
  <div className="cq-issuers-tools">
   <label htmlFor="cq-issuer-search">Search SEC company name or ticker</label>
   <input id="cq-issuer-search" type="search" value={q}
    onChange={e=>setQ(e.target.value)} placeholder="Apple, NVDA, Microsoft..." autoComplete="off"/>
   <span>{new Intl.NumberFormat('en-US').format(data.total)} source-linked ticker associations</span>
  </div>
  {error&&<p role="alert" className="cq-issuers-error">{error}</p>}
  <div className="cq-issuer-table" role="table" aria-label="US SEC registered issuers">
   <div className="cq-issuer-table-header" role="row">
    <span role="columnheader">Company / registered filer</span><span role="columnheader">Ticker</span>
    <span role="columnheader">Exchange</span><span role="columnheader">Source</span>
   </div>
   {data.records.map(item=><div key={item.cik+':'+item.ticker} role="row" className="cq-issuer-row">
    <div role="cell"><strong>{item.name}</strong><small>SEC CIK {String(item.cik).padStart(10,'0')}</small></div>
    <span role="cell" className="cq-issuer-ticker">{item.ticker}</span>
    <span role="cell">{item.exchange||'Not specified'}</span>
    <a role="cell" href={'https://www.sec.gov/edgar/browse/?CIK='+encodeURIComponent(String(item.cik))}
     target="_blank" rel="noopener noreferrer" aria-label={'Open SEC record for '+item.name}>SEC filing ↗</a>
   </div>)}
  </div>
  {!data.records.length&&!loading&&<p className="cq-issuers-empty">No matching SEC ticker associations. Search another name or ticker.</p>}
  <div className="cq-issuer-pagination">
   <button type="button" disabled={loading||page<=1} onClick={()=>void search(q,page-1)}>Previous</button>
   <span>Page {page} of {Math.max(1,Math.ceil(data.total/60))}</span>
   <button type="button" disabled={loading||!data.hasMore} onClick={()=>void search(q,page+1)}>Next 60</button>
  </div>
  <p className="cq-issuer-caveat">Source: U.S. Securities and Exchange Commission · Public ticker/CIK/exchange associations, not live quotes, share counts or company valuations. One issuer may have more than one ticker.</p>
 </section>;
}
