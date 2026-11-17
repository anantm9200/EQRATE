'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {computeAssessment,createAssessment,formatMillions,parseAssessment,type Assessment} from '@/lib/assessment';
import {reviewAssessment} from '@/lib/research-intelligence';

const key='creqor.assessment-workspace.v1';
const handoff='creqor.workbench.handoff.v1';
const context='creqor.workbench.handoff-context.v1';
type Filter='all'|'listed'|'unlisted';
type Sort='newest'|'company'|'value';
function readSaved():Assessment[]{
 try{const raw=localStorage.getItem(key);const records=raw?JSON.parse(raw):[];
  if(!Array.isArray(records))return [];
  return records.slice(0,30).map(x=>{try{return parseAssessment(x)}catch{return null}}).filter((x):x is Assessment=>x!==null);
 }catch{return [];}
}
function download(name:string,mime:string,body:string){
 const url=URL.createObjectURL(new Blob([body],{type:mime}));
 const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
 window.setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function escapedCsv(value:unknown){
 const raw=String(value??'');
 const safe=/^[=+@-]/.test(raw.trim())?"'"+raw:raw;
 return '"'+safe.replace(/"/g,'""')+'"';
}
function sumSources(items:Assessment[]){return items.reduce((s,a)=>s+a.evidence.length,0);}
function finiteValue(a:Assessment){
 const result=computeAssessment(a);
 return a.kind==='listed'?result.marketCap??result.blended:result.blended;
}
export default function ResearchDesk(){
 const router=useRouter();
 const [items,setItems]=useState<Assessment[]>([]);
 const [query,setQuery]=useState('');
 const [filter,setFilter]=useState<Filter>('all');
 const [sort,setSort]=useState<Sort>('newest');
 const [selected,setSelected]=useState<string[]>([]);
 const [compare,setCompare]=useState(false);
 const [notice,setNotice]=useState('');
 const [ready,setReady]=useState(false);
 const inputRef=useRef<HTMLInputElement>(null);
 const refresh=useCallback(()=>{setItems(readSaved());setReady(true)},[]);
 useEffect(()=>{refresh();window.addEventListener('storage',refresh);return()=>window.removeEventListener('storage',refresh)},[refresh]);
 const filtered=useMemo(()=>{
  const q=query.trim().toLocaleLowerCase();
  return items.filter(a=>(filter==='all'||a.kind===filter)&&(!q||[a.name,a.identifier,a.country,a.industry].some(x=>x.toLowerCase().includes(q))))
   .sort((a,b)=>sort==='newest'?b.updatedAt.localeCompare(a.updatedAt):sort==='company'?a.name.localeCompare(b.name):
    (finiteValue(b)??-Infinity)-(finiteValue(a)??-Infinity));
 },[items,query,filter,sort]);
 const chosen=selected.map(id=>items.find(x=>x.id===id)).filter((x):x is Assessment=>x!==undefined);
 function openAssessment(a:Assessment){
  try{sessionStorage.setItem(handoff,JSON.stringify(a));sessionStorage.setItem(context,'saved');router.push('/workbench');}
  catch{setNotice('Unable to open the draft in this tab. Export JSON and import it in the workbench instead.');}
 }
 function startNew(){
  try{sessionStorage.setItem(handoff,JSON.stringify(createAssessment(new Date().toISOString().slice(0,10))));sessionStorage.setItem(context,'new');router.push('/workbench');}
  catch{router.push('/workbench');}
 }
 function write(next:Assessment[],message:string){
  try{const valid=next.slice(0,30);localStorage.setItem(key,JSON.stringify(valid));setItems(valid);setNotice(message);
   setSelected(current=>current.filter(id=>valid.some(x=>x.id===id)));setCompare(false);
  }catch{setNotice('Browser storage is unavailable or full. Export your research first.');}
 }
 function duplicate(a:Assessment){
  if(items.length>=30){setNotice('The browser workspace is limited to 30 saved assessments. Export or delete an existing draft first.');return;}
  const fresh=createAssessment(new Date().toISOString().slice(0,10));
  const copy=parseAssessment({...a,id:fresh.id,name:(a.name+' — copy').slice(0,250),updatedAt:fresh.updatedAt});
  write([copy,...items],'Created a separate editable copy of '+a.name+'. All financial figures and sources remain user-submitted.');
 }
 function remove(a:Assessment){
  if(!window.confirm('Delete the saved assessment for '+a.name+' from this browser? This cannot be undone unless you have a backup.'))return;
  write(items.filter(x=>x.id!==a.id),'Deleted local assessment for '+a.name+'.');
 }
 function toggle(id:string){
  setCompare(false);
  setSelected(old=>old.includes(id)?old.filter(x=>x!==id):old.length<2?[...old,id]:[old[1],id]);
 }
 function exportAll(){
  if(!items.length){setNotice('There are no saved assessments to export.');return;}
  download('CREQOR-research-desk-'+new Date().toISOString().slice(0,10)+'.json','application/json',
   JSON.stringify({schema:'CREQOR_RESEARCH_DESK_V1',status:'USER_SUPPLIED_DRAFTS',exportedAt:new Date().toISOString(),assessments:items},null,2));
  setNotice('Exported '+items.length+' local drafts. The file includes research notes and source URLs; store it securely.');
 }
 function exportIndex(){
  if(!items.length){setNotice('There are no saved assessments to export.');return;}
  const rows=[['Company','Identifier','Country','Kind','Industry','Currency','Valuation date','Draft value (millions)','Available methods','Source links','Last updated','Verification status'],
   ...items.map(a=>{const result=computeAssessment(a);return [a.name,a.identifier,a.country,a.kind,a.industry,a.currency,a.asOf,
   finiteValue(a)??'',result.readyMethods,a.evidence.length,a.updatedAt,'USER ENTERED / UNVERIFIED']})];
  download('CREQOR-research-index.csv','text/csv;charset=utf-8',rows.map(r=>r.map(escapedCsv).join(',')).join('\r\n'));
  setNotice('Research index exported as CSV. Values in different currencies must not be added together.');
 }
 async function importAll(file:File|undefined){
  if(!file)return;
  if(file.size>2*1024*1024){setNotice('Import files must be 2 MB or smaller.');return;}
  try{
   const data=JSON.parse(await file.text()) as unknown;
   const records=Array.isArray(data)?data:(data&&typeof data==='object'&&'assessments' in data?(data as {assessments:unknown}).assessments:[data]);
   if(!Array.isArray(records)||records.length>100)throw new Error('Expected an assessment or a bundle containing up to 100 entries.');
   const valid=records.map(parseAssessment).filter(x=>x.name.trim().length>0);
   if(!valid.length)throw new Error('No named assessments found.');
   if(!window.confirm('Import '+valid.length+' draft(s) into this browser? Matching IDs will be replaced; the 30-record limit remains.'))return;
   const incoming=new Map(valid.map(a=>[a.id,a]));
   const merged=[...valid,...items.filter(x=>!incoming.has(x.id))].slice(0,30);
   write(merged,'Imported '+Math.min(valid.length,30)+' draft records. Review all identities, financial inputs and URLs before relying on them.');
  }catch(e){setNotice('Import failed: '+(e instanceof Error?e.message:'Invalid JSON bundle.'));}
  finally{if(inputRef.current)inputRef.current.value='';}
 }
 const both=compare&&chosen.length===2?chosen:null;
 const sameCurrency=Boolean(both&&both[0].currency===both[1].currency);
 const aValue=both?finiteValue(both[0]):null,bValue=both?finiteValue(both[1]):null;
 const fields=both?['revenue','ebitda','netDebt','freeCashFlow','sharesMillions'] as const:[];
 return <div className="rd-root">
   <div className="rd-toolbar">
    <div className="rd-toolbar-search"><span aria-hidden="true">⌕</span><input aria-label="Find saved company research" placeholder="Find a company, identifier, country or sector…" value={query} onChange={e=>setQuery(e.target.value)}/></div>
    <select aria-label="Filter by listed status" value={filter} onChange={e=>setFilter(e.target.value as Filter)}><option value="all">All companies</option><option value="listed">Listed</option><option value="unlisted">Unlisted / private</option></select>
    <select aria-label="Sort company research" value={sort} onChange={e=>setSort(e.target.value as Sort)}><option value="newest">Recently updated</option><option value="company">Company A–Z</option><option value="value">Largest draft value</option></select>
    <button className="wk-button wk-primary" onClick={startNew}>+ New assessment</button>
   </div>
   {notice&&<div className="rd-notice" role="status">{notice}<button type="button" aria-label="Dismiss" onClick={()=>setNotice('')}>×</button></div>}
   <div className="rd-stats"><div><span>Saved research records</span><strong>{items.length}</strong><small>Stored only in this browser</small></div><div><span>Evidence references</span><strong>{sumSources(items)}</strong><small>User-supplied URLs, not independently verified</small></div><div><span>Latest update</span><strong>{items.length?items.slice().sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))[0].updatedAt.slice(0,10):'—'}</strong><small>Across all saved draft records</small></div></div>
   <div className="rd-index-head"><div><span className="wk-label">ASSESSMENT INDEX</span><h2>Saved company research</h2><p>Side-by-side comparison is based on analyst-entered results, not independent market valuations.</p></div><div className="rd-index-actions">
    <button className="wk-button wk-outline" type="button" onClick={()=>{setCompare(true);setNotice(chosen.length===2?'Comparing selected assessments.':'Select two assessment records to compare.')}} disabled={selected.length!==2}>Compare selected ({selected.length}/2)</button>
    <button className="wk-button wk-outline" type="button" onClick={exportIndex}>Export CSV</button>
    <button className="wk-button wk-outline" type="button" onClick={exportAll}>Backup JSON</button>
    <button className="wk-button wk-outline" type="button" onClick={()=>inputRef.current?.click()}>Import JSON</button>
    <input type="file" ref={inputRef} accept="application/json,.json" hidden onChange={e=>void importAll(e.target.files?.[0])}/>
   </div></div>
   <div className="rd-list" aria-live="polite">{filtered.length===0?<div className="rd-empty"><span>◇</span><h3>{ready&&items.length===0?'Your research desk is empty.':'No matching assessments.'}</h3><p>{ready&&items.length===0?'Create your first company assessment, save the draft, and it will appear here.':'Change your search or filters to see more records.'}</p><button className="wk-button wk-primary" onClick={startNew}>Start an assessment ↗</button></div>:
    filtered.map(a=>{const result=computeAssessment(a),quality=reviewAssessment(a);const value=finiteValue(a);
     return <article className="rd-entry" key={a.id}>
       <label className="rd-select"><input type="checkbox" aria-label={'Select '+a.name+' for comparison'} checked={selected.includes(a.id)} onChange={()=>toggle(a.id)}/></label>
       <div className="rd-entry-company"><span className="rd-entity-kind">{a.kind==='listed'?'LISTED · USER ENTERED':'UNLISTED · USER ENTERED'}</span><h3>{a.name}</h3><p>{a.identifier||'No identifier'} · {a.country} · {a.industry}</p><div className="rd-entity-tags"><span>{a.currency}</span><span>{result.readyMethods} methods</span><span>{a.evidence.length} sources</span><span>{quality.findings.filter(f=>f.level==='critical').length} critical review gaps</span></div></div>
       <div className="rd-entry-value"><span>{a.kind==='listed'&&result.marketCap!==null?'MANUAL MARKET CAP':'DRAFT MODEL ESTIMATE'}</span><strong>{value===null?'Not calculated':formatMillions(value,a.currency)}</strong><small>As of {a.asOf||'undated'}</small></div>
       <div className="rd-entry-actions"><button type="button" className="wk-button wk-primary" onClick={()=>openAssessment(a)}>Open ↗</button><button type="button" className="wk-button wk-outline" onClick={()=>duplicate(a)}>Duplicate</button><button type="button" className="wk-button wk-danger" onClick={()=>remove(a)}>Delete</button></div>
      </article>})}
   </div>
   {both&&<section className="rd-comparison" aria-label="Comparison of saved draft research">
    <div className="rd-compare-heading"><div><span className="wk-label">LOCAL PEER REVIEW / DRAFT COMPARISON</span><h2>Two cases. Different assumptions.</h2></div><button type="button" className="wk-button wk-outline" onClick={()=>setCompare(false)}>Close comparison ×</button></div>
    {!sameCurrency&&<p className="rd-currency-warning">Different entered currencies: {both[0].currency} and {both[1].currency}. Numeric value differences are not comparable without a documented FX conversion.</p>}
    <div className="rd-compare-grid">{both.map(x=><article key={x.id}><span>{x.kind.toUpperCase()} / {x.currency}</span><h3>{x.name}</h3><strong>{finiteValue(x)===null?'Not calculated':formatMillions(finiteValue(x)!,x.currency)}</strong><p>{computeAssessment(x).readyMethods} valuation methods · {x.evidence.length} recorded sources</p><button type="button" className="wk-button wk-outline" onClick={()=>openAssessment(x)}>Review draft ↗</button></article>)}</div>
    <div className="rd-compare-table"><table><thead><tr><th>Financial input (millions unless noted)</th><th>{both[0].name}</th><th>{both[1].name}</th></tr></thead><tbody>{fields.map(k=><tr key={k}><th>{k}</th><td>{both[0].fields[k]??'Unavailable'}</td><td>{both[1].fields[k]??'Unavailable'}</td></tr>)}</tbody></table></div>
    {sameCurrency&&aValue!==null&&bValue!==null&&<p className="rd-difference">Numerical draft-value difference: {formatMillions(Math.abs(aValue-bValue),both[0].currency)}. Different methods or dates can make this comparison misleading; it is not evidence of investment attractiveness.</p>}
   </section>}
   <section className="rd-disclosure"><div><span className="wk-label">DATA OWNERSHIP</span><h3>Your records stay on this device.</h3><p>Drafts use browser localStorage. No account, team sync, encrypted cloud vault or continuous price monitoring exists here. Export backups before clearing browser data. Avoid confidential documents or personal data.</p></div><Link href="/verification">Understand verification limits ↗</Link></section>
 </div>;
}
