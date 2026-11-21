import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const read=async file=>readFile(new URL(file,root),'utf8');
test('all three staging pages exist and import their respective controllers',async()=>{
 const [invite,consent,viewer]=await Promise.all([
  read('family-find-staging-invite.html'),read('family-find-staging-consent.html'),read('family-find-staging-viewer.html')]);
 assert.match(invite,/createInvitationController/);
 assert.match(consent,/createConsentLinkController/);
 assert.match(consent,/createSharingSession/);
 assert.match(viewer,/createViewerController/);
 for(const html of [invite,consent,viewer]){
  assert.match(html,/sg-family-find-staging\.songkhengleong\.workers\.dev/);
  assert.match(html,/name="referrer" content="no-referrer"/);
  assert.doesNotMatch(html,/setInterval\s*\(/);
 }
});
test('invitation page links to consent and viewer without auto-sending WhatsApp',async()=>{
 const html=await read('family-find-staging-invite.html');
 assert.match(html,/family-find-staging-consent\.html/);
 assert.match(html,/family-find-staging-viewer\.html/);
 assert.match(html,/inviter\.prepare\(/);
 assert.match(html,/\$\('whatsapp'\)\.href=result\.whatsappUrl/);
 assert.doesNotMatch(html,/window\.open\(result\.whatsappUrl/);
});
test('consent page requires separate actions to accept and send GPS',async()=>{
 const html=await read('family-find-staging-consent.html');
 assert.match(html,/\$\('accept'\)\.addEventListener\('click'/);
 assert.match(html,/\$\('send'\)\.addEventListener\('click'/);
 assert.match(html,/\$\('stop'\)\.addEventListener\('click'/);
 assert.match(html,/sharing\.sendOnce\(\)/);
 assert.match(html,/sharing\.stop\(\)/);
});
test('viewer refresh is manual and requires Firebase sign-in',async()=>{
 const html=await read('family-find-staging-viewer.html');
 assert.match(html,/\$\('refresh'\)\.addEventListener\('click'/);
 assert.match(html,/auth\.currentUser\.getIdToken\(\)/);
 assert.match(html,/viewer\.refresh\(shareId,token\)/);
});
