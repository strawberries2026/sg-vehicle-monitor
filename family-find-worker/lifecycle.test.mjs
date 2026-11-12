import test from 'node:test';
import assert from 'node:assert/strict';
import {activeShare,pendingInvite,safePosition} from './lifecycle.mjs';
const now=Date.parse('2026-11-13T00:00:00Z');
const future='2026-11-13T01:00:00Z',past='2026-11-12T23:00:00Z';
const base={status:'active',consented_at:'2026-11-12T23:30:00Z',expires_at:future,revoked_at:null,last_lat:1.3,last_lng:103.8,last_seen_at:'2026-11-12T23:59:00Z'};
test('only active unrevoked and unexpired shares are readable',()=>{
 assert.equal(activeShare(base,now),true);
 for(const patch of [{status:'pending'},{revoked_at:past},{expires_at:past},{consented_at:null},{expires_at:'bad'}]){
  assert.equal(activeShare({...base,...patch},now),false);
 }
});
test('invitation cannot be reused after consent or expiry',()=>{
 const invite={status:'pending',consented_at:null,revoked_at:null,expires_at:future};
 assert.equal(pendingInvite(invite,now),true);
 assert.equal(pendingInvite({...invite,consented_at:past},now),false);
 assert.equal(pendingInvite({...invite,expires_at:past},now),false);
 assert.equal(pendingInvite({...invite,revoked_at:past},now),false);
});
test('coordinates are suppressed on revocation, expiry and invalid values',()=>{
 assert.deepEqual(safePosition(base,now),{latitude:1.3,longitude:103.8,lastSeenAt:base.last_seen_at});
 for(const patch of [{revoked_at:past},{expires_at:past},{last_lat:Infinity},{last_lng:181},{last_seen_at:'bad'}]){
  assert.equal(safePosition({...base,...patch},now),null);
 }
});
