'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { M, C, NOW, clone, own, legacyFixture, currentPlanDraft } = require('./k3b-plan-lossless-gate.fixture.cjs');
const P = require('./personal-plan-context.js');
const T = require('./timeline-context.js');
const META = P.METADATA_KEY;
const task = (checkpoint, id = 'quote') => checkpoint.state.tasks.find(value => value.id === id);
const flow = (checkpoint, id = 'moving') => checkpoint.state.flows.find(value => value.id === id);
const bytes = value => JSON.stringify(value);
function freeze(value) { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }
function directOverlay(checkpoint = legacyFixture().checkpoint, value = '개인 Plan 제목') {
  const opened = P.inspectPlanContext({ state: checkpoint.state, flowRef: flow(checkpoint).ref, legacyBaseRaw: checkpoint.legacyBaseRaw, undo: checkpoint.undo });
  assert.equal(opened.ok, true, opened.reason);
  const draft = clone(opened.draft);
  draft.title = { mode: 'override', value };
  const candidate = P.planPersonalPlanState({ state: checkpoint.state, context: opened.context, draft, now: NOW });
  assert.equal(candidate.ok, true, candidate.reason);
  assert.equal(candidate.changed, true);
  return { ...checkpoint, state: candidate.state, undo: candidate.undo };
}
function open(checkpoint, flowId = 'moving', options) {
  const result = C.inspectPersonalPlanContext(checkpoint, flow(checkpoint, flowId).ref, options);
  assert.equal(result.ok, true, result.reason);
  return result;
}
function action(opened, mutate = draft => { draft.title = { mode: 'override', value: '새 개인 제목' }; }) {
  const draft = clone(opened.draft); mutate(draft);
  return { type: 'commit-personal-plan-context', context: opened.context, draft, now: NOW };
}
function changed(checkpoint, request, options) {
  const before = bytes(checkpoint);
  const result = C.transitionCheckpoint(freeze(checkpoint), request, options);
  assert.equal(result.ok, true, result.reason);
  assert.equal(result.changed, true, result.message);
  assert.equal(bytes(checkpoint), before);
  assert.equal(result.checkpoint.legacyBaseRaw, checkpoint.legacyBaseRaw);
  assert.deepEqual(result.checkpoint.undo, checkpoint.state);
  assert.equal(result.checkpoint.state.revision, checkpoint.state.revision + 1);
  return result.checkpoint;
}
function unchanged(checkpoint, request, reason, options) {
  const before = bytes(checkpoint);
  const result = C.transitionCheckpoint(freeze(checkpoint), request, options);
  assert.equal(result.changed, false);
  assert.equal(result.checkpoint, checkpoint);
  if (reason) assert.equal(result.reason, reason);
  assert.equal(bytes(checkpoint), before);
  return result;
}

test('B1C01 metadata-absent old current/Undo/unknowns retain lazy compatibility and no-op identity', () => {
  const f = legacyFixture();
  const checked = C.fromLegacy(f.raw, { personalPlan: null });
  assert.equal(checked.ok, true);
  assert.deepEqual(checked.checkpoint, f.checkpoint);
  assert.equal(C.validateCheckpoint(f.checkpoint, { personalPlan: null }).ok, true);
  unchanged(f.checkpoint, { type: 'unsupported' }, undefined, { personalPlan: null });
  const opened = open(f.checkpoint);
  unchanged(f.checkpoint, action(opened, () => {}));
  assert.equal(own(f.checkpoint.state, META), false);
  assert.equal(bytes(f.checkpoint.state.legacyUnknown), bytes(f.state.legacyUnknown));
});

test('B1C02 old root/Undo and both archived snapshots reject reserved own-key collisions without adopting valid-looking metadata', () => {
  const f = legacyFixture();
  const validLooking = directOverlay(f.checkpoint).state[META];
  for (const value of [null, {}, validLooking]) {
    for (const location of ['state', 'undo']) {
      const envelope = JSON.parse(f.raw); envelope[location][META] = value;
      const raw = bytes(envelope);
      assert.equal(C.fromLegacy(raw).ok, false, 'legacy ' + location);
      assert.equal(bytes(envelope), raw);
    }
    for (const location of ['state', 'undo']) {
      const checkpoint = clone(f.checkpoint);
      checkpoint[location].timelineContextV1.legacySnapshot[META] = value;
      assert.equal(C.validateCheckpoint(checkpoint).ok, false, 'archive ' + location);
    }
  }
});

test('B1C03 current and Undo metadata are independently strict including Undo-only data and trashed read projection', () => {
  const original = legacyFixture().checkpoint;
  const first = directOverlay(original);
  const second = directOverlay(first, '두 번째 제목');
  assert.equal(C.validateCheckpoint(first).ok, true);
  assert.equal(C.validateCheckpoint(second).ok, true);
  const undoOnly = { ...original, undo: first.state };
  assert.equal(C.validateCheckpoint(undoOnly).ok, true);
  for (const location of ['state', 'undo']) {
    const checkpoint = clone(second); checkpoint[location][META].version = 999;
    assert.equal(C.validateCheckpoint(checkpoint).ok, false, location);
  }
  const trashed = changed(first, { type: 'move-to-trash', kind: 'flow', id: 'moving', now: NOW });
  assert.equal(C.validateCheckpoint(trashed).ok, true);
  assert.equal(C.inspectPersonalPlanContext(trashed, flow(trashed).ref).ok, false);
});

test('B1C04 malformed contracts, fields, refs and baseline presence are rejected in either active snapshot', () => {
  const first = directOverlay();
  const base = directOverlay(first, '다음 제목');
  const ref = flow(base).ref;
  const variants = [
    state => { state[META].contract = 'foreign'; },
    state => { state[META].unknown = true; },
    state => { state[META].entries[ref].binding.savedCopyId = 'foreign'; },
    state => { state[META].entries[ref].binding.items.push(clone(state[META].entries[ref].binding.items[0])); },
    state => { state[META].entries[ref].legacyPlanFields.flow.sourceTitle = ''; },
    state => { state[META].entries[ref].overlay.title = '   '; },
    state => { state[META].entries[ref].overlay.orderedItemRefs = []; },
  ];
  for (const location of ['state', 'undo']) for (const mutate of variants) {
    const checkpoint = clone(base); mutate(checkpoint[location]); const before = bytes(checkpoint);
    assert.equal(C.validateCheckpoint(checkpoint).ok, false, location);
    assert.equal(bytes(checkpoint), before);
  }
});

test('B1C05 first title-only candidate has one revision/exact-before Undo without manufacturing source or filling nullable fields', () => {
  const checkpoint = legacyFixture().checkpoint;
  const next = changed(checkpoint, action(open(checkpoint)));
  assert.equal(next.state.updatedAt, NOW);
  assert.deepEqual(next.state.tasks, checkpoint.state.tasks);
  assert.deepEqual(next.state.flows, checkpoint.state.flows);
  assert.equal(own(flow(next), 'sourceTitle'), false);
  assert.equal(own(task(next), 'planDate'), false);
  assert.deepEqual(next.state.timelineContextV1, checkpoint.state.timelineContextV1);
  assert.deepEqual(next.state.legacyUnknown, checkpoint.state.legacyUnknown);
  assert.equal(P.projectPersonalPlanState(next.state).state.flows.find(value => value.id === 'moving').title, '새 개인 제목');
});

test('B1C06 unchanged mode is same-object no-op and explicit inherit removes only the last owned entry', () => {
  const first = directOverlay();
  unchanged(first, action(open(first), () => {}));
  const next = changed(first, action(open(first), draft => { draft.title = { mode: 'inherit' }; }));
  assert.equal(own(next.state, META), false);
  assert.deepEqual(next.state.tasks, first.state.tasks);
  assert.deepEqual(next.state.flows, first.state.flows);
  assert.equal(own(next.undo, META), true);
});

test('B1C07 memo owner preserves CRLF/space/empty/absence and source-description-equal explicit text', () => {
  for (const value of [' 原문과 같은 메모\r\n\t  ', '', '  ']) {
    const checkpoint = legacyFixture().checkpoint;
    delete task(checkpoint).memo;
    task(checkpoint).sourceDescription = value;
    const ref = task(checkpoint).ref;
    const next = changed(checkpoint, action(open(checkpoint), draft => { draft.items[ref].memo = { mode: 'override', value }; }));
    assert.equal(own(task(next), 'memo'), false);
    assert.equal(P.projectPersonalPlanState(next.state).state.tasks.find(item => item.id === 'quote').memo, value);
    assert.equal(next.state[META].entries[flow(next).ref].overlay.items[ref].memo, value);
  }
});

test('B1C08 supported schedules preserve intent and execution while unsupported recurring unscheduled is blocked', () => {
  for (const schedule of [{ mode: 'fixed_date', date: '2026-09-03' }, { mode: 'unscheduled' }]) {
    const checkpoint = legacyFixture().checkpoint;
    const ref = task(checkpoint, 'contract').ref;
    const next = changed(checkpoint, action(open(checkpoint), draft => { draft.items[ref].schedule = schedule; }));
    assert.deepEqual(next.state.tasks, checkpoint.state.tasks);
    assert.deepEqual(next.state[META].entries[flow(next).ref].overlay.items[ref].schedule, schedule);
    unchanged(next, action(open(next), () => {}));
    const inherited = changed(next, action(open(next), draft => { draft.items[ref].schedule = { mode: 'inherit' }; }));
    assert.equal(own(inherited.state, META), false);
  }
  const rawText = '# 반복 검사\n## 준비\n- [ ] 반복 접수\n  - 날짜: 2026-09-05\n  - 반복: 매일\n  - 반복 종료: 3회';
  const handoff = M.makeHandoff(rawText, { draftId: 'b1c-repeat-draft', handoffId: 'b1c-repeat', sourceConfirmed: true, folderId: null });
  const created = M.apply(M.seedState(), { type: 'commit-authoring', handoff, now: NOW });
  assert.equal(created.changed, true, created.error);
  const checkpoint = C.fromLegacy(bytes({ version: 1, state: created.state, undo: null })).checkpoint;
  const target = checkpoint.state.flows.find(value => value.handoffId === 'b1c-repeat');
  const ref = checkpoint.state.tasks.find(value => value.flowId === target.id).ref;
  unchanged(checkpoint, action(open(checkpoint, target.id), draft => { draft.items[ref].schedule = { mode: 'unscheduled' }; }), 'invalid-effective-plan');
});

test('B1C09 checkpoint Undo restores the entire absent-metadata snapshot and survives serialization with the existing timestamp exception', () => {
  const checkpoint = legacyFixture().checkpoint;
  const next = changed(checkpoint, action(open(checkpoint)));
  const restored = C.undoCheckpoint(JSON.parse(bytes(next)));
  assert.equal(restored.ok, true, restored.reason);
  assert.equal(restored.changed, true);
  const expected = clone(checkpoint.state); expected.updatedAt = M.TODAY + 'T12:00:00.000Z';
  assert.deepEqual(restored.checkpoint.state, expected);
  assert.equal(restored.checkpoint.undo, null);
  assert.equal(restored.checkpoint.legacyBaseRaw, checkpoint.legacyBaseRaw);
  assert.equal(C.validateCheckpoint(JSON.parse(bytes(restored.checkpoint))).ok, true);
});

test('B1C10 existing complete/reopen/date/folder/timeline actions retain metadata exactly', () => {
  let checkpoint = directOverlay();
  const metadata = bytes(checkpoint.state[META]);
  const folderId = checkpoint.state.folders.find(value => value.id !== flow(checkpoint).folderId).id;
  for (const request of [
    { type: 'complete', id: 'quote', done: true, completedAt: NOW, now: NOW },
    { type: 'complete', id: 'quote', done: false, now: NOW },
    { type: 'schedule', id: 'quote', date: '2026-09-09', now: NOW },
    { type: 'move-folder', kind: 'flow', id: 'moving', folderId, now: NOW },
  ]) { checkpoint = changed(checkpoint, request); assert.equal(bytes(checkpoint.state[META]), metadata); }
  const projection = C.projectGroups(checkpoint, 'month', M.TODAY);
  const group = projection.groups.find(value => value.context === 'date' && value.ids.length > 1);
  assert.ok(group);
  checkpoint = changed(checkpoint, { type: 'timeline-reorder', context: group.context, contextKey: group.contextKey, localToday: M.TODAY, expectedRevision: checkpoint.state.revision, currentOrderedRefKeys: group.ids, orderedRefKeys: group.ids.slice().reverse(), now: NOW }, { currentLocalToday: M.TODAY });
  assert.equal(bytes(checkpoint.state[META]), metadata);
  const reordered = C.projectGroups(checkpoint, 'month', M.TODAY).groups.find(value => value.context === group.context && value.contextKey === group.contextKey);
  checkpoint = changed(checkpoint, { type: 'timeline-reset', context: reordered.context, contextKey: reordered.contextKey, localToday: M.TODAY, expectedRevision: checkpoint.state.revision, currentOrderedRefKeys: reordered.ids, now: NOW }, { currentLocalToday: M.TODAY });
  assert.equal(bytes(checkpoint.state[META]), metadata);
  assert.equal(open(checkpoint).ok, true);
});

test('B1C11 Quick operations, trash/restore and another Flow old Plan preserve the owned entry', () => {
  let checkpoint = directOverlay(); const metadata = bytes(checkpoint.state[META]);
  checkpoint = changed(checkpoint, { type: 'add-quick', title: '이웃 Quick', date: null, folderId: null, now: NOW });
  const quick = checkpoint.state.tasks.find(value => value.title === '이웃 Quick');
  checkpoint = changed(checkpoint, { type: 'update-quick', id: quick.id, title: '바꾼 Quick', memo: ' Quick 개인 메모\r\n ', date: '2026-09-12', folderId: null, now: NOW });
  assert.equal(task(checkpoint, quick.id).memo, ' Quick 개인 메모\r\n ');
  assert.equal(task(checkpoint, quick.id).date, '2026-09-12');
  assert.equal(bytes(checkpoint.state[META]), metadata);
  checkpoint = changed(checkpoint, { type: 'complete', id: quick.id, done: true, completedAt: NOW, now: NOW });
  checkpoint = changed(checkpoint, { type: 'move-to-trash', kind: 'flow', id: 'moving', now: NOW });
  checkpoint = changed(checkpoint, { type: 'restore-from-trash', kind: 'flow', id: 'moving', now: NOW });
  const other = checkpoint.state.flows.find(value => value.id !== 'moving');
  const draft = currentPlanDraft(checkpoint.state, other.id); draft.title += ' 개인';
  checkpoint = changed(checkpoint, { type: 'commit-personal-plan', ...draft, now: NOW });
  assert.equal(bytes(checkpoint.state[META]), metadata);
  assert.equal(open(checkpoint).ok, true);
});

test('B1C12 old Plan managed-field writes and unexpected metadata injection/pruning cannot rebind or hide a conflict', () => {
  const checkpoint = directOverlay();
  const draft = currentPlanDraft(checkpoint.state); draft.title += ' old 변경';
  unchanged(checkpoint, { type: 'commit-personal-plan', ...draft, now: NOW });
  for (const original of [checkpoint, legacyFixture().checkpoint]) {
    const model = { ...M, apply(state, request) {
      const result = M.apply(state, request);
      if (own(result.state, META)) delete result.state[META];
      else result.state[META] = checkpoint.state[META];
      return result;
    } };
    unchanged(original, { type: 'complete', id: 'quote', done: true, now: NOW }, 'unexpected-personal-plan-metadata-change', { model, timeline: T });
  }
});

test('B1C13 forged/cloned/stale/foreign/effective contexts and unknown action inputs produce no candidate', () => {
  const checkpoint = legacyFixture().checkpoint;
  const opened = open(checkpoint); const request = action(opened);
  for (const context of [{ version: 1 }, clone(opened.context), open(directOverlay()).context]) unchanged(checkpoint, { ...request, context });
  unchanged(checkpoint, { ...request, sourceCandidateStore: null }, 'invalid-personal-plan-action');
  const drifted = clone(checkpoint); drifted.state.legacyUnknown.text += ' drift';
  unchanged(drifted, request);
  const overlaid = directOverlay();
  const viewCheckpoint = { ...overlaid, state: P.projectPersonalPlanState(overlaid.state).state };
  assert.equal(C.inspectPersonalPlanContext(viewCheckpoint, flow(viewCheckpoint).ref).ok, false);
  unchanged(viewCheckpoint, request);
});

test('B1C14 Plan date never becomes an inferred execution group and timeline archive/order remain exact', () => {
  const checkpoint = legacyFixture().checkpoint;
  const before = Object.fromEntries(['today', 'week', 'month', 'undated'].map(view => [view, C.projectGroups(checkpoint, view, M.TODAY)]));
  const ref = task(checkpoint).ref;
  const next = changed(checkpoint, action(open(checkpoint), draft => { draft.items[ref].schedule = { mode: 'fixed_date', date: '2026-12-31' }; }));
  for (const view of Object.keys(before)) assert.deepEqual(C.projectGroups(next, view, M.TODAY), before[view]);
  assert.deepEqual(next.state.timelineContextV1, checkpoint.state.timelineContextV1);
  assert.equal(task(next).date, task(checkpoint).date);
});

test('B1C15 signature checks array descriptors before any getter in current or Undo is invoked', () => {
  for (const location of ['state', 'undo']) {
    const checkpoint = directOverlay(directOverlay(), '두 번째 metadata');
    let reads = 0;
    const value = [];
    Object.defineProperty(value, '0', { enumerable: true, configurable: true, get() { reads += 1; return '값'; } });
    checkpoint[location].unknownGetterArray = value;
    const result = C.validateCheckpoint(checkpoint);
    assert.equal(reads, 0, location + ' getter must not execute');
    assert.equal(result.ok, false);
  }
});

test('B1C16 lossy array symbols/nonenumerable indices/holes and inherited toJSON are rejected before clone', () => {
  for (const make of [
    () => { const value = ['값']; value[Symbol('hidden')] = '손실'; return value; },
    () => { const value = ['값']; Object.defineProperty(value, '0', { enumerable: false }); return value; },
    () => new Array(1),
  ]) { const checkpoint = legacyFixture().checkpoint; checkpoint.state.unknownArray = make(); assert.equal(C.validateCheckpoint(checkpoint).ok, false); }
  let calls = 0;
  const prototype = Object.create(Array.prototype);
  prototype.toJSON = function () { calls += 1; return ['바뀐 값']; };
  const value = ['원래 값']; Object.setPrototypeOf(value, prototype);
  const checkpoint = legacyFixture().checkpoint; checkpoint.state.unknownArray = value;
  const result = C.validateCheckpoint(checkpoint);
  assert.equal(result.ok, false);
  assert.equal(calls, 0);
});

test('B1C17 actual UMD and CommonJS resolve the optional adapter lazily without DOM/storage or hidden source flags', () => {
  const sandbox = { FlowMeIntegratedPoc: M, FlowPocTimelineContext: T };
  let reads = 0;
  for (const key of ['localStorage', 'window', 'document']) Object.defineProperty(sandbox, key, { get() { reads += 1; throw new Error(key); } });
  const context = vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(require.resolve('./workspace-checkpoint.js'), 'utf8'), context);
  const api = context.FlowPocWorkspaceCheckpoint;
  const old = api.fromLegacy(null); assert.equal(old.ok, true);
  assert.equal(api.validateCheckpoint(directOverlay()).ok, false);
  vm.runInContext(fs.readFileSync(require.resolve('./personal-plan-context.js'), 'utf8'), context);
  assert.equal(api.validateCheckpoint(directOverlay()).ok, true);
  const opened = api.inspectPersonalPlanContext(old.checkpoint, old.checkpoint.state.flows[0].ref);
  assert.equal(opened.ok, true, opened.reason);
  const next = api.transitionCheckpoint(old.checkpoint, action(opened));
  assert.equal(next.ok, true, next.reason);
  assert.equal(next.changed, true);
  assert.equal(reads, 0);
  for (const personalPlan of [null, { ...P, VERSION: 999 }, { ...P, CONTRACT: 'foreign' }, { ...P, METADATA_KEY: 'foreign' },
    ...['inspectPlanContext', 'normalizePlanDraft', 'projectPersonalPlanState', 'planPersonalPlanState'].map(name => ({ ...P, [name]: undefined }))]) {
    assert.equal(C.validateCheckpoint(directOverlay(), { personalPlan }).ok, false);
    assert.equal(C.validateCheckpoint(legacyFixture().checkpoint, { personalPlan }).ok, true);
    assert.equal(C.inspectPersonalPlanContext(legacyFixture().checkpoint, flow(legacyFixture().checkpoint).ref, { personalPlan }).ok, false);
  }
  assert.equal(C.validateCheckpoint(legacyFixture().checkpoint, { personalPlan: null }).ok, true);
  for (const original of [legacyFixture().checkpoint, directOverlay()]) {
    // Actual standard JSON containers from another VM, not spoofed prototypes.
    const otherRealm = vm.runInNewContext('JSON.parse(' + JSON.stringify(bytes(original)) + ')');
    assert.equal(C.validateCheckpoint(otherRealm).ok, true);
    const inspected = open(otherRealm);
    const draft = action(inspected, value => { value.title = { mode: 'override', value: '교차 realm 개인 제목' }; });
    const result = C.transitionCheckpoint(otherRealm, draft);
    assert.equal(result.ok, true, result.reason);
    assert.equal(result.changed, true);
    assert.equal(bytes(result.checkpoint.undo), bytes(otherRealm.state));
    assert.equal(C.validateCheckpoint(result.checkpoint).ok, true);
  }
});

test('B1C18 accepted old invalid Plan date remains readable but new Plan inspection refuses it without migration', () => {
  const checkpoint = legacyFixture().checkpoint;
  task(checkpoint).planDate = 'legacy-unknown-date';
  const before = bytes(checkpoint);
  assert.equal(C.validateCheckpoint(checkpoint).ok, true);
  assert.equal(C.inspectPersonalPlanContext(checkpoint, flow(checkpoint).ref).ok, false);
  assert.equal(bytes(checkpoint), before);
});
