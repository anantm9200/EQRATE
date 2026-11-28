import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root=process.cwd();
function text(path:string){return readFileSync(root+'/'+path,'utf8');}

test('navy CREQOR theme remains the last global stylesheet',()=>{
 const imports=[...text('app/layout.tsx').matchAll(/import '\.\/([^']+\.css)';/g)].map(x=>x[1]);
 assert.equal(imports.at(-1),'creqor-blue-compact.css');
 const theme=text('app/creqor-blue-compact.css');
 assert.match(theme,/--cq-text:#18283b/i);
 assert.match(theme,/--cq-accent:#305fb9/i);
 assert.match(theme,/--cq-hero-space:clamp\(27px/);
 assert.match(theme,/--cq-app-space:clamp\(22px/);
});
test('website catalogue sync is retired, no Vercel cron copies registry data, and no credentials are front-end variables',()=>{
 const env=text('.env.example'),handler=text('app/api/ops/catalogue-sync/route.ts');
 assert.match(env,/^DATABASE_URL=/m);
 assert.match(env,/^CRON_SECRET=/m);
 assert.doesNotMatch(env,/NEXT_PUBLIC_DATABASE_URL|NEXT_PUBLIC_CRON_SECRET/);
 // The catalogue is the Golden Copy on the private DGX; the website route answers 410 and never writes.
 assert.match(handler,/status:410/);
 assert.doesNotMatch(handler,/^import .*catalogue-store|synchronizeCatalogue\(/m);
 const crons=(JSON.parse(text('vercel.json')) as {crons?:{path:string}[]}).crons||[];
 assert.ok(!crons.some(c=>c.path.includes('catalogue-sync')),'catalogue-sync cron removed');
 // Identity reads on the website go through the DGX gateway, never straight to the website DB.
 for(const f of ['app/catalogue/page.tsx','app/api/catalogue/route.ts','app/api/catalogue/status/route.ts','app/api/public-records/coverage/route.ts'])
  assert.doesNotMatch(text(f),/catalogue-store|fetchGoldenCopyMetadata/,f);
});
test('global company catalogue retains official provenance instead of generating arbitrary records',()=>{
 const schema=text('db/migrations/001_lei_catalogue.sql');
 const store=text('lib/catalogue-store.ts');
 assert.match(schema,/source_sha256/);
 assert.match(schema,/cq_lei_observations/);
 assert.match(store,/sourceUrl!==\s*'https:\/\/search\.gleif\.org\/\#\/record\/'/);
 assert.match(store,/Promise\.allSettled/);
 assert.match(store,/ON CONFLICT\(lei\)/);
});
test('company research remains browser-local without public anonymous mutation route',()=>{
 const source=text('components/forensic-intelligence-hub.tsx');
 const research=text('components/research-desk.tsx');
 assert.match(source,/localStorage/);
 assert.match(research,/localStorage/);
 assert.doesNotMatch(text('app/api/catalogue/route.ts'),/export async function POST/);
});
