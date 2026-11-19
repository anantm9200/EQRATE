'use client';
import Link from 'next/link';
import {useState} from 'react';

type Node={lei:string;name:string|null;country:string|null;registrationStatus:string|null;isSubject:boolean;isUltimateParent:boolean};
type Group={ultimateParent:string;membersReported:number;membersShown:number;nodes:Node[];edges:{child:string;parent:string}[];
 countries:{country:string;count:number}[];caveat:string};
/** Loads the reported accounting-consolidation group on demand and renders it as an indented tree. */
export default function CorporateGroup({lei,members}:{lei:string;members:number}){
 const [group,setGroup]=useState<Group|null>(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 async function load(){
  setBusy(true);setError('');
  try{const r=await fetch('/api/engine/lei/'+lei+'/group',{cache:'no-store'});if(!r.ok)throw new Error();setGroup(await r.json() as Group);}
  catch{setError('Group data is temporarily unavailable.');}
  finally{setBusy(false);}
 }
 if(!group)return <div className="lp-group-cta">
  <button type="button" onClick={()=>void load()} disabled={busy}>{busy?'Loading group…':'Show corporate group'+(members?' ('+members.toLocaleString('en-IN')+' reported members)':'')}</button>
  {error&&<p role="alert" className="cq-engine-error">{error}</p>}
 </div>;
 const byLei=new Map(group.nodes.map(n=>[n.lei,n]));
 const kids=new Map<string,string[]>();
 const hasParent=new Set<string>();
 for(const e of group.edges){if(!byLei.has(e.child)||!byLei.has(e.parent))continue;kids.set(e.parent,[...(kids.get(e.parent)||[]),e.child]);hasParent.add(e.child);}
 const rootChildren=group.nodes.filter(n=>!n.isUltimateParent&&!hasParent.has(n.lei)).map(n=>n.lei);
 kids.set(group.ultimateParent,[...(kids.get(group.ultimateParent)||[]),...rootChildren.filter(c=>!(kids.get(group.ultimateParent)||[]).includes(c))]);
 const seen=new Set<string>();
 const render=(id:string,depth:number):React.ReactNode=>{
  if(seen.has(id)||depth>12)return null;seen.add(id);
  const n=byLei.get(id);const children=(kids.get(id)||[]).sort((a,b)=>(byLei.get(a)?.name||'').localeCompare(byLei.get(b)?.name||''));
  return <li key={id} className={n?.isSubject?'is-subject':''}>
   <span className="lp-tree-node">{n?.isUltimateParent&&<span className="in-pill">Ultimate parent</span>}
    {n?.isSubject&&<span className="in-pill">This entity</span>}
    {n?.name?<Link href={'/lei/'+id}>{n.name}</Link>:<span>{id} (not in index)</span>}
    <small>{[n?.country,n?.registrationStatus].filter(Boolean).join(' · ')}</small></span>
   {children.length>0&&<ul>{children.map(c=>render(c,depth+1))}</ul>}
  </li>;
 };
 return <div className="lp-group">
  <p className="cq-engine-note">{group.membersReported.toLocaleString('en-IN')} entities report this ultimate parent{group.membersShown<group.membersReported?` (first ${group.membersShown} shown)`:''}.
   Countries: {group.countries.slice(0,8).map(c=>c.country+' '+c.count).join(' · ')}</p>
  <ul className="lp-tree">{render(group.ultimateParent,0)}</ul>
  <p className="cq-engine-note">{group.caveat}</p>
 </div>;
}
