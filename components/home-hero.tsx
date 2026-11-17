import Link from 'next/link';
import CompanySearch from '@/components/search';
import HeroVisual from '@/components/hero-visual';

export default function HomeHero(){
 return <section className="c3-hero" aria-labelledby="creqor-hero-title">
   <div className="c3-hero-backdrop" aria-hidden="true"/>
   <div className="c3-hero-main">
    <div className="c3-hero-message">
      <div className="c3-eyebrow"><span className="c3-eyebrow-pip"/><span>INDEPENDENT COMPANY INTELLIGENCE</span><span className="c3-eyebrow-rule"/></div>
      <h1 id="creqor-hero-title">Know the company.<br/><em>Question the value.</em></h1>
      <p className="c3-lead">Discover the business behind the numbers. Trace the evidence. Test every assumption.</p>
      <div className="c3-hero-search">
        <div className="c3-search-top"><span>START WITH A COMPANY</span><Link href="/explore">Open explorer <span aria-hidden="true">↗</span></Link></div>
        <CompanySearch/>
      </div>
    </div>
    <div className="c3-hero-graphic"><HeroVisual/></div>
   </div>
   <div className="c3-hero-bottom">
     <div className="c3-hero-principles"><span><i/> DISCOVER</span><span><i/> VERIFY</span><span><i/> VALUE</span></div>
     <Link href="#capabilities" className="c3-scroll-note">EXPLORE THE PLATFORM <span aria-hidden="true">↓</span></Link>
   </div>
 </section>;
}