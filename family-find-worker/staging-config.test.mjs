import test from 'node:test';
import assert from 'node:assert/strict';
import {validateStagingConfig} from './staging-config.mjs';
const good={name:'sg-family-find-staging',main:'family-find-worker/worker.mjs',
 vars:{FAMILY_FIND_SHARING_ENABLED:'false'},
 d1_databases:[{binding:'DB',database_name:'sg-family-find-staging-db',database_id:'12345678-1234-4123-8123-123456789abc'}]};
test('accepts a correctly shaped disabled staging manifest',()=>assert.equal(validateStagingConfig(good).ok,true));
test('rejects production Worker or production D1 name',()=>{
 assert.equal(validateStagingConfig({...good,name:'sg-family-find-api'}).ok,false);
 assert.equal(validateStagingConfig({...good,d1_databases:[{...good.d1_databases[0],database_name:'sg-family-find-db'}]}).ok,false);
});
test('rejects enabled sharing or missing staging UUID',()=>{
 assert.equal(validateStagingConfig({...good,vars:{FAMILY_FIND_SHARING_ENABLED:'true'}}).ok,false);
 assert.equal(validateStagingConfig({...good,d1_databases:[{...good.d1_databases[0],database_id:'REPLACE_WITH_STAGING_D1_DATABASE_UUID'}]}).ok,false);
});
test('rejects extra D1 bindings and missing manifest',()=>{
 assert.equal(validateStagingConfig({...good,d1_databases:[...good.d1_databases,...good.d1_databases]}).ok,false);
 assert.equal(validateStagingConfig(null).ok,false);
});
