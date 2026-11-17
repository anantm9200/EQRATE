'use client';
import Link from 'next/link';
import {useCallback,useEffect,useRef,useState} from 'react';
type Lens='value'|'risk'|'evidence';
const lenses:{id:Lens;label:string;title:string;description:string;values:number[];color:string}[]=[
 {id:'value',label:'Value',title:'The value is in the details.',description:'Test how the picture changes when assumptions move.',values:[29,33,30,41,37,48,44,53,50,61,57,69,65,76,73,87],color:'#27965a'},
 {id:'risk',label:'Risk',title:'See what could change.',description:'Explore uncertainty before committing to a conclusion.',values:[69,66,74,61,63,56,64,52,57,47,53,41,48,35,41,29],color:'#ca8d38'},
 {id:'evidence',label:'Evidence',title:'Follow the reasoning.',description:'Keep sources, assumptions and limitations in view.',values:[23,26,30,31,38,40,47,48,53,58,61,67,72,74,82,91],color:'#3983aa'}
];
export default function IntelligenceCanvas(){
 const [lens,setLens]=useState<Lens>('value');
 const [focus,setFocus]=useState<number|null>(null);
 const [tilt,setTilt]=useState({x:0,y:0});
 const [reduce,setReduce]=useState(false);
 const surface=useRef<HTMLDivElement>(null);
 useEffect(()=>{const media=window.matchMedia('(prefers-reduced-motion: reduce)');const sync=()=>setReduce(media.matches);sync();media.addEventListener('change',sync);return()=>media.removeEventListener('change',sync)},[]);
 const active=lenses.find(x=>x.id===lens)!;
 const coords=active.values.map((v,i)=>({x:24+i*28,y:192-v*1.65}));
 const path=coords.map((p,i)=>(i?'L':'M')+p.x+' '+p.y.toFixed(2)).join(' ');
 const area=path+' L 444 205 L 24 205 Z';
 const onMove=useCallback((e:React.PointerEvent<HTMLDivElement>)=>{
  if(reduce||e.pointerType==='touch')return;
  const rect=e.currentTarget.getBoundingClientRect();
  const x=(e.clientX-rect.left)/rect.width-.5;
  const y=(e.clientY-rect.top)/rect.height-.5;
  setTilt({x:-y*4,y:x*5});
 },[reduce]);
 const onLeave=()=>{setTilt({x:0,y:0});setFocus(null)};
 return <div ref={surface} className="atlas-visual motion-lens" onPointerMove={onMove} onPointerLeave={onLeave} style={{transform:reduce?'none':`perspective(1200px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`}} aria-label="Interactive illustration of research lenses using synthetic data, not live market information">
  <div className="motion-lens-shine" aria-hidden="true"/>
  <div className="atlas-visual-top"><span><i className="atlas-live-dot"/> CREQOR / INTELLIGENCE LENS</span><span>INTERACTIVE DEMO · SYNTHETIC DATA</span></div>
  <div className="atlas-visual-body">
   <div className="atlas-visual-heading"><div><span className="atlas-overline">EXPLORE DIFFERENT PERSPECTIVES</span><h2 key={lens} className="motion-lens-heading">{active.title}</h2><p className="motion-lens-description">{active.description}</p></div><div className="atlas-mark" aria-hidden="true">C<span>Q</span></div></div>
   <div className="motion-lens-tabs" role="tablist" aria-label="Choose an illustrative research perspective">
    {lenses.map(item=><button type="button" key={item.id} role="tab" aria-selected={lens===item.id} className={'motion-lens-tab'+(lens===item.id?' is-active':'')} onClick={()=>{setLens(item.id);setFocus(null)}}>{item.label}</button>)}
   </div>
   <div className="atlas-visual-chart motion-lens-chart" role="tabpanel" aria-label={active.label+' illustrative chart'}>
    <div className="atlas-chart-heading"><span>{active.label.toUpperCase()} / RESEARCH VIEW</span><span>{focus===null?'SELECT A POINT TO INSPECT':'INDEX '+String(focus+1).padStart(2,'0')+' / '+active.values[focus]}</span></div>
    <svg viewBox="0 0 470 226" role="img" aria-label={active.label+' synthetic index chart. Select a data point to inspect its index.'} preserveAspectRatio="none">
     <defs><linearGradient id="motionLensFade" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={active.color} stopOpacity=".24"/><stop offset="100%" stopColor={active.color} stopOpacity="0"/></linearGradient></defs>
     {[46,99,152,205].map(y=><line key={y} x1="20" x2="455" y1={y} y2={y} stroke="#8bb79c" strokeOpacity=".22" strokeDasharray="2 7"/>)}
     <path key={lens+'-area'} d={area} fill="url(#motionLensFade)" className="motion-lens-area"/>
     <path key={lens+'-line'} d={path} fill="none" stroke={active.color} strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" className="motion-lens-line"/>
     {coords.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r={focus===i?5.5:3.2} fill={focus===i?active.color:'#fff'} stroke={active.color} strokeWidth="2" className="motion-lens-point"/>)}
     {focus!==null&&<line x1={coords[focus].x} x2={coords[focus].x} y1="18" y2="205" stroke={active.color} strokeOpacity=".35" strokeDasharray="4 6"/>}
    </svg>
    <div className="motion-lens-points" aria-label="Inspect illustrative chart points">{active.values.map((value,i)=><button key={i} type="button" aria-label={'Inspect index '+(i+1)+', synthetic value '+value} aria-pressed={focus===i} className={focus===i?'is-active':''} onClick={()=>setFocus(i)} title={'Index '+(i+1)+': '+value}>{i+1}</button>)}</div>
    <div className="atlas-chart-axis"><span>ASSUMPTIONS</span><span>SCENARIOS</span><span>INTERPRETATION</span></div>
   </div>
   <div className="atlas-visual-stats"><div><span>01 / IDENTIFY</span><strong>Entity first</strong><small>Find the right business</small></div><div><span>02 / ANALYSE</span><strong>Six methods</strong><small>Challenge the inputs</small></div><div><span>03 / EXPLAIN</span><strong>Source trail</strong><small>Keep the evidence visible</small></div></div>
  </div>
  <Link href="/workbench" className="atlas-visual-footer"><span><span className="atlas-pulse"/> YOUR ANALYSIS STARTS HERE</span><strong>OPEN WORKBENCH ↗</strong></Link>
 </div>
}
