'use client';

import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import CompanyUniverse from '@/components/company-universe';
import type {LeiDirectoryPage,LeiEntity} from '@/lib/gleif';

const COUNTRY_CODES='AW AF AO AI AX AL AD AE AR AM AS AQ TF AG AU AT AZ BI BE BJ BQ BF BD BG BH BS BA BL BY BZ BM BO BR BB BN BT BV BW CF CA CC CH CL CN CI CM CD CG CK CO KM CV CR CU CW CX KY CY CZ DE DJ DM DK DO DZ EC EG ER EH ES EE ET FI FJ FK FR FO FM GA GB GE GG GH GI GN GP GM GW GQ GR GD GL GT GF GU GY HK HM HN HR HT HU ID IM IN IO IE IR IQ IS IL IT JM JE JO JP KZ KE KG KH KI KN KR KW LA LB LR LY LC LI LK LS LT LU LV MO MF MA MC MD MG MV MX MH MK ML MT MM ME MN MP MZ MR MS MQ MU MW MY YT NA NC NE NF NG NI NU NL NO NP NR NZ OM PK PA PN PE PH PW PG PL PR KP PT PY PS PF QA RE RO RU RW SA SD SN SG GS SH SJ SB SL SV SM SO PM RS SS ST SR SK SI SE SZ SX SC SY TC TD TG TH TJ TK TM TL TO TT TN TR TV TW TZ UG UA UM UY US UZ VA VC VE VG VI VN VU WF WS YE ZA ZM ZW'.split(' ');
const POPULAR=['','US','IN','AE','GB','DE','JP','SG','SA','ZA','NA','AU','CA','FR','BR','VN','TZ'];
const SEARCH_IDEAS=['Apple','Microsoft','Toyota','Tata','Reliance','Siemens','HSBC','Samsung','Unilever','Emirates'];
const storageKey='creqor.global-directory.bookmarks.v1';
const regionNames=new Intl.DisplayNames(['en'],{type:'region'});
function region(code:string){return regionNames.of(code)||code;}
const ALL_COUNTRIES=COUNTRY_CODES.map(code=>({code,name:region(code)})).sort((a,b)=>a.name.localeCompare(b.name));
function csvField(x:unknown){const value=String(x??'');const safe=/^[=+@\-]/.test(value.trim())?"'"+value:value;return '"'+safe.replace(/"/g,'""')+'"';}
function exportCsv(rows:LeiEntity[]){
 const columns=[['Legal name','LEI','Country','Jurisdiction','Entity status','LEI registration','Category','Source URL'],
  ...rows.map(e=>[e.name,e.lei,e.country,e.jurisdiction,e.status,e.registrationStatus,e.category,e.sourceUrl])];
 const blob=new Blob([columns.map(row=>row.map(csvField).join(',')).join('\r\n')+'\r\n'],{type:'text/csv;charset=utf-8'});
 const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='CREQOR-GLEIF-loaded-entities.csv';
 document.body.appendChild(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1500);
}
export default function GlobalDirectory({
 initial,initialCountry='',initialQuery='',initialError='',
 apiPath='/api/directory',routePath='/directory',showFeatured=true,sourceNote='Connected to the official GLEIF global legal-entity register'
}:{
 initial:LeiDirectoryPage|null;initialCountry?:string;initialQuery?:string;initialError?:string;
 apiPath?:'/api/directory'|'/api/catalogue';routePath?:'/directory'|'/catalogue';
 showFeatured?:boolean;sourceNote?:string;
}){
 const [query,setQuery]=useState(initialQuery);
 const [country,setCountry]=useState(initialCountry);
 const [data,setData]=useState<LeiDirectoryPage|null>(initial);
 const [error,setError]=useState(initialError);
 const [busy,setBusy]=useState(false);
 const [loadingMore,setLoadingMore]=useState(false);
 const [saved,setSaved]=useState<LeiEntity[]>([]);
 const [onlySaved,setOnlySaved]=useState(false);
 const [message,setMessage]=useState('');
 const ctrl=useRef<AbortController|null>(null);
 const skipFirst=useRef(true);
 useEffect(()=>{
  try{
   const raw=JSON.parse(localStorage.getItem(storageKey)||'[]') as unknown;
   if(Array.isArray(raw)){
    setSaved(raw.filter((x):x is LeiEntity=>Boolean(x&&typeof x==='object'&&'lei' in x&&typeof x.lei==='string'&&/^[A-Z0-9]{20}$/.test(x.lei)&&'name' in x&&typeof x.name==='string')).slice(0,100));
   }
  }catch{/* Browsing still works if browser storage is disabled. */}
 },[]);

 const load=useCallback(async(page:number,append:boolean,term:string,code:string)=>{
  ctrl.current?.abort();
  const controller=new AbortController();ctrl.current=controller;
  if(append)setLoadingMore(true);else setBusy(true);
  if(!append){setError('');setMessage('');}
  try{
   const params=new URLSearchParams({page:String(page)});
   if(term.trim())params.set('q',term.trim());
   if(code)params.set('country',code);
   const response=await fetch(apiPath+'?'+params.toString(),{signal:controller.signal});
   const payload=await response.json() as LeiDirectoryPage&{error?:string};
   if(!response.ok)throw new Error(payload.error||'The GLEIF registry could not be reached.');
   if(controller.signal.aborted)return;
   setData(previous=>{
    if(!append||!previous)return payload;
    const seen=new Set(previous.results.map(x=>x.lei));
    const merged=[...previous.results,...payload.results.filter(x=>!seen.has(x.lei))];
    return {...payload,results:merged};
   });
  }catch(e){
   if(!controller.signal.aborted){
    setError(e instanceof Error?e.message:'Directory unavailable.');
    if(!append)setData(null);
   }
  }finally{
   if(!controller.signal.aborted){setBusy(false);setLoadingMore(false);}
  }
 },[apiPath]);
 useEffect(()=>{
  if(skipFirst.current){skipFirst.current=false;return;}
  ctrl.current?.abort();
  if(query.trim().length===1){setData(null);setError('Enter at least two letters to search by name.');setBusy(false);return;}
  const search=new URLSearchParams();
  if(query.trim())search.set('q',query.trim());
  if(country)search.set('country',country);
  window.history.replaceState(window.history.state,'',routePath+(search.size?'?'+search.toString():''));
  setData(null);setBusy(true);setError('');
  const timer=window.setTimeout(()=>void load(1,false,query,country),query.trim().length>=2?360:140);
  return ()=>{clearTimeout(timer);ctrl.current?.abort();};
 },[query,country,load,routePath]);
 useEffect(()=>()=>ctrl.current?.abort(),[]);

 const shown=useMemo(()=>{
  if(!onlySaved)return data?.results||[];
  const name=query.toLowerCase().trim();
  return saved.filter(e=>(!country||e.country===country)&&(!name||e.name.toLowerCase().includes(name)||e.lei.toLowerCase().includes(name)));
 },[onlySaved,data,saved,query,country]);
 const savedSet=useMemo(()=>new Set(saved.map(x=>x.lei)),[saved]);
 const loaded=data?.results.length||0;
 function toggleSaved(entity:LeiEntity){
  try{
   const next=savedSet.has(entity.lei)?saved.filter(x=>x.lei!==entity.lei):[entity,...saved].slice(0,100);
   localStorage.setItem(storageKey,JSON.stringify(next));
   setSaved(next);setMessage(savedSet.has(entity.lei)?'Removed from this browser’s saved companies.':'Saved to this browser. Bookmarks do not sync between devices.');
  }catch{setMessage('Browser storage is unavailable. You can still open the official company record.');}
 }
 function chooseCountry(code:string){setCountry(code);setOnlySaved(false);}
 function loadNext(){if(!busy&&!loadingMore&&data?.hasMore)void load(data.page+1,true,query,country);}
 const format=(value:number)=>new Intl.NumberFormat('en-US').format(value);
 return <div className="gd-root">
  <div className="gd-toolbar">
   <div className="gd-input-wrap"><span aria-hidden="true">⌕</span><input aria-label="Search global company directory" type="search" placeholder="Search companies by legal name…" value={query} onChange={e=>{setQuery(e.target.value);setOnlySaved(false);}} maxLength={90}/>{query&&<button type="button" aria-label="Clear company search" onClick={()=>setQuery('')}>×</button>}</div>
   <label className="gd-country-selector"><span>Country</span><select aria-label="Filter companies by country" value={country} onChange={e=>chooseCountry(e.target.value)}><option value="">Worldwide · all countries</option>{ALL_COUNTRIES.map(x=><option key={x.code} value={x.code}>{x.name} ({x.code})</option>)}</select></label>
   <button type="button" className={'gd-save-toggle'+(onlySaved?' is-active':'')} aria-pressed={onlySaved} onClick={()=>setOnlySaved(x=>!x)}><span aria-hidden="true">☆</span> Saved ({saved.length})</button>
  </div>
  {showFeatured&&!query&&!country&&!onlySaved&&<CompanyUniverse/>}
  <div className="gd-quick-countries" aria-label="Browse popular countries"><span>EXPLORE BY COUNTRY</span><div>{POPULAR.map(code=><button type="button" key={code||'world'} aria-pressed={country===code} className={country===code?'is-active':''} onClick={()=>chooseCountry(code)}>{code?region(code):'Worldwide'}</button>)}</div></div>
  <div className="gd-search-ideas"><span>LOOK UP A COMPANY</span><div>{SEARCH_IDEAS.map(name=><button key={name} type="button" onClick={()=>{setQuery(name);setOnlySaved(false)}}>{name} ↗</button>)}</div></div>
  <div className="gd-prompt-row"><span className="gd-source-dot"/> {sourceNote}</div>
  <div className="gd-section-heading">
   <div><span className="gd-kicker">SOURCE-BACKED COMPANY RECORDS</span><h2>{onlySaved?'Your bookmarked companies':query?'Companies matching “'+query.trim()+'”':country?'Companies in '+region(country):'Companies around the world'}</h2>
    <p>Actual registered legal entities with traceable identifiers. Browse the registry, inspect a record and begin your CREQOR research.</p></div>
   <div className="gd-view-stats"><span>{onlySaved?format(shown.length)+' saved':data?format(data.total)+' matching records':'GLEIF / GLOBAL'}</span><small>{onlySaved?'This device only':data?format(loaded)+' loaded · '+(data.published?'Source updated '+data.published.slice(0,10):'GLEIF registry response'):'Awaiting registry'}</small></div>
  </div>
  <div className="gd-tools"><div>{!onlySaved&&<span>{busy?'Updating registry…':data?.results.length?format(data.results.length)+' source-linked records on this page':'Registry results'}</span>}{onlySaved&&<span>Locally saved records · never a watchlist of live prices</span>}</div><button type="button" onClick={()=>{if(shown.length)exportCsv(shown);else setMessage('Load some records before exporting a CSV.');}} disabled={!shown.length}>Export loaded CSV <span aria-hidden="true">↗</span></button></div>
  {message&&<div role="status" className="gd-message">{message}<button type="button" onClick={()=>setMessage('')} aria-label="Dismiss message">×</button></div>}
  {error&&!onlySaved&&<div className="gd-feedback" role="alert"><strong>Company directory could not refresh.</strong><p>{error}</p><div><button type="button" onClick={()=>void load(1,false,query,country)}>Try again</button><a href="https://search.gleif.org/" target="_blank" rel="noopener noreferrer">Visit official GLEIF ↗</a></div></div>}
  {busy&&!data&&!onlySaved&&<div className="gd-loading" role="status">Retrieving official legal-entity records…</div>}
  {shown.length>0?<div className="gd-grid" aria-live="polite">{shown.map(e=><article className="gd-company" key={e.lei}>
   <div className="gd-company-header"><span className="gd-company-avatar" aria-hidden="true">{e.name.trim().slice(0,1).toUpperCase()}</span><button type="button" className={'gd-bookmark'+(savedSet.has(e.lei)?' is-saved':'')} aria-label={(savedSet.has(e.lei)?'Remove bookmarked ':'Bookmark ')+e.name} aria-pressed={savedSet.has(e.lei)} onClick={()=>toggleSaved(e)}>{savedSet.has(e.lei)?'★':'☆'}</button></div>
   <h3><Link href={'/lei/'+e.lei}>{e.name}</Link></h3>
   <div className="gd-company-meta"><span>{e.country?region(e.country):'Country unavailable'}</span><span className={'gd-status'+(e.registrationStatus==='ISSUED'?' gd-issued':'')}>{'LEI: '+(e.registrationStatus||'UNKNOWN')}</span></div>
   <div className="gd-company-bottom"><span>LEI</span><code>{e.lei}</code></div>
   <Link className="gd-company-link" href={'/lei/'+e.lei}>View company record <span aria-hidden="true">↗</span></Link>
  </article>)}</div>:!busy&&!error&&<div className="gd-empty"><span aria-hidden="true">◇</span><h3>{onlySaved?'No matching bookmarks':'No legal-entity records returned'}</h3><p>{onlySaved?'Bookmark entities from the directory and they will appear here on this device.':'Try another company name or browse a different country. Not having an LEI record does not prove that a company does not exist.'}</p>{onlySaved&&<button type="button" onClick={()=>setOnlySaved(false)}>Browse all companies</button>}</div>}
  {!onlySaved&&data?.hasMore&&<div className="gd-more"><button type="button" disabled={busy||loadingMore} onClick={loadNext}>{loadingMore?'Loading more companies…':'Load 36 more companies'} <span aria-hidden="true">↓</span></button><p>Showing {format(loaded)} of {format(data.total)} matching GLEIF records. The public API limits deep pagination to 10,000 records per search; filter by country or name to explore further.</p></div>}
  <div className="gd-disclosure"><strong>Identity is not a rating.</strong> GLEIF records identify legal entities; their LEI status does not confirm exchange listing, profitability, company valuation or creditworthiness. Industry sectors and live share prices are not inferred. Bookmarks stay in this browser.</div>
 </div>;
}
