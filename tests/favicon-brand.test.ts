import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('browser icon and public favicon match the CREQOR navy/blue identity',()=>{
 const appIcon=readFileSync('app/icon.svg','utf8').trim();
 const publicIcon=readFileSync('public/favicon.svg','utf8').trim();
 assert.equal(appIcon,publicIcon,'Keep both possible browser icon paths synchronized');
 assert.match(appIcon,/<svg[^>]+viewBox="0 0 64 64"/);
 assert.match(appIcon,/fill="#18283b"/i);
 assert.match(appIcon,/stroke="#78a6ff"/i);
 assert.match(appIcon,/fill="#305fb9"/i);
 assert.match(appIcon,/stroke="#fff"/i);
 assert.doesNotMatch(appIcon,/#(?:061b15|a4f5b7|248a58|3dbb78|1e7f46)/i);
});
