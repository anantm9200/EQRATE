/**
 * India identifier intelligence. Decodes identifiers exactly as Indian registrants
 * reported them to GLEIF, using the fixed public formats:
 *  - CIN (Ministry of Corporate Affairs Corporate Identity Number)
 *    L/U + 5-digit industry code + 2-letter ROC state + 4-digit year + 3-letter class + 6-digit number
 *  - GSTIN: 2-digit GST state code + 10-character PAN + entity number + 'Z' + check character
 * Decoding never looks anything up and never infers financial condition. Codes whose
 * meaning is not documented here are returned raw and labelled "not decoded".
 */
export const CIN_RE=/^([LU])(\d{5})([A-Z]{2})(\d{4})([A-Z]{3})(\d{6})$/;
export const GSTIN_RE=/^(\d{2})([A-Z]{5}\d{4}[A-Z])([0-9A-Z])Z([0-9A-Z])$/;
export const CIN_CLASS:Record<string,string>={
 PLC:'Public limited company',PTC:'Private limited company',OPC:'One person company',
 GOI:'Union Government company',SGC:'State Government company',NPL:'Not-for-profit licensed company (Section 8)',
 FTC:'Subsidiary of a foreign company',FLC:'Financial lease company',GAP:'General association (public)',
 GAT:'General association (private)',ULL:'Unlimited liability public company',ULT:'Unlimited liability private company'
};
/** PAN 4th character: category of holder (Income Tax Department format). */
export const PAN_HOLDER:Record<string,string>={
 C:'Company',P:'Individual',H:'Hindu undivided family',F:'Firm / LLP',A:'Association of persons',
 T:'Trust',B:'Body of individuals',L:'Local authority',J:'Artificial juridical person',G:'Government'
};
/** ISO 3166-2:IN subdivision codes (current and superseded codes both accepted). */
export const IN_REGION:Record<string,string>={
 AN:'Andaman and Nicobar Islands',AP:'Andhra Pradesh',AR:'Arunachal Pradesh',AS:'Assam',BR:'Bihar',CH:'Chandigarh',
 CG:'Chhattisgarh',CT:'Chhattisgarh',DH:'Dadra and Nagar Haveli and Daman and Diu',DN:'Dadra and Nagar Haveli',DD:'Daman and Diu',
 DL:'Delhi',GA:'Goa',GJ:'Gujarat',HR:'Haryana',HP:'Himachal Pradesh',JK:'Jammu and Kashmir',JH:'Jharkhand',KA:'Karnataka',
 KL:'Kerala',LA:'Ladakh',LD:'Lakshadweep',MP:'Madhya Pradesh',MH:'Maharashtra',MN:'Manipur',ML:'Meghalaya',MZ:'Mizoram',
 NL:'Nagaland',OD:'Odisha',OR:'Odisha',PY:'Puducherry',PB:'Punjab',RJ:'Rajasthan',SK:'Sikkim',TN:'Tamil Nadu',
 TS:'Telangana',TG:'Telangana',TR:'Tripura',UP:'Uttar Pradesh',UK:'Uttarakhand',UT:'Uttarakhand',WB:'West Bengal'
};
/** GST state codes (first two digits of a GSTIN). */
export const GST_STATE:Record<string,string>={
 '01':'Jammu and Kashmir','02':'Himachal Pradesh','03':'Punjab','04':'Chandigarh','05':'Uttarakhand','06':'Haryana',
 '07':'Delhi','08':'Rajasthan','09':'Uttar Pradesh','10':'Bihar','11':'Sikkim','12':'Arunachal Pradesh','13':'Nagaland',
 '14':'Manipur','15':'Mizoram','16':'Tripura','17':'Meghalaya','18':'Assam','19':'West Bengal','20':'Jharkhand',
 '21':'Odisha','22':'Chhattisgarh','23':'Madhya Pradesh','24':'Gujarat','25':'Daman and Diu','26':'Dadra and Nagar Haveli and Daman and Diu',
 '27':'Maharashtra','28':'Andhra Pradesh (pre-2014 code)','29':'Karnataka','30':'Goa','31':'Lakshadweep','32':'Kerala',
 '33':'Tamil Nadu','34':'Puducherry','35':'Andaman and Nicobar Islands','36':'Telangana','37':'Andhra Pradesh','38':'Ladakh',
 '97':'Other territory','99':'Centre jurisdiction'
};
/** CIN ROC codes that equal an ISO 3166-2:IN code for the same state (used only for consistency checks). */
const CIN_ROC_TO_ISO:Record<string,string[]>={
 MH:['MH'],DL:['DL'],GJ:['GJ'],KA:['KA'],WB:['WB'],TN:['TN'],TG:['TG','TS'],TS:['TG','TS'],UP:['UP'],RJ:['RJ'],HR:['HR'],
 MP:['MP'],PB:['PB'],KL:['KL'],AP:['AP'],CT:['CT','CG'],OR:['OR','OD'],OD:['OR','OD'],BR:['BR'],JH:['JH'],AS:['AS'],
 CH:['CH'],UR:['UK','UT'],UT:['UK','UT'],JK:['JK'],HP:['HP'],GA:['GA'],PY:['PY']
};
export type CinDecoded={kind:'CIN';value:string;listing:'Listed'|'Unlisted';listingCode:'L'|'U';industryCode:string;
 rocState:string;incorporationYear:number;companyClass:string;companyClassLabel:string;registrationNumber:string};
export type GstinDecoded={kind:'GSTIN';value:string;stateCode:string;state:string;pan:string;panHolderType:string;panHolderLabel:string};
export function decodeIndianIdentifier(raw:string|undefined|null):CinDecoded|GstinDecoded|null{
 const v=(raw||'').trim().toUpperCase();
 let m=v.match(CIN_RE);
 if(m){
  const year=Number(m[4]);
  if(year<1850||year>2100)return null;
  return {kind:'CIN',value:v,listingCode:m[1] as 'L'|'U',listing:m[1]==='L'?'Listed':'Unlisted',industryCode:m[2],
   rocState:m[3],incorporationYear:year,companyClass:m[5],companyClassLabel:CIN_CLASS[m[5]]||'not decoded',registrationNumber:m[6]};
 }
 m=v.match(GSTIN_RE);
 if(m){
  const pan=m[2];
  return {kind:'GSTIN',value:v,stateCode:m[1],state:GST_STATE[m[1]]||'not decoded',pan,
   panHolderType:pan[3],panHolderLabel:PAN_HOLDER[pan[3]]||'not decoded'};
 }
 return null;
}
export function regionFromAddress(address:string|undefined|null):{code:string;name:string}|null{
 const m=(address||'').match(/\bIN-([A-Z]{2})\b/);
 if(!m)return null;
 return {code:m[1],name:IN_REGION[m[1]]||'not decoded'};
}
export type IndiaLead={code:string;severity:'info'|'low'|'medium';title:string;explanation:string;evidence:Record<string,unknown>};
/** Deterministic India-specific consistency leads (investigative prompts, not findings). */
export function indiaLeads(input:{registeredAs?:string;address?:string;initialRegistrationDate?:string;entityCreationDate?:string}):IndiaLead[]{
 const out:IndiaLead[]=[];
 const id=decodeIndianIdentifier(input.registeredAs);
 const region=regionFromAddress(input.address);
 if(id?.kind==='CIN'){
  const iso=CIN_ROC_TO_ISO[id.rocState];
  if(region&&iso&&!iso.includes(region.code))out.push({code:'CIN_STATE_DIFFERS_FROM_ADDRESS',severity:'info',
   title:'CIN registration state differs from the reported address state',
   explanation:'The CIN carries the Registrar of Companies state at incorporation; a different legal-address state usually means the registered office moved. Confirm on the MCA master data.',
   evidence:{cinRocState:id.rocState,addressRegion:region.code}});
  const created=(input.entityCreationDate||'').slice(0,4);
  if(/^\d{4}$/.test(created)&&Number(created)!==id.incorporationYear)out.push({code:'CIN_YEAR_DIFFERS_FROM_CREATION_DATE',severity:'low',
   title:'CIN incorporation year differs from the GLEIF entity creation date',
   explanation:'The two sources disagree on the year the company was formed. One of them may be out of date or mis-keyed.',
   evidence:{cinYear:id.incorporationYear,entityCreationDate:input.entityCreationDate}});
  if(id.listingCode==='L')out.push({code:'CIN_LISTED',severity:'info',title:'CIN marks the company as listed',
   explanation:'The CIN prefix L indicates a company listed on a recognised Indian stock exchange when the CIN was issued. It is not a live listing check.',
   evidence:{cin:id.value}});
 }
 if(!id&&input.registeredAs)out.push({code:'INDIAN_IDENTIFIER_NOT_DECODED',severity:'info',title:'Registry identifier is not a CIN or GSTIN',
  explanation:'The identifier reported to GLEIF does not follow the CIN or GSTIN format (it may be an LLPIN, a scheme code or another registry number).',
  evidence:{registeredAs:input.registeredAs}});
 return out;
}
