'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {usePathname,useRouter} from 'next/navigation';
const items=[
 {href:'/workbench',name:'Company workbench',subtitle:'Build listed or private valuations',keys:'assess company valuation report model founder'},
 {href:'/explore',name:'Discover a company',subtitle:'Search SEC issuer identities',keys:'find ticker cik search explore'},
 {href:'/lab',name:'DCF laboratory',subtitle:'Cash flows, scenarios and sensitivity',keys:'growth wacc terminal discount dcf finance'},
 {href:'/compare',name:'Company comparison',subtitle:'Compare available SEC financial facts',keys:'peers ratio compare'},
 {href:'/watchlist',name:'My watchlist',subtitle:'Locally saved issuer records',keys:'saved company list'},
 {href:'/verification',name:'Evidence verification',subtitle:'Claim-by-claim provenance standards',keys:'source review proof'},
 {href:'/research',name:'Research centre',subtitle:'Independent investigation approach',keys:'analyst process'},
 {href:'/intelligence',name:'Market intelligence',subtitle:'Business and event analysis framework',keys:'sector market'},
 {href:'/analyst',name:'Private AI analyst',subtitle:'Requires your DGX gateway configuration',keys:'ai dgx model private'},
 {href:'/methodology',name:'Methodology & disclosures',subtitle:'Valuation rules and limitations',keys:'formula governance'},
 {href:'/status',name:'System readiness',subtitle:'Check which integrations are configured',keys:'uptime api health service'},
 {href:'/',name:'CREQOR home',subtitle:'Interactive valuation launchpad',keys:'overview dashboard homepage'}
];
export default function CommandPalette(){
 const router=useRouter();const path=usePathname();
 const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[index,setIndex]=useState(0);
 const input=useRef<HTMLInputElement>(null);
 const matches=useMemo(()=>items.filter(x=>(x.name+' '+x.subtitle+' '+x.keys).toLowerCase().includes(query.trim().toLowerCase())).slice(0,12),[query]);
 useEffect(()=>{setOpen(false)},[path]);
 useEffect(()=>{
  function key(e:KeyboardEvent){
   if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setOpen(v=>!v);}
   if(e.key==='Escape')setOpen(false);
  }
  window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
 },[]);
 useEffect(()=>{
  if(!open)return;
  const previous=document.body.style.overflow;document.body.style.overflow='hidden';
  const t=requestAnimationFrame(()=>input.current?.focus());
  return()=>{cancelAnimationFrame(t);document.body.style.overflow=previous};
 },[open]);
 function move(url:string){setOpen(false);setQuery('');setIndex(0);router.push(url);}
 function onKey(e:React.KeyboardEvent<HTMLInputElement>){
  if(e.key==='ArrowDown'){e.preventDefault();setIndex(i=>Math.min(i+1,matches.length-1));}
  if(e.key==='ArrowUp'){e.preventDefault();setIndex(i=>Math.max(i-1,0));}
  if(e.key==='Enter'&&matches[Math.min(index,matches.length-1)]){e.preventDefault();move(matches[Math.min(index,matches.length-1)].href);}
 }
 return <>
  <button className="command-open" type="button" onClick={()=>{setOpen(true);setQuery('');setIndex(0)}} aria-label="Search CREQOR tools"><span>Search tools</span><kbd>⌘ K</kbd></button>
  {open&&<div className="command-palette-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}>
    <section className="command-palette-dialog" role="dialog" aria-modal="true" aria-label="Navigate CREQOR">
     <div className="command-palette-search"><span aria-hidden="true">⌕</span><input ref={input} value={query} onChange={e=>{setQuery(e.target.value);setIndex(0)}} onKeyDown={onKey} aria-label="Find a tool or page" placeholder="What do you want to do?"/><button type="button" onClick={()=>setOpen(false)}>ESC</button></div>
     <div className="command-palette-results"><span className="command-palette-kicker">TOOLS AND RESEARCH / {matches.length} RESULTS</span>
      {matches.length===0?<p className="command-palette-empty">No matching tool. Try “valuation”, “company”, “evidence”, or “status”.</p>:matches.map((x,i)=><button type="button" key={x.href} onMouseEnter={()=>setIndex(i)} onClick={()=>move(x.href)} className={'command-palette-result'+(index===i?' selected':'')}>
       <span className="command-palette-icon">{String(i+1).padStart(2,'0')}</span>
       <span><strong>{x.name}</strong><small>{x.subtitle}</small></span><span aria-hidden="true" className="command-palette-arrow">↗</span>
      </button>)}
     </div>
     <div className="command-palette-foot"><span>↑ ↓ NAVIGATE · ENTER OPEN · ESC CLOSE</span><span>CREQOR / QUICK ACCESS</span></div>
    </section>
   </div>}
 </>;
}
