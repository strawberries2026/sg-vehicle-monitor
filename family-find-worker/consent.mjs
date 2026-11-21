import {newCapability,hashCapability,validCapability} from './capabilities.mjs';
// Atomic one-time invitation redemption. No geolocation is collected here.
export async function acceptInvitation(db, inviteToken, agreed, now=Math.floor(Date.now()/1000)){
 if(agreed!==true) return {error:'Consent required',status:400};
 if(!validCapability(inviteToken))return {error:'Invalid invitation',status:400};
 const hash=await hashCapability(inviteToken);
 const deviceToken=newCapability(),deviceHash=await hashCapability(deviceToken);
 // Compare-and-swap ensures two concurrent redemptions cannot both succeed.
 const result=await db.prepare(`UPDATE family_shares
 SET status='active',consent_mode='foreground',consented_at=?,device_token_hash=?,expires_at=?
 WHERE invite_token_hash=? AND status='pending' AND consented_at IS NULL
 AND revoked_at IS NULL AND expires_at>? RETURNING id,expires_at`)
 .bind(now,deviceHash,now+3600,hash,now).first();
 if(!result)return {error:'Invitation expired, invalid or already used',status:410};
 return {id:result.id,deviceToken,expiresAt:result.expires_at};
}
