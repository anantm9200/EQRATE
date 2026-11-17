'use client';
import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
type Health={product:string;status:string;officialRegistryConfigured:boolean;privateIntelligenceConfigured:boolean};
export default function StatusPage(){
 const [health,setHealth]=useState<Health|null>(null);
 const [error,setError]=useState('');
 const [working,setWorking]=useState(true);
 const [leiReachable,setLeiReachable]=useState<boolean|null>(null);
 const check=useCallback(async()=>{
  setWorking(true);setError('');
  try{
   const controller=new AbortController();
   const timeout=setTimeout(()=>controller.abort(),12000);
   try{
    const response=await fetch('/api/health',{cache:'no-store',signal:controller.signal});
    if(!response.ok)throw new Error('System endpoint responded with HTTP '+response.status);
    const data=await response.json() as Health;
    if(data.product!=='CREQOR')throw new Error('Unexpected health response.');
    setHealth(data);
   }finally{clearTimeout(timeout);}
   try{
    const leiResponse=await fetch('/api/lei/search?q=Apple%20Inc.',{cache:'no-store'});
    const leiData=await leiResponse.json();
    setLeiReachable(leiResponse.ok&&Array.isArray(leiData.results)&&leiData.results.length>0);
   }catch{setLeiReachable(false);}
  }catch(e){setHealth(null);setLeiReachable(false);setError(e instanceof Error?e.message:'Health check failed.');}
  finally{setWorking(false);}
 },[]);
 useEffect(()=>{void check()},[check]);
 const checks=[
  {name:'Application API',active:health?.status==='online',value:health?.status==='online'?'Reachable':'Cannot confirm',detail:'Checks that the CREQOR health route responds; not a full provider availability test.'},
  {name:'Company valuation engine',active:true,value:'Available',detail:'Deterministic methods run in the browser. Values are based on manually entered inputs.'},
  {name:'Draft evidence & exports',active:true,value:'Available',detail:'Source records and draft reports are stored and exported locally, without server authentication.'},
  {name:'Global LEI legal-entity discovery',active:leiReachable===true,value:leiReachable===null?'Checking source…':leiReachable?'GLEIF responding':'GLEIF unavailable',detail:'Live source test against the GLEIF reference-data API, not an audit or exchange-price verification.'},
  {name:'Official US SEC company search',active:health?.officialRegistryConfigured===true,value:health?.officialRegistryConfigured?'Configured':'Not configured',detail:'Official company records require the SEC_USER_AGENT connection and the remote data source to respond.'},
  {name:'Private DGX analyst',active:health?.privateIntelligenceConfigured===true,value:health?.privateIntelligenceConfigured?'Gateway configured':'Not configured',detail:'Server gateway must be enabled with model endpoint and access credentials before inference can work.'},
  {name:'Global market prices and published ratings',active:false,value:'Not connected',detail:'Licensed market data, identity resolution, methodology calibration and regulatory review remain required.'}
 ];
 return <div className="status-page">
  <section className="status-head"><div className="command-eyebrow"><span className="command-signal"/> CREQOR / OPERATIONS</div><h1>System readiness.<br/><em>Without the theatre.</em></h1><p>Current server configuration and visible product capabilities. A configured source is not proof of data quality or successful retrieval.</p><div className="status-head-actions"><button type="button" disabled={working} onClick={()=>void check()}>{working?'Checking…':'Check again ↻'}</button><Link href="/workbench">Open workbench ↗</Link></div>{error&&<p className="status-error" role="alert">{error}</p>}</section>
  <section className="status-list-section"><div className="status-intro"><span className="command-mini">LIVE CONFIGURATION</span><h2>Know what the platform can do.</h2><p>Shown directly from the configured application where available; it does not silently assume that upstream sources are online.</p></div>
   <div className="status-check-list">{checks.map(x=><article key={x.name}><span className={x.active?'status-ready-dot':'status-await-dot'}/><div><h3>{x.name}</h3><p>{x.detail}</p></div><strong>{working&&health===null&&x.name==='Application API'?'Checking…':x.value}</strong></article>)}</div>
  </section>
  <section className="status-foot"><h2>Financial data has to earn its place.</h2><p>We distinguish user-entered calculations, primary-source records and independently verified facts. Missing integrations cannot turn into invented prices or confident-sounding ratings.</p><Link href="/methodology">See source and valuation rules ↗</Link></section>
 </div>;
}
