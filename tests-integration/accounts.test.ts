import {test} from 'node:test';
import assert from 'node:assert/strict';

const base=process.env.ENGINE_URL!,token=process.env.DGX_ENGINE_TOKEN!;
async function call(path:string,o:{method?:string;body?:unknown;user?:string;org?:string;auth?:boolean}={}){
 const r=await fetch(base+path,{method:o.method||'GET',headers:{'Content-Type':'application/json',
  ...(o.auth===false?{}:{Authorization:'Bearer '+token}),...(o.user?{'X-Creqor-User':o.user}:{}),...(o.org?{'X-Creqor-Org':o.org}:{})},
  body:o.body===undefined?undefined:JSON.stringify(o.body)});
 return {status:r.status,body:await r.json().catch(()=>null) as any};
}
const pw='correct horse battery staple';

test('account routes require the engine token',async()=>{
 assert.equal((await call('/v1/auth/verify',{method:'POST',body:{email:'x@example.com',password:pw},auth:false})).status,401);
});
test('register, sign in, reject bad passwords and duplicates',async()=>{
 const r=await call('/v1/auth/register',{method:'POST',body:{email:'Analyst@Example.com',password:pw,name:'Analyst'}});
 assert.equal(r.status,201);
 assert.equal((await call('/v1/auth/register',{method:'POST',body:{email:'analyst@example.com',password:pw}})).status,409);
 assert.equal((await call('/v1/auth/register',{method:'POST',body:{email:'short@example.com',password:'short'}})).status,400);
 const ok=await call('/v1/auth/verify',{method:'POST',body:{email:'analyst@example.com',password:pw}});
 assert.equal(ok.status,200);assert.equal(ok.body.orgs[0].role,'owner');
 assert.equal((await call('/v1/auth/verify',{method:'POST',body:{email:'analyst@example.com',password:'wrong password here'}})).status,401);
 assert.equal((await call('/v1/auth/verify',{method:'POST',body:{email:'nobody@example.com',password:pw}})).status,401);
});
test('workspace items are isolated between organisations and versioned',async()=>{
 const a=(await call('/v1/auth/register',{method:'POST',body:{email:'a@example.com',password:pw}})).body;
 const b=(await call('/v1/auth/register',{method:'POST',body:{email:'b@example.com',password:pw}})).body;
 const item=await call('/v1/workspace/items',{method:'POST',user:a.userId,org:a.orgId,body:{kind:'watchlist',title:'India IT',payload:{leis:['335800ZJKU9GPQRE2U66']}}});
 assert.equal(item.status,201);
 // B cannot read, write or delete inside A's organisation, even by naming it.
 assert.equal((await call('/v1/workspace/items',{user:b.userId,org:a.orgId})).status,403);
 assert.equal((await call('/v1/workspace/items/'+item.body.itemId,{method:'DELETE',user:b.userId,org:a.orgId})).status,403);
 assert.equal((await call('/v1/workspace/items/'+item.body.itemId,{method:'DELETE',user:b.userId,org:b.orgId})).status,404);
 assert.equal((await call('/v1/workspace/items',{user:b.userId,org:b.orgId})).body.items.length,0);
 // Optimistic concurrency.
 const up=await call('/v1/workspace/items/'+item.body.itemId,{method:'PUT',user:a.userId,org:a.orgId,body:{kind:'watchlist',title:'India IT v2',payload:{leis:[]},version:1}});
 assert.equal(up.status,200);assert.equal(up.body.version,2);
 assert.equal((await call('/v1/workspace/items/'+item.body.itemId,{method:'PUT',user:a.userId,org:a.orgId,body:{kind:'watchlist',title:'stale',payload:{},version:1}})).status,409);
 assert.equal((await call('/v1/workspace/items',{user:'not-a-uuid',org:a.orgId})).status,401);
});
test('export contains the user data; deletion needs the password and removes everything',async()=>{
 const c=(await call('/v1/auth/register',{method:'POST',body:{email:'c@example.com',password:pw}})).body;
 await call('/v1/workspace/items',{method:'POST',user:c.userId,org:c.orgId,body:{kind:'note',title:'n',payload:{t:1}}});
 const ex=await call('/v1/account/export',{user:c.userId});
 assert.equal(ex.status,200);assert.equal(ex.body.user.email,'c@example.com');assert.equal(ex.body.workspaces[0].items.length,1);
 assert.equal((await call('/v1/account/delete',{method:'POST',user:c.userId,body:{password:'nope nope nope'}})).status,403);
 assert.equal((await call('/v1/account/delete',{method:'POST',user:c.userId,body:{password:pw}})).status,200);
 assert.equal((await call('/v1/auth/verify',{method:'POST',body:{email:'c@example.com',password:pw}})).status,401);
});
