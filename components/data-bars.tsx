import Link from 'next/link';

/**
 * Accessible single-series bar figures (server-rendered, no client JS).
 * One series => one brand hue, no legend; values sit at the bar tip in text ink;
 * hover/focus tooltip per mark; every figure carries a table view.
 */
export type BarRow={key:string;label:string;value:number;detail?:string;href?:string};
const nf=new Intl.NumberFormat('en-IN');
const compact=new Intl.NumberFormat('en-IN',{notation:'compact',maximumFractionDigits:1});

export function BarList({title,caption,rows,total,unit='entities'}:{title:string;caption?:string;rows:BarRow[];total?:number;unit?:string}){
 const max=Math.max(1,...rows.map(r=>r.value));
 return <figure className="cq-fig">
  <figcaption><strong>{title}</strong>{caption&&<span>{caption}</span>}</figcaption>
  <ol className="cq-barlist">
   {rows.map(r=>{
    const pct=total?Math.round(1000*r.value/total)/10:null;
    const tip=`${r.label}: ${nf.format(r.value)} ${unit}${pct!==null?` (${pct}%)`:''}${r.detail?' · '+r.detail:''}`;
    const label=r.href?<Link href={r.href}>{r.label}</Link>:<span>{r.label}</span>;
    return <li key={r.key} tabIndex={0} aria-label={tip}>
     <span className="cq-barlist-label">{label}</span>
     <span className="cq-barlist-track"><span className="cq-barlist-plot"><span className="cq-barlist-bar" style={{width:Math.max(0.6,100*r.value/max)+'%'}}/></span>
      <span className="cq-barlist-value">{nf.format(r.value)}</span></span>
     <span className="cq-tip" role="tooltip">{tip}</span>
    </li>;})}
  </ol>
  <details className="cq-fig-table"><summary>View as table</summary>
   <table><thead><tr><th scope="col">Category</th><th scope="col">{unit[0].toUpperCase()+unit.slice(1)}</th>{total?<th scope="col">Share</th>:null}</tr></thead>
    <tbody>{rows.map(r=><tr key={r.key}><td>{r.label}{r.detail?' — '+r.detail:''}</td><td>{nf.format(r.value)}</td>
     {total?<td>{(100*r.value/total).toFixed(1)}%</td>:null}</tr>)}</tbody></table>
  </details>
 </figure>;
}

export function ColumnChart({title,caption,rows,unit='entities'}:{title:string;caption?:string;rows:BarRow[];unit?:string}){
 const max=Math.max(1,...rows.map(r=>r.value));
 const peak=rows.reduce((a,b)=>b.value>a.value?b:a,rows[0]);
 // Clean tick: round the axis top up to 1/2/5 x 10^n.
 const mag=Math.pow(10,Math.floor(Math.log10(max)));
 const top=[1,2,5,10].map(m=>m*mag).find(v=>v>=max)||max;
 return <figure className="cq-fig">
  <figcaption><strong>{title}</strong>{caption&&<span>{caption}</span>}</figcaption>
  <div className="cq-columns" role="list" style={{['--cols' as string]:rows.length}}>
   <span className="cq-columns-axis" aria-hidden="true"><span>{compact.format(top)}</span><span>{compact.format(top/2)}</span><span>0</span></span>
   {rows.map(r=>{const tip=`${r.label}: ${nf.format(r.value)} ${unit}`;
    return <div key={r.key} role="listitem" tabIndex={0} aria-label={tip} className="cq-column">
     <span className="cq-column-plot">
      {r===peak&&<span className="cq-column-cap" style={{bottom:(100*r.value/top)+'%'}}>{compact.format(r.value)}</span>}
      <span className="cq-column-bar" style={{height:Math.max(0.8,100*r.value/top)+'%'}}/>
     </span>
     <span className="cq-column-label">{r.label}</span>
     <span className="cq-tip" role="tooltip">{tip}</span>
    </div>;})}
  </div>
  <details className="cq-fig-table"><summary>View as table</summary>
   <table><thead><tr><th scope="col">Period</th><th scope="col">{unit[0].toUpperCase()+unit.slice(1)}</th></tr></thead>
    <tbody>{rows.map(r=><tr key={r.key}><td>{r.label}</td><td>{nf.format(r.value)}</td></tr>)}</tbody></table>
  </details>
 </figure>;
}

export function StatTile({label,value,note}:{label:string;value:string;note?:string}){
 return <div className="cq-stat"><span>{label}</span><strong>{value}</strong>{note&&<small>{note}</small>}</div>;
}
