'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {signOut} from 'next-auth/react';
import WatchAlerts from './watch-alerts';
import MfaPanel from './mfa-panel';

type Item={itemId:string;kind:string;title:string;subjectLei:string|null;payload:Record<string,unknown>;version:number;updatedAt:string};
const KIND_LABEL:Record<string,string>={watchlist:'Watchlists',assessment:'Assessments',valuation:'Valuations',note:'Notes'};

export default function AccountPanel(){
 const [items,setItems]=useState<Item[]|null>(null);const [error,setError]=useState('');
 const [confirm,setConfirm]=useState(false);const [pw,setPw]=useState('');const [delError,setDelError]=useState('');
 async function load(){
  const r=await fetch('/api/workspace/items',{cache:'no-store'});
  if(!r.ok){setError((await r.json().catch(()=>null))?.error||'Workspace unavailable.');setItems([]);return;}
  setItems((await r.json()).items);
 }
 useEffect(()=>{void load();},[]);
 async function remove(id:string){
  const r=await fetch('/api/workspace/items/'+id,{method:'DELETE'});
  if(r.ok)setItems(x=>x?.filter(i=>i.itemId!==id)||null);else setError('Could not remove the item.');
 }
 async function deleteAccount(e:React.FormEvent){
  e.preventDefault();setDelError('');
  const r=await fetch('/api/account/delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pw})});
  if(!r.ok){setDelError(r.status===403?'Password not recognised.':'Account could not be deleted; nothing was changed.');return;}
  window.location.assign('/');
 }
 const groups=Object.keys(KIND_LABEL).map(k=>({k,list:(items||[]).filter(i=>i.kind===k)}));
 return <>
  <section className="ac-section" aria-labelledby="ac-alerts"><h2 id="ac-alerts">Watchlist alerts</h2><WatchAlerts/></section>
  <section className="ac-section" aria-labelledby="ac-items">
   <h2 id="ac-items">Saved research</h2>
   {error&&<p role="alert" className="ac-error">{error}</p>}
   {items===null?<p className="cq-engine-note">Loading your workspace…</p>:items.length===0?
    <p className="cq-engine-note">Nothing saved yet. Use “Add to watchlist” on any <Link href="/india">company profile</Link>.</p>:
    groups.filter(g=>g.list.length).map(g=><div key={g.k} className="ac-group"><h3>{KIND_LABEL[g.k]}</h3>
     <ul className="in-results">{g.list.map(i=><li key={i.itemId} className="ac-item">
      <div><strong>{i.title}</strong><span className="in-result-meta">Updated {i.updatedAt.slice(0,10)} · version {i.version}</span>
       {g.k==='watchlist'&&Array.isArray(i.payload.leis)&&<span className="in-result-ids">{(i.payload.leis as string[]).slice(0,20).map(l=><Link key={l} href={'/lei/'+l}>{l}</Link>)}</span>}
       {i.subjectLei&&<Link href={'/lei/'+i.subjectLei}>Open company profile ↗</Link>}</div>
      <button type="button" onClick={()=>void remove(i.itemId)} aria-label={'Remove '+i.title}>Remove</button></li>)}</ul></div>)}
  </section>
  <section className="ac-section" aria-labelledby="ac-mfa"><h2 id="ac-mfa">Two-factor sign-in</h2><MfaPanel/></section>
  <section className="ac-section" aria-labelledby="ac-data">
   <h2 id="ac-data">Your data</h2>
   <div className="ac-actions"><a href="/api/account/export" download>Download all my data (JSON)</a>
    <button type="button" onClick={()=>void signOut({callbackUrl:'/'})}>Sign out</button></div>
   {!confirm?<button type="button" className="ac-danger" onClick={()=>setConfirm(true)}>Delete my account…</button>:
    <form className="ac-form ac-delete" onSubmit={deleteAccount}>
     <p>This permanently deletes your account, your personal workspace and everything saved in it. It cannot be undone.</p>
     <label>Confirm with your password<input type="password" value={pw} onChange={e=>setPw(e.target.value)} autoComplete="current-password" required/></label>
     {delError&&<p role="alert" className="ac-error">{delError}</p>}
     <div className="ac-actions"><button type="submit" className="ac-danger">Delete permanently</button><button type="button" onClick={()=>{setConfirm(false);setPw('');}}>Cancel</button></div>
    </form>}
  </section>
 </>;
}
