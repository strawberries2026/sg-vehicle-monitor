// Shared cryptographic primitives for invitation/device credentials.
// These helpers do not transmit or store location data.
const enc=new TextEncoder();
export function newCapability(){
 const bytes=new Uint8Array(32);
 crypto.getRandomValues(bytes);
 return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
}
export function validCapability(token){
 return typeof token==='string' && /^[a-f0-9]{64}$/.test(token);
}
export async function hashCapability(token){
 if(!validCapability(token))throw new TypeError('Invalid capability format');
 const digest=await crypto.subtle.digest('SHA-256',enc.encode(token));
 return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
}
export function validPosition(lat,lng,accuracy){
 return typeof lat==='number'&&Number.isFinite(lat)&&lat>=-90&&lat<=90 &&
 typeof lng==='number'&&Number.isFinite(lng)&&lng>=-180&&lng<=180 &&
 typeof accuracy==='number'&&Number.isFinite(accuracy)&&accuracy>=0&&accuracy<=100000;
}
