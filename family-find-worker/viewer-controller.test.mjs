import test from 'node:test';
import assert from 'node:assert/strict';
import {createViewerController} from './viewer-controller.mjs';
test('viewer controller never fetches on construction',()=>{
 let calls=0;
 createViewerController({api:{viewPosition:async()=>{calls++;}}});
 assert.equal(calls,0);
});
test('requires viewer token before querying',async()=>{
 let calls=0;
 const controller=createViewerController({api:{viewPosition:async()=>{calls++;}}});
 await assert.rejects(()=>controller.refresh('share',''),/sign-in/);
 assert.equal(calls,0);
});
test('returns stale state from authorised position response',async()=>{
 const controller=createViewerController({api:{viewPosition:async(id,token)=>{
  assert.equal(id,'share');assert.equal(token,'viewer-token');
  return {position:{latitude:1.3,longitude:103.8,updatedAt:100}};
 }}});
 assert.equal((await controller.refresh('share','viewer-token',300)).state,'stale');
});
test('prevents concurrent viewer requests',async()=>{
 let release;const gate=new Promise(resolve=>{release=resolve;});
 const controller=createViewerController({api:{viewPosition:async()=>{await gate;return {position:null};}}});
 const pending=controller.refresh('share','token');
 await assert.rejects(()=>controller.refresh('share','token'),/already in progress/);
 release();assert.equal((await pending).state,'waiting');
});
