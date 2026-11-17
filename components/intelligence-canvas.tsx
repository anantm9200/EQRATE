import Link from 'next/link';

/** Deliberately illustrative, not live market prices or an issuer recommendation. */
const bars=[28,36,31,47,41,54,49,60,57,69,64,78,74,88,81,96];
const points=bars.map((v,i)=>[42+i*26,188-(v-20)*1.55]);
const line=points.map(([x,y],i)=>(i?'L':'M')+x+' '+y.toFixed(1)).join(' ');
const area=line+' L 432 203 L 42 203 Z';
export default function IntelligenceCanvas(){return <div className="atlas-visual" aria-label="Illustrative valuation research interface. Synthetic data only; not a live market feed.">
 <div className="atlas-visual-top"><span><i className="atlas-live-dot"/> THE RESEARCH LENS</span><span>ILLUSTRATIVE / NOT LIVE DATA</span></div>
 <div className="atlas-visual-body">
  <div className="atlas-visual-heading"><div><span className="atlas-overline">COMPANY INTELLIGENCE / 001</span><h2>See beyond<br/>the surface<span>.</span></h2></div><div className="atlas-mark" aria-hidden="true">C<span>Q</span></div></div>
  <div className="atlas-visual-chart">
   <div className="atlas-chart-heading"><span>MODEL EXPLORATION</span><span>RELATIVE INDEX / SYNTHETIC</span></div>
   <svg viewBox="0 0 470 226" role="img" aria-label="Synthetic rising research index; illustrative, not a company price chart" preserveAspectRatio="none">
    <defs><linearGradient id="atlasFade" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#b8f3d1" stopOpacity=".28"/><stop offset="100%" stopColor="#b8f3d1" stopOpacity="0"/></linearGradient></defs>
    {[46,99,152,205].map(y=><line key={y} x1="28" x2="448" y1={y} y2={y} stroke="#8ac3a1" strokeOpacity=".16" strokeDasharray="2 7"/>)}
    <path d={area} fill="url(#atlasFade)"/>
    <path d={line} fill="none" stroke="#b8f5d0" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>
    <circle cx={points[points.length-1][0]} cy={points[points.length-1][1]} r="5" fill="#c8ffdc" stroke="#153e2b" strokeWidth="3"/>
    <line x1="432" y1="23" x2="432" y2="205" stroke="#b8f5d0" strokeOpacity=".32" strokeDasharray="3 6"/>
   </svg>
   <div className="atlas-chart-axis"><span>ASSUMPTIONS</span><span>SCENARIOS</span><span>MODEL OUTPUT</span></div>
  </div>
  <div className="atlas-visual-stats"><div><span>01 / DISCOVER</span><strong>Entity identity</strong><small>Know who you are assessing</small></div><div><span>02 / VALUE</span><strong>Six methods</strong><small>Test the underlying assumptions</small></div><div><span>03 / VERIFY</span><strong>Source trail</strong><small>Trace the evidence and gaps</small></div></div>
 </div>
 <Link href="/workbench" className="atlas-visual-footer"><span><span className="atlas-pulse"/> START YOUR OWN ANALYSIS</span><strong>OPEN WORKBENCH ↗</strong></Link>
 <div className="atlas-visual-glow" aria-hidden="true"/>
 </div>}
