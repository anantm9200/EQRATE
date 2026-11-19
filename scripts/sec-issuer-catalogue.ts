/**
 * Operator-run SEC public issuer catalogue importer.
 * Must set a real SEC_USER_AGENT with your organization and contact email.
 * Download from the official SEC ticker/CIK/exchange file only.
 */
import {catalogueConfigured} from '../lib/catalogue-store';
import {fetchSecPublicIssuers,ingestSecIssuerBatch} from '../lib/sec-public-issuers';
async function main(){
 if(!catalogueConfigured())throw new Error('DATABASE_URL_NOT_CONFIGURED');
 const {records,retrievedAt}=await fetchSecPublicIssuers();
 let changed=0;
 for(let i=0;i<records.length;i+=750){
  const page=records.slice(i,i+750);
  const r=await ingestSecIssuerBatch(page,retrievedAt);
  changed+=r.changed;
 }
 console.log(JSON.stringify({
  source:'SEC',sourceUrl:'https://www.sec.gov/files/company_tickers_exchange.json',
  retrievedAt,sourceTickerAssociations:records.length,
  distinctCIKs:new Set(records.map(r=>r.cik)).size,
  changed,stored:true,
  caveat:'CIK/ticker association is not an audited valuation, trading quote, or credit rating.'
 }));
}
main().catch(e=>{console.error(e instanceof Error?e.message:'SEC_ISSUER_IMPORT_FAILED');process.exitCode=1;});
