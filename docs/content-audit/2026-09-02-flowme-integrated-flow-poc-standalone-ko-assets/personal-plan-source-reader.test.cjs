'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const P = require('./personal-plan-context.js');
const T = require('./timeline-context.js');
const { M, NOW, clone, own, legacyFixture, sourceUpdateFixture } = require('./k3b-plan-lossless-gate.fixture.cjs');

function input(f = sourceUpdateFixture(), raw = JSON.stringify(f.store)) {
  return { rawState: f.state, legacyBaseRaw: null, undo: null, sourceRead: { ok: true, raw }, sourceEpoch: 3 };
}
function read(value) {
  const before = JSON.stringify(value);
  const result = P.readPersonalPlanSourceContext(value);
  assert.equal(JSON.stringify(value), before);
  return result;
}
function good(value) { const result = read(value); assert.equal(result.ok, true, result.reason); return result; }
function findFlow(result, ref) { return result.state.flows.find(flow => flow.ref === ref); }
function findTask(result, ref) { return result.state.tasks.find(task => task.ref === ref); }
function withOverlay(f, change) {
  const opened = P.inspectPlanContext({ state: f.state, flowRef: f.flow.ref });
  assert.equal(opened.ok, true, opened.reason);
  const draft = clone(opened.draft);
  change(draft);
  const changed = P.planPersonalPlanState({ state: f.state, context: opened.context, draft, now: NOW });
  assert.equal(changed.ok, true, changed.reason);
  return { ...f, state: changed.state };
}
function appliedAddition() {
  const f = sourceUpdateFixture();
  const prepared = M.prepareLocalSourceCandidateReview(M.initialSourceCandidateStore(NOW), f.state, f.flow.id,
    { now: NOW, createdAt: NOW, incomingRawText: f.flow.rawText + '\n- [ ] 새 source item' });
  assert.equal(prepared.ok, true);
  let store = prepared.store;
  for (const change of prepared.candidate.changes) store = M.resolveLocalSourceCandidateChange(store,
    { candidateId: prepared.candidate.candidateId, changeId: change.changeId, resolution: 'use-incoming', now: NOW }).store;
  const applied = M.applyLocalSourceCandidate(store, f.state, f.flow.id, prepared.candidate.candidateId, NOW);
  assert.equal(applied.changed, true);
  return { ...f, store: applied.store };
}

test('S01 confirmed absent source keeps raw/P state and returns an immutable opaque read context', () => {
  const f = legacyFixture();
  const value = { rawState: f.checkpoint.state, legacyBaseRaw: f.raw, undo: f.checkpoint.undo, sourceRead: { ok: true, raw: null }, sourceEpoch: 0 };
  const result = good(value);
  assert.equal(result.viewOnly, true);
  assert.deepEqual(result.state, f.checkpoint.state);
  assert.equal(result.sourceDiagnostics.status, 'empty');
  assert.equal(result.sourceDiagnostics.appliedFlowRefs.length, 0);
  assert.ok(Object.isFrozen(result.state));
  assert.ok(Object.isFrozen(result.context));
  assert.deepEqual(Object.keys(result.context), ['version']);
  assert.equal(result.capabilities.flows[f.checkpoint.state.flows[0].ref].canEdit, true);
});

test('S02 actual applied source updates known source fields but blocks changed inherited normalization and preserves personal/execution data', () => {
  const f = sourceUpdateFixture();
  const result = good(input(f));
  assert.equal(findFlow(result, f.flow.ref).title, '새 원문 제목');
  assert.equal(findTask(result, f.task.ref).title, '내 접수 제목');
  assert.equal(findTask(result, f.task.ref).sourceDate, '2026-09-10');
  const cap = result.capabilities.flows[f.flow.ref];
  assert.equal(cap.canEdit, false);
  assert.equal(cap.title.reason, 'source-aware-normalization-required');
  assert.equal(cap.items[f.task.ref].memo.editable, true);
  assert.equal(cap.items[f.task.ref].schedule.editable, true);
  for (const key of ['memo', 'planDate', 'date', 'time', 'done', 'completedAt']) {
    assert.equal(own(findTask(result, f.task.ref), key), own(f.task, key));
    assert.deepEqual(findTask(result, f.task.ref)[key], f.task[key]);
  }
});

test('S03 explicit personal overlay is applied last without recapturing source-composed fields', () => {
  const f = withOverlay(sourceUpdateFixture(), draft => {
    draft.title = { mode: 'override', value: '나의 새 계획' };
    const item = Object.values(draft.items)[0];
    item.title = { mode: 'override', value: '명시 개인 제목' };
    item.memo = { mode: 'override', value: '' };
    item.schedule = { mode: 'fixed_date', date: '2026-09-08' };
  });
  const result = good(input(f));
  assert.equal(findFlow(result, f.flow.ref).title, '나의 새 계획');
  assert.equal(findTask(result, f.task.ref).title, '명시 개인 제목');
  assert.equal(findTask(result, f.task.ref).memo, '');
  assert.equal(findTask(result, f.task.ref).planDate, '2026-09-08');
  assert.deepEqual(result.state.personalPlanContextV1, f.state.personalPlanContextV1);
  assert.equal(P.projectPersonalPlanState(f.state).ok, true);
  assert.equal(P.projectPersonalPlanState(result.state).ok, false);
});

test('S04 absent legacy sourceTitle remains an existing-personal owner and cannot overwrite a displayed personal overlay', () => {
  let f = sourceUpdateFixture();
  delete f.flow.sourceTitle;
  delete f.task.sourceTitle;
  const noOverlay = good(input(f));
  assert.equal(findFlow(noOverlay, f.flow.ref).title, f.flow.title);
  assert.equal(findTask(noOverlay, f.task.ref).title, f.task.title);
  assert.equal(noOverlay.capabilities.flows[f.flow.ref].title.owner, 'existing-personal-baseline');
  assert.equal(noOverlay.capabilities.flows[f.flow.ref].title.reason, 'source-title-owner-unproven');
  f = withOverlay(f, draft => { draft.title = { mode: 'override', value: '개인 제목 유지' }; });
  assert.equal(findFlow(good(input(f)), f.flow.ref).title, '개인 제목 유지');
  assert.equal(own(f.state.flows.find(flow => flow.ref === f.flow.ref), 'sourceTitle'), false);
});

test('S05 pending/deferred candidates are not applied and invalid source payload is never treated as empty', () => {
  const f = sourceUpdateFixture();
  const staged = M.prepareLocalSourceCandidateReview(M.initialSourceCandidateStore(NOW), f.state, f.flow.id, { now: NOW, createdAt: NOW });
  for (const store of [staged.store, M.deferLocalSourceCandidate(staged.store, staged.candidate.candidateId, NOW).store]) {
    const result = good(input(f, JSON.stringify(store)));
    assert.equal(findFlow(result, f.flow.ref).title, f.flow.title);
    assert.equal(result.sourceDiagnostics.appliedFlowRefs.length, 0);
  }
  for (const raw of ['{', JSON.stringify({ version: 999 }), JSON.stringify({ ...f.store, trusted: true })]) {
    const result = read(input(f, raw));
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'source-read-corrupt');
  }
});

test('S06 sourceRead omission/null/error/unavailable and unknown fields are exact failures', () => {
  const base = input();
  for (const sourceRead of [undefined, null, { ok: true }, { ok: true, raw: null, trusted: true }, { ok: false, reason: 'other' }]) {
    const result = P.readPersonalPlanSourceContext({ ...base, sourceRead });
    assert.equal(result.ok, false);
  }
  for (const reason of ['read-error', 'unavailable']) {
    const result = read({ ...base, sourceRead: { ok: false, reason } });
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'source-read-' + reason);
  }
  const missing = { ...base }; delete missing.sourceRead;
  assert.equal(P.readPersonalPlanSourceContext(missing).ok, false);
  for (const sourceEpoch of [-1, 0.5, NaN, '3']) assert.equal(P.readPersonalPlanSourceContext({ ...base, sourceEpoch }).ok, false);
});

test('S07 valid source store with absent/duplicate/foreign-copy targets fails instead of partially composing', () => {
  const f = sourceUpdateFixture();
  const missing = read({ ...input(f), rawState: M.seedState() });
  assert.equal(missing.ok, false);
  assert.equal(missing.reason, 'source-target-missing');
  const duplicate = clone(f.state); duplicate.flows.push(clone(f.flow));
  assert.equal(read({ ...input(f), rawState: duplicate }).ok, false);
  const foreign = clone(f.state); foreign.flows.find(flow => flow.ref === f.flow.ref).savedCopyId = 'foreign';
  assert.equal(read({ ...input(f), rawState: foreign }).ok, false);
});

test('S08 same-identity raw source drift, handoff mismatch and recorded fingerprint tamper fail before source composition', () => {
  for (const change of [
    flow => { flow.rawText = flow.rawText.replace('원문 제목', '외부 변경'); flow.sourceFingerprint = M.fingerprint(flow.rawText); },
    flow => { flow.handoffId += '-different'; },
    flow => { flow.sourceFingerprint = 'wrong'; },
  ]) {
    const f = sourceUpdateFixture(); change(f.flow);
    assert.equal(read(input(f)).ok, false);
  }
});

test('S09 source added Item is explicitly unsupported rather than a successful partial task projection', () => {
  const result = read(input(appliedAddition()));
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'source-membership-not-supported');
});

test('S10 exact source bytes, raw state and observed epoch are all checked without creating a Plan candidate', () => {
  const value = input(); const result = good(value);
  assert.equal(P.checkPersonalPlanSourceContext(result.context, { rawState: value.rawState, sourceRead: value.sourceRead, sourceEpoch: value.sourceEpoch }).ok, true);
  const cases = [
    { rawState: value.rawState, sourceRead: { ok: true, raw: ' ' + value.sourceRead.raw }, sourceEpoch: value.sourceEpoch },
    { rawState: value.rawState, sourceRead: value.sourceRead, sourceEpoch: value.sourceEpoch + 1 },
    { rawState: { ...value.rawState, revision: value.rawState.revision + 1 }, sourceRead: value.sourceRead, sourceEpoch: value.sourceEpoch },
    { rawState: value.rawState, sourceRead: { ok: false, reason: 'read-error' }, sourceEpoch: value.sourceEpoch },
  ];
  for (const current of cases) assert.equal(P.checkPersonalPlanSourceContext(result.context, current).ok, false);
  assert.equal(own(result, 'undo'), false);
  assert.equal(own(result, 'candidate'), false);
});

test('S11 cloned/serialized/old raw Plan contexts are not valid source-read tokens', () => {
  const f = sourceUpdateFixture(); const value = input(f); const result = good(value);
  const current = { rawState: f.state, sourceRead: value.sourceRead, sourceEpoch: value.sourceEpoch };
  const rawToken = P.inspectPlanContext({ state: f.state, flowRef: f.flow.ref }).context;
  for (const token of [{ ...result.context }, clone(result.context), { version: 1 }, rawToken]) assert.equal(P.checkPersonalPlanSourceContext(token, current).ok, false);
  assert.equal(JSON.stringify(result.context).includes(f.flow.rawText), false);
  assert.equal(JSON.stringify(result.sourceDiagnostics).includes(f.flow.rawText), false);
});

test('S12 new context after a changed source read does not revive the original token or mutate stored metadata', () => {
  const f = sourceUpdateFixture(); const absent = input(f, null); const old = good(absent); const applied = input(f);
  const current = { rawState: f.state, sourceRead: applied.sourceRead, sourceEpoch: 4 };
  assert.equal(P.checkPersonalPlanSourceContext(old.context, current).ok, false);
  const next = good({ ...applied, sourceEpoch: 4 });
  assert.equal(P.checkPersonalPlanSourceContext(next.context, current).ok, true);
  assert.equal(P.checkPersonalPlanSourceContext(old.context, current).ok, false);
});

test('S13 nullable Plan presence and explicit empty/CRLF memo survive source reads', () => {
  for (const memo of ['', '  메모\r\n\t그대로  ']) for (const mode of ['absent', 'null', 'fixed']) {
    const f = sourceUpdateFixture(); f.task.memo = memo;
    if (mode === 'absent') delete f.task.planDate;
    else f.task.planDate = mode === 'null' ? null : f.task.sourceDate;
    const result = good(input(f)); const task = findTask(result, f.task.ref);
    assert.equal(task.memo, memo);
    assert.equal(own(task, 'planDate'), own(f.task, 'planDate'));
    assert.equal(task.planDate, f.task.planDate);
    assert.equal(task.date, f.task.date);
    if (mode === 'absent') assert.equal(result.capabilities.flows[f.flow.ref].items[f.task.ref].schedule.reason, 'source-aware-normalization-required');
  }
});

test('S14 same-date pin and unscheduled stay Plan-only, with unknown fields and complete before state untouched', () => {
  for (const schedule of [{ mode: 'fixed_date', date: '2026-09-08' }, { mode: 'unscheduled' }]) {
    let f = sourceUpdateFixture(); f.state.future = { values: ['b', null, 'a'], text: '  raw\r\n' };
    f = withOverlay(f, draft => { Object.values(draft.items)[0].schedule = schedule; });
    const result = good(input(f)); const task = findTask(result, f.task.ref);
    assert.equal(task.planDate, schedule.mode === 'fixed_date' ? schedule.date : null);
    assert.equal(task.date, f.task.date);
    assert.deepEqual(result.state.future, f.state.future);
    assert.deepEqual(result.state.personalPlanContextV1, f.state.personalPlanContextV1);
  }
});

test('S15 descriptors, malicious array prototypes and extra public options are rejected before getters/serialization hooks', () => {
  let invoked = 0; const base = input();
  const sourceRead = { ok: true }; Object.defineProperty(sourceRead, 'raw', { enumerable: true, get() { invoked += 1; return null; } });
  assert.equal(P.readPersonalPlanSourceContext({ ...base, sourceRead }).ok, false);
  const rawState = clone(base.rawState); const values = [1];
  Object.setPrototypeOf(values, Object.assign(Object.create(Array.prototype), { toJSON() { invoked += 1; return []; } }));
  rawState.future = values;
  assert.equal(P.readPersonalPlanSourceContext({ ...base, rawState }).ok, false);
  assert.equal(P.readPersonalPlanSourceContext({ ...base, trusted: true }).ok, false);
  assert.equal(invoked, 0);
});

test('S16 actual UMD reader has no ambient storage or DOM and returned cache/context values cannot be poisoned', () => {
  let accessed = 0; const sandbox = { FlowMeIntegratedPoc: M, FlowPocTimelineContext: T };
  for (const key of ['localStorage', 'document', 'window']) Object.defineProperty(sandbox, key, { get() { accessed += 1; throw new Error(key); } });
  vm.runInContext(fs.readFileSync(require.resolve('./personal-plan-context.js'), 'utf8'), vm.createContext(sandbox));
  const value = input(); const reader = sandbox.FlowPocPersonalPlanContext;
  const result = reader.readPersonalPlanSourceContext(value);
  assert.equal(result.ok, true, result.reason);
  assert.throws(() => { result.state.flows[0].title = 'poison'; }, TypeError);
  const next = reader.readPersonalPlanSourceContext(value);
  assert.equal(JSON.stringify(next.state), JSON.stringify(result.state));
  assert.equal(accessed, 0);
});

test('S17 raw-only Plan normalization and metadata strictness remain unchanged by the source reader', () => {
  const f = sourceUpdateFixture(); const readResult = good(input(f));
  assert.equal(readResult.capabilities.flows[f.flow.ref].canEdit, false);
  const raw = P.inspectPlanContext({ state: f.state, flowRef: f.flow.ref });
  const draft = clone(raw.draft); draft.title = { mode: 'override', value: f.flow.title };
  const result = P.planPersonalPlanState({ state: f.state, context: raw.context, draft, now: NOW });
  assert.equal(result.ok, true); assert.equal(result.changed, false);
  assert.equal(own(result.state, P.METADATA_KEY), false);
});

test('S18 raw source facts contradicting a valid candidate base are blocked without interpreting missing sourceTitle', () => {
  for (const change of [
    f => { f.flow.sourceTitle = '다른 원문'; },
    f => { f.task.sourceTitle = '다른 원문 할 일'; },
    f => { f.task.sourceDate = '2026-09-04'; },
  ]) { const f = sourceUpdateFixture(); change(f); assert.equal(read(input(f)).ok, false); }
});

function injectedReader(model) {
  const sandbox = { FlowMeIntegratedPoc: model, FlowPocTimelineContext: T };
  vm.runInContext(fs.readFileSync(require.resolve('./personal-plan-context.js'), 'utf8'), vm.createContext(sandbox));
  return sandbox.FlowPocPersonalPlanContext;
}

test('S19 missing decoder/runtime is unavailable and never grants a successful raw fallback', () => {
  const reader = injectedReader({ ...M, loadSourceCandidateStore: undefined });
  const result = reader.readPersonalPlanSourceContext(input());
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'source-read-unavailable');
});

test('S20 a valid but unproven source chain is blocked instead of treating different mine/base revision as the same source', () => {
  const f = sourceUpdateFixture();
  const runtime = require('./source-update-runtime.cjs').loadCommonJs();
  const flow = M.standaloneAuthoredFlowForSourceUpdate(f.state, f.flow.id);
  const current = clone(runtime.createPersonalWorkspacePocCurrentSourceFromAuthoredFlow(flow));
  current.revisionId += '-different-revision';
  const fixture = runtime.createPersonalWorkspacePocLocalFixtureEnvelope(flow, {
    current, incomingRawText: f.flow.rawText.replace('원문 제목', '다음 원문'), createdAt: NOW,
  });
  assert.equal(fixture.ok, true, fixture.reason);
  const staged = runtime.stagePersonalWorkspacePocSourceCandidate(M.initialSourceCandidateStore(NOW), fixture.envelope, current, NOW);
  assert.equal(staged.changed, true, staged.code);
  const result = read(input(f, JSON.stringify(staged.store)));
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'source-chain-not-supported');
});

test('S21 source composer mutations outside source fields are rejected and cannot mutate the caller raw state', () => {
  const value = input(); const before = JSON.stringify(value.rawState);
  const reader = injectedReader({ ...M, composeSourceCandidateState(state, store) {
    const view = M.composeSourceCandidateState(state, store);
    state.tasks[0].memo = 'dependency tried to mutate its input';
    view.tasks[0].date = '2026-09-09';
    return view;
  } });
  const result = reader.readPersonalPlanSourceContext(value);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'unexpected-source-view-change');
  assert.equal(JSON.stringify(value.rawState), before);
});

test('S22 applied source section membership expansion is explicitly blocked', () => {
  const f = sourceUpdateFixture();
  const prepared = M.prepareLocalSourceCandidateReview(M.initialSourceCandidateStore(NOW), f.state, f.flow.id, {
    now: NOW, createdAt: NOW, incomingRawText: f.flow.rawText + '\n## 새 구간\n- [ ] 새 구간의 항목',
  });
  assert.equal(prepared.ok, true, prepared.reason);
  let store = prepared.store;
  for (const change of prepared.candidate.changes) store = M.resolveLocalSourceCandidateChange(store,
    { candidateId: prepared.candidate.candidateId, changeId: change.changeId, resolution: 'use-incoming', now: NOW }).store;
  const applied = M.applyLocalSourceCandidate(store, f.state, f.flow.id, prepared.candidate.candidateId, NOW);
  assert.equal(applied.changed, true, applied.code);
  const result = read(input(f, JSON.stringify(applied.store)));
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'source-membership-not-supported');
});

test('S23 an accepted old invalid Plan baseline remains readable but cannot claim Plan edit capability', () => {
  const f = sourceUpdateFixture(); f.task.planDate = 'not-a-date';
  assert.deepEqual(M.validate(f.state), []);
  const result = good(input(f));
  assert.equal(findTask(result, f.task.ref).planDate, 'not-a-date');
  assert.equal(result.capabilities.flows[f.flow.ref].canEdit, false);
  assert.equal(result.capabilities.flows[f.flow.ref].reason, 'invalid-plan-baseline');
});

test('S24 source whitespace-only byte drift and title/value serialization cannot bypass freshness', () => {
  const value = input(); const result = good(value);
  const current = { rawState: value.rawState, sourceRead: value.sourceRead, sourceEpoch: value.sourceEpoch };
  const sourceRead = { ok: true };
  let calls = 0; Object.defineProperty(sourceRead, 'raw', { enumerable: true, get() { calls += 1; return value.sourceRead.raw; } });
  assert.equal(P.checkPersonalPlanSourceContext(result.context, { ...current, sourceRead }).ok, false);
  assert.equal(calls, 0);
  assert.equal(P.checkPersonalPlanSourceContext(result.context, { ...current, sourceRead: { ok: true, raw: JSON.stringify(JSON.parse(value.sourceRead.raw), null, 2) } }).ok, false);
});

test('S25 valid raw Plan metadata still fails reserved legacy collision in the new bound entry', () => {
  const f = legacyFixture(); const old = JSON.parse(f.raw); old.undo.personalPlanContextV1 = { future: true };
  const result = read({ rawState: f.checkpoint.state, legacyBaseRaw: JSON.stringify(old), undo: f.checkpoint.undo,
    sourceRead: { ok: true, raw: null }, sourceEpoch: 0 });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'legacy-reserved-field-collision');
});
