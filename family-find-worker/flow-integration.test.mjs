import test from 'node:test';
import assert from 'node:assert/strict';
import {createInvitationController} from './invitation-controller.mjs';
import {createConsentLinkController} from './consent-link-controller.mjs';
import {createSharingSession} from './sharing-session.mjs';
const inviteToken='d'.repeat(64);
test('full invitation-to-revocation flow with simulated API never accesses GPS before explicit share',async()=>{
 const events=[];
 const viewer=createInvitationController({
  consentPageUrl:'https://example.com/family-find-preview.html',
  api:{createInvite:async()=>{events.push('invite');return {id:'session-1',token:inviteToken,expiresAt:Math.floor(Date.now()/1000)+900};}}
 });
 const prepared=await viewer.prepare('viewer-firebase-token','6581234567');
 const message=new URL(prepared.whatsappUrl).searchParams.get('text');
 const invitationUrl=message.match(/https:\/\/example\.com\/[^\s]+/)[0];
 let cleared='';
 const recipient=createConsentLinkController({
  href:invitationUrl,
  historyObject:{replaceState:(_,__,url)=>{cleared=url;}}
 });
 assert.equal(cleared,'https://example.com/family-find-preview.html');
 assert.equal(recipient.hasInvitation(),true);
 const api={
  consent:async token=>{assert.equal(token,inviteToken);events.push('consent');return {id:'session-1',deviceToken:'device-token',expiresAt:Math.floor(Date.now()/1000)+3600};},
  updatePosition:async(token,position)=>{assert.equal(token,'device-token');assert.equal(position.latitude,1.3);events.push('position');return {updatedAt:1};},
  stopSharing:async(id,token)=>{assert.equal(id,'session-1');assert.equal(token,'device-token');events.push('revoke');return {revoked:true};}
 };
 const sharing=createSharingSession({api,geolocate:async()=>{events.push('gps');return {latitude:1.3,longitude:103.8,accuracy:10};}});
 assert.deepEqual(events,['invite']);
 // The recipient parses and clears the invitation; sharing controller redeems it once.
 await sharing.accept(inviteToken,true);
 assert.deepEqual(events,['invite','consent']);
 await sharing.sendOnce();
 await sharing.stop();
 assert.deepEqual(events,['invite','consent','gps','position','revoke']);
 assert.equal(sharing.status().active,false);
});
