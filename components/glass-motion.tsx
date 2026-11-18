'use client';
import {usePathname} from 'next/navigation';
import {useEffect,useRef} from 'react';

/** Progressive visual enhancement. The content remains usable with JS disabled or reduced motion. */
export default function GlassMotion(){
 const pathname=usePathname();
 const progress=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame=0;
  const update=()=>{
   if(frame)return;
   frame=window.requestAnimationFrame(()=>{
    frame=0;
    const max=document.documentElement.scrollHeight-window.innerHeight;
    if(progress.current)progress.current.style.transform='scaleX('+String(max>0?Math.min(1,Math.max(0,window.scrollY/max)):0)+')';
   });
  };
  window.addEventListener('scroll',update,{passive:true});
  window.addEventListener('resize',update);
  update();

  if(reduced.matches)return ()=>{
   window.removeEventListener('scroll',update);window.removeEventListener('resize',update);
   if(frame)window.cancelAnimationFrame(frame);
  };
  const reveals=Array.from(document.querySelectorAll<HTMLElement>(
   '.ux-section-heading,.ux-workflow-card,.ux-method-intro,.ux-method-steps>div,.ux-distinction-grid article,.ux-integrity-copy,.ux-integrity-list,.rd-index-head,.wk-dashboard-header,.cx-intro,.v2-page-hero,.wk-page-hero'
  ));
  const observer='IntersectionObserver' in window?new IntersectionObserver(entries=>{
   entries.forEach(entry=>{
    if(entry.isIntersecting){entry.target.classList.add('fx-visible');observer?.unobserve(entry.target);}
   });
  },{threshold:.08,rootMargin:'0px 0px -24px 0px'}):null;
  for(const node of reveals){
   node.classList.add('fx-reveal');
   if(observer)observer.observe(node);else node.classList.add('fx-visible');
  }
  document.documentElement.classList.add('fx-motion-ready');
  // Pointer-tracked gradients and 3D transforms were forcing repeated glass repaints
  // on every cursor movement, making hover targets appear to jump. Static CSS
  // highlights now provide the same affordance without JS layout work.
  return ()=>{
   observer?.disconnect();
   reveals.forEach(node=>node.classList.remove('fx-reveal','fx-visible'));
   document.documentElement.classList.remove('fx-motion-ready');
   window.removeEventListener('scroll',update);window.removeEventListener('resize',update);
   if(frame)window.cancelAnimationFrame(frame);
  };
 },[pathname]);
 return <div className="fx-scroll-progress" aria-hidden="true" ref={progress}/>;
}
