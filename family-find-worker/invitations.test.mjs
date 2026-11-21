import test from 'node:test';
import assert from 'node:assert/strict';
import {createInvitation} from './invitations.mjs';
const now=1794528000;
function fakeDb(n=0, success=true) {
 const queries=[],params=[];
 return {queries,params,prepare(sql){
  queries.push(sql);
  return {bind(...values){params.push(values);return {
   first:async()=>({n}),run:async()=>({success})
  };}};
 }};
}
test('creates 15-minute hashed invitation without saving raw token',async()=>{
 const db=fakeDb();
 const invite=await createInvitation(db,'viewer-1',now);
 assert.equal(invite.expiresAt,now+900);
 assert.match(invite.token,/^[a-f0-9]{64}$/);
 assert.equal(db.params[1][1],'viewer-1');
 assert.notEqual(db.params[1][2],invite.token);
 assert.equal(db.params[1][4],'pending');
 assert.equal(db.params[1][10],null);
});
test('limits each viewer to five invitations per hour',async()=>{
 const db=fakeDb(5);
 assert.deepEqual(await createInvitation(db,'viewer-1',now),{rateLimited:true});
 assert.equal(db.queries.length,1);
});
test('rejects malformed viewer identity and failed insert',async()=>{
 await assert.rejects(()=>createInvitation(fakeDb(),''));
 await assert.rejects(()=>createInvitation(fakeDb(0,false),'viewer-1',now));
});
