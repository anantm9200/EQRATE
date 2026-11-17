'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect,useState} from 'react';
import Brand from '@/components/brand';
const nav=[
 {href:'/',title:'Overview',index:'01'},
 {href:'/explore',title:'Company explorer',index:'02'},
 {href:'/lab',title:'Valuation lab',index:'03'},
 {href:'/intelligence',title:'Market intelligence',index:'04'},
 {href:'/analyst',title:'AI analyst',index:'05'},
 {href:'/research',title:'Research centre',index:'06'},
 {href:'/verification',title:'Verification',index:'07'},
 {href:'/methodology',title:'Methodology',index:'08'}
];
export default function SiteShell({children}:{children:React.ReactNode}){
 const [open,setOpen]=useState(false);const path=usePathname();
 useEffect(()=>{setOpen(false)},[path]);
 useEffect(()=>{const previous=document.body.style.overflow;document.body.style.overflow=open?'hidden':previous;return ()=>{document.body.style.overflow=previous}},[open]);
 return <>
  <header className="site-header">
    <Brand/>
    <div className="header-right"><span className="header-caption"><span className="status-dot"/> RESEARCH / INTELLIGENCE / VALUATION</span>
    <Link className="header-explore" href="/explore">Explore companies <span aria-hidden="true">↗</span></Link>
    <button className={'menu-trigger'+(open?' active':'')} onClick={()=>setOpen(!open)} aria-label={open?'Close menu':'Open full screen menu'} aria-expanded={open} aria-controls="creqor-menu">
      <span>{open?'CLOSE':'MENU'}</span><span className="menu-bars"><i/><i/></span>
    </button></div>
  </header>
  <div className={'menu-overlay'+(open?' open':'')} id="creqor-menu" aria-hidden={!open}>
   <div className="menu-glow"/><div className="menu-inner"><div className="menu-kicker">NAVIGATE CREQOR <span> / 08 DESTINATIONS</span></div>
     <nav className="menu-links">{nav.map(item=><Link key={item.href} href={item.href} tabIndex={open?0:-1} className={path===item.href?'selected':''}><span className="menu-number">{item.index}</span><span>{item.title}</span><span className="menu-arrow">↗</span></Link>)}</nav>
     <div className="menu-bottom"><span>EST. FOR EVIDENCE</span><span>ANY COMPANY. EVERY ANSWER EXPLAINED.</span></div>
   </div>
  </div>
  <main id="main-content">{children}</main>
  <section className="prefooter"><div><span className="eyebrow">A BETTER STANDARD OF KNOWING</span><h2>Confidence begins<br/><em>with a question.</em></h2></div><Link href="/explore" className="round-link" aria-label="Explore companies">↗</Link></section>
  <footer className="footer">
    <div className="footer-top"><Brand/><span>Financial intelligence built on evidence, not assumptions.</span></div>
    <div className="footer-grid"><div className="footer-links"><Link href="/explore">Explore</Link><Link href="/lab">Valuation lab</Link><Link href="/analyst">AI analyst</Link><Link href="/methodology">Methodology</Link></div><div className="footer-links"><Link href="/research">Research</Link><Link href="/verification">Verification</Link><Link href="/intelligence">Intelligence</Link><Link href="/api/health">System status</Link></div><p>CREQOR provides research tools, not investment advice or regulated credit ratings. Values and conclusions require traceable evidence.</p></div>
    <div className="footer-bottom"><span>© {new Date().getFullYear()} CREQOR. INDEPENDENT BY DESIGN.</span><span>RESEARCH / RATE / REASON</span></div>
  </footer>
 </>;
}