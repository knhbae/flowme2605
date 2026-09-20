'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const M = require('./model.js');
const T = require('./timeline-context.js');
const C = require('./workspace-checkpoint.js');

const TODAY = M.TODAY;
const NOW = '2026-09-05T03:04:05.000Z';
const clone = value => JSON.parse(JSON.stringify(value));
function freeze(value) { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }
function legacyState() {
  const quick = (id, date, time) => ({ id, title: '같은 제목', flowId: null, folderId: null, date, time, done: false, completedAt: null, memo: '', sourceDate: date });
  return { version: 1, revision: 0, updatedAt: null, folders: [{ id: 'work', title: '업무', parentId: null }], flows: [], tasks: [quick('a', TODAY, '09:00'), quick('b', TODAY, '10:00'), quick('other', '2026-09-03', '08:00'), quick('u', null, '')], orders: {}, occurrenceOverrides: {}, trashEntries: [] };
}
function putOrder(state, context, prefix) { const ids = M.viewTaskIds({ ...state, orders: {} }, context); state.orders[context] = prefix.concat(ids.filter(id => !prefix.includes(id))); }
function rawOf(state = legacyState(), undo = null, extras = {}) { return ' \n' + JSON.stringify({ version: 1, state, undo, ...extras }, null, 2) + '\n '; }
function from(state = legacyState(), undo = null) { const result = C.fromLegacy(rawOf(state, undo)); assert.equal(result.ok, true, result.reason); return result.checkpoint; }
function metadata(checkpoint) { return checkpoint.state.timelineContextV1; }
function getGroup(checkpoint, context = 'date', contextKey = TODAY, view = context === 'undated' ? 'undated' : context === 'overdue' ? 'today' : 'month', localToday = contextKey === 'undated' ? TODAY : contextKey) {
  const result = C.projectGroups(checkpoint, view, localToday);
  assert.equal(result.ok, true, result.reason);
  return result.groups.find(entry => entry.context === context && entry.contextKey === contextKey);
}
function request(checkpoint, type = 'timeline-reorder', overrides = {}) {
  const context = overrides.context || 'date';
  const contextKey = overrides.contextKey || (context === 'undated' ? 'undated' : TODAY);
  const localToday = overrides.localToday || TODAY;
  const ids = getGroup(checkpoint, context, contextKey, undefined, context === 'overdue' ? localToday : contextKey === 'undated' ? TODAY : contextKey).ids;
  return { type, context, contextKey, localToday, expectedRevision: checkpoint.state.revision, currentOrderedRefKeys: ids, ...(type === 'timeline-reorder' ? { orderedRefKeys: ids.slice().reverse() } : {}), now: NOW, ...overrides };
}
function changed(checkpoint, action, options = { currentLocalToday: action.localToday }) { const result = C.transitionCheckpoint(checkpoint, action, options); assert.equal(result.ok, true, result.reason); assert.equal(result.changed, true, result.message); return result.checkpoint; }
function assertUnchanged(checkpoint, action, reason, options = { currentLocalToday: action.localToday }) {
  const before = JSON.stringify(checkpoint);
  const result = C.transitionCheckpoint(freeze(checkpoint), action, options);
  assert.equal(result.changed, false);
  assert.equal(result.checkpoint, checkpoint);
  if (reason) assert.equal(result.reason, reason);
  assert.equal(JSON.stringify(checkpoint), before);
  return result;
}

test('C01 versioned API is lazy UMD/CommonJS with fixed PoC constants and no storage/DOM dependency', () => {
  assert.equal(C.VERSION, 2);
  assert.equal(C.CONTRACT, 'flowme-standalone-workspace-checkpoint-v2');
  assert.equal(C.STORAGE_KEY, M.STORAGE_KEY + ':workspace-v2');
  assert.equal(C.LEGACY_STORAGE_KEY, M.STORAGE_KEY);
  let requires = 0;
  const context = vm.createContext({ module: { exports: {} }, require() { requires += 1; throw new Error('eager dependency'); } });
  vm.runInContext(fs.readFileSync(require.resolve('./workspace-checkpoint.js'), 'utf8'), context);
  assert.equal(requires, 0);
  assert.deepEqual(Object.keys(context.module.exports), Object.keys(C));
  const browser = vm.createContext({ FlowMeIntegratedPoc: M, FlowPocTimelineContext: T });
  let accesses = 0;
  for (const key of ['localStorage', 'document', 'window']) Object.defineProperty(browser, key, { get() { accesses += 1; throw new Error(key); } });
  vm.runInContext(fs.readFileSync(require.resolve('./workspace-checkpoint.js'), 'utf8'), browser);
  assert.equal(browser.FlowPocWorkspaceCheckpoint.fromLegacy(null).ok, true);
  assert.equal(accesses, 0);
});

test('C01 null baseline projects frozen seed without modifying the model or making a checkpoint write', () => {
  const seed = M.seedState();
  const result = C.fromLegacy(null);
  assert.equal(result.ok, true);
  assert.equal(result.checkpoint.legacyBaseRaw, null);
  assert.equal(result.checkpoint.undo, null);
  assert.deepEqual(metadata(result.checkpoint).legacySnapshot, seed);
  assert.deepEqual(metadata(result.checkpoint).records, []);
  assert.deepEqual(M.seedState(), seed);
  assert.equal(C.validateCheckpoint(result.checkpoint).ok, true);
});

test('C02 old current/undo retain independent snapshot and exact raw including whitespace and unknown envelope data', () => {
  const state = legacyState();
  putOrder(state, 'today', ['b', 'a']);
  const undo = legacyState();
  undo.tasks[0].date = '2026-08-31';
  putOrder(undo, 'today', ['b']);
  const raw = rawOf(state, undo, { historicalEnvelopeNote: { nested: ['보존', 2] } });
  const before = JSON.stringify({ state, undo });
  const result = C.fromLegacy(raw);
  assert.equal(result.ok, true);
  assert.equal(result.checkpoint.legacyBaseRaw, raw);
  assert.deepEqual(metadata(result.checkpoint).legacySnapshot, state);
  assert.deepEqual(result.checkpoint.undo.timelineContextV1.legacySnapshot, undo);
  assert.equal(Object.hasOwn(result.checkpoint.state.orders, 'today'), false);
  assert.equal(JSON.stringify({ state, undo }), before);
});

test('C03-C04 source, completion, unknown nested values and safe own __proto__ survive projection and a regular action', () => {
  const state = legacyState();
  state.tasks[0].sourceText = '- [x] 원문 체크\r\n  근거 그대로  ';
  state.tasks[0].sourceChecked = true;
  state.tasks[0].sourceSubchecks = [{ text: '하위 확인', checked: true }];
  state.tasks[0].custom = { nested: ['값', null, true, 3] };
  Object.defineProperty(state, '__proto__', { value: { checkpointPolluted: 'never promote' }, enumerable: true });
  state.historical = { legacyUnknown: { deep: '유지' } };
  const checkpoint = from(state);
  const next = changed(freeze(checkpoint), { type: 'complete', id: 'b', done: true, completedAt: NOW, now: NOW });
  assert.deepEqual(next.state.tasks[0], state.tasks[0]);
  assert.deepEqual(next.state.historical, state.historical);
  assert.deepEqual(next.state.__proto__, state.__proto__);
  assert.equal({}.checkpointPolluted, undefined);
  assert.deepEqual(metadata(next).legacySnapshot, state);
});

test('C04 reserved legacy field collision is rejected in current and undo regardless of its value', () => {
  for (const field of [null, { version: 1, records: [], resolvedContexts: [], legacySnapshot: legacyState() }]) {
    const state = { ...legacyState(), timelineContextV1: field };
    assert.equal(C.fromLegacy(rawOf(state)).reason, 'legacy-reserved-field-collision');
    assert.equal(C.fromLegacy(rawOf(legacyState(), state)).reason, 'legacy-reserved-field-collision');
  }
});

test('C05 malformed/unknown legacy data is rejected instead of falling back to seed', () => {
  for (const raw of ['', '{', JSON.stringify({ version: 2, state: legacyState(), undo: null }), JSON.stringify({ version: 1, state: legacyState() }), rawOf({ ...legacyState(), tasks: [null] })]) {
    const result = C.fromLegacy(raw);
    assert.equal(result.ok, false);
    assert.equal(result.checkpoint, undefined);
  }
  assert.equal(C.fromLegacy({}).ok, false);
});

test('C05 new envelope exact fields, types and contract/version are strict', () => {
  for (const mutate of [entry => { entry.extra = true; }, entry => { entry.version = 3; }, entry => { entry.contract = 'foreign'; }, entry => { entry.legacyBaseRaw = {}; }, entry => { delete entry.undo; }, entry => { delete entry.state.timelineContextV1; }]) {
    const checkpoint = from();
    mutate(checkpoint);
    const before = JSON.stringify(checkpoint);
    assert.equal(C.validateCheckpoint(freeze(checkpoint)).ok, false);
    assert.equal(JSON.stringify(checkpoint), before);
    assert.equal(C.projectGroups(checkpoint, 'today', TODAY).ok, false);
  }
});

test('C05 new metadata and resolved contexts reject unknown/missing/version/duplicate values', () => {
  for (const mutate of [entry => { entry.extra = 1; }, entry => { entry.version = 2; }, entry => { delete entry.records; }, entry => { entry.resolvedContexts = ['date:' + TODAY]; }, entry => { entry.resolvedContexts = [{ context: 'date', contextKey: TODAY, extra: true }]; }, entry => { entry.resolvedContexts = [{ context: 'date', contextKey: TODAY }, { context: 'date', contextKey: TODAY }]; }, entry => { entry.resolvedContexts = [{ context: 'overdue', contextKey: 'bad-date' }]; }]) {
    const checkpoint = from();
    mutate(metadata(checkpoint));
    assert.equal(C.validateCheckpoint(freeze(checkpoint)).ok, false);
  }
});

test('C05 canonical records require exact keys, valid revision, unique refs/context and a resolved owner', () => {
  const reordered = changed(from(), request(from()));
  for (const mutate of [entry => { entry.records[0].extra = 1; }, entry => { entry.records[0].revision = -1; }, entry => { entry.records[0].revision = Number.MAX_SAFE_INTEGER; }, entry => { entry.records[0].orderedRefKeys = ['a', 'a']; }, entry => { entry.records[0].orderedRefKeys = ['invalid:standalone:id']; }, entry => { entry.records.push(clone(entry.records[0])); }, entry => { entry.resolvedContexts = []; }, entry => { entry.records[0].context = 'folder'; }]) {
    const checkpoint = clone(reordered);
    mutate(metadata(checkpoint));
    assert.equal(C.validateCheckpoint(freeze(checkpoint)).ok, false);
  }
});

test('C06 valid but foreign legacy snapshot, changed raw binding and nested metadata fail provenance checks', () => {
  for (const mutate of [
    checkpoint => { metadata(checkpoint).legacySnapshot.tasks[0].memo = '유효하지만 다른 과거'; },
    checkpoint => { const other = legacyState(); other.tasks[0].memo = '다른 원본'; checkpoint.legacyBaseRaw = rawOf(other); },
    checkpoint => { metadata(checkpoint).legacySnapshot.timelineContextV1 = clone(metadata(checkpoint)); }
  ]) {
    const checkpoint = from();
    mutate(checkpoint);
    assert.equal(C.validateCheckpoint(freeze(checkpoint)).ok, false);
  }
  const seed = C.fromLegacy(null).checkpoint;
  metadata(seed).legacySnapshot.tasks[0].memo = '조작한 seed';
  assert.equal(C.validateCheckpoint(seed).ok, false);
});

test('C06 provenance uses JSON values/array order, not object key insertion order', () => {
  const checkpoint = from();
  const snapshot = metadata(checkpoint).legacySnapshot;
  metadata(checkpoint).legacySnapshot = Object.fromEntries(Object.entries(snapshot).reverse());
  assert.equal(C.validateCheckpoint(checkpoint).ok, true);
  metadata(checkpoint).legacySnapshot.tasks.reverse();
  assert.equal(C.validateCheckpoint(checkpoint).ok, false);
});

test('C07 only four legacy timeline orders leave active orders; folder and Flow orders remain', () => {
  const state = M.seedState();
  for (const view of ['today', 'week', 'month', 'undated']) putOrder(state, view, M.viewTaskIds(state, view).slice().reverse());
  const flowContext = 'flow:' + state.flows[0].id;
  putOrder(state, flowContext, M.viewTaskIds(state, flowContext).slice().reverse());
  putOrder(state, 'folder:unfiled', M.viewTaskIds(state, 'folder:unfiled').slice().reverse());
  const checkpoint = from(state);
  assert.deepEqual(Object.keys(checkpoint.state.orders).sort(), [flowContext, 'folder:unfiled'].sort());
  assert.deepEqual(checkpoint.state.orders[flowContext], state.orders[flowContext]);
  assert.deepEqual(checkpoint.state.orders['folder:unfiled'], state.orders['folder:unfiled']);
  assert.deepEqual(metadata(checkpoint).legacySnapshot.orders, state.orders);
  assert.deepEqual(M.validate(checkpoint.state), []);
});

test('C07 complete, schedule, add, trash and restore keep the original archived orders and unknown values exact', () => {
  const state = legacyState();
  putOrder(state, 'today', ['b', 'a']);
  putOrder(state, 'week', ['b', 'a']);
  state.historical = { exact: '원문\r\n  값  ' };
  let checkpoint = from(state);
  const archived = JSON.stringify(metadata(checkpoint).legacySnapshot);
  for (const action of [
    { type: 'complete', id: 'a', done: true, completedAt: NOW }, { type: 'schedule', id: 'a', date: '2026-10-01' },
    { type: 'add-quick', title: '새 항목', date: TODAY, folderId: null }, { type: 'move-to-trash', kind: 'quick', id: 'b' }, { type: 'restore-from-trash', kind: 'quick', id: 'b' }
  ]) {
    checkpoint = changed(freeze(checkpoint), { ...action, now: NOW });
    assert.equal(JSON.stringify(metadata(checkpoint).legacySnapshot), archived);
    assert.deepEqual(checkpoint.state.historical, state.historical);
    assert.equal(C.validateCheckpoint(checkpoint).ok, true);
    assert.equal(Object.hasOwn(checkpoint.state.orders, 'today'), false);
  }
});

test('C07 ordinary personal Plan editing preserves raw source and archived membership/order', () => {
  const state = M.seedState();
  putOrder(state, 'month', M.viewTaskIds(state, 'month').slice().reverse());
  const checkpoint = from(state);
  const flow = checkpoint.state.flows[0];
  const items = flow.steps.flatMap(step => step.itemIds).map(id => { const task = checkpoint.state.tasks.find(entry => entry.id === id); return { id, title: task.title + ' 개인 수정', memo: '개인 메모', planDate: '2026-10-01' }; });
  const next = changed(checkpoint, { type: 'commit-personal-plan', flowId: flow.id, title: flow.title + ' 개인', items, now: NOW });
  assert.deepEqual(metadata(next).legacySnapshot, state);
  assert.equal(next.state.flows[0].rawText, state.flows[0].rawText);
});

test('C03/C12 same-source handoffs keep separate copies, source checks and open execution; duplicate handoff is a no-op', () => {
  const raw = '# 같은 제목\n## 준비\n- [x] 원문에서 확인한 항목\n  - 날짜: 2026-09-02';
  const first = M.makeHandoff(raw, { draftId: 'draft-a', handoffId: 'handoff-a', sourceConfirmed: true });
  const second = M.makeHandoff(raw, { draftId: 'draft-b', handoffId: 'handoff-b', sourceConfirmed: true });
  const base = from();
  const one = changed(base, { type: 'commit-authoring', handoff: first, now: NOW });
  const two = changed(one, { type: 'commit-authoring', handoff: second, now: NOW });
  assert.equal(two.state.flows.length, 2);
  assert.notEqual(two.state.flows[0].savedCopyId, two.state.flows[1].savedCopyId);
  const authored = two.state.tasks.filter(entry => entry.flowId !== null);
  assert.equal(new Set(authored.map(entry => entry.id)).size, 2);
  assert.equal(new Set(authored.map(entry => entry.ref)).size, 2);
  assert.equal(authored.every(entry => entry.done === false && entry.completedAt === null), true);
  assert.equal(two.state.flows.every(flow => flow.rawText === raw), true);
  assert.deepEqual(metadata(two), metadata(base));
  assertUnchanged(two, { type: 'commit-authoring', handoff: second, now: NOW });
  const completed = changed(two, { type: 'complete', id: authored[0].id, done: true, completedAt: NOW, now: NOW });
  assert.equal(completed.state.tasks.find(entry => entry.id === authored[1].id).done, false);
  assert.equal(completed.state.flows.every(flow => flow.rawText === raw), true);
});

test('C03 recurrence completion/date overrides survive a regular change and Undo without rewriting their source', () => {
  const raw = '# 반복 검사\n## 준비\n- [ ] 반복 항목\n  - 날짜: 2026-09-02\n  - 반복: 매일\n  - 반복 종료: 3회';
  const handoff = M.makeHandoff(raw, { draftId: 'repeat-draft', handoffId: 'repeat-handoff', sourceConfirmed: true });
  let state = M.apply(legacyState(), { type: 'commit-authoring', handoff, now: NOW }).state;
  const flowId = state.lastReceipt.flowId;
  const row = M.resultProjection(state, flowId).items[1];
  const identity = { sourceItemRef: row.sourceItemRef, occurrenceId: row.occurrenceId, originalDate: row.originalDate };
  state = M.apply(state, { type: 'move-occurrence-date', ...identity, date: '2026-09-10', now: NOW }).state;
  state = M.apply(state, { type: 'complete-occurrence', ...identity, done: true, completedAt: NOW, now: NOW }).state;
  assert.deepEqual(M.validate(state), []);
  const checkpoint = from(state);
  const beforeOverrides = clone(state.occurrenceOverrides);
  const changedQuick = changed(checkpoint, { type: 'complete', id: 'a', done: true, completedAt: NOW, now: NOW });
  assert.deepEqual(changedQuick.state.occurrenceOverrides, beforeOverrides);
  assert.deepEqual(metadata(changedQuick).legacySnapshot, state);
  const undone = C.undoCheckpoint(changedQuick).checkpoint;
  assert.deepEqual(undone.state.occurrenceOverrides, beforeOverrides);
  assert.equal(undone.state.flows.find(flow => flow.id === flowId).rawText, raw);
});

test('C03 existing conversion receipt and source Quick fields survive checkpoint projection and ordinary updates', () => {
  const seed = legacyState();
  const result = M.apply(seed, { type: 'convert-quick-item-to-flow', quickItemId: 'a', flowTitle: '개인 준비', expectedRevision: 0, now: NOW });
  assert.equal(result.changed, true);
  const state = result.state;
  const checkpoint = from(state);
  const next = changed(checkpoint, { type: 'complete', id: 'b', done: true, completedAt: NOW, now: NOW });
  assert.deepEqual(next.state.quickConversionReceipts, state.quickConversionReceipts);
  assert.deepEqual(next.state.lastReceipt, state.lastReceipt);
  assert.deepEqual(next.state.tasks.find(entry => entry.id === 'a'), state.tasks.find(entry => entry.id === 'a'));
  assert.deepEqual(metadata(next).legacySnapshot, state);
});

test('C08 legacy unique order is used only while that exact context is unresolved', () => {
  const state = legacyState();
  putOrder(state, 'today', ['b', 'a']);
  const checkpoint = from(state);
  assert.equal(getGroup(checkpoint).orderMode, 'legacy-unambiguous');
  assert.deepEqual(getGroup(checkpoint).ids, ['b', 'a']);
  assert.deepEqual(metadata(checkpoint).records, []);
  assert.deepEqual(metadata(checkpoint).resolvedContexts, []);
});

test('C08 valid conflicting legacy orders block reorder and reset without mutating any context', () => {
  const state = legacyState();
  putOrder(state, 'today', ['b', 'a']);
  putOrder(state, 'week', ['a', 'b']);
  const checkpoint = from(state);
  assert.equal(getGroup(checkpoint).orderMode, 'legacy-conflict');
  assertUnchanged(checkpoint, request(checkpoint), 'legacy-context-blocked');
  assertUnchanged(checkpoint, request(checkpoint, 'timeline-reset'), 'legacy-context-blocked');
});

test('C08 added current member makes a legacy candidate partial and blocked rather than rewriting its archive', () => {
  const state = legacyState();
  putOrder(state, 'today', ['b', 'a']);
  const checkpoint = changed(from(state), { type: 'add-quick', title: '새 멤버', date: TODAY, folderId: null, now: NOW });
  assert.equal(getGroup(checkpoint).orderMode, 'legacy-unresolved');
  assertUnchanged(checkpoint, request(checkpoint), 'legacy-context-blocked');
  assert.deepEqual(metadata(checkpoint).legacySnapshot, state);
});

test('C09 one canonical date order projects equally into Today/Week/Month and leaves other context records alone', () => {
  const checkpoint = from();
  const next = changed(checkpoint, request(checkpoint));
  for (const view of ['today', 'week', 'month']) assert.deepEqual(getGroup(next, 'date', TODAY, view, TODAY).ids, ['b', 'a']);
  assert.deepEqual(metadata(next).resolvedContexts, [{ context: 'date', contextKey: TODAY }]);
  assert.deepEqual(metadata(next).records, [{ context: 'date', contextKey: TODAY, orderedRefKeys: ['b', 'a'], revision: 1 }]);
  assert.equal(next.state.updatedAt, NOW);
  assert.deepEqual(next.undo, checkpoint.state);
});

test('C09 same reorder is a true no-op and does not create a resolved flag or replace Undo', () => {
  const state = legacyState();
  putOrder(state, 'today', ['b', 'a']);
  const checkpoint = from(state, legacyState());
  const result = assertUnchanged(checkpoint, request(checkpoint, 'timeline-reorder', { orderedRefKeys: ['b', 'a'] }));
  assert.equal(result.ok, true);
  assert.deepEqual(metadata(checkpoint).resolvedContexts, []);
});

test('C09 reset from legacy manual mode resolves without a canonical record; default reset is a no-op', () => {
  const state = legacyState();
  putOrder(state, 'today', ['b', 'a']);
  const checkpoint = from(state);
  const reset = changed(checkpoint, request(checkpoint, 'timeline-reset'));
  assert.deepEqual(getGroup(reset).ids, ['a', 'b']);
  assert.equal(getGroup(reset).orderMode, 'default-time');
  assert.deepEqual(metadata(reset).records, []);
  assert.deepEqual(metadata(reset).resolvedContexts, [{ context: 'date', contextKey: TODAY }]);
  assert.deepEqual(metadata(reset).legacySnapshot, state);
  assert.equal(assertUnchanged(reset, request(reset, 'timeline-reset')).ok, true);
  const defaults = from();
  assert.equal(assertUnchanged(defaults, request(defaults, 'timeline-reset')).ok, true);
  assert.deepEqual(metadata(defaults).resolvedContexts, []);
});

test('C09 reset of an existing record affects only that context and never reactivates legacy order', () => {
  const state = legacyState();
  putOrder(state, 'today', ['b', 'a']);
  const checkpoint = from(state);
  const reordered = changed(checkpoint, request(checkpoint, 'timeline-reorder', { orderedRefKeys: ['a', 'b'] }));
  reordered.state.timelineContextV1.records.push({ context: 'undated', contextKey: 'undated', orderedRefKeys: ['u'], revision: 1 });
  reordered.state.timelineContextV1.resolvedContexts.push({ context: 'undated', contextKey: 'undated' });
  const reset = changed(reordered, request(reordered, 'timeline-reset'));
  assert.deepEqual(metadata(reset).records, [{ context: 'undated', contextKey: 'undated', orderedRefKeys: ['u'], revision: 1 }]);
  assert.deepEqual(getGroup(reset).ids, ['a', 'b']);
  assert.equal(getGroup(reset).manualOrder, false);
  assert.equal(metadata(reset).resolvedContexts.length, 2);
});

test('C10 reset Undo restores canonical order and suppression together after JSON reload', () => {
  const checkpoint = from();
  const reordered = changed(checkpoint, request(checkpoint));
  const reset = changed(reordered, request(reordered, 'timeline-reset'));
  const result = C.undoCheckpoint(freeze(clone(reset)));
  assert.equal(result.ok, true);
  assert.equal(result.changed, true);
  assert.deepEqual(metadata(result.checkpoint), metadata(reordered));
  assert.deepEqual(getGroup(result.checkpoint).ids, ['b', 'a']);
  assert.equal(result.checkpoint.undo, null);
  assert.equal(C.validateCheckpoint(clone(result.checkpoint)).ok, true);
});

test('C10 Undo of first legacy reset restores legacy manual mode and removes its new suppression marker', () => {
  const state = legacyState();
  putOrder(state, 'today', ['b', 'a']);
  const checkpoint = from(state);
  const reset = changed(checkpoint, request(checkpoint, 'timeline-reset'));
  const restored = C.undoCheckpoint(reset).checkpoint;
  assert.deepEqual(metadata(restored).records, []);
  assert.deepEqual(metadata(restored).resolvedContexts, []);
  assert.equal(getGroup(clone(restored)).orderMode, 'legacy-unambiguous');
  assert.deepEqual(getGroup(restored).ids, ['b', 'a']);
});

test('C11 first mutation Undo returns previous current, not older legacy Undo; second Undo is a no-op', () => {
  const state = legacyState();
  const older = legacyState();
  older.tasks[0].memo = '더 오래된 메모';
  const checkpoint = from(state, older);
  const next = changed(checkpoint, { type: 'complete', id: 'a', done: true, completedAt: NOW, now: NOW });
  assert.deepEqual(next.undo, checkpoint.state);
  const restored = C.undoCheckpoint(freeze(next));
  assert.equal(restored.changed, true);
  assert.deepEqual(metadata(restored.checkpoint), metadata(checkpoint));
  assert.equal(restored.checkpoint.state.tasks[0].memo, '');
  // Existing M.undoEnvelope timestamp exception; all other prior state is exact.
  assert.deepEqual(restored.checkpoint.state, { ...checkpoint.state, updatedAt: M.TODAY + 'T12:00:00.000Z' });
  assert.equal(restored.checkpoint.legacyBaseRaw, checkpoint.legacyBaseRaw);
  const second = C.undoCheckpoint(freeze(restored.checkpoint));
  assert.equal(second.changed, false);
  assert.equal(second.checkpoint, restored.checkpoint);
});

test('C11 legacy Undo first selects that separate original snapshot and does not return to old storage', () => {
  const state = legacyState();
  putOrder(state, 'today', ['b', 'a']);
  const older = legacyState();
  older.tasks[0].date = null;
  putOrder(older, 'today', ['b']);
  const checkpoint = from(state, older);
  const restored = C.undoCheckpoint(freeze(checkpoint));
  assert.equal(restored.changed, true);
  assert.equal(restored.checkpoint.version, 2);
  assert.deepEqual(metadata(restored.checkpoint).legacySnapshot, older);
  assert.deepEqual(getGroup(restored.checkpoint).ids, ['b']);
  assert.equal(restored.checkpoint.legacyBaseRaw, checkpoint.legacyBaseRaw);
});

test('C11 v2 permanent deletion is blocked while original raw/snapshots are retained; v1 semantics stay unchanged', () => {
  let checkpoint = from();
  checkpoint = changed(checkpoint, { type: 'move-to-trash', kind: 'quick', id: 'a', now: NOW });
  const action = { type: 'permanently-delete-from-trash', kind: 'quick', id: 'a', confirmed: true, now: NOW };
  assertUnchanged(checkpoint, action, 'legacy-retention-conflict');
  assert.notEqual(checkpoint.undo, null);
  assert.equal(metadata(checkpoint).legacySnapshot.tasks.some(entry => entry.id === 'a'), true);
  const legacy = { version: 1, state: legacyState(), undo: null };
  const trashed = M.transitionEnvelope(legacy, { type: 'move-to-trash', kind: 'quick', id: 'a', now: NOW });
  const deleted = M.transitionEnvelope(trashed.envelope, action);
  assert.equal(deleted.changed, true);
  assert.equal(deleted.envelope.undo, null);
  assert.equal(deleted.envelope.state.tasks.some(entry => entry.id === 'a'), false);
});

test('C12 current trash OR excluded policy affects active groups but not old decoder membership', () => {
  const state = legacyState();
  state.tasks[0].timelinePolicy = 'excluded';
  putOrder(state, 'today', ['a', 'b']);
  const checkpoint = from(state);
  assert.deepEqual(getGroup(checkpoint).ids, ['b']);
  assert.equal(getGroup(checkpoint).orderMode, 'legacy-unambiguous');
  assert.deepEqual(metadata(checkpoint).legacySnapshot.orders.today, ['a', 'b']);
  const trashed = changed(checkpoint, { type: 'move-to-trash', kind: 'quick', id: 'b', now: NOW });
  assert.equal(C.projectGroups(trashed, 'today', TODAY).groups.length, 0);
});

test('C12 canonical stale refs survive date movement and read pruning without authorizing foreign reorder refs', () => {
  let checkpoint = from();
  checkpoint = changed(checkpoint, request(checkpoint));
  checkpoint = changed(checkpoint, { type: 'schedule', id: 'b', date: '2026-10-01', now: NOW });
  assert.deepEqual(metadata(checkpoint).records[0].orderedRefKeys, ['b', 'a']);
  assert.deepEqual(getGroup(checkpoint).ids, ['a']);
  assertUnchanged(checkpoint, request(checkpoint, 'timeline-reorder', { orderedRefKeys: ['b'] }), 'invalid-timeline-peers');
});

test('C09 stale revision, stale displayed order and incomplete/duplicate/foreign peers cannot change a checkpoint', () => {
  for (const overrides of [{ expectedRevision: 10 }, { currentOrderedRefKeys: ['b', 'a'] }, { currentOrderedRefKeys: ['a'] }, { orderedRefKeys: ['b', 'b'] }, { orderedRefKeys: ['b', 'foreign'] }]) {
    const checkpoint = from();
    assert.equal(assertUnchanged(checkpoint, request(checkpoint, 'timeline-reorder', overrides)).ok, false);
  }
});

test('C09 unsupported context, malformed dates/clock and hidden/nonexistent scopes cannot be reordered', () => {
  const checkpoint = from();
  const valid = request(checkpoint);
  for (const overrides of [{ context: 'folder' }, { contextKey: '2026-02-30' }, { localToday: 'bad' }, { contextKey: '2026-09-20' }, { context: 'overdue', contextKey: '2026-09-01', localToday: TODAY }, { now: '' }]) assert.equal(assertUnchanged(checkpoint, { ...valid, ...overrides }).ok, false);
  assert.equal(C.projectGroups(checkpoint, 'week', 'bad').ok, false);
});

test('C09 date/undated/overdue tickets require a separate current clock and reject day rollover before mutation', () => {
  const checkpoint = from();
  for (const overrides of [{}, { context: 'undated', contextKey: 'undated' }, { context: 'overdue', contextKey: '2026-09-04', localToday: '2026-09-04' }]) {
    const action = request(checkpoint, 'timeline-reorder', overrides);
    assertUnchanged(checkpoint, action, 'invalid-timeline-clock', {});
    assertUnchanged(checkpoint, action, 'stale-timeline-clock', { currentLocalToday: '2026-09-05' });
    const noOpeningClock = { ...action };
    delete noOpeningClock.localToday;
    assertUnchanged(checkpoint, noOpeningClock, 'invalid-timeline-clock', { currentLocalToday: TODAY });
  }
});

test('C09 legacy generic timeline reorder is blocked; existing folder reorder uses the regular domain action', () => {
  const state = legacyState();
  putOrder(state, 'folder:unfiled', ['u', 'b', 'a']);
  const checkpoint = from(state);
  assertUnchanged(checkpoint, { type: 'reorder', context: 'today', ids: ['b', 'a'], now: NOW }, 'legacy-timeline-action-disabled');
  const ids = M.viewTaskIds(checkpoint.state, 'folder:unfiled').slice().reverse();
  const next = changed(checkpoint, { type: 'reorder', context: 'folder:unfiled', ids, now: NOW });
  assert.deepEqual(next.state.orders['folder:unfiled'], ids);
  assert.deepEqual(metadata(next).legacySnapshot, state);
});

test('C11 invalid checkpoint, canceled conversion and invalid ordinary action never replace an existing Undo', () => {
  const checkpoint = from(legacyState(), legacyState());
  assertUnchanged(checkpoint, { type: 'convert-quick-item-to-flow', intent: 'cancel' });
  assertUnchanged(checkpoint, { type: 'unsupported' });
  const corrupt = clone(checkpoint);
  metadata(corrupt).version = 2;
  assertUnchanged(corrupt, { type: 'complete', id: 'a', done: true });
  assert.equal(C.undoCheckpoint(corrupt).ok, false);
});

test('C05 active old timeline arrays and lossy non-JSON data cannot bypass strict checkpoint validation', () => {
  for (const mutate of [entry => { entry.state.orders.today = ['a', 'b']; }, entry => { entry.state.extra = undefined; }, entry => { entry.state.extra = NaN; }, entry => { entry.state.extra = new Date(0); }, entry => { metadata(entry).records = new Array(1); }]) {
    const checkpoint = from();
    mutate(checkpoint);
    assert.equal(C.validateCheckpoint(checkpoint).ok, false);
  }
});

test('C07 ordinary domain adapter rejects unexpected archive changes instead of accepting a valid foreign snapshot', () => {
  const checkpoint = from();
  const before = JSON.stringify(checkpoint);
  const model = { ...M, apply(state, action) { const result = M.apply(state, action); result.state.timelineContextV1.legacySnapshot.tasks[0].memo = '잘못된 재작성'; return result; } };
  const result = C.transitionCheckpoint(freeze(checkpoint), { type: 'complete', id: 'a', done: true, completedAt: NOW, now: NOW }, { model, timeline: T });
  assert.equal(result.reason, 'unexpected-timeline-metadata-change');
  assert.equal(result.changed, false);
  assert.equal(JSON.stringify(checkpoint), before);
});

test('C13 repeated mutations keep exactly current/undo snapshots, preserve large source, and report finite sizes', t => {
  for (const [name, source] of [['representative', '원문\r\n  그대로  '], ['large-source', '원문과 사실\r\n  그대로 보존  '.repeat(10000)]]) {
    const state = legacyState();
    state.rawSourceForSizeFixture = source;
    putOrder(state, 'today', ['b', 'a']);
    const original = rawOf(state);
    let checkpoint = C.fromLegacy(original).checkpoint;
    const initialLength = JSON.stringify(checkpoint).length;
    const sizes = [];
    for (let index = 0; index < 12; index += 1) {
      checkpoint = changed(checkpoint, { type: 'complete', id: 'a', done: index % 2 === 0, completedAt: NOW, now: NOW });
      assert.equal(checkpoint.state.rawSourceForSizeFixture, source);
      assert.equal(metadata(checkpoint).legacySnapshot.rawSourceForSizeFixture, source);
      assert.equal(Object.hasOwn(metadata(checkpoint).legacySnapshot, 'timelineContextV1'), false);
      assert.equal(Object.hasOwn(checkpoint.undo.timelineContextV1.legacySnapshot, 'timelineContextV1'), false);
      sizes.push(JSON.stringify(checkpoint).length);
    }
    assert.ok(Math.max(...sizes) - Math.min(...sizes) < 200, name);
    t.diagnostic(JSON.stringify({ fixture: name, oldUtf16Length: original.length, initialCheckpointUtf16Length: initialLength, finalCheckpointUtf16Length: sizes.at(-1), finalCheckpointUtf8Bytes: Buffer.byteLength(JSON.stringify(checkpoint), 'utf8'), iterations: 12, minCheckpointUtf16Length: Math.min(...sizes), maxCheckpointUtf16Length: Math.max(...sizes) }));
  }
});

test('C01-C13 repeated pure reads/transitions/Undo leave source objects and bytes untouched with no ambient access', () => {
  const checkpoint = freeze(from());
  const before = JSON.stringify(checkpoint);
  const context = vm.createContext({ FlowMeIntegratedPoc: M, FlowPocTimelineContext: T });
  let reads = 0;
  for (const key of ['localStorage', 'document']) Object.defineProperty(context, key, { get() { reads += 1; throw new Error(key); } });
  vm.runInContext(fs.readFileSync(require.resolve('./workspace-checkpoint.js'), 'utf8'), context);
  const api = context.FlowPocWorkspaceCheckpoint;
  assert.equal(api.validateCheckpoint(checkpoint).ok, true);
  assert.equal(api.projectGroups(checkpoint, 'today', TODAY).ok, true);
  const next = api.transitionCheckpoint(checkpoint, { type: 'schedule', id: 'a', date: null, now: NOW });
  assert.equal(next.changed, true);
  assert.equal(api.undoCheckpoint(next.checkpoint).changed, true);
  assert.equal(reads, 0);
  assert.equal(JSON.stringify(checkpoint), before);
});
