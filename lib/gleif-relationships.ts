import {createHash} from 'node:crypto';
import {getSourceCataloguePool} from './catalogue-store';

/**
 * GLEIF Level 2 data: relationship records (RR-CDF) and reporting exceptions.
 * Parsing keeps only what the official files state. A relationship is a reported
 * accounting-consolidation, branch or fund link between two LEIs; it is never
 * inferred from names, addresses or other similarity.
 */
export type CsvRow=Record<string,string|undefined>;
export type Relationship={childLei:string;parentLei:string;type:string;status:string;registrationStatus:string;
 validationSources:string;relationshipStart:string;relationshipEnd:string;accountingStart:string;accountingEnd:string;
 qualifiers:string;quantifiers:string;lastUpdate:string;managingLou:string;sha256:string};
export type ReportingException={lei:string;category:string;reasons:string[];refs:string[];sha256:string};
const LEI=/^[A-Z0-9]{20}$/;
const f=(row:CsvRow,key:string)=>(row[key]||'').trim();
export const RR_REQUIRED=['Relationship.StartNode.NodeID','Relationship.EndNode.NodeID','Relationship.RelationshipType'];
export const REPEX_REQUIRED=['LEI','Exception.Category','Exception.Reason.1'];
export function requireHeaders(headers:string[],required:string[]){
 const present=new Set(headers.map(h=>h.replace(/^﻿/,'').trim()));
 for(const r of required)if(!present.has(r))throw new Error('GLEIF_L2_SCHEMA_MISSING_'+r);
}
function sha(o:unknown){return createHash('sha256').update(JSON.stringify(o)).digest('hex');}
export function parseRelationshipRow(row:CsvRow):Relationship|null{
 const childLei=f(row,'Relationship.StartNode.NodeID').toUpperCase();
 const parentLei=f(row,'Relationship.EndNode.NodeID').toUpperCase();
 const type=f(row,'Relationship.RelationshipType');
 if(!LEI.test(childLei)||!LEI.test(parentLei)||childLei===parentLei||!/^[A-Z_-]{3,60}$/.test(type))return null;
 if(f(row,'Relationship.StartNode.NodeIDType')&&f(row,'Relationship.StartNode.NodeIDType')!=='LEI')return null;
 if(f(row,'Relationship.EndNode.NodeIDType')&&f(row,'Relationship.EndNode.NodeIDType')!=='LEI')return null;
 let relationshipStart='',relationshipEnd='',accountingStart='',accountingEnd='';
 for(let i=1;i<=5;i++){
  const t=f(row,`Relationship.Period.${i}.periodType`);
  const s=f(row,`Relationship.Period.${i}.startDate`).slice(0,10),e=f(row,`Relationship.Period.${i}.endDate`).slice(0,10);
  if(t==='RELATIONSHIP_PERIOD'&&!relationshipStart){relationshipStart=s;relationshipEnd=e;}
  if(t==='ACCOUNTING_PERIOD'&&!accountingStart){accountingStart=s;accountingEnd=e;}
 }
 const qualifiers:string[]=[],quantifiers:string[]=[];
 for(let i=1;i<=5;i++){
  const d=f(row,`Relationship.Qualifiers.${i}.QualifierDimension`),c=f(row,`Relationship.Qualifiers.${i}.QualifierCategory`);
  if(d||c)qualifiers.push(d+': '+c);
  const amt=f(row,`Relationship.Quantifiers.${i}.QuantifierAmount`),unit=f(row,`Relationship.Quantifiers.${i}.QuantifierUnits`),
   m=f(row,`Relationship.Quantifiers.${i}.MeasurementMethod`);
  if(amt&&/^-?\d+(\.\d+)?$/.test(amt))quantifiers.push(amt+(unit?' '+unit:'')+(m?' ('+m+')':''));
 }
 const managingLou=f(row,'Registration.ManagingLOU').toUpperCase();
 const r={childLei,parentLei,type,status:f(row,'Relationship.RelationshipStatus'),
  registrationStatus:f(row,'Registration.RegistrationStatus'),validationSources:f(row,'Registration.ValidationSources'),
  relationshipStart,relationshipEnd,accountingStart,accountingEnd,
  qualifiers:qualifiers.join(' | ').slice(0,500),quantifiers:quantifiers.join(' | ').slice(0,300),
  lastUpdate:f(row,'Registration.LastUpdateDate'),managingLou:LEI.test(managingLou)?managingLou:''};
 return {...r,sha256:sha(r)};
}
export function parseExceptionRow(row:CsvRow):ReportingException|null{
 const lei=f(row,'LEI').toUpperCase(),category=f(row,'Exception.Category');
 if(!LEI.test(lei)||!/^[A-Z_]{3,60}$/.test(category))return null;
 const reasons:string[]=[],refs:string[]=[];
 for(let i=1;i<=5;i++){
  const r=f(row,`Exception.Reason.${i}`);if(/^[A-Z_]{3,60}$/.test(r))reasons.push(r);
  const ref=f(row,`Exception.Reference.${i}`);if(ref)refs.push(ref.slice(0,300));
 }
 if(!reasons.length)return null;
 const e={lei,category,reasons,refs};
 return {...e,sha256:sha(e)};
}
export async function upsertRelationships(rows:Relationship[],runId:number){
 if(!rows.length)return {inserted:0,changed:0};
 const unique=new Map(rows.map(r=>[r.childLei+r.parentLei+r.type,r]));
 const body=JSON.stringify([...unique.values()]);
 const client=await getSourceCataloguePool().connect();
 try{
  await client.query('BEGIN');
  const res=await client.query<{inserted:boolean}>(`
   INSERT INTO public.cq_lei_relationships(child_lei,parent_lei,relationship_type,relationship_status,registration_status,
    validation_sources,relationship_start,relationship_end,accounting_period_start,accounting_period_end,qualifiers,quantifiers,
    last_update,managing_lou,source_sha256,first_seen_run_id,last_changed_run_id,last_seen_run_id)
   SELECT r."childLei",r."parentLei",r.type,r.status,r."registrationStatus",r."validationSources",r."relationshipStart",
    r."relationshipEnd",r."accountingStart",r."accountingEnd",r.qualifiers,r.quantifiers,r."lastUpdate",r."managingLou",r.sha256,$2,$2,$2
   FROM jsonb_to_recordset($1::jsonb) AS r("childLei" text,"parentLei" text,type text,status text,"registrationStatus" text,
    "validationSources" text,"relationshipStart" text,"relationshipEnd" text,"accountingStart" text,"accountingEnd" text,
    qualifiers text,quantifiers text,"lastUpdate" text,"managingLou" text,sha256 text)
   ON CONFLICT(child_lei,parent_lei,relationship_type) DO UPDATE SET
    relationship_status=EXCLUDED.relationship_status,registration_status=EXCLUDED.registration_status,
    validation_sources=EXCLUDED.validation_sources,relationship_start=EXCLUDED.relationship_start,
    relationship_end=EXCLUDED.relationship_end,accounting_period_start=EXCLUDED.accounting_period_start,
    accounting_period_end=EXCLUDED.accounting_period_end,qualifiers=EXCLUDED.qualifiers,quantifiers=EXCLUDED.quantifiers,
    last_update=EXCLUDED.last_update,managing_lou=EXCLUDED.managing_lou,source_sha256=EXCLUDED.source_sha256,
    last_changed_run_id=EXCLUDED.last_changed_run_id,last_seen_run_id=EXCLUDED.last_seen_run_id,last_changed_at=now()
   WHERE public.cq_lei_relationships.source_sha256 IS DISTINCT FROM EXCLUDED.source_sha256
   RETURNING (xmax=0) AS inserted`,[body,runId]);
  await client.query(`UPDATE public.cq_lei_relationships r SET last_seen_run_id=$2
   FROM jsonb_to_recordset($1::jsonb) AS x("childLei" text,"parentLei" text,type text)
   WHERE r.child_lei=x."childLei" AND r.parent_lei=x."parentLei" AND r.relationship_type=x.type
   AND r.last_seen_run_id IS DISTINCT FROM $2`,[body,runId]);
  await client.query('COMMIT');
  const inserted=res.rows.filter(r=>r.inserted).length;
  return {inserted,changed:(res.rowCount??0)-inserted};
 }catch(e){await client.query('ROLLBACK');throw e;}
 finally{client.release();}
}
export async function upsertExceptions(rows:ReportingException[],runId:number){
 if(!rows.length)return {inserted:0,changed:0};
 const unique=new Map(rows.map(r=>[r.lei+r.category,r]));
 const body=JSON.stringify([...unique.values()]);
 const client=await getSourceCataloguePool().connect();
 try{
  await client.query('BEGIN');
  const res=await client.query<{inserted:boolean}>(`
   INSERT INTO public.cq_lei_reporting_exceptions(lei,category,reasons,refs,source_sha256,first_seen_run_id,last_changed_run_id,last_seen_run_id)
   SELECT r.lei,r.category,ARRAY(SELECT jsonb_array_elements_text(r.reasons)),ARRAY(SELECT jsonb_array_elements_text(r.refs)),r.sha256,$2,$2,$2
   FROM jsonb_to_recordset($1::jsonb) AS r(lei text,category text,reasons jsonb,refs jsonb,sha256 text)
   ON CONFLICT(lei,category) DO UPDATE SET reasons=EXCLUDED.reasons,refs=EXCLUDED.refs,source_sha256=EXCLUDED.source_sha256,
    last_changed_run_id=EXCLUDED.last_changed_run_id,last_seen_run_id=EXCLUDED.last_seen_run_id,last_changed_at=now()
   WHERE public.cq_lei_reporting_exceptions.source_sha256 IS DISTINCT FROM EXCLUDED.source_sha256
   RETURNING (xmax=0) AS inserted`,[body,runId]);
  await client.query(`UPDATE public.cq_lei_reporting_exceptions e SET last_seen_run_id=$2
   FROM jsonb_to_recordset($1::jsonb) AS x(lei text,category text)
   WHERE e.lei=x.lei AND e.category=x.category AND e.last_seen_run_id IS DISTINCT FROM $2`,[body,runId]);
  await client.query('COMMIT');
  const inserted=res.rows.filter(r=>r.inserted).length;
  return {inserted,changed:(res.rowCount??0)-inserted};
 }catch(e){await client.query('ROLLBACK');throw e;}
 finally{client.release();}
}
