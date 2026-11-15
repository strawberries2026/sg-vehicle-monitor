import test from 'node:test';
import assert from 'node:assert/strict';
import {createFamilyFindClient} from './client.mjs';
test('client refuses insecure or credential-bearing API base',()=>{
 for(const url of ['http://example.com/','https://user:password@example.com/','https://example.com/?token=secret']){
  assert.throws(()=>createFamilyFindClient(url));
 }
});
test('client does not perform network calls on construction',()=>{
 const client=createFamilyFindClient('https://staging.example/');
 assert.equal(typeof client.createInvite,'function');
 assert.equal(typeof client.stopSharing,'function');
});
test('client rejects invalid share ids before contacting API',async()=>{
 const client=createFamilyFindClient('https://staging.example/');
 await assert.rejects(()=>client.viewPosition('bad','token'));
 assert.throws(()=>client.stopSharing('bad','token'));
});
