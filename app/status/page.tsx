'use client';
import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
type Health={product:string;status:string;officialRegistryConfigured:boolean;privateIntelligenceConfigured:boolean};
type CatalogueStatus={configured:boolean;status:'ready'|'unconfigured'|'unavailable';indexed:number;updatedAt:string|null;note:string};
type PublicCoverage={referenceRecords:number|null;asOf:string|null;locallyIndexed:number;locallyIndexedOperational:boolean};
type EngineStatus={connected:boolean;status:string;counts:null|{leiEntities:number;secTickerAssociations:number;secFinancialFacts:number;researchRuns:number};aiConfigured?:boolean;note:string};
export default function StatusPage(){
 const [health,setHealth]=useState<Health|null>(null);
 const [error,setError]=useState('');
 const [working,setWorking]=useState(true);
 const [leiReachable,setLeiReachable]=useState<boolean|null>(null);
 const [catalogue,setCatalogue]=useState<CatalogueStatus|null>(null);
 const [coverage,setCoverage]=useState<PublicCoverage|null>(null);
 const [engine,setEngine]=useState<EngineStatus|null>(null);
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
   try{
    const response=await fetch('/api/catalogue/status',{cache:'no-store'});
    if(response.ok)setCatalogue(await response.json() as CatalogueStatus);
    else setCatalogue(null);
   }catch{setCatalogue(null);}
   try{
    const response=await fetch('/api/public-records/coverage',{cache:'no-store'});
    if(response.ok)setCoverage(await response.json() as PublicCoverage);
    else setCoverage(null);
   }catch{setCoverage(null);}
   try{
    const response=await fetch('/api/engine/status',{cache:'no-store'});
    if(response.ok)setEngine(await response.json() as EngineStatus);
    else setEngine(null);
   }catch{setEngine(null);}
  }catch(e){setHealth(null);setLeiReachable(false);setCatalogue(null);setError(e instanceof Error?e.message:'Health check failed.');}
  finally{setWorking(false);}
 },[]);
 useEffect(()=>{void check()},[check]);
 const checks=[
  {name:'Application API',active:health?.status==='online',value:health?.status==='online'?'Reachable':'Cannot confirm',detail:'Checks that the CREQOR health route responds; not a full provider availability test.'},
  {name:'Company valuation engine',active:true,value:'Available',detail:'Deterministic methods run in the browser. Values are based on manually entered inputs.'},
  {name:'Research desk, draft evidence & exports',active:true,value:'Available',detail:'Source records and draft reports are stored and exported locally, without server authentication.'},
  {name:'Global LEI legal-entity discovery',active:leiReachable===true,value:leiReachable===null?'Checking source…':leiReachable?'GLEIF responding':'GLEIF unavailable',detail:'Live source test against the GLEIF reference-data API, not an audit or exchange-price verification.'},
  {name:'Official GLEIF public-index coverage',active:coverage?.referenceRecords!==null&&coverage?.referenceRecords!==undefined,
   value:coverage?.referenceRecords?new Intl.NumberFormat('en-US').format(coverage.referenceRecords)+' source records':'Not confirmed',
   detail:'Count reported by the latest GLEIF Golden Copy publication. It describes the worldwide official register, NOT companies already stored by CREQOR.'},
  {name:'Persistent source-indexed company catalogue',active:catalogue?.status==='ready',
   value:catalogue?.status==='ready'?new Intl.NumberFormat('en-US').format(catalogue.indexed)+' records':catalogue?.status==='unavailable'?'Database unavailable':'Not connected',
   detail:'PostgreSQL-backed versioned copies of official GLEIF records. Production requires a reviewed migration and DATABASE_URL; indexing is not financial verification.'},
  {name:'Official US SEC company search',active:health?.officialRegistryConfigured===true,value:health?.officialRegistryConfigured?'Configured':'Not configured',detail:'Official company records require the SEC_USER_AGENT connection and the remote data source to respond.'},
  {name:'Private DGX company and financial index',
   active:engine?.connected===true,
   value:engine?.connected&&engine.counts?
    new Intl.NumberFormat('en-US').format(engine.counts.leiEntities)+' indexed LEIs':'Not connected',
   detail:'Private DGX PostgreSQL record count verified through the authenticated engine. Source coverage is not local storage.'},
  {name:'Private DGX financial history',
   active:engine?.connected===true&&Boolean(engine.counts?.secFinancialFacts),
   value:engine?.connected&&engine.counts?
    new Intl.NumberFormat('en-US').format(engine.counts.secFinancialFacts)+' imported facts':'Not connected',
   detail:'SEC CIK/XBRL filings retrieved and stored on the DGX; missing facts are not zeros.'},
  {name:'Private DGX model inference',
   active:engine?.connected===true&&engine?.aiConfigured===true,
   value:engine?.connected&&engine.aiConfigured?'Private model configured':'Not connected',
   detail:'Optional vLLM inference on locally bound ports. Availability is checked only when an analysis is requested; model identity and hardware must be verified on the DGX.'},
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
