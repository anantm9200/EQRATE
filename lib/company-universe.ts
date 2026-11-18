import {searchLEI,type LeiEntity} from './gleif';

/**
 * Editorial search targets only. Real company cards are produced exclusively
 * from live GLEIF LEI reference records; this list is not a database of verified facts.
 */
export const FEATURED_ENTITY_NAMES=[
 'APPLE INC.','MICROSOFT CORPORATION','NVIDIA CORPORATION',
 'TOYOTA MOTOR CORPORATION','AIRBUS SE','HSBC HOLDINGS PLC',
 'UNILEVER PLC','SIEMENS AKTIENGESELLSCHAFT',
 'SAMSUNG ELECTRONICS CO., LTD.','TATA CONSULTANCY SERVICES LIMITED',
 'RELIANCE INDUSTRIES LIMITED','SONY GROUP CORPORATION'
] as const;

function normalized(name:string){return name.toUpperCase().replace(/[^A-Z0-9]/g,'');}

export function selectFeaturedEntity(name:string,results:LeiEntity[]):LeiEntity|null{
 const target=normalized(name);
 const matches=results.filter(x=>normalized(x.name)===target);
 if(!matches.length)return null;
 return matches.sort((a,b)=>
  Number(b.registrationStatus==='ISSUED')-Number(a.registrationStatus==='ISSUED')||
  Number(b.status==='ACTIVE')-Number(a.status==='ACTIVE')||
  b.lastUpdate.localeCompare(a.lastUpdate)||
  a.lei.localeCompare(b.lei)
 )[0];
}

export type CompanyUniverseRecord=Pick<LeiEntity,'lei'|'name'|'country'|'jurisdiction'|'registrationStatus'|'status'|'sourceUrl'|'lastUpdate'>;
export async function getFeaturedCompanyUniverse():Promise<{records:CompanyUniverseRecord[],attempted:number}>{
 // No synthetic companies are generated. One upstream failure must not blank all records.
 const settled=await Promise.allSettled(FEATURED_ENTITY_NAMES.map(async name=>{
  const data=await searchLEI(name);
  return selectFeaturedEntity(name,data.results);
 }));
 const seen=new Set<string>();
 const records:CompanyUniverseRecord[]=[];
 for(const result of settled){
  if(result.status!=='fulfilled'||!result.value)continue;
  const item=result.value;
  if(seen.has(item.lei))continue;
  seen.add(item.lei);
  records.push({lei:item.lei,name:item.name,country:item.country,jurisdiction:item.jurisdiction,
   registrationStatus:item.registrationStatus,status:item.status,
   sourceUrl:item.sourceUrl,lastUpdate:item.lastUpdate});
 }
 return {records,attempted:FEATURED_ENTITY_NAMES.length};
}
