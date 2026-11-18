import type {LeiEntity} from './gleif';

export type GoldenCsvRow=Record<string,string|undefined>;
function field(row:GoldenCsvRow,...names:string[]):string{
 for(const key of names){
  const v=row[key];
  if(typeof v==='string'&&v.trim())return v.trim();
 }
 return '';
}
export const GOLDEN_CSV_REQUIRED_HEADERS=['LEI','Entity.LegalName','Entity.LegalAddress.Country'];
export function validateGoldenCsvHeader(names:string[]):void{
 const present=new Set(names.map(x=>x.replace(/^\uFEFF/,'').trim()));
 for(const name of GOLDEN_CSV_REQUIRED_HEADERS){
  if(!present.has(name))throw new Error('GLEIF_CSV_SCHEMA_MISSING_'+name);
 }
}
function address(row:GoldenCsvRow,prefix:string):string{
 const pieces=[
  field(row,prefix+'.FirstAddressLine',prefix+'.AddressLine.1'),
  field(row,prefix+'.AdditionalAddressLine.1',prefix+'.AddressLine.2'),
  field(row,prefix+'.City'),
  field(row,prefix+'.Region'),
  field(row,prefix+'.PostalCode'),
  field(row,prefix+'.Country')
 ];
 return pieces.filter(Boolean).join(', ').slice(0,1500);
}
/**
 * Map the official GLEIF LEI CDF Golden Copy CSV to CREQOR's existing
 * provenance-preserving LEI shape. No estimates or fabricated fields.
 */
export function parseGoldenCsvRow(row:GoldenCsvRow):LeiEntity|null{
 const lei=field(row,'LEI').toUpperCase();
 const name=field(row,'Entity.LegalName');
 const country=field(row,'Entity.LegalAddress.Country').toUpperCase();
 if(!/^[A-Z0-9]{20}$/.test(lei)||!name||name.length>1000||country&&!/^[A-Z]{2}$/.test(country))return null;
 return {
  lei,name,country,
  jurisdiction:field(row,'Entity.LegalJurisdiction'),
  status:field(row,'Entity.EntityStatus')||'UNKNOWN',
  registrationStatus:field(row,'Registration.RegistrationStatus')||'UNKNOWN',
  lastUpdate:field(row,'Registration.LastUpdateDate'),
  nextRenewal:field(row,'Registration.NextRenewalDate'),
  registeredAs:field(row,'Entity.RegistrationAuthority.RegistrationAuthorityEntityID'),
  category:field(row,'Entity.EntityCategory'),
  address:address(row,'Entity.LegalAddress'),
  headquarters:address(row,'Entity.HeadquartersAddress'),
  sourceUrl:'https://search.gleif.org/#/record/'+lei
 };
}
