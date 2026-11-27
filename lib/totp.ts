/**
 * TOTP (RFC 6238, HMAC-SHA1, 30 s, 6 digits) — the algorithm used by standard
 * authenticator apps. Secrets are base32 (RFC 4648) for app entry.
 */
import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
const B32='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function base32Encode(buf:Buffer){
 let bits=0,value=0,out='';
 for(const byte of buf){value=(value<<8)|byte;bits+=8;while(bits>=5){out+=B32[(value>>>(bits-5))&31];bits-=5;}}
 if(bits>0)out+=B32[(value<<(5-bits))&31];
 return out;
}
export function base32Decode(s:string){
 const clean=s.toUpperCase().replace(/[\s=]/g,'');let bits=0,value=0;const out:number[]=[];
 for(const ch of clean){const i=B32.indexOf(ch);if(i<0)throw new Error('BAD_BASE32');value=(value<<5)|i;bits+=5;if(bits>=8){out.push((value>>>(bits-8))&255);bits-=8;}}
 return Buffer.from(out);
}
export function hotp(key:Buffer,counter:number,digits=6){
 const msg=Buffer.alloc(8);msg.writeBigUInt64BE(BigInt(counter));
 const h=createHmac('sha1',key).update(msg).digest();
 const o=h[h.length-1]&15;
 const code=((h[o]&127)<<24|h[o+1]<<16|h[o+2]<<8|h[o+3])%10**digits;
 return String(code).padStart(digits,'0');
}
export const step=(ms=Date.now())=>Math.floor(ms/30000);
export function newSecret(){return base32Encode(randomBytes(20));}
/** Returns the matched time step (for replay protection) or null. Accepts ±1 step of clock drift. */
export function verifyTotp(secretB32:string,code:string,lastUsedStep:number|null,ms=Date.now()):number|null{
 if(!/^\d{6}$/.test(code))return null;
 const key=base32Decode(secretB32),now=step(ms);
 for(const s of [now-1,now,now+1]){
  if(lastUsedStep!==null&&s<=lastUsedStep)continue;
  const a=Buffer.from(hotp(key,s)),b=Buffer.from(code);
  if(timingSafeEqual(a,b))return s;
 }
 return null;
}
export function otpauthUri(secretB32:string,account:string,issuer='CREQOR'){
 return `otpauth://totp/${encodeURIComponent(issuer+':'+account)}?secret=${secretB32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}
