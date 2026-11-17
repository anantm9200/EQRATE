'use client';
import {useEffect} from 'react';
export default function MotionObserver(){
 useEffect(()=>{
  const nodes=Array.from(document.querySelectorAll<HTMLElement>('.sweet-insight-card,.sweet-section-head,.command-job,.command-step,.command-market-card,.command-intro,.command-final,.sweet-journey'));
  const media=window.matchMedia('(prefers-reduced-motion: reduce)');
  if(media.matches||!('IntersectionObserver' in window))return;
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-revealed');observer.unobserve(entry.target)}}),{threshold:.09,rootMargin:'0px 0px -25px 0px'});
  nodes.forEach(node=>{node.classList.add('motion-reveal');observer.observe(node)});
  return()=>{observer.disconnect();nodes.forEach(node=>node.classList.remove('motion-reveal'))};
 },[]);
 return null;
}
