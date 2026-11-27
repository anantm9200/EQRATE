/**
 * Accounts and private research workspaces on the DGX.
 *
 * Trust model: only the website (holding the engine bearer token) can call these
 * routes. It asserts the signed-in user id from its Auth.js session; the engine still
 * re-checks that user's membership and role for every workspace call and runs each
 * query inside a transaction whose `creqor.org_id` setting drives PostgreSQL row-level
 * security, so a bug in one layer cannot expose another organisation's data.
 */
import {randomBytes,scrypt as scryptCb,timingSafeEqual,type ScryptOptions} from 'node:crypto';
import type {Pool,PoolClient} from 'pg';
import {createCipheriv,createDecipheriv,createHash} from 'node:crypto';
import {newSecret,verifyTotp,otpauthUri} from '../../lib/totp';

/** AES-256-GCM for TOTP secrets; key from CREQOR_MFA_KEY (64 hex chars), never stored in the DB. */
function mfaKey(){
 const k=process.env.CREQOR_MFA_KEY||'';
 if(!/^[0-9a-f]{64}$/i.test(k))throw new Error('MFA_NOT_CONFIGURED');
 return Buffer.from(k,'hex');
}
function seal(plain:string){const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',mfaKey(),iv);
 const enc=Buffer.concat([c.update(plain,'utf8'),c.final()]);return ['v1',iv.toString('base64'),c.getAuthTag().toString('base64'),enc.toString('base64')].join('.');}
function open_(sealed:string){const [v,iv,tag,enc]=sealed.split('.');if(v!=='v1')throw new Error('BAD_SEALED');
 const d=createDecipheriv('aes-256-gcm',mfaKey(),Buffer.from(iv,'base64'));d.setAuthTag(Buffer.from(tag,'base64'));
 return Buffer.concat([d.update(Buffer.from(enc,'base64')),d.final()]).toString('utf8');}
const codeHash=(c:string)=>createHash('sha256').update(c.replace(/[\s-]/g,'').toUpperCase()).digest('hex');

const scrypt=(pw:string,salt:Buffer,len:number,o:ScryptOptions)=>new Promise<Buffer>((ok,fail)=>scryptCb(pw,salt,len,o,(e,k)=>e?fail(e):ok(k)));
const SCRYPT={N:32768,r:8,p:1,maxmem:64*1024*1024};

export async function hashPassword(password:string):Promise<string>{
 const salt=randomBytes(16);
 const key=await scrypt(password.normalize('NFKC'),salt,32,SCRYPT);
 return ['scrypt',SCRYPT.N,SCRYPT.r,SCRYPT.p,salt.toString('base64'),key.toString('base64')].join('$');
}
export async function verifyPassword(password:string,stored:string):Promise<boolean>{
 const [kind,n,r,p,salt,hash]=stored.split('$');
 if(kind!=='scrypt'||!salt||!hash)return false;
 const expected=Buffer.from(hash,'base64');
 const key=await scrypt(password.normalize('NFKC'),Buffer.from(salt,'base64'),expected.length,
  {N:Number(n),r:Number(r),p:Number(p),maxmem:64*1024*1024});
 return key.length===expected.length&&timingSafeEqual(key,expected);
}
// A fixed dummy hash keeps response time similar for unknown emails.
let dummy:Promise<string>|null=null;

export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const EMAIL=/^[^@\s]{1,64}@[^@\s]{1,190}\.[a-z]{2,24}$/;
export function normalizeEmail(raw:unknown){
 const e=typeof raw==='string'?raw.trim().toLowerCase():'';
 if(!EMAIL.test(e))throw new Error('BAD_EMAIL');
 return e;
}
/** NIST 800-63B style: length, not composition rules; reject the email itself and trivial values. */
export function checkPassword(pw:unknown,email:string){
 if(typeof pw!=='string'||pw.length<12||pw.length>200)throw new Error('BAD_PASSWORD_LENGTH');
 const lower=pw.toLowerCase();
 const local=email.split('@')[0];
 if((local.length>=4&&lower.includes(local))||/^(.)\1+$/.test(pw)||/^(password|123456|qwerty|creqor)/.test(lower))throw new Error('BAD_PASSWORD_WEAK');
 return pw;
}
const ROLE_RANK={viewer:1,analyst:2,admin:3,owner:4} as const;
export type Role=keyof typeof ROLE_RANK;

async function audit(c:Pool|PoolClient,userId:string|null,orgId:string|null,action:string,detail:object={}){
 await c.query('INSERT INTO cq_account_audit (user_id,org_id,action,detail) VALUES ($1,$2,$3,$4)',[userId,orgId,action,JSON.stringify(detail)]);
}

export async function register(pool:Pool,body:Record<string,unknown>){
 const email=normalizeEmail(body.email);
 const password=checkPassword(body.password,email);
 const name=typeof body.name==='string'?body.name.trim().slice(0,120):null;
 const hash=await hashPassword(password);
 const c=await pool.connect();
 try{
  await c.query('BEGIN');
  const u=await c.query<{user_id:string}>('INSERT INTO cq_users (email,display_name,password_hash) VALUES ($1,$2,$3) ON CONFLICT (email) DO NOTHING RETURNING user_id',[email,name||null,hash]);
  if(!u.rowCount){await c.query('ROLLBACK');throw new Error('BAD_ACCOUNT_EXISTS');}
  const userId=u.rows[0].user_id;
  const o=await c.query<{org_id:string}>('INSERT INTO cq_orgs (name,personal) VALUES ($1,true) RETURNING org_id',[(name||email.split('@')[0])+'’s workspace']);
  await c.query('INSERT INTO cq_memberships (org_id,user_id,role) VALUES ($1,$2,$3)',[o.rows[0].org_id,userId,'owner']);
  await audit(c,userId,o.rows[0].org_id,'account.registered');
  await c.query('COMMIT');
  return {userId,orgId:o.rows[0].org_id};
 }catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}finally{c.release();}
}

export async function verify(pool:Pool,body:Record<string,unknown>){
 const email=normalizeEmail(body.email);
 const password=typeof body.password==='string'?body.password:'';
 const r=await pool.query<{user_id:string;password_hash:string;display_name:string|null;disabled:boolean;locked_until:Date|null;failed_logins:number;
  totp_enabled:boolean;totp_secret_enc:string|null;totp_last_step:string|null;recovery_code_hashes:string[]}>(
  'SELECT user_id,password_hash,display_name,disabled,locked_until,failed_logins,totp_enabled,totp_secret_enc,totp_last_step,recovery_code_hashes FROM cq_users WHERE email=$1',[email]);
 const u=r.rows[0];
 if(!u){dummy??=hashPassword('dummy-password-for-timing');await verifyPassword(password,await dummy);return null;}
 if(u.disabled)return null;
 if(u.locked_until&&u.locked_until.getTime()>Date.now()){await audit(pool,u.user_id,null,'login.locked');return null;}
 if(!await verifyPassword(password,u.password_hash)){
  // Ten consecutive failures lock the account for 15 minutes.
  await recordFailure(pool,u.user_id);
  await audit(pool,u.user_id,null,'login.failed');
  return null;
 }
 if(u.totp_enabled&&u.totp_secret_enc){
  const second=typeof body.totp==='string'?body.totp.trim():'';
  if(!second)return {mfaRequired:true} as const;
  const matched=verifyTotp(open_(u.totp_secret_enc),second,u.totp_last_step===null?null:Number(u.totp_last_step));
  // Consuming a code is a conditional update, so two concurrent sign-ins cannot both use it.
  const used=matched!==null
   ?(await pool.query('UPDATE cq_users SET totp_last_step=$2 WHERE user_id=$1 AND (totp_last_step IS NULL OR totp_last_step<$2)',[u.user_id,matched])).rowCount
   :(await pool.query('UPDATE cq_users SET recovery_code_hashes=array_remove(recovery_code_hashes,$2) WHERE user_id=$1 AND $2=ANY(recovery_code_hashes)',[u.user_id,codeHash(second)])).rowCount;
  if(used&&matched===null)await audit(pool,u.user_id,null,'mfa.recovery_code_used');
  if(!used){await recordFailure(pool,u.user_id);await audit(pool,u.user_id,null,'login.mfa_failed');return null;}
 }
 await pool.query('UPDATE cq_users SET failed_logins=0,locked_until=NULL,last_login_at=now() WHERE user_id=$1',[u.user_id]);
 await audit(pool,u.user_id,null,'login.succeeded');
 return {userId:u.user_id,email,name:u.display_name,orgs:await memberships(pool,u.user_id)};
}

/** Ten consecutive failures lock for 15 minutes; a failure after an expired lock starts a new count. */
async function recordFailure(pool:Pool,userId:string){
 await pool.query(`UPDATE cq_users SET
   failed_logins=CASE WHEN locked_until IS NOT NULL AND locked_until<=now() THEN 1 ELSE failed_logins+1 END,
   locked_until=CASE WHEN locked_until IS NOT NULL AND locked_until<=now() THEN NULL
     WHEN failed_logins+1>=10 THEN now()+interval '15 minutes' ELSE locked_until END WHERE user_id=$1`,[userId]);
}
export async function memberships(pool:Pool,userId:string){
 if(!UUID.test(userId))throw new Error('BAD_USER');
 const r=await pool.query<{org_id:string;name:string;role:Role;personal:boolean;plan:string}>(
  `SELECT o.org_id,o.name,m.role,o.personal,o.plan FROM cq_memberships m JOIN cq_orgs o USING (org_id)
   JOIN cq_users u USING (user_id) WHERE m.user_id=$1 AND NOT u.disabled ORDER BY o.personal DESC,o.created_at`,[userId]);
 return r.rows.map(x=>({orgId:x.org_id,name:x.name,role:x.role,personal:x.personal,plan:x.plan}));
}

/** Runs `fn` in a transaction scoped to one organisation after checking the caller's role. */
export async function withOrg<T>(pool:Pool,userId:string,orgId:string,minRole:Role,fn:(c:PoolClient)=>Promise<T>):Promise<T>{
 if(!UUID.test(userId))throw new Error('BAD_USER');
 if(!UUID.test(orgId))throw new Error('BAD_ORG');
 const c=await pool.connect();
 try{
  await c.query('BEGIN');
  const m=await c.query<{role:Role}>(`SELECT m.role FROM cq_memberships m JOIN cq_users u USING (user_id)
   WHERE m.org_id=$1 AND m.user_id=$2 AND NOT u.disabled`,[orgId,userId]);
  const role=m.rows[0]?.role;
  if(!role||ROLE_RANK[role]<ROLE_RANK[minRole]){await c.query('ROLLBACK');throw new Error('FORBIDDEN');}
  await c.query("SELECT set_config('creqor.org_id',$1,true)",[orgId]);
  const out=await fn(c);
  await c.query('COMMIT');
  return out;
 }catch(e){await c.query('ROLLBACK').catch(()=>{});throw e;}finally{c.release();}
}

const KINDS=['assessment','valuation','watchlist','note'] as const;
function itemInput(body:Record<string,unknown>){
 const kind=body.kind as typeof KINDS[number];
 if(!KINDS.includes(kind))throw new Error('BAD_KIND');
 const title=typeof body.title==='string'?body.title.trim():'';
 if(!title||title.length>200)throw new Error('BAD_TITLE');
 const lei=body.subjectLei===undefined||body.subjectLei===null?null:String(body.subjectLei).toUpperCase();
 if(lei!==null&&!/^[A-Z0-9]{20}$/.test(lei))throw new Error('BAD_LEI');
 if(!body.payload||typeof body.payload!=='object'||Array.isArray(body.payload))throw new Error('BAD_PAYLOAD');
 const payload=JSON.stringify(body.payload);
 if(payload.length>250000)throw new Error('PAYLOAD_TOO_LARGE');
 return {kind,title,lei,payload};
}
const ITEM_COLS='item_id AS "itemId",kind,title,subject_lei AS "subjectLei",payload,version,created_at AS "createdAt",updated_at AS "updatedAt"';

export const workspace={
 list:(pool:Pool,u:string,o:string,kind?:string)=>withOrg(pool,u,o,'viewer',async c=>{
  if(kind&&!KINDS.includes(kind as typeof KINDS[number]))throw new Error('BAD_KIND');
  const r=await c.query(`SELECT ${ITEM_COLS} FROM cq_workspace_items WHERE ($1::text IS NULL OR kind=$1) ORDER BY updated_at DESC LIMIT 500`,[kind||null]);
  return {items:r.rows};
 }),
 create:(pool:Pool,u:string,o:string,body:Record<string,unknown>)=>withOrg(pool,u,o,'analyst',async c=>{
  const i=itemInput(body);
  const count=await c.query<{n:string}>('SELECT count(*) n FROM cq_workspace_items');
  if(Number(count.rows[0].n)>=2000)throw new Error('BAD_QUOTA_EXCEEDED');
  const r=await c.query(`INSERT INTO cq_workspace_items (org_id,kind,title,subject_lei,payload,created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING ${ITEM_COLS}`,
   [o,i.kind,i.title,i.lei,i.payload,u]);
  await audit(c,u,o,'workspace.created',{itemId:r.rows[0].itemId,kind:i.kind});
  return r.rows[0];
 }),
 update:(pool:Pool,u:string,o:string,id:string,body:Record<string,unknown>)=>withOrg(pool,u,o,'analyst',async c=>{
  if(!UUID.test(id))throw new Error('BAD_ITEM');
  const i=itemInput(body);
  const expected=Number(body.version);
  if(!Number.isInteger(expected)||expected<1)throw new Error('BAD_VERSION');
  // Optimistic concurrency: a stale version is rejected instead of silently overwriting.
  const r=await c.query(`UPDATE cq_workspace_items SET kind=$2,title=$3,subject_lei=$4,payload=$5,version=version+1,updated_at=now()
   WHERE item_id=$1 AND version=$6 RETURNING ${ITEM_COLS}`,[id,i.kind,i.title,i.lei,i.payload,expected]);
  if(!r.rowCount){
   const exists=await c.query('SELECT 1 FROM cq_workspace_items WHERE item_id=$1',[id]);
   throw new Error(exists.rowCount?'BAD_VERSION_CONFLICT':'NOT_FOUND');
  }
  await audit(c,u,o,'workspace.updated',{itemId:id});
  return r.rows[0];
 }),
 remove:(pool:Pool,u:string,o:string,id:string)=>withOrg(pool,u,o,'analyst',async c=>{
  if(!UUID.test(id))throw new Error('BAD_ITEM');
  const r=await c.query('DELETE FROM cq_workspace_items WHERE item_id=$1',[id]);
  if(!r.rowCount)throw new Error('NOT_FOUND');
  await audit(c,u,o,'workspace.deleted',{itemId:id});
  return {deleted:true};
 })
};

/** Watchlist alerts: what changed in official records or stored evidence since a company was added. */
export const watchChanges=(pool:Pool,u:string,o:string)=>withOrg(pool,u,o,'viewer',async c=>{
 const r=await c.query<{lei:string;added_at:Date;legal_name:string|null;registration_status:string|null;entity_status:string|null;
  changed_publication:string|null;changed_at:Date|null;new_documents:string;latest_document:Date|null}>(`
  WITH watched AS (
   SELECT DISTINCT ON (l.lei) l.lei, i.created_at AS added_at
   FROM cq_workspace_items i, jsonb_array_elements_text(i.payload->'leis') AS l(lei)
   WHERE i.kind='watchlist' AND l.lei ~ '^[A-Z0-9]{20}$' ORDER BY l.lei, i.created_at)
  SELECT w.lei, w.added_at, e.legal_name, e.registration_status, e.entity_status,
   r.source_publish_date::text AS changed_publication, r.finished_at AS changed_at,
   (SELECT count(*) FROM cq_financial_documents d WHERE d.lei=w.lei AND d.created_at>w.added_at)::text AS new_documents,
   (SELECT max(d.created_at) FROM cq_financial_documents d WHERE d.lei=w.lei) AS latest_document
  FROM watched w LEFT JOIN cq_lei_catalogue e ON e.lei=w.lei LEFT JOIN cq_bulk_source_runs r ON r.id=e.last_changed_run_id
  ORDER BY w.lei LIMIT 500`);
 return {companies:r.rows.map(x=>({lei:x.lei,name:x.legal_name,registrationStatus:x.registration_status,entityStatus:x.entity_status,
  addedAt:x.added_at.toISOString(),recordChangedAt:x.changed_at?.toISOString()||null,recordChangedPublication:x.changed_publication,
  changedSinceAdded:Boolean(x.changed_at&&x.changed_at>x.added_at),newFinancialDocuments:Number(x.new_documents),
  alert:Boolean((x.changed_at&&x.changed_at>x.added_at)||Number(x.new_documents)>0||(x.registration_status&&x.registration_status!=='ISSUED'))}))};
});
export const mfa={
 async status(pool:Pool,userId:string){
  const r=await pool.query<{totp_enabled:boolean;n:number}>('SELECT totp_enabled,cardinality(recovery_code_hashes) n FROM cq_users WHERE user_id=$1',[userId]);
  if(!r.rowCount)throw new Error('NOT_FOUND');
  return {enabled:r.rows[0].totp_enabled,recoveryCodesLeft:r.rows[0].n};
 },
 async setup(pool:Pool,userId:string){
  const r=await pool.query<{email:string;totp_enabled:boolean}>('SELECT email,totp_enabled FROM cq_users WHERE user_id=$1',[userId]);
  if(!r.rowCount)throw new Error('NOT_FOUND');
  if(r.rows[0].totp_enabled)throw new Error('BAD_MFA_ALREADY_ENABLED');
  const secret=newSecret();
  await pool.query('UPDATE cq_users SET totp_secret_enc=$2,totp_last_step=NULL WHERE user_id=$1',[userId,seal(secret)]);
  return {secret,otpauthUri:otpauthUri(secret,r.rows[0].email)};
 },
 async enable(pool:Pool,userId:string,body:Record<string,unknown>){
  const r=await pool.query<{totp_secret_enc:string|null;totp_enabled:boolean}>('SELECT totp_secret_enc,totp_enabled FROM cq_users WHERE user_id=$1',[userId]);
  const u=r.rows[0];if(!u?.totp_secret_enc||u.totp_enabled)throw new Error('BAD_MFA_STATE');
  const matched=verifyTotp(open_(u.totp_secret_enc),String(body.code||''),null);
  if(matched===null)throw new Error('BAD_MFA_CODE');
  const codes=Array.from({length:8},()=>randomBytes(5).toString('hex').toUpperCase().replace(/(.{5})/,'$1-'));
  // Only the secret that was just verified can be enabled (a concurrent re-setup invalidates this attempt).
  const w=await pool.query('UPDATE cq_users SET totp_enabled=true,totp_last_step=$2,recovery_code_hashes=$3 WHERE user_id=$1 AND totp_secret_enc=$4 AND NOT totp_enabled',
   [userId,matched,codes.map(codeHash),u.totp_secret_enc]);
  if(!w.rowCount)throw new Error('BAD_MFA_STATE');
  await audit(pool,userId,null,'mfa.enabled');
  return {enabled:true,recoveryCodes:codes};
 },
 async disable(pool:Pool,userId:string,body:Record<string,unknown>){
  const r=await pool.query<{password_hash:string;locked_until:Date|null}>('SELECT password_hash,locked_until FROM cq_users WHERE user_id=$1',[userId]);
  if(!r.rowCount)throw new Error('NOT_FOUND');
  if(r.rows[0].locked_until&&r.rows[0].locked_until.getTime()>Date.now())throw new Error('FORBIDDEN');
  if(typeof body.password!=='string'||!await verifyPassword(body.password,r.rows[0].password_hash)){await recordFailure(pool,userId);throw new Error('FORBIDDEN');}
  await pool.query("UPDATE cq_users SET totp_enabled=false,totp_secret_enc=NULL,totp_last_step=NULL,recovery_code_hashes='{}' WHERE user_id=$1",[userId]);
  await audit(pool,userId,null,'mfa.disabled');
  return {enabled:false};
 }
};
export async function exportAccount(pool:Pool,userId:string){
 const orgs=await memberships(pool,userId);
 const user=await pool.query('SELECT email,display_name AS "name",created_at AS "createdAt",last_login_at AS "lastLoginAt" FROM cq_users WHERE user_id=$1',[userId]);
 if(!user.rowCount)throw new Error('NOT_FOUND');
 const workspaces=[];
 for(const o of orgs)workspaces.push({...o,...await workspace.list(pool,userId,o.orgId)});
 const history=await pool.query('SELECT at,action,org_id AS "orgId" FROM cq_account_audit WHERE user_id=$1 ORDER BY at DESC LIMIT 1000',[userId]);
 return {exportedAt:new Date().toISOString(),user:user.rows[0],workspaces,activity:history.rows};
}
export async function deleteAccount(pool:Pool,userId:string,body:Record<string,unknown>){
 if(!UUID.test(userId))throw new Error('BAD_USER');
 const r=await pool.query<{password_hash:string;locked_until:Date|null}>('SELECT password_hash,locked_until FROM cq_users WHERE user_id=$1',[userId]);
 if(!r.rowCount)throw new Error('NOT_FOUND');
 if(r.rows[0].locked_until&&r.rows[0].locked_until.getTime()>Date.now())throw new Error('FORBIDDEN');
 // Re-authentication is required for an irreversible action; failures count toward the lock.
 if(typeof body.password!=='string'||!await verifyPassword(body.password,r.rows[0].password_hash)){await recordFailure(pool,userId);throw new Error('FORBIDDEN');}
 await pool.query('SELECT cq_delete_account($1)',[userId]);
 return {deleted:true};
}
