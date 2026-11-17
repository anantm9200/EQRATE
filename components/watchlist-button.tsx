'use client';
import {useEffect,useState} from 'react';
const STORE='creqor-watchlist-v1';
export type WatchItem={cik:string;name:string;ticker:string};
export function getLocalWatchlist():WatchItem[]{try{const rows=JSON.parse(localStorage.getItem(STORE)||'[]');return Array.isArray(rows)?rows.filter(x=>typeof x?.cik==='string'&&typeof x?.name==='string'&&typeof x?.ticker==='string').slice(0,100):[];}catch{return [];}}
export function saveLocalWatchlist(items:WatchItem[]){localStorage.setItem(STORE,JSON.stringify(items.slice(0,100)));}
export default function WatchlistButton({item}:{item:WatchItem}){
 const [saved,setSaved]=useState(false);const [ready,setReady]=useState(false);
 useEffect(()=>{setSaved(getLocalWatchlist().some(x=>x.cik===item.cik));setReady(true);},[item.cik]);
 function toggle(){try{const existing=getLocalWatchlist();const next=saved?existing.filter(x=>x.cik!==item.cik):[...existing.filter(x=>x.cik!==item.cik),item];saveLocalWatchlist(next);setSaved(!saved);}catch{}}
 return <button type="button" className="secondary-button" disabled={!ready} onClick={toggle} aria-pressed={saved}>{saved?'✓ Saved locally':'＋ Add to watchlist'}</button>;
}