import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {Miniflare} from 'miniflare';
import {hashCapability} from './capabilities.mjs';
import {CLEANUP_CRON, cleanupExpiredShares} from './cleanup.mjs';
import {acceptInvitation} from './consent.mjs';
import {createInvitation} from './invitations.mjs';
import {updatePosition} from './positions.mjs';
import {revokeByViewer} from './revoke.mjs';
import {readViewerPosition} from './viewer.mjs';
import worker from './worker.mjs';

const viewer = 'synthetic-viewer';
const stranger = 'synthetic-stranger';
const position = {latitude: 0, longitude: 0, accuracy: 10};
const jwksUrl = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

async function openD1(t, bindings = {}, keys = []) {
  const runtime = new Miniflare({
    modules: true,
    scriptPath: fileURLToPath(new URL('./worker.mjs', import.meta.url)),
    modulesRoot: fileURLToPath(new URL('.', import.meta.url)),
    compatibilityDate: '2026-08-06',
    d1Databases: {DB: 'synthetic-family-find'},
    d1Persist: false,
    bindings: {FAMILY_FIND_ENV: 'staging', FAMILY_FIND_ENABLED: 'false', ...bindings},
    outboundService: request => {
      assert.equal(request.url, jwksUrl);
      return Response.json({keys});
    },
  });
  t.after(() => runtime.dispose());
  const db = await runtime.getD1Database('DB');
  const schema = await readFile(new URL('./sql/staging-schema.sql', import.meta.url), 'utf8');
  await db.batch(schema.split(';').filter(statement => statement.trim())
    .map(statement => db.prepare(statement)));
  return {runtime, db};
}

function request(runtime, path, {method = 'GET', token, body} = {}) {
  const headers = new Headers();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (body) headers.set('Content-Type', 'application/json');
  return runtime.dispatchFetch(`https://synthetic.invalid${path}`, {
    method, headers, body: body && JSON.stringify(body),
  });
}

function shareRow(db, id) {
  return db.prepare('SELECT * FROM family_shares WHERE id = ?').bind(id).first();
}

function assertScrubbed(row, status) {
  assert.equal(row.status, status);
  for (const field of ['device_token_hash', 'last_lat', 'last_lng', 'last_seen_at']) {
    assert.equal(row[field], null, field);
  }
}

async function seededShare(db, now, uid = viewer) {
  const invitation = await createInvitation(db, uid, now);
  const share = await acceptInvitation(db, invitation.token, true, now + 1);
  assert.equal((await updatePosition(db, share.deviceToken, position, now + 2)).status, 200);
  return share;
}

async function syntheticIdentity() {
  const algorithm = {name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256'};
  const pair = await crypto.subtle.generateKey(
    {...algorithm, modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1])},
    true, ['sign', 'verify'],
  );
  const key = {...await crypto.subtle.exportKey('jwk', pair.publicKey), kid: 'synthetic', use: 'sig'};
  const encode = object => Buffer.from(JSON.stringify(object)).toString('base64url');
  return {
    key,
    async token(uid) {
      const now = Math.floor(Date.now() / 1000);
      const claims = {
        sub: uid, aud: 'sg-vehicle-monitor-pro', iss: 'https://securetoken.google.com/sg-vehicle-monitor-pro',
        iat: now, auth_time: now, exp: now + 300,
      };
      const input = `${encode({alg: 'RS256', kid: key.kid})}.${encode(claims)}`;
      const signature = await crypto.subtle.sign(algorithm, pair.privateKey, Buffer.from(input));
      return `${input}.${Buffer.from(signature).toString('base64url')}`;
    },
  };
}

test('local D1: concurrent HTTP consent issues exactly one device credential', async t => {
  const identity = await syntheticIdentity();
  const {runtime, db} = await openD1(t, {FAMILY_FIND_ENABLED: 'true'}, [identity.key]);
  const [viewerToken, strangerToken] = await Promise.all([identity.token(viewer), identity.token(stranger)]);
  const invite = await request(runtime, '/v1/invitations', {method: 'POST', token: viewerToken, body: {}});
  assert.equal(invite.status, 201);
  const {id, token} = await invite.json();
  const pending = await shareRow(db, id);
  assert.equal(pending.invite_token_hash, await hashCapability(token));
  assertScrubbed(pending, 'pending');
  assert.equal((await request(runtime, '/v1/consent', {
    method: 'POST', body: {token, agreed: false},
  })).status, 400);

  const responses = await Promise.all(Array.from({length: 8}, () =>
    request(runtime, '/v1/consent', {method: 'POST', body: {token, agreed: true}})));
  responses.sort((a, b) => a.status - b.status);
  assert.deepEqual(responses.map(response => response.status), [200, 410, 410, 410, 410, 410, 410, 410]);
  const [{deviceToken}, ...losers] = await Promise.all(responses.map(response => response.json()));
  assert.ok(losers.every(result => !Object.hasOwn(result, 'deviceToken')));
  const active = await shareRow(db, id);
  assert.equal(active.status, 'active');
  assert.equal(active.device_token_hash, await hashCapability(deviceToken));
  assert.equal(active.last_lat, null);

  const sendPosition = () => request(runtime, '/v1/positions', {method: 'POST', token: deviceToken, body: position});
  const view = auth => request(runtime, `/v1/positions/${id}`, {token: auth});
  const revoke = auth => request(runtime, `/v1/shares/${id}/revoke`, {method: 'POST', token: auth});
  assert.equal((await sendPosition()).status, 200);
  assert.equal((await sendPosition()).status, 409);
  assert.equal((await view(strangerToken)).status, 404);
  assert.equal((await revoke(strangerToken)).status, 404);
  const viewed = await view(viewerToken);
  assert.equal(viewed.status, 200);
  assert.deepEqual((await viewed.json()).position, {
    latitude: 0, longitude: 0, lastSeenAt: (await shareRow(db, id)).last_seen_at,
  });

  // Clear the throttle so a position write can race an authorized revocation.
  await db.prepare('UPDATE family_shares SET last_seen_at = last_seen_at - 10 WHERE id = ?').bind(id).run();
  const [write, stopped] = await Promise.all([sendPosition(), revoke(deviceToken)]);
  assert.ok([200, 409].includes(write.status));
  assert.equal(stopped.status, 200);
  assertScrubbed(await shareRow(db, id), 'revoked');
  assert.equal((await sendPosition()).status, 409);
  assert.equal((await view(viewerToken)).status, 404);
});

test('local D1: expiry boundaries, viewer revocation and disabled HTTP routes', async t => {
  const {runtime, db} = await openD1(t);
  const now = 2_000_000_000;
  const invitation = await createInvitation(db, viewer, now);
  assert.equal((await acceptInvitation(db, invitation.token, true, invitation.expiresAt)).status, 410);
  assertScrubbed(await shareRow(db, invitation.id), 'pending');

  const canceled = await createInvitation(db, viewer, now);
  assert.equal((await revokeByViewer(db, canceled.id, stranger, now + 1)).status, 404);
  assert.equal((await revokeByViewer(db, canceled.id, viewer, now + 1)).status, 200);
  assert.equal((await acceptInvitation(db, canceled.token, true, now + 1)).status, 410);

  const share = await seededShare(db, now);
  assert.equal((await readViewerPosition(db, share.id, viewer, share.expiresAt - 1)).status, 200);
  assert.equal((await readViewerPosition(db, share.id, viewer, share.expiresAt)).status, 404);
  assert.equal((await updatePosition(db, share.deviceToken, position, share.expiresAt)).status, 409);

  const stopped = await seededShare(db, now);
  assert.equal((await revokeByViewer(db, stopped.id, viewer, now + 3)).status, 200);
  assertScrubbed(await shareRow(db, stopped.id), 'revoked');

  const routes = [
    ['/v1/invitations', 'POST'], ['/v1/consent', 'POST'], ['/v1/positions', 'POST'],
    [`/v1/positions/${share.id}`, 'GET'], [`/v1/shares/${share.id}/revoke`, 'POST'],
  ];
  for (const [path, method] of routes) {
    const response = await request(runtime, path, {method});
    assert.equal(response.status, 503, path);
    assert.deepEqual(await response.json(), {error: 'Family sharing is disabled'});
  }
});

test('local D1: staging cron scrubs expired data, retains recent metadata and safely retries', async t => {
  const {runtime, db} = await openD1(t, {FAMILY_FIND_CLEANUP_ENABLED: 'true'});
  const cutoff = 2_000_000_000;
  const duration = 24 * 60 * 60;
  const expired = await seededShare(db, cutoff - 3601, 'expired');
  const pending = await createInvitation(db, 'pending', cutoff - 900);
  const current = await seededShare(db, cutoff - 3600, 'current');
  const old = await seededShare(db, cutoff - duration - 3601, 'old');
  const oldRevoked = await seededShare(db, cutoff - duration - 4000, 'old-revoked');
  const recentRevoked = await seededShare(db, cutoff - duration - 4000, 'recently-revoked');
  await revokeByViewer(db, oldRevoked.id, 'old-revoked', cutoff - duration);
  await revokeByViewer(db, recentRevoked.id, 'recently-revoked', cutoff - duration + 1);

  const scheduled = {cron: CLEANUP_CRON, scheduledTime: cutoff * 1000};
  const event = {...scheduled, scheduledTime: new Date(scheduled.scheduledTime)};
  const schedule = await runtime.getWorker();
  await schedule.scheduled({...event, cron: '0 0 * * *'});
  await worker.scheduled(scheduled, {DB: db, FAMILY_FIND_ENV: 'production', FAMILY_FIND_CLEANUP_ENABLED: 'true'});
  await worker.scheduled(scheduled, {DB: db, FAMILY_FIND_ENV: 'staging', FAMILY_FIND_CLEANUP_ENABLED: 'false'});
  await worker.scheduled(scheduled, {DB: db, FAMILY_FIND_ENV: 'staging'});
  assert.equal((await shareRow(db, expired.id)).status, 'active');
  assert.equal((await request(runtime, '/v1/cleanup', {method: 'POST'})).status, 503);

  await db.prepare(`CREATE TRIGGER synthetic_cleanup_failure BEFORE DELETE ON family_shares
    BEGIN SELECT RAISE(ABORT, 'synthetic cleanup failure'); END`).run();
  await assert.rejects(cleanupExpiredShares(db, cutoff), /synthetic cleanup failure/);
  assert.equal((await shareRow(db, expired.id)).status, 'active');
  assert.equal((await shareRow(db, old.id)).last_lat, 0);
  await db.prepare('DROP TRIGGER synthetic_cleanup_failure').run();

  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await schedule.scheduled(event);
    assert.equal(result.outcome, 'ok');
    assertScrubbed(await shareRow(db, expired.id), 'expired');
    assertScrubbed(await shareRow(db, pending.id), 'expired');
    assertScrubbed(await shareRow(db, recentRevoked.id), 'revoked');
    assert.equal(await shareRow(db, old.id), null);
    assert.equal(await shareRow(db, oldRevoked.id), null);
    assert.equal((await readViewerPosition(db, current.id, 'current', cutoff)).status, 200);
    assert.equal((await request(runtime, '/v1/invitations', {method: 'POST'})).status, 503);
  }
});

test('local D1: each scheduled run bounds its writes and resumes a backlog', async t => {
  const {runtime, db} = await openD1(t, {FAMILY_FIND_CLEANUP_ENABLED: 'true'});
  await db.prepare(`WITH RECURSIVE rows(n) AS (
      SELECT 1 UNION ALL SELECT n + 1 FROM rows WHERE n < 251
    )
    INSERT INTO family_shares (id, viewer_uid, invite_token_hash, status, created_at, expires_at)
    SELECT 'synthetic-' || n, 'synthetic', 'hash-' || n, 'pending', 0, 900 FROM rows`).run();
  const schedule = await runtime.getWorker();
  const event = {cron: CLEANUP_CRON, scheduledTime: new Date(86_400_000 + 900_000)};
  assert.equal((await schedule.scheduled(event)).outcome, 'ok');
  assert.equal(await db.prepare('SELECT COUNT(*) AS count FROM family_shares').first('count'), 1);
  assert.equal((await schedule.scheduled(event)).outcome, 'ok');
  assert.equal(await db.prepare('SELECT COUNT(*) AS count FROM family_shares').first('count'), 0);
});
