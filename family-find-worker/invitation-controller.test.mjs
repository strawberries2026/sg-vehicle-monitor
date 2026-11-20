import test from 'node:test';
import assert from 'node:assert/strict';
import {createInvitationController} from './invitation-controller.mjs';
const token='b'.repeat(64);
test('no invitation is created until explicitly requested',()=>{
 let calls=0;
 createInvitationController({api:{createInvite:async()=>{calls++;}},consentPageUrl:'https://example.com/family-find-preview.html'});
 assert.equal(calls,0);
});
test('sign-in and phone validation happen before API call',async()=>{
 let calls=0;
 const controller=createInvitationController({api:{createInvite:async()=>{calls++;}},consentPageUrl:'https://example.com/consent.html'});
 await assert.rejects(()=>controller.prepare('','6581234567'),/Sign in/);
 await assert.rejects(()=>controller.prepare('id-token','123'),/phone/);
 assert.equal(calls,0);
});
test('prepares WhatsApp link using server-issued invitation token in fragment',async()=>{
 const controller=createInvitationController({api:{createInvite:async()=>({id:'abc',token,expiresAt:1234567890})},consentPageUrl:'https://example.com/consent.html'});
 const result=await controller.prepare('id-token','+65 8123 4567');
 const whatsapp=new URL(result.whatsappUrl);
 assert.equal(whatsapp.hostname,'wa.me');
 const text=whatsapp.searchParams.get('text');
 assert.match(text,/https:\/\/example.com\/consent.html#invite=/);
 assert.doesNotMatch(text,/id-token/);
 assert.equal(result.expiresAt,1234567890);
});
test('invalid server token does not produce invitation link',async()=>{
 const controller=createInvitationController({api:{createInvite:async()=>({id:'abc',token:'invalid',expiresAt:123})},consentPageUrl:'https://example.com/consent.html'});
 await assert.rejects(()=>controller.prepare('id-token','6581234567'),/token/);
});
