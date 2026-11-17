'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {getLocalWatchlist,saveLocalWatchlist,type WatchItem} from '@/components/watchlist-button';
export default function WatchlistClient(){
 const [items,setItems]=useState<WatchItem[]>([]);const [ready,setReady]=useState(false);
 useEffect(()=>{setItems(getLocalWatchlist());setReady(true)},[]);
 function remove(cik:string){const next=items.filter(x=>x.cik!==cik);setItems(next);saveLocalWatchlist(next);}
 return <div className="panel"><span className="micro-label">PERSONAL WORKSPACE / THIS BROWSER</span><h3>My companies</h3><p style={{marginBottom:25}}>Saved locally in this browser only. No account, cloud sync, alerts or investment portfolio tracking is enabled.</p>{items.length?<div className="table-wrap"><table className="data-table"><thead><tr><th>COMPANY</th><th>TICKER</th><th>SEC CIK</th><th></th></tr></thead><tbody>{items.map(item=><tr key={item.cik}><td><Link href={'/company/'+item.cik} style={{fontWeight:600}}>{item.name} ↗</Link></td><td>{item.ticker}</td><td>{item.cik}</td><td><button className="secondary-button" onClick={()=>remove(item.cik)}>Remove</button></td></tr>)}</tbody></table></div>:<div className="empty-state"><h3>{ready?'No saved companies yet.':'Loading local list…'}</h3><p>Open an issuer record from the company explorer and add it to this list.</p><Link className="primary-button" href="/explore" style={{marginTop:18}}>Find companies ↗</Link></div>}</div>;
}