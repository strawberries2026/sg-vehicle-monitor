import test from 'node:test';
import assert from 'node:assert/strict';
import {createSharingSession} from './sharing-session.mjs';
const expiry=Math.floor(Date.now()/1000)+3600;
function setup(){
 const events=[];
 const api={
  consent:async token=>{events.push('consent');return {id:'share-1',deviceToken:'device-secret',expiresAt:expiry};},
  updatePosition:async(token,position)=>{events.push('update');return {updatedAt:123};},
  stopSharing:async(id,token)=>{events.push('stop');return {revoked:true};}
 };
 const session=createSharingSession({api,geolocate:async()=>{events.push('gps');return {latitude:1.3,longitude:103.8,accuracy:10};}});
 return {events,session};
}
test('no GPS or network calls happen on construction',()=>{
 const {events,session}=setup();assert.deepEqual(events,[]);assert.equal(session.status().active,false);
});
test('rejects consent without explicit agreement and GPS before consent',async()=>{
 const {events,session}=setup();
 await assert.rejects(()=>session.accept('invite',false));
 await assert.rejects(()=>session.sendOnce());
 assert.deepEqual(events,[]);
});
test('GPS is requested only after explicit send and stops after revocation',async()=>{
 const {events,session}=setup();
 await session.accept('invite',true);
 assert.deepEqual(events,['consent']);
 await session.sendOnce();
 assert.deepEqual(events,['consent','gps','update']);
 await session.stop();
 assert.equal(session.status().active,false);
 assert.deepEqual(events,['consent','gps','update','stop']);
 await assert.rejects(()=>session.sendOnce());
});
test('failed revocation keeps credential so user can retry',async()=>{
 const api={consent:async()=>({id:'share',deviceToken:'secret',expiresAt:expiry}),
  updatePosition:async()=>({}),stopSharing:async()=>{throw Error('offline');}};
 const session=createSharingSession({api,geolocate:async()=>({})});
 await session.accept('invite',true);
 await assert.rejects(()=>session.stop(),/offline/);
 assert.equal(session.status().active,true);
});
