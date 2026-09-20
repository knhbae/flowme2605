'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const P = require('./personal-plan-context.js');
const { M, C, NOW, clone, own, legacyFixture, sourceUpdateFixture } = require('./k3b-plan-lossless-gate.fixture.cjs');
const T = require('./timeline-context.js');
const task = (state, id) => state.tasks.find(value => value.id === id);
const flow = (state, id = 'moving') => state.flows.find(value => value.id === id);
const itemRef = (state, id = 'quote') => task(state, id).ref;

function inspect(state, id = 'moving', extra = {}) {
  const result = P.inspectPlanContext({ state, flowRef: flow(state, id).ref, ...extra });
  assert.equal(result.ok, true, result.reason);
  return result;
}
function fixture() { const f = legacyFixture(); return { ...f, opened: inspect(f.checkpoint.state, 'moving', { legacyBaseRaw: f.raw, undo: f.checkpoint.undo }) }; }
function edit(opened, change) { const draft = clone(opened.draft); change(draft); return draft; }
function commit(state, opened, draft) {
  const before = JSON.stringify(state);
  const result = P.planPersonalPlanState({ state, context: opened.context, draft, now: NOW });
  assert.equal(result.ok, true, result.reason);
  assert.equal(result.changed, true);
  assert.equal(JSON.stringify(state), before);
  assert.deepEqual(result.undo, state);
  return result;
}
function projected(state) { const result = P.projectPersonalPlanState(state); assert.equal(result.ok, true, result.reason); return result.state; }
function changedFlowTitle(f = fixture()) {
  const draft = edit(f.opened, value => { value.title = { mode: 'override', value: '내 Flow 제목' }; });
  return { ...f, result: commit(f.checkpoint.state, f.opened, draft) };
}

test('P01 UMD API is lazy and exposes no storage reader/writer or C/E/D dependency', () => {
  let reads = 0;
  const sandbox = { FlowMeIntegratedPoc: M, FlowPocTimelineContext: T };
  for (const key of ['localStorage', 'window', 'document']) Object.defineProperty(sandbox, key, { get() { reads += 1; throw new Error(key); } });
  const context = vm.createContext(sandbox);
  const source = fs.readFileSync(require.resolve('./personal-plan-context.js'), 'utf8');
  vm.runInContext(source, context);
  assert.deepEqual(Object.keys(context.FlowPocPersonalPlanContext), Object.keys(P));
  assert.equal(reads, 0);
  assert.equal(P.VERSION, 1);
  assert.equal(P.METADATA_KEY, 'personalPlanContextV1');
  assert.doesNotMatch(source, /require\(['"]\.\/(?:workspace-checkpoint|plan-item-session|workspace-permanent-delete)\./u);
});

test('P02 inspection preserves nullable presence and labels the old baseline without manufacturing source authority', () => {
  const f = fixture();
  const before = JSON.stringify(f.checkpoint);
  assert.equal(f.opened.baseline.owner, 'existing-personal-baseline');
  assert.equal(f.opened.baseline.items[itemRef(f.checkpoint.state)].planDatePresent, false);
  assert.equal(f.opened.baseline.items[itemRef(f.checkpoint.state, 'contract')].planDatePresent, true);
  assert.equal(f.opened.baseline.items[itemRef(f.checkpoint.state, 'contract')].planDate, '2026-09-03');
  assert.deepEqual(f.opened.draft.items[itemRef(f.checkpoint.state)].schedule, { mode: 'inherit' });
  assert.equal(JSON.stringify(f.checkpoint), before);
  assert.equal(own(task(f.checkpoint.state, 'quote'), 'sourceTitle'), false);
});

test('P03 open and unchanged draft create no optional field, revision, Undo or candidate state', () => {
  const f = fixture();
  const result = P.planPersonalPlanState({ state: f.checkpoint.state, context: f.opened.context, draft: f.opened.draft, now: NOW });
  assert.equal(result.ok, true);
  assert.equal(result.changed, false);
  assert.equal(result.state, f.checkpoint.state);
  assert.equal(own(result, 'undo'), false);
  assert.equal(own(result.state, P.METADATA_KEY), false);
});

test('P04 explicit Flow title lives only in metadata and effective projection, with exact raw fields and prior Undo', () => {
  const f = changedFlowTitle();
  assert.equal(flow(f.result.state).title, flow(f.checkpoint.state).title);
  assert.equal(own(flow(f.result.state), 'sourceTitle'), false);
  assert.equal(projected(f.result.state).flows.find(value => value.id === 'moving').title, '내 Flow 제목');
  assert.equal(f.result.state.revision, f.checkpoint.state.revision + 1);
  assert.equal(f.result.state.updatedAt, NOW);
});

test('P05 same-title Items use exact refs and preserve neighboring fields and source membership', () => {
  const f = fixture();
  task(f.checkpoint.state, 'quote').title = '같은 제목';
  task(f.checkpoint.state, 'contract').title = '같은 제목';
  f.opened = inspect(f.checkpoint.state);
  const draft = edit(f.opened, value => { value.items[itemRef(f.checkpoint.state)].title = { mode: 'override', value: '내 할 일' }; });
  const result = commit(f.checkpoint.state, f.opened, draft);
  const view = projected(result.state);
  assert.equal(task(view, 'quote').title, '내 할 일');
  assert.deepEqual(task(result.state, 'quote'), task(f.checkpoint.state, 'quote'));
  assert.deepEqual(task(view, 'contract'), task(f.checkpoint.state, 'contract'));
  assert.deepEqual(flow(view).steps, flow(f.checkpoint.state).steps);
});

test('P06 source-description-equal memo remains private and preserves whitespace and CRLF exactly', () => {
  const f = fixture();
  const memo = ' 원문 설명\r\n\t그대로 ';
  task(f.checkpoint.state, 'quote').sourceDescription = memo;
  f.opened = inspect(f.checkpoint.state);
  const draft = edit(f.opened, value => { value.items[itemRef(f.checkpoint.state)].memo = { mode: 'override', value: memo }; });
  const result = commit(f.checkpoint.state, f.opened, draft);
  const view = projected(result.state);
  assert.equal(task(view, 'quote').memo, memo);
  assert.equal(task(view, 'quote').sourceDescription, memo);
  assert.equal(task(result.state, 'quote').memo, '');
});

test('P07 absent memo and explicit empty memo remain different while inherited empty memo is a no-op', () => {
  const f = fixture();
  delete task(f.checkpoint.state, 'quote').memo;
  f.opened = inspect(f.checkpoint.state);
  const ref = itemRef(f.checkpoint.state);
  const draft = edit(f.opened, value => { value.items[ref].memo = { mode: 'override', value: '' }; });
  const result = commit(f.checkpoint.state, f.opened, draft);
  assert.equal(own(task(result.state, 'quote'), 'memo'), false);
  assert.equal(task(projected(result.state), 'quote').memo, '');
  assert.equal(own(result.state[P.METADATA_KEY].entries[flow(result.state).ref].overlay.items[ref], 'memo'), true);
  const ordinary = fixture();
  const same = edit(ordinary.opened, value => { value.items[itemRef(ordinary.checkpoint.state)].memo = { mode: 'override', value: '' }; });
  assert.equal(P.planPersonalPlanState({ state: ordinary.checkpoint.state, context: ordinary.opened.context, draft: same, now: NOW }).changed, false);
});

test('P08 fixed date equal to the existing date is an explicit pin and survives reopen unchanged', () => {
  const f = fixture();
  const ref = itemRef(f.checkpoint.state, 'contract');
  const draft = edit(f.opened, value => { value.items[ref].schedule = { mode: 'fixed_date', date: '2026-09-03' }; });
  const result = commit(f.checkpoint.state, f.opened, draft);
  const reopened = inspect(result.state);
  assert.deepEqual(reopened.draft.items[ref].schedule, { mode: 'fixed_date', date: '2026-09-03' });
  assert.equal(P.planPersonalPlanState({ state: result.state, context: reopened.context, draft: reopened.draft, now: NOW }).changed, false);
  assert.deepEqual(result.state.tasks, f.checkpoint.state.tasks);
});

test('P09 unscheduled changes only the effective personal plan date, not execution date/time/completion', () => {
  const f = fixture();
  const draft = edit(f.opened, value => { value.items[itemRef(f.checkpoint.state, 'contract')].schedule = { mode: 'unscheduled' }; });
  const result = commit(f.checkpoint.state, f.opened, draft);
  const before = task(f.checkpoint.state, 'contract');
  const after = task(projected(result.state), 'contract');
  assert.equal(after.planDate, null);
  for (const key of ['date', 'time', 'done', 'completedAt', 'sourceDate']) assert.deepEqual(after[key], before[key]);
});

test('P10 explicit inherit removes the last overlay without rewriting the original managed fields', () => {
  const f = changedFlowTitle();
  const opened = inspect(f.result.state);
  const draft = edit(opened, value => { value.title = { mode: 'inherit' }; });
  const result = commit(f.result.state, opened, draft);
  assert.equal(own(result.state, P.METADATA_KEY), false);
  assert.deepEqual(result.state.tasks, f.checkpoint.state.tasks);
  assert.deepEqual(result.state.flows, f.checkpoint.state.flows);
  assert.deepEqual(result.undo, f.result.state);
});

test('P11 changes in a second Flow preserve the first entry and same-title copies cannot share an overlay', () => {
  const initial = fixture();
  flow(initial.checkpoint.state, 'memo').title = flow(initial.checkpoint.state).title;
  initial.opened = inspect(initial.checkpoint.state);
  const f = changedFlowTitle(initial);
  const opened = inspect(f.result.state, 'memo');
  const draft = edit(opened, value => { value.title = { mode: 'override', value: '다른 Flow' }; });
  const result = commit(f.result.state, opened, draft);
  const beforeEntry = f.result.state[P.METADATA_KEY].entries[flow(f.result.state).ref];
  assert.deepEqual(result.state[P.METADATA_KEY].entries[flow(result.state).ref], beforeEntry);
  assert.equal(Object.keys(result.state[P.METADATA_KEY].entries).length, 2);
});

test('P12 candidate retains all unknown fields and both legacy archives without a second checkpoint snapshot', () => {
  const f = changedFlowTitle();
  assert.deepEqual(f.result.state.legacyUnknown, f.checkpoint.state.legacyUnknown);
  assert.deepEqual(f.result.state.timelineContextV1, f.checkpoint.state.timelineContextV1);
  assert.deepEqual(f.result.undo, f.checkpoint.state);
  const entry = f.result.state[P.METADATA_KEY].entries[flow(f.result.state).ref];
  assert.equal(own(entry, 'checkpointRaw'), false);
  assert.equal(own(entry, 'legacyBaseRaw'), false);
});

test('P13 old managed field drift is blocked rather than hidden under a saved overlay', () => {
  const f = changedFlowTitle();
  const drifted = clone(f.result.state);
  task(drifted, 'quote').memo = '다른 HTML에서 변경';
  assert.equal(P.inspectPlanContext({ state: drifted, flowRef: flow(drifted).ref }).ok, false);
  assert.equal(P.projectPersonalPlanState(drifted).ok, false);
});

test('P14 unrelated completion permits fresh inspection but the earlier context is stale for commit', () => {
  const f = changedFlowTitle();
  const opened = inspect(f.result.state);
  const changed = M.apply(f.result.state, { type: 'complete', id: 'quote', done: true, now: NOW }).state;
  assert.equal(P.inspectPlanContext({ state: changed, flowRef: flow(changed).ref }).ok, true);
  assert.equal(P.planPersonalPlanState({ state: changed, context: opened.context, draft: opened.draft, now: NOW }).reason, 'stale-plan-context');
});

test('P15 forged, cloned or serialized contexts never gain authority', () => {
  const f = fixture();
  assert.deepEqual(JSON.parse(JSON.stringify(f.opened.context)), { version: 1 });
  for (const context of [{ version: 1 }, { ...f.opened.context }, JSON.parse(JSON.stringify(f.opened.context))]) {
    assert.equal(P.normalizePlanDraft(context, f.opened.draft).reason, 'invalid-plan-context');
    assert.equal(P.planPersonalPlanState({ state: f.checkpoint.state, context, draft: f.opened.draft, now: NOW }).ok, false);
  }
});

test('P16 duplicate or cross-copy source identities are rejected before any context is issued', () => {
  for (const mutate of [
    state => { task(state, 'contract').ref = task(state, 'quote').ref; },
    state => { task(state, 'quote').ref = 'flow-item:foreign:flow-moving:item-quote'; },
    state => { flow(state).ref = 'saved-flow:foreign:flow-moving'; },
    state => { state.flows.push(clone(flow(state))); },
  ]) {
    const state = legacyFixture().checkpoint.state;
    mutate(state);
    assert.equal(P.inspectPlanContext({ state, flowRef: flow(state).ref }).ok, false);
  }
});

test('P17 blank titles, invalid mode/date, unknown fields and foreign Item draft keys are rejected', () => {
  const f = fixture();
  const ref = itemRef(f.checkpoint.state);
  const mutations = [
    draft => { draft.title = { mode: 'override', value: '  ' }; },
    draft => { draft.items[ref].schedule = { mode: 'fixed_date', date: '2026-02-30' }; },
    draft => { draft.items[ref].schedule = { mode: 'unscheduled', date: '2026-09-09' }; },
    draft => { draft.items[ref].memo = { mode: 'invented', value: '' }; },
    draft => { draft.items[ref].memo = { mode: 'override', value: null }; },
    draft => { draft.extra = true; },
    draft => { draft.items.foreign = draft.items[ref]; },
    draft => { delete draft.items[ref]; },
  ];
  for (const mutate of mutations) assert.equal(P.normalizePlanDraft(f.opened.context, edit(f.opened, mutate)).ok, false);
});

test('P18 section titles and global Item order remain unsupported, including empty opt-in fields', () => {
  const f = fixture();
  for (const field of ['sectionTitles', 'orderedItemRefs']) {
    const draft = edit(f.opened, value => { value[field] = field === 'sectionTitles' ? {} : []; });
    assert.equal(P.normalizePlanDraft(f.opened.context, draft).ok, false);
  }
  const good = changedFlowTitle();
  good.result.state[P.METADATA_KEY].entries[flow(good.result.state).ref].overlay.sectionTitles = {};
  assert.equal(P.projectPersonalPlanState(good.result.state).ok, false);
});

test('P19 unknown metadata version/contract/record fields and mismatched baseline presence are rejected', () => {
  for (const mutate of [
    meta => { meta.version = 999; },
    meta => { meta.contract = 'foreign'; },
    meta => { meta.extra = true; },
    meta => { Object.values(meta.entries)[0].extra = true; },
    meta => { Object.values(meta.entries)[0].legacyPlanFields.items[0].memo = undefined; },
    meta => { delete Object.values(meta.entries)[0].legacyPlanFields.items[0].memo; },
  ]) {
    const f = changedFlowTitle();
    mutate(f.result.state[P.METADATA_KEY]);
    assert.equal(P.projectPersonalPlanState(f.result.state).ok, false);
  }
});

test('P20 a reserved collision in old raw, current archive or prior Undo archive blocks adoption', () => {
  for (const location of ['raw', 'archive', 'undo']) {
    const f = legacyFixture();
    const extra = { legacyBaseRaw: f.raw, undo: f.checkpoint.undo };
    if (location === 'raw') { const raw = JSON.parse(f.raw); raw.state[P.METADATA_KEY] = { foreign: true }; extra.legacyBaseRaw = JSON.stringify(raw); }
    if (location === 'archive') f.checkpoint.state.timelineContextV1.legacySnapshot[P.METADATA_KEY] = { foreign: true };
    if (location === 'undo') extra.undo.timelineContextV1.legacySnapshot[P.METADATA_KEY] = { foreign: true };
    assert.equal(P.inspectPlanContext({ state: f.checkpoint.state, flowRef: flow(f.checkpoint.state).ref, ...extra }).reason, 'legacy-reserved-field-collision');
  }
});

test('P21 invalid old planDate blocks new editing without changing accepted old bytes', () => {
  const f = legacyFixture();
  task(f.checkpoint.state, 'quote').planDate = 'invalid old value';
  const before = JSON.stringify(f.checkpoint);
  assert.equal(C.validateCheckpoint(f.checkpoint).ok, true);
  assert.equal(P.inspectPlanContext({ state: f.checkpoint.state, flowRef: flow(f.checkpoint.state).ref }).ok, false);
  assert.equal(JSON.stringify(f.checkpoint), before);
});

test('P22 dangerous keys, custom prototypes, accessors, sparse arrays and non-JSON values fail closed', () => {
  let getters = 0;
  for (const unsafe of [JSON.parse('{"__proto__":{"polluted":true}}'), { constructor: { prototype: { polluted: true } } }, new Date(), Object.create({ inherited: 'foreign' }), [ , 1 ], { x: undefined }, { x: Infinity }, { get x() { getters += 1; return 'unsafe'; } }]) {
    const state = legacyFixture().checkpoint.state;
    state.extraUnknown = unsafe;
    assert.equal(P.inspectPlanContext({ state, flowRef: flow(state).ref }).ok, false);
  }
  assert.equal(getters, 0);
  assert.equal({}.polluted, undefined);
});

test('P23 public drafts and baselines cannot mutate private context or caller-owned state', () => {
  const f = fixture();
  const before = JSON.stringify(f.checkpoint.state);
  assert.equal(Reflect.set(f.opened.draft.title, 'mode', 'foreign'), false);
  assert.equal(Reflect.set(f.opened.baseline.items[itemRef(f.checkpoint.state)], 'memo', 'foreign'), false);
  assert.equal(P.normalizePlanDraft(f.opened.context, f.opened.draft).ok, true);
  assert.equal(JSON.stringify(f.checkpoint.state), before);
});

test('P24 equal title/memo normalize to inheritance but fixed date equality never does', () => {
  const f = fixture();
  const ref = itemRef(f.checkpoint.state, 'contract');
  const draft = edit(f.opened, value => {
    value.title = { mode: 'override', value: flow(f.checkpoint.state).title };
    value.items[ref].memo = { mode: 'override', value: '' };
    value.items[ref].schedule = { mode: 'fixed_date', date: '2026-09-03' };
  });
  const normalized = P.normalizePlanDraft(f.opened.context, draft);
  assert.equal(normalized.ok, true);
  assert.equal(own(normalized.overlay, 'title'), false);
  assert.equal(own(normalized.overlay.items[ref], 'memo'), false);
  assert.deepEqual(normalized.overlay.items[ref].schedule, { mode: 'fixed_date', date: '2026-09-03' });
});

test('P25 a nonselected corrupt entry blocks the full projection rather than exposing partial trusted Flows', () => {
  const f = changedFlowTitle();
  const entry = clone(Object.values(f.result.state[P.METADATA_KEY].entries)[0]);
  f.result.state[P.METADATA_KEY].entries.foreign = entry;
  assert.equal(P.inspectPlanContext({ state: f.result.state, flowRef: flow(f.result.state).ref }).ok, false);
  assert.equal(P.projectPersonalPlanState(f.result.state).ok, false);
});

test('P26 resetting one Flow keeps other overlay entries exactly and never creates an independent Undo', () => {
  const f = changedFlowTitle();
  const second = inspect(f.result.state, 'memo');
  const both = commit(f.result.state, second, edit(second, value => { value.title = { mode: 'override', value: '다른 개인 제목' }; }));
  const opened = inspect(both.state);
  const result = commit(both.state, opened, edit(opened, value => { value.title = { mode: 'inherit' }; }));
  assert.equal(Object.keys(result.state[P.METADATA_KEY].entries).length, 1);
  assert.deepEqual(result.state[P.METADATA_KEY].entries[flow(result.state, 'memo').ref], both.state[P.METADATA_KEY].entries[flow(result.state, 'memo').ref]);
  assert.deepEqual(result.undo, both.state);
  assert.equal(own(result.state[P.METADATA_KEY], 'undo'), false);
});

test('P27 raw source update composition is not silently accepted under an older raw-state context', () => {
  const f = sourceUpdateFixture();
  const opened = inspect(f.state, f.flow.id);
  const composed = M.composeSourceCandidateState(f.state, f.store);
  const draft = edit(opened, value => { value.title = { mode: 'override', value: '새 개인 제목' }; });
  assert.equal(P.planPersonalPlanState({ state: composed, context: opened.context, draft, now: NOW }).reason, 'stale-plan-context');
  assert.equal(JSON.stringify(f.state), f.before);
});

test('P28 invalid action time and revision overflow fail without a candidate or raw mutation', () => {
  const f = fixture();
  const draft = edit(f.opened, value => { value.title = { mode: 'override', value: '새 제목' }; });
  assert.equal(P.planPersonalPlanState({ state: f.checkpoint.state, context: f.opened.context, draft, now: 'not-a-time' }).ok, false);
  f.checkpoint.state.revision = Number.MAX_SAFE_INTEGER;
  const opened = inspect(f.checkpoint.state);
  assert.equal(P.planPersonalPlanState({ state: f.checkpoint.state, context: opened.context, draft: edit(opened, value => { value.title = { mode: 'override', value: '다른 제목' }; }), now: NOW }).reason, 'revision-overflow');
});

test('P29 genuine authored source and personal raw memo/date/completion remain exact through title-only metadata', () => {
  const f = sourceUpdateFixture();
  const opened = inspect(f.state, f.flow.id);
  const result = commit(f.state, opened, edit(opened, value => { value.title = { mode: 'override', value: '내 Flow만 수정' }; }));
  assert.deepEqual(result.state.flows, f.state.flows);
  assert.deepEqual(result.state.tasks, f.state.tasks);
  assert.equal(task(projected(result.state), f.task.id).date, '2026-09-07');
  assert.equal(task(projected(result.state), f.task.id).planDate, '2026-09-08');
});

test('P30 input with a trashed target is unavailable, while metadata survives ordinary trash projection', () => {
  const f = changedFlowTitle();
  const trashed = M.apply(f.result.state, { type: 'move-to-trash', kind: 'flow', id: 'moving', now: NOW }).state;
  assert.equal(P.inspectPlanContext({ state: trashed, flowRef: flow(trashed).ref }).reason, 'trashed-plan');
  assert.equal(P.projectPersonalPlanState(trashed).ok, true);
  assert.deepEqual(trashed[P.METADATA_KEY], f.result.state[P.METADATA_KEY]);
});

test('P31 actual UMD inspection/projection uses only M/T and never accesses browser storage or DOM', () => {
  let accesses = 0;
  const sandbox = { FlowMeIntegratedPoc: M, FlowPocTimelineContext: T };
  for (const key of ['localStorage', 'window', 'document']) Object.defineProperty(sandbox, key, { get() { accesses += 1; throw new Error(key); } });
  const runtime = vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(require.resolve('./personal-plan-context.js'), 'utf8'), runtime);
  const f = legacyFixture();
  const browser = runtime.FlowPocPersonalPlanContext;
  const opened = browser.inspectPlanContext({ state: f.checkpoint.state, flowRef: flow(f.checkpoint.state).ref });
  assert.equal(opened.ok, true, opened.reason);
  const draft = edit(opened, value => { value.title = { mode: 'override', value: 'UMD 개인 제목' }; });
  const result = browser.planPersonalPlanState({ state: f.checkpoint.state, context: opened.context, draft, now: NOW });
  assert.equal(result.ok, true, result.reason);
  assert.equal(flow(browser.projectPersonalPlanState(result.state).state).title, 'UMD 개인 제목');
  assert.equal(accesses, 0);
});

test('P32 changed effective projection is view-only and cannot be reused as raw state or a commit under its old context', () => {
  const f = changedFlowTitle();
  const opened = inspect(f.result.state);
  const view = P.projectPersonalPlanState(f.result.state);
  assert.equal(view.viewOnly, true);
  assert.equal(P.inspectPlanContext({ state: view.state, flowRef: flow(view.state).ref }).ok, false);
  assert.equal(P.projectPersonalPlanState(view.state).ok, false);
  assert.equal(P.planPersonalPlanState({ state: view.state, context: opened.context, draft: opened.draft, now: NOW }).reason, 'stale-plan-context');
});

test('P33 all absent/extra/foreign/duplicate Step membership cases are rejected by the existing domain guard', () => {
  for (const mutate of [
    state => { flow(state).steps[0].itemIds.pop(); },
    state => { const extra = clone(task(state, 'quote')); extra.id = 'extra'; extra.ref = 'flow-item:copy-map-moving:flow-moving:item-extra'; state.tasks.push(extra); },
    state => { flow(state).steps.push({ id: 'duplicate-step', title: '다른 단계', itemIds: ['quote'] }); },
    state => { task(state, 'quote').flowId = 'memo'; },
    state => { flow(state, 'memo').steps[0].itemIds.push('quote'); },
    state => { state.tasks.push(clone(task(state, 'quote'))); },
  ]) {
    const state = legacyFixture().checkpoint.state;
    mutate(state);
    assert.ok(M.validate(state).length > 0);
    const before = JSON.stringify(state);
    assert.equal(P.inspectPlanContext({ state, flowRef: flow(state).ref }).ok, false);
    assert.equal(P.projectPersonalPlanState(state).ok, false);
    assert.equal(JSON.stringify(state), before);
  }
});

test('P34 options accessors and prototype flags are rejected before a getter or unknown trust flag is consumed', () => {
  let accesses = 0;
  const input = { get state() { accesses += 1; return legacyFixture().checkpoint.state; }, flowRef: 'saved-flow:copy-map-moving:flow-moving' };
  assert.equal(P.inspectPlanContext(input).ok, false);
  assert.equal(accesses, 0);
  const f = fixture();
  assert.equal(P.inspectPlanContext({ state: f.checkpoint.state, flowRef: flow(f.checkpoint.state).ref, trusted: true }).ok, false);
  assert.equal(P.planPersonalPlanState({ get state() { accesses += 1; return f.checkpoint.state; }, context: f.opened.context, draft: f.opened.draft, now: NOW }).ok, false);
  assert.equal(accesses, 0);
});

test('P35 a raw execution move leaves saved Plan metadata valid without creating an inheritance owner', () => {
  const f = changedFlowTitle();
  const moved = M.apply(f.result.state, { type: 'schedule', id: 'quote', date: '2026-09-12', now: NOW }).state;
  assert.equal(P.inspectPlanContext({ state: moved, flowRef: flow(moved).ref }).ok, true);
  const view = projected(moved);
  assert.equal(task(view, 'quote').date, '2026-09-12');
  assert.equal(own(task(view, 'quote'), 'scheduleMode'), false);
  assert.equal(own(task(moved, 'quote'), 'planDate'), false);
  assert.deepEqual(moved[P.METADATA_KEY], f.result.state[P.METADATA_KEY]);
});

test('P36 raw-state candidate and exact-before can be wrapped in existing C without claiming C validates the new contract yet', () => {
  const f = changedFlowTitle();
  const candidate = { ...f.checkpoint, state: f.result.state, undo: f.result.undo };
  assert.equal(candidate.legacyBaseRaw, f.raw);
  assert.equal(C.validateCheckpoint(candidate).ok, true);
  assert.deepEqual(candidate.state.tasks, f.checkpoint.state.tasks);
  assert.deepEqual(candidate.undo, f.checkpoint.state);
  const undone = C.undoCheckpoint(candidate);
  assert.equal(undone.ok, true);
  assert.equal(own(undone.checkpoint.state, P.METADATA_KEY), false);
  assert.deepEqual(undone.checkpoint.state, { ...f.checkpoint.state, updatedAt: M.TODAY + 'T12:00:00.000Z' });
});

test('P37 existing recurrence constraints reject an unsupported effective plan without changing the raw recurrence', () => {
  const rawText = '# 반복 검사\n## 준비\n- [ ] 반복 접수\n  - 날짜: 2026-09-05\n  - 반복: 매일\n  - 반복 종료: 3회';
  const handoff = M.makeHandoff(rawText, { draftId: 'b1-repeat-draft', handoffId: 'b1-repeat', sourceConfirmed: true, folderId: null });
  const created = M.apply(M.seedState(), { type: 'commit-authoring', handoff, now: NOW });
  assert.equal(created.changed, true, created.error);
  const target = created.state.flows.find(value => value.handoffId === 'b1-repeat');
  const opened = inspect(created.state, target.id);
  const ref = created.state.tasks.find(value => value.flowId === target.id).ref;
  const before = JSON.stringify(created.state);
  const draft = edit(opened, value => { value.items[ref].schedule = { mode: 'unscheduled' }; });
  const result = P.planPersonalPlanState({ state: created.state, context: opened.context, draft, now: NOW });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'invalid-effective-plan');
  assert.equal(JSON.stringify(created.state), before);
});

test('P38 mutating a returned candidate cannot contaminate its inspect context or recreate an accepted private draft', () => {
  const f = changedFlowTitle();
  const first = f.result.state[P.METADATA_KEY].entries[flow(f.result.state).ref];
  first.overlay.title = '외부 후보 수정';
  const normalized = P.normalizePlanDraft(f.opened.context, f.opened.draft);
  assert.equal(normalized.ok, true);
  assert.equal(own(normalized.overlay, 'title'), false);
  const sameCandidate = commit(f.checkpoint.state, f.opened, edit(f.opened, value => { value.title = { mode: 'override', value: '내 Flow 제목' }; }));
  assert.equal(sameCandidate.state[P.METADATA_KEY].entries[flow(sameCandidate.state).ref].overlay.title, '내 Flow 제목');
});

test('P39 a custom Array prototype with inherited toJSON cannot erase unknown data during inspection or candidate cloning', context => {
  const f = legacyFixture();
  let calls = 0;
  const values = ['UNKNOWN_VALUE_MUST_SURVIVE'];
  const foreignPrototype = Object.create(Array.prototype);
  Object.defineProperty(foreignPrototype, 'toJSON', { value() { calls += 1; return []; } });
  Object.setPrototypeOf(values, foreignPrototype);
  f.checkpoint.state.future = { values };
  const result = P.inspectPlanContext({ state: f.checkpoint.state, flowRef: flow(f.checkpoint.state).ref });
  context.diagnostic('inheritedToJsonCalls=' + calls + ', inspectionAccepted=' + result.ok);
  assert.equal(result.ok, false);
  assert.equal(calls, 0);
  assert.equal(values[0], 'UNKNOWN_VALUE_MUST_SURVIVE');
});

test('P40 genuine standard Arrays and Objects from another realm remain valid JSON input', () => {
  const f = legacyFixture();
  f.checkpoint.state.future = vm.runInNewContext('({ values: [{ text: "다른 realm 값" }, null, [1, 2, 3]] })');
  const before = JSON.stringify(f.checkpoint.state.future);
  const stateBefore = JSON.stringify(f.checkpoint.state);
  const opened = inspect(f.checkpoint.state);
  const result = P.planPersonalPlanState({ state: f.checkpoint.state, context: opened.context,
    draft: edit(opened, value => { value.title = { mode: 'override', value: '교차 realm 변경' }; }), now: NOW });
  assert.equal(result.ok, true, result.reason);
  assert.equal(result.changed, true);
  // JSON-value preservation is the contract; cross-realm prototypes are not.
  assert.equal(JSON.stringify(result.undo), stateBefore);
  assert.equal(JSON.stringify(f.checkpoint.state), stateBefore);
  assert.equal(JSON.stringify(result.state.future), before);
  assert.equal(JSON.stringify(result.undo.future), before);
});

test('P41 array symbols, nonenumerable indices, getters and cycles fail before a property getter is evaluated', () => {
  let calls = 0;
  const getter = [1];
  Object.defineProperty(getter, '0', { enumerable: true, get() { calls += 1; return 1; } });
  const hidden = [1];
  Object.defineProperty(hidden, '0', { enumerable: false, value: 1 });
  const symbol = [1];
  symbol[Symbol('unknown')] = 'do not drop';
  const cycle = [1];
  cycle.push(cycle);
  for (const values of [getter, hidden, symbol, cycle]) {
    const f = legacyFixture();
    f.checkpoint.state.future = { values };
    assert.equal(P.inspectPlanContext({ state: f.checkpoint.state, flowRef: flow(f.checkpoint.state).ref }).ok, false);
  }
  assert.equal(calls, 0);
});
