// Validate a staging deployment manifest before invoking Cloudflare tooling.
// This is a guardrail, not proof that the UUID actually belongs to the staging D1.
export function validateStagingConfig(config){
 const errors=[];
 if(!config||typeof config!=='object')return {ok:false,errors:['Configuration required']};
 if(config.name!=='sg-family-find-staging')errors.push('Staging Worker name required');
 if(config.main!=='family-find-worker/worker.mjs')errors.push('Unexpected Worker entrypoint');
 if(config.vars?.FAMILY_FIND_SHARING_ENABLED!=='false')
  errors.push('Sharing must remain disabled for initial staging deployment');
 const bindings=config.d1_databases;
 if(!Array.isArray(bindings)||bindings.length!==1)errors.push('Exactly one staging D1 binding required');
 else{
  const db=bindings[0];
  if(db.binding!=='DB'||db.database_name!=='sg-family-find-staging-db')
   errors.push('Only the isolated staging D1 database is permitted');
  if(typeof db.database_id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(db.database_id))
   errors.push('Real staging D1 UUID required');
 }
 return {ok:errors.length===0,errors};
}
