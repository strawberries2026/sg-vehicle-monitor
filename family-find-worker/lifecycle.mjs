// D1 family_shares timestamps are INTEGER Unix seconds.
// Reject malformed, revoked or expired records rather than exposing location.
export function seconds(value) {
 return Number.isSafeInteger(value) && value >= 0 ? value : null;
}
export function activeShare(record, now=Math.floor(Date.now()/1000)) {
 return !!record && record.status==='active' &&
   record.revoked_at==null && seconds(record.consented_at)!==null &&
   seconds(record.expires_at)!==null && record.expires_at>now;
}
export function pendingInvite(record, now=Math.floor(Date.now()/1000)) {
 return !!record && record.status==='pending' &&
   record.revoked_at==null && record.consented_at==null &&
   seconds(record.expires_at)!==null && record.expires_at>now;
}
export function safePosition(record, now=Math.floor(Date.now()/1000)) {
 if(!activeShare(record,now))return null;
 const lat=record.last_lat,lng=record.last_lng,seen=seconds(record.last_seen_at);
 if(typeof lat!=='number'||!Number.isFinite(lat)||lat< -90||lat>90||
    typeof lng!=='number'||!Number.isFinite(lng)||lng< -180||lng>180||
    seen===null||seen>now+60)return null;
 return {latitude:lat,longitude:lng,lastSeenAt:seen};
}
