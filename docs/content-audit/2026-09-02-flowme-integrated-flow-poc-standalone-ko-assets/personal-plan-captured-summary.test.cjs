'use strict';

// B3-A RED contract. Genuine M/P/C fixtures; no storage adapter or application.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const M = require('./model.js');
const T = require('./timeline-context.js');
const P = require('./personal-plan-context.js');
const C = require('./workspace-checkpoint.js');
const { sourceUpdateFixture } = require('./k3b-plan-lossless-gate.fixture.cjs');
const NOW = '2026-09-06T01:00:00.000Z';
const RAW = '# 원문 Plan\r\n## A\r\n- [ ] A1\r\n  - 날짜: 2026-09-05\r\n  - 설명: 원문 설명만 있음\r\n- [ ] A2\r\n## B\r\n- [ ] B1';
const SCOPE = 'captured-plan-changes';
const copy = value => JSON.parse(JSON.stringify(value));
const bytes = value => JSON.stringify(value);
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const field = (ref, suffix) => `item.${ref}.${suffix}`;

function fixture(raw = RAW, id = 'summary', mutate) {
  const handoff = M.makeHandoff(raw, { draftId: id + '-draft', handoffId: id + '-handoff', sourceConfirmed: true, folderId: null });
  const made = M.apply(M.seedState(), { type: 'commit-authoring', handoff, now: NOW });
  assert.equal(made.changed, true, made.error);
  const flow = made.state.flows.find(value => value.handoffId === handoff.handoffId);
  if (mutate) mutate(made.state, flow);
  const converted = C.fromLegacy(' \r\n' + bytes({ version: 1, state: made.state, undo: null }) + '\r\n');
  assert.equal(converted.ok, true, converted.reason);
  return { cp: converted.checkpoint, flow, sourceRead: { ok: true, raw: null }, sourceEpoch: 7 };
}
function observation(f) { return { flowRef: f.flow.ref, sourceRead: f.sourceRead, sourceEpoch: f.sourceEpoch }; }
function open(f, kind = 'structure') {
  const result = kind === 'structure' ? C.inspectSourceBoundPersonalPlanStructureContext(f.cp, observation(f))
    : C.inspectSourceBoundPersonalPlanContext(f.cp, observation(f));
  assert.equal(result.ok, true, result.reason);
  return result;
}
function api(module = P) {
  assert.equal(typeof module.summarizeCapturedPersonalPlanChanges, 'function', 'B3 captured summary API is not implemented');
  return module.summarizeCapturedPersonalPlanChanges;
}
function frozen(value) {
  if (!value || typeof value !== 'object') return;
  assert.equal(Object.isFrozen(value), true, 'public summary tree must be frozen');
  for (const child of Object.values(value)) frozen(child);
}
function check(result, expectedFields, refs) {
  assert.equal(result.ok, true, result.reason); assert.equal(result.scope, SCOPE);
  assert.equal(result.changed, expectedFields.length > 0);
  assert.equal(result.changedFieldCount, expectedFields.length);
  assert.deepEqual([...result.changes.map(change => change.field)].sort(), [...expectedFields].sort());
  assert.deepEqual([...result.affectedRefs].sort(), [...refs].sort());
  assert.equal(result.flowCount, refs.filter(ref => ref.startsWith('saved-flow:')).length);
  assert.equal(result.itemCount, refs.filter(ref => ref.startsWith('flow-item:')).length);
  assert.equal(new Set(result.affectedRefs).size, result.affectedRefs.length);
  assert.deepEqual(Object.keys(result).sort(), ['ok', 'scope', 'changed', 'changes', 'affectedRefs', 'changedFieldCount', 'flowCount', 'itemCount'].sort());
  for (const change of result.changes) {
    assert.deepEqual(Object.keys(change).sort(), ['owner', 'field', 'label', 'before', 'after'].sort());
    assert.equal(change.owner, 'poc-personal-plan');
    for (const key of ['label', 'before', 'after']) {
      assert.equal(typeof change[key], 'string'); assert.ok(change[key].length <= 160, key + ' display bound');
      assert.doesNotMatch(change[key], /[\u0000-\u001f\u007f]/u);
      assert.doesNotMatch(change[key], /(?:flow-item|saved-flow):/u, 'raw identities are not public value labels');
    }
    assert.notEqual(change.before, change.after, 'semantic change must remain distinguishable after compaction');
  }
  frozen(result); return result;
}
function summary(f, opened, draft = opened.draft, compareDraft) {
  const summarize = api(), before = bytes(f), inputBefore = bytes(draft);
  const result = summarize({ context: opened.context, draft, ...(compareDraft === undefined ? {} : { compareDraft }) });
  assert.equal(bytes(f), before); assert.equal(bytes(draft), inputBefore);
  return result;
}
function commit(f, opened, draft) {
  const result = C.transitionCheckpoint(f.cp, { type: draft.version === 2
    ? 'commit-source-bound-personal-plan-structure-context' : 'commit-source-bound-personal-plan-context',
  context: opened.context, draft, sourceRead: f.sourceRead, sourceEpoch: f.sourceEpoch, now: NOW });
  assert.equal(result.ok, true, result.reason);
  return { ...f, cp: result.checkpoint, commit: result };
}
function sourceChanged(f, incoming) {
  const prepared = M.prepareLocalSourceCandidateReview(M.initialSourceCandidateStore(NOW), f.cp.state, f.flow.id,
    { incomingRawText: incoming, now: NOW, createdAt: NOW });
  assert.equal(prepared.ok, true, prepared.reason);
  let store = prepared.store;
  for (const change of prepared.candidate.changes) {
    const resolved = M.resolveLocalSourceCandidateChange(store, { candidateId: prepared.candidate.candidateId,
      changeId: change.changeId, resolution: 'use-incoming', now: NOW });
    assert.equal(resolved.changed, true, resolved.code); store = resolved.store;
  }
  const applied = M.applyLocalSourceCandidate(store, f.cp.state, f.flow.id, prepared.candidate.candidateId, NOW);
  assert.equal(applied.changed, true, applied.code);
  return { ...f, store: applied.store, sourceRead: { ok: true, raw: bytes(applied.store) }, sourceEpoch: f.sourceEpoch + 1 };
}
function reject(summarize, input) {
  const result = summarize(input); assert.equal(result.ok, false, 'invalid captured input must be rejected');
  assert.equal(result.scope, SCOPE); assert.equal(typeof result.reason, 'string');
  for (const key of ['changes', 'candidate', 'state', 'undo', 'revision', 'canEdit', 'canSave']) assert.equal(own(result, key), false, key);
}

test('B3S01 genuine C source and structure contexts yield frozen empty summaries without issuing storage authority', () => {
  const f = fixture();
  for (const kind of ['source', 'structure']) {
    const opened = open(f, kind); check(summary(f, opened), [], []);
  }
});

test('B3S02 equal inherited Flow and Item titles normalize to zero just as the actual source planner does', () => {
  const f = fixture(), opened = open(f, 'source'), draft = copy(opened.draft), ref = Object.keys(draft.items)[0];
  draft.title = { mode: 'override', value: opened.baseline.title };
  draft.items[ref].title = { mode: 'override', value: opened.baseline.items[ref].title };
  check(summary(f, opened, draft), [], []);
  const saved = commit(f, opened, draft); assert.equal(saved.commit.changed, false); assert.equal(saved.cp, f.cp);
});

test('B3S03 verified source B plus explicit original A is a real title change, not equality with raw A', () => {
  const f = sourceChanged(fixture(), RAW.replace('원문 Plan', '현재 원문 B').replace('A1', '현재 Item B'));
  const opened = open(f, 'source'), draft = copy(opened.draft), ref = Object.keys(draft.items)[0];
  assert.equal(opened.baseline.title, '현재 원문 B'); assert.equal(opened.baseline.items[ref].title, '현재 Item B');
  draft.title = { mode: 'override', value: '원문 Plan' }; draft.items[ref].title = { mode: 'override', value: 'A1' };
  check(summary(f, opened, draft), ['flow.title', field(ref, 'title')], [f.flow.ref, ref]);
  const saved = commit(f, opened, draft); assert.equal(saved.commit.changed, true);
  assert.equal(saved.cp.state[P.METADATA_KEY].entries[f.flow.ref].overlay.title, '원문 Plan');
});

test('B3S04 same-date fixed pin and explicit inherit removal each count one schedule owner change', () => {
  const f = fixture(), opened = open(f), draft = copy(opened.draft), ref = Object.keys(draft.items)[0];
  draft.items[ref].schedule = { mode: 'fixed_date', date: opened.baseline.items[ref].planDate };
  const first = check(summary(f, opened, draft), [field(ref, 'schedule')], [ref]);
  assert.match(first.changes[0].before, /원본|따르기/u); assert.match(first.changes[0].after, /내 계획|고정/u);
  const saved = commit(f, opened, draft), reopened = open(saved), reset = copy(reopened.draft);
  reset.items[ref].schedule = { mode: 'inherit' };
  const second = check(summary(saved, reopened, reset), [field(ref, 'schedule')], [ref]);
  assert.match(second.changes[0].before, /내 계획|고정/u); assert.match(second.changes[0].after, /원본|따르기/u);
  assert.deepEqual(saved.cp.state.tasks, f.cp.state.tasks); assert.deepEqual(saved.cp.state.flows, f.cp.state.flows);
});

test('B3S05 imported personal memo absence, empty string and exact CRLF never inherit source description', () => {
  for (const value of [undefined, '', ' \r\n기존 개인 메모\t ']) {
    const f = fixture(RAW, 'memo', (state, flow) => {
      const task = state.tasks.find(item => item.flowId === flow.id); delete task.memo;
      if (value !== undefined) task.memo = value;
    });
    const opened = open(f), draft = copy(opened.draft), ref = Object.keys(draft.items)[0];
    assert.equal(opened.baseline.items[ref].memoPresent, value !== undefined);
    draft.items[ref].memo = { mode: 'override', value: '' };
    const expected = value === '' ? [] : [field(ref, 'memo')];
    const result = check(summary(f, opened, draft), expected, expected.length ? [ref] : []);
    if (value === undefined) assert.equal(result.changes[0].before, '개인 메모 없음');
    assert.doesNotMatch(bytes(result.changes), /원문 설명만 있음/u);
    assert.equal(commit(f, opened, draft).commit.changed, expected.length > 0);
  }
});

test('B3S06 same-length CRLF memos and overlong labels differ semantically before public compaction', () => {
  const beforeMemo = '가'.repeat(181) + '\r\n ', afterMemo = '나'.repeat(181) + '\r\n ';
  const longTitle = '긴 제목'.repeat(60), f = fixture(RAW.replace('A1', longTitle), 'compact', (state, flow) => {
    state.tasks.find(item => item.flowId === flow.id).memo = beforeMemo;
  });
  const opened = open(f), draft = copy(opened.draft), ref = Object.keys(draft.items)[0];
  draft.items[ref].memo = { mode: 'override', value: afterMemo }; assert.equal(beforeMemo.length, afterMemo.length);
  const result = check(summary(f, opened, draft), [field(ref, 'memo')], [ref]);
  assert.match(result.changes[0].before, new RegExp(String(beforeMemo.length)));
  assert.match(result.changes[0].after, new RegExp(String(afterMemo.length)));
  const saved = commit(f, opened, draft);
  assert.equal(saved.cp.state[P.METADATA_KEY].entries[f.flow.ref].overlay.items[ref].memo, afterMemo);
  assert.equal(f.cp.state.tasks.find(item => item.ref === ref).memo, beforeMemo);
});

test('B3S07 section plus cross-section global order plus one Item memo and date are four fields but two direct owners', () => {
  const f = fixture(), opened = open(f), draft = copy(opened.draft), ref = draft.orderedItemRefs[0];
  draft.sectionTitles['step-1'] = { mode: 'override', value: '내 구간' };
  draft.orderedItemRefs = [draft.orderedItemRefs[0], draft.orderedItemRefs[2], draft.orderedItemRefs[1]];
  draft.items[ref].memo = { mode: 'override', value: '내 메모' }; draft.items[ref].schedule = { mode: 'fixed_date', date: '2026-09-08' };
  check(summary(f, opened, draft), ['section.step-1.title', 'flow.item-order', field(ref, 'memo'), field(ref, 'schedule')], [f.flow.ref, ref]);
  const saved = commit(f, opened, draft); assert.equal(saved.commit.changed, true);
  assert.deepEqual(saved.cp.state.tasks, f.cp.state.tasks); assert.deepEqual(saved.cp.state.flows, f.cp.state.flows);
  assert.deepEqual(saved.cp.state.timelineContextV1, f.cp.state.timelineContextV1);
});

test('B3S08 identically named sections remain distinct fields with one Flow owner', () => {
  const f = fixture(RAW.replace('## B', '## A')), opened = open(f), draft = copy(opened.draft);
  assert.deepEqual(Object.keys(draft.sectionTitles), ['step-1', 'step-2']);
  for (const id of Object.keys(draft.sectionTitles)) draft.sectionTitles[id] = { mode: 'override', value: '같은 개인 별칭' };
  check(summary(f, opened, draft), ['section.step-1.title', 'section.step-2.title'], [f.flow.ref]);
});

test('B3S09 identical Item labels do not hide full-ref order change or merge independently saved copies', () => {
  const raw = RAW.replace('A1', '같은 항목').replace('A2', '같은 항목').replace('B1', '같은 항목');
  const f = fixture(raw, 'copy-a'), other = fixture(raw, 'copy-b');
  for (const current of [f, other]) {
    const opened = open(current), draft = copy(opened.draft); draft.orderedItemRefs.reverse();
    const result = check(summary(current, opened, draft), ['flow.item-order'], [current.flow.ref]);
    assert.notEqual(result.changes[0].before, result.changes[0].after);
  }
  assert.notEqual(f.flow.ref, other.flow.ref);
});

test('B3S10 compareDraft is the full staged parent baseline; opened comparison still includes all parent changes', () => {
  const f = fixture(), opened = open(f), parent = copy(opened.draft), ref = parent.orderedItemRefs[0];
  parent.title = { mode: 'override', value: '부모에서 이미 수정' }; parent.orderedItemRefs.reverse();
  const child = copy(parent); child.items[ref].memo = { mode: 'override', value: '지금 자식에서 수정' };
  const parentBefore = bytes(parent);
  check(summary(f, opened, child, parent), [field(ref, 'memo')], [ref]);
  check(summary(f, opened, child), ['flow.title', 'flow.item-order', field(ref, 'memo')], [f.flow.ref, ref]);
  assert.equal(bytes(parent), parentBefore);
  check(summary(f, opened, parent, child), [field(ref, 'memo')], [ref]);
});

test('B3S11 old personal title equal to later source is preserved until explicit inherit changes owner', () => {
  const data = sourceUpdateFixture(); data.task.title = data.task.sourceTitle;
  const converted = C.fromLegacy(bytes({ version: 1, state: data.state, undo: null })); assert.equal(converted.ok, true);
  const raw = C.inspectPersonalPlanContext(converted.checkpoint, data.flow.ref);
  assert.equal(raw.ok, true, raw.reason); const draft = copy(raw.draft); draft.title = { mode: 'override', value: '새 원문 제목' };
  const made = C.transitionCheckpoint(converted.checkpoint, { type: 'commit-personal-plan-context', context: raw.context, draft, now: NOW });
  assert.equal(made.ok, true, made.reason); assert.equal(made.changed, true);
  const f = { cp: made.checkpoint, flow: data.flow,
    sourceRead: { ok: true, raw: bytes(data.store) }, sourceEpoch: 4 };
  const opened = open(f, 'source'); assert.equal(opened.baseline.title, opened.draft.title.value);
  check(summary(f, opened), [], []);
  const unrelated = copy(opened.draft), ref = Object.keys(unrelated.items)[0]; unrelated.items[ref].memo = { mode: 'override', value: '추가 메모' };
  check(summary(f, opened, unrelated), [field(ref, 'memo')], [ref]);
  assert.equal(commit(f, opened, unrelated).cp.state[P.METADATA_KEY].entries[f.flow.ref].overlay.title, '새 원문 제목');
  const inherited = copy(opened.draft); inherited.title = { mode: 'inherit' };
  const result = check(summary(f, opened, inherited), ['flow.title'], [f.flow.ref]);
  assert.match(result.changes[0].before, /내 계획/u); assert.match(result.changes[0].after, /원본|따르기/u);
});

test('B3S12 section alias equal after source Undo is still intent; explicit inherit is one field', () => {
  const original = fixture(), incoming = sourceChanged(original, RAW.replace('## A', '## 현재 B'));
  const opened = open(incoming), draft = copy(opened.draft); draft.sectionTitles['step-1'] = { mode: 'override', value: 'A' };
  const saved = commit(incoming, opened, draft), sourceUndo = M.undoLocalSourceCandidate(incoming.store, NOW);
  assert.equal(sourceUndo.changed, true, sourceUndo.code);
  const f = { ...saved, sourceRead: { ok: true, raw: bytes(sourceUndo.store) }, sourceEpoch: saved.sourceEpoch + 1 };
  const reopened = open(f); assert.equal(reopened.structure.sections[0].sourceTitle, 'A');
  check(summary(f, reopened), [], []);
  const inherit = copy(reopened.draft); inherit.sectionTitles['step-1'] = { mode: 'inherit' };
  check(summary(f, reopened, inherit), ['section.step-1.title'], [f.flow.ref]);
});

test('B3S13 forged, raw, cloned, cross-realm foreign and wrong-Flow tokens never become captured summary authority', () => {
  const f = fixture(), opened = open(f), other = open(fixture(RAW, 'foreign'));
  const raw = P.inspectPlanContext({ state: f.cp.state, flowRef: f.flow.ref, legacyBaseRaw: f.cp.legacyBaseRaw, undo: f.cp.undo });
  assert.equal(raw.ok, true); const summarize = api();
  const sandbox = { FlowMeIntegratedPoc: M, FlowPocTimelineContext: T };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'personal-plan-context.js'), 'utf8'), sandbox);
  const foreignP = sandbox.FlowPocPersonalPlanContext;
  const read = foreignP.readPersonalPlanSourceContext({ rawState: f.cp.state, legacyBaseRaw: f.cp.legacyBaseRaw,
    undo: f.cp.undo, sourceRead: f.sourceRead, sourceEpoch: f.sourceEpoch }); assert.equal(read.ok, true, read.reason);
  const foreign = foreignP.inspectPersonalPlanStructureEditor({ sourceContext: read.context, flowRef: f.flow.ref }); assert.equal(foreign.ok, true);
  for (const context of [{}, copy(opened.context), opened.sourceContext, raw.context, other.context, foreign.context]) reject(summarize, { context, draft: opened.draft });
});

test('B3S14 unknown, partial, invalid-mode/date/permutation and getter inputs fail without evaluating accessors', () => {
  const f = fixture(), opened = open(f), source = open(f, 'source'), ref = opened.draft.orderedItemRefs[0];
  const summarize = api(); let getters = 0;
  const unsafe = copy(opened.draft); Object.defineProperty(unsafe.items[ref].memo, 'mode', { enumerable: true, get() { getters += 1; return 'inherit'; } });
  const topGetter = { context: opened.context }; Object.defineProperty(topGetter, 'draft', { enumerable: true, get() { getters += 1; return opened.draft; } });
  const badDrafts = [unsafe, { ...copy(opened.draft), trust: true }, { ...copy(opened.draft), items: {} },
    { ...copy(opened.draft), orderedItemRefs: [ref, ref, ref] },
    { ...copy(opened.draft), sectionTitles: { 'step-1': { mode: 'override', value: '   ' }, 'step-2': { mode: 'inherit' } } }];
  for (const mode of [{ mode: 'fixed_date', date: '2026-02-30' }, { mode: 'arbitrary' }]) {
    const draft = copy(opened.draft); draft.items[ref].schedule = mode; badDrafts.push(draft);
  }
  for (const draft of badDrafts) reject(summarize, { context: opened.context, draft });
  for (const compareDraft of [null, {}, source.draft, ...badDrafts]) reject(summarize, { context: opened.context, draft: opened.draft, compareDraft });
  reject(summarize, topGetter); reject(summarize, { context: opened.context, draft: opened.draft, trusted: true });
  assert.equal(getters, 0);
});

test('B3S15 repeated unscheduled domain failure matches actual planner, while more than 100 changes retain exact totals', () => {
  const repeated = fixture('# 반복\n## A\n- [ ] 반복 항목\n  - 날짜: 2026-09-05\n  - 반복: 매일\n  - 반복 종료: 3회', 'repeat');
  const openedRepeat = open(repeated), invalid = copy(openedRepeat.draft);
  invalid.items[invalid.orderedItemRefs[0]].schedule = { mode: 'unscheduled' };
  const large = fixture('# 큰 Flow\n## A\n' + Array.from({ length: 120 }, (_, index) => '- [ ] Item ' + (index + 1)).join('\n'), 'large');
  const opened = open(large), draft = copy(opened.draft), refs = draft.orderedItemRefs.slice(); assert.equal(refs.length, 120);
  draft.title = { mode: 'override', value: '큰 개인 Flow' };
  for (const ref of refs) draft.items[ref].memo = { mode: 'override', value: '개인 메모' };
  const summarize = api(); reject(summarize, { context: openedRepeat.context, draft: invalid });
  const failed = P.planPersonalPlanStructureState({ context: openedRepeat.context, rawState: repeated.cp.state,
    sourceRead: repeated.sourceRead, sourceEpoch: repeated.sourceEpoch, draft: invalid, now: NOW });
  assert.equal(failed.ok, false); assert.equal(failed.reason, 'invalid-effective-plan'); assert.equal(own(failed, 'state'), false);
  const result = check(summary(large, opened, draft), ['flow.title', ...refs.map(ref => field(ref, 'memo'))], [large.flow.ref, ...refs]);
  assert.equal(result.changes.length, 121); assert.equal(result.affectedRefs.length, 121); assert.equal(result.itemCount, 120);
  assert.equal(commit(large, opened, draft).commit.changed, true);
});

test('B3S16 UMD summary performs no I/O, clock or save-planner calls, and captured success cannot satisfy live freshness', () => {
  const f = fixture(), ordinary = open(f), before = bytes(f); api();
  let io = 0, clocks = 0, candidates = 0;
  const sandbox = { FlowMeIntegratedPoc: M, FlowPocTimelineContext: T,
    summaryCandidateProbe() { candidates += 1; throw new Error('summary-called-save-planner'); } };
  for (const key of ['localStorage', 'sessionStorage', 'document', 'window', 'fetch']) Object.defineProperty(sandbox, key,
    { get() { io += 1; throw new Error('summary-I/O:' + key); } });
  let code = fs.readFileSync(path.join(__dirname, 'personal-plan-context.js'), 'utf8');
  // Test-only entry probes, not changes to the product module or its semantics.
  for (const name of ['planFromOverlay', 'planPersonalPlanSourceState', 'planPersonalPlanStructureState']) {
    const pattern = new RegExp('(function ' + name + '\\([^)]*\\) \\{)'); assert.match(code, pattern);
    code = code.replace(pattern, '$1 globalThis.summaryCandidateProbe();');
  }
  vm.runInNewContext(code, sandbox); const vmP = sandbox.FlowPocPersonalPlanContext;
  const read = vmP.readPersonalPlanSourceContext({ rawState: f.cp.state, legacyBaseRaw: f.cp.legacyBaseRaw, undo: f.cp.undo,
    sourceRead: f.sourceRead, sourceEpoch: f.sourceEpoch }); assert.equal(read.ok, true, read.reason);
  const opened = vmP.inspectPersonalPlanStructureEditor({ sourceContext: read.context, flowRef: f.flow.ref }); assert.equal(opened.ok, true);
  // Explicit date parsing is pure domain validation; only ambient time reads
  // are forbidden. Do not turn this test into a ban on existing validation.
  sandbox.Date = class extends Date {
    constructor(...args) { if (!args.length) { clocks += 1; throw new Error('summary-clock'); } super(...args); }
    static now() { clocks += 1; throw new Error('summary-clock'); }
  };
  const draft = copy(opened.draft); draft.title = { mode: 'override', value: '요약만' };
  check(api(vmP)({ context: opened.context, draft }), ['flow.title'], [f.flow.ref]);
  assert.equal(io, 0); assert.equal(clocks, 0); assert.equal(candidates, 0); assert.equal(bytes(f), before);
  const stale = copy(ordinary.draft); stale.title = { mode: 'override', value: '요약만' };
  check(summary(f, ordinary, stale), ['flow.title'], [f.flow.ref]);
  const attempted = C.transitionCheckpoint(f.cp, { type: 'commit-source-bound-personal-plan-structure-context', context: ordinary.context,
    draft: stale, sourceRead: f.sourceRead, sourceEpoch: f.sourceEpoch + 1, now: NOW });
  assert.equal(attempted.ok, false); assert.equal(attempted.changed, false); assert.equal(attempted.checkpoint, f.cp);
});
