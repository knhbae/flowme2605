'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const P = require('./personal-plan-context.js');
const T = require('./timeline-context.js');
const { M, NOW, clone, own, sourceUpdateFixture } = require('./k3b-plan-lossless-gate.fixture.cjs');

function fixture() {
  const f = sourceUpdateFixture();
  f.task.title = f.task.sourceTitle; // The source-owned Item case, not an imported personal title.
  return f;
}
function read(f, state = f.state) {
  const result = P.readPersonalPlanSourceContext({ rawState: state, legacyBaseRaw: null, undo: null,
    sourceRead: { ok: true, raw: JSON.stringify(f.store) }, sourceEpoch: 4 });
  assert.equal(result.ok, true, result.reason);
  return result;
}
function open(f) {
  const source = read(f);
  const result = P.inspectPersonalPlanSourceEditor({ sourceContext: source.context, flowRef: f.flow.ref });
  assert.equal(result.ok, true, result.reason);
  return { ...result, source };
}
function commit(f, opened, draft, extra = {}) {
  const before = JSON.stringify(f.state);
  const result = P.planPersonalPlanSourceState({ context: opened.context, rawState: f.state,
    sourceRead: { ok: true, raw: JSON.stringify(f.store) }, sourceEpoch: 4, draft, now: NOW, ...extra });
  assert.equal(JSON.stringify(f.state), before);
  return result;
}
function draftTitle(opened, f, target, value) {
  const draft = clone(opened.draft);
  if (target === 'flow') draft.title = value;
  else draft.items[f.task.ref].title = value;
  return draft;
}
function projectedTitle(f, state, target) {
  const result = read(f, state);
  return target === 'flow' ? result.state.flows.find(flow => flow.ref === f.flow.ref).title
    : result.state.tasks.find(task => task.ref === f.task.ref).title;
}

for (const target of ['flow', 'item']) {
  const a = target === 'flow' ? '원문 제목' : '접수';
  const b = target === 'flow' ? '새 원문 제목' : '새 접수';
  test(`I01-${target} source A to B then explicit A preserves a raw-equal personal title and exact before Undo`, () => {
    const f = fixture(); const opened = open(f);
    assert.equal(opened.source.capabilities.flows[f.flow.ref].canEdit, false);
    assert.equal(opened.capabilities.canEdit, true);
    const result = commit(f, opened, draftTitle(opened, f, target, { mode: 'override', value: a }));
    assert.equal(result.ok, true, result.reason); assert.equal(result.changed, true);
    assert.equal(result.state.revision, f.state.revision + 1);
    assert.deepEqual(result.undo, f.state);
    assert.equal(projectedTitle(f, result.state, target), a);
    assert.equal(P.projectPersonalPlanState(result.state).ok, true);
    assert.deepEqual(result.state.flows, f.state.flows);
    assert.deepEqual(result.state.tasks, f.state.tasks);
  });

  test(`I02-${target} explicit B equals verified inherited B and creates no metadata/revision/Undo`, () => {
    const f = fixture(); const opened = open(f);
    const result = commit(f, opened, draftTitle(opened, f, target, { mode: 'override', value: b }));
    assert.equal(result.ok, true, result.reason); assert.equal(result.changed, false);
    assert.equal(result.state, f.state);
    assert.equal(own(result, 'undo'), false);
    assert.equal(own(result.state, P.METADATA_KEY), false);
    assert.equal(projectedTitle(f, result.state, target), b);
  });

  test(`I03-${target} explicit C then inherit removes only the personal intent and shows B`, () => {
    let f = fixture(); let opened = open(f);
    const changed = commit(f, opened, draftTitle(opened, f, target, { mode: 'override', value: '개인 C' }));
    assert.equal(changed.ok, true, changed.reason);
    f = { ...f, state: changed.state }; opened = open(f);
    const inherited = commit(f, opened, draftTitle(opened, f, target, { mode: 'inherit' }));
    assert.equal(inherited.ok, true, inherited.reason); assert.equal(inherited.changed, true);
    assert.equal(own(inherited.state, P.METADATA_KEY), false);
    assert.equal(projectedTitle(f, inherited.state, target), b);
    assert.deepEqual(inherited.undo, changed.state);
  });

  test(`I04-${target} a stored explicit B survives read/reload, clean submit and an unrelated memo edit`, () => {
    let f = fixture(); const rawOpened = P.inspectPlanContext({ state: f.state, flowRef: f.flow.ref });
    const rawDraft = draftTitle(rawOpened, f, target, { mode: 'override', value: b });
    const prior = P.planPersonalPlanState({ state: f.state, context: rawOpened.context, draft: rawDraft, now: NOW });
    assert.equal(prior.ok, true); assert.equal(prior.changed, true);
    const bytes = JSON.stringify(prior.state);
    f = { ...f, state: JSON.parse(bytes) }; const opened = open(f);
    const clean = commit(f, opened, opened.draft);
    assert.equal(clean.ok, true, clean.reason); assert.equal(clean.changed, false);
    assert.equal(JSON.stringify(clean.state), bytes);
    const draft = clone(opened.draft); draft.items[f.task.ref].memo = { mode: 'override', value: '다른 필드만\r\n' };
    const changed = commit(f, opened, draft);
    assert.equal(changed.ok, true, changed.reason);
    const entry = changed.state.personalPlanContextV1.entries[f.flow.ref].overlay;
    assert.equal(target === 'flow' ? entry.title : entry.items[f.task.ref].title, b);
  });
}

test('I05 existing personal title remains the normalization baseline even with a new verified source title', () => {
  const f = sourceUpdateFixture(); const opened = open(f);
  assert.equal(opened.baseline.items[f.task.ref].title, '내 접수 제목');
  assert.equal(opened.capabilities.items[f.task.ref].title.owner, 'existing-personal-baseline');
  const draft = clone(opened.draft); draft.items[f.task.ref].title = { mode: 'override', value: '내 접수 제목' };
  const same = commit(f, opened, draft);
  assert.equal(same.ok, true); assert.equal(same.changed, false);
});

test('I06 source-equal description is not the personal memo baseline; exact blank and CRLF stay explicit', () => {
  for (const value of ['', '원문 설명', '  메모\r\n\t  ']) {
    const f = fixture(); const opened = open(f); const draft = clone(opened.draft);
    draft.items[f.task.ref].memo = { mode: 'override', value };
    const result = commit(f, opened, draft);
    assert.equal(result.ok, true, result.reason); assert.equal(result.changed, true);
    assert.equal(result.state.personalPlanContextV1.entries[f.flow.ref].overlay.items[f.task.ref].memo, value);
    assert.equal(read(f, result.state).state.tasks.find(task => task.ref === f.task.ref).memo, value);
    assert.equal(f.task.memo, '내 메모\r\n');
  }
});

test('I07 fixed date equality remains an explicit pin and unscheduled stays personal Plan only', () => {
  for (const schedule of [{ mode: 'fixed_date', date: '2026-09-08' }, { mode: 'unscheduled' }]) {
    const f = fixture(); const opened = open(f); const draft = clone(opened.draft); draft.items[f.task.ref].schedule = schedule;
    const result = commit(f, opened, draft);
    assert.equal(result.ok, true, result.reason); assert.equal(result.changed, true);
    assert.deepEqual(result.state.personalPlanContextV1.entries[f.flow.ref].overlay.items[f.task.ref].schedule, schedule);
    assert.deepEqual(result.state.tasks, f.state.tasks);
  }
});

test('I08 actual missing source title remains a current read-only capability, not an editable trust flag', () => {
  const f = fixture(); delete f.flow.sourceTitle;
  const source = read(f);
  const result = P.inspectPersonalPlanSourceEditor({ sourceContext: source.context, flowRef: f.flow.ref });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'source-title-owner-unproven');
  assert.equal(P.inspectPersonalPlanSourceEditor({ sourceContext: source.context, flowRef: f.flow.ref, canEdit: true }).ok, false);
  assert.equal(own(f.flow, 'sourceTitle'), false);
});

test('I09 raw/source token kinds, clones, serialized tokens and foreign Flow cannot create source editor authority', () => {
  const f = fixture(); const opened = open(f);
  const raw = P.inspectPlanContext({ state: f.state, flowRef: f.flow.ref });
  for (const sourceContext of [{ ...opened.source.context }, raw.context, opened.context]) {
    assert.equal(P.inspectPersonalPlanSourceEditor({ sourceContext, flowRef: f.flow.ref }).ok, false);
  }
  assert.equal(P.inspectPersonalPlanSourceEditor({ sourceContext: opened.source.context, flowRef: 'foreign' }).ok, false);
  for (const context of [{ ...opened.context }, raw.context, opened.source.context]) assert.equal(commit(f, opened, opened.draft, { context }).ok, false);
  assert.equal(P.planPersonalPlanState({ state: f.state, context: opened.context, draft: opened.draft, now: NOW }).ok, false);
});

test('I10 source error/raw replacement/observed ABA/raw-state drift reject candidate without replacing earlier Undo', () => {
  const f = fixture(); const opened = open(f); const draft = draftTitle(opened, f, 'flow', { mode: 'override', value: '개인 변경' });
  for (const extra of [
    { sourceRead: { ok: false, reason: 'read-error' } },
    { sourceRead: { ok: true, raw: ' ' + JSON.stringify(f.store) } },
    { sourceEpoch: 5 },
    { rawState: { ...f.state, revision: f.state.revision + 1 } },
  ]) { const result = commit(f, opened, draft, extra); assert.equal(result.ok, false); assert.equal(own(result, 'state'), false); assert.equal(own(result, 'undo'), false); }
});

test('I11 private source-before-P baseline stays frozen and is never the already overlaid title', () => {
  let f = fixture(); let opened = open(f);
  const first = commit(f, opened, draftTitle(opened, f, 'flow', { mode: 'override', value: '개인 C' }));
  f = { ...f, state: first.state }; opened = open(f);
  assert.equal(opened.baseline.title, '새 원문 제목');
  assert.equal(opened.draft.title.value, '개인 C');
  assert.ok(Object.isFrozen(opened.baseline.items[f.task.ref]));
  assert.throws(() => { opened.baseline.title = 'poison'; }, TypeError);
  assert.throws(() => { opened.draft.title.value = 'poison'; }, TypeError);
  assert.equal(commit(f, opened, opened.draft).changed, false);
});

test('I12 memo-equality rejection, refs, capture, shape and unknown metadata validation remain strict', () => {
  const f = fixture(); const opened = open(f);
  const made = commit(f, opened, draftTitle(opened, f, 'flow', { mode: 'override', value: '원문 제목' }));
  assert.equal(made.ok, true);
  for (const change of [
    entry => { entry.overlay.items[f.task.ref] = { itemRef: f.task.ref, memo: f.task.memo }; },
    entry => { entry.overlay.items.foreign = { itemRef: 'foreign', title: '다른 사본' }; },
    entry => { entry.legacyPlanFields.flow.title = 'tampered'; },
    entry => { entry.overlay.trusted = true; },
  ]) {
    const state = clone(made.state); change(state.personalPlanContextV1.entries[f.flow.ref]);
    assert.equal(P.projectPersonalPlanState(state).ok, false);
  }
});

test('I13 unchanged raw-only normalize results survive title decoder widening', () => {
  const f = fixture(); const opened = P.inspectPlanContext({ state: f.state, flowRef: f.flow.ref });
  const draft = clone(opened.draft); draft.title = { mode: 'override', value: f.flow.title };
  draft.items[f.task.ref].title = { mode: 'override', value: f.task.title };
  const result = P.planPersonalPlanState({ state: f.state, context: opened.context, draft, now: NOW });
  assert.equal(result.ok, true); assert.equal(result.changed, false);
  assert.equal(own(result.state, P.METADATA_KEY), false);
});

test('I14 malformed draft/date/time/unknown input still fails before candidate and does not mint unrelated authority', () => {
  const f = fixture(); const opened = open(f);
  for (const change of [
    draft => { draft.items[f.task.ref].schedule = { mode: 'fixed_date', date: '2026-02-30' }; },
    draft => { draft.title = { mode: 'override', value: '' }; },
    draft => { draft.items[f.task.ref].title = { mode: 'override', value: '일반 제목' }; draft.extra = true; },
  ]) { const draft = clone(opened.draft); change(draft); assert.equal(commit(f, opened, draft).ok, false); }
  const draft = draftTitle(opened, f, 'flow', { mode: 'override', value: '변경' });
  assert.equal(commit(f, opened, draft, { now: 'invalid' }).ok, false);
  assert.equal(commit(f, opened, draft, { trusted: true }).ok, false);
});

test('I15 actual UMD bound read/inspect/plan never reads storage or DOM and keeps opaque tokens free of source payload', () => {
  let accessed = 0; const sandbox = { FlowMeIntegratedPoc: M, FlowPocTimelineContext: T };
  for (const key of ['localStorage', 'document', 'window']) Object.defineProperty(sandbox, key, { get() { accessed += 1; throw new Error(key); } });
  vm.runInContext(fs.readFileSync(require.resolve('./personal-plan-context.js'), 'utf8'), vm.createContext(sandbox));
  const api = sandbox.FlowPocPersonalPlanContext; const f = fixture();
  const sourceRead = { ok: true, raw: JSON.stringify(f.store) };
  const source = api.readPersonalPlanSourceContext({ rawState: f.state, legacyBaseRaw: null, undo: null, sourceRead, sourceEpoch: 0 });
  assert.equal(source.ok, true, source.reason);
  const opened = api.inspectPersonalPlanSourceEditor({ sourceContext: source.context, flowRef: f.flow.ref });
  assert.equal(opened.ok, true, opened.reason);
  const draft = clone(opened.draft); draft.title = { mode: 'override', value: f.flow.title };
  const result = api.planPersonalPlanSourceState({ rawState: f.state, context: opened.context, sourceRead, sourceEpoch: 0, draft, now: NOW });
  assert.equal(result.ok, true, result.reason); assert.equal(result.changed, true);
  assert.equal(JSON.stringify(source.context), '{"version":1}');
  assert.equal(JSON.stringify(opened.context), '{"version":1}');
  assert.equal(JSON.stringify(opened.draft).includes('rawText'), false);
  assert.equal(accessed, 0);
});

test('I16 returned candidate and caller draft mutations cannot poison private source/edit contexts or earlier Undo', () => {
  const f = fixture(); const opened = open(f);
  const draft = draftTitle(opened, f, 'flow', { mode: 'override', value: f.flow.title });
  const first = commit(f, opened, draft);
  assert.equal(first.ok, true, first.reason);
  first.state.personalPlanContextV1.entries[f.flow.ref].overlay.title = '외부 후보 변경';
  first.undo.tasks[0].title = '외부 Undo 변경'; draft.title.value = '외부 초안 변경';
  const next = commit(f, opened, draftTitle(opened, f, 'flow', { mode: 'override', value: f.flow.title }));
  assert.equal(next.ok, true, next.reason);
  assert.equal(next.state.personalPlanContextV1.entries[f.flow.ref].overlay.title, f.flow.title);
  assert.deepEqual(next.undo, f.state);
  assert.equal(opened.baseline.title, '새 원문 제목');
  assert.equal(opened.draft.title.mode, 'inherit');
});

test('I17 verified absent source remains distinct from a read error and supports ordinary source-aware intent', () => {
  const f = fixture(); const sourceRead = { ok: true, raw: null };
  const source = P.readPersonalPlanSourceContext({ rawState: f.state, legacyBaseRaw: null, undo: null, sourceRead, sourceEpoch: 0 });
  assert.equal(source.ok, true, source.reason);
  const opened = P.inspectPersonalPlanSourceEditor({ sourceContext: source.context, flowRef: f.flow.ref });
  assert.equal(opened.ok, true, opened.reason); assert.equal(opened.baseline.title, f.flow.title);
  const draft = clone(opened.draft); draft.title = { mode: 'override', value: '개인 제목' };
  const result = P.planPersonalPlanSourceState({ context: opened.context, rawState: f.state, sourceRead, sourceEpoch: 0, draft, now: NOW });
  assert.equal(result.ok, true, result.reason); assert.equal(result.changed, true);
  assert.equal(P.planPersonalPlanSourceState({ context: opened.context, rawState: f.state,
    sourceRead: { ok: false, reason: 'unavailable' }, sourceEpoch: 0, draft, now: NOW }).ok, false);
});

test('I18 source-aware schedule still rejects unsupported repeated unscheduled Plan without changing recurrence or execution', () => {
  const rawText = '# 반복 검사\n## 준비\n- [ ] 반복 접수\n  - 날짜: 2026-09-05\n  - 반복: 매일\n  - 반복 종료: 3회';
  const handoff = M.makeHandoff(rawText, { draftId: 'sb-repeat-draft', handoffId: 'sb-repeat', sourceConfirmed: true, folderId: null });
  const created = M.apply(M.seedState(), { type: 'commit-authoring', handoff, now: NOW });
  assert.equal(created.changed, true, created.error);
  const flow = created.state.flows.find(value => value.handoffId === 'sb-repeat');
  const ref = created.state.tasks.find(value => value.flowId === flow.id).ref;
  const before = JSON.stringify(created.state); const sourceRead = { ok: true, raw: null };
  const source = P.readPersonalPlanSourceContext({ rawState: created.state, legacyBaseRaw: null, undo: null, sourceRead, sourceEpoch: 0 });
  assert.equal(source.ok, true, source.reason);
  const opened = P.inspectPersonalPlanSourceEditor({ sourceContext: source.context, flowRef: flow.ref });
  assert.equal(opened.ok, true, opened.reason);
  const draft = clone(opened.draft); draft.items[ref].schedule = { mode: 'unscheduled' };
  const result = P.planPersonalPlanSourceState({ context: opened.context, rawState: created.state, sourceRead, sourceEpoch: 0, draft, now: NOW });
  assert.equal(result.ok, false); assert.equal(result.reason, 'invalid-effective-plan');
  assert.equal(own(result, 'state'), false); assert.equal(own(result, 'undo'), false);
  assert.equal(JSON.stringify(created.state), before);
});

test('I19 descriptor-safe source packets and draft data reject getters without executing them', () => {
  const f = fixture(); const opened = open(f); let invoked = 0;
  const sourceRead = { ok: true }; Object.defineProperty(sourceRead, 'raw', { enumerable: true, get() { invoked += 1; return JSON.stringify(f.store); } });
  assert.equal(commit(f, opened, opened.draft, { sourceRead }).ok, false);
  const draft = clone(opened.draft);
  Object.defineProperty(draft.title, 'mode', { enumerable: true, get() { invoked += 1; return 'inherit'; } });
  assert.equal(commit(f, opened, draft).ok, false);
  assert.equal(invoked, 0);
});
