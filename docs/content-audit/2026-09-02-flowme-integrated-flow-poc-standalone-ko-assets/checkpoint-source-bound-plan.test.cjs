'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const P = require('./personal-plan-context.js');
const T = require('./timeline-context.js');
const { M, C, NOW, clone, own, legacyFixture, sourceUpdateFixture } = require('./k3b-plan-lossless-gate.fixture.cjs');
const bytes = value => JSON.stringify(value);
function fixture() {
  const f = sourceUpdateFixture();
  const raw = ' \r\n' + bytes({ version: 1, state: f.state, undo: null }) + '\r\n ';
  const converted = C.fromLegacy(raw); assert.equal(converted.ok, true, converted.reason);
  return { ...f, checkpoint: converted.checkpoint, observation: { flowRef: f.flow.ref,
    sourceRead: { ok: true, raw: bytes(f.store) }, sourceEpoch: 7 } };
}
function open(f, options) {
  const result = C.inspectSourceBoundPersonalPlanContext(f.checkpoint, f.observation, options);
  assert.equal(result.ok, true, result.reason); return result;
}
function action(f, opened, mutate = () => {}) {
  const draft = clone(opened.draft); mutate(draft);
  return { type: 'commit-source-bound-personal-plan-context', context: opened.context, draft,
    sourceRead: f.observation.sourceRead, sourceEpoch: f.observation.sourceEpoch, now: NOW };
}
function transition(f, request, options) {
  const before = bytes(f.checkpoint); const source = bytes(f.store);
  const result = C.transitionCheckpoint(f.checkpoint, request, options);
  assert.equal(bytes(f.checkpoint), before); assert.equal(bytes(f.store), source);
  if (result.changed) {
    assert.equal(result.ok, true, result.reason);
    assert.equal(result.checkpoint.state.revision, f.checkpoint.state.revision + 1);
    assert.deepEqual(result.checkpoint.undo, f.checkpoint.state);
    assert.equal(result.checkpoint.legacyBaseRaw, f.checkpoint.legacyBaseRaw);
    assert.deepEqual(result.checkpoint.state.timelineContextV1, f.checkpoint.state.timelineContextV1);
    assert.equal(C.validateCheckpoint(result.checkpoint).ok, true);
  } else assert.equal(result.checkpoint, f.checkpoint);
  return result;
}
function view(f, checkpoint) {
  const result = P.readPersonalPlanSourceContext({ rawState: checkpoint.state, legacyBaseRaw: checkpoint.legacyBaseRaw,
    undo: checkpoint.undo, sourceRead: f.observation.sourceRead, sourceEpoch: f.observation.sourceEpoch });
  assert.equal(result.ok, true, result.reason); return result.state;
}

test('B1CS01 verified source A to B then explicit A becomes one raw-only checkpoint candidate with full Undo', () => {
  const f = fixture(); const opened = open(f);
  assert.notEqual(opened.context, opened.sourceContext);
  const result = transition(f, action(f, opened, draft => { draft.title = { mode: 'override', value: f.flow.title }; }));
  assert.equal(result.changed, true, result.reason);
  assert.equal(result.checkpoint.state[P.METADATA_KEY].entries[f.flow.ref].overlay.title, f.flow.title);
  assert.deepEqual(result.checkpoint.state.flows, f.checkpoint.state.flows);
  assert.deepEqual(result.checkpoint.state.tasks, f.checkpoint.state.tasks);
  assert.equal(view(f, result.checkpoint).flows.find(flow => flow.ref === f.flow.ref).title, f.flow.title);
});

test('B1CS02 explicit current inherited B and untouched drafts are checkpoint identity no-ops', () => {
  const f = fixture(); const opened = open(f);
  for (const change of [() => {}, draft => { draft.title = { mode: 'override', value: '새 원문 제목' }; }]) {
    const result = transition(f, action(f, opened, change));
    assert.equal(result.ok, true, result.reason); assert.equal(result.changed, false);
    assert.equal(own(f.checkpoint.state, P.METADATA_KEY), false);
  }
});

test('B1CS03 Item empty/CRLF memo and fixed-date intent remain Plan-only and survive checkpoint reload', () => {
  for (const memo of ['', '  메모\r\n\t그대로  ']) {
    const f = fixture(); const opened = open(f);
    const result = transition(f, action(f, opened, draft => {
      draft.items[f.task.ref].memo = { mode: 'override', value: memo };
      draft.items[f.task.ref].schedule = { mode: 'fixed_date', date: '2026-09-08' };
    }));
    assert.equal(result.changed, true, result.reason);
    const reloaded = JSON.parse(bytes(result.checkpoint));
    const task = view(f, reloaded).tasks.find(item => item.ref === f.task.ref);
    assert.equal(task.memo, memo); assert.equal(task.planDate, '2026-09-08');
    assert.equal(task.date, f.task.date); assert.equal(task.done, f.task.done);
  }
});

test('B1CS04 inherit removes only the selected overlay and checkpoint Undo restores the exact previous snapshot', () => {
  const f = fixture(); const opened = open(f);
  const first = transition(f, action(f, opened, draft => { draft.title = { mode: 'override', value: f.flow.title }; }));
  assert.equal(first.changed, true, first.reason);
  const next = { ...f, checkpoint: first.checkpoint };
  const inherited = transition(next, action(next, open(next), draft => { draft.title = { mode: 'inherit' }; }));
  assert.equal(inherited.changed, true, inherited.reason);
  assert.equal(own(inherited.checkpoint.state, P.METADATA_KEY), false);
  assert.equal(view(f, inherited.checkpoint).flows.find(flow => flow.ref === f.flow.ref).title, '새 원문 제목');
  const undone = C.undoCheckpoint(inherited.checkpoint);
  assert.equal(undone.ok, true, undone.reason);
  assert.deepEqual({ ...undone.checkpoint.state, updatedAt: first.checkpoint.state.updatedAt }, first.checkpoint.state);
});

test('B1CS05 original raw-only Plan entry retains equal-raw no-op and lazy old checkpoint compatibility', () => {
  const f = fixture(); const opened = C.inspectPersonalPlanContext(f.checkpoint, f.flow.ref);
  assert.equal(opened.ok, true, opened.reason); const draft = clone(opened.draft);
  draft.title = { mode: 'override', value: f.flow.title };
  const result = transition(f, { type: 'commit-personal-plan-context', context: opened.context, draft, now: NOW });
  assert.equal(result.ok, true); assert.equal(result.changed, false);
  assert.equal(C.validateCheckpoint(f.checkpoint, { personalPlan: null }).ok, true);
});

test('B1CS06 source absence is explicit while read failure, omission, corrupt and unknown options cannot authorize opening', () => {
  const f = fixture();
  const absent = C.inspectSourceBoundPersonalPlanContext(f.checkpoint, { ...f.observation, sourceRead: { ok: true, raw: null } });
  assert.equal(absent.ok, true, absent.reason);
  for (const sourceRead of [null, undefined, { ok: false, reason: 'read-error' }, { ok: false, reason: 'unavailable' },
    { ok: true, raw: '{' }, { ok: true, raw: bytes({ version: 999 }) }]) {
    assert.equal(C.inspectSourceBoundPersonalPlanContext(f.checkpoint, { ...f.observation, sourceRead }).ok, false);
  }
  assert.equal(C.inspectSourceBoundPersonalPlanContext(f.checkpoint, { ...f.observation, trusted: true }).ok, false);
});

test('B1CS07 exact source bytes, observed epoch and raw changes invalidate a previously opened source-bound candidate', () => {
  const f = fixture(); const opened = open(f);
  const request = action(f, opened, draft => { draft.title = { mode: 'override', value: '개인 C' }; });
  for (const patch of [{ sourceRead: { ok: true, raw: ' ' + f.observation.sourceRead.raw } }, { sourceEpoch: 8 },
    { sourceRead: { ok: false, reason: 'read-error' } }]) {
    const result = transition(f, { ...request, ...patch }); assert.equal(result.ok, false); assert.equal(result.changed, false);
  }
  const drift = { ...f, checkpoint: clone(f.checkpoint) }; drift.checkpoint.state.revision += 1;
  assert.equal(transition(drift, request).ok, false);
});

test('B1CS08 source/read/raw/clone tokens are distinct and action getters never execute', () => {
  const f = fixture(); const opened = open(f); let invoked = 0;
  const request = action(f, opened, draft => { draft.title = { mode: 'override', value: '개인 C' }; });
  const raw = C.inspectPersonalPlanContext(f.checkpoint, f.flow.ref);
  for (const context of [opened.sourceContext, raw.context, clone(opened.context), {}]) assert.equal(transition(f, { ...request, context }).ok, false);
  for (const name of ['type', 'context', 'draft', 'sourceRead', 'sourceEpoch', 'now']) {
    const bad = { ...request }; Object.defineProperty(bad, name, { enumerable: true, get() { invoked += 1; return request[name]; } });
    assert.equal(transition(f, bad).ok, false);
  }
  const observation = { ...f.observation }; Object.defineProperty(observation, 'sourceRead', { enumerable: true, get() { invoked += 1; return null; } });
  assert.equal(C.inspectSourceBoundPersonalPlanContext(f.checkpoint, observation).ok, false);
  assert.equal(invoked, 0);
});

test('B1CS09 checkpoint current/Undo/legacy validation cannot be bypassed through the new inspector', () => {
  const base = legacyFixture(); const f = { ...fixture(), checkpoint: base.checkpoint };
  f.observation = { flowRef: base.checkpoint.state.flows[0].ref, sourceRead: { ok: true, raw: null }, sourceEpoch: 0 };
  for (const mutate of [cp => { cp.state.timelineContextV1.records = [{}]; }, cp => { cp.undo.timelineContextV1.legacySnapshot.personalPlanContextV1 = {}; },
    cp => { cp.legacyBaseRaw += 'other'; }]) {
    const cp = clone(f.checkpoint); mutate(cp);
    assert.equal(C.inspectSourceBoundPersonalPlanContext(cp, f.observation).ok, false);
  }
});

test('B1CS10 absent source-specific dependencies block only the new entry and new action', () => {
  const f = fixture(); const opened = open(f); const request = action(f, opened, draft => { draft.title = { mode: 'override', value: '개인 C' }; });
  for (const name of ['readPersonalPlanSourceContext', 'checkPersonalPlanSourceContext', 'inspectPersonalPlanSourceEditor', 'planPersonalPlanSourceState']) {
    const options = { personalPlan: { ...P, [name]: undefined } };
    assert.equal(C.validateCheckpoint(f.checkpoint, options).ok, true);
    assert.equal(C.inspectPersonalPlanContext(f.checkpoint, f.flow.ref, options).ok, true);
    assert.equal(C.inspectSourceBoundPersonalPlanContext(f.checkpoint, f.observation, options).ok, false);
    assert.equal(transition(f, request, options).ok, false);
  }
});

test('B1CS11 same-owner Item source A to B then explicit A is retained without changing original raw Item', () => {
  const f = fixture();
  f.checkpoint.state.tasks.find(task => task.ref === f.task.ref).title = f.task.sourceTitle;
  const opened = open(f);
  const result = transition(f, action(f, opened, draft => { draft.items[f.task.ref].title = { mode: 'override', value: f.task.sourceTitle }; }));
  assert.equal(result.changed, true, result.reason);
  assert.deepEqual(result.checkpoint.state.tasks, f.checkpoint.state.tasks);
  assert.equal(view(f, result.checkpoint).tasks.find(task => task.ref === f.task.ref).title, f.task.sourceTitle);
});

test('B1CS12 new C UMD entry delegates to actual P without ambient storage or DOM', () => {
  let accessed = 0; const sandbox = { FlowMeIntegratedPoc: M, FlowPocTimelineContext: T, FlowPocPersonalPlanContext: P };
  for (const key of ['localStorage', 'document', 'window']) Object.defineProperty(sandbox, key, { get() { accessed += 1; throw new Error(key); } });
  vm.runInContext(fs.readFileSync(require.resolve('./workspace-checkpoint.js'), 'utf8'), vm.createContext(sandbox));
  const f = fixture(); const result = sandbox.FlowPocWorkspaceCheckpoint.inspectSourceBoundPersonalPlanContext(f.checkpoint, f.observation);
  assert.equal(result.ok, true, result.reason); assert.equal(accessed, 0);
});
