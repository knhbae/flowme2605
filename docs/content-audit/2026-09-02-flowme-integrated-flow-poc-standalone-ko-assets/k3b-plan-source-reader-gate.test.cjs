'use strict';

// Read-only characterization. These tests do not implement the proposed reader
// or certify source composition/edit/save support in the B1 UI.
const test = require('node:test');
const assert = require('node:assert/strict');
const { M, NOW, clone, own, sourceUpdateFixture } = require('./k3b-plan-lossless-gate.fixture.cjs');
const P = require('./personal-plan-context.js');

function readStore(raw) {
  return M.loadSourceCandidateStore({ getItem(key) { assert.equal(key, M.SOURCE_CANDIDATE_STORAGE_KEY); return raw; } });
}

function titleCandidate(state, flowRef) {
  const opened = P.inspectPlanContext({ state, flowRef });
  assert.equal(opened.ok, true, opened.reason);
  const draft = clone(opened.draft);
  draft.title = { mode: 'override', value: '새 개인 제목' };
  const result = P.planPersonalPlanState({ state, context: opened.context, draft, now: NOW });
  assert.equal(result.ok, true, result.reason);
  assert.equal(result.changed, true);
  return result;
}

test('R01 the existing source composer silently returns raw state for invalid or missing source store', t => {
  const { state } = sourceUpdateFixture();
  const before = JSON.stringify(state);
  for (const store of [undefined, null, { version: 999 }]) assert.equal(M.composeSourceCandidateState(state, store), state);
  assert.equal(JSON.stringify(state), before);
  t.diagnostic('GATE: a new bound reader must reject unavailable/invalid source authority instead of treating this fallback as verified composition.');
});

test('R02 actual source loader distinguishes confirmed absence, corrupt raw and a specific read error without writes', () => {
  const absent = readStore(null);
  assert.equal(absent.status, 'empty');
  assert.equal(absent.raw, null);
  assert.ok(absent.store);
  for (const raw of ['{', JSON.stringify({ ...absent.store, version: 999 })]) {
    const corrupt = readStore(raw);
    assert.equal(corrupt.status, 'corrupt');
    assert.equal(corrupt.raw, raw);
    assert.equal(corrupt.store, null);
  }
  let reads = 0;
  const failed = M.loadSourceCandidateStore({ getItem() { reads += 1; throw new Error('fixture-read-error'); } });
  assert.equal(failed.status, 'read-error');
  assert.equal(failed.store, null);
  assert.equal(reads, 1);
});

test('R03 a valid applied source version updates only the existing source view and preserves private/execution/raw fields', () => {
  const { state, flow, task, store } = sourceUpdateFixture();
  const before = JSON.stringify(state);
  const storeBefore = JSON.stringify(store);
  assert.equal(readStore(storeBefore).status, 'restored');
  const view = M.composeSourceCandidateState(state, store);
  const nextFlow = view.flows.find(value => value.ref === flow.ref);
  const nextTask = view.tasks.find(value => value.ref === task.ref);
  assert.equal(nextFlow.title, '새 원문 제목');
  assert.equal(nextTask.title, '내 접수 제목');
  assert.equal(nextTask.sourceTitle, '새 접수');
  assert.equal(nextTask.sourceDate, '2026-09-10');
  for (const key of ['memo', 'planDate', 'date', 'time', 'done', 'completedAt']) {
    assert.equal(own(nextTask, key), own(task, key), key);
    assert.deepEqual(nextTask[key], task[key], key);
  }
  assert.equal(JSON.stringify(state), before);
  assert.equal(JSON.stringify(store), storeBefore);
});

test('R04 source composition before raw Plan projection fails the intended raw-capture guard', t => {
  const { state, flow, store } = sourceUpdateFixture();
  const candidate = titleCandidate(state, flow.ref).state;
  const composed = M.composeSourceCandidateState(candidate, store);
  const result = P.projectPersonalPlanState(composed);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'stale-plan-baseline');
  assert.equal(P.projectPersonalPlanState(candidate).ok, true);
  t.diagnostic('GATE: validate raw capture first; do not recapture a source-composed view as authoritative Plan state.');
});

test('R05 Plan projection before source composition loses an explicit title when legacy sourceTitle is absent', t => {
  const { state, flow, store } = sourceUpdateFixture();
  delete flow.sourceTitle;
  const candidate = titleCandidate(state, flow.ref).state;
  const before = JSON.stringify(candidate);
  const plan = P.projectPersonalPlanState(candidate);
  assert.equal(plan.ok, true);
  assert.equal(plan.state.flows.find(value => value.ref === flow.ref).title, '새 개인 제목');
  const source = M.composeSourceCandidateState(plan.state, store);
  assert.equal(source.flows.find(value => value.ref === flow.ref).title, '새 원문 제목');
  assert.equal(candidate.personalPlanContextV1.entries[flow.ref].overlay.title, '새 개인 제목');
  assert.equal(own(candidate.flows.find(value => value.ref === flow.ref), 'sourceTitle'), false);
  assert.equal(JSON.stringify(candidate), before);
  t.diagnostic('GATE: naive Plan-then-source order overwrites the displayed overlay. No stored value was mutated in this characterization.');
});

test('R06 a raw-only Plan context cannot detect a changed separate source store by itself', t => {
  const { state, flow, store } = sourceUpdateFixture();
  const opened = P.inspectPlanContext({ state, flowRef: flow.ref });
  const before = JSON.stringify(state);
  assert.equal(opened.ok, true);
  const emptyRaw = JSON.stringify(M.initialSourceCandidateStore(NOW));
  const appliedRaw = JSON.stringify(store);
  assert.notEqual(emptyRaw, appliedRaw);
  assert.notEqual(M.composeSourceCandidateState(state, readStore(emptyRaw).store).flows.find(value => value.ref === flow.ref).title,
    M.composeSourceCandidateState(state, readStore(appliedRaw).store).flows.find(value => value.ref === flow.ref).title);
  const draft = clone(opened.draft);
  draft.title = { mode: 'override', value: '초안은 그대로' };
  const candidate = P.planPersonalPlanState({ state, context: opened.context, draft, now: NOW });
  assert.equal(candidate.ok, true);
  assert.equal(JSON.stringify(state), before);
  t.diagnostic('GATE: a separate exact source-read/epoch ticket is needed; this raw-only API does not claim source-store freshness.');
});

test('R07 a valid store for an absent Flow target is silently ignored by the existing composer', t => {
  const { store } = sourceUpdateFixture();
  const state = M.seedState();
  assert.equal(readStore(JSON.stringify(store)).status, 'restored');
  const view = M.composeSourceCandidateState(state, store);
  assert.deepEqual(view, state);
  assert.notEqual(view, state);
  t.diagnostic('GATE: successful store decoding does not bind its target to this workspace; exact target validation is required.');
});

test('R08 unchanged identities do not stop the existing composer applying a source store after raw source bytes drift', t => {
  const { state, flow, store } = sourceUpdateFixture();
  flow.rawText = flow.rawText.replace('원문 제목', '외부에서 바뀐 원문');
  flow.sourceFingerprint = M.fingerprint(flow.rawText);
  assert.deepEqual(M.validate(state), []);
  const before = JSON.stringify(state);
  const view = M.composeSourceCandidateState(state, store);
  assert.equal(view.flows.find(value => value.ref === flow.ref).title, '새 원문 제목');
  assert.equal(JSON.stringify(state), before);
  t.diagnostic('GATE: target identity is necessary but exact current base-source lineage must also match before composition.');
});

test('R09 a valid applied source addition is not materialized into standalone task membership by the existing composer', t => {
  const { state, flow } = sourceUpdateFixture();
  const prepared = M.prepareLocalSourceCandidateReview(M.initialSourceCandidateStore(NOW), state, flow.id, {
    now: NOW, createdAt: NOW, incomingRawText: flow.rawText + '\n- [ ] 후보에 추가된 할 일',
  });
  assert.equal(prepared.ok, true, prepared.reason);
  let store = prepared.store;
  for (const change of prepared.candidate.changes) {
    store = M.resolveLocalSourceCandidateChange(store, { candidateId: prepared.candidate.candidateId,
      changeId: change.changeId, resolution: 'use-incoming', now: NOW }).store;
  }
  const applied = M.applyLocalSourceCandidate(store, state, flow.id, prepared.candidate.candidateId, NOW);
  assert.equal(applied.changed, true, applied.code);
  const version = applied.store.effectiveVersions[flow.ref];
  const rawRefs = state.tasks.filter(task => task.flowId === flow.id).map(task => task.ref);
  assert.equal(version.projectedFlow.items.length, rawRefs.length + 1);
  const view = M.composeSourceCandidateState(state, applied.store);
  assert.deepEqual(view.tasks.filter(task => task.flowId === flow.id).map(task => task.ref), rawRefs);
  t.diagnostic('GATE: added source Items need a separate view membership capability, not a fabricated task.date/completion policy in this Plan reader.');
});
