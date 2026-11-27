import {test} from 'node:test';
import assert from 'node:assert/strict';
import {hotp,verifyTotp,base32Encode,base32Decode,step} from '../lib/totp';
const key=Buffer.from('12345678901234567890');
test('RFC 6238 SHA-1 reference vectors (8 digits)',()=>{
 for(const [t,code] of [[59,'94287082'],[1111111109,'07081804'],[1234567890,'89005924'],[2000000000,'69279037']] as const)
  assert.equal(hotp(key,Math.floor(t/30),8),code);
});
test('base32 round trip and TOTP verification with drift and replay protection',()=>{
 const b32=base32Encode(key);assert.equal(b32,'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');assert.deepEqual(base32Decode(b32),key);
 const ms=1_700_000_000_000,s=step(ms),code=hotp(key,s);
 assert.equal(verifyTotp(b32,code,null,ms),s);
 assert.equal(verifyTotp(b32,hotp(key,s-1),null,ms),s-1,'one step of clock drift accepted');
 assert.equal(verifyTotp(b32,hotp(key,s-2),null,ms),null);
 assert.equal(verifyTotp(b32,code,s,ms),null,'a used code cannot be replayed');
 assert.equal(verifyTotp(b32,'12345',null,ms),null);
});
