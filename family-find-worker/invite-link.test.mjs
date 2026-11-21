import test from 'node:test';
import assert from 'node:assert/strict';
import {makeInviteUrl,readInviteToken,clearInviteFragment,makeWhatsAppUrl} from './invite-link.mjs';
const token='a'.repeat(64);
test('invitation secret is in fragment, not URL query',()=>{
 const link=makeInviteUrl('https://example.com/consent.html',token);
 const url=new URL(link);
 assert.equal(url.search,'');
 assert.equal(url.hash,'#invite='+token);
 assert.equal(readInviteToken(link),token);
});
test('rejects invalid tokens and query-bearing invitation pages',()=>{
 assert.throws(()=>makeInviteUrl('http://example.com/',token));
 assert.throws(()=>makeInviteUrl('https://example.com/?viewer=abc',token));
 assert.throws(()=>makeInviteUrl('https://example.com/','short'));
 assert.equal(readInviteToken('https://example.com/#invite=short'),null);
});
test('invitation fragment can be removed from browser address bar',()=>{
 let replaced='';
 assert.equal(clearInviteFragment({replaceState:(_,__,url)=>{replaced=url;}},makeInviteUrl('https://example.com/consent',token)),true);
 assert.equal(replaced,'https://example.com/consent');
});
test('WhatsApp message states consent is optional and opening does not share GPS',()=>{
 const link=makeInviteUrl('https://example.com/consent',token);
 const url=new URL(makeWhatsAppUrl('+65 8123 4567',link));
 assert.equal(url.hostname,'wa.me');
 assert.match(url.searchParams.get('text'),/does not share GPS/);
 assert.match(url.searchParams.get('text'),/choosing whether/);
});
