// Invite URL transport. Tokens remain in URL fragments, never query strings.
// This helper does not create invites or send messages on its own.
export function makeInviteUrl(appUrl,token){
 const url=new URL(appUrl);
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)
  throw new TypeError('Clean HTTPS invitation page URL required');
 if(!/^[0-9a-f]{64}$/i.test(token))throw new TypeError('Invalid invitation token');
 url.hash='invite='+encodeURIComponent(token);
 return url.href;
}
export function readInviteToken(href){
 const url=new URL(href);
 if(url.protocol!=='https:')return null;
 const fragment=new URLSearchParams(url.hash.slice(1));
 const token=fragment.get('invite');
 return token&&/^[0-9a-f]{64}$/i.test(token)?token:null;
}
export function clearInviteFragment(historyObject,href){
 const url=new URL(href);
 if(!url.hash.startsWith('#invite='))return false;
 url.hash='';
 historyObject.replaceState(null,'',url.href);
 return true;
}
export function makeWhatsAppUrl(phone,inviteUrl){
 const digits=String(phone).replace(/[^0-9]/g,'');
 if(!/^\d{8,15}$/.test(digits))throw new TypeError('International phone number required');
 const url=new URL(inviteUrl);
 if(url.protocol!=='https:'||!readInviteToken(inviteUrl))throw new TypeError('Valid invitation URL required');
 const message='SG Family Find invitation: please confirm the requester independently before choosing whether to share your location. Opening this link does not share GPS. '+inviteUrl;
 return 'https://wa.me/'+digits+'?text='+encodeURIComponent(message);
}
