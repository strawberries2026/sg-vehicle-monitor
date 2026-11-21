// Viewer display model: does not access GPS, request credentials, or poll.
// Rendering callers must use textContent, not innerHTML, for untrusted fields.
export function describePosition(result,now=Math.floor(Date.now()/1000)){
 const position=result?.position;
 if(!position)return {state:'waiting',message:'No location update has been shared yet.'};
 const lat=position.latitude??position.lat;
 const lng=position.longitude??position.lng;
 const updatedAt=position.updatedAt??position.lastSeenAt??position.last_seen_at;
 if(typeof lat!=='number'||!Number.isFinite(lat)||lat< -90||lat>90||
    typeof lng!=='number'||!Number.isFinite(lng)||lng< -180||lng>180||
    !Number.isSafeInteger(updatedAt)||updatedAt<=0)
  return {state:'invalid',message:'Location data could not be verified.'};
 const age=Math.max(0,now-updatedAt);
 const stale=age>120;
 return {state:stale?'stale':'current',
  message:stale?'Last location is outdated. Ask the participant to share again.':'Location recently updated.',
  latitude:lat,longitude:lng,ageSeconds:age,
  mapsUrl:'https://www.openstreetmap.org/?mlat='+encodeURIComponent(lat)+'&mlon='+encodeURIComponent(lng)+'#map=16/'+encodeURIComponent(lat)+'/'+encodeURIComponent(lng)};
}
