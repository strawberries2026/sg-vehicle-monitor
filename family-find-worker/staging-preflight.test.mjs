import test from 'node:test';
import assert from 'node:assert/strict';
import {stagingPreflight} from './staging-preflight.mjs';
const config={name:'sg-family-find-staging',main:'family-find-worker/worker.mjs',vars:{FAMILY_FIND_ENV:'staging',FAMILY_FIND_SHARING_ENABLED:'false'},d1_databases:[{binding:'DB',database_name:'sg-family-find-staging-db',database_id:'12345678-1234-4123-8123-123456789abc'}]};
const baseUrl='https://sg-family-find-staging.test-account.workers.dev/';
test('preflight passes only connected health and disabled sharing',async()=>{
 const calls=[];
 const result=await stagingPreflight({config,baseUrl,fetcher:async url=>{
  calls.push(url.pathname);
  return url.pathname==='/health'?{status:200,json:async()=>({database:'Connected'})}:{status:503};
 }});
 assert.equal(result.ready,true);
 assert.deepEqual(calls,['/health','/v1/invitations']);
});
test('preflight refuses production hostname before network access',async()=>{
 let calls=0;
 const result=await stagingPreflight({config,baseUrl:'https://sg-family-find-api.example.workers.dev/',fetcher:async()=>{calls++;}});
 assert.equal(result.ready,false);assert.equal(calls,0);
});
test('preflight fails when sharing is unexpectedly enabled',async()=>{
 const result=await stagingPreflight({config,baseUrl,fetcher:async url=>
  url.pathname==='/health'?{status:200,json:async()=>({database:'Connected'})}:{status:401}});
 assert.equal(result.ready,false);
 assert.match(result.errors.join(' '),/safeguard/);
});
test('preflight fails closed on unavailable database',async()=>{
 const result=await stagingPreflight({config,baseUrl,fetcher:async url=>
  url.pathname==='/health'?{status:503}:{status:503}});
 assert.equal(result.ready,false);
});
