/**
 * Corporate-structure and India intelligence queries for the private engine.
 * Everything is read from imported official GLEIF Level 1/Level 2 records.
 */
import {getSourceCataloguePool} from '../../lib/catalogue-store';
import {IN_REGION,CIN_CLASS,PAN_HOLDER} from '../../lib/india';

type Node={lei:string;name:string|null;country:string|null;registrationStatus:string|null;indexed:boolean};
export type RelationshipEdge={type:string;status:string;relationshipRegistrationStatus:string;validationSources:string;
 relationshipStart:string;relationshipEnd:string;accountingStart:string;accountingEnd:string;quantifiers:string;lastUpdate:string};
export type CorporateLinks={
 directParent:(Node&RelationshipEdge)|null;ultimateParent:(Node&RelationshipEdge)|null;
 otherParents:(Node&RelationshipEdge)[];
 directChildren:{total:number;sample:(Node&{type:string;status:string})[]};
 ultimateChildren:number;
 exceptions:{category:string;reasons:string[]}[];
};
const EDGE_COLS=`r.relationship_type type,r.relationship_status status,r.registration_status reg,r.validation_sources vs,
 r.relationship_start rs,r.relationship_end re,r.accounting_period_start ast,r.accounting_period_end aen,r.quantifiers q,r.last_update lu`;
type EdgeRow={lei:string;name:string|null;country:string|null;registration_status:string|null;type:string;status:string;reg:string;
 vs:string;rs:string;re:string;ast:string;aen:string;q:string;lu:string};
const toEdge=(x:EdgeRow):Node&RelationshipEdge=>({lei:x.lei.trim(),name:x.name,country:x.country?.trim()||null,
 registrationStatus:x.registration_status,indexed:x.name!==null,type:x.type,status:x.status,relationshipRegistrationStatus:x.reg,
 validationSources:x.vs,relationshipStart:x.rs,relationshipEnd:x.re,accountingStart:x.ast,accountingEnd:x.aen,quantifiers:x.q,lastUpdate:x.lu});

export async function relationshipTablesReady():Promise<boolean>{
 const r=await getSourceCataloguePool().query<{ok:boolean}>(`SELECT to_regclass('public.cq_lei_relationships') IS NOT NULL ok`);
 return Boolean(r.rows[0]?.ok);
}
/**
 * Latest fully imported Level 2 publications. Current-data queries only read rows
 * confirmed by (last_seen_run_id >=) these runs, so records dropped from a newer
 * complete publication disappear instead of lingering as stale facts.
 */
export async function level2Runs():Promise<{rr:number;repex:number}|null>{
 if(!await relationshipTablesReady())return null;
 const r=await getSourceCataloguePool().query<{source:string;id:string}>(`SELECT source,max(id)::text id FROM public.cq_bulk_source_runs
  WHERE source IN ('GLEIF_RR','GLEIF_REPEX') AND status='complete' GROUP BY source`);
 const rr=r.rows.find(x=>x.source==='GLEIF_RR'),repex=r.rows.find(x=>x.source==='GLEIF_REPEX');
 return rr&&repex?{rr:Number(rr.id),repex:Number(repex.id)}:null;
}
/** Level 2 conclusions (e.g. "no parent reported") are only valid once both official files were fully imported. */
export async function level2Complete():Promise<boolean>{return (await level2Runs())!==null;}
const CHILD_TYPES=`('IS_DIRECTLY_CONSOLIDATED_BY','IS_INTERNATIONAL_BRANCH_OF')`;
export async function corporateLinks(lei:string):Promise<CorporateLinks|null>{
 const runs=await level2Runs();
 if(!runs)return null;
 const db=getSourceCataloguePool();
 const [parents,childCount,children,ultimateChildren,exceptions]=await Promise.all([
  db.query<EdgeRow>(`SELECT r.parent_lei lei,c.legal_name name,c.country_code country,c.registration_status,${EDGE_COLS}
   FROM public.cq_lei_relationships r LEFT JOIN public.cq_lei_catalogue c ON c.lei=r.parent_lei
   WHERE r.child_lei=$1 AND r.last_seen_run_id>=$2 ORDER BY r.relationship_type,r.last_seen_run_id DESC`,[lei,runs.rr]),
  db.query<{n:string}>(`SELECT count(*)::text n FROM public.cq_lei_relationships
   WHERE parent_lei=$1 AND relationship_type IN ${CHILD_TYPES} AND last_seen_run_id>=$2`,[lei,runs.rr]),
  db.query<{lei:string;name:string|null;country:string|null;registration_status:string|null;type:string;status:string}>(
   `SELECT r.child_lei lei,c.legal_name name,c.country_code country,c.registration_status,r.relationship_type type,r.relationship_status status
    FROM public.cq_lei_relationships r LEFT JOIN public.cq_lei_catalogue c ON c.lei=r.child_lei
    WHERE r.parent_lei=$1 AND r.relationship_type IN ${CHILD_TYPES} AND r.last_seen_run_id>=$2
    ORDER BY (r.relationship_status='ACTIVE') DESC,c.legal_name NULLS LAST LIMIT 40`,[lei,runs.rr]),
  db.query<{n:string}>(`SELECT count(*)::text n FROM public.cq_lei_relationships
   WHERE parent_lei=$1 AND relationship_type='IS_ULTIMATELY_CONSOLIDATED_BY' AND last_seen_run_id>=$2`,[lei,runs.rr]),
  db.query<{category:string;reasons:string[]}>(`SELECT category,reasons FROM public.cq_lei_reporting_exceptions
   WHERE lei=$1 AND last_seen_run_id>=$2 ORDER BY category`,[lei,runs.repex])
 ]);
 const edges=parents.rows.map(toEdge);
 return {
  directParent:edges.find(e=>e.type==='IS_DIRECTLY_CONSOLIDATED_BY')||null,
  ultimateParent:edges.find(e=>e.type==='IS_ULTIMATELY_CONSOLIDATED_BY')||null,
  otherParents:edges.filter(e=>!['IS_DIRECTLY_CONSOLIDATED_BY','IS_ULTIMATELY_CONSOLIDATED_BY'].includes(e.type)),
  directChildren:{total:Number(childCount.rows[0]?.n||0),sample:children.rows.map(c=>({lei:c.lei.trim(),name:c.name,
   country:c.country?.trim()||null,registrationStatus:c.registration_status,indexed:c.name!==null,type:c.type,status:c.status}))},
  ultimateChildren:Number(ultimateChildren.rows[0]?.n||0),
  exceptions:exceptions.rows
 };
}
const EXCEPTION_TEXT:Record<string,string>={
 NATURAL_PERSONS:'controlled by one or more natural persons (no legal-entity parent)',
 NON_CONSOLIDATING:'the controlling entity does not prepare consolidated financial statements that include this entity',
 NO_KNOWN_PERSON:'no known controlling person or entity',
 NO_LEI:'the parent exists but has no LEI',
 NON_PUBLIC:'parent information is withheld as non-public',
 BINDING_LEGAL_COMMITMENTS:'parent information is withheld because of binding legal commitments',
 LEGAL_OBSTACLES:'parent information is withheld because of legal obstacles',
 DISCLOSURE_DETRIMENTAL:'parent information is withheld because disclosure would be detrimental',
 CONSENT_NOT_OBTAINED:'parent consent to publication was not obtained',
 DETRIMENT_NOT_EXCLUDED:'parent information is withheld because detriment could not be excluded'
};
export type LinkLead={code:string;severity:'info'|'low'|'medium';title:string;explanation:string;evidence:Record<string,unknown>};
export function corporateLinkLeads(l:CorporateLinks|null):LinkLead[]{
 if(!l)return [];
 const out:LinkLead[]=[];
 for(const [label,edge,category] of [['direct',l.directParent,'DIRECT_ACCOUNTING_CONSOLIDATION_PARENT'],
  ['ultimate',l.ultimateParent,'ULTIMATE_ACCOUNTING_CONSOLIDATION_PARENT']] as const){
  const ex=l.exceptions.find(e=>e.category===category);
  if(!edge&&!ex)out.push({code:'NO_'+label.toUpperCase()+'_PARENT_DATA',severity:'low',title:'No '+label+' parent or exception reported',
   explanation:'GLEIF expects either '+(label==='ultimate'?'an':'a')+' '+label+' accounting-consolidation parent or a reporting exception. Neither is present in the imported Level 2 data.',evidence:{}});
  if(ex){
   const withheld=ex.reasons.filter(r=>!['NATURAL_PERSONS','NON_CONSOLIDATING','NO_KNOWN_PERSON','NO_LEI'].includes(r));
   out.push({code:'PARENT_EXCEPTION_'+label.toUpperCase(),severity:withheld.length?'low':'info',
    title:(withheld.length?'Parent withheld':'Parent reporting exception')+' ('+label+')',
    explanation:'Registrant states: '+ex.reasons.map(r=>EXCEPTION_TEXT[r]||r).join('; ')+'.',evidence:{category,reasons:ex.reasons}});
  }
  if(edge&&!edge.indexed)out.push({code:'PARENT_NOT_IN_INDEX_'+label.toUpperCase(),severity:'low',title:'Reported '+label+' parent is not in the index',
   explanation:'The parent LEI in the relationship record is not present in the imported Golden Copy (it may be retired or newly issued).',evidence:{parentLei:edge.lei}});
  if(edge&&edge.registrationStatus&&edge.registrationStatus!=='ISSUED'&&edge.indexed)out.push({code:'PARENT_REGISTRATION_'+edge.registrationStatus+'_'+label.toUpperCase(),
   severity:'low',title:'Reported '+label+' parent LEI is '+edge.registrationStatus,
   explanation:'The parent entity’s own LEI is not in ISSUED status, so its reference data may be stale.',evidence:{parentLei:edge.lei,parentStatus:edge.registrationStatus}});
  if(edge&&edge.status&&edge.status!=='ACTIVE')out.push({code:'RELATIONSHIP_'+edge.status+'_'+label.toUpperCase(),severity:'info',
   title:'The '+label+' relationship is '+edge.status,explanation:'The relationship record is not active; the structure may have changed.',evidence:{status:edge.status}});
 }
 return out;
}
/** Group view: the subject's ultimate parent and every LEI reporting that same ultimate parent. */
export async function corporateGroup(lei:string){
 const runs=await level2Runs();
 if(!runs)return null;
 const db=getSourceCataloguePool();
 const up=await db.query<{parent_lei:string}>(`SELECT parent_lei FROM public.cq_lei_relationships
  WHERE child_lei=$1 AND relationship_type='IS_ULTIMATELY_CONSOLIDATED_BY' AND last_seen_run_id>=$2
  ORDER BY last_seen_run_id DESC LIMIT 1`,[lei,runs.rr]);
 const root=up.rows[0]?.parent_lei.trim()||lei;
 const members=await db.query<{lei:string}>(`SELECT child_lei lei FROM public.cq_lei_relationships
  WHERE parent_lei=$1 AND relationship_type='IS_ULTIMATELY_CONSOLIDATED_BY' AND last_seen_run_id>=$2 ORDER BY child_lei LIMIT 600`,[root,runs.rr]);
 // Always keep the subject in view, even when it sorts beyond the displayed members.
 const all=[...new Set([root,lei,...members.rows.map(m=>m.lei.trim())])];
 const total=await db.query<{n:string}>(`SELECT count(*)::text n FROM public.cq_lei_relationships
  WHERE parent_lei=$1 AND relationship_type='IS_ULTIMATELY_CONSOLIDATED_BY' AND last_seen_run_id>=$2`,[root,runs.rr]);
 const [nodes,edges]=await Promise.all([
  db.query<{lei:string;legal_name:string;country_code:string|null;registration_status:string}>(
   `SELECT lei,legal_name,country_code,registration_status FROM public.cq_lei_catalogue WHERE lei=ANY($1::char(20)[])`,[all]),
  db.query<{child_lei:string;parent_lei:string}>(`SELECT child_lei,parent_lei FROM public.cq_lei_relationships
   WHERE relationship_type='IS_DIRECTLY_CONSOLIDATED_BY' AND child_lei=ANY($1::char(20)[]) AND parent_lei=ANY($1::char(20)[])
   AND last_seen_run_id>=$2`,[all,runs.rr])
 ]);
 const byLei=new Map(nodes.rows.map(n=>[n.lei.trim(),n]));
 const countries=new Map<string,number>();
 for(const n of nodes.rows){const c=n.country_code?.trim()||'—';countries.set(c,(countries.get(c)||0)+1);}
 return {subject:lei,ultimateParent:root,membersReported:Number(total.rows[0]?.n||0),membersShown:all.length-1,
  nodes:all.map(l=>({lei:l,name:byLei.get(l)?.legal_name||null,country:byLei.get(l)?.country_code?.trim()||null,
   registrationStatus:byLei.get(l)?.registration_status||null,isSubject:l===lei,isUltimateParent:l===root})),
  edges:edges.rows.map(e=>({child:e.child_lei.trim(),parent:e.parent_lei.trim()})),
  countries:[...countries.entries()].sort((a,b)=>b[1]-a[1]).map(([country,count])=>({country,count})),
  caveat:'Members are entities that report this ultimate accounting-consolidation parent to GLEIF. Accounting consolidation is not the same as legal or beneficial ownership.'};
}
/** ISO 3166-2:IN codes that were superseded; both spellings appear in source addresses. */
export const REGION_ALIASES:Record<string,string[]>={TS:['TS','TG'],TG:['TS','TG'],CG:['CG','CT'],CT:['CG','CT'],
 OD:['OD','OR'],OR:['OD','OR'],UK:['UK','UT'],UT:['UK','UT'],DH:['DH','DN','DD']};
const CANONICAL:Record<string,string>={TG:'TS',CT:'CG',OR:'OD',UT:'UK',DN:'DH',DD:'DH'};
export function mergeRegions(rows:{code:string;entities:number;issued:number}[]){
 const m=new Map<string,{code:string;name:string;entities:number;issued:number}>();
 for(const r of rows){const code=CANONICAL[r.code]||r.code;const cur=m.get(code)||{code,name:IN_REGION[code]||'not decoded',entities:0,issued:0};
  cur.entities+=r.entities;cur.issued+=r.issued;m.set(code,cur);}
 return [...m.values()].sort((a,b)=>b.entities-a.entities);
}
async function indiaReady(){
 const r=await getSourceCataloguePool().query<{ok:boolean}>(`SELECT to_regclass('public.cq_india_entities') IS NOT NULL ok`);
 return Boolean(r.rows[0]?.ok);
}
export async function indiaOverview(){
 if(!await indiaReady())return null;
 const db=getSourceCataloguePool();
 const q=<T extends Record<string,unknown>>(sql:string,p:unknown[]=[])=>db.query<T>(sql,p).then(r=>r.rows);
 const runs=await level2Runs();
 const rel=runs!==null;
 const rr=runs?.rr??0,rx=runs?.repex??0;
 const [totals,regions,classes,decades,recent,pan,ras,foreignParents,topParents,exceptionReasons,parentTotal]=await Promise.all([
  q<{total:string;issued:string;lapsed:string;other:string;cin:string;listed:string;unlisted:string;gstin:string;region:string}>(
   `SELECT count(*)::text total,count(*) FILTER (WHERE registration_status='ISSUED')::text issued,
    count(*) FILTER (WHERE registration_status='LAPSED')::text lapsed,
    count(*) FILTER (WHERE registration_status NOT IN ('ISSUED','LAPSED'))::text other,
    count(*) FILTER (WHERE has_cin)::text cin,count(*) FILTER (WHERE cin_listing='L')::text listed,
    count(*) FILTER (WHERE cin_listing='U')::text unlisted,count(*) FILTER (WHERE gst_state_code IS NOT NULL)::text gstin,
    count(*) FILTER (WHERE address_region IS NOT NULL)::text region FROM public.cq_india_entities`),
  q<{code:string;n:string;issued:string}>(`SELECT address_region code,count(*)::text n,count(*) FILTER (WHERE registration_status='ISSUED')::text issued
   FROM public.cq_india_entities WHERE address_region IS NOT NULL GROUP BY 1 ORDER BY count(*) DESC`),
  q<{code:string;n:string;listed:string}>(`SELECT cin_class code,count(*)::text n,count(*) FILTER (WHERE cin_listing='L')::text listed
   FROM public.cq_india_entities WHERE has_cin GROUP BY 1 ORDER BY count(*) DESC`),
  q<{decade:number;n:string}>(`SELECT (cin_year/10)*10 decade,count(*)::text n FROM public.cq_india_entities
   WHERE has_cin AND cin_year BETWEEN 1850 AND extract(year FROM now())::int GROUP BY 1 ORDER BY 1`),
  q<{year:number;n:string}>(`SELECT cin_year AS year,count(*)::text n FROM public.cq_india_entities
   WHERE has_cin AND cin_year BETWEEN extract(year FROM now())::int-11 AND extract(year FROM now())::int GROUP BY 1 ORDER BY 1`),
  q<{code:string;n:string}>(`SELECT pan_holder_type code,count(*)::text n FROM public.cq_india_entities
   WHERE pan_holder_type IS NOT NULL GROUP BY 1 ORDER BY count(*) DESC`),
  q<{code:string;n:string}>(`SELECT registration_authority code,count(*)::text n FROM public.cq_india_entities GROUP BY 1 ORDER BY count(*) DESC LIMIT 8`),
  rel?q<{country:string;n:string}>(`SELECT coalesce(p.country_code,'—') country,count(*)::text n
   FROM public.cq_india_entities i JOIN public.cq_lei_relationships r ON r.child_lei=i.lei AND r.relationship_type='IS_ULTIMATELY_CONSOLIDATED_BY'
   AND r.last_seen_run_id>=$1 LEFT JOIN public.cq_lei_catalogue p ON p.lei=r.parent_lei GROUP BY 1 ORDER BY count(*) DESC LIMIT 12`,[rr]):Promise.resolve([]),
  rel?q<{lei:string;name:string|null;country:string|null;n:string}>(`SELECT r.parent_lei lei,p.legal_name name,p.country_code country,count(*)::text n
   FROM public.cq_india_entities i JOIN public.cq_lei_relationships r ON r.child_lei=i.lei AND r.relationship_type='IS_ULTIMATELY_CONSOLIDATED_BY'
   AND r.last_seen_run_id>=$1 LEFT JOIN public.cq_lei_catalogue p ON p.lei=r.parent_lei GROUP BY 1,2,3 ORDER BY count(*) DESC LIMIT 15`,[rr]):Promise.resolve([]),
  rel?q<{reason:string;n:string}>(`SELECT unnest(e.reasons) reason,count(*)::text n FROM public.cq_india_entities i
   JOIN public.cq_lei_reporting_exceptions e ON e.lei=i.lei AND e.category='ULTIMATE_ACCOUNTING_CONSOLIDATION_PARENT'
   AND e.last_seen_run_id>=$1 GROUP BY 1 ORDER BY count(*) DESC`,[rx]):Promise.resolve([]),
  rel?q<{n:string}>(`SELECT count(DISTINCT i.lei)::text n FROM public.cq_india_entities i JOIN public.cq_lei_relationships r
   ON r.child_lei=i.lei AND r.relationship_type='IS_ULTIMATELY_CONSOLIDATED_BY' AND r.last_seen_run_id>=$1`,[rr]):Promise.resolve([{n:'0'}])
 ]);
 const t=totals[0];
 const num=(s:string|undefined)=>Number(s||0);
 const withParent=num(parentTotal[0]?.n);
 return {
  totals:{entities:num(t.total),issued:num(t.issued),lapsed:num(t.lapsed),otherStatus:num(t.other),withCin:num(t.cin),
   listedByCin:num(t.listed),unlistedByCin:num(t.unlisted),withGstin:num(t.gstin),withAddressRegion:num(t.region),
   withReportedUltimateParent:withParent},
  byRegion:mergeRegions(regions.map(r=>({code:r.code,entities:num(r.n),issued:num(r.issued)}))),
  byCompanyClass:classes.map(c=>({code:c.code,label:CIN_CLASS[c.code]||'not decoded',entities:num(c.n),listed:num(c.listed)})),
  byIncorporationDecade:decades.map(d=>({decade:d.decade,entities:num(d.n)})),
  byIncorporationYearRecent:recent.map(y=>({year:y.year,entities:num(y.n)})),
  byPanHolderType:pan.map(p=>({code:p.code,label:PAN_HOLDER[p.code]||'not decoded',entities:num(p.n)})),
  byRegistrationAuthority:ras.map(r=>({code:r.code||'—',entities:num(r.n)})),
  ultimateParentCountries:foreignParents.map(r=>({country:r.country?.trim()||'—',entities:num(r.n)})),
  largestGroups:topParents.map(p=>({lei:p.lei.trim(),name:p.name,country:p.country?.trim()||null,indianEntities:num(p.n)})),
  ultimateParentExceptions:exceptionReasons.map(e=>({reason:e.reason,entities:num(e.n)})),
  notes:['Counts are LEI registrations whose legal address is in India, from the imported GLEIF Golden Copy.',
   'State is the ISO 3166-2 region in the reported legal address; CIN fields are decoded from the identifier reported to GLEIF.',
   'Listed/unlisted reflects the CIN prefix when the CIN was issued, not a live exchange check.',
   'Group data is accounting consolidation reported to GLEIF, not legal or beneficial ownership.']
 };
}
export async function indiaEntities(f:{q?:string;region?:string;cls?:string;listing?:string;status?:string;page?:number}){
 if(!await indiaReady())return null;
 const where:string[]=[],p:(string|number)[]=[];
 const q=(f.q||'').trim().toLowerCase();
 if(q){if(q.length<2||q.length>90)throw new Error('BAD_QUERY');p.push(q.replace(/[\\%_]/g,'\\$&')+'%');where.push(`lower(legal_name) LIKE $${p.length}`);}
 if(f.region){if(!/^[A-Z]{2}$/.test(f.region))throw new Error('BAD_REGION');p.push(`{${(REGION_ALIASES[f.region]||[f.region]).join(',')}}`);where.push(`address_region=ANY($${p.length}::text[])`);}
 if(f.cls){if(!/^[A-Z]{3}$/.test(f.cls))throw new Error('BAD_CLASS');p.push(f.cls);where.push(`cin_class=$${p.length}`);}
 if(f.listing){if(!/^[LU]$/.test(f.listing))throw new Error('BAD_LISTING');p.push(f.listing);where.push(`cin_listing=$${p.length}`);}
 if(f.status){if(!/^[A-Z_]{3,30}$/.test(f.status))throw new Error('BAD_STATUS');p.push(f.status);where.push(`registration_status=$${p.length}`);}
 const page=f.page??1;
 if(!Number.isSafeInteger(page)||page<1||page>200)throw new Error('BAD_PAGE');
 const sql=where.length?' WHERE '+where.join(' AND '):'';
 const db=getSourceCataloguePool();
 const [rows,count]=await Promise.all([
  db.query<{lei:string;legal_name:string;registration_status:string;address_region:string|null;registered_as:string;cin_class:string|null;cin_listing:string|null;cin_year:number|null}>(
   `SELECT lei,legal_name,registration_status,address_region,registered_as,cin_class,cin_listing,cin_year FROM public.cq_india_entities${sql}
    ORDER BY lower(legal_name),lei LIMIT 50 OFFSET $${p.length+1}`,[...p,(page-1)*50]),
  db.query<{n:string}>(`SELECT count(*)::text n FROM public.cq_india_entities${sql}`,p)
 ]);
 const total=Number(count.rows[0]?.n||0);
 return {total,page,pageSize:50,maxPage:200,hasMore:page*50<total&&page<200,records:rows.rows.map(r=>({lei:r.lei.trim(),name:r.legal_name,
  registrationStatus:r.registration_status,region:r.address_region,regionName:r.address_region?IN_REGION[r.address_region]||null:null,
  registeredAs:r.registered_as,companyClass:r.cin_class,companyClassLabel:r.cin_class?CIN_CLASS[r.cin_class]||'not decoded':null,
  listing:r.cin_listing==='L'?'Listed':r.cin_listing==='U'?'Unlisted':null,incorporationYear:r.cin_year,
  sourceUrl:'https://search.gleif.org/#/record/'+r.lei.trim()}))};
}
