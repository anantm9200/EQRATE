import type {LeiEntity} from './gleif';

/**
 * Deterministic legal-entity identity screening over official GLEIF reference data.
 * Every flag is an investigative lead derived from named source fields, never a
 * finding of fraud, insolvency or wrongdoing, and never a credit opinion.
 */
export type IdentitySeverity='info'|'low'|'medium'|'high';
export type IdentityFlag={code:string;severity:IdentitySeverity;title:string;explanation:string;evidence:Record<string,string|number|boolean|null>};
export type IdentityContext={
 /** Other indexed LEIs whose normalized legal name is identical (excluding this one). */
 sameNameOtherLeis?:number;
 /** True/false when the latest complete publication run is known; null when unknown. */
 presentInLatestPublication?:boolean|null;
 /** Whether the source-declared successor LEI exists in the local index. */
 successorIndexed?:boolean|null;
 /** Number of distinct stored source versions of this record. */
 versionCount?:number;
 /** Evaluation date (ISO yyyy-mm-dd); injectable for deterministic tests. */
 asOf?:string;
};
const REG_STATUS:Record<string,{severity:IdentitySeverity;text:string}>={
 LAPSED:{severity:'medium',text:'The LEI was not renewed by its managing LOU, so the reference data is no longer re-validated annually and may be out of date.'},
 RETIRED:{severity:'low',text:'The LEI was retired (for example after dissolution, merger or voluntary retirement). It should not be used for new transactions.'},
 MERGED:{severity:'low',text:'The registration was merged into another LEI record.'},
 DUPLICATE:{severity:'high',text:'GLEIF marks this LEI as a duplicate of another registration for the same entity. Use the surviving LEI.'},
 ANNULLED:{severity:'high',text:'The LEI was annulled because it was issued in error or on the basis of incorrect information.'},
 PENDING_TRANSFER:{severity:'info',text:'The record is being transferred between LOUs.'},
 PENDING_ARCHIVAL:{severity:'info',text:'The record is pending archival by its LOU.'},
 TRANSFERRED:{severity:'info',text:'The record was transferred to another managing LOU.'}
};
function dateOnly(s:string|undefined):string{return s&&/^\d{4}-\d{2}-\d{2}/.test(s)?s.slice(0,10):'';}
function daysBetween(a:string,b:string):number{return Math.round((Date.parse(b)-Date.parse(a))/86400000);}

export function screenLegalEntity(entity:LeiEntity,ctx:IdentityContext={}):IdentityFlag[]{
 const asOf=ctx.asOf&&/^\d{4}-\d{2}-\d{2}$/.test(ctx.asOf)?ctx.asOf:new Date().toISOString().slice(0,10);
 const flags:IdentityFlag[]=[];
 const reg=(entity.registrationStatus||'').toUpperCase();
 if(REG_STATUS[reg])flags.push({code:'REGISTRATION_'+reg,severity:REG_STATUS[reg].severity,
  title:'LEI registration status: '+reg,explanation:REG_STATUS[reg].text,evidence:{registrationStatus:reg}});
 const ent=(entity.status||'').toUpperCase();
 if(ent==='INACTIVE')flags.push({code:'ENTITY_INACTIVE',severity:'low',title:'Entity reported as inactive',
  explanation:'The registrant or LOU reports that the legal entity is no longer operating (e.g. dissolved or merged).',
  evidence:{entityStatus:ent,expirationDate:dateOnly(entity.expirationDate)||null}});
 const renewal=dateOnly(entity.nextRenewal);
 if(reg==='ISSUED'&&renewal&&renewal<asOf)flags.push({code:'RENEWAL_DATE_PASSED',severity:'medium',
  title:'Renewal date has passed while status is ISSUED',
  explanation:'The next renewal date is in the past but the record still shows ISSUED. The status may change to LAPSED at the next publication; confirm with the managing LOU.',
  evidence:{nextRenewal:renewal,asOf,overdueDays:daysBetween(renewal,asOf)}});
 const updated=dateOnly(entity.lastUpdate);
 if(updated&&daysBetween(updated,asOf)>3*365)flags.push({code:'REFERENCE_DATA_STALE',severity:'low',
  title:'Reference data not updated for more than three years',
  explanation:'Older reference data is more likely to differ from the current company-registry position.',
  evidence:{lastUpdate:updated,ageDays:daysBetween(updated,asOf)}});
 const validation=(entity.validationSources||'').toUpperCase();
 if(validation==='ENTITY_SUPPLIED_ONLY'||validation==='PENDING')flags.push({code:'WEAK_VALIDATION_'+validation,
  severity:validation==='PENDING'?'medium':'low',title:'Validation source: '+validation,
  explanation:validation==='PENDING'?'The LOU has not yet completed validation of the reference data against an authoritative source.':
   'The reference data was validated only against information supplied by the entity itself, not an independent registry.',
  evidence:{validationSources:validation}});
 const hq=entity.headquartersCountry||'',legal=entity.country||'';
 if(hq&&legal&&hq!==legal)flags.push({code:'CROSS_BORDER_HEADQUARTERS',severity:'info',
  title:'Headquarters country differs from legal-address country',
  explanation:'Common for holding, financing and fund vehicles. Relevant context for jurisdictional and sanctions screening, not adverse by itself.',
  evidence:{legalAddressCountry:legal,headquartersCountry:hq}});
 if(entity.successorLei)flags.push({code:'SUCCESSOR_DECLARED',severity:'info',title:'Successor entity declared',
  explanation:'The source declares a successor LEI (typically after a merger or reorganisation). Research should follow the successor.',
  evidence:{successorLei:entity.successorLei,successorInLocalIndex:ctx.successorIndexed??null}});
 if(entity.expirationDate&&ent!=='INACTIVE')flags.push({code:'EXPIRATION_DATE_PRESENT',severity:'low',
  title:'Entity expiration date recorded',explanation:'The source records an entity expiration date while the entity status is not INACTIVE; check for a pending status change.',
  evidence:{expirationDate:dateOnly(entity.expirationDate),entityStatus:ent||null}});
 if(!entity.registeredAs)flags.push({code:'MISSING_REGISTRY_NUMBER',severity:'info',title:'No registry identifier in source',
  explanation:'The record carries no company-registry number, so it cannot be cross-checked against a national register by identifier.',
  evidence:{registeredAs:null}});
 if((ctx.sameNameOtherLeis??0)>0)flags.push({code:'SHARED_LEGAL_NAME',severity:(ctx.sameNameOtherLeis??0)>=5?'medium':'low',
  title:'Identical legal name used by other LEIs',
  explanation:'Other indexed legal entities carry exactly the same legal name. Confirm identity by LEI, registry number and address before linking evidence; never merge by name alone.',
  evidence:{otherLeisWithSameName:ctx.sameNameOtherLeis??0}});
 if(ctx.presentInLatestPublication===false)flags.push({code:'ABSENT_FROM_LATEST_PUBLICATION',severity:'medium',
  title:'Not present in the latest imported GLEIF publication',
  explanation:'The record was seen in an earlier Golden Copy but not in the newest complete one imported by CREQOR.',
  evidence:{presentInLatestPublication:false}});
 if((ctx.versionCount??0)>=4)flags.push({code:'FREQUENT_REFERENCE_CHANGES',severity:'info',
  title:'Multiple stored source versions',explanation:'The reference data changed several times across imported publications; review the version history.',
  evidence:{storedVersions:ctx.versionCount??0}});
 const order:Record<IdentitySeverity,number>={high:0,medium:1,low:2,info:3};
 return flags.sort((a,b)=>order[a.severity]-order[b.severity]||a.code.localeCompare(b.code));
}

/** Fields that the source did not provide, reported explicitly instead of guessed. */
export function missingIdentityFields(entity:LeiEntity):string[]{
 const checks:[string,unknown][]=[['jurisdiction',entity.jurisdiction],['registeredAs',entity.registeredAs],
  ['category',entity.category],['headquarters',entity.headquarters],['legalForm',entity.legalForm],
  ['entityCreationDate',entity.entityCreationDate],['initialRegistrationDate',entity.initialRegistrationDate],
  ['nextRenewal',entity.nextRenewal]];
 return checks.filter(([,v])=>!v).map(([k])=>k);
}
