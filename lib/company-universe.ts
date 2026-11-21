import {searchLEI,listLEIRecords,type LeiEntity} from './gleif';

/**
 * Editorial search targets only. Real company cards are produced exclusively
 * from live GLEIF LEI reference records; this list is not a database of verified facts.
 */
export const FEATURED_UNIVERSE_LIMIT=32;
export const FEATURED_ENTITY_NAMES=[
 // India first: exact GLEIF legal names of major Indian registrants, then global references.
 'TATA CONSULTANCY SERVICES LIMITED','RELIANCE INDUSTRIES LIMITED','INFOSYS LIMITED',
 'HDFC BANK LIMITED','ICICI BANK LIMITED','STATE BANK OF INDIA',
 'BHARTI AIRTEL LIMITED','LARSEN & TOUBRO LIMITED',
 'APPLE INC.','MICROSOFT CORPORATION','HSBC HOLDINGS PLC','SIEMENS AKTIENGESELLSCHAFT',
 'NVIDIA CORPORATION','TOYOTA MOTOR CORPORATION','AIRBUS SE','UNILEVER PLC',
 'SAMSUNG ELECTRONICS CO., LTD.','SONY GROUP CORPORATION'
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
 // Featured search targets can be absent from the first GLEIF search window.
 // Fill remaining cards with other genuine official legal entities rather than
 // exposing a sparse or fictional homepage. Fail closed if the source is down.
 if(records.length<FEATURED_UNIVERSE_LIMIT){
  try{
   const listing=await listLEIRecords({page:1});
   const candidates=[...listing.results].sort((a,b)=>
    Number(b.registrationStatus==='ISSUED')-Number(a.registrationStatus==='ISSUED')||
    Number(b.status==='ACTIVE')-Number(a.status==='ACTIVE'));
   for(const item of candidates){
    if(records.length>=FEATURED_UNIVERSE_LIMIT)break;
    if(seen.has(item.lei))continue;
    seen.add(item.lei);
    records.push({lei:item.lei,name:item.name,country:item.country,jurisdiction:item.jurisdiction,
     registrationStatus:item.registrationStatus,status:item.status,sourceUrl:item.sourceUrl,lastUpdate:item.lastUpdate});
   }
  }catch{/* The named official records remain available even if browsing fails. */}
 }
 return {records,attempted:FEATURED_ENTITY_NAMES.length};
}
