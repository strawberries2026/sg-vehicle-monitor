import test from 'node:test';
import assert from 'node:assert/strict';
import {createConsentLinkController} from './consent-link-controller.mjs';
const token='c'.repeat(64);
test('reads token and clears fragment without contacting API',()=>{
 let url='',calls=0;
 const controller=createConsentLinkController({historyObject:{replaceState:(_,__,value)=>{url=value;}},href:'https://example.com/consent.html#invite='+token});
 assert.equal(controller.hasInvitation(),true);
 assert.equal(url,'https://example.com/consent.html');
 assert.equal(calls,0);
});
test('rejecting consent never calls API',async()=>{
 let calls=0;
 const controller=createConsentLinkController({historyObject:{replaceState(){}},href:'https://example.com/#invite='+token});
 await assert.rejects(()=>controller.accept({consent:async()=>{calls++;}},false),/Explicit consent/);
 assert.equal(calls,0);
 controller.decline();
 assert.equal(controller.hasInvitation(),false);
});
test('explicit consent redeems token only once',async()=>{
 const received=[];
 const controller=createConsentLinkController({historyObject:{replaceState(){}},href:'https://example.com/#invite='+token});
 const api={consent:async value=>{received.push(value);return {id:'session'};}};
 assert.deepEqual(await controller.accept(api,true),{id:'session'});
 assert.deepEqual(received,[token]);
 await assert.rejects(()=>controller.accept(api,true),/No valid invitation/);
});
test('invalid invitation does not enable consent',async()=>{
 const controller=createConsentLinkController({historyObject:{replaceState(){throw Error('should not clear');}},href:'https://example.com/#invite=invalid'});
 assert.equal(controller.hasInvitation(),false);
 await assert.rejects(()=>controller.accept({consent:async()=>{}},true),/No valid invitation/);
});

test('beginSharing hands invitation token to sharing controller exactly once',async()=>{
 const received=[];
 const controller=createConsentLinkController({historyObject:{replaceState(){}},href:'https://example.com/#invite='+token});
 const sharing={accept:async(value,agreed)=>{received.push([value,agreed]);return {active:true};}};
 await assert.rejects(()=>controller.beginSharing(sharing,false),/Explicit consent/);
 assert.deepEqual(received,[]);
 assert.deepEqual(await controller.beginSharing(sharing,true),{active:true});
 assert.deepEqual(received,[[token,true]]);
 await assert.rejects(()=>controller.beginSharing(sharing,true),/No valid invitation/);
});
test('failed sharing initiation retains invitation for retry',async()=>{
 const controller=createConsentLinkController({historyObject:{replaceState(){}},href:'https://example.com/#invite='+token});
 await assert.rejects(()=>controller.beginSharing({accept:async()=>{throw Error('offline');}},true),/offline/);
 assert.equal(controller.hasInvitation(),true);
});
