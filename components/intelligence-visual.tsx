export default function IntelligenceVisual(){
 return <div className="v2-visual-stage" role="img" aria-label="Connected evidence and financial analysis network with a central verified company identity">
  <div className="v2-visual-grid"/>
  <div className="v2-visual-glow"/>
  <svg className="v2-network" viewBox="0 0 600 525" fill="none" aria-hidden="true">
   <defs><linearGradient id="creqor-threads" x1="90" y1="45" x2="540" y2="490" gradientUnits="userSpaceOnUse"><stop stopColor="#b1c8ef" stopOpacity=".08"/><stop offset=".53" stopColor="#c0cde3" stopOpacity=".75"/><stop offset="1" stopColor="#7c96c2" stopOpacity=".1"/></linearGradient><radialGradient id="creqor-center"><stop stopColor="#305fb9"/><stop offset=".67" stopColor="#141f32"/><stop offset="1" stopColor="#0d1420"/></radialGradient></defs>
   <circle cx="300" cy="260" r="225" stroke="#b1c8ef" strokeOpacity=".08"/>
   <circle cx="300" cy="260" r="172" stroke="#b1c8ef" strokeOpacity=".16" strokeDasharray="2 7"/>
   <circle cx="300" cy="260" r="126" stroke="#b1c8ef" strokeOpacity=".16"/>
   <path d="M300 260 140 107M300 260 481 112M300 260 491 372M300 260 163 437M300 260 85 286M300 260 353 44" stroke="url(#creqor-threads)" strokeWidth="1.4"/>
   <path d="M140 107 353 44 481 112 491 372 163 437 85 286Z" stroke="#9fb8e3" strokeOpacity=".2" strokeDasharray="4 7"/>
   <path d="M140 107 163 437M481 112 85 286" stroke="#a1b7dd" strokeOpacity=".1"/>
   <circle cx="300" cy="260" r="85" fill="url(#creqor-center)" stroke="#acc4ef" strokeOpacity=".7" strokeWidth="1.4"/>
   <circle cx="300" cy="260" r="98" stroke="#aac3ee" strokeOpacity=".2" strokeDasharray="3 6"/>
   <path d="M323 229a41 41 0 1 0 0 63" stroke="#ccd6e8" strokeWidth="8" strokeLinecap="round"/>
   <circle cx="331" cy="289" r="5" fill="#ccd6e8"/>
   {[[140,107],[481,112],[491,372],[163,437],[85,286],[353,44]].map(([x,y],i)=><g key={i}><circle cx={x} cy={y} r="10" fill="#121d2f" stroke="#8cabdf" strokeOpacity=".7"/><circle cx={x} cy={y} r="3.5" fill="#c3cfe4"/></g>)}
   <g stroke="#d1daea" opacity=".65"><path d="M74 260v-24m-12 12h24M518 281v-24m-12 12h24"/></g>
  </svg>
  <div className="v2-visual-badge v2-badge-one"><span className="v2-dot"/> VERIFIED IDENTITY <b>✓</b></div>
  <div className="v2-visual-badge v2-badge-two"><span className="v2-badge-small">02 / INPUTS</span><strong>Evidence linked</strong><span className="v2-mini-bars"><i/><i/><i/><i/><i/></span></div>
  <div className="v2-visual-badge v2-badge-three"><span className="v2-badge-small">03 / OUTPUT</span><strong>Assumptions visible</strong><span className="v2-wave">⌁⌁⌁</span></div>
  <div className="v2-visual-caption"><span>RESEARCH ENGINE</span><span className="v2-pulse-line"/> <span>ACTIVITY / SOURCE → CONCLUSION</span></div>
 </div>;
}