// Read-only staging preflight: validates a deployment manifest and confirms
// sharing routes are disabled before real participant testing.
import {validateStagingConfig} from './staging-config.mjs';
export async function stagingPreflight({config,fetcher,baseUrl}){
 const manifest=validateStagingConfig(config);
 if(!manifest.ok)return {ready:false,errors:manifest.errors};
 const base=new URL(baseUrl);
 if(base.protocol!=='https:'||base.username||base.password||base.search||base.hash)
  return {ready:false,errors:['Clean HTTPS staging URL required']};
 if(!/^sg-family-find-staging\./.test(base.hostname))
  return {ready:false,errors:['Expected isolated staging Worker hostname']};
 const errors=[];
 try{
  const health=await fetcher(new URL('/health',base),{method:'GET',cache:'no-store',redirect:'error'});
  if(health.status!==200)errors.push('Staging health check failed');
  else{
   const data=await health.json();
   if(data.database!=='Connected')errors.push('Staging database not connected');
  }
  const blocked=await fetcher(new URL('/v1/invitations',base),{
   method:'POST',headers:{'Content-Type':'application/json'},body:'{}',cache:'no-store',redirect:'error'});
  if(blocked.status!==503)errors.push('Sharing activation safeguard is not disabled');
 }catch{errors.push('Staging endpoint unreachable');}
 return {ready:errors.length===0,errors};
}
