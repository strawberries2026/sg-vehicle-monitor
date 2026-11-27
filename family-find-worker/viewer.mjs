import {safePosition} from './lifecycle.mjs';
// Viewer UID must come from a cryptographically verified Firebase ID token.
export async function readViewerPosition(db,shareId,viewerUid,now=Math.floor(Date.now()/1000)){
 if(typeof shareId!=='string'||! /^[0-9a-f-]{36}$/.test(shareId)||
    typeof viewerUid!=='string'||!viewerUid||viewerUid.length>128)
   return {status:400,error:'Invalid request'};
 const record=await db.prepare(`SELECT id,status,consented_at,expires_at,revoked_at,last_lat,last_lng,last_seen_at
 FROM family_shares WHERE id=? AND viewer_uid=? LIMIT 1`).bind(shareId,viewerUid).first();
 if(!record)return {status:404,error:'Share unavailable'};
 if(!safePosition(record,now))return {status:404,error:'No active position available'};
 return {status:200,position:safePosition(record,now)};
}
