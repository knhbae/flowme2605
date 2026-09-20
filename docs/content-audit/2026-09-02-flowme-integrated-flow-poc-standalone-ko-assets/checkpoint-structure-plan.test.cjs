'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('./model.js');
const P = require('./personal-plan-context.js');
const C = require('./workspace-checkpoint.js');
const NOW = '2026-09-05T13:52:00.000Z';
const TYPE = 'commit-source-bound-personal-plan-structure-context';
const copy = value => JSON.parse(JSON.stringify(value));
const bytes = value => JSON.stringify(value);
function fixture() {
  let state = M.seedState();
  const flows = [];
  for (const id of ['first', 'second']) {
    const handoff = M.makeHandoff('# 내 계획\n## 첫 구간\n- [ ] A1\n- [ ] A2\n## 두 번째\n- [ ] B1',
      { draftId: 'c-structure-draft-' + id, handoffId: 'c-structure-handoff-' + id, sourceConfirmed: true, folderId: null });
    const changed = M.apply(state, { type: 'commit-authoring', handoff, now: NOW });
    assert.equal(changed.changed, true, changed.error);
    state = changed.state;
    flows.push(state.flows.find(flow => flow.handoffId === handoff.handoffId));
  }
  state.unrecognized = { exact: ' \r\n\t ', values: [0, false, null] };
  const legacy = ' \r\n' + bytes({ version: 1, state, undo: null }) + '\r\n ';
  const converted = C.fromLegacy(legacy);
  assert.equal(converted.ok, true, converted.reason);
  const observation = { flowRef: flows[0].ref, sourceRead: { ok: true, raw: bytes(M.initialSourceCandidateStore(NOW)) }, sourceEpoch: 5 };
  assert.equal(P.readPersonalPlanSourceContext({ rawState: converted.checkpoint.state, legacyBaseRaw: legacy,
    undo: null, sourceRead: observation.sourceRead, sourceEpoch: observation.sourceEpoch }).ok, true);
  return { checkpoint: converted.checkpoint, flow: flows[0], other: flows[1], observation };
}
function open(f, flowRef = f.flow.ref) {
  assert.equal(typeof C.inspectSourceBoundPersonalPlanStructureContext, 'function', 'B2 C feature unavailable');
  const result = C.inspectSourceBoundPersonalPlanStructureContext(f.checkpoint, { ...f.observation, flowRef });
  assert.equal(result.ok, true, result.reason);
  return result;
}
function request(f, opened, mutate = draft => draft.orderedItemRefs.reverse()) {
  const draft = copy(opened.draft); mutate(draft);
  return { type: TYPE, context: opened.context, draft, sourceRead: f.observation.sourceRead,
    sourceEpoch: f.observation.sourceEpoch, now: NOW };
}
function run(f, action) {
  const before = bytes(f.checkpoint), observed = bytes(f.observation);
  const result = C.transitionCheckpoint(f.checkpoint, action);
  assert.equal(bytes(f.checkpoint), before); assert.equal(bytes(f.observation), observed);
  if (!result.changed) assert.equal(result.checkpoint, f.checkpoint);
  else {
    assert.equal(result.ok, true, result.reason);
    assert.equal(result.checkpoint.state.revision, f.checkpoint.state.revision + 1);
    assert.deepEqual(result.checkpoint.undo, f.checkpoint.state);
    assert.equal(result.checkpoint.legacyBaseRaw, f.checkpoint.legacyBaseRaw);
    for (const key of ['flows', 'tasks', 'orders', 'timelineContextV1', 'unrecognized']) {
      assert.deepEqual(result.checkpoint.state[key], f.checkpoint.state[key], key + ' must remain exact');
    }
    assert.equal(C.validateCheckpoint(result.checkpoint).ok, true);
  }
  return result;
}
function reject(f, action) {
  const result = run(f, action);
  assert.equal(result.ok, false, 'invalid action must fail closed'); assert.equal(result.changed, false);
  return result;
}

test('B2C01 real structural candidate changes one revision with exact full before and no raw changes', () => {
  const f = fixture(), opened = open(f), action = request(f, opened, draft => {
    draft.sectionTitles['step-1'] = { mode: 'override', value: '내 구간' };
    draft.orderedItemRefs = [draft.orderedItemRefs[0], draft.orderedItemRefs[2], draft.orderedItemRefs[1]];
  });
  const result = run(f, action); assert.equal(result.changed, true, result.reason);
  assert.equal(result.checkpoint.version, 2); assert.equal(C.VERSION, 2);
  assert.equal(result.checkpoint.state[P.METADATA_KEY].version, 2);
  assert.deepEqual(result.checkpoint.state[P.METADATA_KEY].entries[f.flow.ref].structure.orderedItemRefs, action.draft.orderedItemRefs);
});

test('B2C02 inherited same order is identity no-op and explicit reset restores no-P without a migration', () => {
  const f = fixture(), opened = open(f);
  const noop = run(f, request(f, opened, () => {})); assert.equal(noop.ok, true); assert.equal(noop.changed, false);
  const first = run(f, request(f, opened)); assert.equal(first.changed, true, first.reason);
  const next = { ...f, checkpoint: first.checkpoint }, reopened = open(next);
  const reset = run(next, request(next, reopened, draft => { draft.orderedItemRefs = opened.draft.orderedItemRefs.slice(); }));
  assert.equal(reset.changed, true, reset.reason);
  assert.equal(Object.hasOwn(reset.checkpoint.state, P.METADATA_KEY), false);
  assert.deepEqual(reset.checkpoint.undo, first.checkpoint.state);
});

test('B2C03 structure C registry rejects raw P read B1 and cloned tokens before a candidate', () => {
  const f = fixture(), opened = open(f), action = request(f, opened);
  const b1 = C.inspectSourceBoundPersonalPlanContext(f.checkpoint, f.observation); assert.equal(b1.ok, true);
  const read = P.readPersonalPlanSourceContext({ rawState: f.checkpoint.state, legacyBaseRaw: f.checkpoint.legacyBaseRaw,
    undo: f.checkpoint.undo, sourceRead: f.observation.sourceRead, sourceEpoch: f.observation.sourceEpoch });
  assert.equal(read.ok, true);
  const raw = P.inspectPersonalPlanStructureEditor({ sourceContext: read.context, flowRef: f.flow.ref }); assert.equal(raw.ok, true);
  for (const context of [{}, copy(opened.context), read.context, b1.context, raw.context]) reject(f, { ...action, context });
  assert.equal(run(f, action).changed, true);
});

test('B2C04 whole checkpoint changes in current Undo or exact legacy raw make genuine structure token stale', () => {
  const f = fixture(), opened = open(f), action = request(f, opened);
  for (const change of [packet => { packet.undo = copy(packet.state); },
    packet => { packet.state.unrecognized.exact += 'x'; }, packet => { packet.legacyBaseRaw += ' '; }]) {
    const packet = copy(f.checkpoint); change(packet);
    assert.equal(C.validateCheckpoint(packet).ok, true, 'drift packet itself must be valid');
    reject({ ...f, checkpoint: packet }, action);
  }
  assert.equal(run(f, action).changed, true);
});

test('B2C05 source exact bytes epoch read errors cannot reuse an opened structure candidate', () => {
  const f = fixture(), opened = open(f), action = request(f, opened);
  for (const patch of [{ sourceRead: { ok: true, raw: ' ' + action.sourceRead.raw } },
    { sourceEpoch: action.sourceEpoch + 1 }, { sourceRead: { ok: false, reason: 'read-error' } }]) reject(f, { ...action, ...patch });
  assert.equal(run(f, action).changed, true);
});

test('B2C06 observation action and nested draft getters are never executed', () => {
  const f = fixture(), opened = open(f), action = request(f, opened); let calls = 0;
  const unsafe = () => { calls += 1; throw new Error('must not run'); };
  const observation = { ...f.observation }; Object.defineProperty(observation, 'flowRef', { enumerable: true, get: unsafe });
  assert.equal(C.inspectSourceBoundPersonalPlanStructureContext(f.checkpoint, observation).ok, false);
  for (const key of ['type', 'context', 'draft']) {
    const value = { ...action }; Object.defineProperty(value, key, { enumerable: true, get: unsafe }); reject(f, value);
  }
  const draft = copy(action.draft); Object.defineProperty(draft, 'orderedItemRefs', { enumerable: true, get: unsafe });
  reject(f, { ...action, draft }); reject(f, { ...action, extra: true });
  assert.equal(calls, 0); assert.equal(run(f, action).changed, true);
});

test('B2C07 malformed structural metadata in current or reachable Undo is rejected on inspect transition and Undo', () => {
  const f = fixture(), first = run(f, request(f, open(f))); assert.equal(first.changed, true, first.reason);
  for (const target of ['state', 'undo']) {
    const packet = copy(first.checkpoint);
    if (target === 'undo') packet.undo = copy(packet.state);
    packet[target][P.METADATA_KEY].entries[f.flow.ref].structure.orderedItemRefs.pop();
    assert.equal(C.validateCheckpoint(packet).ok, false);
    assert.equal(C.inspectSourceBoundPersonalPlanStructureContext(packet, f.observation).ok, false);
    reject({ ...f, checkpoint: packet }, request(f, open(f)));
    const undone = C.undoCheckpoint(packet); assert.equal(undone.ok, false); assert.equal(undone.changed, false);
    assert.equal(undone.checkpoint, packet);
  }
});

test('B2C08 explicit v1 to v2 upgrade keeps neighbor entry and restores exact v1 full snapshot on Undo', () => {
  const initial = fixture();
  const core = C.inspectSourceBoundPersonalPlanContext(initial.checkpoint, { ...initial.observation, flowRef: initial.other.ref });
  assert.equal(core.ok, true); const draft = copy(core.draft);
  draft.items[Object.keys(draft.items)[0]].memo = { mode: 'override', value: '  이웃 개인 메모\r\n\t  ' };
  const first = C.transitionCheckpoint(initial.checkpoint, { type: 'commit-source-bound-personal-plan-context',
    context: core.context, draft, sourceRead: initial.observation.sourceRead, sourceEpoch: initial.observation.sourceEpoch, now: NOW });
  assert.equal(first.changed, true, first.reason);
  const f = { ...initial, checkpoint: first.checkpoint }; assert.equal(f.checkpoint.state[P.METADATA_KEY].version, 1);
  const result = run(f, request(f, open(f))); assert.equal(result.changed, true, result.reason);
  assert.deepEqual(result.checkpoint.state[P.METADATA_KEY].entries[f.other.ref], f.checkpoint.state[P.METADATA_KEY].entries[f.other.ref]);
  const undone = C.undoCheckpoint(result.checkpoint); assert.equal(undone.changed, true, undone.reason);
  const expected = copy(f.checkpoint.state); expected.updatedAt = M.TODAY + 'T12:00:00.000Z';
  assert.deepEqual(undone.checkpoint.state, expected); assert.equal(undone.checkpoint.undo, null);
});

test('B2C09 same local section IDs in another C-issued copy cannot own this draft', () => {
  const f = fixture(), first = open(f), second = open(f, f.other.ref);
  assert.deepEqual(Object.keys(first.draft.sectionTitles), Object.keys(second.draft.sectionTitles));
  const action = request(f, first); reject(f, { ...action, context: second.context });
  assert.equal(run(f, action).changed, true); assert.equal(run(f, request(f, second)).changed, true);
});

test('B2C10 B1 entry cannot consume a structure draft and core edit cannot drop existing structure', () => {
  const f = fixture(), opened = open(f);
  const core = C.inspectSourceBoundPersonalPlanContext(f.checkpoint, f.observation); assert.equal(core.ok, true);
  reject(f, { ...request(f, opened), type: 'commit-source-bound-personal-plan-context', context: core.context });
  const first = run(f, request(f, opened)); assert.equal(first.changed, true, first.reason);
  const next = { ...f, checkpoint: first.checkpoint }, again = C.inspectSourceBoundPersonalPlanContext(next.checkpoint, next.observation);
  assert.equal(again.ok, true, again.reason);
  const draft = copy(again.draft); draft.title = { mode: 'override', value: '구조를 유지한 개인 제목' };
  const result = run(next, { type: 'commit-source-bound-personal-plan-context', context: again.context, draft,
    sourceRead: f.observation.sourceRead, sourceEpoch: f.observation.sourceEpoch, now: NOW });
  assert.equal(result.changed, true, result.reason);
  assert.deepEqual(result.checkpoint.state[P.METADATA_KEY].entries[f.flow.ref].structure,
    first.checkpoint.state[P.METADATA_KEY].entries[f.flow.ref].structure);
});
