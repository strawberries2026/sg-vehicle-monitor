import {hashCapability,validCapability,validPosition} from './capabilities.mjs';
// Writes only while explicit consent remains active. Uses D1 integer Unix seconds.
export async function updatePosition(db,deviceToken,position,now=Math.floor(Date.now()/1000)){
 if(!validCapability(deviceToken))return {status:401,error:'Invalid device credential'};
 if(!position||typeof position!=='object'||Array.isArray(position)||
    !validPosition(position.latitude,position.longitude,position.accuracy))
   return {status:400,error:'Invalid location'};
 if(!Number.isSafeInteger(now)||now<0)return {status:400,error:'Invalid timestamp'};
 const hash=await hashCapability(deviceToken);
 // Conditional UPDATE prevents a concurrent revocation from being overwritten.
 // A minimum 10-second interval limits excessive writes; the first update is allowed.
 const row=await db.prepare(`UPDATE family_shares
 SET last_lat=?,last_lng=?,last_seen_at=?
 WHERE device_token_hash=? AND status='active'
 AND consented_at IS NOT NULL AND revoked_at IS NULL AND expires_at>?
 AND (last_seen_at IS NULL OR last_seen_at<=?)
 RETURNING id,last_seen_at`)
 .bind(position.latitude,position.longitude,now,hash,now,now-10).first();
 if(!row)return {status:409,error:'Sharing unavailable or update too frequent'};
 return {status:200,updatedAt:row.last_seen_at};
}
