import {dgxGatewayConfigured} from './dgx-gateway';
import {engineIdentityStatus,type GoldenCopyPublication} from './identity-directory';

/** Readiness of the indexed catalogue, which lives on CREQOR's private DGX engine. */
export type EngineCatalogueStatus={
 configured:boolean;status:'ready'|'unconfigured'|'unavailable';indexed:number;
 updatedAt:string|null;goldenCopy:GoldenCopyPublication|null;indiaIndexed:number|null;note:string;
};
export async function engineCatalogueStatus():Promise<EngineCatalogueStatus>{
 if(!dgxGatewayConfigured())return {configured:false,status:'unconfigured',indexed:0,updatedAt:null,goldenCopy:null,indiaIndexed:null,
  note:'The private index is not connected. Company search remains available in the directory.'};
 const s=await engineIdentityStatus();
 const indexed=s?.counts?.leiEntities;
 if(!s||typeof indexed!=='number')return {configured:true,status:'unavailable',indexed:0,updatedAt:null,goldenCopy:null,indiaIndexed:null,
  note:'The private index is not reachable or its counts are still being computed. No count is estimated.'};
 return {configured:true,status:'ready',indexed,updatedAt:s.goldenCopy?.importedAt||s.countsAsOf||null,goldenCopy:s.goldenCopy||null,
  indiaIndexed:typeof s.counts.indiaEntities==='number'?s.counts.indiaEntities:null,
  note:'Indexed records are the GLEIF Golden Copy stored on CREQOR’s private engine: legal-entity reference data, not financial or stock-market verification.'};
}
