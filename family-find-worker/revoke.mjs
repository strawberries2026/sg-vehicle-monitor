import {hashCapability,validCapability} from './capabilities.mjs';
// Revocation atomically erases coordinates and disables further GPS writes.
export async function revokeByDevice(db,id,token,now=Math.floor(Date.now()/1000)){
 if(typeof id!=='string'||!/^[0-9a-f-]{36}$/.test(id)||!validCapability(token))
  return {status:400,error:'Invalid request'};
 const hash=await hashCapability(token);
 const row=await db.prepare(`UPDATE family_shares
 SET status='revoked',revoked_at=?,last_lat=NULL,last_lng=NULL,last_seen_at=NULL,device_token_hash=NULL
 WHERE id=? AND device_token_hash=? AND status='active' AND revoked_at IS NULL
 RETURNING id`).bind(now,id,hash).first();
 return row?{status:200,revoked:true}:{status:404,error:'Share unavailable'};
}
export async function revokeByViewer(db,id,viewerUid,now=Math.floor(Date.now()/1000)){
 if(typeof id!=='string'||!/^[0-9a-f-]{36}$/.test(id)||
 typeof viewerUid!=='string'||!viewerUid||viewerUid.length>128)
 return {status:400,error:'Invalid request'};
 const row=await db.prepare(`UPDATE family_shares
 SET status='revoked',revoked_at=?,last_lat=NULL,last_lng=NULL,last_seen_at=NULL,device_token_hash=NULL
 WHERE id=? AND viewer_uid=? AND status IN ('pending','active') AND revoked_at IS NULL
 RETURNING id`).bind(now,id,viewerUid).first();
 return row?{status:200,revoked:true}:{status:404,error:'Share unavailable'};
}
