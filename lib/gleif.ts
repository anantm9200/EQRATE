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
