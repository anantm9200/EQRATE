type Figure={concept:string;label:string;value:number;unit:string;page:number|null;reviewStatus:string;sourceUrl:string;periodEnd:string};
type Model={model:string;applicable:boolean;value:number|null;zone?:string;missing:string[];notes:string[]};
export type FinancialProfileData={available:boolean;reason?:string;scope?:string;currency?:string;
 reported?:{fiscalYear:number;figures:Figure[]}[];
 metrics?:Record<string,number|null>[];
 risk?:{note:string;altman:Model;piotroski:Model|null;beneish:Model|null};
 confidence?:{score:number|null;grade:string;components:{name:string;score:number|null;explanation:string}[];methodology:string}};

const ORDER=['revenue','totalIncome','profitBeforeTax','netIncome','operatingCashFlow','totalAssets','currentAssets','currentLiabilities','bookEquity','cash','receivables'];
const NAMES:Record<string,string>={revenue:'Revenue from operations',totalIncome:'Total income',profitBeforeTax:'Profit before tax',netIncome:'Profit for the year',
 operatingCashFlow:'Operating cash flow',totalAssets:'Total assets',currentAssets:'Current assets',currentLiabilities:'Current liabilities',bookEquity:'Total equity',
 cash:'Cash and cash equivalents',receivables:'Trade receivables'};
const METRICS:[string,string,boolean][]=[['revenueGrowth','Revenue growth',true],['netMargin','Net margin',true],['returnOnEquity','Return on equity',true],
 ['returnOnAssets','Return on assets',true],['currentRatio','Current ratio',false],['liabilitiesToEquity','Liabilities / equity',false],['cashConversion','Cash conversion (CFO / profit)',false]];
const fmt=(v:number)=>new Intl.NumberFormat('en-IN',{maximumFractionDigits:2}).format(v);
const show=(v:number|null|undefined,pct:boolean)=>v===null||v===undefined?'—':pct?(v*100).toFixed(1)+' %':v.toFixed(2);

export default function FinancialProfile({data}:{data:FinancialProfileData|null}){
 if(!data)return <p className="cq-engine-note">Financial evidence service unavailable right now.</p>;
 if(!data.available)return <p className="cq-engine-note">{data.reason} Figures are added only from published annual reports, with page citations, after validation.</p>;
 const years=(data.reported||[]).slice(0,5);
 const cell=(y:{figures:Figure[]},c:string)=>y.figures.find(f=>f.concept===c);
 const unit=years[0]?.figures[0]?.unit;
 return <div className="fp">
  <div className="fp-confidence"><strong>CREQOR Confidence: {data.confidence?.score??'—'}{data.confidence?.score!=null?' / 100':''} ({data.confidence?.grade})</strong>
   <ul>{data.confidence?.components.map(c=><li key={c.name}><span>{c.name}</span> {c.score===null?'not testable':Math.round(c.score*100)+' %'} — {c.explanation}</li>)}</ul></div>
  <div className="fp-table-wrap"><table className="fp-table">
   <caption>Reported figures ({data.scope}, {data.currency} {unit}). Each value links to its page in the company’s own report.</caption>
   <thead><tr><th scope="col">Line item</th>{years.map(y=><th scope="col" key={y.fiscalYear}>FY{y.fiscalYear}</th>)}</tr></thead>
   <tbody>{ORDER.filter(c=>years.some(y=>cell(y,c))).map(c=><tr key={c}><th scope="row">{NAMES[c]||c}</th>{years.map(y=>{const f=cell(y,c);
    return <td key={y.fiscalYear}>{f?<a href={f.sourceUrl+(f.page?'#page='+f.page:'')} target="_blank" rel="noopener noreferrer" title={`${f.label} · page ${f.page??'?'} · ${f.reviewStatus.replace('_',' ')}`}>{fmt(f.value)}</a>:'—'}</td>;})}</tr>)}</tbody>
  </table></div>
  <div className="fp-table-wrap"><table className="fp-table"><caption>Ratios (deterministic; “—” = an input is not reported)</caption>
   <thead><tr><th scope="col">Ratio</th>{(data.metrics||[]).slice(0,5).map(m=><th scope="col" key={String(m.fiscalYear)}>FY{m.fiscalYear}</th>)}</tr></thead>
   <tbody>{METRICS.map(([k,label,pct])=><tr key={k}><th scope="row">{label}</th>{(data.metrics||[]).slice(0,5).map(m=><td key={String(m.fiscalYear)}>{show(m[k],pct)}</td>)}</tr>)}</tbody></table></div>
  {data.risk&&<div className="fp-risk"><p className="cq-engine-note">{data.risk.note}</p>
   <ul className="cq-engine-flags">{[data.risk.altman,data.risk.piotroski,data.risk.beneish].filter((m):m is Model=>Boolean(m)).map(m=>
    <li key={m.model} data-severity="info"><span>{m.value===null?'n/a':String(m.value)}</span><div><strong>{m.model}{m.zone?' · '+m.zone:''}</strong>
     <p>{m.value===null?(m.missing.length?'Not computed — inputs not reported: '+m.missing.join(', ')+'.':m.notes.join(' ')):m.notes.join(' ')}</p></div></li>)}</ul></div>}
 </div>;
}
