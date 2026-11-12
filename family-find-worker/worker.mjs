import {createInvitation} from './invitations.mjs';
// SG Family Find Worker: staging-only security baseline.
// No location endpoints are enabled. Deploy only to an isolated staging Worker.
const ORIGIN = 'https://strawberries2026.github.io';
const PROJECT = 'sg-vehicle-monitor-pro';
const ISSUER = 'https://securetoken.google.com/' + PROJECT;
const CERTS = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const encoder = new TextEncoder();
function response(data, status=200, origin=null) {
  const headers = {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Vary':'Origin'};
  if (origin === ORIGIN) {headers['Access-Control-Allow-Origin']=ORIGIN;headers['Access-Control-Allow-Methods']='GET, POST, OPTIONS';headers['Access-Control-Allow-Headers']='Authorization, Content-Type';}
  return new Response(JSON.stringify(data),{status,headers});
}
function decode64(s) {
  if (!/^[A-Za-z0-9_-]+$/.test(s)) throw Error('Invalid token');
  const b=atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4));
  return Uint8Array.from(b,c=>c.charCodeAt(0));
}
function json64(s){return JSON.parse(new TextDecoder().decode(decode64(s)));}
async function verifyFirebase(token, fetcher=fetch) {
  if (typeof token!=='string'||token.length>8192) throw Error('Invalid token');
  const parts=token.split('.');if(parts.length!==3)throw Error('Invalid token');
  const header=json64(parts[0]),claims=json64(parts[1]);
  if(header.alg!=='RS256'||typeof header.kid!=='string'||header.kid.length>200)throw Error('Invalid algorithm');
  const now=Math.floor(Date.now()/1000);
  if(claims.aud!==PROJECT||claims.iss!==ISSUER||typeof claims.sub!=='string'||!claims.sub||claims.sub.length>128||
     !Number.isSafeInteger(claims.exp)||claims.exp<=now||!Number.isSafeInteger(claims.iat)||claims.iat>now||
     !Number.isSafeInteger(claims.auth_time)||claims.auth_time>now)throw Error('Invalid claims');
  const jwks=await fetcher(CERTS);if(!jwks.ok)throw Error('Certificate service unavailable');
  const keys=await jwks.json();const jwk=keys.keys?.find(k=>k.kid===header.kid&&k.kty==='RSA'&&k.use==='sig');
  if(!jwk)throw Error('Unknown signing key');
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  const ok=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decode64(parts[2]),encoder.encode(parts[0]+'.'+parts[1]));
  if(!ok)throw Error('Bad signature');
  return {uid:claims.sub,email:claims.email||null};
}
export {verifyFirebase};
export default {
 async fetch(request,env){
  const url=new URL(request.url),origin=request.headers.get('Origin');
  if(origin&&origin!==ORIGIN)return response({error:'Origin not allowed'},403);
  if(request.method==='OPTIONS')return origin===ORIGIN?new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Max-Age':'600','Vary':'Origin'}}):response({error:'Forbidden'},403);
  if(url.pathname==='/health'&&request.method==='GET'){
   try{const result=await env.DB.prepare('SELECT 1 AS connected').first();
     return response({service:'SG Family Find API',database:result?.connected===1?'Connected':'Unavailable',status:'Staging baseline; sharing disabled'},result?.connected===1?200:503,origin);}
   catch{return response({service:'SG Family Find API',database:'Unavailable'},503,origin);}
  }
  if(url.pathname==='/v1/auth-check'&&request.method==='GET'){
   const match=/^Bearer (\S+)$/.exec(request.headers.get('Authorization')||'');
   if(!match)return response({error:'Authentication required'},401,origin);
   try{const viewer=await verifyFirebase(match[1]);return response({authenticated:true,uid:viewer.uid},200,origin);}
   catch{return response({error:'Authentication failed'},401,origin);}
  }
  if(url.pathname==='/v1/invitations'&&request.method==='POST'){
   const match=/^Bearer (\\S+)$/.exec(request.headers.get('Authorization')||'');
   if(!match)return response({error:'Authentication required'},401,origin);
   if(request.headers.get('Content-Type')?.split(';')[0].trim()!=='application/json')return response({error:'JSON required'},415,origin);
   const length=Number(request.headers.get('Content-Length')||0);
   if(!Number.isFinite(length)||length>1024)return response({error:'Request too large'},413,origin);
   try{
    const viewer=await verifyFirebase(match[1]);
    const raw=await request.text();
    if(raw.length>1024)return response({error:'Request too large'},413,origin);
    const payload=JSON.parse(raw||'{}');
    if(!payload||typeof payload!=='object'||Array.isArray(payload)||Object.keys(payload).length)return response({error:'Unexpected request fields'},400,origin);
    const invite=await createInvitation(env.DB,viewer.uid);
    if(invite.rateLimited)return response({error:'Invitation limit reached'},429,origin);
    return response({id:invite.id,token:invite.token,expiresAt:invite.expiresAt},201,origin);
   }catch(error){
    if(error instanceof SyntaxError)return response({error:'Invalid JSON'},400,origin);
    if(error?.message==='Database unavailable'||error?.message==='Database insert failed')return response({error:'Service unavailable'},503,origin);
    return response({error:'Authentication or request failed'},401,origin);
   }
  }
  // Deliberately fail closed until invitation, consent and revocation tests pass.
  return response({error:'Not available; location sharing is disabled'},404,origin);
 }
};
