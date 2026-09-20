import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test, { type TestContext } from 'node:test';
import { runInNewContext } from 'node:vm';
import {
  createPersonalWorkspacePocEntryAuthoringTransition as create,
  type PersonalWorkspacePocEntryAuthoringPrepare as Prepare,
  type PersonalWorkspacePocEntryAuthoringRead as ReadPacket,
  type PersonalWorkspacePocEntryAuthoringResult as Result,
  type PersonalWorkspacePocEntryAuthoringTicket as Ticket,
} from './personal-workspace-poc-entry-authoring-transition';
import {
  PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY as KEY,
  loadPersonalWorkspacePocAuthoringDraft,
} from './personal-workspace-poc-storage';

const A = JSON.stringify({ version: 1, rawText: '  기존 A\r\n끝  ', templateId: 'moving-dday-v1',
  creatorBinding: { owner: 'creator', draftId: 'creator-draft-a' } });
const RAW_B = '\n  새 B\r\n중간 🌿\n끝  ';
const B = JSON.stringify({ version: 1, rawText: RAW_B });
const X = JSON.stringify({ version: 1, rawText: '외부 X\r\n보존' });
const protectedBytes = Object.freeze({
  'flow:operating:entry-transition-sentinel': '  operating fixture\r\n☃  ',
  'flow:poc:personal-workspace:v1:state': 'state untouched fixture',
  'flow:poc:personal-workspace:v1:source-candidates': 'source untouched fixture',
  'flow:poc:personal-workspace:v1:creator-drafts': 'library untouched fixture',
});
type Api = { method: 'getItem' | 'setItem' | 'removeItem' | 'clear'; key: string; value?: string | null };
const sha = (value: string | Buffer) => createHash('sha256').update(value).digest('hex').toUpperCase();
const sourcePaths = [
  'personal-workspace-poc-entry-authoring-transition.ts',
  'personal-workspace-poc-entry-authoring-transition.test.ts',
  'personal-workspace-poc-storage.ts',
];
const hashes = () => Object.fromEntries(sourcePaths.map(path => [path, sha(readFileSync(new URL(path, import.meta.url)))]));

class Fixture {
  values = new Map<string, string>(Object.entries(protectedBytes));
  calls: Api[] = [];
  externalWrites: Api[] = [];
  actualByteChanges = 0;
  externalByteChanges = 0;
  readCalls = 0;
  setCalls = 0;
  getHook?: () => void;
  beforeSet?: (raw: string, call: number) => void;
  afterSet?: (raw: string, call: number) => void;
  beforeRemove?: () => void;
  readHook?: () => unknown;
  scope = 'source=S|workspace=W|model=M|library=L|external-generation=0';
  documentId = 'document-A:0';
  readonly before: string | null;
  readonly adapter;
  constructor(readonly name: string, initial: string | null = A) {
    this.before = initial;
    if (initial !== null) this.values.set(KEY, initial);
    this.adapter = create({ storage: this, read: () => this.read() });
  }
  getItem(key: string): string | null {
    this.calls.push({ method: 'getItem', key });
    this.getHook?.();
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.calls.push({ method: 'setItem', key, value });
    const index = ++this.setCalls;
    this.beforeSet?.(value, index);
    if ((this.values.get(key) ?? null) !== value) this.actualByteChanges += 1;
    this.values.set(key, value);
    this.afterSet?.(value, index);
  }
  removeItem(key: string) {
    this.calls.push({ method: 'removeItem', key });
    this.beforeRemove?.();
    if (this.values.has(key)) this.actualByteChanges += 1;
    this.values.delete(key);
  }
  clear() { this.calls.push({ method: 'clear', key: '*' }); throw Error('forbidden clear'); }
  external(raw: string | null) {
    this.externalWrites.push({ method: raw === null ? 'removeItem' : 'setItem', key: KEY, value: raw });
    if ((this.values.get(KEY) ?? null) !== raw) this.externalByteChanges += 1;
    if (raw === null) this.values.delete(KEY); else this.values.set(KEY, raw);
  }
  packet(): ReadPacket { return { ok: true, scopeBinding: this.scope, documentId: this.documentId, draftRaw: this.values.get(KEY) ?? null }; }
  read(): unknown { this.readCalls += 1; return this.readHook ? this.readHook() : this.packet(); }
  input(rawText = RAW_B): Prepare {
    return { rawText, expectedOwnedDraftRaw: this.before, expectedScopeBinding: this.scope, expectedDocumentId: this.documentId };
  }
  ticket(input = this.input()): Ticket {
    const prepared = this.adapter.prepare(input);
    assert.equal(prepared.status, 'ready', `fixture ${this.name} must prepare`);
    if (prepared.status !== 'ready') assert.fail('unreachable missing ticket');
    assert.equal(prepared.replacesDraft, this.before !== null);
    assert.equal(Object.isFrozen(prepared.ticket), true);
    assert.equal(Object.keys(prepared.ticket).some(key => /raw|draft|scope|document/i.test(key)), false);
    return prepared.ticket;
  }
  mutations() { return this.calls.filter(call => call.method !== 'getItem'); }
}

function suiteEvidence(t: TestContext) {
  const fixtures: Fixture[] = [];
  const sources = hashes();
  t.after(() => {
    for (const f of fixtures) {
      assert.deepEqual(Object.fromEntries(Object.keys(protectedBytes).map(key => [key, f.values.get(key)])), protectedBytes);
      assert.equal(f.calls.filter(call => call.key !== KEY).length, 0, `${f.name}: no other key/clear`);
    }
    assert.deepEqual(hashes(), sources, 'product/test sources frozen during this execution');
    t.diagnostic(JSON.stringify({ kind: 'React transition model; no UI/device', sources,
      fixtures: fixtures.map(f => ({ name: f.name, calls: f.calls, readCalls: f.readCalls,
        productMutationCalls: f.mutations().length, actualProductByteChanges: f.actualByteChanges,
        externalFixtureCalls: f.externalWrites, externalByteChanges: f.externalByteChanges,
        actualDraftHash: sha(f.values.get(KEY) ?? ''), outsideKeyCalls: 0, clearCalls: 0 })) }));
    t.diagnostic(`COUNTS ${JSON.stringify({ fixtures: fixtures.length,
      underlyingGetCalls: fixtures.reduce((n, f) => n + f.calls.filter(c => c.method === 'getItem').length, 0),
      underlyingMutationCalls: fixtures.reduce((n, f) => n + f.mutations().length, 0),
      actualProductByteChanges: fixtures.reduce((n, f) => n + f.actualByteChanges, 0),
      externalFixtureCalls: fixtures.reduce((n, f) => n + f.externalWrites.length, 0),
      externalByteChanges: fixtures.reduce((n, f) => n + f.externalByteChanges, 0),
      currentReadCalls: fixtures.reduce((n, f) => n + f.readCalls, 0),
      outsideKeyCalls: 0, clearCalls: 0 })}`);
  });
  return (name: string, initial: string | null = A) => { const f = new Fixture(name, initial); fixtures.push(f); return f; };
}

function failure(result: Result, status: 'failed' | 'stale' | 'recovery-required') {
  assert.equal(result.status, status);
  if (!['failed', 'stale', 'recovery-required'].includes(result.status)) assert.fail('expected failure');
  assert.equal('draft' in result, false, 'failed results cannot adopt B');
  assert.equal('serialized' in result, false, 'failed results cannot leak source bytes');
}
function success(f: Fixture, result: Result, expectedRaw = RAW_B, changed = true, callStart = 0) {
  assert.equal(result.status, 'success');
  if (result.status !== 'success') assert.fail('expected success');
  assert.deepEqual(result.draft, { version: 1, rawText: expectedRaw });
  assert.equal(Object.isFrozen(result.draft), true);
  assert.equal(result.serialized, JSON.stringify(result.draft));
  assert.equal(result.previous, f.before);
  assert.equal(result.changed, changed);
  assert.equal(result.targetWriteCount, changed ? 1 : 0);
  const attemptCalls = f.calls.slice(callStart);
  assert.equal(result.apiCalls.getItem, attemptCalls.filter(c => c.method === 'getItem').length);
  assert.equal(result.apiCalls.setItem, attemptCalls.filter(c => c.method === 'setItem').length);
  assert.equal(result.apiCalls.removeItem, attemptCalls.filter(c => c.method === 'removeItem').length);
  assert.equal(f.values.get(KEY), result.serialized);
}

test('RP01 genuine tickets, cancel, clone/foreign/replay and reentrant calls have one owner', t => {
  const make = suiteEvidence(t);
  const f = make('normal');
  assert.equal(loadPersonalWorkspacePocAuthoringDraft({ getItem: () => A }).kind, 'ready');
  const ticket = f.ticket();
  assert.equal(f.mutations().length, 0);
  failure(f.adapter.commit({ ...ticket }), 'failed');
  failure(create({ storage: f, read: () => f.packet() }).commit(ticket), 'failed');
  success(f, f.adapter.commit(ticket));
  failure(f.adapter.commit(ticket), 'failed');
  assert.equal(f.mutations().length, 1);
  const canceled = make('cancel'); const canceledTicket = canceled.ticket();
  assert.equal(canceled.adapter.cancel(canceledTicket).status, 'canceled');
  failure(canceled.adapter.commit(canceledTicket), 'failed');
  assert.equal(canceled.mutations().length, 0);
  const reentrant = make('reentrant'); const ownTicket = reentrant.ticket();
  reentrant.afterSet = () => {
    failure(reentrant.adapter.commit(ownTicket), 'failed');
    failure(reentrant.adapter.prepare(reentrant.input()), 'failed');
    failure(reentrant.adapter.cancel(ownTicket), 'failed');
  };
  success(reentrant, reentrant.adapter.commit(ownTicket));
  const duringPrepare = make('read reentrant prepare');
  duringPrepare.readHook = () => {
    failure(duringPrepare.adapter.prepare(duringPrepare.input()), 'failed');
    return duringPrepare.packet();
  };
  duringPrepare.ticket(); assert.equal(duringPrepare.mutations().length, 0);
});

test('RP02 exact text/new document schema, absent draft and same-bytes changedfalse', t => {
  const make = suiteEvidence(t);
  for (const raw of [RAW_B, '이사 준비', 'https://example.test/missing', 'javascript:bad', '  첫줄\n둘째줄  ']) {
    const f = make(`raw ${sha(raw).slice(0, 8)}`, null);
    success(f, f.adapter.commit(f.ticket(f.input(raw))), raw);
    assert.equal(f.mutations().length, 1);
    assert.equal(f.actualByteChanges, 1);
  }
  const same = make('same bytes', B);
  success(same, same.adapter.commit(same.ticket()), RAW_B, false);
  assert.equal(same.mutations().length, 0);
  for (const raw of ['', ' \n\t ']) {
    const empty = make('empty blocked'); failure(empty.adapter.prepare(empty.input(raw)), 'failed');
    assert.equal(empty.readCalls, 0); assert.equal(empty.mutations().length, 0);
  }
});

test('RP03 previously owned bytes cannot rebase onto fresh foreign draft, including binding-only change', t => {
  const make = suiteEvidence(t);
  const xBinding = JSON.stringify({ ...JSON.parse(A), creatorBinding: { owner: 'creator', draftId: 'creator-draft-X' } });
  for (const raw of [X, xBinding, null]) {
    const f = make('foreign before prepare'); const input = f.input(); f.external(raw);
    failure(f.adapter.prepare(input), 'stale'); assert.equal(f.mutations().length, 0);
    assert.equal(f.values.get(KEY) ?? null, raw);
  }
  const later = make('foreign after prepare'); const ticket = later.ticket(); later.external(X);
  failure(later.adapter.commit(ticket), 'stale'); assert.equal(later.mutations().length, 0);
  const corrupt = make('corrupt captured', '{broken');
  failure(corrupt.adapter.prepare(corrupt.input()), 'failed'); assert.equal(corrupt.mutations().length, 0);
});

test('RP04 actual shared save handles read/quota/throw-after/write-readback faults and retry', t => {
  const make = suiteEvidence(t);
  const read = make('pre-read throw'); const ticket = read.ticket();
  read.getHook = () => { throw Error('read denied'); };
  failure(read.adapter.commit(ticket), 'failed'); assert.equal(read.mutations().length, 0);
  read.getHook = undefined;
  const retryStart = read.calls.length;
  success(read, read.adapter.commit(read.ticket()), RAW_B, true, retryStart);
  for (const kind of ['quota', 'throw-after', 'readback-once'] as const) {
    const f = make(kind); const ownTicket = f.ticket();
    if (kind === 'quota') f.beforeSet = (_raw, index) => { if (index === 1) throw Error('QuotaExceededError'); };
    if (kind === 'throw-after') f.afterSet = (_raw, index) => { if (index === 1) throw Error('after-write'); };
    if (kind === 'readback-once') f.afterSet = (_raw, index) => { if (index === 1) f.getHook = () => { f.getHook = undefined; throw Error('readback-once'); }; };
    const result = f.adapter.commit(ownTicket); failure(result, 'failed');
    assert.equal(f.values.get(KEY), A);
    assert.equal(f.mutations().length, kind === 'quota' ? 1 : 2);
    assert.equal(f.actualByteChanges, kind === 'quota' ? 0 : 2);
    f.beforeSet = undefined; f.afterSet = undefined;
    const retry = f.adapter.commit(f.ticket());
    assert.equal(retry.status, 'success'); assert.equal(f.values.get(KEY), B);
  }
});

test('RP05 facade preserves foreign X in BOTH historical RED paths and locks future writes', t => {
  const make = suiteEvidence(t);
  for (const fault of ['throw', 'mismatch'] as const) {
    const f = make(`foreign ${fault}`); const ticket = f.ticket();
    f.afterSet = (raw, index) => {
      if (index !== 1) return;
      assert.equal(raw, B); assert.equal(f.values.get(KEY), B);
      f.external(X);
      if (fault === 'throw') throw Error('after-foreign-write');
    };
    const result = f.adapter.commit(ticket); failure(result, 'recovery-required');
    assert.equal(f.values.get(KEY), X);
    assert.equal(f.mutations().length, 1, 'no underlying rollback over X');
    assert.equal(f.actualByteChanges, 1); assert.equal(f.externalWrites.length, 1);
    if ('apiCalls' in result) {
      assert.equal(result.apiCalls.rollbackSetCalls, 0);
      assert.equal(result.apiCalls.rollbackRemoveCalls, 0);
      assert.equal(result.apiCalls.rollbackDenied, 1);
    }
    failure(f.adapter.prepare({ ...f.input(), expectedOwnedDraftRaw: X }), 'recovery-required');
    assert.equal(f.mutations().length, 1);
  }
});

test('RP06 unknown rollback, before null, throw-after restore and exact-before recovery boundaries', t => {
  const make = suiteEvidence(t);
  const absent = make('null before', null); const emptyTicket = absent.ticket();
  absent.afterSet = () => { throw Error('after-candidate'); };
  failure(absent.adapter.commit(emptyTicket), 'failed');
  assert.equal(absent.values.has(KEY), false); assert.equal(absent.mutations().length, 2);
  assert.equal(absent.mutations()[1]?.method, 'removeItem');
  const unknown = make('persistent read failure'); const unknownTicket = unknown.ticket();
  unknown.afterSet = () => { unknown.getHook = () => { throw Error('cannot inspect ownership'); }; };
  failure(unknown.adapter.commit(unknownTicket), 'recovery-required');
  assert.equal(unknown.mutations().length, 1); assert.equal(unknown.values.get(KEY), B);
  unknown.getHook = undefined; failure(unknown.adapter.prepare(unknown.input()), 'recovery-required');
  const blocked = make('rollback write denied'); const blockedTicket = blocked.ticket();
  blocked.afterSet = (_raw, index) => { if (index === 1) throw Error('first write done'); };
  blocked.beforeSet = (_raw, index) => { if (index === 2) throw Error('rollback cannot write'); };
  failure(blocked.adapter.commit(blockedTicket), 'recovery-required'); assert.equal(blocked.values.get(KEY), B);
  const restored = make('restore threw after exact write'); const restoredTicket = restored.ticket();
  restored.afterSet = () => { throw Error('throw after any write'); };
  failure(restored.adapter.commit(restoredTicket), 'failed'); assert.equal(restored.values.get(KEY), A);
  const already = make('already before'); const alreadyTicket = already.ticket();
  already.afterSet = (_raw, index) => { if (index === 1) { already.external(A); throw Error('before already restored'); } };
  failure(already.adapter.commit(alreadyTicket), 'failed'); assert.equal(already.mutations().length, 1);
});

test('RP07 scope/document/observed ABA and postread changes never authorize stale adoption', t => {
  const make = suiteEvidence(t);
  for (const scopeKind of ['scope', 'document', 'observed ABA'] as const) {
    const f = make(scopeKind); const ticket = f.ticket();
    if (scopeKind === 'document') f.documentId += ':new';
    else f.scope += scopeKind === 'scope' ? '|source=new' : '|external-generation=2';
    failure(f.adapter.commit(ticket), 'stale'); assert.equal(f.mutations().length, 0);
  }
  const writeScope = make('scope changes during first write'); const writeTicket = writeScope.ticket();
  writeScope.afterSet = (_raw, index) => { if (index === 1) writeScope.scope += '|external-generation=1'; };
  const scoped = writeScope.adapter.commit(writeTicket); failure(scoped, 'stale');
  assert.equal(writeScope.values.get(KEY), A); assert.equal(writeScope.mutations().length, 2);
  const postRead = make('post read unavailable, owned candidate rollback'); const postTicket = postRead.ticket();
  postRead.afterSet = () => { postRead.readHook = () => { throw Error('post boundary unavailable'); }; };
  failure(postRead.adapter.commit(postTicket), 'failed'); assert.equal(postRead.values.get(KEY), A);
  const lateX = make('post read returns foreign X'); const lateTicket = lateX.ticket();
  lateX.readHook = () => {
    if (lateX.setCalls > 0) { lateX.readHook = undefined; lateX.external(X); }
    return lateX.packet();
  };
  failure(lateX.adapter.commit(lateTicket), 'recovery-required');
  assert.equal(lateX.values.get(KEY), X); assert.equal(lateX.mutations().length, 1);
  const beforeSet = make('scope changes between save read and first set'); const beforeTicket = beforeSet.ticket();
  beforeSet.getHook = () => { beforeSet.getHook = undefined; beforeSet.scope += '|external-generation=1'; };
  failure(beforeSet.adapter.commit(beforeTicket), 'stale'); assert.equal(beforeSet.mutations().length, 0);
});

test('RP08 descriptor-safe inputs/reads/config, cross-realm native objects and forged tickets', t => {
  const make = suiteEvidence(t);
  const f = make('invalid shape');
  let getterCalls = 0;
  const validInput = f.input();
  const invalids: unknown[] = [
    { ...validInput, unknown: true }, Object.assign(Object.create({ inherited: true }), validInput),
    { ...validInput, expectedOwnedDraftRaw: undefined },
    Object.defineProperty({ ...validInput }, 'rawText', { enumerable: true, get() { getterCalls += 1; return RAW_B; } }),
    Object.defineProperty({ ...validInput }, 'hidden', { value: true }),
    { ...validInput, [Symbol('extra')]: true },
  ];
  for (const input of invalids) failure(f.adapter.prepare(input as Prepare), 'failed');
  const maliciousTicket = Object.defineProperty({}, 'version', { get() { getterCalls += 1; return 1; } });
  failure(f.adapter.commit(maliciousTicket as Ticket), 'failed');
  f.readHook = () => Object.defineProperty({ ...f.packet() }, 'draftRaw', { enumerable: true, get() { getterCalls += 1; return A; } });
  failure(f.adapter.prepare(validInput), 'failed');
  f.readHook = () => ({ ...f.packet(), unknown: true }); failure(f.adapter.prepare(validInput), 'failed');
  f.readHook = () => undefined; failure(f.adapter.prepare(validInput), 'failed');
  const maliciousConfig = Object.defineProperty({ storage: f }, 'read', { enumerable: true, get() { getterCalls += 1; return () => f.packet(); } });
  failure(create(maliciousConfig as unknown as Parameters<typeof create>[0]).prepare(validInput), 'failed');
  const maliciousStorage = Object.defineProperty({ setItem() {}, removeItem() {} }, 'getItem', { get() { getterCalls += 1; return () => A; } });
  failure(create({ storage: maliciousStorage as unknown as Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>, read: () => f.packet() }).prepare(validInput), 'failed');
  assert.equal(getterCalls, 0); assert.equal(f.mutations().length, 0);
  const cross = make('native other realm');
  const input = runInNewContext(`JSON.parse(${JSON.stringify(JSON.stringify(cross.input()))})`) as Prepare;
  const originalPrototype = Object.getPrototypeOf(input);
  assert.notEqual(originalPrototype, Object.prototype);
  const inputBefore = JSON.stringify(input);
  const packet = cross.packet();
  cross.readHook = () => runInNewContext(`JSON.parse(${JSON.stringify(JSON.stringify({ ...packet, draftRaw: cross.values.get(KEY) ?? null }))})`);
  success(cross, cross.adapter.commit(cross.ticket(input)));
  assert.equal(JSON.stringify(input), inputBefore, 'cross-realm source fields stay exact');
  assert.equal(JSON.stringify(input), JSON.stringify(cross.input()));
  assert.equal(Object.getPrototypeOf(input), originalPrototype, 'native source prototype unchanged');
});

test('RP09 nested OTHER genuine tickets are consumed on pending failure at read/set/rollback/postread', t => {
  const make = suiteEvidence(t);
  for (const phase of ['commit-read-noop', 'candidate-set', 'rollback-set', 'post-read'] as const) {
    const f = make(phase, phase === 'commit-read-noop' ? B : A);
    const outer = f.ticket();
    const nested = f.ticket();
    let nestedResult: Result | undefined;
    const tryNested = () => {
      if (nestedResult) return;
      nestedResult = f.adapter.commit(nested);
      failure(nestedResult, 'failed');
    };
    if (phase === 'commit-read-noop') f.readHook = () => { tryNested(); return f.packet(); };
    if (phase === 'candidate-set') f.afterSet = () => tryNested();
    if (phase === 'rollback-set') f.afterSet = (_raw, index) => {
      if (index === 1) throw Error('rollback path');
      tryNested();
    };
    if (phase === 'post-read') f.readHook = () => { if (f.setCalls > 0) tryNested(); return f.packet(); };
    const result = f.adapter.commit(outer);
    if (phase === 'rollback-set') failure(result, 'failed');
    else success(f, result, RAW_B, phase !== 'commit-read-noop');
    assert.ok(nestedResult, 'selected reentrant phase was actually reached');
    f.readHook = undefined; f.afterSet = undefined;
    const writesBeforeReplay = f.mutations().length;
    const replay = f.adapter.commit(nested);
    failure(replay, 'failed');
    if ('reason' in replay) assert.equal(replay.reason, 'invalid-entry-ticket');
    assert.equal(f.mutations().length, writesBeforeReplay);
  }
});

test('RP10 untrusted native error messages never expose source text in failure results', t => {
  const make = suiteEvidence(t);
  for (const phase of ['before-write', 'after-write', 'foreign-recovery'] as const) {
    const f = make(phase); const ticket = f.ticket();
    const privateError = `PRIVATE_ERROR:${RAW_B}:${X}`;
    if (phase === 'before-write') f.beforeSet = () => { throw Error(privateError); };
    else f.afterSet = (_raw, index) => {
      if (index !== 1) return;
      if (phase === 'foreign-recovery') f.external(X);
      throw Error(privateError);
    };
    const result = f.adapter.commit(ticket);
    failure(result, phase === 'foreign-recovery' ? 'recovery-required' : 'failed');
    assert.equal(JSON.stringify(result).includes('PRIVATE_ERROR'), false);
    assert.equal(JSON.stringify(result).includes(JSON.stringify(RAW_B).slice(1, -1)), false);
    assert.equal(JSON.stringify(result).includes(JSON.stringify(X).slice(1, -1)), false);
    assert.equal(f.values.get(KEY), phase === 'foreign-recovery' ? X : A);
  }
});
