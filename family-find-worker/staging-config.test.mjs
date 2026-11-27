import test from 'node:test';
import assert from 'node:assert/strict';
import {validateStagingConfig} from './staging-config.mjs';
import {CLEANUP_CRON} from './cleanup.mjs';
const good={name:'sg-family-find-staging',main:'family-find-worker/worker.mjs',
 vars:{FAMILY_FIND_ENV:'staging',FAMILY_FIND_ENABLED:'false'},
 d1_databases:[{binding:'DB',database_name:'sg-family-find-staging-db',database_id:'12345678-1234-4123-8123-123456789abc'}]};
test('accepts a correctly shaped disabled staging manifest',()=>assert.equal(validateStagingConfig(good).ok,true));
test('rejects production Worker or production D1 name',()=>{
 assert.equal(validateStagingConfig({...good,name:'sg-family-find-api'}).ok,false);
 assert.equal(validateStagingConfig({...good,d1_databases:[{...good.d1_databases[0],database_name:'sg-family-find-db'}]}).ok,false);
});
test('rejects enabled sharing or missing staging UUID',()=>{
 assert.equal(validateStagingConfig({...good,vars:{...good.vars,FAMILY_FIND_ENABLED:'true'}}).ok,false);
 assert.equal(validateStagingConfig({...good,vars:{FAMILY_FIND_ENV:'staging',FAMILY_FIND_SHARING_ENABLED:'false'}}).ok,false);
 assert.equal(validateStagingConfig({...good,d1_databases:[{...good.d1_databases[0],database_id:'REPLACE_WITH_STAGING_D1_DATABASE_UUID'}]}).ok,false);
});
test('accepts the bundled staging entrypoint and requires cleanup flag and schedule to agree',()=>{
 const config={...good,main:'sg-family-find-staging-worker.mjs',vars:{...good.vars,FAMILY_FIND_CLEANUP_ENABLED:'true'}};
 const scheduled={...config,triggers:{crons:[CLEANUP_CRON]}};
 assert.equal(validateStagingConfig(scheduled).ok,true);
 assert.equal(validateStagingConfig(config).ok,false);
 assert.equal(validateStagingConfig({...good,triggers:scheduled.triggers}).ok,false);
 assert.equal(validateStagingConfig({...scheduled,triggers:{crons:['* * * * *']}}).ok,false);
});
test('rejects production environment even when sharing disabled',()=>{
 assert.equal(validateStagingConfig({...good,vars:{...good.vars,FAMILY_FIND_ENV:'production'}}).ok,false);
});
test('rejects extra D1 bindings and missing manifest',()=>{
 assert.equal(validateStagingConfig({...good,d1_databases:[...good.d1_databases,...good.d1_databases]}).ok,false);
 assert.equal(validateStagingConfig(null).ok,false);
});
