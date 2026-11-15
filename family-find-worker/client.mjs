// Opt-in browser client for a future staging integration.
// Import explicitly; this module does not request location or transmit anything on load.
export function createFamilyFindClient(apiBase) {
 const base=new URL(apiBase);
 if(base.protocol!=='https:'||base.username||base.password||base.search||base.hash)throw new TypeError('HTTPS API origin required');
 const endpoint=path=>new URL(path,base).href;
 async function send(path,token,body) {
  if(!token||typeof token!=='string')throw new TypeError('Credential required');
  const r=await fetch(endpoint(path),{method:'POST',mode:'cors',cache:'no-store',
   headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},
   body:JSON.stringify(body),referrerPolicy:'no-referrer'});
  const json=await r.json();
  if(!r.ok)throw new Error(json.error||'Request failed');
  return json;
 }
 return Object.freeze({
  createInvite:(firebaseIdToken)=>send('v1/invitations',firebaseIdToken,{}),
  consent:(inviteToken)=>fetch(endpoint('v1/consent'),{method:'POST',mode:'cors',cache:'no-store',
   headers:{'Content-Type':'application/json'},body:JSON.stringify({token:inviteToken,agreed:true}),
   referrerPolicy:'no-referrer'}).then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.error||'Consent failed');return data;}),
  updatePosition:(deviceToken,coords)=>send('v1/positions',deviceToken,{
   latitude:coords.latitude,longitude:coords.longitude,accuracy:coords.accuracy}),
  async viewPosition(shareId,firebaseIdToken){
   if(!/^[0-9a-f-]{36}$/.test(shareId))throw new TypeError('Invalid share ID');
   const r=await fetch(endpoint('v1/positions/'+shareId),{method:'GET',mode:'cors',cache:'no-store',
    headers:{'Authorization':'Bearer '+firebaseIdToken},referrerPolicy:'no-referrer'});
   const data=await r.json();if(!r.ok)throw Error(data.error||'Location unavailable');return data;
  },
  stopSharing:(shareId,credential)=>{
   if(!/^[0-9a-f-]{36}$/.test(shareId))throw new TypeError('Invalid share ID');
   return send('v1/shares/'+shareId+'/revoke',credential,{});
  }
 });
}
// Explicit one-shot geolocation only; no background watch, timers or silent collection.
export function requestOnePosition(options={enableHighAccuracy:true,timeout:15000,maximumAge:0}) {
 return new Promise((resolve,reject)=>{
  if(!navigator.geolocation)return reject(new Error('Geolocation unavailable'));
  navigator.geolocation.getCurrentPosition(
   ({coords})=>resolve({latitude:coords.latitude,longitude:coords.longitude,accuracy:coords.accuracy}),
   reject,options);
 });
}
