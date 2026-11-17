'use client';
import {useState} from 'react';
import Link from 'next/link';
type Entity={cik:string;name:string;ticker:string;exchange:string};
type Fact={key:string;label:string;value:number;unit:string;periodEnd:string;filed:string;form:string};
type Comparison={entity:Entity;facts:Fact[]};
const keys=['Revenue','NetIncome','OperatingIncome','CashFlow','Assets','Equity','Cash'];
const labels=['Annual revenue','Annual net income','Annual operating income','Annual operating cash flow','Total assets','Stockholders equity','Cash and cash equivalents'];
function asMoney(value:number){return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',notation:'compact',maximumFractionDigits:2}).format(value);}
async function findCompany(input:string):Promise<Entity>{
 const query=input.trim();if(query.length<2)throw new Error('Enter a ticker, full company name or SEC CIK.');
 const res=await fetch('/api/search?q='+encodeURIComponent(query));const data=await res.json();
 if(!res.ok)throw new Error(data.message||'Official registry unavailable.');
 const exact=(data.results as Entity[]).filter(x=>x.ticker.toLowerCase()===query.toLowerCase()||x.cik===query||x.name.toLowerCase()===query.toLowerCase());
 if(exact.length!==1)throw new Error('No unique exact entity match. Use the full SEC ticker or 10-digit CIK.');
 return exact[0];
}
async function load(query:string):Promise<Comparison>{
 const entity=await findCompany(query);
 const result=await fetch('/api/company/'+entity.cik+'/facts');const json=await result.json();
 if(!result.ok)throw new Error(json.error||'Unable to retrieve official financial facts.');
 return {entity,facts:json.facts||[]};
}
export default function CompareClient(){
 const [a,setA]=useState('');const [b,setB]=useState('');const [companies,setCompanies]=useState<[Comparison,Comparison]|null>(null);
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 async function compare(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');setCompanies(null);
  try{const results=await Promise.all([load(a),load(b)]);if(results[0].entity.cik===results[1].entity.cik)throw new Error('Choose two different companies.');setCompanies(results as [Comparison,Comparison]);}
  catch(err){setError(err instanceof Error?err.message:'Comparison unavailable.');}
  finally{setBusy(false);}
 }
 return <><div className="panel"><span className="micro-label">OFFICIAL FILINGS / SIDE-BY-SIDE</span><h3>Choose two SEC issuers.</h3><p style={{marginBottom:24}}>Enter exact US tickers or 10-digit CIKs. CREQOR compares the latest eligible annual figures from official SEC companyfacts; data periods may differ.</p><form onSubmit={compare}><div className="form-grid"><div className="field"><label htmlFor="compare-a">Company A</label><input id="compare-a" placeholder="Ticker or CIK" required value={a} onChange={e=>setA(e.target.value)}/></div><div className="field"><label htmlFor="compare-b">Company B</label><input id="compare-b" placeholder="Ticker or CIK" required value={b} onChange={e=>setB(e.target.value)}/></div></div><button className="primary-button" type="submit" disabled={busy} style={{marginTop:20}}>{busy?'Retrieving filings…':'Compare companies ↗'}</button></form>{error&&<div className="notice warning" style={{marginTop:19}}>{error}</div>}</div>
 {companies&&<div className="panel" style={{marginTop:24}}><span className="micro-label">SOURCE / SEC XBRL COMPANYFACTS</span><h3 style={{marginBottom:24}}>Financial comparison</h3><div className="table-wrap"><table className="data-table"><thead><tr><th>METRIC</th>{companies.map(c=><th key={c.entity.cik}><Link href={'/company/'+c.entity.cik}>{c.entity.name} ({c.entity.ticker}) ↗</Link></th>)}</tr></thead><tbody>{keys.map((key,i)=><tr key={key}><td>{labels[i]}</td>{companies.map(c=>{const f=c.facts.find(x=>x.key===key);return <td key={c.entity.cik}>{f?<><strong>{asMoney(f.value)}</strong><div style={{fontSize:'.63rem',color:'#718b7b',marginTop:5}}>Period {f.periodEnd} · Filed {f.filed}</div></>:'Unavailable'}</td>})}</tr>)}</tbody></table></div><div className="notice" style={{marginTop:20}}>Official issuer-reported values; filing dates and reporting periods may not align. No market cap, relative valuation, industry rank or recommendation is inferred.</div></div>}
 </>;
}