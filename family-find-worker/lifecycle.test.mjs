import test from 'node:test';
import assert from 'node:assert/strict';
import {activeShare,pendingInvite,safePosition,seconds} from './lifecycle.mjs';
const now=1794528000, future=now+3600, past=now-3600;
const base={status:'active',consented_at:past,expires_at:future,revoked_at:null,last_lat:1.3,last_lng:103.8,last_seen_at:now-60};
test('D1 timestamps are integer Unix seconds, not date strings',()=>{
 assert.equal(seconds(future),future);
 assert.equal(seconds('2026-11-13T01:00:00Z'),null);
 assert.equal(seconds(1.5),null);
});
test('only active unrevoked and unexpired shares are readable',()=>{
 assert.equal(activeShare(base,now),true);
 for(const patch of [{status:'pending'},{revoked_at:past},{expires_at:past},{consented_at:null},{expires_at:'bad'}]){
  assert.equal(activeShare({...base,...patch},now),false);
 }
});
test('invitation cannot be reused after consent or expiry',()=>{
 const invite={status:'pending',consented_at:null,revoked_at:null,expires_at:future};
 assert.equal(pendingInvite(invite,now),true);
 for(const patch of [{consented_at:past},{expires_at:past},{revoked_at:past},{status:'active'}]){
  assert.equal(pendingInvite({...invite,...patch},now),false);
 }
});
test('coordinates are suppressed on revocation, expiry and invalid values',()=>{
 assert.deepEqual(safePosition(base,now),{latitude:1.3,longitude:103.8,lastSeenAt:now-60});
 for(const patch of [{revoked_at:past},{expires_at:past},{last_lat:Infinity},{last_lng:181},{last_seen_at:'bad'}]){
  assert.equal(safePosition({...base,...patch},now),null);
 }
});
