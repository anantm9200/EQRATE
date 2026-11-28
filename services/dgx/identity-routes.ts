/**
 * Identity routes of the private DGX engine: the global directory, featured entities and
 * the latest GLEIF Golden Copy publication, all served from the imported Golden Copy in
 * cq_lei_catalogue. No live GLEIF calls are made here (the DGX cannot reach api.gleif.org).
 */
import type {Pool} from 'pg';
import type {LeiEntity} from '../../lib/gleif';
import {FEATURED_ENTITY_NAMES,FEATURED_UNIVERSE_LIMIT,selectFeaturedEntity,type CompanyUniverseRecord} from '../../lib/company-universe';

export const DIRECTORY_PAGE_SIZE=60;
/** Bounded offset pagination: page × 60 never exceeds 12,000 rows per filter. */
export const DIRECTORY_MAX_PAGE=200;
/** Filtered totals are counted exactly up to this bound, then reported as a lower bound. */
export const DIRECTORY_COUNT_CAP=250000;

export type GoldenCopyPublication={runId:number;publishDate:string|null;officialRecords:number|null;
 rowsRead:number;importedAt:string|null;archiveSha256:string|null};

/** Latest complete, unlimited Golden Copy import (the publication the index reflects). */
export async function goldenCopyPublication(db:Pool):Promise<GoldenCopyPublication|null>{
 const r=await db.query<{id:string;source_publish_date:string|null;source_reported_records:string|null;rows_read:string;
  finished_at:Date|null;archive_sha256:string|null}>(
  `SELECT id::text,source_publish_date,source_reported_records::text,rows_read::text,finished_at,archive_sha256
   FROM public.cq_bulk_source_runs WHERE source='GLEIF_GOLDEN_COPY' AND status='complete' AND row_limit IS NULL
   ORDER BY id DESC LIMIT 1`);
 const x=r.rows[0];
 if(!x)return null;
 return {runId:Number(x.id),publishDate:x.source_publish_date,
  officialRecords:x.source_reported_records===null?null:Number(x.source_reported_records),
  rowsRead:Number(x.rows_read),importedAt:x.finished_at?.toISOString()||null,archiveSha256:x.archive_sha256?.trim()||null};
}

export type DirectoryFilters={q:string;country:string;page:number};
export function parseDirectoryFilters(sp:URLSearchParams):DirectoryFilters{
 const q=(sp.get('q')||'').trim();
 const country=(sp.get('country')||'').trim().toUpperCase();
 const rawPage=sp.get('page')||'1';
 if(!/^\d{1,3}$/.test(rawPage))throw new Error('BAD_DIRECTORY_PAGE');
 const page=Number(rawPage);
 if(page<1||page>DIRECTORY_MAX_PAGE)throw new Error('BAD_DIRECTORY_PAGE');
 if(q.length>90||(q.length>0&&q.length<2))throw new Error('BAD_DIRECTORY_QUERY');
 if(country&&!/^[A-Z]{2}$/.test(country))throw new Error('BAD_DIRECTORY_COUNTRY');
 return {q,country,page};
}

/** One page of the global directory: ISSUED registrations first, then legal name. */
export async function directoryPage(db:Pool,f:DirectoryFilters){
 const where:string[]=[],params:(string|number)[]=[];
 if(f.q){params.push(f.q.toLowerCase().replace(/[\\%_]/g,'\\$&')+'%');where.push('lower(legal_name) LIKE $'+params.length);}
 if(f.country){params.push(f.country);where.push('country_code = $'+params.length);}
 const filter=where.length?'WHERE '+where.join(' AND '):'';
 const [rows,publication,total]=await Promise.all([
  db.query<{source_payload:LeiEntity}>(
   `SELECT source_payload FROM public.cq_lei_catalogue ${filter}
    ORDER BY (registration_status<>'ISSUED'),lower(legal_name),lei
    LIMIT $${params.length+1} OFFSET $${params.length+2}`,[...params,DIRECTORY_PAGE_SIZE,(f.page-1)*DIRECTORY_PAGE_SIZE]),
  goldenCopyPublication(db),
  directoryTotal(db,filter,params)
 ]);
 const results=rows.rows.map(r=>r.source_payload);
 const window=DIRECTORY_MAX_PAGE*DIRECTORY_PAGE_SIZE;
 return {results,total:total.n,totalIsLowerBound:total.lowerBound,page:f.page,pageSize:DIRECTORY_PAGE_SIZE,
  hasMore:results.length===DIRECTORY_PAGE_SIZE&&f.page*DIRECTORY_PAGE_SIZE<Math.min(total.n,window),
  maxPage:DIRECTORY_MAX_PAGE,published:publication?.publishDate||'',source:'GLEIF' as const,origin:'private-index' as const,
  notice:'From the GLEIF Golden Copy imported to CREQOR’s private index. LEI coverage is not universal; this list does not establish share listing, sector, audited financials, market prices or ratings.'};
}
async function directoryTotal(db:Pool,filter:string,params:(string|number)[]):Promise<{n:number;lowerBound:boolean}>{
 if(!filter){
  // Unfiltered: the maintained exact count (cq_stat_counts), never a per-request full scan.
  const kept=await db.query<{value:string|null}>(`SELECT value::text FROM public.cq_stat_counts WHERE name='leiEntities'`);
  if(kept.rows[0]?.value!=null)return {n:Number(kept.rows[0].value),lowerBound:false};
 }
 const r=await db.query<{n:string}>(`SELECT count(*)::text n FROM (SELECT 1 FROM public.cq_lei_catalogue ${filter} LIMIT ${DIRECTORY_COUNT_CAP+1}) s`,params);
 const n=Number(r.rows[0]?.n||0);
 return n>DIRECTORY_COUNT_CAP?{n:DIRECTORY_COUNT_CAP,lowerBound:true}:{n,lowerBound:false};
}

/** Index-friendly LIKE prefix for a featured name: lower-case text up to the first punctuation. */
export function featuredPrefix(name:string):string{
 const lower=name.toLowerCase();
 const cut=lower.search(/[^a-z0-9 ]/);
 return (cut===-1?lower:lower.slice(0,cut)).trimEnd().replace(/[\\%_]/g,'\\$&')+'%';
}
const toCard=(e:LeiEntity):CompanyUniverseRecord=>({lei:e.lei,name:e.name,country:e.country,jurisdiction:e.jurisdiction,
 registrationStatus:e.registrationStatus,status:e.status,sourceUrl:e.sourceUrl,lastUpdate:e.lastUpdate});

/** Featured names resolved by normalized exact legal name (ISSUED preferred), then filled
 *  with ISSUED Indian entities (listed CIN first) from the same index. Nothing is generated. */
export async function featuredEntities(db:Pool){
 const prefixes=FEATURED_ENTITY_NAMES.map(featuredPrefix);
 const candidates=await db.query<{k:number;source_payload:LeiEntity}>(
  `SELECT p.k::int k,c.source_payload FROM unnest($1::text[]) WITH ORDINALITY p(prefix,k)
   CROSS JOIN LATERAL (SELECT source_payload FROM public.cq_lei_catalogue
    WHERE lower(legal_name) LIKE p.prefix ORDER BY (registration_status<>'ISSUED'),lower(legal_name),lei LIMIT 40) c`,[prefixes]);
 const seen=new Set<string>(),records:CompanyUniverseRecord[]=[];
 FEATURED_ENTITY_NAMES.forEach((name,i)=>{
  const pick=selectFeaturedEntity(name,candidates.rows.filter(r=>r.k===i+1).map(r=>r.source_payload));
  if(pick&&!seen.has(pick.lei)){seen.add(pick.lei);records.push(toCard(pick));}
 });
 const resolved=records.length;
 if(records.length<FEATURED_UNIVERSE_LIMIT){
  const fill=await db.query<{source_payload:LeiEntity}>(
   `SELECT c.source_payload FROM public.cq_lei_catalogue c
    LEFT JOIN public.cq_india_entities i ON i.lei=c.lei
    WHERE c.country_code='IN' AND c.registration_status='ISSUED' AND NOT (c.lei = ANY($1::text[]))
    ORDER BY (i.cin_listing IS DISTINCT FROM 'L'),(c.entity_status<>'ACTIVE'),lower(c.legal_name),c.lei LIMIT $2`,
   [[...seen],FEATURED_UNIVERSE_LIMIT-records.length]);
  for(const r of fill.rows)if(!seen.has(r.source_payload.lei)){seen.add(r.source_payload.lei);records.push(toCard(r.source_payload));}
 }
 return {records:records.slice(0,FEATURED_UNIVERSE_LIMIT),attempted:FEATURED_ENTITY_NAMES.length,resolved,origin:'private-index' as const};
}
