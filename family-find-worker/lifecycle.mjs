// Pure session lifecycle checks. Fail closed for malformed or expired records.
// A database query must additionally match the authenticated viewer/device credential.
export function activeShare(record, now=Date.now()) {
 if(!record||record.status!=='active'||record.revoked_at!=null||record.consented_at==null)return false;
 const expiry=Date.parse(record.expires_at);
 return Number.isFinite(expiry)&&expiry>now;
}
export function pendingInvite(record, now=Date.now()) {
 if(!record||record.status!=='pending'||record.revoked_at!=null||record.consented_at!=null)return false;
 const expiry=Date.parse(record.expires_at);
 return Number.isFinite(expiry)&&expiry>now;
}
export function safePosition(record, now=Date.now()) {
 if(!activeShare(record,now))return null;
 const lat=record.last_lat,lng=record.last_lng;
 if(typeof lat!=='number'||!Number.isFinite(lat)||lat< -90||lat>90||
    typeof lng!=='number'||!Number.isFinite(lng)||lng< -180||lng>180)return null;
 const seen=Date.parse(record.last_seen_at);
 if(!Number.isFinite(seen)||seen>now+60000)return null;
 return {latitude:lat,longitude:lng,lastSeenAt:record.last_seen_at};
}
