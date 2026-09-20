'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const P = require('./personal-plan-context.js');
const T = require('./timeline-context.js');
const { M, NOW, clone, own, sourceUpdateFixture } = require('./k3b-plan-lossless-gate.fixture.cjs');
const SCOPE = 'captured-source-draft';

function fixture(api = P) {
  const f = sourceUpdateFixture(); f.task.title = f.task.sourceTitle;
  const sourceRead = { ok: true, raw: JSON.stringify(f.store) };
  const source = api.readPersonalPlanSourceContext({ rawState: f.state, legacyBaseRaw: null, undo: null, sourceRead, sourceEpoch: 7 });
  assert.equal(source.ok, true, source.reason);
  const editor = api.inspectPersonalPlanSourceEditor({ sourceContext: source.context, flowRef: f.flow.ref });
  assert.equal(editor.ok, true, editor.reason);
  return { ...f, sourceRead, source, editor };
}
function validate(f, draft = f.editor.draft, extra = {}) {
  return P.validateCapturedPersonalPlanSourceDraft({ context: f.editor.context, draft, ...extra });
}
function plan(f, draft, extra = {}) {
  return P.planPersonalPlanSourceState({ context: f.editor.context, rawState: f.state,
    sourceRead: f.sourceRead, sourceEpoch: 7, draft, now: NOW, ...extra });
}
function assertValid(result) { assert.deepEqual(result, { ok: true, scope: SCOPE }); }
function assertInvalid(result, reason) {
  assert.deepEqual(Object.keys(result).sort(), ['ok', 'reason', 'scope']);
  assert.equal(result.ok, false); assert.equal(result.scope, SCOPE);
  if (reason) assert.equal(result.reason, reason);
}

test('V01 captured validity returns only the fixed scope and never creates a candidate, revision, Undo or new context', () => {
  const f = fixture(); const before = JSON.stringify(f.state); const draftBefore = JSON.stringify(f.editor.draft);
  assertValid(validate(f)); assertValid(validate(f));
  assert.equal(JSON.stringify(f.state), before); assert.equal(JSON.stringify(f.editor.draft), draftBefore);
  assert.equal(JSON.stringify(f.editor.context), '{"version":1}');
});

for (const target of ['flow', 'item']) {
  test(`V02-${target} captured A/B/inherit validity agrees with the actual bound planner without normalizing the caller draft`, () => {
    const f = fixture();
    const a = target === 'flow' ? f.flow.title : f.task.title;
    const b = target === 'flow' ? '새 원문 제목' : '새 접수';
    for (const title of [{ mode: 'override', value: a }, { mode: 'override', value: b }, { mode: 'inherit' }]) {
      const draft = clone(f.editor.draft);
      if (target === 'flow') draft.title = title; else draft.items[f.task.ref].title = title;
      const before = JSON.stringify(draft); assertValid(validate(f, draft));
      assert.equal(plan(f, draft).ok, true); assert.equal(JSON.stringify(draft), before);
    }
  });
}

test('V03 unchanged stored source-equal title remains untouched after validation and clean submission', () => {
  const f = fixture(); const raw = P.inspectPlanContext({ state: f.state, flowRef: f.flow.ref });
  const draft = clone(raw.draft); draft.title = { mode: 'override', value: '새 원문 제목' };
  const prior = P.planPersonalPlanState({ state: f.state, context: raw.context, draft, now: NOW });
  assert.equal(prior.ok, true, prior.reason);
  const source = P.readPersonalPlanSourceContext({ rawState: prior.state, legacyBaseRaw: null, undo: null, sourceRead: f.sourceRead, sourceEpoch: 7 });
  const editor = P.inspectPersonalPlanSourceEditor({ sourceContext: source.context, flowRef: f.flow.ref });
  assert.equal(editor.ok, true, editor.reason);
  const next = { ...f, state: prior.state, source, editor }; const before = JSON.stringify(prior.state);
  assertValid(validate(next)); assert.equal(plan(next, editor.draft).changed, false);
  assert.equal(JSON.stringify(prior.state), before);
  assert.equal(prior.state[P.METADATA_KEY].entries[f.flow.ref].overlay.title, '새 원문 제목');
});

test('V04 only genuine Sb editor tokens are accepted; raw/read/clone/null cannot be promoted', () => {
  const f = fixture(); const raw = P.inspectPlanContext({ state: f.state, flowRef: f.flow.ref });
  for (const context of [raw.context, f.source.context, { ...f.editor.context }, JSON.parse(JSON.stringify(f.editor.context)), null]) {
    assertInvalid(validate(f, f.editor.draft, { context }), 'invalid-source-editor-context');
  }
});

test('V05 exact input shape rejects now/freshness/authority/baseline flags and missing fields', () => {
  const f = fixture();
  for (const extra of [{ now: NOW }, { sourceRead: f.sourceRead }, { sourceEpoch: 7 }, { canEdit: true }, { trusted: true }, { baseline: f.editor.baseline }]) {
    assertInvalid(validate(f, f.editor.draft, extra), 'invalid-plan-input');
  }
  assertInvalid(P.validateCapturedPersonalPlanSourceDraft({ context: f.editor.context }), 'invalid-plan-input');
  assertInvalid(P.validateCapturedPersonalPlanSourceDraft(null), 'invalid-plan-input');
});

test('V06 malformed/foreign/unknown draft fields preserve the same validation reason as the actual planner', () => {
  const f = fixture();
  for (const change of [
    draft => { draft.title = { mode: 'override', value: '   ' }; },
    draft => { draft.items[f.task.ref].schedule = { mode: 'fixed_date', date: '2026-02-30' }; },
    draft => { draft.items[f.task.ref].itemRef = 'foreign'; },
    draft => { draft.version = 999; },
    draft => { draft.items.foreign = clone(draft.items[f.task.ref]); },
    draft => { draft.title.extra = true; },
  ]) {
    const draft = clone(f.editor.draft); change(draft); const before = JSON.stringify(draft);
    const result = validate(f, draft); assertInvalid(result, plan(f, draft).reason);
    assert.equal(JSON.stringify(draft), before);
  }
});

test('V07 source-equal/blank/CRLF personal memo and fixed pin use the existing domain and owner rules', () => {
  const f = fixture();
  for (const memo of ['', '원문 설명', '  개인 메모\r\n']) {
    const draft = clone(f.editor.draft); draft.items[f.task.ref].memo = { mode: 'override', value: memo };
    draft.items[f.task.ref].schedule = { mode: 'fixed_date', date: '2026-09-08' };
    assertValid(validate(f, draft)); const result = plan(f, draft); assert.equal(result.ok, true);
    assert.equal(result.state[P.METADATA_KEY].entries[f.flow.ref].overlay.items[f.task.ref].memo, memo);
  }
});

test('V08 inherited/unscheduled nonrepeating date remains valid without rewriting execution fields', () => {
  const f = fixture(); const before = JSON.stringify(f.state.tasks);
  for (const schedule of [{ mode: 'inherit' }, { mode: 'unscheduled' }]) {
    const draft = clone(f.editor.draft); draft.items[f.task.ref].schedule = schedule;
    assertValid(validate(f, draft)); assert.equal(plan(f, draft).ok, true);
  }
  assert.equal(JSON.stringify(f.state.tasks), before);
});

test('V09 repeated unscheduled fails the same domain guard without creating revision or Undo', () => {
  const rawText = '# 반복\n## 준비\n- [ ] 접수\n  - 날짜: 2026-09-05\n  - 반복: 매일\n  - 반복 종료: 3회';
  const handoff = M.makeHandoff(rawText, { draftId: 'captured-repeat', handoffId: 'captured-repeat', sourceConfirmed: true, folderId: null });
  const made = M.apply(M.seedState(), { type: 'commit-authoring', handoff, now: NOW });
  assert.equal(made.changed, true, made.error);
  const flow = made.state.flows.find(value => value.handoffId === 'captured-repeat');
  const task = made.state.tasks.find(value => value.flowId === flow.id); const sourceRead = { ok: true, raw: null };
  const source = P.readPersonalPlanSourceContext({ rawState: made.state, legacyBaseRaw: null, undo: null, sourceRead, sourceEpoch: 7 });
  const editor = P.inspectPersonalPlanSourceEditor({ sourceContext: source.context, flowRef: flow.ref });
  assert.equal(editor.ok, true, editor.reason);
  const f = { state: made.state, sourceRead, editor }; const before = JSON.stringify(made.state);
  const draft = clone(editor.draft); draft.items[task.ref].schedule = { mode: 'unscheduled' };
  assertInvalid(validate(f, draft), 'invalid-effective-plan');
  assert.equal(plan(f, draft).reason, 'invalid-effective-plan'); assert.equal(JSON.stringify(made.state), before);
});

test('V10 captured validity does not claim current source freshness or release observed stale authority', () => {
  const f = fixture(); const draft = clone(f.editor.draft); draft.title = { mode: 'override', value: '개인 제목' };
  assertValid(validate(f, draft));
  assert.equal(plan(f, draft, { sourceEpoch: 8 }).reason, 'stale-plan-source-epoch');
  assert.equal(plan(f, draft, { sourceRead: { ok: false, reason: 'read-error' } }).reason, 'source-read-read-error');
  f.state.revision += 1;
  assertValid(validate(f, draft));
  assert.equal(plan(f, draft).reason, 'stale-plan-source-raw');
});

test('V11 input and nested draft getters are rejected without invocation, including lossy custom prototypes', () => {
  const f = fixture(); let invoked = 0;
  const input = { draft: f.editor.draft }; Object.defineProperty(input, 'context', { enumerable: true, get() { invoked += 1; return f.editor.context; } });
  assertInvalid(P.validateCapturedPersonalPlanSourceDraft(input), 'invalid-plan-input');
  const draft = clone(f.editor.draft); Object.defineProperty(draft.title, 'mode', { enumerable: true, get() { invoked += 1; return 'inherit'; } });
  assertInvalid(validate(f, draft), 'unsafe-plan-data');
  const custom = clone(f.editor.draft); Object.setPrototypeOf(custom.items, { toJSON() { invoked += 1; return {}; } });
  assertInvalid(validate(f, custom), 'unsafe-plan-data'); assert.equal(invoked, 0);
});

test('V12 actual UMD captured validator has no ambient clock/storage/DOM dependency', () => {
  let accessed = 0; const sandbox = { FlowMeIntegratedPoc: M, FlowPocTimelineContext: T };
  for (const key of ['localStorage', 'document', 'window', 'Date']) Object.defineProperty(sandbox, key, { get() { accessed += 1; throw new Error(key); } });
  vm.runInContext(fs.readFileSync(require.resolve('./personal-plan-context.js'), 'utf8'), vm.createContext(sandbox));
  const api = sandbox.FlowPocPersonalPlanContext; const f = fixture(api);
  const draft = clone(f.editor.draft); draft.title = { mode: 'override', value: f.flow.title };
  const result = api.validateCapturedPersonalPlanSourceDraft({ context: f.editor.context, draft });
  assert.equal(JSON.stringify(result), JSON.stringify({ ok: true, scope: SCOPE }));
  assert.equal(accessed, 0); assert.equal(own(result, 'state'), false);
});

test('V13 captured and actual planner both enforce a source-effective domain rejection from the shared validator', () => {
  const observed = []; const personalMemo = 'domain guard 검사';
  const model = { ...M, validate(state) {
    const errors = M.validate(state);
    const task = state.tasks.find(value => value.memo === personalMemo);
    if (task) {
      const flow = state.flows.find(value => value.id === task.flowId);
      const sourceChanged = flow.rawText.startsWith('# 새 원문 제목');
      observed.push(sourceChanged ? 'source' : 'raw');
      if (sourceChanged) return [...errors, 'injected-source-effective-domain-rejection'];
    }
    return errors;
  } };
  const sandbox = { FlowMeIntegratedPoc: model, FlowPocTimelineContext: T };
  vm.runInContext(fs.readFileSync(require.resolve('./personal-plan-context.js'), 'utf8'), vm.createContext(sandbox));
  const api = sandbox.FlowPocPersonalPlanContext; const f = fixture(api);
  const draft = clone(f.editor.draft); draft.items[f.task.ref].memo = { mode: 'override', value: personalMemo };
  const before = JSON.stringify(f.state);
  const valid = api.validateCapturedPersonalPlanSourceDraft({ context: f.editor.context, draft });
  assert.equal(valid.ok, false); assert.equal(valid.reason, 'invalid-effective-plan');
  assert.deepEqual(observed, ['raw', 'source']); observed.length = 0;
  const actual = api.planPersonalPlanSourceState({ context: f.editor.context, rawState: f.state,
    sourceRead: f.sourceRead, sourceEpoch: 7, draft, now: NOW });
  assert.equal(actual.ok, false); assert.equal(actual.reason, valid.reason);
  assert.deepEqual(observed, ['raw', 'source']); assert.equal(JSON.stringify(f.state), before);
});
