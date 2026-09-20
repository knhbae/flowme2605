'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const P = require('./personal-plan-context.js');
const D = require('./workspace-permanent-delete.js');
const T = require('./timeline-context.js');
const { M, C, NOW, clone, own, legacyFixture, sourceUpdateFixture } = require('./k3b-plan-lossless-gate.fixture.cjs');
const file = path.join(__dirname, 'personal-plan-display.js');
const U = fs.existsSync(file) ? require(file) : {};
const bytes = value => JSON.stringify(value);
const empty = () => ({ ok: true, raw: null });
function fixture() {
  const f = sourceUpdateFixture();
  const converted = C.fromLegacy(' \r\n' + bytes({ version: 1, state: f.state, undo: null }) + '\r\n ');
  assert.equal(converted.ok, true, converted.reason);
  return { ...f, checkpoint: converted.checkpoint, sourceRead: { ok: true, raw: bytes(f.store) }, sourceEpoch: 12 };
}
const displayInput = f => ({ checkpoint: f.checkpoint, sourceRead: f.sourceRead, sourceEpoch: f.sourceEpoch });
function display(f, api = U) {
  assert.equal(typeof api.projectPersonalPlanDisplay, 'function');
  const input = displayInput(f), before = bytes(input);
  const result = api.projectPersonalPlanDisplay(input);
  assert.equal(bytes(input), before); assert.equal(result.scope, 'display-only');
  assert.equal(own(result, 'context'), false); assert.equal(own(result, 'sourceContext'), false); assert.equal(own(result, 'capabilities'), false);
  if (!result.ok) assert.equal(own(result, 'state'), false);
  return result;
}
function overlay(f, modify) {
  const opened = C.inspectSourceBoundPersonalPlanContext(f.checkpoint, { flowRef: f.flow.ref, sourceRead: f.sourceRead, sourceEpoch: f.sourceEpoch });
  assert.equal(opened.ok, true, opened.reason);
  const draft = clone(opened.draft);
  if (modify) modify(draft); else draft.title = { mode: 'override', value: '표시용 개인 제목' };
  const result = C.transitionCheckpoint(f.checkpoint, { type: 'commit-source-bound-personal-plan-context', context: opened.context, draft,
    sourceRead: f.sourceRead, sourceEpoch: f.sourceEpoch, now: NOW });
  assert.equal(result.ok, true, result.reason); assert.equal(result.changed, true);
  return { ...f, checkpoint: result.checkpoint };
}
function candidate(before, after = before, api = U) {
  assert.equal(typeof api.inspectPersonalPlanDisplayCandidate, 'function');
  const input = { checkpoint: before.checkpoint, candidateCheckpoint: after.checkpoint, sourceRead: before.sourceRead,
    candidateSourceRead: after.sourceRead, sourceEpoch: before.sourceEpoch };
  const raw = bytes(input); const result = api.inspectPersonalPlanDisplayCandidate(input);
  assert.equal(bytes(input), raw); assert.equal(result.scope, 'candidate-display-check');
  for (const key of ['state', 'checkpoint', 'context', 'sourceContext', 'capabilities']) assert.equal(own(result, key), false);
  return result;
}
function unsupported(f, kind) {
  if (kind === 'chain') {
    const runtime = require('./source-update-runtime.cjs').loadCommonJs();
    const flow = M.standaloneAuthoredFlowForSourceUpdate(f.state, f.flow.id);
    const current = clone(runtime.createPersonalWorkspacePocCurrentSourceFromAuthoredFlow(flow)); current.revisionId += '-other';
    const made = runtime.createPersonalWorkspacePocLocalFixtureEnvelope(flow, { current, incomingRawText: f.flow.rawText.replace('원문 제목', '다음 원문'), createdAt: NOW });
    assert.equal(made.ok, true, made.reason);
    const staged = runtime.stagePersonalWorkspacePocSourceCandidate(M.initialSourceCandidateStore(NOW), made.envelope, current, NOW);
    assert.equal(staged.changed, true, staged.code); return { ok: true, raw: bytes(staged.store) };
  }
  const prepared = M.prepareLocalSourceCandidateReview(M.initialSourceCandidateStore(NOW), f.state, f.flow.id,
    { now: NOW, createdAt: NOW, incomingRawText: f.flow.rawText + '\n- [ ] 추가 원문 Item' });
  assert.equal(prepared.ok, true, prepared.reason); let store = prepared.store;
  for (const change of prepared.candidate.changes) {
    const resolved = M.resolveLocalSourceCandidateChange(store, { candidateId: prepared.candidate.candidateId, changeId: change.changeId, resolution: 'use-incoming', now: NOW });
    assert.equal(resolved.changed, true, resolved.code); store = resolved.store;
  }
  const applied = M.applyLocalSourceCandidate(store, f.state, f.flow.id, prepared.candidate.candidateId, NOW);
  assert.equal(applied.changed, true, applied.code); return { ok: true, raw: bytes(applied.store) };
}
function readerInput(f) { return { rawState: f.checkpoint.state, legacyBaseRaw: f.checkpoint.legacyBaseRaw,
  undo: f.checkpoint.undo, sourceRead: f.sourceRead, sourceEpoch: f.sourceEpoch }; }
function sandboxApi(overrides = {}, access = () => {}) {
  assert.equal(fs.existsSync(file), true, 'implementation must exist before negative checks');
  const sandbox = { FlowMeIntegratedPoc: M, FlowPocWorkspaceCheckpoint: C, FlowPocPersonalPlanContext: P, ...overrides };
  for (const key of ['window', 'document', 'localStorage', 'sessionStorage', 'fetch']) Object.defineProperty(sandbox, key, { get() { access(key); throw new Error(key); } });
  vm.runInContext(fs.readFileSync(file, 'utf8'), vm.createContext(sandbox));
  return sandbox.FlowPocPersonalPlanDisplay;
}

test('DR01 confirmed absence with no P preserves a detached legacy display and exact unknown values', () => {
  const base = legacyFixture(); const f = { checkpoint: base.checkpoint, sourceRead: empty(), sourceEpoch: 0 };
  const result = display(f); assert.equal(result.ok, true, result.reason); assert.equal(result.mode, 'legacy-display');
  assert.equal(result.sourceStatus, 'empty'); assert.equal(result.hasReachablePersonalUndo, false);
  assert.deepEqual(result.state, f.checkpoint.state); assert.notEqual(result.state, f.checkpoint.state);
  assert.ok(Object.isFrozen(result.state.tasks)); assert.ok(Object.isFrozen(result));
});
test('DR02 valid no-P source uses the actual legacy composer without creating source-added membership', () => {
  for (const kind of ['same', 'membership', 'chain']) {
    const f = fixture(); if (kind !== 'same') f.sourceRead = unsupported(f, kind);
    const loaded = M.loadSourceCandidateStore({ getItem: () => f.sourceRead.raw }); assert.equal(loaded.status, 'restored');
    const result = display(f); assert.equal(result.ok, true, result.reason); assert.equal(result.mode, 'legacy-display');
    assert.deepEqual(result.state, M.composeSourceCandidateState(f.checkpoint.state, loaded.store));
    if (kind !== 'same') assert.equal(P.readPersonalPlanSourceContext(readerInput(f)).ok, false);
    assert.equal(candidate(f).ok, true, 'legacy unsupported source is not a new display prerequisite');
  }
});
test('DR03 no-P read failures yield explicit execution-only snapshots, never implicit empty or successful source composition', () => {
  const sourceReads = [{ ok: false, reason: 'read-error' }, { ok: false, reason: 'unavailable' }, { ok: true, raw: '{' }, { ok: true, raw: bytes({ version: 999 }) }];
  for (const sourceRead of sourceReads) {
    const f = { ...fixture(), sourceRead }; const result = display(f);
    assert.equal(result.ok, true, result.reason); assert.equal(result.mode, 'personal-execution-only');
    assert.deepEqual(result.state, f.checkpoint.state); assert.notEqual(result.state, f.checkpoint.state);
    assert.notEqual(result.sourceStatus, 'empty'); assert.equal(candidate(f).ok, true, 'no-P pure display fact is not writer authority');
  }
});
test('DR04 P is applied after actual source and preserves explicit A, memo presence and schedule ownership', () => {
  for (const value of ['', '  ', '\r\n개인 메모\r\n', '원문 설명']) {
    const f = overlay(fixture(), draft => { draft.title = { mode: 'override', value: '원문 제목' };
      draft.items[Object.keys(draft.items)[0]].memo = { mode: 'override', value };
      draft.items[Object.keys(draft.items)[0]].schedule = { mode: 'fixed_date', date: '2026-09-10' }; });
    const result = display(f); assert.equal(result.ok, true, result.reason); assert.equal(result.mode, 'personal-source-display');
    const flow = result.state.flows.find(row => row.ref === f.flow.ref), task = result.state.tasks.find(row => row.ref === f.task.ref);
    assert.equal(flow.sourceTitle, '새 원문 제목'); assert.equal(flow.title, '원문 제목'); assert.equal(task.memo, value);
    assert.equal(task.sourceDescription, '원문 설명'); assert.equal(task.planDate, '2026-09-10'); assert.equal(task.date, f.task.date);
    assert.deepEqual(result.state, P.readPersonalPlanSourceContext(readerInput(f)).state);
  }
});
test('DR05 current P with missing/corrupt/unavailable source blocks with no state fallback', () => {
  const initial = overlay(fixture());
  for (const sourceRead of [{ ok: false, reason: 'read-error' }, { ok: false, reason: 'unavailable' }, { ok: true, raw: '{' }, { ok: true, raw: bytes({ version: 999 }) }]) {
    const result = display({ ...initial, sourceRead }); assert.equal(result.ok, false); assert.match(result.reason, /source-read-/);
  }
  const absent = display({ ...initial, sourceRead: empty() }); assert.equal(absent.ok, true, absent.reason); assert.equal(absent.sourceStatus, 'empty');
});
test('DR06 current P rejects unsupported membership and chain despite successful legacy decoding', () => {
  for (const kind of ['membership', 'chain']) {
    const f = overlay(fixture()); f.sourceRead = unsupported(f, kind);
    const result = display(f); assert.equal(result.ok, false); assert.equal(result.reason, 'source-' + kind + '-not-supported');
  }
});
test('DR07 current and Undo metadata corruption or legacy reserved collisions fail before any source renderer', () => {
  const f = overlay(fixture());
  for (const mutate of [cp => { cp.state[P.METADATA_KEY].version = 999; }, cp => { cp.undo[P.METADATA_KEY] = {}; },
    cp => { cp.state.timelineContextV1.legacySnapshot[P.METADATA_KEY] = {}; }, cp => { cp.legacyBaseRaw = '{'; }]) {
    const cp = clone(f.checkpoint); mutate(cp); assert.equal(display({ ...f, checkpoint: cp }).ok, false);
  }
});
test('DR08 Undo-only P retains explicit reachability while current no-P failure stays execution-only', () => {
  const first = overlay(fixture()); const f = overlay(first, draft => { draft.title = { mode: 'inherit' }; });
  assert.equal(own(f.checkpoint.state, P.METADATA_KEY), false); assert.equal(own(f.checkpoint.undo, P.METADATA_KEY), true);
  for (const sourceRead of [f.sourceRead, { ok: false, reason: 'read-error' }]) {
    const result = display({ ...f, sourceRead }); assert.equal(result.ok, true, result.reason); assert.equal(result.hasReachablePersonalUndo, true);
    assert.equal(result.mode, sourceRead.ok ? 'legacy-display' : 'personal-execution-only');
  }
});
test('DR09 malformed API packets, epochs and source discriminators cannot manufacture verified absence', () => {
  assert.equal(typeof U.projectPersonalPlanDisplay, 'function'); const base = displayInput(fixture());
  for (const input of [null, {}, { ...base, trusted: true }, { ...base, sourceRead: undefined }, { ...base, sourceRead: null },
    ...[-1, 0.5, Infinity, Number.MAX_SAFE_INTEGER + 1].map(sourceEpoch => ({ ...base, sourceEpoch })),
    ...[{ ok: true }, { ok: true, raw: undefined }, { ok: false, reason: 'corrupt' }, { ok: false, reason: 'read-error', raw: null }, { ok: true, raw: null, trusted: true }].map(sourceRead => ({ ...base, sourceRead }))]) {
    const result = U.projectPersonalPlanDisplay(input); assert.equal(result.ok, false); assert.equal(own(result, 'state'), false);
  }
});
test('DR10 getters, hidden properties, symbols, hostile arrays and cycles reject without invoking getters', () => {
  assert.equal(typeof U.projectPersonalPlanDisplay, 'function'); let invoked = 0;
  const make = () => clone(displayInput(fixture())); const inputs = [];
  for (const path of ['checkpoint', 'raw', 'memo', 'array']) {
    const value = make(); const target = path === 'checkpoint' ? value : path === 'raw' ? value.sourceRead : path === 'memo' ? value.checkpoint.state.tasks[0] : value.checkpoint.state.tasks;
    const key = path === 'checkpoint' ? path : path === 'raw' ? path : path === 'memo' ? path : '0';
    Object.defineProperty(target, key, { enumerable: true, get() { invoked += 1; return null; } }); inputs.push(value);
  }
  const hidden = make(); Object.defineProperty(hidden.checkpoint.state.legacyUnknown || hidden.checkpoint.state, 'hidden', { value: 1 }); inputs.push(hidden);
  const symbol = make(); symbol.checkpoint.state[Symbol('authority')] = true; inputs.push(symbol);
  const cycle = make(); cycle.checkpoint.state.cycle = cycle; inputs.push(cycle);
  const extraArray = make(); extraArray.checkpoint.state.tasks.extra = true; inputs.push(extraArray);
  const custom = make(); Object.setPrototypeOf(custom.checkpoint.state.tasks, Object.create(Array.prototype)); inputs.push(custom);
  for (const input of inputs) assert.equal(U.projectPersonalPlanDisplay(input).ok, false);
  assert.equal(invoked, 0);
});
test('DR11 repeated no-op display/candidate inspection retains exact raw inputs and grants no save authority', () => {
  const f = overlay(fixture()); const raw = bytes(f.checkpoint), source = f.sourceRead.raw;
  for (let i = 0; i < 3; i += 1) { assert.equal(display(f).ok, true); assert.equal(candidate(f).ok, true); }
  assert.equal(bytes(f.checkpoint), raw); assert.equal(f.sourceRead.raw, source);
});
test('DR12 source applying or undoing a valid candidate checks current-P and actual reachable Undo-P', () => {
  for (const undoOnly of [false, true]) {
    let f = overlay(fixture()); if (undoOnly) f = overlay(f, draft => { draft.title = { mode: 'inherit' }; });
    const undone = M.undoLocalSourceCandidate(f.store, NOW); assert.equal(undone.changed, true, undone.code);
    const after = { ...f, sourceRead: { ok: true, raw: bytes(undone.store) } };
    assert.equal(candidate(f, after).ok, true); assert.equal(candidate(after, f).ok, true);
  }
});
test('DR13 unsupported prospective source blocks both current-P and Undo-only-P before candidate use', () => {
  for (const undoOnly of [false, true]) for (const kind of ['membership', 'chain']) {
    let f = overlay(fixture()); if (undoOnly) f = overlay(f, draft => { draft.title = { mode: 'inherit' }; });
    const result = candidate(f, { ...f, sourceRead: unsupported(f, kind) }); assert.equal(result.ok, false);
    assert.equal(result.reason, 'source-' + kind + '-not-supported'); assert.equal(result.pair, 'candidate');
    assert.equal(result.snapshot, undoOnly ? 'undo' : 'current');
  }
});
test('DR14 source failure cannot be bypassed by a final candidate that removes current or Undo P', () => {
  for (const undoOnly of [false, true]) {
    const initial = fixture(); let f = overlay(initial); if (undoOnly) f = overlay(f, draft => { draft.title = { mode: 'inherit' }; });
    f.sourceRead = { ok: false, reason: 'read-error' };
    const result = candidate(f, initial); assert.equal(result.ok, false); assert.equal(result.pair, 'current');
    assert.equal(result.snapshot, undoOnly ? 'undo' : 'current');
  }
});
test('DR15 workspace completion and Undo preserve P plus raw timeline grouping fields', () => {
  const f = overlay(fixture());
  const changed = C.transitionCheckpoint(f.checkpoint, { type: 'complete', id: f.task.id, done: true, completedAt: NOW, now: NOW });
  assert.equal(changed.ok, true, changed.reason); assert.equal(changed.changed, true);
  const after = { ...f, checkpoint: changed.checkpoint }; assert.equal(candidate(f, after).ok, true);
  const undone = C.undoCheckpoint(after.checkpoint); assert.equal(undone.ok, true); assert.equal(candidate(after, { ...f, checkpoint: undone.checkpoint }).ok, true);
  const v = display(f).state;
  for (const task of f.checkpoint.state.tasks) {
    const row = v.tasks.find(value => value.id === task.id);
    for (const key of ['id', 'ref', 'date', 'time', 'done', 'flowId']) assert.equal(row[key], task[key]);
  }
  for (const view of ['today', 'week', 'month', 'undated']) {
    const before = C.projectGroups(f.checkpoint, view, '2026-09-05');
    const rawOnly = clone(f.checkpoint); delete rawOnly.state[P.METADATA_KEY];
    assert.deepEqual(C.projectGroups(rawOnly, view, '2026-09-05'), before);
  }
});
test('DR16 proper source/base pairs are not cross-combined during a valid new authored handoff', () => {
  const base = overlay(fixture());
  const handoff = M.makeHandoff('# 별도 원본\n## 준비\n- [ ] 새 항목', { draftId: 'display-new-draft', handoffId: 'display-new-handoff', sourceConfirmed: true, folderId: null });
  const next = C.transitionCheckpoint(base.checkpoint, { type: 'commit-authoring', handoff, now: NOW });
  assert.equal(next.ok, true, next.reason); assert.equal(next.changed, true);
  assert.equal(candidate(base, { ...base, checkpoint: next.checkpoint }).ok, true);
});
test('DR17 actual permanent-delete final source/workspace pair passes without matching final source to a deleted current target', () => {
  let f = overlay(fixture()); const trashed = C.transitionCheckpoint(f.checkpoint, { type: 'move-to-trash', kind: 'flow', id: f.flow.id, now: NOW });
  assert.equal(trashed.ok, true, trashed.reason); f = { ...f, checkpoint: trashed.checkpoint };
  const deleted = D.planPermanentDelete({ checkpoint: f.checkpoint, target: { kind: 'flow', id: f.flow.id, ref: f.flow.ref, savedCopyId: f.flow.savedCopyId, sourceFlowId: f.flow.sourceFlowId }, confirmed: true,
    expectedRevision: f.checkpoint.state.revision, sourceCandidateRaw: f.sourceRead.raw, now: NOW });
  assert.equal(deleted.ok, true, deleted.reason);
  assert.equal(candidate(f, { ...f, checkpoint: deleted.checkpoint, sourceRead: { ok: true, raw: deleted.sourceCandidateRaw } }).ok, true);
});
test('DR18 initial and final metadata combinations are independently checked, including newly created P', () => {
  const none = fixture(); const current = overlay(none); const undoOnly = overlay(current, draft => { draft.title = { mode: 'inherit' }; });
  const both = overlay(current, draft => { draft.title = { mode: 'override', value: '다음 개인 제목' }; });
  for (const before of [none, current, undoOnly, both]) for (const after of [none, current, undoOnly, both]) assert.equal(candidate(before, after).ok, true);
  assert.equal(candidate(none, { ...current, sourceRead: { ok: true, raw: '{' } }).ok, false);
  assert.equal(candidate(none, { ...undoOnly, sourceRead: { ok: false, reason: 'unavailable' } }).ok, false);
});
test('DR19 UMD no-P mode tolerates missing P but not missing source composer as a normal source display', () => {
  const f = fixture(); const noP = sandboxApi({ FlowPocPersonalPlanContext: null });
  assert.equal(display(f, noP).mode, 'legacy-display'); assert.equal(candidate(f, f, noP).ok, true);
  assert.equal(display(overlay(f), noP).ok, false);
  const noSource = sandboxApi({ FlowMeIntegratedPoc: { ...M, composeSourceCandidateState: undefined } });
  const result = display(f, noSource); assert.equal(result.ok, true); assert.equal(result.mode, 'personal-execution-only'); assert.equal(result.sourceStatus, 'unavailable');
  const blocked = display(overlay(f), noSource); assert.equal(blocked.ok, false); assert.equal(blocked.reason, 'source-read-unavailable');
});
test('DR20 cross-realm ordinary JSON objects and arrays pass while public APIs never touch ambient storage or DOM', () => {
  let accessed = 0; const api = sandboxApi({}, () => { accessed += 1; });
  const f = overlay(fixture()); const input = vm.runInNewContext('JSON.parse(' + JSON.stringify(bytes(displayInput(f))) + ')');
  const result = api.projectPersonalPlanDisplay(input); assert.equal(result.ok, true, result.reason); assert.equal(result.mode, 'personal-source-display');
  assert.equal(display(f, api).ok, true); assert.equal(candidate(f, f, api).ok, true); assert.equal(accessed, 0);
});
test('DR21 candidate packets reject missing/extra fields and nested descriptor attacks before getter invocation', () => {
  assert.equal(typeof U.inspectPersonalPlanDisplayCandidate, 'function'); const f = fixture();
  const make = () => ({ checkpoint: clone(f.checkpoint), candidateCheckpoint: clone(f.checkpoint), sourceRead: clone(f.sourceRead), candidateSourceRead: clone(f.sourceRead), sourceEpoch: 12 });
  let invoked = 0;
  for (const field of Object.keys(make())) {
    const missing = make(); delete missing[field]; assert.equal(U.inspectPersonalPlanDisplayCandidate(missing).ok, false);
    const getter = make(); Object.defineProperty(getter, field, { enumerable: true, get() { invoked += 1; return null; } }); assert.equal(U.inspectPersonalPlanDisplayCandidate(getter).ok, false);
  }
  const hidden = make(); Object.defineProperty(hidden.candidateSourceRead, 'raw', { enumerable: true, get() { invoked += 1; return null; } });
  assert.equal(U.inspectPersonalPlanDisplayCandidate(hidden).ok, false); assert.equal(U.inspectPersonalPlanDisplayCandidate({ ...make(), trusted: true }).ok, false); assert.equal(invoked, 0);
});
test('DR22 source/current/Undo corruption and wrong C/P dependencies cannot yield a candidate display certificate', () => {
  const f = overlay(fixture());
  const bad = clone(f.checkpoint); bad.undo = { version: 1 };
  assert.equal(candidate(f, { ...f, checkpoint: bad }).ok, false);
  for (const overrides of [{ FlowPocWorkspaceCheckpoint: null }, { FlowPocPersonalPlanContext: { ...P, VERSION: 999 } },
    { FlowPocPersonalPlanContext: { ...P, readPersonalPlanSourceContext: undefined } }]) assert.equal(candidate(f, f, sandboxApi(overrides)).ok, false);
});
