'use client';
import {useRouter} from 'next/navigation';
import {createAssessment,type CompanyKind} from '@/lib/assessment';
import type {LeiEntity} from '@/lib/gleif';
export default function LEIStartAssessment({entity}:{entity:LeiEntity}){
 const router=useRouter();
 function begin(kind:CompanyKind){
  const a=createAssessment(new Date().toISOString().slice(0,10));
  a.name=entity.name;a.identifier=entity.lei;a.country=entity.country||entity.jurisdiction||'Not specified';
  a.kind=kind;a.industry='General';
  a.analystNotes='Identity pre-filled from a GLEIF LEI reference record. The listed/private status was selected by the user and has not been independently verified. Financial values and share prices still need source evidence.';
  a.evidence=[{id:'lei-'+entity.lei,title:'GLEIF LEI record: '+entity.name,url:entity.sourceUrl,
   kind:'independent_third_party',claim:'identity',asOf:entity.lastUpdate.slice(0,10),
   notes:'GLEIF public legal-entity reference data only. Does not verify listing status, financials, share prices or ownership value.'}];
  try{sessionStorage.setItem('creqor.workbench.handoff.v1',JSON.stringify(a));router.push('/workbench');}
  catch{router.push('/workbench');}
 }
 return <div className="lei-start-actions"><p>Which assessment do you want to build? LEI registration does not establish a stock listing.</p>
  <div><button type="button" onClick={()=>begin('listed')}>Assess as listed ↗</button><button type="button" onClick={()=>begin('unlisted')}>Assess as unlisted ↗</button></div>
 </div>;
}
