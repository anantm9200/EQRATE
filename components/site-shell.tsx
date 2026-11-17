'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect,useRef,useState} from 'react';
import Brand from '@/components/brand';
import CommandPalette from '@/components/command-palette';

const primary=[
  {href:'/workbench',label:'Workbench'},
  {href:'/desk',label:'Research desk'},
  {href:'/explore',label:'Explore'},
  {href:'/lab',label:'Valuation lab'},
  {href:'/compare',label:'Compare'}
];
const menu=[
  {href:'/',label:'Overview',index:'01',detail:'A better way to know'},
  {href:'/workbench',label:'Company workbench',index:'02',detail:'Build a report from financial evidence'},
  {href:'/desk',label:'Research desk',index:'03',detail:'Compare and organise saved assessments'},
  {href:'/explore',label:'Company explorer',index:'03',detail:'Start with the right identity'},
  {href:'/lab',label:'Valuation lab',index:'04',detail:'Test the assumptions'},
  {href:'/compare',label:'Compare companies',index:'05',detail:'Understand the differences'},
  {href:'/analyst',label:'AI analyst',index:'06',detail:'Question the evidence'},
  {href:'/intelligence',label:'Market intelligence',index:'07',detail:'See the bigger picture'},
  {href:'/research',label:'Research centre',index:'08',detail:'The work behind the numbers'},
  {href:'/verification',label:'Verification',index:'09',detail:'Separate claims from proof'},
  {href:'/methodology',label:'Methodology',index:'10',detail:'Our standards and limitations'},
  {href:'/watchlist',label:'My watchlist',index:'11',detail:'Return to your research'},
  {href:'/status',label:'System readiness',index:'12',detail:'Check configured integrations'}
];
export default function SiteShell({children}:{children:React.ReactNode}) {
 const path=usePathname();const [open,setOpen]=useState(false);const menuButton=useRef<HTMLButtonElement>(null);const firstLink=useRef<HTMLAnchorElement>(null);
 useEffect(()=>{setOpen(false)},[path]);
 useEffect(()=>{
  if(!open)return;
  const previous=document.body.style.overflow;document.body.style.overflow='hidden';
  firstLink.current?.focus();
  const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape'){setOpen(false);menuButton.current?.focus();}};
  window.addEventListener('keydown',onKey);
  return()=>{document.body.style.overflow=previous;window.removeEventListener('keydown',onKey)};
 },[open]);
 return <>
  <a className="skip-link" href="#main-content">Skip to content</a>
  <header className="site-header v2-header">
   <Brand/>
   <nav className="v2-top-nav" aria-label="Primary navigation">{primary.map(item=><Link href={item.href} key={item.href} className={path===item.href?'is-current':''}>{item.label}</Link>)}</nav>
   <div className="v2-header-actions">
    <CommandPalette/>
    <button ref={menuButton} className={'v2-menu-button'+(open?' is-open':'')} onClick={()=>setOpen(x=>!x)} aria-expanded={open} aria-controls="creqor-menu" aria-label={open?'Close navigation':'Open full-screen navigation'}>
      <span className="v2-menu-text">{open?'Close':'Menu'}</span><span className="v2-menu-icon"><i/><i/></span>
    </button>
   </div>
  </header>
  <div className={'v2-menu-panel'+(open?' is-open':'')} id="creqor-menu" aria-hidden={!open}>
    <div className="v2-menu-heading"><span className="eyebrow">Navigation / CREQOR</span><span className="v2-menu-heading-right">Research. Verify. Value.</span></div>
    <nav className="v2-menu-grid" aria-label="Full navigation">
      {menu.map((item,i)=><Link ref={i===0?firstLink:undefined} tabIndex={open?0:-1} onClick={()=>setOpen(false)} href={item.href} key={item.href} className={'v2-menu-item'+(path===item.href?' is-current':'')}>
        <span className="v2-menu-index">{item.index}</span><span className="v2-menu-name">{item.label}<small>{item.detail}</small></span><span className="v2-menu-arrow">↗</span>
      </Link>)}
    </nav>
    <div className="v2-menu-foot"><span>Independent by design.</span><span>Every number explained.</span></div>
  </div>
  <main id="main-content">{children}</main>
  <section className="v2-prefooter">
    <div className="v2-prefooter-copy"><span className="eyebrow">MAKE A MORE INFORMED DECISION</span><h2>Don't just know the number.<br/><em>Know what stands behind it.</em></h2></div>
    <Link href="/workbench" className="v2-cta-round" aria-label="Start a company assessment">↗</Link>
    <div className="v2-prefooter-rings" aria-hidden="true"/>
  </section>
  <footer className="v2-footer">
    <div className="v2-footer-top"><Brand/><p>Company intelligence built on evidence.<br/>Every number should withstand a second look.</p></div>
    <div className="v2-footer-middle"><div><span className="v2-footer-label">PLATFORM</span><Link href="/workbench">Company workbench</Link><Link href="/desk">Research desk</Link><Link href="/explore">Company explorer</Link><Link href="/lab">Valuation laboratory</Link><Link href="/compare">Compare companies</Link><Link href="/analyst">AI analyst</Link></div>
    <div><span className="v2-footer-label">RESEARCH</span><Link href="/intelligence">Market intelligence</Link><Link href="/research">Research centre</Link><Link href="/methodology">Methodology</Link><Link href="/verification">Verification</Link></div>
    <div className="v2-footer-statement"><span className="v2-footer-label">INDEPENDENCE MATTERS</span><p>CREQOR is a research and modelling platform—not a credit rating agency or an investment adviser. Estimates are not observable market prices. Claims and conclusions need traceable sources.</p></div></div>
    <div className="v2-footer-bottom"><span>© {new Date().getFullYear()} CREQOR</span><span>Designed for clarity. Built for scrutiny.</span><Link href="/status">System status ↗</Link></div>
  </footer>
 </>;
}