// Official public Global Legal Entity Identifier Foundation reference data.
// LEI inclusion does not verify accounts, share prices, ratings or exchange listings.
export type LeiEntity={
 lei:string;name:string;country:string;jurisdiction:string;status:string;
 registrationStatus:string;lastUpdate:string;nextRenewal:string;
 registeredAs:string;category:string;address:string;headquarters:string;
 sourceUrl:string;
};
type Address={addressLines?:string[];city?:string;region?:string;country?:string;postalCode?:string};
type GLEIFRecord={id?:string;attributes?:{
 lei?:string;entity?:{legalName?:{name?:string};status?:string;jurisdiction?:string;category?:string;
 legalAddress?:Address;headquartersAddress?:Address;registeredAs?:string};
 registration?:{status?:string;lastUpdateDate?:string;nextRenewalDate?:string};
}};
const root='https://api.gleif.org/api/v1/lei-records';
function fmtAddress(a?:Address):string{
 if(!a)return '';
 return [...(a.addressLines||[]),a.city,a.region,a.postalCode,a.country].filter(Boolean).join(', ');
}
function parse(record:GLEIFRecord):LeiEntity|null{
 const a=record.attributes,e=a?.entity;
 const lei=String(a?.lei||record.id||'').toUpperCase();
 if(!/^[A-Z0-9]{20}$/.test(lei)||!e?.legalName?.name)return null;
 return {
  lei,name:String(e.legalName.name),country:String(e.legalAddress?.country||''),
  jurisdiction:String(e.jurisdiction||''),status:String(e.status||'UNKNOWN'),
  registrationStatus:String(a?.registration?.status||'UNKNOWN'),
  lastUpdate:String(a?.registration?.lastUpdateDate||''),
  nextRenewal:String(a?.registration?.nextRenewalDate||''),
  registeredAs:String(e.registeredAs||''),category:String(e.category||''),
  address:fmtAddress(e.legalAddress),headquarters:fmtAddress(e.headquartersAddress),
  sourceUrl:'https://search.gleif.org/#/record/'+lei
 };
}
async function request(url:URL){
 const response=await fetch(url,{
  headers:{'Accept':'application/vnd.api+json','User-Agent':'CREQOR research application (GLEIF public data lookup)'},
  signal:AbortSignal.timeout(12000),next:{revalidate:900}
 });
 if(!response.ok)throw new Error('GLEIF_UPSTREAM_'+response.status);
 const data=await response.json() as {data?:GLEIFRecord[]|GLEIFRecord,meta?:{goldenCopy?:{publishDate?:string},pagination?:{total?:number}}};
 return data;
}
export async function searchLEI(raw:string){
 const query=raw.trim().slice(0,90);
 if(query.length<2) return {results:[] as LeiEntity[],total:0,published:''};
 const url=new URL(root);
 url.searchParams.set('filter[entity.legalName]',query);
 url.searchParams.set('page[size]','12');
 const data=await request(url);
 const entries=Array.isArray(data.data)?data.data:[];
 const results=entries.map(parse).filter((r):r is LeiEntity=>r!==null);
 const term=query.toLowerCase();
 results.sort((a,b)=>
  Number(b.name.toLowerCase()===term)-Number(a.name.toLowerCase()===term)||
  Number(b.name.toLowerCase().startsWith(term))-Number(a.name.toLowerCase().startsWith(term))||
  Number(b.registrationStatus==='ISSUED')-Number(a.registrationStatus==='ISSUED'));
 return {results,total:data.meta?.pagination?.total||results.length,published:String(data.meta?.goldenCopy?.publishDate||'')};
}
export async function getLEI(raw:string):Promise<LeiEntity|null>{
 const code=raw.toUpperCase();
 if(!/^[A-Z0-9]{20}$/.test(code))return null;
 const response=await request(new URL(root+'/'+code));
 return Array.isArray(response.data)?null:parse(response.data||{});
}


/** Global GLEIF register browser. Paged from the official source: no generated or
 * unsourced company records. A legal entity record is not a listed security. */
export const DIRECTORY_PAGE_SIZE=36;
export type LeiDirectoryFilters={q?:string;country?:string;page?:number};
export type LeiDirectoryPage={
 results:LeiEntity[];total:number;page:number;pageSize:number;hasMore:boolean;
 published:string;source:'GLEIF';notice:string;
};
export function directoryUrl(filters:LeiDirectoryFilters):URL{
 const q=(filters.q||'').trim();
 const country=(filters.country||'').trim().toUpperCase();
 const page=filters.page??1;
 if(q.length>90||(q.length>0&&q.length<2))throw new Error('INVALID_QUERY');
 if(country!==''&&!/^[A-Z]{2}$/.test(country))throw new Error('INVALID_COUNTRY');
 if(!Number.isSafeInteger(page)||page<1||page*DIRECTORY_PAGE_SIZE>10000)throw new Error('INVALID_PAGE');
 const url=new URL(root);
 url.searchParams.set('page[size]',String(DIRECTORY_PAGE_SIZE));
 url.searchParams.set('page[number]',String(page));
 if(q)url.searchParams.set('filter[entity.legalName]',q);
 if(country)url.searchParams.set('filter[entity.legalAddress.country]',country);
 return url;
}
export async function listLEIRecords(filters:LeiDirectoryFilters={}):Promise<LeiDirectoryPage>{
 const page=filters.page||1;
 const json=await request(directoryUrl(filters));
 const data=Array.isArray(json.data)?json.data:[];
 const results=data.map(parse).filter((r):r is LeiEntity=>r!==null);
 const fromSource=json.meta?.pagination?.total;
 const total=Number.isSafeInteger(fromSource)&&Number(fromSource)>=0?Number(fromSource):results.length;
 const hasMore=results.length>0 && page*DIRECTORY_PAGE_SIZE<Math.min(total,10000);
 return {
  results,total,page,pageSize:DIRECTORY_PAGE_SIZE,hasMore,
  published:String(json.meta?.goldenCopy?.publishDate||''),
  source:'GLEIF',
  notice:'GLEIF provides legal-entity identity. LEI coverage is not universal; this list does not establish share listing, sector, audited financials, market prices or ratings.'
 };
}
