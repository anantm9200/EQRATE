import {NextResponse} from 'next/server';
/** SEC collection is disabled by owner policy; former SEC routes answer 410 Gone. */
export const SEC_DISABLED_NOTE='SEC data collection is disabled by policy. Company data is served from the CREQOR private engine: use /api/engine/search, /api/engine/lei/{lei}/financials and /api/engine/compare.';
export function secGone(){
 return NextResponse.json({error:'Gone',code:'SEC_DISABLED',note:SEC_DISABLED_NOTE,
  alternatives:['/api/engine/search','/api/engine/india/entities','/api/engine/lei/{lei}/financials','/api/engine/compare']},
  {status:410,headers:{'Cache-Control':'public, max-age=3600'}});
}
