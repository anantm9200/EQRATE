import Link from 'next/link';
export default function Brand({light=false}:{light?:boolean}){
 return <Link href="/" className={'brand'+(light?' light':'')} aria-label="CREQOR home">
 <svg className="brand-mark" viewBox="0 0 50 50" fill="none" aria-hidden="true">
   <path d="M25 3 46 15v20L25 47 4 35V15L25 3Z" stroke="currentColor" strokeWidth="2.5"/>
   <path d="m13 19 12-7 12 7v12l-12 7-12-7V19Z" fill="currentColor" fillOpacity=".16" stroke="currentColor" strokeWidth="2"/>
   <path d="m17 25 6 6 12-13" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
 </svg><span className="brand-word">CREQOR<span className="brand-spark">.</span></span>
 </Link>;
}