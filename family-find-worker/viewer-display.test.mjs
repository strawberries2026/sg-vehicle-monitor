import test from 'node:test';
import assert from 'node:assert/strict';
import {describePosition} from './viewer-display.mjs';
test('shows waiting state when no position was shared',()=>assert.equal(describePosition({position:null}).state,'waiting'));
test('labels stale updates rather than implying live tracking',()=>{
 const r=describePosition({position:{latitude:1.3,longitude:103.8,updatedAt:100}},300);
 assert.equal(r.state,'stale');assert.equal(r.ageSeconds,200);
});
test('shows recent update and a map URL without embedding secrets',()=>{
 const r=describePosition({position:{latitude:1.3,longitude:103.8,updatedAt:190}},200);
 assert.equal(r.state,'current');assert.match(r.mapsUrl,/openstreetmap.org/);
 assert.doesNotMatch(r.mapsUrl,/token|uid|secret/);
});
test('rejects invalid coordinates and timestamps',()=>{
 assert.equal(describePosition({position:{latitude:100,longitude:0,updatedAt:123}}).state,'invalid');
 assert.equal(describePosition({position:{latitude:1,longitude:2,updatedAt:'123'}}).state,'invalid');
});
