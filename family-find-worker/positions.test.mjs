import test from 'node:test';
import assert from 'node:assert/strict';
import {newCapability,hashCapability} from './capabilities.mjs';
import {updatePosition} from './positions.mjs';
const now=1794528000;
test('stores valid position only through a conditional active-session update',async()=>{
 let sql,params;
 const db={prepare(s){sql=s;return {bind(...p){params=p;return {first:async()=>({id:'share',last_seen_at:now})};}};}};
 const token=newCapability(),out=await updatePosition(db,token,{latitude:1.3,longitude:103.8,accuracy:15},now);
 assert.equal(out.status,200);assert.equal(out.updatedAt,now);
 assert.deepEqual(params.slice(0,3),[1.3,103.8,now]);
 assert.equal(params[3],await hashCapability(token));
 assert.match(sql,/status='active'/);assert.match(sql,/revoked_at IS NULL/);
 assert.match(sql,/last_seen_at<=\?/);
});
test('invalid coordinates and credentials never reach database',async()=>{
 const db={prepare(){throw Error('must not query');}};
 const token=newCapability();
 for(const position of [{latitude:91,longitude:1,accuracy:1},{latitude:1,longitude:181,accuracy:1},{latitude:1,longitude:1,accuracy:-1},null]){
  assert.equal((await updatePosition(db,token,position,now)).status,400);
 }
 assert.equal((await updatePosition(db,'bad',{latitude:1,longitude:1,accuracy:1},now)).status,401);
});
test('revoked, expired or throttled updates are rejected without exposing coordinates',async()=>{
 const db={prepare(){return {bind(){return {first:async()=>null};}};}};
 const out=await updatePosition(db,newCapability(),{latitude:1,longitude:103,accuracy:10},now);
 assert.equal(out.status,409);assert.equal('latitude' in out,false);
});
