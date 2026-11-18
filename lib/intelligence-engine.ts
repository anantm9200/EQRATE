import type {LeiEntity} from './gleif';

export type SignalLevel='attention'|'review'|'context';
export type IntelligenceSignal={
 id:string;group:'Identity'|'Reporting'|'Financials'|'Evidence';
 level:SignalLevel;title:string;description:string;why:string;sourceIds:string[];
};
export type IntelligenceSource={
 id:string;authority:string;label:string;url:string;date:string;reference:string;
};
export type IdentityIntelligence={
 type:'legal-identity';asOf:string;subject:{name:string;identifier:string;country:string;jurisdiction:string};
 record:{registrationStatus:string;entityStatus:string;lastUpdate:string;nextRenewal:string;registeredAs:string;address:string};
 completeness:{present:number;total:number;percent:number;label:string};
 signals:IntelligenceSignal[];sources:IntelligenceSource[];
 disclosure:string;
};
function validDay(day:string):number|null{
 if(!/^\d{4}-\d\d-\d\d$/.test(day))return null;
 const ms=Date.parse(day+'T00:00:00.000Z');
 return Number.isFinite(ms)&&new Date(ms).toISOString().slice(0,10)===day?ms:null;
}
function daysBetween(start:string,end:string):number|null{
 const a=validDay(start.slice(0,10)),b=validDay(end.slice(0,10));
 return a===null||b===null?null:Math.floor((b-a)/86400000);
}
/**
 * Deterministic reference-record intelligence. This is a quality/maintenance
 * check on the LEI record only; it is NOT a credit, investment or fraud score.
 */
export function analyseLEI(entity:LeiEntity,asOf=new Date().toISOString().slice(0,10)):IdentityIntelligence{
 if(!/^[A-Z0-9]{20}$/i.test(entity.lei))throw new Error('INVALID_LEI');
 if(validDay(asOf)===null)throw new Error('INVALID_AS_OF');
 const id='gleif:'+entity.lei.toUpperCase();
 const sources:IntelligenceSource[]=[{
  id,authority:'Global Legal Entity Identifier Foundation (GLEIF)',
  label:'Level 1 legal-entity reference record',url:entity.sourceUrl,
  date:entity.lastUpdate.slice(0,10),reference:entity.lei.toUpperCase()
 }];
 const signals:IntelligenceSignal[]=[];
 function add(key:string,level:SignalLevel,group:IntelligenceSignal['group'],title:string,description:string,why:string){
  signals.push({id:key,level,group,title,description,why,sourceIds:[id]});
 }
 if(entity.registrationStatus==='ISSUED')
  add('issued','context','Identity','LEI currently issued','The record currently reports ISSUED registration status.','An issued LEI is an identifier-status fact, not a certification of financial strength.');
 else add('registration-review','attention','Identity','LEI registration needs review',
  'GLEIF reports '+(entity.registrationStatus||'an unknown status')+'. Review the record with the issuer or registration authority.',
  'A lapsed or other LEI registration status does not by itself establish that the company is inactive or financially distressed.');
 if(entity.status==='ACTIVE')
  add('active-entity','context','Identity','Entity status reported active','GLEIF reports ACTIVE for the legal entity.','Entity status is reference data and does not establish profitability or operating performance.');
 else add('entity-review','review','Identity','Entity status warrants context','GLEIF reports '+(entity.status||'an unspecified entity status')+'. Confirm the legal implications with the original registry.',
  'Not all entity status changes imply misconduct, default or liquidation.');
 const renewalGap=daysBetween(asOf,entity.nextRenewal);
 if(renewalGap!==null&&renewalGap<0)add('renewal-overdue','attention','Identity','Recorded renewal date has passed',
  'The next renewal date in this record is '+entity.nextRenewal.slice(0,10)+' ('+Math.abs(renewalGap)+' days before the assessment date).',
  'A renewal-date flag concerns record maintenance only, not business solvency.');
 else if(renewalGap!==null&&renewalGap<=45)add('renewal-upcoming','review','Identity','LEI renewal approaching',
  'The next renewal date is '+entity.nextRenewal.slice(0,10)+' ('+renewalGap+' days away).',
  'Confirm that the LEI reference data is maintained before relying on it in counterparty workflows.');
 const lastUpdateAge=daysBetween(entity.lastUpdate,asOf);
 if(lastUpdateAge!==null&&lastUpdateAge>730)add('old-reference','review','Evidence','Reference record is over two years old',
  'The record last-update date is '+entity.lastUpdate.slice(0,10)+'.','This measures reference-data age, not the age of company financial statements.');
 if(entity.jurisdiction&&entity.country&&!entity.jurisdiction.toUpperCase().startsWith(entity.country.toUpperCase()))
  add('cross-border','context','Identity','Address and legal jurisdiction differ',
   'Registered address country '+entity.country+' and legal jurisdiction '+entity.jurisdiction+' are different.',
   'Cross-border incorporation is common; inspect both legal and operating footprints before drawing conclusions.');
 if(!entity.registeredAs)add('registration-id-missing','review','Evidence','Local registration identifier not in this record',
  'No registration authority number was supplied in the returned reference fields.','The absence of this field is not evidence that registration does not exist.');
 if(!entity.address)add('address-missing','review','Evidence','Registered address field unavailable',
  'The returned record contains no formatted registered-address text.','Check the original registry or updated GLEIF record for additional details.');
 const fields=[entity.name,entity.lei,entity.country,entity.jurisdiction,entity.status,entity.registrationStatus,entity.registeredAs,entity.address,entity.headquarters,entity.lastUpdate,entity.nextRenewal];
 const present=fields.filter(x=>Boolean(String(x||'').trim())).length;
 return {
  type:'legal-identity',asOf,subject:{name:entity.name,identifier:entity.lei,country:entity.country,jurisdiction:entity.jurisdiction},
  record:{registrationStatus:entity.registrationStatus,entityStatus:entity.status,lastUpdate:entity.lastUpdate,nextRenewal:entity.nextRenewal,registeredAs:entity.registeredAs,address:entity.address},
  completeness:{present,total:fields.length,percent:Math.round(present/fields.length*100),label:'GLEIF field completeness — not a company rating'},
  signals,sources,
  disclosure:'Identity checks are deterministic observations about GLEIF reference data. They do not independently verify audited financials, beneficial ownership, security prices, creditworthiness, compliance or misconduct.'
 };
}
