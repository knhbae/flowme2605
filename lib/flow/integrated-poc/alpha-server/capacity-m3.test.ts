import test from 'node:test';
import assert from 'node:assert/strict';
import { ALPHA_SCHEMA, ALPHA_COMMAND_SCHEMA, type AlphaAccount, type AlphaPrivateCommand } from '../alpha-persistence/contract';
import { detached, sha256 } from '../alpha-persistence/json';
import { PROGRAM_SCHEMA } from '../contract';
import { createProgramPrivateSpace } from '../program-data';
import { ALPHA_SOCIAL_CONTEXT_SCHEMA } from '../alpha-social/projection';
import { executeCapacityM3, readCapacityM3Response, CAPACITY_SNAPSHOT_WIRE_BYTES, type CapacityM3Request } from './capacity-m3';

const owner = '11111111-1111-4111-8111-111111111111', now = '2026-09-24T00:00:00.000Z';
const alias = 'member-22222222-2222-4222-8222-222222222222';
const hash = (raw: string) => sha256(new TextEncoder().encode(raw));
async function fixture() {
  const space = createProgramPrivateSpace(); space.position.scrollTop = 1;
  const account: AlphaAccount = { schema: ALPHA_SCHEMA, ownerId: owner, revision: 1,
    source: { schema: PROGRAM_SCHEMA, actorId: owner, revision: 0 }, space, legacyReceipts: [], legacyUndo: [] };
  const command: AlphaPrivateCommand = { schema: ALPHA_COMMAND_SCHEMA, kind: 'change-private', requestId: 'save', expectedRevision: 0,
    changes: [{ field: 'position', present: true, value: space.position }] };
  const receipt = { requestId: 'save', revision: 1, changed: true, kind: 'change-private' };
  const value = { account, context: { schema: ALPHA_SOCIAL_CONTEXT_SCHEMA, revision: 0, ownActorId: alias,
    actors: [{ id: alias, name: '합성 시험' }], public: { flows: [], versions: [], posts: [], replies: [], reactions: [], proposals: [] } },
    operations: [{ owner_id: owner, request_id: 'save', command: detached(command), receipt,
      inverse: [{ field: 'position', present: true, value: createProgramPrivateSpace().position }], undone: false }], importArchives: [] as unknown[] };
  const raw = () => JSON.stringify({ ok: true, value });
  const budget = async () => ({ ok: true, kind: 'budget', snapshotSha256: await hash(raw()),
    sqlBudget: { pairedValueBytes: 2000, operationRowBytes: [1000], archiveRowBytes: value.importArchives.map(() => 100) } });
  const calls: CapacityM3Request[] = [];
  const rpc = async (request: CapacityM3Request): Promise<unknown> => {
    calls.push(detached(request));
    if (request.phase === 'budget') return budget();
    if (request.phase === 'snapshot') return { ok: true, kind: 'snapshot', rawReadResponse: raw() };
    return { ok: true, kind: 'receipt', value: receipt };
  };
  const noMedia = async () => { throw Error('unexpected-media'); };
  const sealDigest = async () => 'a'.repeat(64);
  const input = { ownerId: owner, command, createdAt: now };
  const run = (override: Partial<Parameters<typeof executeCapacityM3>[1]> = {}) =>
    executeCapacityM3(input, { rpc, resolveMedia: noMedia, sealDigest, ...override });
  return { input, value, raw, budget, calls, receipt, rpc, run, noMedia, sealDigest };
}

test('full exact inspector precedes commit and binds original command, snapshot and fixed creation time', async () => {
  const f = await fixture(), result = await f.run();
  assert.deepEqual(result, { ok: true, value: f.receipt });
  assert.deepEqual(f.calls.map(row => row.phase), ['budget', 'snapshot', 'commit']);
  const commit = f.calls[2]; assert.equal(commit.phase, 'commit');
  if (commit.phase === 'commit') {
    assert.equal(commit.certificate.snapshotSha256, await hash(f.raw())); assert.equal(commit.certificate.createdAt, now);
    assert.deepEqual(commit.certificate.media, []); assert.deepEqual(commit.command, f.input.command);
    assert(!JSON.stringify(commit.certificate).includes('합성 시험'));
  }
});
for (const phase of ['budget', 'snapshot'] as const) test(`completed receipt during ${phase} bypasses new capacity checks without another commit`, async () => {
  const f = await fixture(); let seals = 0;
  const result = await f.run({ rpc: async request => request.phase === phase ? { ok: true, kind: 'receipt', value: f.receipt } : f.rpc(request),
    sealDigest: async () => { seals++; return 'a'.repeat(64); } });
  assert.deepEqual(result, { ok: true, value: f.receipt }); assert.equal(seals, 0); assert(!f.calls.some(row => row.phase === 'commit'));
});
for (const reason of ['no-change', 'revision-conflict', 'idempotency-conflict', 'undo-conflict', 'unauthenticated', 'limit'] as const)
test(`authoritative ${reason} is preserved with no commit`, async () => {
  const f = await fixture(); const result = await f.run({ rpc: async () => ({ ok: false, reason }) });
  assert.deepEqual(result, { ok: false, reason }); assert.equal(f.calls.length, 0);
});
test('different full context between preparation reads cannot be certified', async () => {
  const f = await fixture();
  const result = await f.run({ rpc: async request => {
    const response = await f.rpc(request);
    if (request.phase === 'budget') f.value.context.actors.push({ id: 'member-33333333-3333-4333-8333-333333333333', name: 'new alias' });
    return response;
  } });
  assert.deepEqual(result, { ok: false, reason: 'revision-conflict' }); assert.equal(f.calls.length, 2);
});
test('missing/malformed SQL evidence never produces a certificate', async () => {
  for (const sqlBudget of [undefined, {}, { pairedValueBytes: 1, operationRowBytes: [], archiveRowBytes: [] }]) {
    const f = await fixture(); const result = await f.run({ rpc: async request => request.phase === 'budget'
      ? { ...await f.budget(), ...(sqlBudget === undefined ? { sqlBudget: null } : { sqlBudget }) } : f.rpc(request) });
    assert.deepEqual(result, { ok: false, reason: 'unavailable' }); assert(!f.calls.some(row => row.phase === 'commit'));
  }
});
test('over-budget SQL measurement rejects before final commit', async () => {
  const f = await fixture(); const result = await f.run({ rpc: async request => request.phase === 'budget'
    ? { ...await f.budget(), sqlBudget: { pairedValueBytes: 30_000_000, operationRowBytes: [1], archiveRowBytes: [] } } : f.rpc(request) });
  assert.deepEqual(result, { ok: false, reason: 'limit' }); assert(!f.calls.some(row => row.phase === 'commit'));
});
test('current remote media is bound by actual bytes/hash and original arrays stay untouched', async () => {
  const f = await fixture(), id = 'media-33333333-3333-4333-8333-333333333333', binary = new Uint8Array([1, 2, 3]);
  f.value.importArchives = [{ id, dataUrl: `flowme-media:${id}` }];
  const result = await f.run({ resolveMedia: async requested => { assert.equal(requested, id); return { mime: 'image/webp', bytes: binary }; } });
  assert.equal(result.ok, true); const commit = f.calls[2]; assert.equal(commit.phase, 'commit');
  if (commit.phase === 'commit') assert.deepEqual(commit.certificate.media, [{ id, bytes: 3, sha256: await sha256(binary) }]);
  assert.deepEqual(binary, new Uint8Array([1, 2, 3]));
});
test('missing media and failed seal stop before commit with no private exception text', async () => {
  const f = await fixture(), id = 'media-33333333-3333-4333-8333-333333333333';
  f.value.importArchives = [{ id, dataUrl: `flowme-media:${id}` }];
  const missing = await f.run({ resolveMedia: async () => { throw Error('PRIVATE_MEDIA_TOKEN'); } });
  assert.deepEqual(missing, { ok: false, reason: 'unavailable' }); assert(!f.calls.some(row => row.phase === 'commit'));
  f.value.importArchives = []; f.calls.length = 0;
  const invalid = await f.run({ sealDigest: async () => 'PRIVATE_PROOF' });
  assert.deepEqual(invalid, { ok: false, reason: 'unavailable' }); assert(!f.calls.some(row => row.phase === 'commit'));
});
test('input or transport callback mutation cannot change the verified command/owner', async () => {
  const f = await fixture(), original = detached(f.input.command);
  const result = await f.run({ rpc: async request => {
    const response = await f.rpc(request);
    if (request.phase === 'budget') { request.command.requestId = 'changed'; f.input.command.requestId = 'changed-input'; f.input.ownerId = 'bad-owner'; }
    return response;
  }, sealDigest: async id => { assert.equal(id, owner); return 'a'.repeat(64); } });
  assert.equal(result.ok, true); assert.equal(f.calls.length, 3);
  assert.deepEqual(f.calls[1].command, original);
  assert.deepEqual(f.calls[2].command, original);
});
test('unknown or malformed post-commit response remains ambiguous for existing recovery', async () => {
  for (const response of [{ ok: true, kind: 'receipt', value: { requestId: 'other', revision: 1, changed: true, kind: 'change-private' } }, { ok: true }, null]) {
    const f = await fixture(); const result = await f.run({ rpc: async request => request.phase === 'commit' ? response : f.rpc(request) });
    assert.deepEqual(result, { ok: false, reason: 'unavailable' });
  }
  const f = await fixture(); assert.deepEqual(await f.run({ rpc: async request => {
    if (request.phase === 'commit') throw Error('network-after-write'); return f.rpc(request);
  } }), { ok: false, reason: 'unavailable' });
});
test('wrong owner, creator command or invalid date is rejected before any RPC', async () => {
  for (const patch of [{ ownerId: 'bad' }, { createdAt: 'yesterday' }, { command: { schema: 'flowme-alpha-creator-command/1' } }]) {
    const f = await fixture(); const input = { ...f.input, ...patch } as Parameters<typeof executeCapacityM3>[0];
    assert.deepEqual(await executeCapacityM3(input, { rpc: f.rpc, resolveMedia: f.noMedia, sealDigest: f.sealDigest }), { ok: false, reason: 'invalid' });
    assert.equal(f.calls.length, 0);
  }
});
test('candidate decoder preserves 30 MB logical snapshot through its larger escaped envelope', async () => {
  const raw = JSON.stringify({ text: '\\'.repeat(7_500_000) });
  const envelope = { ok: true, kind: 'snapshot', rawReadResponse: raw }, wire = JSON.stringify(envelope);
  assert(Buffer.byteLength(wire) > 30_000_000); assert(Buffer.byteLength(wire) <= CAPACITY_SNAPSHOT_WIRE_BYTES);
  assert.deepEqual(await readCapacityM3Response(new Response(wire)), envelope);
});
test('candidate decoder enforces actual streamed wire bytes and rejects bad UTF8', async () => {
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new Uint8Array(CAPACITY_SNAPSHOT_WIRE_BYTES + 1)); }, cancel() { cancelled = true; } });
  await assert.rejects(readCapacityM3Response(new Response(stream, { headers: { 'Content-Length': '1' } })), /capacity-response-limit/);
  assert.equal(cancelled, true);
  await assert.rejects(readCapacityM3Response(new Response(new Uint8Array([0xff]))));
});
