import test from 'node:test';
import assert from 'node:assert/strict';
import {readViewerPosition} from './viewer.mjs';
const now=1794528000,id='12345678-1234-4123-8123-123456789abc';
test('viewer query binds verified uid and returns active coordinates',async()=>{
 let sql,args;
 const db={prepare(q){sql=q;return {bind(...v){args=v;return {first:async()=>({status:'active',consented_at:now-100,expires_at:now+3600,revoked_at:null,last_lat:1.3,last_lng:103.8,last_seen_at:now-10})};}};}};
 const r=await readViewerPosition(db,id,'verified-uid',now);
 assert.equal(r.status,200);assert.equal(r.position.latitude,1.3);
 assert.deepEqual(args,[id,'verified-uid']);assert.match(sql,/viewer_uid=\?/);
});
test('unknown and revoked shares do not disclose coordinates',async()=>{
 const missing={prepare(){return {bind(){return {first:async()=>null};}};}};
 assert.equal((await readViewerPosition(missing,id,'viewer',now)).status,404);
 const revoked={prepare(){return {bind(){return {first:async()=>({status:'active',consented_at:now-100,expires_at:now+3600,revoked_at:now-1,last_lat:1.3,last_lng:103.8,last_seen_at:now-10})};}};}};
 const r=await readViewerPosition(revoked,id,'viewer',now);
 assert.equal(r.status,404);assert.equal(r.position,undefined);
});
