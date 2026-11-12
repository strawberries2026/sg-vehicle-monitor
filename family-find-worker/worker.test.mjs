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
test('all location routes fail closed',async()=>{
 for(const path of ['/v1/invitations','/v1/consent','/v1/positions','/v1/positions/123']){
  const r=await worker.fetch(request(path,{method:'POST'}),env);assert.equal(r.status,404);
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
