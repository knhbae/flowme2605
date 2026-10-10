import test from 'node:test';
import assert from 'node:assert/strict';
import { createAlphaCommandHandler, signAlphaCommand } from './command-handler';
import { createAlphaPreservationHandler } from './preservation-handler';
import { alphaCapacityMode } from './capacity-adapter';
import { CAPACITY_M3_SCHEMA } from './capacity-m3';
import { createProgramPrivateSpace } from '../program-data';
import { canonicalJson, detached, sha256 } from '../alpha-persistence/json';
import type { AlphaAccount, AlphaPrivateCommand } from '../alpha-persistence/contract';
import { PRESERVATION_PROTOCOL, SEALED_BACKUP_SCHEMA } from '../alpha-preservation/contract';
import { BACKUP_DOWNLOAD_FORMAT, BACKUP_DOWNLOAD_SCHEMA, readBackupDownload } from '../alpha-preservation/backup-download';
import { newProgramParticipationDraft } from '../participation-editor';

const owner = '11111111-1111-4111-8111-111111111111', other = '22222222-2222-4222-8222-222222222222';
const key = 'ab'.repeat(32), token = 'synthetic-capacity-test-token', origin = 'http://localhost:3104';
const env = { FLOWME_ALPHA_ENABLED: 'development-only', FLOWME_ALPHA_STAGE: 'development',
  FLOWME_ALPHA_PROJECT_REF: 'wkmzcxpnojobxrgebapw', FLOWME_ALPHA_SUPABASE_URL: 'https://wkmzcxpnojobxrgebapw.supabase.co',
  FLOWME_ALPHA_PUBLISHABLE_KEY: 'sb_publishable_fixture', FLOWME_ALPHA_REDIRECT_URL: `${origin}/auth/callback`,
  FLOWME_ALPHA_M3_SIGNING_KEY: key, FLOWME_ALPHA_M3_CAPACITY: 'checkpoint-v1' };
const hash = (raw: string) => sha256(new TextEncoder().encode(raw));
const context = { schema: 'flowme-alpha-social-context/1', revision: 0, ownActorId: 'member-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  actors: [{ id: 'member-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'Synthetic' }],
  public: { flows: [], versions: [], posts: [], replies: [], reactions: [], proposals: [] } };
function request(body: unknown, endpoint = 'account') {
  return new Request(`${origin}/api/alpha/${endpoint}`, { method: 'POST', headers: {
    'content-type': 'application/json', authorization: `Bearer ${token}`, origin,
  }, body: JSON.stringify(body) });
}
function fixture() {
  const account: AlphaAccount = { schema: 'flowme-alpha-account/1', ownerId: owner, revision: 0,
    source: { schema: 'flowme-integrated-product-poc/1', actorId: owner, revision: 0 },
    space: createProgramPrivateSpace(), legacyReceipts: [], legacyUndo: [] };
  const command: AlphaPrivateCommand = { schema: 'flowme-alpha-command/1', kind: 'change-private', requestId: 'save-one', expectedRevision: 0,
    changes: [{ field: 'position', present: true, value: { ...account.space.position, scrollTop: 1 } }] };
  const receipt = { requestId: command.requestId, revision: 1, changed: true, kind: command.kind };
  const state = { account, user: owner, expired: false, anonymous: false, committed: false, lost: false, writes: 0,
    checkpoint: null as unknown, checkpointFailure: false, capacityStatus: 200, oversizeBudget: false,
    phases: [] as string[], paths: [] as string[], lastCommit: null as any, photo: false };
  const photoId = 'media-cccccccc-cccc-4ccc-8ccc-cccccccccccc', photo = new Uint8Array([1, 2, 3, 4]);
  const nextRead = () => {
    const next = detached(state.account); next.revision = 1; next.space.position.scrollTop = 1;
    return { ok: true, value: { account: next, context, operations: [{ owner_id: owner, request_id: command.requestId, command,
      receipt, inverse: [], undone: false }], importArchives: [] } };
  };
  const upstream: typeof fetch = async (url, init) => {
    const path = new URL(String(url)).pathname; state.paths.push(path);
    assert.equal(new Headers(init?.headers).get('authorization'), `Bearer ${token}`);
    assert.equal(new Headers(init?.headers).get('apikey'), env.FLOWME_ALPHA_PUBLISHABLE_KEY);
    assert.equal(init?.cache, 'no-store'); assert.equal(init?.redirect, 'error');
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    if (path === '/auth/v1/user') return Response.json({ id: state.user, is_anonymous: state.anonymous }, { status: state.expired ? 401 : 200 });
    if (path === '/rest/v1/flowme_alpha_accounts') return Response.json([{ account: state.account }]);
    if (path.endsWith('/flowme_alpha_lookup_v1')) return Response.json({ ok: true, value: state.committed ? receipt : null });
    if (path.endsWith('/flowme_alpha_capacity_checkpoint_read_v1')) {
      assert.equal(body.proof, signAlphaCommand(state.user, body.read_text, key));
      assert.deepEqual(JSON.parse(body.read_text), { schema: 'flowme-alpha-capacity-checkpoint-read/1' });
      return Response.json(state.checkpointFailure ? { ok: false, reason: 'unavailable' } : { ok: true, value: state.checkpoint });
    }
    if (path.endsWith('/flowme_alpha_preservation_read_v1')) {
      assert.equal(body.proof, signAlphaCommand(owner, body.read_text, key));
      return Response.json({ ok: true, value: { account: state.account, context, operations: [], importArchives: [] } });
    }
    if (path.endsWith('/flowme_alpha_social_media_read_v1')) {
      assert.equal(body.media_id, photoId);
      return Response.json({ ok: true, value: { id: photoId, path: `media/${photoId}.webp`, sha256: await sha256(photo), bytes: photo.length } });
    }
    if (path.includes('/storage/v1/object/authenticated/')) return new Response(photo, { headers: { 'content-type': 'image/webp' } });
    assert.equal(path, '/rest/v1/rpc/flowme_alpha_capacity_m3_v1', 'no legacy/foreign write fallback');
    assert.equal(body.proof, signAlphaCommand(owner, body.request_text, key));
    const input = JSON.parse(body.request_text); assert.equal(input.schema, CAPACITY_M3_SCHEMA); state.phases.push(input.phase);
    if (state.capacityStatus !== 200) return Response.json({ ignored: true }, { status: state.capacityStatus });
    if (state.committed) return Response.json({ ok: true, kind: 'receipt', value: receipt });
    const raw = JSON.stringify(nextRead());
    if (input.phase === 'budget') return Response.json({ ok: true, kind: 'budget', snapshotSha256: await hash(raw),
      sqlBudget: { pairedValueBytes: state.oversizeBudget ? 30_000_000 : 5000, operationRowBytes: [1000], archiveRowBytes: [] } });
    if (input.phase === 'snapshot') return Response.json({ ok: true, kind: 'snapshot', rawReadResponse: raw });
    assert.equal(input.phase, 'commit'); assert.equal(input.certificate.backupFileSha256, await hash(input.backupFile));
    const checked = await readBackupDownload({ schema: BACKUP_DOWNLOAD_SCHEMA, file: input.backupFile }, owner);
    assert.equal(checked.createdAt, input.certificate.createdAt);
    assert.equal(checked.proof, signAlphaCommand(owner, canonicalJson({ schema: SEALED_BACKUP_SCHEMA, ownerId: owner,
      digest: checked.backup.integrity.payloadSha256 }), key));
    state.account = nextRead().value.account; state.writes++; state.committed = true; state.lastCommit = input;
    state.checkpoint = { schema: BACKUP_DOWNLOAD_SCHEMA, file: input.backupFile };
    if (state.lost) { state.lost = false; throw Error('PRIVATE_ERROR_AFTER_COMMIT'); }
    return Response.json({ ok: true, kind: 'receipt', value: receipt });
  };
  const handler = createAlphaCommandHandler(env, upstream), preservation = createAlphaPreservationHandler(env, upstream);
  const execute = () => handler(request({ kind: 'execute', command }));
  const backup = (format = true) => preservation(request({ kind: 'backup', client: PRESERVATION_PROTOCOL.client,
    ...(format ? { format: BACKUP_DOWNLOAD_FORMAT } : {}) }, 'preservation'));
  return { state, command, upstream, handler, execute, backup, receipt, photoId, photo };
}

test('HTTP opt-in keeps full authorization and signs exact checkpoint requests with only the user JWT', async () => {
  const f = fixture(), response = await f.execute(); assert.deepEqual(await response.json(), { ok: true, value: f.receipt });
  assert.deepEqual(f.state.phases, ['budget', 'snapshot', 'commit']); assert.equal(f.state.writes, 1);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(f.state.lastCommit.command.requestId, f.command.requestId);
  assert.deepEqual(Object.keys(await (await f.execute()).json()), ['ok', 'value']);
  assert.equal(f.state.writes, 1); assert(!f.state.paths.some(path => path.endsWith('/flowme_alpha_execute_v1')));
});
test('HTTP response loss keeps ambiguity then same command replay recovers one write', async () => {
  const f = fixture(); f.state.lost = true;
  assert.deepEqual(await (await f.execute()).json(), { ok: false, reason: 'unavailable' });
  assert.equal(f.state.writes, 1); f.state.phases.length = 0;
  assert.deepEqual(await (await f.execute()).json(), { ok: true, value: f.receipt });
  assert.deepEqual(f.state.phases, ['budget']); assert.equal(f.state.writes, 1);
});
test('missing capacity RPC, SQL failure and denied session never fall back to the old writer', async () => {
  for (const code of [404, 500, 401, 403]) {
    const f = fixture(); f.state.capacityStatus = code;
    assert.deepEqual(await (await f.execute()).json(), { ok: false, reason: code === 401 || code === 403 ? 'unauthenticated' : 'unavailable' });
    assert.deepEqual(f.state.phases, ['budget']); assert.equal(f.state.writes, 0);
  }
});
test('SQL oversized candidate returns limit through the real handler and performs no commit', async () => {
  const f = fixture(); f.state.oversizeBudget = true;
  assert.deepEqual(await (await f.execute()).json(), { ok: false, reason: 'limit' });
  assert.deepEqual(f.state.phases, ['budget', 'snapshot']); assert.equal(f.state.writes, 0);
});
test('opt-in cannot bypass domain, owner, anonymous, expired, future revision or no-op validation', async () => {
  for (const mode of ['domain', 'owner', 'anonymous', 'expired', 'future', 'same']) {
    const f = fixture();
    if (mode === 'domain') (f.command as any).changes[0].value = { impossible: true };
    if (mode === 'owner') f.state.user = other;
    if (mode === 'anonymous') f.state.anonymous = true;
    if (mode === 'expired') f.state.expired = true;
    if (mode === 'future') f.command.expectedRevision = 5;
    if (mode === 'same') (f.command as any).changes = [];
    assert.equal((await (await f.execute()).json()).ok, false, mode); assert.equal(f.state.phases.length, 0, mode);
  }
});
test('only exact rollout value is accepted and production remains disabled before network access', async () => {
  assert.equal(alphaCapacityMode({}), 'legacy'); assert.equal(alphaCapacityMode(env), 'checkpoint-v1');
  assert.equal(alphaCapacityMode({ FLOWME_ALPHA_M3_CAPACITY: 'on-demand-v1' }), 'on-demand-v1');
  for (const value of ['', 'true', 'checkpoint-v1 ', 'checkpoint-v2', 'on-demand-v1 ', 'on-demand-v2']) {
    const f = fixture(), invalid = { ...env, FLOWME_ALPHA_M3_CAPACITY: value };
    assert.equal((await createAlphaCommandHandler(invalid, f.upstream)(request({ kind: 'execute', command: f.command }))).status, 503);
    assert.equal((await createAlphaPreservationHandler(invalid, f.upstream)(request({ kind: 'backup', client: PRESERVATION_PROTOCOL.client }, 'preservation'))).status, 503);
    assert.equal(f.state.paths.length, 0);
  }
  const f = fixture(); assert.equal((await createAlphaCommandHandler({ ...env, VERCEL_ENV: 'production' }, f.upstream)(request({ kind: 'execute', command: f.command }))).status, 503);
  assert.equal(f.state.paths.length, 0);
});
test('current media travels through existing authenticated metadata/byte/hash rechecks before certification', async () => {
  const f = fixture();
  f.state.account.space.participationDrafts = [{ ...newProgramParticipationDraft(), body: 'Synthetic photo',
    media: [{ id: f.photoId, dataUrl: `flowme-media:${f.photoId}`, alt: 'Synthetic', synthetic: true }] }];
  assert.equal((await (await f.execute()).json()).ok, true);
  assert.deepEqual(f.state.lastCommit.certificate.media, [{ id: f.photoId, bytes: f.photo.length, sha256: await sha256(f.photo) }]);
  assert.equal(f.state.paths.filter(path => path.endsWith('/flowme_alpha_social_media_read_v1')).length, 2);
});
test('checked backup request returns exact stored file without rereading photos or changing timestamps', async () => {
  const f = fixture(); assert.equal((await (await f.execute()).json()).ok, true); const file = f.state.lastCommit.backupFile;
  f.state.paths.length = 0; const response = await f.backup(), value = await response.json();
  assert.deepEqual(value, { ok: true, value: { schema: BACKUP_DOWNLOAD_SCHEMA, file } });
  assert.deepEqual(f.state.paths, ['/auth/v1/user', '/rest/v1/rpc/flowme_alpha_capacity_checkpoint_read_v1']);
  assert.equal(response.headers.get('vary'), 'Authorization'); assert.equal(f.state.writes, 1);
});
test('checkpoint miss creates a current fresh file while legacy backup shape is unchanged', async () => {
  const f = fixture(), packed = await (await f.backup()).json(); assert.equal(packed.ok, true);
  assert.equal(packed.value.schema, BACKUP_DOWNLOAD_SCHEMA); assert((await readBackupDownload(packed.value, owner)).file);
  assert.equal(f.state.writes, 0); f.state.paths.length = 0;
  const legacy = await (await f.backup(false)).json(); assert.equal(legacy.value.schema, SEALED_BACKUP_SCHEMA);
  assert(!f.state.paths.some(path => path.endsWith('/flowme_alpha_capacity_checkpoint_read_v1')));
});
test('checkpoint error, malformed file, foreign owner and forged seal cannot silently become fresh backups', async () => {
  for (const mode of ['error', 'malformed', 'foreign', 'seal']) {
    const f = fixture(); assert.equal((await (await f.execute()).json()).ok, true);
    if (mode === 'error') f.state.checkpointFailure = true;
    if (mode === 'malformed') f.state.checkpoint = { schema: BACKUP_DOWNLOAD_SCHEMA, file: '{}' };
    if (mode === 'foreign') f.state.user = other;
    if (mode === 'seal') {
      const value = await readBackupDownload(f.state.checkpoint, owner); const sealed = JSON.parse(value.raw); sealed.proof = '0'.repeat(64);
      const { encodeBackupFile } = await import('../alpha-preservation/file-codec');
      f.state.checkpoint = { schema: BACKUP_DOWNLOAD_SCHEMA, file: await encodeBackupFile(canonicalJson(sealed)) };
    }
    f.state.paths.length = 0;
    const response = await (await f.backup()).json(); assert.equal(response.ok, false, mode);
    assert(!f.state.paths.some(path => path.endsWith('/flowme_alpha_preservation_read_v1')), mode);
    assert(!JSON.stringify(response).includes(key)); assert.equal(f.state.writes, 1);
  }
});
