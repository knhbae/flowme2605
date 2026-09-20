import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { buildSync } from 'esbuild';

import { materializePersonalWorkspacePocAuthoring } from './personal-workspace-poc-authoring';
import * as Source from './personal-workspace-poc-source-candidates';
import type { PersonalWorkspacePocAuthoredFlow } from './personal-workspace-poc-contract';

const T0 = '2026-09-06T00:00:00.000Z';
const T1 = '2026-09-06T00:01:00.000Z';
const T2 = '2026-09-06T00:02:00.000Z';
const RAW = '# 실제 작성 원문\r\n## 첫 구간\r\n- [ ] 주소 변경\r\n  개인 기록과 다른 원문 설명\r\n- [ ] 전기 이전';
const INCOMING = '# 로컬 연습 원문\r\n## 첫 구간\r\n- [ ] 주소 확인\r\n- [ ] 전기 이전\r\n- [ ] 인터넷 설치';
type Store = Source.PersonalWorkspacePocSourceCandidateStore;
type Envelope = Source.PersonalWorkspacePocSourceCandidateEnvelope;
type Current = Source.PersonalWorkspacePocSourceCandidateCurrentSource;

// Dynamic lookup makes the historical missing-API RED an assertion failure in
// every registered scenario, including negative scenarios (never false PASS).
function query(input: unknown): any {
  const api = (Source as unknown as Record<string, unknown>).inspectPersonalWorkspacePocSourceCandidateCatalog;
  assert.equal(typeof api, 'function', 'C2-M catalog API is not implemented');
  return (api as (input: unknown) => unknown)(input);
}
function copy<T>(value: T): T { return JSON.parse(JSON.stringify(value)); }
function fixture(candidateId = 'stored-arbitrary-73', handoffId = 'catalog-handoff-A') {
  const authored = materializePersonalWorkspacePocAuthoring({
    handoffId, documentId: `document-${handoffId}`, revisionId: `revision-${handoffId}`,
    rawText: RAW, committedAt: T0,
  });
  assert.equal(authored.ok, true);
  if (!authored.ok) throw new Error('invalid actual authoring fixture');
  return envelopeFor(authored.flow, candidateId);
}
function envelopeFor(flow: PersonalWorkspacePocAuthoredFlow, candidateId: string, current?: Current) {
  const result = Source.createPersonalWorkspacePocLocalFixtureEnvelope(flow, {
    candidateId, current, incomingRawText: INCOMING,
    incomingRevisionId: `incoming-${candidateId}`, fixtureId: `fixture-${candidateId}`, createdAt: T1,
  });
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error('invalid actual source envelope fixture');
  return { flow, ...result, target: result.envelope.target };
}
function stage(f: ReturnType<typeof fixture>, store = Source.createPersonalWorkspacePocSourceCandidateStore(T0)) {
  const result = Source.stagePersonalWorkspacePocSourceCandidate(store, f.envelope, f.current, T1);
  assert.equal(result.code, 'staged');
  return result.store;
}
function resolveAll(store: Store, envelope: Envelope) {
  let next = store;
  for (const change of envelope.changes) {
    const result = Source.resolvePersonalWorkspacePocSourceCandidateChange(next, {
      candidateId: envelope.candidateId, changeId: change.changeId, resolution: 'use-incoming', now: T1,
    });
    assert.equal(result.code, 'resolved');
    next = result.store;
  }
  return next;
}
function apply(f: ReturnType<typeof fixture>, store = stage(f)) {
  const result = Source.applyPersonalWorkspacePocSourceCandidate(resolveAll(store, f.envelope), {
    candidateId: f.envelope.candidateId, current: f.current, now: T2,
  });
  assert.equal(result.code, 'applied');
  assert.equal(Source.isPersonalWorkspacePocSourceCandidateStore(result.store), true);
  return result.store;
}
function read(f: ReturnType<typeof fixture>, store: Store, current = f.current) {
  const before = JSON.stringify({ f, store, current });
  const result = query({ target: f.target, current, store });
  assert.equal(JSON.stringify({ f, store, current }), before, 'query changed its input');
  assert.equal(result.ok, true);
  assert.equal(result.scope, 'source-practice-read');
  return result;
}
function blocked(input: unknown) {
  const result = query(input);
  assert.equal(result.ok, false);
  assert.equal(result.scope, 'source-practice-read');
  assert.equal(typeof result.reason, 'string');
  assert.deepEqual(Object.keys(result).sort(), ['ok', 'reason', 'scope']);
}

test('C2Q01 empty actual authored catalog is read-only and creates no candidate', () => {
  const f = fixture();
  const store = Source.createPersonalWorkspacePocSourceCandidateStore(T0);
  const result = read(f, store);
  assert.deepEqual(result.candidates, []);
  assert.equal(result.appliedVersion, null);
  assert.deepEqual(result.undo, { available: false });
  assert.deepEqual(result.target, f.target);
  assert.equal(store.revision, 0);
});

test('C2Q02 reads an arbitrary pending ID and exact decisions/counts, not a generated default ID', () => {
  const f = fixture();
  const first = f.envelope.changes[0];
  const resolved = Source.resolvePersonalWorkspacePocSourceCandidateChange(stage(f), {
    candidateId: f.envelope.candidateId, changeId: first.changeId, resolution: 'keep-mine', now: T2,
  });
  assert.equal(resolved.code, 'resolved');
  const result = read(f, resolved.store);
  assert.equal(result.candidates.length, 1);
  assert.deepEqual(result.candidates[0], {
    candidateId: f.envelope.candidateId, status: 'pending', provenance: f.envelope.provenance,
    changeCount: f.envelope.changes.length, resolvedCount: 1,
    unresolvedCount: f.envelope.changes.length - 1, stale: false, isEffective: false, canUndo: false,
  });
});

test('C2Q03 repeated deferred reads preserve the status, decisions, revision and bytes', () => {
  const f = fixture();
  const resolved = resolveAll(stage(f), f.envelope);
  const deferred = Source.deferPersonalWorkspacePocSourceCandidate(resolved, { candidateId: f.envelope.candidateId, now: T2 });
  assert.equal(deferred.code, 'deferred');
  const result = read(f, deferred.store);
  assert.equal(result.candidates[0].status, 'deferred');
  assert.equal(result.candidates[0].resolvedCount, f.envelope.changes.length);
  assert.deepEqual(read(f, deferred.store), result);
  assert.deepEqual(deferred.store.reviews[f.envelope.candidateId].resolutions, resolved.reviews[f.envelope.candidateId].resolutions);
});

test('C2Q04 a valid envelope without a review remains explicitly unreviewed', () => {
  const f = fixture();
  const store = { ...Source.createPersonalWorkspacePocSourceCandidateStore(T0), envelopes: { [f.envelope.candidateId]: f.envelope } };
  assert.equal(Source.isPersonalWorkspacePocSourceCandidateStore(store), true);
  const row = read(f, store).candidates[0];
  assert.equal(row.status, 'unreviewed');
  assert.equal(row.resolvedCount, 0);
  assert.equal(row.unresolvedCount, f.envelope.changes.length);
  assert.deepEqual(store.reviews, {});
});

test('C2Q05 reads multiple records without selecting a newest/default candidate or changing their order', () => {
  const a = fixture('z-older-ID');
  const b = envelopeFor(a.flow, 'a-newer-looking-ID');
  const store = stage(b, stage(a));
  const result = read(a, store);
  assert.deepEqual(result.candidates.map((row: any) => row.candidateId), ['z-older-ID', 'a-newer-looking-ID']);
  assert.equal('selectedCandidateId' in result, false);
  assert.equal(result.appliedVersion, null);
});

test('C2Q06 exact savedCopy/Flow/handoff target excludes another copy and same-ref foreign handoff', () => {
  const a = fixture('candidate-A');
  const b = fixture('candidate-B', 'catalog-handoff-B');
  const foreign = envelopeFor({ ...a.flow, authoring: { ...a.flow.authoring, handoffId: 'foreign-handoff' } }, 'foreign-owner');
  const store = stage(foreign, stage(b, stage(a)));
  const result = read(a, store);
  assert.deepEqual(result.candidates.map((row: any) => row.candidateId), ['candidate-A']);
  const text = JSON.stringify(result);
  assert.equal(text.includes('candidate-B'), false);
  assert.equal(text.includes('foreign-owner'), false);
});

test('C2Q07 actual applied version and owned Undo survive serialized reload with a nondefault ID', () => {
  const f = fixture('applied-elsewhere-917');
  const store = apply(f);
  const effective = store.effectiveVersions[f.target.flowRef];
  const current = { ...effective.sourceRevision, projectedFlow: effective.projectedFlow };
  const result = read(f, copy(store), current);
  assert.deepEqual(result.appliedVersion, {
    candidateId: f.envelope.candidateId, revisionId: effective.sourceRevision.revisionId,
    sourceSnapshotId: effective.sourceRevision.sourceSnapshotId, appliedAt: effective.appliedAt,
  });
  assert.equal(result.candidates[0].status, 'applied');
  assert.equal(result.candidates[0].isEffective, true);
  assert.equal(result.candidates[0].canUndo, true);
  assert.deepEqual(result.undo, { available: true, candidateId: f.envelope.candidateId });
});

test('C2Q08 another Flow owns global Undo: selected applied history cannot advertise it', () => {
  const a = fixture('applied-A');
  const b = fixture('applied-B', 'catalog-handoff-B');
  const store = apply(b, stage(b, apply(a)));
  const result = read(a, store);
  assert.equal(result.candidates[0].isEffective, true);
  assert.equal(result.candidates[0].canUndo, false);
  assert.deepEqual(result.undo, { available: false });
  assert.equal(JSON.stringify(result).includes('applied-B'), false);
  assert.equal(read(b, store).candidates[0].canUndo, true);
});

test('C2Q09 same-Flow successive applied owners and actual Undo never resurrect the wrong Undo owner', () => {
  const a = fixture('first-applied');
  const first = apply(a);
  const effective = first.effectiveVersions[a.target.flowRef];
  const nextCurrent = { ...effective.sourceRevision, projectedFlow: effective.projectedFlow };
  const next = Source.createPersonalWorkspacePocLocalFixtureEnvelope(a.flow, {
    current: nextCurrent, incomingRawText: `${INCOMING}\r\n- [ ] 두 번째 연습 항목`,
    candidateId: 'second-applied', incomingRevisionId: 'second-revision', createdAt: T2,
  });
  assert.equal(next.ok, true);
  if (!next.ok) throw new Error('invalid actual next source envelope fixture');
  const b = { flow: a.flow, ...next, target: next.envelope.target };
  const second = apply(b, stage(b, first));
  const result = read(a, second, b.current);
  assert.deepEqual(result.candidates.map((row: any) => [row.candidateId, row.isEffective, row.canUndo]), [
    ['first-applied', false, false], ['second-applied', true, true],
  ]);
  const mismatchedUndo = { ...second, undo: first.undo };
  assert.equal(Source.isPersonalWorkspacePocSourceCandidateStore(mismatchedUndo), true);
  assert.deepEqual(read(a, mismatchedUndo, b.current).undo, { available: false });
  const undone = Source.undoPersonalWorkspacePocSourceCandidate(second, T2);
  assert.equal(undone.code, 'undone');
  const restored = read(a, copy(undone.store), nextCurrent);
  assert.equal(restored.appliedVersion.candidateId, 'first-applied');
  assert.deepEqual(restored.undo, { available: false });
  assert.equal(restored.candidates.find((row: any) => row.candidateId === 'second-applied').status, 'pending');
});

test('C2Q10 unapplied stale current facts do not resume, regenerate or change candidate decisions', () => {
  const f = fixture();
  const store = stage(f);
  for (const current of [
    { ...f.current, revisionId: 'observed-other-revision' },
    { ...f.current, sourceSnapshotId: 'observed-other-snapshot' },
    { ...f.current, projectedFlow: { ...f.current.projectedFlow, title: '다른 실제 source projection' } },
  ]) {
    const row = read(f, store, current).candidates[0];
    assert.equal(row.stale, true);
    assert.equal(row.status, 'pending');
    assert.equal(row.canUndo, false);
  }
});

test('C2Q11 malformed target/current and unsupported origins fail closed with no private result', () => {
  const f = fixture();
  const input = { target: f.target, current: f.current, store: stage(f) };
  for (const bad of [null, undefined, [], {}, { ...input, unknown: true },
    { ...input, target: { ...f.target, handoffId: '' } },
    { ...input, target: { ...f.target, savedCopyId: 'other-copy' } },
    ...['legacy-saved-plan', 'source-backed', 'saved-public', 'user-flow', 'quick-item'].map(origin => ({ ...input, target: { ...f.target, origin } })),
    { ...input, current: { ...f.current, rawText: `${RAW}\nprivate-broken` } },
    { ...input, current: fixture('other', 'other-handoff').current },
  ]) blocked(bad);
});

test('C2Q12 corrupted store, unknown provenance and selected effective handoff mismatch are blocked', () => {
  const f = fixture();
  const store = stage(f);
  for (const mutate of [
    (s: any) => { s.version = 999; },
    (s: any) => { s.reviews[f.envelope.candidateId].status = 'invented'; },
    (s: any) => { s.envelopes[f.envelope.candidateId].provenance.kind = 'external-fetch'; },
    (s: any) => { s.envelopes[f.envelope.candidateId].incoming.rawText += 'tampered'; },
  ]) {
    const corrupted = copy(store); mutate(corrupted);
    blocked({ target: f.target, current: f.current, store: corrupted });
  }
  const foreign = envelopeFor({ ...f.flow, authoring: { ...f.flow.authoring, handoffId: 'foreign-owner' } }, 'applied-foreign');
  blocked({ target: f.target, current: f.current, store: apply(foreign) });
});

test('C2Q13 input/nested/array getters never execute; prototype, symbol and cycles are rejected', () => {
  const f = fixture();
  const clean = () => copy({ target: f.target, current: f.current, store: stage(f) });
  let getterCalls = 0;
  for (const select of [
    (x: any) => [x, 'store'],
    (x: any) => [x.target, 'handoffId'],
    (x: any) => [x.current.projectedFlow.items, '0'],
    (x: any) => [x.store.envelopes[f.envelope.candidateId].incoming, 'rawText'],
  ]) {
    const input = clean(); const [owner, key] = select(input);
    Object.defineProperty(owner, key, { enumerable: true, get() { getterCalls += 1; throw new Error('PRIVATE getter body'); } });
    blocked(input);
  }
  assert.equal(getterCalls, 0);
  const custom = clean(); Object.setPrototypeOf(custom.current, { inherited: 'private' }); blocked(custom);
  const symbol = clean(); Object.defineProperty(symbol.store, Symbol('hidden'), { value: 'private' }); blocked(symbol);
  const cycle: any = clean(); cycle.current.cycle = cycle; blocked(cycle);
  const hidden = clean(); Object.defineProperty(hidden.store, 'invisible', { value: 1 }); blocked(hidden);
});

test('C2Q14 plain cross-realm data is accepted; sparse/custom-prototype arrays and toJSON are rejected', () => {
  const f = fixture();
  const input = { target: f.target, current: f.current, store: stage(f) };
  const foreign = runInNewContext(`JSON.parse(${JSON.stringify(JSON.stringify(input))})`);
  assert.deepEqual(query(foreign), query(input));
  const nullProto = copy(input); Object.setPrototypeOf(nullProto.store, null);
  assert.deepEqual(query(nullProto), query(input));
  const sparse = copy(input); delete (sparse.current.projectedFlow.items as any)[0]; blocked(sparse);
  const odd = copy(input); Object.setPrototypeOf(odd.current.projectedFlow.items, Object.create(Array.prototype)); blocked(odd);
  let calls = 0;
  const json = copy(input) as any; json.store.toJSON = () => { calls++; return {}; };
  blocked(json); assert.equal(calls, 0);
});

test('C2Q15 detached deeply frozen DTO exposes no raw bodies, decisions map or writer authority', () => {
  const f = fixture(); const store = copy(stage(f));
  const result = read(f, store);
  const walk = (value: any) => {
    if (!value || typeof value !== 'object') return;
    assert.equal(Object.isFrozen(value), true);
    for (const [key, item] of Object.entries(value)) {
      assert.equal(['rawText', 'base', 'mine', 'incoming', 'store', 'resolutions', 'ticket', 'current', 'changed', 'serialized'].includes(key), false);
      walk(item);
    }
  };
  walk(result);
  assert.notEqual(result.target, f.target);
  assert.notEqual(result.candidates[0].provenance, store.envelopes[f.envelope.candidateId].provenance);
  const bytes = JSON.stringify(result);
  (store.envelopes as Record<string, unknown>)[f.envelope.candidateId] = null;
  assert.equal(JSON.stringify(result), bytes);
  assert.equal(bytes.includes(RAW), false);
  assert.equal(bytes.includes('개인 기록과 다른 원문 설명'), false);
});

test('C2Q16 actual bundled query performs no generator, transition, IO or current-clock call', () => {
  const f = fixture(); const input = { target: f.target, current: f.current, store: stage(f) };
  query(input); // Missing API must fail this baseline before instrumentation.
  let bundle = buildSync({
    entryPoints: ['lib/flow/personal-workspace-poc-source-candidates.ts'], bundle: true,
    platform: 'node', format: 'cjs', write: false,
  }).outputFiles[0].text;
  const counts: Record<string, number> = {};
  for (const name of [
    'createPersonalWorkspacePocLocalFixtureEnvelope', 'createPersonalWorkspacePocSourceCandidateStore',
    'stagePersonalWorkspacePocSourceCandidate', 'resolvePersonalWorkspacePocSourceCandidateChange',
    'clearPersonalWorkspacePocSourceCandidateChangeResolution', 'deferPersonalWorkspacePocSourceCandidate',
    'applyPersonalWorkspacePocSourceCandidate', 'undoPersonalWorkspacePocSourceCandidate',
  ]) {
    const pattern = new RegExp(`function ${name}\\([^]*?\\) \\{`);
    assert.match(bundle, pattern);
    bundle = bundle.replace(pattern, match => `${match} __forbidden(${JSON.stringify(name)});`);
  }
  const NativeDate = Date;
  class NoCurrentDate extends NativeDate {
    constructor(value?: any) { if (arguments.length === 0) { counts.clock = (counts.clock ?? 0) + 1; throw new Error('no clock'); } super(value); }
    static now(): never { counts.clock = (counts.clock ?? 0) + 1; throw new Error('no clock'); }
  }
  const forbid = (name: string) => { counts[name] = (counts[name] ?? 0) + 1; throw new Error(`forbidden ${name}`); };
  const sandbox: any = { module: { exports: {} }, Date: NoCurrentDate, __forbidden: forbid,
    fetch: () => forbid('fetch'), setTimeout: () => forbid('timer') };
  for (const key of ['localStorage', 'sessionStorage', 'window', 'document']) {
    Object.defineProperty(sandbox, key, { get() { return forbid(key); } });
  }
  runInNewContext(bundle, sandbox);
  const result = sandbox.module.exports.inspectPersonalWorkspacePocSourceCandidateCatalog(input);
  assert.equal(result.ok, true);
  assert.deepEqual(counts, {});
  const source = readFileSync('lib/flow/personal-workspace-poc-source-candidates.ts', 'utf8');
  assert.ok(source.includes('inspectPersonalWorkspacePocSourceCandidateCatalog'));
});
