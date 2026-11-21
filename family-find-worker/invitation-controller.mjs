import {makeInviteUrl,makeWhatsAppUrl} from './invite-link.mjs';
// Viewer-side invitation preparation. Explicit action required; no messages are sent automatically.
// The caller supplies a freshly obtained Firebase ID token; do not persist it.
export function createInvitationController({api,consentPageUrl}) {
 if(typeof api?.createInvite!=='function')throw new TypeError('Invitation API required');
 const page=new URL(consentPageUrl);
 if(page.protocol!=='https:'||page.search||page.hash||page.username||page.password)
  throw new TypeError('Clean HTTPS consent page required');
 let busy=false;
 async function prepare(firebaseIdToken,phone) {
  if(busy)throw new Error('Invitation already being prepared');
  if(typeof firebaseIdToken!=='string'||!firebaseIdToken.trim())throw new Error('Sign in required');
  if(!/^\d{8,15}$/.test(String(phone).replace(/[^0-9]/g,'')))throw new Error('Valid international phone number required');
  busy=true;
  try {
   const invite=await api.createInvite(firebaseIdToken);
   if(!invite||typeof invite.id!=='string'||typeof invite.token!=='string'||
      !Number.isSafeInteger(invite.expiresAt))throw new Error('Invalid invitation response');
   const inviteUrl=makeInviteUrl(page.href,invite.token);
   const whatsappUrl=makeWhatsAppUrl(phone,inviteUrl);
   return {id:invite.id,expiresAt:invite.expiresAt,whatsappUrl};
  }finally{busy=false;}
 }
 return Object.freeze({prepare});
}
