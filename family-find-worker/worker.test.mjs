// Security smoke tests for the staging baseline (Node 20+).
import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.mjs';
const env={DB:{prepare(){return {first:async()=>({connected:1})}}}};
const request=(path,options={})=>new Request('https://staging.example'+path,options);
test('health succeeds without exposing locations',async()=>{
 const r=await worker.fetch(request('/health'),env);assert.equal(r.status,200);
 const j=await r.json();assert.equal(j.database,'Connected');assert.match(j.status,/disabled/);
});
test('sensitive endpoints reject unauthenticated or malformed requests',async()=>{
 const cases=[
  ['/v1/invitations','POST',401],
  ['/v1/consent','POST',415],
  ['/v1/positions','POST',415],
  ['/v1/positions/123','POST',404],
  ['/v1/shares/123/revoke','POST',404]
 ];
 for(const [path,method,status] of cases){
  const r=await worker.fetch(request(path,{method}),env);
  assert.equal(r.status,status,path);
 }
});
test('auth check requires Firebase token',async()=>{
 const r=await worker.fetch(request('/v1/auth-check'),env);assert.equal(r.status,401);
});
test('disallowed browser origin is blocked',async()=>{
 const r=await worker.fetch(request('/health',{headers:{Origin:'https://attacker.example'}}),env);assert.equal(r.status,403);
});
test('allowed browser origin gets narrow CORS',async()=>{
 const r=await worker.fetch(request('/health',{headers:{Origin:'https://strawberries2026.github.io'}}),env);
 assert.equal(r.headers.get('access-control-allow-origin'),'https://strawberries2026.github.io');
 assert.equal(r.headers.get('cache-control'),'no-store');
});

import {webcrypto} from 'node:crypto';
import {verifyFirebase} from './worker.mjs';
const cryptoApi = globalThis.crypto ?? webcrypto;
const b64url = bytes => Buffer.from(bytes).toString('base64url');
const encode = obj => b64url(Buffer.from(JSON.stringify(obj)));
async function makeToken(overrides={}) {
 const pair=await cryptoApi.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 const jwk=await cryptoApi.subtle.exportKey('jwk',pair.publicKey);
 const now=Math.floor(Date.now()/1000);
 const header={alg:'RS256',kid:'test-key'};
 const claims={aud:'sg-vehicle-monitor-pro',iss:'https://securetoken.google.com/sg-vehicle-monitor-pro',sub:'viewer-test',iat:now-10,auth_time:now-10,exp:now+300,...overrides};
 const input=encode(header)+'.'+encode(claims);
 const signature=await cryptoApi.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(input));
 return {token:input+'.'+b64url(new Uint8Array(signature)),jwk:{...jwk,kid:'test-key',use:'sig'}};
}
test('verifies correctly signed Firebase identity and rejects modified signature',async()=>{
 const {token,jwk}=await makeToken();
 const mockFetch=async()=>({ok:true,json:async()=>({keys:[jwk]})});
 assert.equal((await verifyFirebase(token,mockFetch)).uid,'viewer-test');
 const pieces=token.split('.');
 pieces[2]=(pieces[2][0]==='A'?'B':'A')+pieces[2].slice(1);
 await assert.rejects(()=>verifyFirebase(pieces.join('.'),mockFetch));
});
test('rejects expired and wrong-audience signed tokens',async()=>{
 for(const claims of [{exp:Math.floor(Date.now()/1000)-1},{aud:'other-project'}]){
  const {token,jwk}=await makeToken(claims);
  await assert.rejects(()=>verifyFirebase(token,async()=>({ok:true,json:async()=>({keys:[jwk]})})));
 }
});
test('OPTIONS preflight returns empty 204 with allowlisted origin',async()=>{
 const r=await worker.fetch(request('/v1/invitations',{method:'OPTIONS',headers:{Origin:'https://strawberries2026.github.io'}}),env);
 assert.equal(r.status,204);assert.equal(await r.text(),'');
 assert.equal(r.headers.get('access-control-allow-origin'),'https://strawberries2026.github.io');
});
