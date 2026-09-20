import test from 'node:test';
import assert from 'node:assert/strict';
import { PROGRAM_SCHEMA, PROGRAM_STATE_KEY, type ProgramEnvelope, type ProgramPrivateSpace } from './contract';
import { commitProgramEnvelope, loadProgramStore, makeProgramEnvelope, planProgramUndo, type ProgramStorage } from './program-store';
import { PROGRAM_UNDO_CODEC } from './program-undo-codec';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
function space(title: string): ProgramPrivateSpace {
  return {
    text: { version: 11, documents: [{ id: `doc-${title}`, title, folder: '', folderId: '', lines: [{ id: `line-${title}`, text: '메모' }] }],
      folders: [], flows: [], bindings: [], taskScopes: {}, itemScopes: {}, progressRecords: [] },
    archivedDocumentIds: [], copies: [], savedBindings: [], draftRevisions: [], participationDrafts: [], publicationDrafts: [], publications: [], timelineOrders: {}, legacySnapshot: null, legacyQuickItemLines: {}, legacyTimelinePolicies: {},
    position: { documentId: null, lineId: null, start: 0, end: 0, scrollTop: 0 },
  };
}
function fixture(): ProgramEnvelope {
  return { schema: PROGRAM_SCHEMA, revision: 0, undo: {}, data: {
    actors: [{ id: 'a', name: '가', simulated: true }, { id: 'b', name: '나', simulated: true }], activeActorId: 'a',
    spaces: { a: space('A'), b: space('B') },
    public: { flows: [], versions: [], posts: [], replies: [], reactions: [], proposals: [] }, receipts: [],
  } };
}
// Deliberately independent from production's richer domain validator.
function validate(value: unknown): boolean {
  const envelope = value as ProgramEnvelope;
  return Boolean(envelope?.data?.actors?.length === 2 && envelope.data.spaces.a && envelope.data.spaces.b
    && Array.isArray(envelope.data.public.posts) && envelope.undo && typeof envelope.undo === 'object');
}
function change(before: ProgramEnvelope, title = 'changed', actorId = 'a', groupId?: string): ProgramEnvelope {
  const data = clone(before.data);
  data.spaces[actorId].text.documents[0].title = title;
  return makeProgramEnvelope(before, data, { actorId, historyLabel: '문서 수정', ...(groupId ? { groupId } : {}) });
}
class MemoryPort implements ProgramStorage {
  values = new Map<string, string>();
  reads = 0;
  writes: { key: string; value: string | null }[] = [];
  onRead?: (number: number) => void;
  beforeSet?: (value: string) => void;
  afterSet?: (value: string) => void;
  beforeRemove?: () => void;
  afterRemove?: () => void;
  constructor(raw: string | null = null) {
    if (raw !== null) this.values.set(PROGRAM_STATE_KEY, raw);
    this.values.set('flow:protected', 'unchanged');
    this.values.set('flow:poc:personal-workspace:v1:state', 'older-poc');
  }
  getItem(key: string): string | null { assert.equal(key, PROGRAM_STATE_KEY); this.onRead?.(++this.reads); return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void {
    assert.equal(key, PROGRAM_STATE_KEY); this.writes.push({ key, value }); this.beforeSet?.(value);
    this.values.set(key, value); this.afterSet?.(value);
  }
  removeItem(key: string): void {
    assert.equal(key, PROGRAM_STATE_KEY); this.writes.push({ key, value: null }); this.beforeRemove?.();
    this.values.delete(key); this.afterRemove?.();
  }
}
const save = (storage: ProgramStorage, expectedRaw: string | null, next: ProgramEnvelope) => commitProgramEnvelope(storage, { expectedRaw, next, validate });

test('loads empty and ready snapshots; malformed/schema/domain/oversize values stay corrupt', () => {
  assert.deepEqual(loadProgramStore(new MemoryPort(), validate), { kind: 'empty', raw: null });
  const raw = JSON.stringify(fixture());
  assert.deepEqual(loadProgramStore(new MemoryPort(raw), validate), { kind: 'ready', raw, envelope: fixture() });
  for (const invalid of ['{', 'null', '[]', JSON.stringify({ ...fixture(), schema: 'wrong' }), JSON.stringify({ ...fixture(), extra: true }),
    JSON.stringify({ ...fixture(), revision: -1 }), JSON.stringify({ ...fixture(), data: null }), ' '.repeat(30_000_001)]) {
    const port = new MemoryPort(invalid);
    assert.deepEqual(loadProgramStore(port, validate), { kind: 'corrupt', raw: invalid });
    assert.equal(port.writes.length, 0);
  }
});

test('read exception is unavailable and latches writes even after subsequent reads succeed', () => {
  const port = new MemoryPort(); port.onRead = () => { throw new Error('denied'); };
  assert.deepEqual(loadProgramStore(port, validate), { kind: 'unavailable', raw: null });
  port.onRead = undefined;
  assert.equal(loadProgramStore(port, validate).kind, 'empty');
  assert.deepEqual(save(port, null, fixture()), { ok: false, reason: 'recovery-required' });
  assert.equal(port.writes.length, 0);
});

test('successful initialization and update persist one envelope and never touch neighboring keys', () => {
  const port = new MemoryPort();
  const initial = save(port, null, fixture()); assert.equal(initial.ok, true); if (!initial.ok) return;
  const next = change(initial.envelope);
  const result = save(port, initial.raw, next); assert.equal(result.ok, true); if (!result.ok) return;
  assert.equal(result.changed, true); assert.deepEqual(result.envelope, next);
  assert.equal(port.writes.length, 2); assert.equal(port.values.size, 3);
  assert.equal(port.values.get('flow:protected'), 'unchanged');
  assert.equal(port.values.get('flow:poc:personal-workspace:v1:state'), 'older-poc');
});

test('same data is same envelope; identical persisted envelope is zero-write even with differently ordered JSON keys', () => {
  const before = fixture(); assert.equal(makeProgramEnvelope(before, clone(before.data), { actorId: 'a', historyLabel: 'no-op' }), before);
  const raw = JSON.stringify(before, null, 2); const port = new MemoryPort(raw);
  const result = save(port, raw, clone(before)); assert.equal(result.ok, true); if (!result.ok) return;
  assert.equal(result.changed, false); assert.equal(result.raw, raw); assert.equal(port.writes.length, 0);
});

test('stale exact raw CAS fails before any write, including no-op', () => {
  const before = fixture(); const raw = JSON.stringify(before); const actual = JSON.stringify(before, null, 2); const port = new MemoryPort(actual);
  assert.deepEqual(save(port, raw, change(before)), { ok: false, reason: 'conflict', raw: actual });
  assert.deepEqual(save(port, raw, before), { ok: false, reason: 'conflict', raw: actual });
  assert.equal(port.writes.length, 0);
});

test('rejects invalid revisions, invalid prior bytes, validator failures and schema before touching storage', () => {
  const before = fixture(); const raw = JSON.stringify(before);
  for (const next of [{ ...change(before), revision: 0 }, { ...change(before), revision: 2 }, { ...change(before), revision: Infinity },
    { ...change(before), schema: 'wrong' }, { ...change(before), data: null }]) {
    const port = new MemoryPort(raw); assert.deepEqual(save(port, raw, next as ProgramEnvelope), { ok: false, reason: 'invalid' });
    assert.equal(port.writes.length, 0); assert.equal(port.reads, 0);
  }
  assert.deepEqual(save(new MemoryPort('{'), '{', fixture()), { ok: false, reason: 'invalid' });
  for (const predicate of [() => false, () => { throw new Error('bad validator'); }]) {
    assert.deepEqual(commitProgramEnvelope(new MemoryPort(), { expectedRaw: null, next: before, validate: predicate }), { ok: false, reason: 'invalid' });
  }
});

test('rejects silent JSON loss, cycles and accessors without evaluating them', () => {
  for (const forbidden of [undefined, NaN, () => {}, Symbol('x')]) {
    const next = fixture(); (next as unknown as Record<string, unknown>).extra = forbidden;
    assert.deepEqual(save(new MemoryPort(), null, next), { ok: false, reason: 'invalid' });
  }
  const cycle = fixture(); (cycle as unknown as Record<string, unknown>).cycle = cycle;
  assert.deepEqual(save(new MemoryPort(), null, cycle), { ok: false, reason: 'invalid' });
  const next = fixture(); let invoked = 0;
  Object.defineProperty(next.data, 'activeActorId', { enumerable: true, get() { invoked++; return 'a'; } });
  assert.deepEqual(save(new MemoryPort(), null, next), { ok: false, reason: 'invalid' }); assert.equal(invoked, 0);
});

test('validator mutation is rejected rather than persisted as a migration', () => {
  const port = new MemoryPort();
  const result = commitProgramEnvelope(port, { expectedRaw: null, next: fixture(), validate: value => { (value as ProgramEnvelope).revision++; return true; } });
  assert.deepEqual(result, { ok: false, reason: 'invalid' }); assert.equal(port.writes.length, 0);
});

test('private history is detached, per actor, capped at 80, and groups contiguous editing', () => {
  const before = fixture(); const nextData = clone(before.data); nextData.spaces.a.text.documents[0].title = 'one';
  const one = makeProgramEnvelope(before, nextData, { actorId: 'a', historyLabel: '편집', groupId: 'typing-1' });
  nextData.spaces.a.text.documents[0].title = 'mutated caller'; before.data.spaces.a.text.documents[0].title = 'mutated before';
  assert.equal(one.data.spaces.a.text.documents[0].title, 'one'); assert.equal(one.undo.a[0].workspace.text.documents[0].title, 'A');
  const two = change(one, 'two', 'a', 'typing-1'); assert.equal(two.undo.a.length, 1);
  const three = change(two, 'three', 'a', 'typing-2'); assert.equal(three.undo.a.length, 2); assert.equal(three.undo.b, undefined);
  let many = three; for (let i = 0; i < 90; i++) many = change(many, `edit-${i}`);
  assert.equal(many.undo.a.length, 80); assert.equal(many.undo.a[0].workspace.text.documents[0].title, 'edit-9');
});

test('public-only updates do not create private undo and actor undo preserves public and other actor work', () => {
  const first = change(fixture(), 'A private'); const second = change(first, 'B private', 'b');
  const data = clone(second.data); data.receipts.push({ id: 'published', actorId: 'a', fingerprint: 'f', resultId: 'flow', kind: 'publish' });
  data.public.reactions.push({ actorId: 'a', targetKind: 'post', targetId: 'p' });
  const published = makeProgramEnvelope(second, data, { actorId: 'a', historyLabel: '게시' });
  assert.equal(published.undo.a.length, 1);
  const undone = planProgramUndo(published, 'a');
  assert.equal(undone.revision, published.revision + 1); assert.equal(undone.data.spaces.a.text.documents[0].title, 'A');
  assert.deepEqual(undone.data.spaces.b, published.data.spaces.b); assert.deepEqual(undone.data.public, published.data.public);
  assert.deepEqual(undone.data.receipts, published.data.receipts); assert.deepEqual(undone.undo.b, published.undo.b);
  assert.equal(planProgramUndo(undone, 'a'), undone); assert.equal(planProgramUndo(undone, 'missing'), undone);
});

test('unlabelled changes do not push undo, missing actors and revision overflow fail without mutation', () => {
  const before = fixture(); const data = clone(before.data); data.spaces.a.position.start = 1;
  assert.deepEqual(makeProgramEnvelope(before, data, { actorId: 'a' }).undo, {});
  assert.throws(() => makeProgramEnvelope(before, data, { actorId: 'missing' }), /missing-actor/);
  assert.throws(() => makeProgramEnvelope({ ...before, revision: Number.MAX_SAFE_INTEGER }, data, { actorId: 'a' }), /invalid-envelope/);
  const history = change(before); assert.throws(() => planProgramUndo({ ...history, revision: Number.MAX_SAFE_INTEGER }, 'a'), /revision-overflow/);
});

test('throw before set preserves exact prior bytes and permits a known-safe retry', () => {
  const before = fixture(); const raw = JSON.stringify(before); const port = new MemoryPort(raw);
  port.beforeSet = () => { throw new Error('quota'); };
  assert.deepEqual(save(port, raw, change(before)), { ok: false, reason: 'storage-unavailable', raw });
  assert.equal(port.values.get(PROGRAM_STATE_KEY), raw); assert.equal(port.writes.length, 1);
  port.beforeSet = undefined; assert.equal(save(port, raw, change(before)).ok, true);
});

test('throw after own set rolls back and verifies exact preexisting bytes', () => {
  const before = fixture(); const raw = JSON.stringify(before, null, 2); const port = new MemoryPort(raw);
  port.afterSet = () => { throw new Error('after-set'); };
  assert.deepEqual(save(port, raw, change(before)), { ok: false, reason: 'storage-unavailable', raw });
  assert.equal(port.values.get(PROGRAM_STATE_KEY), raw); assert.equal(port.writes.length, 2);
});

test('throw after initial set removes only owned key and accepts a throw after successful remove', () => {
  const port = new MemoryPort(); port.afterSet = () => { throw new Error('after-set'); };
  port.afterRemove = () => { throw new Error('after-remove'); };
  assert.deepEqual(save(port, null, fixture()), { ok: false, reason: 'storage-unavailable', raw: null });
  assert.equal(port.values.has(PROGRAM_STATE_KEY), false); assert.equal(port.writes.length, 2);
  assert.equal(port.values.size, 2);
});

test('foreign readback is never rolled back and latches subsequent writes', () => {
  const before = fixture(); const raw = JSON.stringify(before); const port = new MemoryPort(raw); const foreign = JSON.stringify(change(before, 'foreign'));
  port.afterSet = () => { port.values.set(PROGRAM_STATE_KEY, foreign); };
  assert.deepEqual(save(port, raw, change(before)), { ok: false, reason: 'readback-failed', raw: foreign });
  assert.equal(port.values.get(PROGRAM_STATE_KEY), foreign); assert.equal(port.writes.length, 1);
  port.afterSet = undefined;
  assert.deepEqual(save(port, foreign, change(JSON.parse(foreign))), { ok: false, reason: 'recovery-required' });
  assert.equal(port.writes.length, 1);
});

test('throw after foreign write never authorizes rollback', () => {
  const raw = JSON.stringify(fixture()); const port = new MemoryPort(raw);
  port.afterSet = () => { port.values.set(PROGRAM_STATE_KEY, 'foreign'); throw new Error('after-foreign'); };
  assert.deepEqual(save(port, raw, change(fixture())), { ok: false, reason: 'readback-failed', raw: 'foreign' });
  assert.equal(port.values.get(PROGRAM_STATE_KEY), 'foreign'); assert.equal(port.writes.length, 1);
});

test('foreign value appearing immediately before rollback is not overwritten', () => {
  const raw = JSON.stringify(fixture()); const port = new MemoryPort(raw);
  port.afterSet = () => { throw new Error('after-set'); };
  port.onRead = n => { if (n === 3) port.values.set(PROGRAM_STATE_KEY, 'foreign-late'); };
  assert.deepEqual(save(port, raw, change(fixture())), { ok: false, reason: 'recovery-required' });
  assert.equal(port.values.get(PROGRAM_STATE_KEY), 'foreign-late'); assert.equal(port.writes.length, 1);
});

test('unreadable post-write state and failed rollback lock further writes', () => {
  for (const mode of ['readback', 'rollback'] as const) {
    const raw = JSON.stringify(fixture()); const port = new MemoryPort(raw);
    if (mode === 'readback') port.onRead = n => { if (n === 2) throw new Error('read'); };
    else { port.afterSet = () => { throw new Error('after'); }; port.beforeSet = () => { if (port.writes.length === 2) throw new Error('rollback'); }; }
    assert.deepEqual(save(port, raw, change(fixture())), { ok: false, reason: 'recovery-required' });
    const count = port.writes.length; port.onRead = undefined; port.afterSet = undefined; port.beforeSet = undefined;
    assert.deepEqual(save(port, port.values.get(PROGRAM_STATE_KEY)!, change(fixture())), { ok: false, reason: 'recovery-required' });
    assert.equal(port.writes.length, count);
  }
});

test('readback equal to old state reports failure without unnecessary rollback', () => {
  const raw = JSON.stringify(fixture()); const port = new MemoryPort(raw);
  port.afterSet = () => { port.values.set(PROGRAM_STATE_KEY, raw); };
  assert.deepEqual(save(port, raw, change(fixture())), { ok: false, reason: 'readback-failed', raw });
  assert.equal(port.writes.length, 1);
});

function richHistory(): ProgramEnvelope {
  const envelope = fixture();
  envelope.data.spaces.a.text.documents[0].lines[0].text = '원문과 메모 \r\n'.repeat(1500);
  envelope.revision = 80;
  envelope.undo.a = Array.from({ length: 80 }, (_, index) => {
    const workspace = clone(envelope.data.spaces.a); workspace.text.documents[0].title = `history-${index}`;
    return { label: `edit-${index}`, groupId: null, workspace };
  });
  return envelope;
}

test('US01 legacy rich history loads and no-ops without rewriting; next real save shares all 80 snapshots', () => {
  const before = richHistory(), raw = JSON.stringify(before, null, 1), port = new MemoryPort(raw);
  const loaded = loadProgramStore(port, validate); assert.equal(loaded.kind, 'ready'); assert.equal(port.writes.length, 0);
  const noop = save(port, raw, clone(before)); assert(noop.ok); assert.equal(noop.changed, false); assert.equal(noop.raw, raw); assert.equal(port.writes.length, 0);
  const next = change(before), result = save(port, raw, next); assert(result.ok);
  assert.equal(JSON.parse(result.raw).undo.codec, PROGRAM_UNDO_CODEC); assert.deepEqual(JSON.parse(result.raw).data, next.data);
  assert(result.raw.length < JSON.stringify(next).length / 5); assert.deepEqual(result.envelope, next); assert.equal(result.envelope.undo.a.length, 80);
  const reload = loadProgramStore(port, validate); assert.equal(reload.kind, 'ready'); if (reload.kind !== 'ready') return;
  assert.deepEqual(reload.envelope, next);
  let undone = reload.envelope;
  for (const entry of [...next.undo.a].reverse()) { undone = planProgramUndo(undone, 'a'); assert.deepEqual(undone.data.spaces.a, entry.workspace); }
  assert.equal(undone.undo.a.length, 0); assert.deepEqual(undone.data.public, before.data.public); assert.deepEqual(undone.data.spaces.b, before.data.spaces.b);
});

test('US02 shared saves retain quota retry and exact legacy rollback bytes without touching protected keys', () => {
  for (const after of [false, true]) {
    const before = richHistory(), raw = JSON.stringify(before, null, 1), port = new MemoryPort(raw), next = change(before);
    const fail = () => { throw Error('quota'); }; if (after) port.afterSet = fail; else port.beforeSet = fail;
    const failed = save(port, raw, next); assert(!failed.ok); assert.equal(failed.reason, 'storage-unavailable'); assert.equal(port.values.get(PROGRAM_STATE_KEY), raw);
    port.afterSet = undefined; port.beforeSet = undefined;
    const retry = save(port, raw, next); assert(retry.ok); assert.deepEqual(retry.envelope, next);
    assert.equal(port.values.get('flow:protected'), 'unchanged'); assert.equal(port.values.get('flow:poc:personal-workspace:v1:state'), 'older-poc');
  }
});

test('US03 malformed shared history and mutating validator are rejected with zero writes', () => {
  const before = richHistory(), initial = save(new MemoryPort(), null, { ...before, revision: 0 }); assert(initial.ok);
  const wire = JSON.parse(initial.raw); wire.undo.codec = 'future/2';
  const port = new MemoryPort(JSON.stringify(wire)); assert.equal(loadProgramStore(port, validate).kind, 'corrupt'); assert.equal(port.writes.length, 0);
  const current = new MemoryPort(initial.raw);
  assert.deepEqual(commitProgramEnvelope(current, { expectedRaw: initial.raw, next: change(initial.envelope), validate: value => {
    if (!validate(value)) return false; (value as ProgramEnvelope).undo.a[0].workspace.text.documents[0].title = 'migration'; return true;
  } }), { ok: false, reason: 'invalid' }); assert.equal(current.writes.length, 0);
});

test('US04 canonical equality includes every retained history value, not only current data', () => {
  const before = change(fixture(), 'current'), raw = JSON.stringify(before, null, 2), port = new MemoryPort(raw);
  const next = clone(before); next.revision++; next.undo.a[0].workspace.text.documents[0].title = 'different history';
  const result = save(port, raw, next); assert(result.ok && result.changed);
  assert.deepEqual(result.envelope, next); assert.deepEqual(result.envelope.data, before.data);
  assert.equal(port.writes.length, 1); assert.equal(port.values.get('flow:protected'), 'unchanged');
  const invalid = clone(next); invalid.revision = before.revision;
  const originalPort = new MemoryPort(raw); assert.deepEqual(save(originalPort, raw, invalid), { ok: false, reason: 'invalid' });
  assert.equal(originalPort.writes.length, 0);
});

test('US05 current and prior payload validators both run; mutation in the second predicate remains invalid', () => {
  const before = change(fixture(), 'before'), raw = JSON.stringify(before), port = new MemoryPort(raw); let calls = 0;
  const result = commitProgramEnvelope(port, { expectedRaw: raw, next: change(before), validate: value => {
    calls++; if (!validate(value)) return false;
    if (calls === 2) (value as ProgramEnvelope).undo.a[0].workspace.text.documents[0].title = 'invalid predicate mutation';
    return true;
  } });
  assert.equal(calls, 2); assert.deepEqual(result, { ok: false, reason: 'invalid' });
  assert.equal(port.reads, 0); assert.equal(port.writes.length, 0); assert.equal(port.values.get(PROGRAM_STATE_KEY), raw);
});
