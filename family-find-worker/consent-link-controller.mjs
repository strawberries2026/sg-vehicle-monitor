import {readInviteToken,clearInviteFragment} from './invite-link.mjs';
// One-time consent link intake. The token is held only in memory and removed
// from the address bar immediately after parsing. No GPS or API calls here.
export function createConsentLinkController({historyObject,href}) {
 const token=readInviteToken(href);
 if(token)clearInviteFragment(historyObject,href);
 let pending=token;
 return Object.freeze({
  hasInvitation:()=>pending!==null,
  async accept(api,agreed){
   if(agreed!==true)throw new Error('Explicit consent required');
   if(!pending)throw new Error('No valid invitation');
   if(typeof api?.consent!=='function')throw new TypeError('Consent API required');
   const result=await api.consent(pending);
   pending=null;
   return result;
  },
  decline(){pending=null;return {declined:true};}
 });
}
