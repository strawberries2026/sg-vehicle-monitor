import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../family-find-preview.html',import.meta.url),'utf8');
test('consent preview clearly states no real GPS sharing',()=>{
 assert.match(html,/Preview only/);
 assert.match(html,/does not request GPS permission/);
 assert.match(html,/No location transmitted/);
});
test('consent must be checked before proceeding',()=>{
 assert.match(html,/<input type="checkbox" id="agree"/);
 assert.match(html,/<button class="primary" id="accept" disabled>/);
 assert.match(html,/if\(!agree\.checked\)return/);
});
test('preview uses simulated sharing dependencies, not browser geolocation',()=>{
 assert.match(html,/createSharingSession/);
 assert.match(html,/geolocate:async\(\)=>\(\{latitude:0,longitude:0,accuracy:0\}\)/);
 assert.doesNotMatch(html,/navigator\.geolocation|requestOnePosition|sg-family-find-api\.songkhengleong\.workers\.dev/);
});
test('preview has a stop-sharing control',()=>{
 assert.match(html,/id="stop"/);
 assert.match(html,/await session\.stop\(\)/);
});
