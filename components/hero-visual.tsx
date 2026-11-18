'use client';
import {useRef} from 'react';

const contours=Array.from({length:14},(_,i)=> {
 const shift=i*14;
 return `M 26 ${302+shift} C 144 ${183+shift}, 212 ${430+shift*.48}, 329 ${288+shift*.52} S 520 ${100+shift*.44}, 680 ${219+shift*.43}`;
});
export default function HeroVisual(){
 const ref=useRef<HTMLDivElement>(null);
 function move(e:React.PointerEvent<HTMLDivElement>){
  if(e.pointerType==='touch'||!ref.current)return;
  const box=ref.current.getBoundingClientRect();
  const x=(e.clientX-box.left)/box.width-.5;
  const y=(e.clientY-box.top)/box.height-.5;
  ref.current.style.setProperty('--hero-x',String(x));
  ref.current.style.setProperty('--hero-y',String(y));
 }
 function reset(){
  ref.current?.style.setProperty('--hero-x','0');
  ref.current?.style.setProperty('--hero-y','0');
 }
 return <div ref={ref} className="c3-visual" onPointerMove={move} onPointerLeave={reset}
  role="img" aria-label="Abstract moving data landscape flowing through three transparent research layers: identity, evidence and valuation.">
  <div className="c3-visual-grid" aria-hidden="true"/>
  <div className="c3-visual-halo" aria-hidden="true"/>
  <svg className="c3-landscape" viewBox="0 0 700 620" fill="none" aria-hidden="true">
   <defs>
    <linearGradient id="c3-wave" x1="40" y1="245" x2="680" y2="480" gradientUnits="userSpaceOnUse">
     <stop stopColor="#819fd4" stopOpacity="0"/><stop offset=".27" stopColor="#96b2e2" stopOpacity=".42"/>
     <stop offset=".67" stopColor="#c3cfe4" stopOpacity=".58"/><stop offset="1" stopColor="#dee5f0" stopOpacity="0"/>
    </linearGradient>
    <linearGradient id="c3-pane" x1="180" y1="110" x2="570" y2="470" gradientUnits="userSpaceOnUse">
     <stop stopColor="#d0daea" stopOpacity=".17"/><stop offset=".44" stopColor="#305fb9" stopOpacity=".08"/><stop offset="1" stopColor="#cbd5e7" stopOpacity=".035"/>
    </linearGradient>
    <linearGradient id="c3-edge" x1="174" y1="144" x2="572" y2="482" gradientUnits="userSpaceOnUse">
     <stop stopColor="#e1e7f2" stopOpacity=".72"/><stop offset=".55" stopColor="#98b3e1" stopOpacity=".22"/><stop offset="1" stopColor="#c4d0e4" stopOpacity=".58"/>
    </linearGradient>
    <radialGradient id="c3-flare"><stop stopColor="#c1cde3" stopOpacity=".36"/><stop offset="1" stopColor="#c9d4e7" stopOpacity="0"/></radialGradient>
    <filter id="c3-soft"><feGaussianBlur stdDeviation="24"/></filter>
   </defs>
   <circle cx="414" cy="315" r="224" fill="url(#c3-flare)" filter="url(#c3-soft)" opacity=".4"/>
   <g className="c3-contours">{contours.map((path,i)=><path key={i} d={path} stroke="url(#c3-wave)" strokeWidth={i%4===0?'1.45':'0.8'} opacity={i%2===0?'.82':'.48'}/>)}</g>
   <g className="c3-pane-stack">
    <path d="M154 179 465 95 593 232 277 321Z" fill="url(#c3-pane)" stroke="url(#c3-edge)" strokeWidth="1.2"/>
    <path d="M154 179V231L277 372V321M277 372 593 283V232" stroke="#a8bee5" strokeOpacity=".24"/>
    <path d="M167 277 481 188 608 324 291 414Z" fill="url(#c3-pane)" stroke="url(#c3-edge)" strokeWidth="1.25"/>
    <path d="M167 277V313L291 450V414M291 450 608 359V324" stroke="#a8bee5" strokeOpacity=".18"/>
    <path d="M177 369 491 280 617 416 302 507Z" fill="url(#c3-pane)" stroke="url(#c3-edge)" strokeWidth="1.2"/>
    <path d="M177 369V396L302 534V507M302 534 617 443V416" stroke="#a8bee5" strokeOpacity=".15"/>
   </g>
   <g className="c3-pane-content">
    <path d="M225 188 427 132M230 200 372 161M245 218 337 192" stroke="#d6dfed" strokeOpacity=".39" strokeWidth="2" strokeLinecap="round"/>
    <path d="M221 291 440 230M237 311 402 264" stroke="#d6dfed" strokeOpacity=".39" strokeWidth="1.7" strokeLinecap="round"/>
    <circle cx="466" cy="226" r="7" stroke="#c7d2e6" strokeOpacity=".65"/>
    <circle cx="454" cy="216" r="2.3" fill="#dce3ef"/>
    <path d="M256 392 363 367 400 379 464 338 535 346" stroke="#d0daea" strokeOpacity=".72" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="463" cy="338" r="4" fill="#d7dfed"/>
    <path d="M221 393V423M237 390V438M255 386V455" stroke="#a3bdeb" strokeOpacity=".28" strokeWidth="2"/>
   </g>
   <g className="c3-points">
    <circle cx="153" cy="181" r="3.4" fill="#d2dbeb"/>
    <circle cx="593" cy="232" r="3.4" fill="#c6d1e5"/>
    <circle cx="167" cy="277" r="3.4" fill="#d2dbeb"/>
    <circle cx="608" cy="324" r="3.4" fill="#d2dbeb"/>
    <circle cx="177" cy="369" r="3.4" fill="#d2dbeb"/>
    <circle cx="617" cy="416" r="3.4" fill="#d2dbeb"/>
   </g>
   <path className="c3-trace" d="M126 348C237 250 277 445 377 285S533 262 617 194" stroke="#ced8e9" strokeWidth="1.4" strokeDasharray="4 12" opacity=".7"/>
   <circle className="c3-trace-marker" cx="377" cy="285" r="5" fill="#d8e0ed"/>
  </svg>
  <div className="c3-stage-label c3-stage-label-top"><span>01 /</span> IDENTITY <i/></div>
  <div className="c3-stage-label c3-stage-label-middle"><span>02 /</span> EVIDENCE <i/></div>
  <div className="c3-stage-label c3-stage-label-bottom"><span>03 /</span> VALUATION <i/></div>
  <div className="c3-art-caption"><span className="c3-pulse"/> SOURCES → ASSUMPTIONS → INSIGHT</div>
 </div>;
}