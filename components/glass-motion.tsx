'use client';
import {usePathname} from 'next/navigation';
import {useEffect,useRef} from 'react';

/** Progressive visual enhancement. The content remains usable with JS disabled or reduced motion. */
export default function GlassMotion(){
 const pathname=usePathname();
 const progress=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const pointer=window.matchMedia('(hover: hover) and (pointer: fine)');
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
  const dispose:Array<()=>void>=[];
  if(pointer.matches){
   const targets=Array.from(document.querySelectorAll<HTMLElement>(
    '.ux-preview,.ux-workflow-card,.ux-distinction-grid article,.wk-panel,.ic-block,.rd-entry,.cx-card'
   ));
   for(const node of targets){
    let lastFrame=0;
    const move=(event:PointerEvent)=>{
     if(event.pointerType==='touch'||lastFrame)return;
     const rect=node.getBoundingClientRect();
     const x=Math.max(0,Math.min(100,(event.clientX-rect.left)/rect.width*100));
     const y=Math.max(0,Math.min(100,(event.clientY-rect.top)/rect.height*100));
     lastFrame=window.requestAnimationFrame(()=>{
      lastFrame=0;
      node.style.setProperty('--fx-x',x.toFixed(1)+'%');
      node.style.setProperty('--fx-y',y.toFixed(1)+'%');
      if(node.classList.contains('ux-workflow-card')){
       node.style.setProperty('--fx-ry',((x-50)/50*1.45).toFixed(2)+'deg');
       node.style.setProperty('--fx-rx',((50-y)/50*1.45).toFixed(2)+'deg');
      }
     });
    };
    const leave=()=>{
     node.style.removeProperty('--fx-x');node.style.removeProperty('--fx-y');
     node.style.removeProperty('--fx-rx');node.style.removeProperty('--fx-ry');
    };
    node.addEventListener('pointermove',move,{passive:true});
    node.addEventListener('pointerleave',leave);
    dispose.push(()=>{
     node.removeEventListener('pointermove',move);node.removeEventListener('pointerleave',leave);
     if(lastFrame)window.cancelAnimationFrame(lastFrame);
     leave();
    });
   }
  }
  return ()=>{
   observer?.disconnect();
   dispose.forEach(fn=>fn());
   reveals.forEach(node=>node.classList.remove('fx-reveal','fx-visible'));
   document.documentElement.classList.remove('fx-motion-ready');
   window.removeEventListener('scroll',update);window.removeEventListener('resize',update);
   if(frame)window.cancelAnimationFrame(frame);
  };
 },[pathname]);
 return <div className="fx-scroll-progress" aria-hidden="true" ref={progress}/>;
}
