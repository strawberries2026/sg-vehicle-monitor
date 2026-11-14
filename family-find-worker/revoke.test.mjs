import test from 'node:test';
import assert from 'node:assert/strict';
import {revokeByDevice,revokeByViewer} from './revoke.mjs';
import {newCapability,hashCapability} from './capabilities.mjs';
const now=1794528000,id='12345678-1234-4123-8123-123456789abc';
test('device revocation uses hashed credential and wipes stored coordinates',async()=>{
 let sql,args;
 const db={prepare(q){sql=q;return {bind(...v){args=v;return {first:async()=>({id})};}};}};
 const token=newCapability(),result=await revokeByDevice(db,id,token,now);
 assert.equal(result.revoked,true);assert.deepEqual(args,[now,id,await hashCapability(token)]);
 assert.match(sql,/last_lat=NULL,last_lng=NULL,last_seen_at=NULL/);
 assert.match(sql,/device_token_hash=NULL/);
});
test('viewer revocation binds viewer UID and clears position',async()=>{
 let sql,args;
 const db={prepare(q){sql=q;return {bind(...v){args=v;return {first:async()=>({id})};}};}};
 assert.equal((await revokeByViewer(db,id,'verified-uid',now)).revoked,true);
 assert.deepEqual(args,[now,id,'verified-uid']);
 assert.match(sql,/viewer_uid=\?/);
 assert.match(sql,/last_lat=NULL/);
});
test('invalid credentials and unknown shares fail closed',async()=>{
 const db={prepare(){return {bind(){return {first:async()=>null};}};}};
 assert.equal((await revokeByDevice(db,id,'invalid',now)).status,400);
 assert.equal((await revokeByViewer(db,id,'',now)).status,400);
 assert.equal((await revokeByViewer(db,id,'viewer',now)).status,404);
});
