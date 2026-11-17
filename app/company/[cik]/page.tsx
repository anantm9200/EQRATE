import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getSecCompany} from '@/lib/sec';
export const revalidate=86400;
export async function generateMetadata({params}:{params:Promise<{cik:string}>}){
 const {cik}=await params;const entity=await getSecCompany(cik);
 return {title:entity?entity.name+' — company record':'Company record',description:'Official issuer identity from the US Securities and Exchange Commission. No unsupported financial claims.'};
}
export default async function CompanyPage({params}:{params:Promise<{cik:string}>}){
 const {cik}=await params;if(!/^\d{10}$/.test(cik))notFound();
 const entity=await getSecCompany(cik);
 if(!entity)return <><section className="page-hero"><span className="eyebrow">OFFICIAL RECORD</span><h1>Record unavailable.</h1><p>This company record could not be retrieved from the SEC. Official source integration may need configuration or the service may be unavailable.</p></section><section className="body-wrap"><Link className="primary-button" href="/explore">Return to search ↗</Link></section></>;
 const secUrl='https://www.sec.gov/edgar/browse/?CIK='+encodeURIComponent(cik);
 return <><section className="page-hero"><span className="eyebrow">COMPANY PROFILE / SEC REGISTRY</span><h1>{entity.name}</h1><p>Official US issuer identity, with source reference. Additional financial and market data is not assumed.</p><div className="chip-row">{entity.tickers.map(x=><span key={x} className="pill">{x}</span>)}<span className="pill">CIK {cik}</span></div></section>
 <section className="body-wrap"><div className="content-grid">
 <div className="panel"><span className="micro-label">VERIFIABLE ENTITY DATA</span><h3>Official identity</h3><div className="table-wrap"><table className="data-table"><tbody><tr><td>Company name</td><td>{entity.name}</td></tr><tr><td>SEC CIK</td><td>{entity.cik}</td></tr><tr><td>Tickers</td><td>{entity.tickers.join(', ')||'Not available'}</td></tr><tr><td>Exchanges</td><td>{entity.exchanges.join(', ')||'Not available'}</td></tr><tr><td>Industry classification</td><td>{entity.sicDescription||'Not available'}</td></tr><tr><td>Incorporation state</td><td>{entity.stateOfIncorporation||'Not available'}</td></tr><tr><td>Fiscal year end</td><td>{entity.fiscalYearEnd||'Not available'}</td></tr></tbody></table></div><a className="primary-button" href={secUrl} target="_blank" rel="noopener noreferrer" style={{marginTop:22}}>View official SEC filings ↗</a></div>
 <div className="panel dark"><span className="micro-label">VALUATION / EVIDENCE CHECK</span><h3>Market capitalisation</h3><div className="result-big" style={{fontSize:'1.65rem'}}>Not established</div><p>No linked licensed market-price feed and matching share-count data are available here. CREQOR will not infer market capitalisation from a ticker or name alone.</p><div className="panel-divider" style={{borderColor:'rgba(200,250,210,.17)'}}/><h3>Company Intelligence Score</h3><p>Not issued. Minimum financial, governance and source-quality evidence thresholds have not been met.</p></div>
 </div><div className="notice" style={{marginTop:22}}>Source: SEC issuer submissions for CIK {cik}. Retrieved from an official SEC endpoint at request time or its server-side cache. This profile does not claim independent validation of all issuer assertions.</div><div className="button-row" style={{marginTop:25}}><Link className="primary-button" href="/lab">Build a scenario ↗</Link><Link className="secondary-button" href="/explore">Search again ↗</Link></div></section></>;
}