'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const T = require('./timeline-context.js');
const M = require('./model.js');

const TODAY = '2026-09-05';
const task = (id, date = TODAY, overrides = {}) => Object.assign({ id, date, time: '', done: false }, overrides);
const order = (context, contextKey, ids) => ({ context, contextKey, orderedRefKeys: ids });
const select = (tasks, options = {}) => T.selectTimelineGroups(Object.assign({ tasks, localToday: TODAY, view: 'today' }, options));
const group = (result, context, key) => result.groups.find(entry => entry.context === context && entry.contextKey === key);
const dateGroup = (result, date = TODAY) => group(result, 'date', date);
function freeze(value) { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }
function legacyState() {
  return { version: 1, folders: [], flows: [], tasks: [
    { ...task('a', M.TODAY, { time: '09:00' }), title: '같은 제목', flowId: null, folderId: null, memo: '', completedAt: null },
    { ...task('b', M.TODAY, { time: '10:00' }), title: '같은 제목', flowId: null, folderId: null, memo: '', completedAt: null },
    { ...task('c', '2026-09-07', { time: '08:00' }), title: '다음 월요일', flowId: null, folderId: null, memo: '', completedAt: null },
    { ...task('u', null), title: '날짜 미정', flowId: null, folderId: null, memo: '', completedAt: null }
  ], orders: {}, revision: 0, updatedAt: '2026-09-02T00:00:00.000Z' };
}
function putLegacyOrder(state, view, prefix) {
  const ids = M.viewTaskIds({ ...state, orders: {} }, view);
  state.orders[view] = prefix.concat(ids.filter(id => !prefix.includes(id)));
}
function legacy(state, options = {}, model) {
  return T.projectLegacyTimeline(Object.assign({ state, localToday: M.TODAY, view: 'today' }, options), model);
}

test('versioned UMD/CommonJS API loads without resolving the legacy model or reading clock/storage/DOM', () => {
  let dependencies = 0;
  const code = fs.readFileSync(require.resolve('./timeline-context.js'), 'utf8');
  const context = vm.createContext({ module: { exports: {} }, require() { dependencies += 1; throw new Error('unexpected require'); } });
  vm.runInContext(code, context);
  assert.equal(dependencies, 0);
  assert.equal(context.module.exports.VERSION, 1);
  const browser = vm.createContext({});
  Object.defineProperties(browser, { localStorage: { get() { throw new Error('storage access'); } }, document: { get() { throw new Error('DOM access'); } } });
  vm.runInContext(code, browser);
  assert.deepEqual(Object.keys(browser.FlowPocTimelineContext), Object.keys(T));
  assert.equal(browser.FlowPocTimelineContext.selectTimelineGroups({ tasks: [], view: 'today', localToday: TODAY }).ok, true);
  assert.equal(browser.FlowPocTimelineContext.projectLegacyTimeline({ state: legacyState(), view: 'today', localToday: TODAY }).reason, 'legacy-decoder-unavailable');
});

test('M01 week uses Monday-Sunday on Tuesday, Sunday, Monday, year and leap-day boundaries', () => {
  for (const [today, start, end] of [
    ['2026-09-01', '2026-08-31', '2026-09-06'], ['2026-09-06', '2026-08-31', '2026-09-06'],
    ['2026-09-07', '2026-09-07', '2026-09-13'], ['2027-01-01', '2026-12-28', '2027-01-03'],
    ['2024-02-29', '2024-02-26', '2024-03-03']
  ]) {
    const result = select([], { localToday: today, view: 'week' });
    assert.equal(result.ok, true);
    assert.equal(result.range.start, start);
    assert.equal(result.range.end, end);
    assert.equal(result.range.dates.length, 7);
  }
});

test('M01 month supplies all real dates without inventing populated groups or next-month dates', () => {
  for (const [today, length, end] of [['2024-02-15', 29, '2024-02-29'], ['2025-02-15', 28, '2025-02-28'], ['2026-12-31', 31, '2026-12-31'], ['9999-12-31', 31, '9999-12-31']]) {
    const result = select([], { localToday: today, view: 'month' });
    assert.equal(result.ok, true);
    assert.equal(result.range.dates.length, length);
    assert.equal(result.range.end, end);
    assert.deepEqual(result.groups, []);
  }
});

test('M03 strict plain dates reject invalid input and represent years below 100 without 1900 offset', () => {
  for (const value of ['2026-02-29', '1900-02-29', '2026-13-01', '2026-04-31', '0000-01-01', '10000-01-01', '2026-9-05', '2026-09-05T00:00:00Z', '', null, undefined]) assert.equal(T.isPlainDate(value), false, String(value));
  assert.equal(T.isPlainDate('2000-02-29'), true);
  assert.equal(T.addPlainDays('0099-12-31', 1), '0100-01-01');
  assert.equal(T.addPlainDays('0001-01-01', -1), null);
  assert.equal(T.addPlainDays('9999-12-31', 1), null);
  assert.equal(T.addPlainDays('2026-09-05', 0.5), null);
  assert.equal(select([], { localToday: 'invalid' }).reason, 'invalid-local-today');
  assert.equal(select([], { localToday: '9999-12-31', view: 'week' }).reason, 'date-range-overflow');
});

test('M03 normalized task and view failures are explicit even for excluded tasks', () => {
  for (const [input, reason] of [
    [{ tasks: null }, 'invalid-tasks'], [{ view: 'folder' }, 'invalid-view'],
    [{ tasks: [task('a', '2026-02-30', { excluded: true })] }, 'invalid-task-date'],
    [{ tasks: [task('a'), task('a')] }, 'duplicate-task-id'], [{ tasks: [task('')] }, 'invalid-task-id'],
    [{ tasks: [task('a', null, { time: '24:00' })] }, 'invalid-task-time'],
    [{ tasks: [task('a', null, { done: 'false' })] }, 'invalid-task-completion'],
    [{ tasks: [task('a', null, { excluded: 1 })] }, 'invalid-task-exclusion'],
    [{ tasks: [task('a', null, { sourceOrder: -1 })] }, 'invalid-source-order']
  ]) assert.equal(select([], input).reason, reason);
  assert.equal(T.selectTimelineGroups(null).reason, 'invalid-input');
  assert.equal(select([], { contractVersion: 2 }).reason, 'unsupported-contract-version');
});

test('M03 UTC plain-date projection is identical across three process timezones and never consults Date.now', () => {
  const expression = `const T=require(${JSON.stringify(require.resolve('./timeline-context.js'))}); Date.now=()=>{throw Error('clock read')}; process.stdout.write(JSON.stringify(T.selectTimelineGroups({tasks:[],view:'week',localToday:'2026-09-06'})))`;
  const results = ['Asia/Seoul', 'America/Los_Angeles', 'Pacific/Kiritimati'].map(TZ => execFileSync(process.execPath, ['-e', expression], { env: { ...process.env, TZ }, encoding: 'utf8' }));
  assert.equal(new Set(results).size, 1);
});

test('M02 Today includes a separate past-open group; past-completed, future, undated and excluded are absent', () => {
  const tasks = [task('past-open', '2026-09-04'), task('past-done', '2026-09-04', { done: true }), task('today-open'), task('today-done', TODAY, { done: true }), task('future', '2026-09-06'), task('undated', null), task('hidden', TODAY, { excluded: true })];
  const result = select(tasks);
  assert.deepEqual(result.groups.map(entry => entry.context), ['overdue', 'date']);
  assert.deepEqual(group(result, 'overdue', TODAY).ids, ['past-open']);
  assert.deepEqual(dateGroup(result).ids, ['today-open', 'today-done']);
  assert.equal(group(result, 'overdue', TODAY).label, '지난 미완료');
});

test('M02 Week keeps completed tasks on their actual date and excludes the following Monday', () => {
  const result = select([task('last-sunday', '2026-08-30'), task('monday', '2026-08-31'), task('done', '2026-09-04', { done: true }), task('sunday', '2026-09-06'), task('next-monday', '2026-09-07')], { view: 'week' });
  assert.deepEqual(result.groups.map(entry => entry.contextKey), ['2026-08-31', '2026-09-04', '2026-09-06']);
  assert.deepEqual(dateGroup(result, '2026-09-04').ids, ['done']);
});

test('M02 Month sorts headings by date, not global item time', () => {
  const result = select([task('late-date', '2026-09-30', { time: '06:00' }), task('early-date', '2026-09-01', { time: '23:00' }), task('next-month', '2026-10-01')], { view: 'month' });
  assert.deepEqual(result.groups.map(entry => entry.contextKey), ['2026-09-01', '2026-09-30']);
});

test('M02 Undated is its own context, not overdue, and retains completion/exclusion semantics', () => {
  const result = select([task('open', null), task('done', null, { done: true }), task('hidden', null, { excluded: true }), task('dated')], { view: 'undated' });
  assert.deepEqual(result.range, { start: null, end: null, dates: [] });
  assert.deepEqual(group(result, 'undated', 'undated').ids, ['open', 'done']);
});

test('M04 default order is time first then explicit source order then stable input order', () => {
  const tasks = [task('untimed'), task('ten', TODAY, { time: '10:00' }), task('nine-later', TODAY, { time: '09:00', sourceOrder: 9 }), task('nine-first', TODAY, { time: '09:00', sourceOrder: 1 }), task('nine-equal', TODAY, { time: '09:00', sourceOrder: 1 })];
  assert.deepEqual(dateGroup(select(tasks)).ids, ['nine-first', 'nine-equal', 'nine-later', 'ten', 'untimed']);
});

test('M05 same titles across copies and Quick/Flow references never merge or use titles as a tie-break', () => {
  const ids = ['flow-item:copy-a:flow:item', 'flow-item:copy-b:flow:item', 'quick-item:item'];
  const tasks = ids.map(id => task(id, TODAY, { title: '같은 제목', sourceOrder: 0 }));
  assert.deepEqual(dateGroup(select(tasks)).ids, ids);
  assert.deepEqual(dateGroup(select(tasks, { timelineOrders: [order('date', TODAY, ids.slice().reverse())] })).ids, ids.slice().reverse());
});

test('M04 one exact-date manual order is shared by Today/Week/Month, leaving other dates and input unchanged', () => {
  const tasks = freeze([task('a'), task('b'), task('other', '2026-09-04')]);
  const orders = freeze([order('date', TODAY, ['b', 'a'])]);
  const before = JSON.stringify({ tasks, orders });
  for (const view of ['today', 'week', 'month']) {
    const result = select(tasks, { view, timelineOrders: orders });
    assert.deepEqual(dateGroup(result).ids, ['b', 'a']);
    assert.deepEqual(dateGroup(result).defaultIds, ['a', 'b']);
    assert.equal(dateGroup(result).manualOrder, true);
    assert.equal(dateGroup(result).orderMode, 'manual');
  }
  assert.deepEqual(dateGroup(select(tasks, { view: 'week', timelineOrders: orders }), '2026-09-04').ids, ['other']);
  assert.equal(JSON.stringify({ tasks, orders }), before);
});

test('M06 read projection excludes removed/moved refs and appends new refs without pruning stored order', () => {
  const orders = freeze([order('date', TODAY, ['removed', 'b', 'moved', 'a'])]);
  const tasks = freeze([task('a'), task('b'), task('new', TODAY, { time: '08:00' }), task('moved', '2026-09-06')]);
  const before = JSON.stringify(orders);
  const result = select(tasks, { timelineOrders: orders });
  assert.deepEqual(dateGroup(result).ids, ['b', 'a', 'new']);
  assert.deepEqual(dateGroup(result).defaultIds, ['new', 'a', 'b']);
  assert.equal(JSON.stringify(orders), before);
});

test('M06 duplicate refs/contexts, invalid order dates and unknown contexts fail explicitly without mutation', () => {
  for (const orders of [[order('date', TODAY, ['a', 'a'])], [order('date', TODAY, ['a']), order('date', TODAY, ['a'])], [order('date', '2026-02-30', [])], [order('folder', 'folder-1', [])], [order('undated', TODAY, [])]]) {
    const input = freeze({ tasks: [task('a')], view: 'today', localToday: TODAY, timelineOrders: orders });
    const before = JSON.stringify(input);
    assert.equal(T.selectTimelineGroups(input).ok, false);
    assert.equal(JSON.stringify(input), before);
  }
});

test('M07 aggregate overdue order and individual date order remain independent', () => {
  const tasks = [task('a', '2026-09-03'), task('b', '2026-09-04'), task('c', '2026-09-04')];
  const timelineOrders = [order('overdue', TODAY, ['c', 'a', 'b']), order('date', '2026-09-04', ['b', 'c'])];
  assert.deepEqual(group(select(tasks, { timelineOrders }), 'overdue', TODAY).ids, ['c', 'a', 'b']);
  assert.deepEqual(dateGroup(select(tasks, { view: 'week', timelineOrders }), '2026-09-04').ids, ['b', 'c']);
});

test('M07 injected next day and completed/reopened copies recompute visibility without rewriting task dates', () => {
  const tasks = freeze([task('a'), task('b', TODAY, { done: true })]);
  const before = JSON.stringify(tasks);
  const next = select(tasks, { localToday: '2026-09-06' });
  assert.deepEqual(group(next, 'overdue', '2026-09-06').ids, ['a']);
  const reopened = tasks.map(entry => ({ ...entry, done: false }));
  assert.deepEqual(group(select(reopened, { localToday: '2026-09-06' }), 'overdue', '2026-09-06').ids, ['a', 'b']);
  assert.equal(JSON.stringify(tasks), before);
});

test('returned arrays do not alias frozen inputs or each other', () => {
  const input = freeze({ tasks: [task('a'), task('b')], view: 'today', localToday: TODAY, timelineOrders: [order('date', TODAY, ['b', 'a'])] });
  const before = JSON.stringify(input);
  const result = T.selectTimelineGroups(input);
  dateGroup(result).ids.push('output-only');
  result.range.dates.push('output-only');
  assert.deepEqual(dateGroup(result).defaultIds, ['a', 'b']);
  assert.equal(JSON.stringify(input), before);
});

test('M08 valid v1 without legacy order uses defaults with fixed decoder metadata and no model changes', () => {
  const state = freeze(legacyState());
  const before = JSON.stringify(state);
  const beforeIds = M.viewTaskIds(state, 'week');
  const result = legacy(state);
  assert.equal(result.ok, true);
  assert.equal(result.legacy.anchor, M.TODAY);
  assert.equal(result.legacy.rollingWeekEnd, '2026-09-08');
  assert.equal(dateGroup(result, M.TODAY).orderMode, 'default-time');
  assert.equal(dateGroup(result, M.TODAY).blocked, false);
  assert.equal(JSON.stringify(state), before);
  assert.deepEqual(M.viewTaskIds(state, 'week'), beforeIds);
});

test('M08 one full legacy candidate is projected losslessly using its exact order', () => {
  const state = legacyState();
  putLegacyOrder(state, 'today', ['b', 'a']);
  assert.deepEqual(M.validate(state), []);
  freeze(state);
  const before = JSON.stringify(state);
  const result = legacy(state);
  assert.deepEqual(dateGroup(result, M.TODAY).ids, ['b', 'a']);
  assert.equal(dateGroup(result, M.TODAY).orderMode, 'legacy-unambiguous');
  assert.equal(dateGroup(result, M.TODAY).manualOrder, true);
  assert.equal(JSON.stringify(state), before);
});

test('M08 three full identical candidates are unambiguous without a today-priority rule', () => {
  const state = legacyState();
  for (const view of ['today', 'week', 'month']) putLegacyOrder(state, view, ['b', 'a']);
  assert.deepEqual(M.validate(state), []);
  const entry = dateGroup(legacy(freeze(state)), M.TODAY);
  assert.equal(entry.orderMode, 'legacy-unambiguous');
  assert.equal(entry.legacyCandidates.length, 3);
  assert.deepEqual(entry.ids, ['b', 'a']);
});

test('M08 valid conflicting legacy orders fall back only that date to time order and block its reordering', () => {
  const state = legacyState();
  putLegacyOrder(state, 'today', ['b', 'a']);
  putLegacyOrder(state, 'week', ['a', 'b']);
  assert.deepEqual(M.validate(state), []);
  const before = JSON.stringify(state);
  const result = legacy(freeze(state), { view: 'month' });
  const conflict = dateGroup(result, M.TODAY);
  assert.equal(result.ok, true);
  assert.equal(conflict.orderMode, 'legacy-conflict');
  assert.equal(conflict.blocked, true);
  assert.equal(conflict.manualOrder, false);
  assert.deepEqual(conflict.ids, ['a', 'b']);
  assert.equal(dateGroup(result, '2026-09-07').blocked, false);
  assert.equal(JSON.stringify(state), before);
});

test('M08 valid legacy plus an unmatched current member is unresolved, not guessed or silently merged', () => {
  const state = legacyState();
  putLegacyOrder(state, 'today', ['b', 'a']);
  const tasks = state.tasks.concat(task('new', M.TODAY, { time: '07:00' }));
  const before = JSON.stringify({ state, tasks });
  const entry = dateGroup(legacy(freeze(state), { tasks: freeze(tasks) }), M.TODAY);
  assert.equal(entry.orderMode, 'legacy-unresolved');
  assert.equal(entry.blocked, true);
  assert.deepEqual(entry.ids, ['new', 'a', 'b']);
  assert.equal(JSON.stringify({ state, tasks }), before);
});

test('M08 an item moved to another date does not bring its old view order into that date', () => {
  const state = legacyState();
  putLegacyOrder(state, 'month', ['b', 'a']);
  const tasks = state.tasks.map(entry => entry.id === 'a' ? { ...entry, date: '2026-09-07' } : entry);
  const result = legacy(freeze(state), { tasks: freeze(tasks), view: 'month' });
  assert.equal(dateGroup(result, '2026-09-07').orderMode, 'legacy-unresolved');
  assert.equal(dateGroup(result, '2026-09-07').blocked, true);
  assert.equal(dateGroup(result, M.TODAY).orderMode, 'legacy-unambiguous');
});

test('M08 undated legacy order applies only to undated, not the overdue aggregate', () => {
  const state = legacyState();
  state.tasks.push({ ...state.tasks[3], id: 'u2', title: '다른 미정' });
  putLegacyOrder(state, 'undated', ['u2', 'u']);
  putLegacyOrder(state, 'today', ['b', 'a']);
  assert.deepEqual(group(legacy(state, { view: 'undated' }), 'undated', 'undated').ids, ['u2', 'u']);
  const overdue = group(legacy(state, { localToday: '2026-09-03' }), 'overdue', '2026-09-03');
  assert.deepEqual(overdue.ids, ['a', 'b']);
  assert.equal(overdue.orderMode, 'default-time');
  assert.equal(overdue.blocked, false);
});

test('M08 old rolling-week orders containing next Monday remain valid under new Monday-Sunday display', () => {
  const state = legacyState();
  putLegacyOrder(state, 'week', ['c', 'b', 'a']);
  const before = JSON.stringify(state);
  assert.deepEqual(M.validate(state), []);
  const result = legacy(freeze(state), { view: 'week', localToday: '2026-09-05' });
  assert.equal(result.ok, true);
  assert.equal(result.range.end, '2026-09-06');
  assert.equal(result.groups.some(entry => entry.ids.includes('c')), false);
  assert.deepEqual(dateGroup(result, M.TODAY).ids, ['b', 'a']);
  assert.equal(JSON.stringify(state), before);
});

test('M08 changing the display clock does not reinterpret old arrays as current-month arrays', () => {
  const state = legacyState();
  putLegacyOrder(state, 'month', ['b', 'a']);
  const before = JSON.stringify(state);
  const result = legacy(freeze(state), { localToday: '2026-10-01', view: 'month' });
  assert.equal(result.ok, true);
  assert.deepEqual(result.groups, []);
  assert.equal(result.legacy.anchor, '2026-09-02');
  assert.equal(JSON.stringify(state), before);
});

test('M08 legacy trash membership and presentation exclusions are read-only filters', () => {
  const state = legacyState();
  state.trashEntries = [{ kind: 'quick', id: 'b', deletedAt: '2026-09-02T00:00:00Z' }];
  putLegacyOrder(state, 'today', ['a']);
  assert.deepEqual(M.validate(state), []);
  assert.deepEqual(dateGroup(legacy(freeze(state)), M.TODAY).ids, ['a']);
  const visible = legacyState();
  putLegacyOrder(visible, 'today', ['b', 'a']);
  const tasks = visible.tasks.map(entry => ({ ...entry, excluded: entry.id === 'b' }));
  const result = legacy(freeze(visible), { tasks: freeze(tasks) });
  assert.equal(dateGroup(result, M.TODAY).orderMode, 'legacy-unambiguous');
  assert.deepEqual(dateGroup(result, M.TODAY).ids, ['a']);
});

test('M08 duplicate/missing/foreign legacy array members fail the old decoder before any fallback', () => {
  for (const ids of [['a', 'a'], ['a'], ['a', 'foreign']]) {
    const state = legacyState();
    state.orders.today = ids;
    const before = JSON.stringify(state);
    const result = legacy(freeze(state));
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'invalid-legacy-state');
    assert.deepEqual(result.groups, []);
    assert.equal(JSON.stringify(state), before);
  }
});

test('M08 unknown versions/contexts/anchors and malformed state do not downgrade to defaults', () => {
  assert.equal(legacy({ ...legacyState(), version: 2 }).reason, 'invalid-legacy-state');
  const unknown = legacyState();
  unknown.orders['unknown-empty-context'] = [];
  assert.deepEqual(M.validate(unknown), []);
  assert.equal(legacy(unknown).reason, 'unknown-legacy-context');
  assert.equal(legacy(legacyState(), { legacyAnchor: TODAY }).reason, 'invalid-legacy-anchor');
  assert.equal(legacy({ ...legacyState(), tasks: [null] }).ok, false);
  assert.equal(legacy(legacyState(), {}, { ...M, validate() { throw new Error('cannot decode'); } }).reason, 'legacy-validation-failed');
});

test('M05 unsupported Flow origin and invalid copy binding fail through the real legacy validator', () => {
  const state = M.seedState();
  state.flows[0].origin = 'unsupported';
  assert.equal(legacy(freeze(state)).reason, 'invalid-legacy-state');
  const duplicate = legacyState();
  duplicate.tasks[1].id = 'a';
  assert.equal(legacy(freeze(duplicate)).reason, 'invalid-legacy-state');
  const foreignCopy = M.seedState();
  foreignCopy.tasks.find(entry => entry.flowId !== null).ref = 'flow-item:foreign-copy:foreign-flow:item';
  assert.equal(legacy(freeze(foreignCopy)).reason, 'invalid-legacy-state');
});

test('M08 known Flow/folder orders remain untouched and never become timeline candidates', () => {
  const state = M.seedState();
  const context = 'flow:' + state.flows[0].id;
  putLegacyOrder(state, context, M.viewTaskIds(state, context).slice().reverse());
  assert.deepEqual(M.validate(state), []);
  const before = JSON.stringify(state);
  const result = legacy(freeze(state), { view: 'month' });
  assert.equal(result.ok, true);
  assert.equal(result.groups.some(entry => entry.manualOrder), false);
  assert.equal(JSON.stringify(state), before);
});

test('M08 dependency injection is lazy and reconfirms decoder membership instead of trusting a new view set', () => {
  const state = legacyState();
  const result = legacy(state, {}, { ...M, viewTaskIds(current, view) { return view === 'week' ? ['a', 'b'] : M.viewTaskIds(current, view); } });
  assert.equal(result.reason, 'legacy-membership-mismatch');
  assert.equal(legacy(state, {}, M).ok, true);
});

test('canonical-vs-legacy precedence remains explicitly unimplemented until the checkpoint contract exists', () => {
  assert.equal(legacy(legacyState(), { contractVersion: 2 }).reason, 'unsupported-contract-version');
  assert.equal(legacy(legacyState(), { timelineOrders: [order('date', M.TODAY, ['b', 'a'])] }).reason, 'legacy-canonical-precedence-unresolved');
  assert.equal(legacy(legacyState(), { timelineOrders: [] }).ok, true);
});

test('pure projections perform zero storage operations and preserve complete input bytes across repeat reads', () => {
  const state = legacyState();
  putLegacyOrder(state, 'today', ['b', 'a']);
  putLegacyOrder(state, 'month', ['a', 'b']);
  const input = freeze({ state, view: 'today', localToday: M.TODAY });
  const before = JSON.stringify(input);
  const context = vm.createContext({ FlowMeIntegratedPoc: M });
  let access = 0;
  Object.defineProperty(context, 'localStorage', { get() { access += 1; throw new Error('forbidden storage'); } });
  vm.runInContext(fs.readFileSync(require.resolve('./timeline-context.js'), 'utf8'), context);
  for (let index = 0; index < 3; index += 1) assert.equal(context.FlowPocTimelineContext.projectLegacyTimeline(input).ok, true);
  assert.equal(access, 0);
  assert.equal(JSON.stringify(input), before);
});
