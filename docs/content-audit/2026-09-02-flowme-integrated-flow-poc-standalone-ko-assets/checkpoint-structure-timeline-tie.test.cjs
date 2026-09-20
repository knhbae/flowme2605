'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('./model.js');
const C = require('./workspace-checkpoint.js');
const P = require('./personal-plan-context.js');
const R = require('./timeline-result-rank.js');
const DATE = '2026-09-05', NOW = DATE + 'T14:30:00.000Z';
const clone = value => JSON.parse(JSON.stringify(value)), bytes = value => JSON.stringify(value);
function fromState(state) {
  const result = C.fromLegacy(' \r\n' + bytes({ version: 1, state, undo: null }) + '\r\n ');
  assert.equal(result.ok, true, result.reason); return result.checkpoint;
}
function fixture(date = DATE, setup = () => {}) {
  let state = { ...M.seedState(), flows: [], tasks: [], orders: {} };
  const flows = [];
  for (const letter of ['A', 'B']) {
    const raw = '# Flow ' + letter + '\n## 첫 구간\n- [ ] ' + letter + '1\n  - 날짜: ' + date
      + '\n  - 시간: 09:00\n- [ ] ' + letter + '2\n  - 날짜: ' + date + '\n  - 시간: 09:00'
      + (letter === 'A' ? '\n## 둘째 구간\n- [ ] A3\n  - 날짜: ' + date + '\n  - 시간: 09:00' : '');
    const handoff = M.makeHandoff(raw, { handoffId: 'tie-handoff-' + letter, draftId: 'tie-draft-' + letter, sourceConfirmed: true, folderId: null });
    const saved = M.apply(state, { type: 'commit-authoring', handoff, now: NOW });
    assert.equal(saved.changed, true, saved.error); state = saved.state;
    flows.push(state.flows.find(flow => flow.handoffId === handoff.handoffId));
  }
  const quick = M.apply(state, { type: 'add-quick', title: 'Q', date, folderId: null, now: NOW });
  assert.equal(quick.changed, true, quick.error); state = quick.state;
  const byTitle = Object.fromEntries(state.tasks.map(task => [task.title, task]));
  byTitle.Q.time = '09:00';
  state.tasks = ['A1', 'B1', 'A2', 'Q', 'A3', 'B2'].map(title => byTitle[title]);
  setup(state, byTitle);
  assert.deepEqual(M.validate(state), []);
  return { cp: fromState(state), flows, byTitle, date };
}
function group(cp, view = 'month', date = DATE, contextKey = date) {
  const result = C.projectGroups(cp, view, date); assert.equal(result.ok, true, result.reason);
  const found = result.groups.find(entry => entry.contextKey === contextKey); assert.ok(found, contextKey); return found;
}
function labels(cp, ids) { return ids.map(id => cp.state.tasks.find(task => task.id === id).title); }
function personal(f, titles = ['A1', 'A3', 'A2'], flow = f.flows[0], extra = () => {}) {
  const observation = { flowRef: flow.ref, sourceRead: { ok: true, raw: null }, sourceEpoch: 0 };
  const opened = C.inspectSourceBoundPersonalPlanStructureContext(f.cp, observation); assert.equal(opened.ok, true, opened.reason);
  const draft = clone(opened.draft);
  if (titles) draft.orderedItemRefs = titles.map(title => f.byTitle[title].ref);
  extra(draft);
  const before = bytes(f.cp);
  const result = C.transitionCheckpoint(f.cp, { type: 'commit-source-bound-personal-plan-structure-context',
    context: opened.context, draft, sourceRead: observation.sourceRead, sourceEpoch: 0, now: NOW });
  assert.equal(result.ok, true, result.reason); assert.equal(result.changed, true, result.reason);
  assert.equal(bytes(f.cp), before); assert.deepEqual(result.checkpoint.state.tasks, f.cp.state.tasks);
  assert.deepEqual(result.checkpoint.state.flows, f.cp.state.flows);
  assert.deepEqual(result.checkpoint.state.timelineContextV1, f.cp.state.timelineContextV1);
  return { ...f, cp: result.checkpoint };
}
function timeline(cp, type, date, current, ordered) {
  return C.transitionCheckpoint(cp, { type, context: 'date', contextKey: date, localToday: date,
    expectedRevision: cp.state.revision, currentOrderedRefKeys: current,
    ...(ordered ? { orderedRefKeys: ordered } : {}), now: NOW }, { currentLocalToday: date });
}
function freeze(value) { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }

test('B2TT01 cross-Step personal order supplies one shared equal-time baseline in today week and month', () => {
  const initial = fixture(), f = personal(initial), before = bytes(f.cp);
  for (const view of ['today', 'week', 'month']) {
    const actual = group(f.cp, view);
    assert.deepEqual(labels(f.cp, actual.ids), ['A1', 'B1', 'A3', 'Q', 'A2', 'B2']);
    assert.deepEqual(actual.ids, actual.defaultIds); assert.equal(actual.manualOrder, false);
  }
  assert.equal(bytes(f.cp), before);
});

test('B2TT02 each Flow reuses only its own interleaved raw slots while Quick and other Flow slots remain fixed', () => {
  const initial = fixture(), one = personal(initial), f = personal(one, ['B2', 'B1'], one.flows[1]);
  assert.deepEqual(labels(f.cp, group(f.cp).ids), ['A1', 'B2', 'A3', 'Q', 'A2', 'B1']);
  assert.deepEqual(f.cp.state.tasks.map(task => task.title), ['A1', 'B1', 'A2', 'Q', 'A3', 'B2']);
  assert.equal(group(one.cp).ids.indexOf(one.byTitle.Q.id), 3);
  assert.equal(group(one.cp).ids.indexOf(one.byTitle.B1.id), 1);
  assert.equal(group(one.cp).ids.indexOf(one.byTitle.B2.id), 5);
});

test('B2TT03 time date undated overdue excluded and completed filters keep their existing priority', () => {
  const f = personal(fixture(DATE, (_state, items) => { items.A2.time = '08:00'; items.A3.time = '10:00'; }));
  assert.deepEqual(labels(f.cp, group(f.cp).ids), ['A2', 'A1', 'B1', 'Q', 'B2', 'A3']);
  const split = personal(fixture(DATE, (_state, items) => {
    items.A1.date = '2026-09-04'; items.A2.date = '2026-09-04'; items.A3.date = null;
    items.B1.date = null; items.B2.date = '2026-09-04'; items.B2.done = true;
  }), ['A2', 'A3', 'A1']);
  const today = C.projectGroups(split.cp, 'today', DATE); assert.equal(today.ok, true);
  const overdue = today.groups.find(entry => entry.context === 'overdue');
  assert.deepEqual(labels(split.cp, overdue.ids), ['A2', 'A1']);
  assert.deepEqual(labels(split.cp, group(split.cp, 'undated', DATE, 'undated').ids), ['B1', 'A3']);
  const excluded = clone(split.cp); excluded.state.tasks.find(task => task.id === split.byTitle.A2.id).timelinePolicy = 'excluded';
  const projected = C.projectGroups(excluded, 'today', DATE); assert.equal(projected.ok, true);
  assert.deepEqual(labels(excluded, projected.groups.find(entry => entry.context === 'overdue').ids), ['A1']);
});

test('B2TT04 first manual reorder accepts the new peers rejects old peers and reset uses the same new default', () => {
  const initial = fixture(), old = group(initial.cp).ids, f = personal(initial);
  const expected = ['A1', 'B1', 'A3', 'Q', 'A2', 'B2'].map(title => f.byTitle[title].id);
  const desired = expected.slice().reverse();
  const stale = timeline(f.cp, 'timeline-reorder', DATE, old, desired);
  assert.equal(stale.ok, false); assert.equal(stale.reason, 'stale-timeline-peers'); assert.equal(stale.checkpoint, f.cp);
  const changed = timeline(f.cp, 'timeline-reorder', DATE, expected, desired);
  assert.equal(changed.ok, true, changed.reason); assert.equal(changed.changed, true);
  assert.deepEqual(group(changed.checkpoint).ids, desired); assert.equal(group(changed.checkpoint).manualOrder, true);
  assert.deepEqual(group(changed.checkpoint).defaultIds, expected);
  const reset = timeline(changed.checkpoint, 'timeline-reset', DATE, desired, expected);
  assert.equal(reset.ok, true, reset.reason); assert.equal(reset.changed, true);
  assert.deepEqual(group(reset.checkpoint).ids, expected); assert.equal(group(reset.checkpoint).manualOrder, false);
  assert.deepEqual(reset.checkpoint.state.personalPlanContextV1, f.cp.state.personalPlanContextV1);
  const noop = timeline(reset.checkpoint, 'timeline-reset', DATE, expected, expected);
  assert.equal(noop.ok, true); assert.equal(noop.changed, false);
});

test('B2TT05 legacy unambiguous order still wins while conflict and incomplete orders remain blocked with new ties', () => {
  for (const variant of ['manual', 'conflict', 'incomplete']) {
    const initial = fixture(M.TODAY, (state, items) => {
      const manual = ['B2', 'A2', 'Q', 'A3', 'B1', 'A1'].map(title => items[title].id);
      state.orders.today = manual;
      if (variant === 'conflict') state.orders.week = manual.slice().reverse();
    });
    // The archived order must itself be valid. A subsequently added member
    // makes it incomplete for the current context without corrupting history.
    if (variant === 'incomplete') {
      const added = C.transitionCheckpoint(initial.cp, { type: 'add-quick', title: '새 멤버', date: M.TODAY, folderId: null, now: NOW });
      assert.equal(added.ok, true, added.reason); assert.equal(added.changed, true);
      initial.cp = added.checkpoint;
    }
    const f = personal(initial), actual = group(f.cp, 'today', M.TODAY);
    if (variant === 'manual') {
      assert.deepEqual(labels(f.cp, actual.ids), ['B2', 'A2', 'Q', 'A3', 'B1', 'A1']);
      assert.equal(actual.orderMode, 'legacy-unambiguous'); assert.equal(actual.manualOrder, true);
    } else {
      assert.equal(actual.blocked, true);
      assert.equal(actual.orderMode, variant === 'conflict' ? 'legacy-conflict' : 'legacy-unresolved');
      assert.deepEqual(labels(f.cp, actual.ids), ['A1', 'B1', 'A3', 'Q', 'A2', 'B2'].concat(variant === 'incomplete' ? ['새 멤버'] : []));
      const denied = timeline(f.cp, 'timeline-reorder', M.TODAY, actual.ids, actual.ids.slice().reverse());
      assert.equal(denied.ok, false); assert.equal(denied.reason, 'legacy-context-blocked');
    }
  }
});

test('B2TT06 absent core-only title-only and reset retain raw-array fallback even when Step flatten differs', () => {
  const initial = fixture(DATE, (state, items) => { state.tasks = ['A2', 'B1', 'A1', 'Q', 'A3', 'B2'].map(title => items[title]); });
  const expected = ['A2', 'B1', 'A1', 'Q', 'A3', 'B2'];
  assert.deepEqual(labels(initial.cp, group(initial.cp).ids), expected);
  const title = personal(initial, null, initial.flows[0], draft => { draft.title = { mode: 'override', value: '내 제목' }; });
  assert.equal(title.cp.state.personalPlanContextV1.version, 1);
  assert.deepEqual(labels(title.cp, group(title.cp).ids), expected);
  const section = personal(title, null, title.flows[0], draft => { draft.sectionTitles['step-1'] = { mode: 'override', value: '내 구간' }; });
  assert.deepEqual(labels(section.cp, group(section.cp).ids), expected);
  const order = personal(section, ['A3', 'A2', 'A1']);
  assert.deepEqual(labels(order.cp, group(order.cp).ids), ['A3', 'B1', 'A2', 'Q', 'A1', 'B2']);
  const reset = personal(order, ['A1', 'A2', 'A3']);
  assert.deepEqual(labels(reset.cp, group(reset.cp).ids), expected);
});

test('B2TT07 actual Undo reload and preexisting rank resolver each retain their own verified snapshot', () => {
  const initial = fixture(), oldResolver = R.createResolver(initial.cp), f = personal(initial);
  const resolver = R.createResolver(f.cp); assert.equal(resolver.ok, true);
  assert.equal(resolver.resolve({ id: f.byTitle.A3.id, date: DATE }).order, 2);
  assert.equal(oldResolver.resolve({ id: f.byTitle.A3.id, date: DATE }).order, 4);
  const reloaded = JSON.parse(bytes(f.cp)); assert.deepEqual(C.projectGroups(reloaded, 'month', DATE), C.projectGroups(f.cp, 'month', DATE));
  const undo = C.undoCheckpoint(f.cp); assert.equal(undo.ok, true, undo.reason);
  assert.deepEqual({ ...undo.checkpoint.state, updatedAt: initial.cp.state.updatedAt }, initial.cp.state);
  assert.deepEqual(labels(undo.checkpoint, group(undo.checkpoint).ids), ['A1', 'B1', 'A2', 'Q', 'A3', 'B2']);
  assert.equal(resolver.resolve({ id: f.byTitle.A3.id, date: DATE }).order, 2);
});

test('B2TT08 actual rank bridge and M Calendar use personal ties without altering source TXT Todo or Sheet projections', () => {
  const initial = fixture(), f = personal(initial), before = bytes(f.cp);
  const options = { baseDate: DATE, selectedDate: DATE };
  const plain = M.resultProjection(f.cp.state, f.flows[0].id, options);
  const result = M.resultProjection(f.cp.state, f.flows[0].id, { ...options, timelineRankResolver: R.createResolver(f.cp).resolve });
  assert.deepEqual(result.calendar.selectedItems.map(item => item.title), ['A1', 'A3', 'A2']);
  assert.equal(result.calendar.selectedItems.every(item => !item.manualContextOrder), true);
  for (const key of ['sourceItemRefs', 'itemRefs', 'rowIds', 'workingSource', 'txt', 'todo', 'sheet', 'downloads', 'occurrenceManifest']) {
    assert.deepEqual(result[key], plain[key], key + ' unchanged by timeline-only bridge');
  }
  assert.equal(bytes(f.cp), before);
});

test('B2TT09 malformed current Undo capture order descriptors and unavailable P block rather than using raw fallback', () => {
  const f = personal(fixture()); let called = 0;
  for (const change of [
    cp => { cp.state.personalPlanContextV1.entries[f.flows[0].ref].structure.orderedItemRefs.pop(); },
    cp => { cp.state.personalPlanContextV1.entries[f.flows[0].ref].structure.capture.originalItemRefs.reverse(); },
    cp => { cp.undo = clone(cp.state); cp.undo.personalPlanContextV1.version = 999; },
    cp => { Object.defineProperty(cp.state.personalPlanContextV1.entries[f.flows[0].ref].structure.orderedItemRefs, '0', { enumerable: true, get() { called += 1; return f.byTitle.A1.ref; } }); },
  ]) {
    const cp = clone(f.cp); change(cp);
    const result = C.projectGroups(cp, 'month', DATE); assert.equal(result.ok, false); assert.deepEqual(result.groups, []);
  }
  const missing = C.projectGroups(f.cp, 'month', DATE, { personalPlan: null });
  assert.equal(missing.ok, false); assert.deepEqual(missing.groups, []); assert.equal(called, 0);
});

test('B2TT10 frozen projections are read-only and multiple reads never mutate raw captures or accept caller order authority', () => {
  const f = personal(fixture()), expected = ['A1', 'B1', 'A3', 'Q', 'A2', 'B2'];
  const before = bytes(f.cp); freeze(f.cp);
  for (let index = 0; index < 4; index += 1) {
    const result = C.projectGroups(f.cp, 'month', DATE, { orderedItemRefs: [], ready: true });
    assert.equal(result.ok, true, result.reason); assert.deepEqual(labels(f.cp, result.groups[0].ids), expected);
  }
  assert.equal(bytes(f.cp), before);
  assert.equal(P.projectPersonalPlanState(f.cp.state).ok, true);
});
