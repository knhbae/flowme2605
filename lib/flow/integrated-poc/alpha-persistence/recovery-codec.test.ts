import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeRecoveryStorage, encodeRecoveryStorage, RECOVERY_CODEC_SCHEMA } from './recovery-codec';
import { canonicalJson } from './json';
import { createAlphaLocalRecovery, alphaRecoveryKey } from './local-recovery';
import { createAlphaTabRecovery, ALPHA_SYNC_PREFIX } from '../alpha-sync/recovery';
import { isAccountForOwner } from '../alpha-auth/account-access';
import { PROGRAM_SCHEMA } from '../contract';
import { createProgramPrivateSpace } from '../program-data';
import { ALPHA_SCHEMA, type AlphaAccount, type AlphaRecovery } from './contract';
import { buildCatalogContent } from '../catalog-content-source';
import { importCatalogContentWorkspace } from '../catalog-content-import';
import { creatorWorkingFromRecord } from '../creator-workspace';
import { buildCatalogLibrarySnapshot } from '../catalog-library-source';
import { ALPHA_CREATOR_COMMAND_SCHEMA } from '../alpha-creator/contract';
import { createAlphaCreatorRecovery } from '../alpha-creator-recovery';

const OWNER = '11111111-1111-4111-8111-111111111111', NOW = '2026-09-24T03:00:00.000Z';
const packet = (nodes: unknown[], root = nodes.length - 1) => JSON.stringify({ schema: RECOVERY_CODEC_SCHEMA, nodes, root });
test('codec preserves every JSON value and repeated strings without shared mutable references', () => {
  const item = { text: '오픽 원문\r\n'.repeat(100), escaped: '\"\\\t', nil: null, b: false, n: 1.5, empty: [] };
  const source = { first: item, second: structuredClone(item), array: [item, item] };
  const packed = encodeRecoveryStorage(source); assert(packed.length < canonicalJson(source).length);
  const result = decodeRecoveryStorage(packed) as typeof source; assert.deepEqual(result, source);
  result.first.text = 'changed'; assert.equal(result.second.text, item.text); assert.equal(result.array[0].text, item.text);
  assert.deepEqual(decodeRecoveryStorage(canonicalJson(source)), source);
  assert.equal(encodeRecoveryStorage({ short: true }), canonicalJson({ short: true }));
});

test('malformed tags, references, cycles, duplicate/prototype keys and wrapper variants fail closed', () => {
  const invalid = [packet([['x', 'oops']]), packet([['v', {}]]), packet([['a', [0]]]),
    packet([['a', [-1]]]), packet([['a', [0.5]]]), packet([['a', ['0']]]),
    packet([['v', 1], ['o', [['x', 0], ['x', 0]]]]),
    ...['__proto__', 'prototype', 'constructor'].map(k => packet([['v', 1], ['o', [[k, 0]]]])),
    packet([['v', 1]], 5), packet([]), packet([['v', 1, 2]]),
    JSON.stringify({ schema: RECOVERY_CODEC_SCHEMA, nodes: [['v', 1]], root: 0, extra: true })];
  for (const raw of invalid) assert.throws(() => decodeRecoveryStorage(raw));
});

test('expansion budget and depth are checked before allocating an exponential graph', () => {
  const bomb: unknown[] = [['v', 'x'.repeat(1_000_000)]];
  for (let index = 1; index < 7; index++) bomb.push(['a', [index - 1, index - 1]]);
  assert.throws(() => decodeRecoveryStorage(packet(bomb)));
  const deep: unknown[] = [['v', 1]];
  for (let index = 1; index <= 121; index++) deep.push(['a', [index - 1]]);
  assert.throws(() => decodeRecoveryStorage(packet(deep)));
  const boundary = deep.slice(0, 121); assert.doesNotThrow(() => decodeRecoveryStorage(packet(boundary)));
});

function fixture(): AlphaRecovery {
  const slug = 'curated-opic-single-mock-review', projected = buildCatalogContent(slug); assert(projected.ok);
  const imported = importCatalogContentWorkspace(undefined, { draftId: 'opic-fixture', sourceSlug: slug, sourceVersionId: projected.content.versionId, now: NOW }, buildCatalogLibrarySnapshot(NOW)); assert(imported.ok);
  imported.workspace.working = creatorWorkingFromRecord(imported.workspace, 'opic-fixture');
  const account: AlphaAccount = { schema: ALPHA_SCHEMA, ownerId: OWNER, revision: 2,
    source: { schema: PROGRAM_SCHEMA, actorId: OWNER, revision: 0 }, space: createProgramPrivateSpace(), legacyReceipts: [], legacyUndo: [] };
  account.space.creatorWorkspace = imported.workspace; account.space.catalogLibrary = buildCatalogLibrarySnapshot(NOW);
  const command = { schema: ALPHA_CREATOR_COMMAND_SCHEMA, kind: 'creator' as const, requestId: 'pending-working', expectedRevision: 2,
    intent: { type: 'working' as const, working: imported.workspace.working, now: NOW } };
  return { schema: 'flowme-alpha-recovery/1', ownerId: OWNER, confirmed: account, pending: command, draft: structuredClone(command) };
}
function storage() {
  const values = new Map<string, string>(), writes: string[] = []; let fail = false, drop = false;
  return { values, writes, setFail(value: boolean) { fail = value; }, setDrop(value: boolean) { drop = value; },
    getItem: (key: string) => values.get(key) ?? null,
    setItem(key: string, value: string) { if (fail) throw Error('quota'); writes.push(key); if (!drop) values.set(key, value); },
    removeItem(key: string) { writes.push(key); values.delete(key); } };
}

test('14-row full catalog with confirmed/pending/draft and creator auxiliary fits a conservative 5 MiB UTF16 budget', () => {
  const recovery = fixture(), target = storage(), port = createAlphaTabRecovery(target, 'tab-fixture');
  assert(port.load(OWNER).ok); assert(port.save(recovery));
  const creator = createAlphaCreatorRecovery(target, OWNER, 'tab-fixture'); assert(creator.read().ok);
  const working = recovery.confirmed!.space.creatorWorkspace!.working!;
  assert(creator.save([{ working, baseRevision: 2, auxiliaries: [{ title: working.title, raw: '선택한 항목: 원본 항목\n제목: 내 연습\n확인 중인 변경: rename' }] }]).ok);
  const compact = [...target.values.values()].find(raw => raw.includes(RECOVERY_CODEC_SCHEMA))!; assert(compact);
  const chars = [...target.values].reduce((sum, [key, value]) => sum + key.length + value.length, 0);
  assert(chars * 2 < 5 * 1024 * 1024, `UTF16 bytes ${chars * 2}`);
  assert.deepEqual(createAlphaTabRecovery(target, 'tab-fixture').load(OWNER), { ok: true, value: recovery });
  assert.deepEqual(createAlphaCreatorRecovery(target, OWNER, 'tab-fixture').read(), creator.read());
  assert(target.writes.every(key => key.startsWith('flow:poc:personal-workspace:v1:')));
  console.log(JSON.stringify({ recoveryPlainChars: canonicalJson(recovery).length, recoveryCompactChars: compact.length, withCreatorUtf16Bytes: chars * 2 }));
});

test('legacy plain M3 recovery upgrades only on save; M1 remains plain; CAS compares physical bytes', () => {
  const value = fixture(), target = storage(), key = `${ALPHA_SYNC_PREFIX}tab-fixture:${encodeURIComponent(alphaRecoveryKey(OWNER))}`;
  const raw = canonicalJson(value); target.values.set(key, raw);
  const port = createAlphaTabRecovery(target, 'tab-fixture'); assert.deepEqual(port.load(OWNER), { ok: true, value });
  assert.equal(target.values.get(key), raw); assert.equal(target.writes.length, 0);
  assert(port.save(value)); assert.notEqual(target.values.get(key), raw);
  const previous = target.values.get(key)!; target.values.set(key, raw);
  assert.equal(port.save(value), false); assert.equal(target.values.get(key), raw);
  target.values.set(key, previous);
  const m1 = createAlphaLocalRecovery(target, isAccountForOwner); assert(m1.load(OWNER).ok); assert(m1.save(value));
  assert.equal(target.values.get(alphaRecoveryKey(OWNER)), raw);
});

test('quota failure, wrong readback, corrupt codec and foreign owner never silently repair or overwrite', () => {
  const value = fixture();
  for (const kind of ['quota', 'drop'] as const) {
    const target = storage(), port = createAlphaTabRecovery(target, 'tab-fixture'); assert(port.load(OWNER).ok);
    if (kind === 'quota') target.setFail(true); else target.setDrop(true);
    assert.equal(port.save(value), false); target.setFail(false); target.setDrop(false);
    assert.equal(port.save(value), false); assert.equal(target.values.size, 0);
  }
  for (const raw of [packet([['a', [0]]]), encodeRecoveryStorage({ ...value, ownerId: 'foreign' })]) {
    const target = storage(), key = `${ALPHA_SYNC_PREFIX}tab-fixture:${encodeURIComponent(alphaRecoveryKey(OWNER))}`;
    target.values.set(key, raw); const port = createAlphaTabRecovery(target, 'tab-fixture');
    assert.equal(port.load(OWNER).ok, false); assert.equal(port.save(value), false);
    assert.equal(target.values.get(key), raw); assert.equal(target.writes.length, 0);
  }
});

test('packed storage never bypasses account, embedded source, pending or draft validation', () => {
  const original = fixture(), key = `${ALPHA_SYNC_PREFIX}tab-fixture:${encodeURIComponent(alphaRecoveryKey(OWNER))}`;
  for (const mutate of [
    (v: any) => v.confirmed.ownerId = 'foreign',
    (v: any) => v.confirmed.space.creatorWorkspace.working.nativeDocument.source.contentJson = '{}',
    (v: any) => v.pending.intent.working.nativeDocument.source.documentJson = '{}',
    (v: any) => v.draft.intent.extra = true,
  ]) {
    const changed = structuredClone(original); mutate(changed);
    const target = storage(), raw = encodeRecoveryStorage(changed); target.values.set(key, raw);
    const port = createAlphaTabRecovery(target, 'tab-fixture'); assert.equal(port.load(OWNER).ok, false);
    assert.equal(port.save(original), false); assert.equal(target.values.get(key), raw); assert.equal(target.writes.length, 0);
  }
});
