import test from 'node:test';
import assert from 'node:assert/strict';
import {acceptInvitation} from './consent.mjs';
import {newCapability,hashCapability} from './capabilities.mjs';
const now=1794528000;
test('explicit consent atomically exchanges invitation for distinct device credential',async()=>{
 let sql,params;
 const db={prepare(s){sql=s;return {bind(...p){params=p;return {first:async()=>({id:'share-1',expires_at:now+3600})};}};}};
 const invite=newCapability(),out=await acceptInvitation(db,invite,true,now);
 assert.equal(out.id,'share-1');assert.equal(out.expiresAt,now+3600);
 assert.notEqual(out.deviceToken,invite);
 assert.equal(params[1],await hashCapability(out.deviceToken));
 assert.equal(params[3],await hashCapability(invite));
 assert.match(sql,/status='pending'/);assert.match(sql,/RETURNING id,expires_at/);
});
test('does not touch database without explicit consent',async()=>{
 const db={prepare(){throw Error('should not query');}};
 assert.equal((await acceptInvitation(db,newCapability(),false,now)).status,400);
 assert.equal((await acceptInvitation(db,'invalid',true,now)).status,400);
});
test('expired or redeemed invitation fails without exposing a device credential',async()=>{
 const db={prepare(){return {bind(){return {first:async()=>null};}};}};
 const out=await acceptInvitation(db,newCapability(),true,now);
 assert.equal(out.status,410);assert.equal(out.deviceToken,undefined);
});
