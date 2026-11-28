'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import AnalysisCockpit from '@/components/analysis-cockpit';
import EngineProvenance from '@/components/engine-provenance';
import {useAssessmentIntelligence} from '@/lib/use-engine';
import {createAssessment,formatMillions,formatPerShare,parseAssessment,methodNames,methodUnits,numberKeys,ratingCategories,ratingNames,ratingWeights,type Assessment,type Evidence,type FinancialInputs,type Method,type NumberKey,type ClaimType,type SourceKind} from '@/lib/assessment';

const tabs=[{id:'company',label:'Company',number:'01'},{id:'financials',label:'Valuation',number:'02'},{id:'analysis',label:'Analysis',number:'03'},{id:'evidence',label:'Evidence',number:'04'},{id:'rating',label:'Score draft',number:'05'},{id:'report',label:'Report',number:'06'}] as const;
type Tab=(typeof tabs)[number]['id'];
const currencyOptions=['USD','INR','AED','GBP','EUR','NAD','ZAR','TZS','KES'];
const industries=['General','Agriculture','Manufacturing','Technology','SaaS','Financial services','Banking','Insurance','Logistics','Healthcare','Pharmaceuticals','Energy','Real estate','Commodities','Infrastructure','Retail','Other'];
const sourceKinds:Record<SourceKind,string>={official_filing:'Official regulator filing',audited_financials:'Audited financial statement',independent_third_party:'Independent third party',company_provided:'Company submitted',user_provided:'User submitted',other:'Other'};
const claimTypes:Record<ClaimType,string>={identity:'Legal identity',financials:'Financial statements','cash-flow':'Cash-flow figures',capitalisation:'Share capital','share-price':'Share price',transaction:'Share transaction',funding:'Funding event',assets:'Net assets','peer-multiple':'Peer multiples',other:'Other evidence'};
const fields:{section:string;fields:{key:NumberKey;label:string;hint:string}[]}[]=[
 {section:'Reported business fundamentals',fields:[
  {key:'revenue',label:'Annual revenue',hint:'In millions of selected currency'},
  {key:'ebitda',label:'Annual EBITDA',hint:'In millions; must be positive for EBITDA multiple'},
  {key:'netDebt',label:'Net debt / equity adjustments',hint:'Debt minus cash; can be negative'}
 ]},
 {section:'Discounted cash flow',fields:[
  {key:'freeCashFlow',label:'Starting free cash flow',hint:'In millions; negative values allowed'},
  {key:'growthPct',label:'Annual FCF growth (%)',hint:'E.g. 6 for six percent'},
  {key:'discountPct',label:'Discount rate / WACC (%)',hint:'Must exceed terminal growth'},
  {key:'terminalPct',label:'Terminal growth (%)',hint:'Long-run nominal growth assumption'},
  {key:'forecastYears',label:'Forecast years',hint:'Integer between 1 and 30'}
 ]},
 {section:'Valuation multiples',fields:[
  {key:'revenueMultiple',label:'EV / revenue multiple',hint:'Must be sourced to appropriate peers'},
  {key:'ebitdaMultiple',label:'EV / EBITDA multiple',hint:'Not a default method for banks and insurers'}
 ]},
 {section:'Asset and equity basis',fields:[
  {key:'assets',label:'Total assets',hint:'Book or adjusted asset value in millions'},
  {key:'liabilities',label:'Total liabilities',hint:'In millions of selected currency'},
  {key:'assetAdjustment',label:'Net asset-value adjustment',hint:'Optional; positive or negative, in millions'},
  {key:'sharesMillions',label:'Shares outstanding (millions)',hint:'Applicable diluted share count; one class only'}
 ]},
 {section:'Listed market-price evidence',fields:[
  {key:'sharePrice',label:'Share price per share',hint:'Manually entered; no live price verification'}
 ]},
 {section:'Private transactions and financing',fields:[
  {key:'transactionConsideration',label:'Price paid for equity stake',hint:'In millions; executed transaction, not an asking quote'},
  {key:'transactionStakePct',label:'Stake acquired (%)',hint:'Percentage of fully diluted equity sold'},
  {key:'fundingAmount',label:'Primary investment amount',hint:'In millions; should be new capital'},
  {key:'fundingEquityPct',label:'Post-money ownership (%)',hint:'Investor percentage after funding'}
 ]}
];
const storeKey='creqor.assessment-workspace.v1';
const draftKey='creqor.assessment-active-draft.v1';
const handoffKey='creqor.workbench.handoff.v1';
const handoffContext='creqor.workbench.handoff-context.v1';
function safeFileName(s:string){return (s||'company').replace(/[^a-z0-9-_]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,60)||'company';}
function textToCsv(v:string|number|null|undefined){
 const raw=v===null||v===undefined?'':String(v);
 // Avoid formula execution when opened in spreadsheets.
 const safe=/^[=+@-]/.test(raw.trim())?"'"+raw:raw;
 return '"'+safe.replace(/"/g,'""')+'"';
}
function exportFile(name:string,type:string,body:string){
 const url=URL.createObjectURL(new Blob([body],{type}));
 const link=document.createElement('a');link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function prettyMillions(n:number|null,currency:string){
 return n===null?'—':formatMillions(n,currency);
}
function Field({label,children,hint}:{label:string;children:React.ReactNode;hint?:string}){
 return <label className="wk-field"><span>{label}</span>{children}{hint&&<small>{hint}</small>}</label>;
}
export default function AssessmentWorkbench(){
 const [assessment,setAssessment]=useState<Assessment>(()=>createAssessment(new Date().toISOString().slice(0,10)));
 const [activeTab,setActiveTab]=useState<Tab>('company');
 const [saved,setSaved]=useState<Assessment[]>([]);
 const [notice,setNotice]=useState('');
 const [loaded,setLoaded]=useState(false);
 const [sourceForm,setSourceForm]=useState<Omit<Evidence,'id'>>({title:'',url:'',kind:'user_provided',claim:'financials',asOf:'',notes:''});
 const [editingSourceId,setEditingSourceId]=useState<string|null>(null);
 const fileInput=useRef<HTMLInputElement>(null);
 useEffect(()=>{
  try{
   const raw=localStorage.getItem(storeKey);
   if(raw){const items=JSON.parse(raw) as unknown;
    if(Array.isArray(items))setSaved(items.slice(0,30).map(x=>{try{return parseAssessment(x)}catch{return null}}).filter((x):x is Assessment=>x!==null));
   }
  }catch{setNotice('Saved assessments could not be read from this browser.');}
  try{
   const transferred=sessionStorage.getItem(handoffKey);
    const sourceContext=sessionStorage.getItem(handoffContext);
   const draft=sessionStorage.getItem(draftKey);
   if(transferred){
    const item=parseAssessment(JSON.parse(transferred));
    setAssessment(item);setActiveTab(sourceContext==='saved'||sourceContext==='new'?'company':'financials');
    setNotice(sourceContext==='saved'?'Saved assessment opened from your research desk. Review and save any changes.':sourceContext==='new'?'Blank assessment created. Start with the legal entity.':'Calculator inputs transferred. Add company identity and evidence before exporting a defensible assessment.');
    sessionStorage.removeItem(handoffKey);sessionStorage.removeItem(handoffContext);
   }else if(draft){
    setAssessment(parseAssessment(JSON.parse(draft)));
   }
  }catch{setNotice('A previous local draft could not be restored. You can start a new assessment.');}
  setLoaded(true);
 },[]);
 useEffect(()=>{
  if(!loaded)return;
  try{sessionStorage.setItem(draftKey,JSON.stringify(assessment));}catch{}
 },[assessment,loaded]);
 // Computed by the private DGX engine; the previous result stays visible while it recalculates.
 const intelligence=useAssessmentIntelligence(assessment);
 const results=intelligence.value.result;
 const readiness=intelligence.value.review;
 const hasName=assessment.name.trim().length>0;
 const meaningfulEvidence=assessment.evidence.filter(s=>s.title.trim()&&s.url.trim()&&s.asOf.trim()).length;
 function updateTop<K extends keyof Assessment>(key:K,value:Assessment[K]){
  setAssessment(old=>({...old,[key]:value,updatedAt:new Date().toISOString()}));
 }
 function patchInputs(patch:Partial<Record<NumberKey,number>>){
  setAssessment(old=>({...old,fields:{...old.fields,...patch},updatedAt:new Date().toISOString()}));
 }
 function updateNumber(key:NumberKey,text:string){
  const value=text.trim()===''?null:Number(text);
  setAssessment(old=>({...old,fields:{...old.fields,[key]:Number.isFinite(value)?value:null},updatedAt:new Date().toISOString()}));
 }
 function updateRating(key:(typeof ratingCategories)[number],text:string){
  const value=text.trim()===''?null:Number(text);
  setAssessment(old=>({...old,ratings:{...old.ratings,[key]:value!==null&&Number.isFinite(value)?value:null}}));
 }
 function toggleMethod(m:Method,checked:boolean){
  setAssessment(old=>({...old,active:checked?Array.from(new Set([...old.active,m])):old.active.filter(x=>x!==m)}));
 }
 function save(){
  if(!hasName){setNotice('Enter the company name before saving.');setActiveTab('company');return;}
  try{
   const entry={...assessment,updatedAt:new Date().toISOString()};
   const list=[entry,...saved.filter(x=>x.id!==entry.id)].slice(0,30);
   localStorage.setItem(storeKey,JSON.stringify(list));setSaved(list);setAssessment(entry);
   setNotice('Assessment saved locally in this browser.');
  }catch{setNotice('Could not save. Browser storage may be full or disabled. Export JSON to keep your work.');}
 }
 function load(id:string){
  const value=saved.find(a=>a.id===id);if(value){setAssessment(parseAssessment(value));setNotice('Saved assessment opened. Changes are not saved until you click Save.');setActiveTab('company');}
 }
 function loadSyntheticExample(){
  if(hasName&&!confirm('Load a synthetic example? Your unsaved edits will be replaced.'))return;
  const a=createAssessment(new Date().toISOString().slice(0,10));
  a.name='Example Company (synthetic)';
  a.identifier='';a.kind='unlisted';a.country='Example / not real';a.industry='Manufacturing';
  a.fields.revenue=180;a.fields.ebitda=24;a.fields.netDebt=15;
  a.fields.freeCashFlow=13;a.fields.growthPct=6;a.fields.discountPct=13;a.fields.terminalPct=3;a.fields.forecastYears=5;
  a.fields.assets=120;a.fields.liabilities=42;a.fields.revenueMultiple=2.1;a.fields.ebitdaMultiple=8;
  a.active=['dcf','revenueMultiple','ebitdaMultiple','netAssets'];
  a.analystNotes='SYNTHETIC DEMONSTRATION ONLY — these are made-up arithmetic inputs, not a real company or independent report.';
  setAssessment(a);setActiveTab('financials');setNotice('Synthetic example loaded. Replace every input and attach sources before real-world use.');
 }
 function newAssessment(){
  if(hasName&&!confirm('Start a new assessment? Unsaved changes will be lost.'))return;
  setAssessment(createAssessment(new Date().toISOString().slice(0,10)));setActiveTab('company');setNotice('New blank assessment created.');
 }
 function deleteSaved(){
  if(!confirm('Delete the saved copy of this assessment from this browser?'))return;
  try{
   const rest=saved.filter(x=>x.id!==assessment.id);
   localStorage.setItem(storeKey,JSON.stringify(rest));setSaved(rest);setNotice('Saved copy deleted from this browser.');
  }catch{setNotice('Unable to update local storage.');}
 }
 function resetSourceForm(){
  setEditingSourceId(null);setSourceForm({title:'',url:'',kind:'user_provided',claim:'financials',asOf:'',notes:''});
 }
 function editSource(source:Evidence){
  setSourceForm({title:source.title,url:source.url,kind:source.kind,claim:source.claim,asOf:source.asOf,notes:source.notes});
  setEditingSourceId(source.id);
  document.querySelector('.wk-evidence-form')?.scrollIntoView({behavior:'smooth',block:'center'});
 }
 function addSource(e:React.FormEvent){
  e.preventDefault();
  if(!sourceForm.title.trim()||!sourceForm.url.trim()||!sourceForm.asOf){setNotice('Each source needs a title, HTTPS URL and date.');return;}
  try{
   const url=new URL(sourceForm.url);
   if(url.protocol!=='https:'||url.username||url.password)throw new Error();
  }catch{setNotice('Use an HTTPS evidence URL without embedded credentials.');return;}
  if(assessment.evidence.some(x=>x.id!==editingSourceId&&x.url===sourceForm.url.trim()&&x.claim===sourceForm.claim&&x.asOf===sourceForm.asOf)){
   setNotice('This source URL, claim category and document date already exist in the register. Edit that entry instead.');return;
  }
  if(!editingSourceId&&assessment.evidence.length>=80){setNotice('The local evidence register has a maximum of 80 records. Export your research before adding more.');return;}
  const entry:Evidence={...sourceForm,id:editingSourceId||'src-'+Math.random().toString(36).slice(2,12),title:sourceForm.title.trim(),url:sourceForm.url.trim(),notes:sourceForm.notes.trim()};
  setAssessment(old=>({...old,evidence:editingSourceId?old.evidence.map(x=>x.id===editingSourceId?entry:x):[...old.evidence,entry],updatedAt:new Date().toISOString()}));
  setNotice(editingSourceId?'Evidence reference updated. The document and its claims have not been independently checked.':'Source recorded as user-supplied evidence. It has not been independently verified.');
  resetSourceForm();
 }
 function exportJson(){
  if(!hasName){setNotice('Add a company name to export the record.');return;}
  exportFile('CREQOR-'+safeFileName(assessment.name)+'.json','application/json',JSON.stringify({...assessment,reportStatus:'USER_SUBMITTED_DRAFT',modelVersion:'assessment-v1',exportedAt:new Date().toISOString()},null,2));
  setNotice('Machine-readable assessment exported. Treat source records as unverified.');
 }
 function exportCsv(){
  if(!hasName){setNotice('Add a company name to export.');return;}
  const rows:(string|number|null)[][]=[
   ['CREQOR - DRAFT COMPANY VALUATION REPORT','Value','Currency','Status'],
   ['Company',assessment.name,'','User-entered identity'],
   ['Identifier',assessment.identifier,'','Not independently verified'],
   ['Market classification',assessment.kind,'','Entered by analyst'],
   ['Valuation date',assessment.asOf,'','Entered by analyst'],
   ['Market capitalisation (millions)',results.marketCap,assessment.currency,'Manual price × share count; not market-verified'],
   ...results.methods.map(x=>[x.label,x.equityValue??null,assessment.currency,x.status==='calculated'?'Analyst model, unverified':x.detail]),
   ['Weighted method estimate (millions)',results.blended,assessment.currency,'Analyst-weighted model output; not a public market cap'],
   ['Weighted score draft',results.ratingDraft,'0–100','Not a published or regulated company rating'],
   ...assessment.evidence.map(e=>['Source: '+e.title,e.url,e.asOf,'User provided; not independently verified'])
  ];
  exportFile('CREQOR-'+safeFileName(assessment.name)+'.csv','text/csv;charset=utf-8',rows.map(row=>row.map(textToCsv).join(',')).join('\r\n'));
  setNotice('Report CSV exported.');
 }
 async function importJson(file:File|undefined){
  if(!file)return;
  if(file.size>1024*1024){setNotice('Assessment files must be smaller than 1 MB.');return;}
  try{
   const parsed=parseAssessment(JSON.parse(await file.text()));
   if(hasName&&!confirm('Replace the current unsaved assessment with this import?'))return;
   setAssessment(parsed);setActiveTab('company');
   setNotice('Imported as a local, unverified assessment. Review all financial inputs and sources.');
  }catch(e){setNotice('Import failed: '+(e instanceof Error?e.message:'Invalid JSON file.'));}
  if(fileInput.current)fileInput.current.value='';
 }
 function print(){
  if(!hasName){setNotice('Enter the company name to generate a report.');setActiveTab('company');return;}
  setActiveTab('report');setNotice('Use your browser Print dialogue to save a PDF report.');
  requestAnimationFrame(()=>requestAnimationFrame(()=>window.print()));
 }
 const headerTitle=assessment.name.trim()||'Untitled assessment';
 return <div className="wk-root">
  <div className="wk-dashboard-header">
   <div><span className="wk-label">CREQOR / COMPANY ASSESSMENT WORKSPACE</span><h2>{headerTitle}</h2><p>Build a financial case from your own evidence and reproducible calculations. No fabricated prices, facts or ratings.</p></div>
   <div className="wk-header-status"><span className="wk-status-dot"/>{results.status==='draft'?'DRAFT · NOT INDEPENDENTLY VERIFIED':'INSUFFICIENT DATA'}</div>
  </div>
  <div className="wk-toolbar wk-no-print">
    <div className="wk-toolbar-start">
     <label htmlFor="wk-saved" className="wk-sr">Load saved assessment</label>
     <select id="wk-saved" value={saved.some(x=>x.id===assessment.id)?assessment.id:''} onChange={e=>load(e.target.value)} aria-label="Open saved company assessment">
      <option value="">Open a saved assessment ({loaded?saved.length:'…'})</option>
      {saved.map(a=><option key={a.id} value={a.id}>{a.name} — {a.asOf||'undated'}</option>)}
     </select>
     <button type="button" onClick={newAssessment} className="wk-button wk-outline">+ New assessment</button>
     <button type="button" onClick={loadSyntheticExample} className="wk-button wk-outline">Try sample data</button>
     <button type="button" onClick={save} className="wk-button wk-primary">Save locally</button><Link href="/desk" className="wk-button wk-outline">Research desk ↗</Link>
    </div>
    <div className="wk-toolbar-end">
     <button type="button" onClick={exportJson} className="wk-button wk-outline">Export JSON</button>
     <button type="button" onClick={exportCsv} className="wk-button wk-outline">Export CSV</button>
     <button type="button" onClick={()=>fileInput.current?.click()} className="wk-button wk-outline">Import JSON</button>
     <button type="button" onClick={print} className="wk-button wk-outline">Print / PDF</button>
     {saved.some(x=>x.id===assessment.id)&&<button type="button" onClick={deleteSaved} className="wk-button wk-danger">Delete</button>}
     <input ref={fileInput} type="file" hidden accept="application/json,.json" aria-label="Import company assessment JSON" onChange={e=>void importJson(e.target.files?.[0])}/>
    </div>
  </div>
  {notice&&<div className="wk-notice wk-no-print" role="status"><span>{notice}</span><button type="button" aria-label="Dismiss message" onClick={()=>setNotice('')}>×</button></div>}
  <div className="wk-shell">
   <nav role="tablist" className="wk-tab-nav wk-no-print" aria-label="Assessment sections">
    {tabs.map(t=><button key={t.id} role="tab" id={'wk-tab-'+t.id} aria-controls={'wk-panel-'+t.id} aria-selected={activeTab===t.id} className={activeTab===t.id?'is-selected':''} onClick={()=>setActiveTab(t.id)}><small>{t.number}</small><span>{t.label}</span></button>)}
   </nav>
   <div className="wk-body">
    {activeTab==='company'&&<section className="wk-panel" id="wk-panel-company" aria-labelledby="wk-tab-company">
      <div className="wk-panel-head"><span className="wk-label">STEP 01 / IDENTITY</span><h3>Identify the exact company.</h3><p>Use the legal entity rather than a trading name or group brand. CREQOR will not assume identifiers are verified.</p></div>
      <div className="wk-form-grid">
       <Field label="Legal or reporting company name"><input required value={assessment.name} maxLength={250} onChange={e=>updateTop('name',e.target.value)} placeholder="Enter company name"/></Field>
       <Field label="ISIN / CIN / CIK / LEI / company number" hint="Optional; entered identifiers are not automatically verified."><input value={assessment.identifier} onChange={e=>updateTop('identifier',e.target.value)} placeholder="Official identifier"/></Field>
       <Field label="Country / jurisdiction"><input value={assessment.country} onChange={e=>updateTop('country',e.target.value)} placeholder="Country"/></Field>
       <Field label="Industry"><select value={assessment.industry} onChange={e=>updateTop('industry',e.target.value)}>{industries.map(x=><option key={x}>{x}</option>)}</select></Field>
       <Field label="Security status"><select value={assessment.kind} onChange={e=>updateTop('kind',e.target.value as Assessment['kind'])}><option value="unlisted">Unlisted / private</option><option value="listed">Publicly listed</option></select></Field>
       <Field label="Reporting currency" hint="All financial figures must be in the same currency. No FX conversion is performed."><select value={assessment.currency} onChange={e=>updateTop('currency',e.target.value)}>{currencyOptions.map(x=><option key={x}>{x}</option>)}</select></Field>
       <Field label="Valuation as-of date"><input type="date" value={assessment.asOf} onChange={e=>updateTop('asOf',e.target.value)}/></Field>
      </div>
      <div className="wk-guidance"><strong>{assessment.kind==='listed'?'Listed company:':'Unlisted company:'}</strong> {assessment.kind==='listed'?'A market-cap calculation requires a dated security price and matched share count. No live market feed is connected.':'Private-company models can produce estimated equity values. These are not observed stock-exchange market capitalisations.'}</div>
      <div className="wk-panel-actions"><Link href="/explore" className="wk-inline-link">Explore official US records ↗</Link><button className="wk-button wk-primary" onClick={()=>setActiveTab('financials')}>Continue to valuation →</button></div>
    </section>}
    {activeTab==='financials'&&<section className="wk-panel" id="wk-panel-financials" aria-labelledby="wk-tab-financials">
      <div className="wk-panel-head"><span className="wk-label">STEP 02 / VALUATION MODELS</span><h3>Enter financial inputs.</h3><p>Values are in <strong>{assessment.currency} millions</strong> except share price, percentages and valuation multiples. Blank fields are missing—not zero.</p></div>
      <div className="wk-input-groups">
       {fields.map(group=><section className="wk-input-group" key={group.section}><h4>{group.section}</h4><div className="wk-form-grid">
        {group.fields.map(f=><Field key={f.key} label={f.label} hint={f.hint}><input type="number" inputMode="decimal" step={f.key==='forecastYears'?'1':'any'} value={assessment.fields[f.key]===null?'':assessment.fields[f.key]!} onChange={e=>updateNumber(f.key,e.target.value)} placeholder="—"/></Field>)}
       </div></section>)}
      </div>
      <section className="wk-method-selection"><div className="wk-panel-head"><span className="wk-label">MODELS / METHODS</span><h3>Choose the valuation lenses.</h3><p>Methods compute only when their required inputs are present. Set non-negative weights for the explicit multi-method average; this is an analyst assumption, not a verified valuation conclusion.</p></div>
       <div className="wk-method-grid">{(Object.keys(methodNames) as Method[]).map(method=><div key={method} className="wk-method-select">
        <label><input type="checkbox" checked={assessment.active.includes(method)} onChange={e=>toggleMethod(method,e.target.checked)}/><span>{methodNames[method]}</span></label>
        <span className="wk-method-hint">{methodUnits[method]}</span>
        {assessment.active.includes(method)&&<Field label="Relative weight"><input type="number" min="0" step="0.5" max="100" inputMode="decimal" value={assessment.weights[method]} onChange={e=>setAssessment(a=>({...a,weights:{...a.weights,[method]:Number(e.target.value)}}))}/></Field>}
       </div>)}</div>
      </section>
      <div className="wk-panel-actions"><button className="wk-button wk-outline" onClick={()=>setActiveTab('company')}>← Company</button><button className="wk-button wk-primary" onClick={()=>setActiveTab('analysis')}>Stress-test value →</button></div>
    </section>}
    {activeTab==='analysis'&&<section className="wk-panel" id="wk-panel-analysis" aria-labelledby="wk-tab-analysis"><AnalysisCockpit assessment={assessment} onChangeInputs={patchInputs} onOpenValuation={()=>setActiveTab('financials')} onOpenEvidence={()=>setActiveTab('evidence')} onOpenReport={()=>setActiveTab('report')}/><div className="wk-panel-actions"><button className="wk-button wk-outline" onClick={()=>setActiveTab('financials')}>← Valuation</button><button className="wk-button wk-primary" onClick={()=>setActiveTab('evidence')}>Continue to evidence →</button></div></section>}
     {activeTab==='evidence'&&<section className="wk-panel" id="wk-panel-evidence" aria-labelledby="wk-tab-evidence">
      <div className="wk-panel-head"><span className="wk-label">STEP 03 / PROVENANCE</span><h3>Build the evidence register.</h3><p>Record each document, link and claim it supports. Entries remain user-submitted and <strong>are not automatically verified</strong>, even when categorised as an official filing.</p></div>
      <form onSubmit={addSource} className="wk-evidence-form"><div className="wk-source-editor-head"><strong>{editingSourceId?'Edit existing evidence record':'Add a source record'}</strong>{editingSourceId&&<button className="wk-button wk-outline" type="button" onClick={resetSourceForm}>Cancel edit</button>}</div><div className="wk-form-grid">
       <Field label="Document title"><input value={sourceForm.title} maxLength={250} required onChange={e=>setSourceForm(s=>({...s,title:e.target.value}))} placeholder="e.g. FY2025 audited accounts"/></Field>
       <Field label="Source URL (HTTPS only)"><input value={sourceForm.url} type="url" maxLength={1200} required placeholder="https://…" onChange={e=>setSourceForm(s=>({...s,url:e.target.value}))}/></Field>
       <Field label="Source category"><select value={sourceForm.kind} onChange={e=>setSourceForm(s=>({...s,kind:e.target.value as SourceKind}))}>{(Object.entries(sourceKinds) as [SourceKind,string][]).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></Field>
       <Field label="Claim / metric supported"><select value={sourceForm.claim} onChange={e=>setSourceForm(s=>({...s,claim:e.target.value as ClaimType}))}>{(Object.entries(claimTypes) as [ClaimType,string][]).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></Field>
       <Field label="Document / publication date"><input type="date" required value={sourceForm.asOf} onChange={e=>setSourceForm(s=>({...s,asOf:e.target.value}))}/></Field>
       <Field label="Page, table or notes"><input value={sourceForm.notes} maxLength={500} onChange={e=>setSourceForm(s=>({...s,notes:e.target.value}))} placeholder="Page 34; cash flow statement"/></Field>
      </div><div className="wk-panel-actions"><span className="wk-muted">No document files or confidential statements are uploaded to a server.</span><button className="wk-button wk-primary" type="submit">{editingSourceId?'Save evidence changes':' + Record evidence'}</button></div></form>
      <div className="wk-evidence-list"><h4>Source register <span>({assessment.evidence.length})</span></h4>
       {assessment.evidence.length===0?<p className="wk-empty">No source records yet. Financial calculations may be performed, but a defensible company valuation cannot be independently established without documented evidence.</p>:
       assessment.evidence.map((s,i)=><article className="wk-evidence-row" key={s.id}><span className="wk-evidence-index">{String(i+1).padStart(2,'0')}</span><div><h5>{s.title}</h5><p>{sourceKinds[s.kind]} · {claimTypes[s.claim]} · {s.asOf||'No date'}</p>{s.notes&&<p>{s.notes}</p>}{s.url&&<a href={s.url} target="_blank" rel="noopener noreferrer">{s.url.replace(/^https:\/\//,'').slice(0,65)} ↗</a>}</div><div className="wk-evidence-actions"><button type="button" className="wk-button wk-outline" onClick={()=>editSource(s)} aria-label={'Edit source '+s.title}>Edit</button><button type="button" className="wk-button wk-danger" onClick={()=>{setAssessment(a=>({...a,evidence:a.evidence.filter(x=>x.id!==s.id),updatedAt:new Date().toISOString()}));if(editingSourceId===s.id)resetSourceForm()}} aria-label={'Remove source '+s.title}>Remove</button></div></article>)}
      </div>
      <div className="wk-panel-actions"><button className="wk-button wk-outline" onClick={()=>setActiveTab('analysis')}>← Analysis</button><button className="wk-button wk-primary" onClick={()=>setActiveTab('rating')}>Continue to score draft →</button></div>
    </section>}
    {activeTab==='rating'&&<section className="wk-panel" id="wk-panel-rating" aria-labelledby="wk-tab-rating">
      <div className="wk-panel-head"><span className="wk-label">STEP 04 / INTERNAL SCORING DRAFT</span><h3>Apply a transparent score framework.</h3><p>The six categories have predefined research weights. Values are <strong>analyst-entered subjective assessments</strong> and cannot be published as a verified CREQOR rating until independent data validation and benchmarking are implemented.</p></div>
      <div className="wk-rating-grid">{ratingCategories.map((k,i)=><div className="wk-rating-field" key={k}><div><span>{String(i+1).padStart(2,'0')}</span><strong>{ratingNames[k]}</strong><small>{ratingWeights[k]}% weight</small></div><input type="number" inputMode="numeric" min="0" max="100" step="1" value={assessment.ratings[k]===null?'':assessment.ratings[k]!} placeholder="—" aria-label={ratingNames[k]+' score from 0 to 100'} onChange={e=>updateRating(k,e.target.value)}/></div>)}</div>
      <div className="wk-rating-summary"><span>ANALYST DRAFT / NOT ISSUED</span><strong>{results.ratingDraft===null?'Incomplete':results.ratingDraft.toFixed(1)+' / 100'}</strong><p>Categories completed: {results.ratingCoverage} / 6. No automatic verification, sector normalisation, independent confidence scoring or regulatory rating status is implied.</p></div>
      <div className="wk-panel-actions"><button className="wk-button wk-outline" onClick={()=>setActiveTab('evidence')}>← Evidence</button><button className="wk-button wk-primary" onClick={()=>setActiveTab('report')}>Review assessment →</button></div>
    </section>}
    {activeTab==='report'&&<section className="wk-panel wk-report" id="wk-panel-report" aria-labelledby="wk-tab-report">
      <div className="wk-report-top"><div><span className="wk-label">CREQOR / ASSESSMENT REPORT</span><h2>{headerTitle}</h2><p>{assessment.kind==='listed'?'Listed issuer':'Unlisted or privately held'} · {assessment.country} · {assessment.industry} · As of {assessment.asOf||'undated'} · {assessment.currency}</p><p className="wk-report-id">Identifier: {assessment.identifier||'Not provided'}</p></div><div className="wk-report-seal">DRAFT<br/>NOT VERIFIED</div></div>
      <div className="wk-report-alert"><strong>{results.status==='insufficient'?'INSUFFICIENT DATA FOR A DEFENSIBLE VALUATION':'DRAFT ANALYST ESTIMATE — NOT INDEPENDENTLY VERIFIED'}</strong><p>Calculation outputs use user-supplied assumptions. Evidence links are recorded but not authenticated or checked by CREQOR. This is not a credit rating, live price, investment advice or an independent valuation opinion.</p><EngineProvenance view={intelligence}/></div>
      <div className="wk-report-kpis">
        <div><span>{assessment.kind==='listed'?'Calculated market capitalisation':'Weighted private equity estimate'}</span><strong>{assessment.kind==='listed'?prettyMillions(results.marketCap,assessment.currency):prettyMillions(results.blended,assessment.currency)}</strong><small>{assessment.kind==='listed'?'Entered price × share count; not live or independently verified':'Analyst-weighted mean across valid selected methods'}</small></div>
        <div><span>Valuation methods completed</span><strong>{results.readyMethods} / {assessment.active.length}</strong><small>Deterministic calculations</small></div>
        <div><span>Linked evidence records</span><strong>{results.sourceCount}</strong><small>{meaningfulEvidence} with title, date and HTTPS link</small></div>
      </div>
      {assessment.kind==='listed'&&<div className="wk-notice wk-report-message">{results.marketCapMessage}</div>}
      <div className="wk-report-section"><h3>Valuation methods</h3><div className="wk-table-wrap"><table><thead><tr><th>Method</th><th>Equity value ({assessment.currency} m)</th><th>EV ({assessment.currency} m)</th><th>Per share</th><th>Status</th></tr></thead><tbody>
       {results.methods.map(m=><tr key={m.id}><th>{m.label}</th><td>{typeof m.equityValue==='number'?m.equityValue.toLocaleString('en-US',{maximumFractionDigits:2}):'—'}</td><td>{typeof m.enterpriseValue==='number'?m.enterpriseValue.toLocaleString('en-US',{maximumFractionDigits:2}):'—'}</td><td>{formatPerShare(m.impliedPerShare??null,assessment.currency)}</td><td>{m.status==='calculated'?'Calculated':m.detail}</td></tr>)}
      </tbody></table></div>
      <p className="wk-report-note">Weighted method result: {prettyMillions(results.blended,assessment.currency)}. Per-share estimate: {formatPerShare(results.blendedPerShare,assessment.currency)}. A weighted mean is an analyst-selected scenario comparison—not independent price discovery or a published private valuation.</p></div>
      <div className="wk-report-section"><h3>Analytical challenge and evidence readiness</h3>
 <p className="wk-report-note">Across {readiness.range.count} calculated valuation methods, the analyst-model range is {readiness.range.minimum===null?'not available':prettyMillions(readiness.range.minimum,assessment.currency)} to {readiness.range.maximum===null?'not available':prettyMillions(readiness.range.maximum,assessment.currency)}. {readiness.range.spreadPct===null?'Dispersion cannot be interpreted from the available estimates.':'Model spread equals '+readiness.range.spreadPct.toFixed(1)+'% of the method median.'} All figures are user-entered or calculated, not independently verified.</p>
 <div className="wk-readiness-report">{readiness.findings.filter(x=>x.level!=='informational').map(f=><div key={f.id}><strong>{f.level==='critical'?'CRITICAL':'REVIEW'}: {f.title}</strong><p>{f.detail}</p></div>)}{readiness.findings.every(f=>f.level==='informational')&&<p>No automatic completeness flags. This does not independently verify the issuer or its sources.</p>}</div>
 </div>
 <div className="wk-report-section"><h3>Reported input assumptions</h3><div className="wk-input-audit">
       {numberKeys.filter(k=>assessment.fields[k]!==null).map(k=><div key={k}><span>{fields.flatMap(s=>s.fields).find(f=>f.key===k)?.label||k}</span><strong>{assessment.fields[k]}</strong></div>)}
       {numberKeys.every(k=>assessment.fields[k]===null)&&<p>There are no financial inputs in this record.</p>}
      </div></div>
      <div className="wk-report-section"><h3>Sources and provenance</h3>
       {assessment.evidence.length===0?<p className="wk-muted">No evidence records supplied. No result can be independently substantiated.</p>:<ol className="wk-report-sources">{assessment.evidence.map(s=><li key={s.id}><strong>{s.title}</strong> — {sourceKinds[s.kind]}, {claimTypes[s.claim]}, dated {s.asOf||'unknown'}<br/><a href={s.url} target="_blank" rel="noopener noreferrer">{s.url}</a>{s.notes&&<span> · {s.notes}</span>}</li>)}</ol>}
      </div>
      <div className="wk-report-section"><h3>Company intelligence score — analyst draft</h3><p>{results.ratingDraft===null?'Not calculated; missing one or more category assessments.':results.ratingDraft.toFixed(1)+'/100 (user-entered weighted category scoring; NOT ISSUED as a verified company rating).'}</p><p className="wk-muted">An independent Data Confidence Score cannot be issued by this local research draft.</p></div>
      <div className="wk-report-section"><h3>Analyst observations</h3><p className="wk-notes">{assessment.analystNotes||'No analyst observations recorded.'}</p><label className="wk-field wk-no-print"><span>Enter report commentary (unverified)</span><textarea maxLength={5000} value={assessment.analystNotes} onChange={e=>updateTop('analystNotes',e.target.value)} rows={5}/></label></div>
      <div className="wk-report-bottom">Method: CREQOR deterministic assessment engine v1 · Compiled from manually entered data · Draft only · {new Date().toISOString().slice(0,10)}</div>
      <div className="wk-panel-actions wk-no-print"><button className="wk-button wk-outline" onClick={()=>setActiveTab('rating')}>← Score draft</button><button className="wk-button wk-primary" onClick={save}>Save assessment</button><button className="wk-button wk-outline" onClick={print}>Print / save PDF</button><button className="wk-button wk-outline" onClick={exportJson}>Export JSON</button></div>
    </section>}
   </div>
   <aside className="wk-side wk-no-print"><span className="wk-label">ASSESSMENT READINESS</span>
    <div className="wk-side-number">{results.readyMethods}<span> / {assessment.active.length}</span></div><p>Valuation methods with sufficient inputs</p>
    <div className="wk-progress"><span style={{width:(assessment.active.length?results.readyMethods/assessment.active.length*100:0)+'%'}}/></div>
    <div className="wk-side-divider"/>
    <div className="wk-side-stat"><span>Company identity</span><strong>{hasName?'Entered':'Missing'}</strong></div>
    <div className="wk-side-stat"><span>Evidence sources</span><strong>{results.sourceCount}</strong></div>
    <div className="wk-side-stat"><span>Rating categories</span><strong>{results.ratingCoverage} / 6</strong></div>
    <div className="wk-side-stat"><span>Storage</span><strong>Browser only</strong></div>
    <div className="wk-side-divider"/>
    <span className="wk-label">LATEST CALCULATION</span>
    <div className="wk-side-estimate">{prettyMillions(assessment.kind==='listed'?results.marketCap:results.blended,assessment.currency)}</div>
    <p className="wk-side-foot">User-entered values. This draft is not an observed market quote or independent valuation.</p>
    <EngineProvenance view={intelligence}/>
    <button className="wk-button wk-outline wk-side-report" onClick={()=>setActiveTab('analysis')}>Stress-test value ↗</button>
     <button className="wk-button wk-primary wk-side-report" onClick={()=>setActiveTab('report')}>Open report →</button>
   </aside>
  </div>
  <div className="wk-final-disclosure"><strong>Data safety:</strong> Drafts are stored in your browser only; they are not a secure document vault. Do not enter confidential personal data. Export your record to retain a backup. Source classifications are manually entered and do not constitute verification.</div>
 </div>;
}
