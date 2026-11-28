import {NextResponse} from 'next/server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
// Retired. The catalogue is the full GLEIF Golden Copy imported on the private DGX
// (scripts/gleif-golden-copy.ts via lib/catalogue-store.ts); the website no longer
// copies registry pages into its own database, and the Vercel cron has been removed.
function gone(){
 return NextResponse.json({status:'gone',
  message:'Catalogue sync from the website has been retired. The indexed catalogue is the GLEIF Golden Copy imported on CREQOR’s private engine.'},
  {status:410,headers:{'Cache-Control':'no-store'}});
}
export async function GET(){return gone();}
export async function POST(){return gone();}
