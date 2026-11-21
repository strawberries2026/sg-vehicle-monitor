import {newCapability,hashCapability} from './capabilities.mjs';
// Invite creation only. No consent or GPS collection happens here.
// D1's family_shares timestamps are INTEGER Unix seconds.
export async function createInvitation(db, viewerUid, now=Math.floor(Date.now()/1000)) {
 if(typeof viewerUid!=='string'||!viewerUid||viewerUid.length>128)throw new TypeError('Invalid viewer');
 if(!Number.isSafeInteger(now)||now<0)throw new TypeError('Invalid timestamp');
 const recent=await db.prepare('SELECT COUNT(*) AS n FROM family_shares WHERE viewer_uid = ? AND created_at >= ?')
   .bind(viewerUid,now-3600).first();
 if(!recent||!Number.isSafeInteger(recent.n))throw new Error('Database unavailable');
 if(recent.n>=5)return {rateLimited:true};
 const id=crypto.randomUUID();
 const token=newCapability(),hash=await hashCapability(token);
 const expiry=now+900;
 const result=await db.prepare(`INSERT INTO family_shares
 (id,viewer_uid,invite_token_hash,device_token_hash,status,consent_mode,created_at,consented_at,expires_at,revoked_at,last_lat,last_lng,last_seen_at)
 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
 .bind(id,viewerUid,hash,null,'pending',null,now,null,expiry,null,null,null,null).run();
 if(!result?.success)throw new Error('Database insert failed');
 return {id,token,expiresAt:expiry};
}
