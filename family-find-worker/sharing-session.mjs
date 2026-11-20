// Consent-driven foreground sharing controller for staging UI.
// No geolocation or network activity until an explicit user action.
// Device credentials are kept only in this controller's memory.
export function createSharingSession({api,geolocate}) {
 if(!api||typeof api.consent!=='function'||typeof api.updatePosition!=='function'||
    typeof api.stopSharing!=='function'||typeof geolocate!=='function')
   throw new TypeError('Missing sharing dependencies');
 let session=null;
 let busy=false;
 const status=()=>session?{active:true,id:session.id,expiresAt:session.expiresAt}:{active:false};
 async function accept(token,affirmative){
  if(affirmative!==true)throw Error('Explicit consent required');
  if(session||busy)throw Error('Sharing session already active or busy');
  busy=true;
  try {
   const result=await api.consent(token);
   if(!result||typeof result.id!=='string'||typeof result.deviceToken!=='string'||
      !Number.isSafeInteger(result.expiresAt))throw Error('Invalid consent response');
   session={id:result.id,deviceToken:result.deviceToken,expiresAt:result.expiresAt};
   return status();
  }finally{busy=false;}
 }
 async function sendOnce(){
  if(!session||busy)throw Error('No active sharing session');
  if(Math.floor(Date.now()/1000)>=session.expiresAt)throw Error('Sharing expired');
  busy=true;
  try{
   const position=await geolocate(); // browser permission only after user presses Share location
   return await api.updatePosition(session.deviceToken,position);
  }finally{busy=false;}
 }
 async function stop(){
  if(!session||busy)throw Error('No active sharing session');
  busy=true;
  try {
   const result=await api.stopSharing(session.id,session.deviceToken);
   if(!result?.revoked)throw Error('Revocation not confirmed');
   session=null;
   return {active:false,revoked:true};
  }finally{busy=false;}
 }
 return Object.freeze({status,accept,sendOnce,stop});
}
