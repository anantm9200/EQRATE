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
 const present=new Set(names.map(x=>x.replace(/^﻿/,'').trim()));
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
/** Source-reported alternative and transliterated names (max 10), de-duplicated. */
function otherNames(row:GoldenCsvRow,legalName:string):string{
 const out:string[]=[];
 const seen=new Set([legalName.toLowerCase()]);
 for(let i=1;i<=5;i++){
  for(const key of ['Entity.OtherEntityNames.OtherEntityName.'+i,
   'Entity.TransliteratedOtherEntityNames.TransliteratedOtherEntityName.'+i]){
   const v=field(row,key);
   if(v&&v.length<=1000&&!seen.has(v.toLowerCase())){seen.add(v.toLowerCase());out.push(v);}
  }
 }
 return out.join(' | ').slice(0,3000);
}
const isoDate=(s:string)=>/^\d{4}-\d{2}-\d{2}/.test(s)?s:'';
/**
 * Map the official GLEIF LEI CDF Golden Copy CSV to CREQOR's existing
 * provenance-preserving LEI shape. No estimates or fabricated fields: optional
 * fields are only present when the source row carries them.
 */
export function parseGoldenCsvRow(row:GoldenCsvRow):LeiEntity|null{
 const lei=field(row,'LEI').toUpperCase();
 const name=field(row,'Entity.LegalName');
 const country=field(row,'Entity.LegalAddress.Country').toUpperCase();
 if(!/^[A-Z0-9]{20}$/.test(lei)||!name||name.length>1000||country&&!/^[A-Z]{2}$/.test(country))return null;
 const entity:LeiEntity={
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
 const optional:Partial<LeiEntity>={
  otherNames:otherNames(row,name),
  legalForm:field(row,'Entity.LegalForm.EntityLegalFormCode').slice(0,40),
  entityCreationDate:isoDate(field(row,'Entity.EntityCreationDate')),
  initialRegistrationDate:isoDate(field(row,'Registration.InitialRegistrationDate')),
  managingLou:/^[A-Z0-9]{20}$/.test(field(row,'Registration.ManagingLOU'))?field(row,'Registration.ManagingLOU'):'',
  validationSources:field(row,'Registration.ValidationSources').slice(0,40),
  registrationAuthorityId:field(row,'Entity.RegistrationAuthority.RegistrationAuthorityID').slice(0,40),
  successorLei:/^[A-Z0-9]{20}$/.test(field(row,'Entity.SuccessorEntity.1.SuccessorLEI'))?
   field(row,'Entity.SuccessorEntity.1.SuccessorLEI'):'',
  expirationDate:isoDate(field(row,'Entity.EntityExpirationDate')),
  headquartersCountry:/^[A-Z]{2}$/.test(field(row,'Entity.HeadquartersAddress.Country').toUpperCase())?
   field(row,'Entity.HeadquartersAddress.Country').toUpperCase():''
 };
 for(const [k,v] of Object.entries(optional))if(v)(entity as Record<string,unknown>)[k]=v;
 return entity;
}
