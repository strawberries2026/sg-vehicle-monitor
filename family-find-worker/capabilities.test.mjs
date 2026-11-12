import test from 'node:test';
import assert from 'node:assert/strict';
import {newCapability,validCapability,hashCapability,validPosition} from './capabilities.mjs';
test('invitation and device credentials are random and hashable',async()=>{
 const a=newCapability(),b=newCapability();
 assert.equal(validCapability(a),true);
 assert.equal(a.length,64);
 assert.notEqual(a,b);
 assert.match(await hashCapability(a),/^[a-f0-9]{64}$/);
 assert.notEqual(await hashCapability(a),a);
 assert.equal(await hashCapability(a),await hashCapability(a));
});
test('malformed capabilities fail closed',async()=>{
 for(const x of ['', 'a'.repeat(63), 'g'.repeat(64), 'A'.repeat(64), null]){
  assert.equal(validCapability(x),false);
  await assert.rejects(()=>hashCapability(x));
 }
});
test('position validation rejects malformed or nonfinite coordinates',()=>{
 assert.equal(validPosition(1.3,103.8,10),true);
 for(const args of [[91,0,1],[0,-181,1],[NaN,1,1],[0,Infinity,1],[0,1,-1],[0,1,Infinity],['1',2,1]]){
  assert.equal(validPosition(...args),false);
 }
});
