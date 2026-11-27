'use client';
import {useState} from 'react';
import {useSession} from 'next-auth/react';
import Link from 'next/link';

/** Adds a company to the signed-in user's “My watchlist” (created on first use). */
export default function WatchButton({lei,name}:{lei:string;name:string}){
 const {status}=useSession();
 const [state,setState]=useState<'idle'|'saving'|'saved'|'error'>('idle');
 if(status!=='authenticated')return <Link className="lp-watch" href={'/signin?next=/lei/'+lei}>Sign in to watch</Link>;
 async function add(){
  setState('saving');
  try{
   const list=await fetch('/api/workspace/items?kind=watchlist',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject());
   const mine=(list.items as {itemId:string;title:string;version:number;payload:{leis?:string[]}}[]).find(i=>i.title==='My watchlist');
   const leis=[...new Set([...(mine?.payload.leis||[]),lei])].slice(0,500);
   const body={kind:'watchlist',title:'My watchlist',payload:{leis,labels:{...((mine?.payload as {labels?:object})?.labels||{}),[lei]:name}},...(mine?{version:mine.version}:{})};
   const r=await fetch(mine?'/api/workspace/items/'+mine.itemId:'/api/workspace/items',{method:mine?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   setState(r.ok?'saved':'error');
  }catch{setState('error');}
 }
 return <button type="button" className="lp-watch" onClick={()=>void add()} disabled={state==='saving'||state==='saved'} aria-live="polite">
  {state==='saved'?'✓ On your watchlist':state==='saving'?'Adding…':state==='error'?'Retry: add to watchlist':'+ Add to watchlist'}</button>;
}
