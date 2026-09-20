'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('./model.js');
const C = require('./workspace-checkpoint.js');
const R = require('./timeline-result-rank.js');
const DATE = '2026-09-05';
const NOW = DATE + 'T09:00:00.000Z';
function fixture(date = DATE) {
  const state = M.seedState();
  for (const [id, time] of [['quote', '08:00'], ['contract', '10:00']]) {
    const task = state.tasks.find(item => item.id === id);
    task.date = date; task.time = time;
  }
  const cp = C.fromLegacy(JSON.stringify({ version: 1, state, undo: null }));
  assert.equal(cp.ok, true, cp.reason);
  return cp.checkpoint;
}
function reorder(checkpoint, date = DATE) {
  const view = date === null ? 'undated' : 'month';
  const context = date === null ? 'undated' : 'date';
  const contextKey = date === null ? 'undated' : date;
  const group = C.projectGroups(checkpoint, view, DATE).groups.find(entry => entry.contextKey === contextKey);
  const ordered = ['contract', 'quote'].concat(group.ids.filter(id => !['contract', 'quote'].includes(id)));
  const result = C.transitionCheckpoint(checkpoint, { type: 'timeline-reorder', context, contextKey,
    localToday: DATE, expectedRevision: checkpoint.state.revision, currentOrderedRefKeys: group.ids,
    orderedRefKeys: ordered, now: NOW }, { currentLocalToday: DATE });
  assert.equal(result.ok, true, result.reason);
  assert.equal(result.changed, true);
  return result.checkpoint;
}
function projection(cp, options = {}) {
  const resolver = R.createResolver(cp);
  assert.equal(resolver.ok, true);
  return M.resultProjection(cp.state, 'moving', { baseDate: DATE, selectedDate: DATE,
    timelineRankResolver: resolver.resolve, ...options });
}
test('rank bridge shares the actual date order without changing Plan, source, TXT, sheet or identities', () => {
  const cp = fixture(); const before = JSON.stringify(cp); const plain = projection(cp);
  const ordered = reorder(cp); const actual = projection(ordered);
  const refs = Object.fromEntries(actual.items.map(item => [item.id, item.ref]));
  assert.deepEqual(actual.calendar[DATE], [refs.contract, refs.quote]);
  assert.deepEqual(actual.calendar.selectedItemRefs, [refs.contract, refs.quote]);
  assert.deepEqual(actual.calendar.cells.find(cell => cell.date === DATE).itemRefs, [refs.contract, refs.quote]);
  for (const key of ['itemRefs', 'sourceItemRefs', 'rowIds', 'occurrenceIds', 'txt', 'sheet', 'downloads', 'workingSource']) assert.deepEqual(actual[key], plain[key], key);
  assert.deepEqual(actual.items.map(item => item.planOrder), plain.items.map(item => item.planOrder));
  assert.equal(actual.items.find(item => item.id === 'contract').manualContextOrder, true);
  assert.equal(JSON.stringify(cp), before);
});
test('rank bridge uses canonical undated order', () => {
  const cp = reorder(fixture(null), null); const actual = projection(cp);
  assert.deepEqual(actual.calendar.undatedItems.slice(0, 2).map(item => item.id), ['contract', 'quote']);
  assert.equal(actual.items.find(item => item.id === 'contract').contextKey, 'undated:undated');
});
test('rank bridge reset and Undo read the same context without reviving archived view order', () => {
  const cp = reorder(fixture()); const group = C.projectGroups(cp, 'month', DATE).groups.find(entry => entry.contextKey === DATE);
  const reset = C.transitionCheckpoint(cp, { type: 'timeline-reset', context: 'date', contextKey: DATE, localToday: DATE,
    expectedRevision: cp.state.revision, currentOrderedRefKeys: group.ids, now: NOW }, { currentLocalToday: DATE });
  assert.equal(reset.ok, true, reset.reason);
  assert.deepEqual(projection(reset.checkpoint).calendar.selectedItems.map(item => item.id), ['quote', 'contract']);
  assert.deepEqual(projection(C.undoCheckpoint(reset.checkpoint).checkpoint).calendar.selectedItems.map(item => item.id), ['contract', 'quote']);
});
test('rank bridge snapshot remains stable after its caller changes the source checkpoint', () => {
  const cp = reorder(fixture()); const before = JSON.stringify(cp); const reader = R.createResolver(cp);
  assert.equal(JSON.stringify(cp), before);
  cp.state.tasks.find(task => task.id === 'contract').date = null;
  assert.deepEqual(reader.resolve({ id: 'contract', date: DATE }), { order: 0, key: 'date:' + DATE, manual: true });
  assert.equal(reader.resolve({ id: 'contract', date: null }), null);
});
test('rank bridge refuses invalid checkpoint and invalid or nonmember requests', () => {
  assert.equal(R.createResolver({}).ok, false);
  const reader = R.createResolver(fixture());
  for (const request of [{ id: 'quote', date: '2026-02-30' }, { id: 'missing', date: DATE }, { id: 'quote', date: null }, null]) assert.equal(reader.resolve(request), null);
});
test('legacy result without a rank hook keeps its existing today order', () => {
  const state = M.seedState();
  for (const id of ['quote', 'contract']) state.tasks.find(task => task.id === id).date = M.TODAY;
  state.orders.today = ['contract', 'quote'].concat(M.viewTaskIds(state, 'today').filter(id => !['contract', 'quote'].includes(id)));
  const result = M.resultProjection(state, 'moving', { baseDate: M.TODAY, selectedDate: M.TODAY });
  assert.deepEqual(result.calendar.selectedItems.map(item => item.id), ['contract', 'quote']);
});
test('explicit invalid or unavailable rank hook falls back to Plan, never old today priority', () => {
  const state = M.seedState();
  for (const id of ['quote', 'contract']) state.tasks.find(task => task.id === id).date = M.TODAY;
  state.orders.today = ['contract', 'quote'].concat(M.viewTaskIds(state, 'today').filter(id => !['contract', 'quote'].includes(id)));
  for (const resolver of [null, () => null, () => { throw new Error('unavailable'); }, () => ({ order: -1, key: 'date:' + M.TODAY, manual: true }),
    () => ({ order: 0, key: 'date:1999-01-01', manual: true })]) {
    const result = M.resultProjection(state, 'moving', { baseDate: M.TODAY, selectedDate: M.TODAY, timelineRankResolver: resolver });
    assert.deepEqual(result.calendar.selectedItems.map(item => item.id), ['quote', 'contract']);
    assert.equal(result.items.every(item => item.manualContextOrder === false), true);
  }
});
test('Authoring preview cannot consume a personal rank hook', () => {
  let calls = 0;
  const source = '# 원문\n- [x] 첫 항목\n  - 날짜: 2026-09-05\n- [ ] 둘째 항목\n  - 날짜: 2026-09-05';
  const plain = M.authoringResultProjection(source, { baseDate: DATE });
  const actual = M.authoringResultProjection(source, { baseDate: DATE, timelineRankResolver: () => { calls += 1; return { order: 0, key: 'date:' + DATE, manual: true }; } });
  assert.equal(calls, 0);
  assert.deepEqual(actual, plain);
});

test('mixed recurrence fallback cannot flip a Flow date when unrelated QuickItems enter that date', () => {
  const source = '# 반복 혼합\n- [ ] 반복 R\n  - 날짜: 2026-09-04\n  - 반복: 매일\n  - 반복 종료: 2회\n- [ ] 단일 B\n  - 날짜: 2026-09-05';
  const handoff = M.makeHandoff(source, { draftId: 'rank-repeat', handoffId: 'rank-repeat-handoff', sourceConfirmed: true });
  const state = M.apply(M.seedState(), { type: 'commit-authoring', handoff, now: NOW }).state;
  const flowId = state.lastReceipt.flowId;
  state.tasks.find(task => task.flowId === flowId && task.title === '단일 B').time = '03:00';
  const cp = C.fromLegacy(JSON.stringify({ version: 1, state, undo: null })).checkpoint;
  const read = checkpoint => M.resultProjection(checkpoint.state, flowId, { baseDate: DATE, selectedDate: DATE, timelineRankResolver: R.createResolver(checkpoint).resolve });
  const first = read(cp);
  let withQuick = cp;
  for (const [title, time] of [['별도 빠른 일 1', '01:00'], ['별도 빠른 일 2', '02:00']]) {
    withQuick = C.transitionCheckpoint(withQuick, { type: 'add-quick', title, date: DATE, folderId: null, now: NOW }).checkpoint;
    withQuick.state.tasks.find(task => task.title === title).time = time;
  }
  const next = read(withQuick);
  assert.deepEqual(first.calendar.selectedItems.map(item => item.title), ['반복 R', '단일 B']);
  assert.deepEqual(next.calendar.selectedItemRefs, first.calendar.selectedItemRefs);
  assert.deepEqual(next.items.filter(item => item.executionDate === DATE).map(item => item.contextOrder), [1, 2]);
  assert.deepEqual(first.timelineOrderFallbacks, [
    { contextKey: 'date:2026-09-04', reason: 'recurrence-order-out-of-scope' },
    { contextKey: 'date:' + DATE, reason: 'recurrence-order-out-of-scope' }
  ]);
  assert.deepEqual(next.occurrenceManifest, first.occurrenceManifest);
  assert.equal(next.workingSource.rawText, source);
});

test('a partial rank failure uses one Plan fallback scale for that date only', () => {
  const cp = reorder(fixture());
  const reader = R.createResolver(cp);
  const result = projection(cp, { timelineRankResolver: request => request.id === 'quote' ? null : reader.resolve(request) });
  assert.deepEqual(result.calendar.selectedItems.map(item => item.id), ['quote', 'contract']);
  assert.equal(result.calendar.selectedItems.every(item => !item.manualContextOrder), true);
  assert.deepEqual(result.timelineOrderFallbacks, [{ contextKey: 'date:' + DATE, reason: 'incomplete-source-task-membership' }]);
});

const clone = value => JSON.parse(JSON.stringify(value));
function deepFreeze(value) { if (value && typeof value === 'object') { Object.values(value).forEach(deepFreeze); Object.freeze(value); } return value; }
function fromState(state) { const result = C.fromLegacy(JSON.stringify({ version: 1, state, undo: null })); assert.equal(result.ok, true, result.reason); return result.checkpoint; }
function changed(cp, action) { const result = C.transitionCheckpoint(cp, { ...action, now: NOW }); assert.equal(result.changed, true, result.reason || result.message); return result.checkpoint; }
function manualOrder(cp, date, leadingIds) {
  const context = date === null ? 'undated' : 'date';
  const contextKey = date === null ? 'undated' : date;
  const localToday = date || DATE;
  const group = C.projectGroups(cp, date === null ? 'undated' : 'month', localToday).groups.find(entry => entry.contextKey === contextKey);
  assert.ok(group);
  const ids = leadingIds.concat(group.ids.filter(id => !leadingIds.includes(id)));
  const result = C.transitionCheckpoint(cp, { type: 'timeline-reorder', context, contextKey, localToday, expectedRevision: cp.state.revision,
    currentOrderedRefKeys: group.ids, orderedRefKeys: ids, now: NOW }, { currentLocalToday: localToday });
  assert.equal(result.ok, true, result.reason);
  return result.checkpoint;
}
function sourceFixture(source, suffix = 'extra-rank', initial = { ...M.seedState(), flows: [], tasks: [], orders: {} }) {
  const handoff = M.makeHandoff(source, { draftId: 'draft-' + suffix, handoffId: 'handoff-' + suffix, sourceConfirmed: true, folderId: null });
  const result = M.apply(initial, { type: 'commit-authoring', handoff, now: NOW });
  assert.equal(result.changed, true, result.error || result.message);
  return { cp: fromState(result.state), flowId: result.state.lastReceipt.flowId, source };
}
const RECURRENCE_SOURCE = '# 회차 순서 검증\n## 반복\n- [ ] 반복 R\n  - 날짜: 2026-09-04\n  - 반복: 매일\n  - 반복 종료: 3회\n## 일반\n- [ ] 기준일 A\n  - 날짜: 2026-09-04\n  - 시간: 08:00\n- [ ] 기준일 B\n  - 날짜: 2026-09-04\n  - 시간: 09:00\n- [ ] 다른날 A\n  - 날짜: 2026-09-07\n  - 시간: 08:00\n- [ ] 다른날 B\n  - 날짜: 2026-09-07\n  - 시간: 09:00\n- [ ] 미정 A\n- [ ] 미정 B';
function ownTask(cp, flowId, title) { const task = cp.state.tasks.find(entry => entry.flowId === flowId && entry.title === title); assert.ok(task, title); return task; }
function read(cp, flowId, date = DATE, extra = {}) {
  const resolver = R.createResolver(cp); assert.equal(resolver.ok, true, resolver.reason);
  return M.resultProjection(cp.state, flowId, { baseDate: date, selectedDate: date, timelineRankResolver: resolver.resolve, ...extra });
}
function plain(cp, flowId, date = DATE) { return M.resultProjection(cp.state, flowId, { baseDate: date, selectedDate: date }); }
function assertProtected(actual, expected) {
  for (const key of ['contractVersion', 'occurrenceContractVersion', 'flowRef', 'title', 'sourceItemRefs', 'itemRefs', 'rowIds', 'occurrenceIds',
    'occurrenceManifest', 'recurrenceManifests', 'workingSource', 'textLines', 'todo', 'sheet', 'txt', 'downloads', 'slots', 'projectionFailures']) assert.deepEqual(actual[key], expected[key], key);
  const stripRank = rows => rows.map(({ contextOrder, contextKey, manualContextOrder, ...row }) => row);
  assert.deepEqual(stripRank(actual.items), stripRank(expected.items), 'all item fields except calendar rank');
}
function moveOccurrence(cp, flowId, originalDate, date) {
  const row = plain(cp, flowId).items.find(item => item.occurrenceId && item.originalDate === originalDate);
  assert.ok(row);
  return changed(cp, { type: 'move-occurrence-date', sourceItemRef: row.sourceItemRef, occurrenceId: row.occurrenceId, originalDate, date });
}
function assertPlanDate(result, date, reason) {
  const rows = result.items.filter(row => row.timelinePolicy !== 'excluded' && row.executionDate === date);
  const refs = rows.slice().sort((a, b) => a.planOrder - b.planOrder).map(row => row.ref);
  assert.deepEqual(date === null ? result.calendar.undatedItemRefs : result.calendar[date], refs);
  assert.equal(rows.every(row => row.contextOrder === row.planOrder && !row.manualContextOrder), true);
  const contextKey = date === null ? 'undated:undated' : 'date:' + date;
  assert.deepEqual(result.timelineOrderFallbacks.filter(entry => entry.contextKey === contextKey), [{ contextKey, reason }]);
}

test('R11 mixed valid and null/throw/malformed ranks share one Plan scale and preserve every non-calendar projection', () => {
  const cp = reorder(fixture());
  const expected = plain(cp, 'moving');
  const valid = R.createResolver(cp).resolve;
  const failures = [() => null, () => { throw new Error('one row unavailable'); }, () => ({ order: 0, key: 'wrong-date', manual: true })];
  for (const failure of failures) {
    const actual = projection(cp, { timelineRankResolver: request => request.id === 'quote' ? failure() : valid(request) });
    assertPlanDate(actual, DATE, 'incomplete-source-task-membership');
    assertProtected(actual, expected);
  }
});

test('R12 occurrence moved to its source-task date never inherits that task manual rank', () => {
  const fixture = sourceFixture(RECURRENCE_SOURCE, 'moved-base');
  let cp = moveOccurrence(fixture.cp, fixture.flowId, '2026-09-05', '2026-09-04');
  cp = manualOrder(cp, '2026-09-04', ['기준일 B', '기준일 A', '반복 R'].map(title => ownTask(cp, fixture.flowId, title).id));
  const actual = read(cp, fixture.flowId, '2026-09-04');
  assertPlanDate(actual, '2026-09-04', 'recurrence-order-out-of-scope');
  const moved = actual.items.find(row => row.originalDate === '2026-09-05' && row.occurrenceId);
  assert.equal(moved.executionDate, '2026-09-04');
  assert.equal(R.createResolver(cp).resolve({ id: moved.id, date: moved.executionDate, occurrenceId: moved.occurrenceId }), null);
  assertProtected(actual, plain(cp, fixture.flowId, '2026-09-04'));
  assert.equal(actual.workingSource.rawText, fixture.source);
});

test('R13 occurrence moved to undated causes only that visible undated group to use Plan order', () => {
  const fixture = sourceFixture(RECURRENCE_SOURCE, 'moved-undated');
  let cp = manualOrder(fixture.cp, null, ['미정 B', '미정 A'].map(title => ownTask(fixture.cp, fixture.flowId, title).id));
  cp = manualOrder(cp, '2026-09-07', ['다른날 B', '다른날 A'].map(title => ownTask(cp, fixture.flowId, title).id));
  cp = moveOccurrence(cp, fixture.flowId, '2026-09-05', null);
  const actual = read(cp, fixture.flowId, '2026-09-07');
  assertPlanDate(actual, null, 'recurrence-order-out-of-scope');
  assert.deepEqual(actual.calendar.selectedItems.map(row => row.title), ['다른날 B', '다른날 A']);
  assert.equal(actual.calendar.selectedItems.every(row => row.manualContextOrder), true);
  assert.equal(actual.timelineOrderFallbacks.some(entry => entry.contextKey === 'date:2026-09-07'), false);
  assertProtected(actual, plain(cp, fixture.flowId, '2026-09-07'));
});

test('R14 two moved occurrences colliding on one date retain separate identities and one Plan fallback diagnostic', () => {
  const fixture = sourceFixture(RECURRENCE_SOURCE, 'collision');
  let cp = moveOccurrence(fixture.cp, fixture.flowId, '2026-09-05', '2026-09-04');
  cp = moveOccurrence(cp, fixture.flowId, '2026-09-06', '2026-09-04');
  cp = manualOrder(cp, '2026-09-04', ['기준일 B', '반복 R', '기준일 A'].map(title => ownTask(cp, fixture.flowId, title).id));
  const actual = read(cp, fixture.flowId, '2026-09-04');
  assertPlanDate(actual, '2026-09-04', 'recurrence-order-out-of-scope');
  assert.deepEqual(actual.calendar.selectedOccurrenceIds.length, 3);
  assert.equal(new Set(actual.calendar.selectedOccurrenceIds).size, 3);
  assert.deepEqual(actual.calendar.selectedItems.filter(row => row.occurrenceId).map(row => row.originalDate), ['2026-09-04', '2026-09-05', '2026-09-06']);
  assert.equal(actual.timelineOrderFallbacks.length, 1);
  assertProtected(actual, plain(cp, fixture.flowId, '2026-09-04'));
});

test('R15 hidden recurrence does not disable canonical sorting for visible rows on its date', () => {
  const fixture = sourceFixture(RECURRENCE_SOURCE, 'hidden-repeat');
  const state = clone(fixture.cp.state); delete state.timelineContextV1;
  state.tasks.find(task => task.title === '반복 R').timelinePolicy = 'excluded';
  let cp = fromState(state);
  cp = manualOrder(cp, '2026-09-04', ['기준일 B', '기준일 A'].map(title => ownTask(cp, fixture.flowId, title).id));
  const actual = read(cp, fixture.flowId, '2026-09-04');
  assert.deepEqual(actual.calendar.selectedItems.map(row => row.title), ['기준일 B', '기준일 A']);
  assert.equal(actual.calendar.selectedItems.every(row => row.manualContextOrder), true);
  assert.deepEqual(actual.timelineOrderFallbacks, []);
  const hidden = actual.items.filter(row => row.title === '반복 R');
  assert.equal(hidden.length, 3);
  assert.equal(hidden.every(row => !actual.calendar.monthItemRefs.includes(row.ref)), true);
  assertProtected(actual, plain(cp, fixture.flowId, '2026-09-04'));
});

test('R16 a hidden nonmember or throwing hook cannot force visible same-date rows into fallback', () => {
  const fixture = sourceFixture('# 숨김\n- [ ] 숨김 X\n  - 날짜: 2026-09-05\n- [ ] 보임 A\n  - 날짜: 2026-09-05\n- [ ] 보임 B\n  - 날짜: 2026-09-05', 'hidden-single');
  const state = clone(fixture.cp.state); delete state.timelineContextV1;
  state.tasks.find(task => task.title === '숨김 X').timelinePolicy = 'excluded';
  let cp = fromState(state);
  cp = manualOrder(cp, DATE, ['보임 B', '보임 A'].map(title => ownTask(cp, fixture.flowId, title).id));
  const hiddenId = ownTask(cp, fixture.flowId, '숨김 X').id;
  const valid = R.createResolver(cp).resolve;
  const actual = read(cp, fixture.flowId, DATE, { timelineRankResolver: request => { if (request.id === hiddenId) throw new Error('hidden membership'); return valid(request); } });
  assert.deepEqual(actual.calendar.selectedItems.map(row => row.title), ['보임 B', '보임 A']);
  assert.deepEqual(actual.timelineOrderFallbacks, []);
  assertProtected(actual, plain(cp, fixture.flowId));
});

test('R17 a missing rank on one date does not reset another date or undated canonical order', () => {
  const fixture = sourceFixture(RECURRENCE_SOURCE.replace('  - 반복: 매일\n  - 반복 종료: 3회\n', ''), 'date-isolation');
  let cp = fixture.cp;
  for (const [date, titles] of [['2026-09-04', ['기준일 B', '기준일 A', '반복 R']], ['2026-09-07', ['다른날 B', '다른날 A']], [null, ['미정 B', '미정 A']]]) cp = manualOrder(cp, date, titles.map(title => ownTask(cp, fixture.flowId, title).id));
  const badId = ownTask(cp, fixture.flowId, '기준일 A').id;
  const valid = R.createResolver(cp).resolve;
  const actual = read(cp, fixture.flowId, '2026-09-07', { timelineRankResolver: request => request.id === badId ? null : valid(request) });
  assertPlanDate(actual, '2026-09-04', 'incomplete-source-task-membership');
  assert.deepEqual(actual.calendar.selectedItems.map(row => row.title), ['다른날 B', '다른날 A']);
  assert.deepEqual(actual.calendar.undatedItems.map(row => row.title), ['미정 B', '미정 A']);
  assert.equal(actual.timelineOrderFallbacks.length, 1);
  assertProtected(actual, plain(cp, fixture.flowId, '2026-09-07'));
});

test('R18 conflicting legacy orders use bounded time order without today priority or manual status', () => {
  const state = M.seedState();
  const a = state.tasks.find(task => task.id === 'quote'); const b = state.tasks.find(task => task.id === 'contract');
  a.date = M.TODAY; a.time = '10:00'; b.date = M.TODAY; b.time = '08:00';
  for (const [context, prefix] of [['today', ['quote', 'contract']], ['week', ['contract', 'quote']]]) state.orders[context] = prefix.concat(M.viewTaskIds({ ...state, orders: {} }, context).filter(id => !prefix.includes(id)));
  const cp = fromState(state); const before = JSON.stringify(cp);
  const group = C.projectGroups(cp, 'today', M.TODAY).groups.find(entry => entry.context === 'date' && entry.contextKey === M.TODAY);
  assert.equal(group.blocked, true); assert.equal(group.orderMode, 'legacy-conflict');
  const actual = read(cp, 'moving', M.TODAY);
  assert.deepEqual(actual.calendar.selectedItems.map(row => row.id), ['contract', 'quote']);
  assert.equal(actual.calendar.selectedItems.every(row => !row.manualContextOrder), true);
  assert.deepEqual(actual.timelineOrderFallbacks, []);
  assertProtected(actual, plain(cp, 'moving', M.TODAY));
  assert.equal(JSON.stringify(cp), before);
});

test('R19 same-title copies keep tuple identities and their own subsequence of one global date order', () => {
  const source = '# 같은 제목 Flow\n- [ ] 같은 제목\n  - 날짜: 2026-09-05\n  - 시간: 08:00\n- [ ] 같은 제목\n  - 날짜: 2026-09-05\n  - 시간: 09:00';
  const first = sourceFixture(source, 'copy-first');
  const initial = clone(first.cp.state); delete initial.timelineContextV1;
  const second = sourceFixture(source, 'copy-second', initial);
  let cp = second.cp;
  const one = cp.state.tasks.filter(task => task.flowId === first.flowId); const two = cp.state.tasks.filter(task => task.flowId === second.flowId);
  cp = manualOrder(cp, DATE, [two[1].id, one[1].id, two[0].id, one[0].id]);
  const left = read(cp, first.flowId); const right = read(cp, second.flowId);
  assert.deepEqual(left.calendar.selectedItems.map(row => row.id), [one[1].id, one[0].id]);
  assert.deepEqual(right.calendar.selectedItems.map(row => row.id), [two[1].id, two[0].id]);
  assert.equal(left.sourceItemRefs.some(ref => right.sourceItemRefs.includes(ref)), false);
  assertProtected(left, plain(cp, first.flowId)); assertProtected(right, plain(cp, second.flowId));
  let added = changed(cp, { type: 'add-quick', title: '무관한 같은 제목', date: DATE, folderId: null });
  added.state.tasks.at(-1).time = '01:00';
  assert.deepEqual(read(added, first.flowId).calendar.selectedItemRefs, left.calendar.selectedItemRefs);
  assert.deepEqual(read(added, second.flowId).calendar.selectedItemRefs, right.calendar.selectedItemRefs);
});

test('R20 default time ordering remains deterministic across equal-title tasks and equal-time ties', () => {
  const cp = fixture();
  cp.state.tasks.find(task => task.id === 'quote').title = '같은 제목';
  cp.state.tasks.find(task => task.id === 'contract').title = '같은 제목';
  cp.state.tasks.find(task => task.id === 'quote').time = '11:00';
  cp.state.tasks.find(task => task.id === 'contract').time = '09:00';
  const different = projection(cp);
  assert.deepEqual(different.calendar.selectedItems.map(row => row.id), ['contract', 'quote']);
  assert.equal(different.calendar.selectedItems.every(row => !row.manualContextOrder), true);
  cp.state.tasks.find(task => task.id === 'quote').time = '09:00';
  const equal = projection(cp);
  assert.deepEqual(equal.calendar.selectedItems.map(row => row.id), ['quote', 'contract']);
  assert.deepEqual(equal.timelineOrderFallbacks, []);
  assertProtected(equal, plain(cp, 'moving'));
});

test('R21 recurring completion, reopened occurrence and moved date retain full TXT/Sheet/manifest values under fallback', () => {
  const fixture = sourceFixture(RECURRENCE_SOURCE, 'execution-values');
  let cp = fixture.cp;
  const row = plain(cp, fixture.flowId).items.find(item => item.occurrenceId && item.originalDate === '2026-09-05');
  cp = changed(cp, { type: 'complete-occurrence', sourceItemRef: row.sourceItemRef, occurrenceId: row.occurrenceId, originalDate: row.originalDate, done: true, completedAt: NOW });
  cp = moveOccurrence(cp, fixture.flowId, '2026-09-05', '2026-09-04');
  const complete = read(cp, fixture.flowId, '2026-09-04');
  assertProtected(complete, plain(cp, fixture.flowId, '2026-09-04'));
  assert.equal(complete.items.find(item => item.occurrenceId === row.occurrenceId).completed, true);
  const beforeReopen = JSON.stringify(cp);
  const reopened = changed(cp, { type: 'complete-occurrence', sourceItemRef: row.sourceItemRef, occurrenceId: row.occurrenceId, originalDate: row.originalDate, done: false });
  const actual = read(reopened, fixture.flowId, '2026-09-04');
  assertProtected(actual, plain(reopened, fixture.flowId, '2026-09-04'));
  assert.equal(actual.items.find(item => item.occurrenceId === row.occurrenceId).completed, false);
  assert.deepEqual(actual.occurrenceManifest, complete.occurrenceManifest);
  assert.equal(JSON.stringify(cp), beforeReopen);
  assertProtected(read(C.undoCheckpoint(reopened).checkpoint, fixture.flowId, '2026-09-04'), complete);
});

test('R22 fallback and bridge reads are input-immutable and stable across serialized checkpoint reload', () => {
  const fixture = sourceFixture(RECURRENCE_SOURCE, 'rank-reload');
  const cp = moveOccurrence(fixture.cp, fixture.flowId, '2026-09-05', null);
  const before = JSON.stringify(cp);
  deepFreeze(cp);
  const initial = read(cp, fixture.flowId);
  const reloaded = JSON.parse(before);
  const next = read(reloaded, fixture.flowId);
  assert.deepEqual(next, initial);
  assert.equal(JSON.stringify(cp), before);
  assert.equal(JSON.stringify(reloaded), before);
});

test('R23 no-hook legacy and Authoring recurring preview do not acquire fallback diagnostics or call a hook', () => {
  const fixture = sourceFixture(RECURRENCE_SOURCE, 'preview-legacy');
  const legacy = plain(fixture.cp, fixture.flowId);
  assert.equal(Object.hasOwn(legacy, 'timelineOrderFallbacks'), false);
  let calls = 0;
  const expected = M.authoringResultProjection(RECURRENCE_SOURCE, { baseDate: DATE });
  const actual = M.authoringResultProjection(RECURRENCE_SOURCE, { baseDate: DATE, timelineRankResolver() { calls += 1; throw new Error('preview must not call'); } });
  assert.equal(calls, 0);
  assert.equal(Object.hasOwn(actual, 'timelineOrderFallbacks'), false);
  assert.deepEqual(actual, expected);
});
