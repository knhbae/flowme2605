'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const M = require('./model.js');
const C = require('./workspace-checkpoint.js');
const D = require('./workspace-permanent-delete.js');
const sourceRuntime = require('./source-update-runtime.cjs').loadCommonJs();
const NOW = '2026-09-05T03:04:05.000Z';
const clone = value => JSON.parse(JSON.stringify(value));
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
const rawOf = (state, undo = null, extra = {}) => ' \n' + JSON.stringify({ version: 1, state, undo, ...extra }, null, 2) + '\n ';
const flowTarget = (state, id = 'moving') => { const flow = state.flows.find(entry => entry.id === id); return { kind: 'flow', id: flow.id, savedCopyId: flow.savedCopyId, sourceFlowId: flow.sourceFlowId, ref: flow.ref }; };
function apply(state, action) { const result = M.apply(state, { ...action, now: NOW }); assert.equal(result.changed, true, result.error || result.message); return result.state; }
function checkpoint(state, undo = null) { const result = C.fromLegacy(rawOf(state, undo)); assert.equal(result.ok, true, result.reason); return result.checkpoint; }
function trash(state, kind = 'flow', id = 'moving') { return apply(state, { type: 'move-to-trash', kind, id }); }
function request(cp, target = flowTarget(cp.state), extra = {}) { return { checkpoint: cp, target, confirmed: true, expectedRevision: cp.state.revision, sourceCandidateRaw: null, now: NOW, ...extra }; }
function success(input) {
  const before = JSON.stringify(input);
  const result = D.planPermanentDelete(freeze(input));
  assert.equal(result.ok, true, result.reason);
  assert.equal(result.changed, true);
  assert.equal(JSON.stringify(input), before);
  assert.equal(C.validateCheckpoint(result.checkpoint).ok, true);
  assert.equal(result.checkpoint.undo, null);
  assert.ok(result.writes.every(write => write.key.startsWith('flow:poc:personal-workspace:v1:')));
  return result;
}
function blocked(input, reason) {
  const before = JSON.stringify(input);
  const result = D.planPermanentDelete(freeze(input));
  assert.equal(result.changed, false);
  assert.equal(result.checkpoint, input.checkpoint);
  assert.equal(result.legacyRaw, input.checkpoint.legacyBaseRaw);
  assert.equal(result.sourceCandidateRaw, input.sourceCandidateRaw);
  assert.deepEqual(result.writes, []);
  assert.equal(JSON.stringify(input), before);
  if (reason) assert.equal(result.reason, reason);
  return result;
}
function authored(state = M.seedState(), suffix = 'delete', source = '# 삭제 소유 원문\n## 준비\n- [x] 삭제 소유 할 일\n  - 설명: 삭제 개인 설명') {
  const handoff = M.makeHandoff(source, { draftId: 'draft-' + suffix, handoffId: 'handoff-' + suffix, sourceConfirmed: true, folderId: null });
  const next = apply(state, { type: 'commit-authoring', handoff });
  return { state: next, flow: next.flows.find(flow => flow.handoffId === handoff.handoffId) };
}
function prepareSource(state, flow, store = M.initialSourceCandidateStore(NOW)) {
  const prepared = M.prepareLocalSourceCandidateReview(store, state, flow.id, { now: NOW, createdAt: NOW });
  assert.equal(prepared.ok, true, prepared.reason);
  return prepared;
}
function applySource(prepared, state, flow) {
  let store = prepared.store;
  for (const change of prepared.candidate.changes) {
    const chosen = M.resolveLocalSourceCandidateChange(store, { candidateId: prepared.candidate.candidateId, changeId: change.changeId, resolution: 'use-incoming', now: NOW });
    assert.equal(chosen.changed, true, chosen.code);
    store = chosen.store;
  }
  const result = M.applyLocalSourceCandidate(store, state, flow.id, prepared.candidate.candidateId, NOW);
  assert.equal(result.changed, true, result.reason || result.code);
  return result.store;
}

test('D01 lazy UMD/CommonJS exposes only pure planner and does not access storage/DOM', () => {
  assert.equal(D.VERSION, 1);
  let requires = 0;
  const cjs = vm.createContext({ module: { exports: {} }, require() { requires += 1; throw new Error('eager dependency'); } });
  const source = fs.readFileSync(require.resolve('./workspace-permanent-delete.js'), 'utf8');
  vm.runInContext(source, cjs);
  assert.equal(requires, 0);
  assert.deepEqual(Object.keys(cjs.module.exports), Object.keys(D));
  const browser = vm.createContext({ FlowMeIntegratedPoc: M, FlowPocWorkspaceCheckpoint: C });
  let accesses = 0;
  for (const name of ['localStorage', 'window', 'document']) Object.defineProperty(browser, name, { get() { accesses += 1; throw new Error(name); } });
  vm.runInContext(source, browser);
  const cp = checkpoint(trash(M.seedState()));
  assert.equal(browser.FlowPocWorkspacePermanentDelete.planPermanentDelete(request(cp)).ok, true);
  assert.equal(accesses, 0);
});

test('D02 Flow private fields disappear from old current/undo, active/archive; neighbors preserve exact values', () => {
  const original = authored();
  original.flow.targetUnknown = { private: 'TARGET_PRIVATE_SENTINEL' };
  const task = original.state.tasks.find(entry => entry.flowId === original.flow.id);
  task.memo = 'TARGET_MEMO_SENTINEL'; task.done = true; task.completedAt = NOW;
  original.state.flows.find(entry => entry.id === 'memo').neighborUnknown = { exact: ['TARGET_PRIVATE_SENTINEL', 'keep'] };
  // Equal strings in another owner's data intentionally remain.
  const before = clone(original.state);
  const cp = checkpoint(trash(original.state, 'flow', original.flow.id), before);
  const target = flowTarget(cp.state, original.flow.id);
  const result = success(request(cp, target));
  const base = JSON.parse(result.legacyRaw);
  for (const state of [base.state, base.undo, result.checkpoint.state, result.checkpoint.state.timelineContextV1.legacySnapshot]) {
    assert.equal(state.flows.some(flow => flow.ref === target.ref), false);
    assert.equal(state.tasks.some(entry => entry.flowId === target.id), false);
    assert.equal(JSON.stringify(state).includes('TARGET_MEMO_SENTINEL'), false);
    assert.deepEqual(state.flows.find(entry => entry.id === 'memo'), before.flows.find(entry => entry.id === 'memo'));
  }
  assert.equal(result.checkpoint.state.lastReceipt, null);
  assert.equal(base.undo.lastReceipt, null);
  assert.equal(result.checkpoint.state.revision, cp.state.revision + 1);
  assert.equal(result.checkpoint.state.updatedAt, NOW);
  assert.equal(base.undo.updatedAt, before.updatedAt);
});

test('D03 target-only unique raw sentinel is absent from all successful after raws', () => {
  const fixture = authored(undefined, 'only', '# DELETE_ONLY_RAW_SENTINEL\n## 준비\n- [x] DELETE_ONLY_ITEM_SENTINEL');
  const cp = checkpoint(trash(fixture.state, 'flow', fixture.flow.id), fixture.state);
  const result = success(request(cp, flowTarget(cp.state, fixture.flow.id)));
  for (const raw of [result.checkpointRaw, result.legacyRaw, ...result.writes.map(write => write.afterRaw)]) {
    assert.equal(raw.includes('DELETE_ONLY_RAW_SENTINEL'), false);
    assert.equal(raw.includes('DELETE_ONLY_ITEM_SENTINEL'), false);
  }
});

test('D04 different initial current/undo snapshots rebind to their own scrubbed baseline', () => {
  const oldUndo = M.seedState(); oldUndo.tasks.find(task => task.id === 'call').memo = 'UNDO_NEIGHBOR';
  const oldCurrent = clone(oldUndo); oldCurrent.tasks.find(task => task.id === 'call').memo = 'CURRENT_NEIGHBOR';
  let cp = checkpoint(trash(oldCurrent), oldUndo);
  cp = C.undoCheckpoint(cp).checkpoint;
  cp = C.transitionCheckpoint(cp, { type: 'move-to-trash', kind: 'flow', id: 'moving', now: NOW }).checkpoint;
  const result = success(request(cp));
  const base = JSON.parse(result.legacyRaw);
  assert.equal(base.state.tasks.find(task => task.id === 'call').memo, 'CURRENT_NEIGHBOR');
  assert.equal(base.undo.tasks.find(task => task.id === 'call').memo, 'UNDO_NEIGHBOR');
  assert.deepEqual(result.checkpoint.state.timelineContextV1.legacySnapshot, base.undo);
});

test('D05 explicit seed deletion alone materializes a scrubbed null baseline without changing M seed', () => {
  const seed = M.seedState();
  const cp = C.transitionCheckpoint(C.fromLegacy(null).checkpoint, { type: 'move-to-trash', kind: 'flow', id: 'moving', now: NOW }).checkpoint;
  const result = success(request(cp));
  assert.equal(cp.legacyBaseRaw, null);
  assert.equal(typeof result.legacyRaw, 'string');
  assert.equal(result.writes[0].beforeRaw, null);
  assert.deepEqual(result.checkpoint.state.timelineContextV1.legacySnapshot, JSON.parse(result.legacyRaw).state);
  assert.deepEqual(M.seedState(), seed);
});

test('D06 a new Quick absent from seed keeps null baseline and no legacy write plan', () => {
  let cp = C.fromLegacy(null).checkpoint;
  cp = C.transitionCheckpoint(cp, { type: 'add-quick', title: '신규 삭제 대상', folderId: null, date: null }).checkpoint;
  cp = C.transitionCheckpoint(cp, { type: 'move-to-trash', kind: 'quick', id: 'quick-1', now: NOW }).checkpoint;
  const result = success(request(cp, { kind: 'quick', id: 'quick-1' }));
  assert.equal(result.legacyRaw, null);
  assert.deepEqual(result.writes, []);
  assert.deepEqual(result.checkpoint.state.timelineContextV1.legacySnapshot, M.seedState());
});

test('D07 same-title other saved copy remains including its source and execution data', () => {
  const first = authored(undefined, 'one');
  const second = authored(first.state, 'two');
  const neighbor = clone(second.flow);
  const neighborTasks = second.state.tasks.filter(task => task.flowId === neighbor.id);
  const cp = checkpoint(trash(second.state, 'flow', first.flow.id), second.state);
  const result = success(request(cp, flowTarget(cp.state, first.flow.id)));
  assert.deepEqual(result.checkpoint.state.flows.find(flow => flow.id === neighbor.id), neighbor);
  assert.deepEqual(result.checkpoint.state.tasks.filter(task => task.flowId === neighbor.id), neighborTasks);
  assert.deepEqual(result.checkpoint.state.lastReceipt, second.state.lastReceipt);
});

test('D08 Flow local-id reused for another tuple in baseline blocks only deletion', () => {
  const cp = checkpoint(trash(M.seedState()));
  cp.state.flows.find(flow => flow.id === 'moving').savedCopyId = 'other-copy';
  cp.state.flows.find(flow => flow.id === 'moving').ref = 'saved-flow:other-copy:flow-moving';
  cp.state.tasks.filter(task => task.flowId === 'moving').forEach(task => { task.ref = task.ref.replace('copy-map-moving', 'other-copy'); });
  assert.equal(C.validateCheckpoint(cp).ok, true);
  blocked(request(cp), 'delete-owner-conflict');
});

test('D09 Quick id conflicting with historical Flow Item kind blocks deletion', () => {
  const baseline = M.seedState();
  let cp = checkpoint(baseline);
  const moving = cp.state.flows.find(flow => flow.id === 'moving');
  moving.steps[0].itemIds = moving.steps[0].itemIds.filter(id => id !== 'quote');
  const task = cp.state.tasks.find(entry => entry.id === 'quote');
  task.flowId = null; task.folderId = null;
  cp.state.trashEntries.push({ kind: 'quick', id: 'quote', deletedAt: NOW });
  assert.equal(C.validateCheckpoint(cp).ok, true);
  blocked(request(cp, { kind: 'quick', id: 'quote' }), 'delete-owner-conflict');
});

test('D10 another historical local id of the exact Flow tuple is scrubbed independently', () => {
  const baseline = M.seedState();
  const cp = checkpoint(trash(baseline), baseline);
  cp.state.flows.find(flow => flow.id === 'moving').id = 'moving-new';
  cp.state.tasks.filter(task => task.flowId === 'moving').forEach(task => { task.flowId = 'moving-new'; });
  cp.state.trashEntries.find(entry => entry.id === 'moving').id = 'moving-new';
  const result = success(request(cp, flowTarget(cp.state, 'moving-new')));
  assert.equal(result.checkpointRaw.includes('saved-flow:copy-map-moving:flow-moving'), false);
});

test('D11 legacy and canonical orders filter only deleted references and preserve neighbor order/resolution', () => {
  const baseline = M.seedState();
  for (const context of ['undated', 'week', 'month', 'flow:moving', 'flow:moving:select', 'flow:memo', 'folder:move']) baseline.orders[context] = M.viewTaskIds(baseline, context).reverse();
  const cp = checkpoint(trash(baseline), baseline);
  cp.state.timelineContextV1.records = [{ context: 'undated', contextKey: 'undated', orderedRefKeys: ['memo-outline', 'quote', 'call'], revision: 0 }];
  cp.state.timelineContextV1.resolvedContexts = [{ context: 'undated', contextKey: 'undated' }];
  const result = success(request(cp));
  const after = JSON.parse(result.legacyRaw).undo;
  for (const context of ['undated', 'week', 'month', 'flow:memo', 'folder:move']) assert.deepEqual(after.orders[context], baseline.orders[context].filter(id => !['quote', 'contract'].includes(id)));
  assert.equal(Object.hasOwn(after.orders, 'flow:moving'), false);
  assert.equal(Object.hasOwn(after.orders, 'flow:moving:select'), false);
  assert.deepEqual(result.checkpoint.state.timelineContextV1.records, [{ context: 'undated', contextKey: 'undated', orderedRefKeys: ['memo-outline', 'call'], revision: 0 }]);
  assert.deepEqual(result.checkpoint.state.timelineContextV1.resolvedContexts, cp.state.timelineContextV1.resolvedContexts);
});

test('D12 unknown top-level legacy envelope or state owner blocks; neighbor entity unknown does not', () => {
  const state = trash(M.seedState());
  const cases = [C.fromLegacy(rawOf(state, null, { unowned: 'possibly private' })).checkpoint, checkpoint({ ...state, unowned: 'possibly private' })];
  for (const cp of cases) blocked(request(cp), 'delete-scope-unproven');
  const cp = checkpoint(state); cp.state.tasks.find(task => task.id === 'call').neighborUnknown = { keep: true };
  const result = success(request(cp));
  assert.deepEqual(result.checkpoint.state.tasks.find(task => task.id === 'call').neighborUnknown, { keep: true });
});

test('D13 ownerless receipt or unknown order context is narrowly blocked', () => {
  const state = trash(M.seedState());
  for (const mutate of [value => { value.lastReceipt = { privateRaw: 'owner unknown' }; }, value => { value.orders.future = []; }]) {
    const next = clone(state); mutate(next);
    blocked(request(checkpoint(next)), 'delete-scope-unproven');
  }
});

test('D14 source Quick deletion removes conversion receipt/event and preserves independent Flow plus its same text', () => {
  let state = M.seedState();
  state = apply(state, { type: 'convert-quick-item-to-flow', quickItemId: 'call', flowTitle: '독립 Flow', expectedRevision: state.revision });
  const converted = clone(state.flows.at(-1));
  const convertedTask = clone(state.tasks.at(-1));
  const cp = checkpoint(trash(state, 'quick', 'call'), state);
  const result = success(request(cp, { kind: 'quick', id: 'call' }));
  for (const snapshot of [result.checkpoint.state, JSON.parse(result.legacyRaw).state, JSON.parse(result.legacyRaw).undo]) {
    assert.equal(snapshot.tasks.some(task => task.id === 'call'), false);
    assert.deepEqual(snapshot.quickConversionReceipts, []);
    assert.equal(snapshot.lastReceipt, null);
    assert.deepEqual(snapshot.flows.find(flow => flow.id === converted.id), converted);
    assert.deepEqual(snapshot.tasks.find(task => task.id === convertedTask.id), convertedTask);
  }
});

test('D15 converted Flow deletion removes its receipt but preserves source Quick and its data', () => {
  let state = M.seedState();
  state = apply(state, { type: 'convert-quick-item-to-flow', quickItemId: 'call', flowTitle: '독립 Flow', expectedRevision: state.revision });
  const flow = state.flows.at(-1);
  const cp = checkpoint(trash(state, 'flow', flow.id), state);
  const result = success(request(cp, flowTarget(cp.state, flow.id)));
  assert.deepEqual(result.checkpoint.state.tasks.find(task => task.id === 'call'), state.tasks.find(task => task.id === 'call'));
  assert.deepEqual(result.checkpoint.state.quickConversionReceipts, []);
});

test('D16 Quick id reuse after deletion supports new conversion without reviving old owned data', () => {
  let state = apply(M.seedState(), { type: 'add-quick', title: 'OLD_QUICK_ONLY_SENTINEL', folderId: null, date: null });
  state = apply(state, { type: 'convert-quick-item-to-flow', quickItemId: 'quick-1', flowTitle: '보존 독립 Flow', expectedRevision: state.revision });
  const independent = clone(state.flows.at(-1));
  const cp = checkpoint(trash(state, 'quick', 'quick-1'), state);
  const deleted = success(request(cp, { kind: 'quick', id: 'quick-1' })).checkpoint;
  let next = C.transitionCheckpoint(deleted, { type: 'add-quick', title: 'NEW_QUICK', folderId: null, date: null }).checkpoint;
  assert.equal(next.state.tasks.find(task => task.id === 'quick-1').title, 'NEW_QUICK');
  const converted = C.transitionCheckpoint(next, { type: 'convert-quick-item-to-flow', quickItemId: 'quick-1', flowTitle: '신규 독립 Flow', expectedRevision: next.state.revision, now: NOW });
  assert.equal(converted.changed, true, converted.reason);
  assert.equal(converted.checkpoint.state.quickConversionReceipts.length, 1);
  assert.equal(converted.checkpoint.state.quickConversionReceipts[0].sourceTitle, 'NEW_QUICK');
  assert.deepEqual(converted.checkpoint.state.flows.find(flow => flow.id === independent.id), independent);
  const reverted = C.undoCheckpoint(next).checkpoint;
  assert.equal(reverted.state.tasks.some(task => task.id === 'quick-1'), false);
  // Independent converted Flow intentionally retains its source text.
  assert.equal(reverted.state.flows.some(flow => flow.id === independent.id), true);
});

test('D17 source pending candidates remove only exact target tuple including all private snapshots', () => {
  const first = authored(undefined, 'candidate-one');
  const second = authored(first.state, 'candidate-two');
  const prepared = prepareSource(second.state, first.flow);
  const neighbor = prepareSource(second.state, second.flow, prepared.store);
  const raw = ' \n' + JSON.stringify(neighbor.store, null, 2) + '\n';
  const cp = checkpoint(trash(second.state, 'flow', first.flow.id), second.state);
  const result = success(request(cp, flowTarget(cp.state, first.flow.id), { sourceCandidateRaw: raw }));
  const next = JSON.parse(result.sourceCandidateRaw);
  assert.equal(sourceRuntime.isPersonalWorkspacePocSourceCandidateStore(next), true);
  assert.equal(Object.hasOwn(next.envelopes, prepared.candidate.candidateId), false);
  assert.deepEqual(next.envelopes[neighbor.candidate.candidateId], neighbor.store.envelopes[neighbor.candidate.candidateId]);
  assert.deepEqual(next.reviews[neighbor.candidate.candidateId], neighbor.store.reviews[neighbor.candidate.candidateId]);
  assert.equal(result.footprint.sourceCandidates, 1);
  assert.deepEqual(result.writes.map(write => write.key), [M.STORAGE_KEY, M.SOURCE_CANDIDATE_STORAGE_KEY]);
});

test('D18 applied source effective version and target Undo are scrubbed and cannot restore private source', () => {
  const fixture = authored(undefined, 'applied', '# SOURCE_PRIVATE_SENTINEL\n## 준비\n- [ ] SOURCE_ITEM_SENTINEL');
  const prepared = prepareSource(fixture.state, fixture.flow);
  const store = applySource(prepared, fixture.state, fixture.flow);
  assert.ok(store.undo);
  const cp = checkpoint(trash(fixture.state, 'flow', fixture.flow.id), fixture.state);
  const result = success(request(cp, flowTarget(cp.state, fixture.flow.id), { sourceCandidateRaw: JSON.stringify(store) }));
  const next = JSON.parse(result.sourceCandidateRaw);
  assert.deepEqual(next.envelopes, {}); assert.deepEqual(next.reviews, {}); assert.deepEqual(next.effectiveVersions, {}); assert.equal(next.undo, undefined);
  for (const raw of [result.checkpointRaw, result.legacyRaw, result.sourceCandidateRaw]) assert.equal(raw.includes('SOURCE_PRIVATE_SENTINEL'), false);
  assert.equal(M.undoLocalSourceCandidate(next, NOW).changed, false);
});

test('D19 missing/unreadable/invalid source store blocks instead of claiming complete deletion', () => {
  const cp = checkpoint(trash(M.seedState()));
  for (const sourceCandidateRaw of [undefined, 4]) blocked(request(cp, undefined, { sourceCandidateRaw }), 'source-owner-unverified');
  for (const sourceCandidateRaw of ['{', JSON.stringify({ ...M.initialSourceCandidateStore(NOW), unknown: 'private' })]) blocked(request(cp, undefined, { sourceCandidateRaw }), 'invalid-source-store');
});

test('D20 absent target candidate keeps unrelated source JSON bytes including whitespace', () => {
  const fixture = authored(); const prepared = prepareSource(fixture.state, fixture.flow);
  const raw = ' \n' + JSON.stringify(prepared.store, null, 2) + '\n ';
  const cp = checkpoint(trash(fixture.state));
  const result = success(request(cp, undefined, { sourceCandidateRaw: raw }));
  assert.equal(result.sourceCandidateRaw, raw);
  assert.equal(result.writes.some(write => write.key === M.SOURCE_CANDIDATE_STORAGE_KEY), false);
});

test('D21 cancel, not-in-trash, stale revision, wrong tuple, malformed time are zero-change', () => {
  const cp = checkpoint(trash(M.seedState()));
  blocked(request(cp, undefined, { confirmed: false }), 'confirmation-required');
  blocked(request(cp, undefined, { expectedRevision: cp.state.revision - 1 }), 'stale-state-revision');
  blocked(request(cp, undefined, { now: '2026-02-30T00:00:00.000Z' }), 'invalid-delete-time');
  blocked(request(cp, { ...flowTarget(cp.state), ref: 'saved-flow:foreign:flow' }), 'invalid-delete-target');
  blocked(request(checkpoint(M.seedState())), 'target-not-in-trash');
});

test('D22 final serialization reload and later change/Undo cannot revive deleted Flow', () => {
  const cp = checkpoint(trash(M.seedState()), M.seedState());
  const result = success(request(cp));
  const reloaded = JSON.parse(result.checkpointRaw);
  assert.equal(C.validateCheckpoint(reloaded).ok, true);
  assert.equal(C.undoCheckpoint(reloaded).changed, false);
  const changed = C.transitionCheckpoint(reloaded, { type: 'complete', id: 'call', done: true, now: NOW });
  assert.equal(changed.changed, true, changed.reason);
  const undone = C.undoCheckpoint(changed.checkpoint).checkpoint;
  assert.equal(undone.state.flows.some(flow => flow.id === 'moving'), false);
  assert.equal(undone.state.tasks.some(task => task.flowId === 'moving'), false);
  blocked(request(reloaded, flowTarget(cp.state)), 'target-not-found');
});

test('D23 C1 generic delete stays blocked and legacy irreversible delete keeps undo null', () => {
  const state = trash(M.seedState());
  const cp = checkpoint(state);
  const action = { type: 'permanently-delete-from-trash', kind: 'flow', id: 'moving', confirmed: true };
  assert.equal(C.transitionCheckpoint(cp, action).reason, 'legacy-retention-conflict');
  const old = M.transitionEnvelope({ version: 1, state, undo: M.seedState() }, action);
  assert.equal(old.changed, true); assert.equal(old.envelope.undo, null);
});

test('D24 malformed checkpoint and dependency failure produce unchanged failure packets', () => {
  const cp = checkpoint(trash(M.seedState()));
  const corrupt = clone(cp); corrupt.state.timelineContextV1.version = 2;
  blocked(request(corrupt), 'invalid-checkpoint');
  const input = request(cp);
  const result = D.planPermanentDelete(input, { model: {}, checkpoint: {} });
  assert.equal(result.reason, 'delete-dependencies-unavailable'); assert.equal(result.checkpoint, cp); assert.deepEqual(result.writes, []);
});

test('D25 recurring selected Flow overrides are removed while another copy overrides stay exact', () => {
  const raw = '# 반복 삭제 소유\n## 매일\n- [ ] 물 마시기\n  - 날짜: 2026-09-02\n  - 반복: 매일\n  - 반복 종료: 3회';
  const first = authored(undefined, 'repeat-one', raw);
  const second = authored(first.state, 'repeat-two', raw);
  let state = second.state;
  for (const flow of [first.flow, second.flow]) {
    const item = M.resultProjection(state, flow.id).items[1];
    assert.ok(item.occurrenceId);
    state = apply(state, { type: 'complete-occurrence', sourceItemRef: item.sourceItemRef, occurrenceId: item.occurrenceId, originalDate: item.originalDate, done: true, completedAt: NOW });
    state.occurrenceOverrides[item.occurrenceId].ownerUnknown = flow.id === first.flow.id ? 'TARGET_OCCURRENCE_SENTINEL' : 'NEIGHBOR_OCCURRENCE';
  }
  const beforeOverrides = clone(state.occurrenceOverrides);
  const cp = checkpoint(trash(state, 'flow', first.flow.id), state);
  const result = success(request(cp, flowTarget(cp.state, first.flow.id)));
  for (const snapshot of [result.checkpoint.state, JSON.parse(result.legacyRaw).state, JSON.parse(result.legacyRaw).undo]) {
    assert.equal(JSON.stringify(snapshot).includes('TARGET_OCCURRENCE_SENTINEL'), false);
    const remaining = Object.entries(beforeOverrides).filter(([, value]) => value.ownerUnknown === 'NEIGHBOR_OCCURRENCE');
    assert.deepEqual(snapshot.occurrenceOverrides, Object.fromEntries(remaining));
  }
});

test('D26 otherwise valid source Undo crossing owners blocks instead of erasing unrelated recovery', () => {
  const first = authored(undefined, 'cross-one');
  const second = authored(first.state, 'cross-two');
  const preparedFirst = prepareSource(second.state, first.flow);
  const appliedFirst = applySource(preparedFirst, second.state, first.flow);
  const preparedSecond = prepareSource(second.state, second.flow, appliedFirst);
  const appliedSecond = clone(applySource(preparedSecond, second.state, second.flow));
  appliedSecond.undo.previousEffectiveVersion = clone(appliedFirst.effectiveVersions[first.flow.ref]);
  // The source runtime accepts this cross-owner previousEffectiveVersion shape;
  // the delete planner must independently prove ownership before scrub.
  assert.equal(sourceRuntime.isPersonalWorkspacePocSourceCandidateStore(appliedSecond), true);
  for (const flow of [first.flow, second.flow]) {
    const cp = checkpoint(trash(second.state, 'flow', flow.id));
    blocked(request(cp, flowTarget(cp.state, flow.id), { sourceCandidateRaw: JSON.stringify(appliedSecond) }), 'delete-scope-unproven');
  }
});

test('D27 stale conversion event bound by historical receipt is removed even if active receipt is absent', () => {
  let state = M.seedState();
  state = apply(state, { type: 'convert-quick-item-to-flow', quickItemId: 'call', flowTitle: '독립 Flow', expectedRevision: state.revision });
  const cp = checkpoint(trash(state, 'quick', 'call'), state);
  cp.state.quickConversionReceipts = [];
  const result = success(request(cp, { kind: 'quick', id: 'call' }));
  assert.equal(result.checkpoint.state.lastReceipt, null);
  assert.equal(result.checkpoint.state.flows.some(flow => flow.title === '독립 Flow'), true);
});

test('D28 malformed Unicode, extra target keys, missing source read and invalid revision fail closed', () => {
  const cp = checkpoint(trash(M.seedState()));
  for (const target of [{ ...flowTarget(cp.state), savedCopyId: '\ud800' }, { ...flowTarget(cp.state), unknown: true }, null, { kind: 'quick', id: '../call' }]) blocked(request(cp, target), 'invalid-delete-target');
  const missingSource = request(cp); delete missingSource.sourceCandidateRaw;
  blocked(missingSource, 'source-owner-unverified');
  blocked(request(cp, undefined, { expectedRevision: NaN }), 'stale-state-revision');
});

test('D29 unchanged non-null legacy raw preserves exact whitespace for new target absent from archive', () => {
  const originalRaw = rawOf(M.seedState());
  let cp = C.fromLegacy(originalRaw).checkpoint;
  cp = C.transitionCheckpoint(cp, { type: 'add-quick', title: '새 항목', date: null, folderId: null }).checkpoint;
  cp = C.transitionCheckpoint(cp, { type: 'move-to-trash', kind: 'quick', id: 'quick-1', now: NOW }).checkpoint;
  const result = success(request(cp, { kind: 'quick', id: 'quick-1' }));
  assert.equal(result.legacyRaw, originalRaw);
  assert.deepEqual(result.writes, []);
});

test('D30 source dependency failure and exhausted revisions never return partially scrubbed candidates', () => {
  const cp = checkpoint(trash(M.seedState()));
  const input = request(cp, undefined, { sourceCandidateRaw: JSON.stringify(M.initialSourceCandidateStore(NOW)) });
  const unavailable = D.planPermanentDelete(input, { sourceRuntime: {} });
  assert.equal(unavailable.reason, 'source-runtime-unavailable'); assert.equal(unavailable.checkpoint, cp); assert.deepEqual(unavailable.writes, []);
  const exhausted = clone(cp); exhausted.state.revision = Number.MAX_SAFE_INTEGER;
  blocked(request(exhausted), 'revision-overflow');
});

test('D31 earlier Quick same-id history is scrubbed under the existing id-only contract without new generation', () => {
  const older = M.seedState(); older.tasks.find(task => task.id === 'call').memo = 'EARLIER_QUICK_SENTINEL';
  const newer = clone(older); newer.tasks.find(task => task.id === 'call').memo = 'LATER_QUICK_SENTINEL';
  const cp = checkpoint(trash(newer, 'quick', 'call'), older);
  const result = success(request(cp, { kind: 'quick', id: 'call' }));
  assert.equal(result.checkpointRaw.includes('EARLIER_QUICK_SENTINEL'), false);
  assert.equal(result.checkpointRaw.includes('LATER_QUICK_SENTINEL'), false);
  assert.equal(JSON.stringify(result.checkpoint.state).includes('generation'), false);
});

test('D32 conversion event contradicting historical receipt owner blocks instead of deleting neighbor receipt', () => {
  let state = M.seedState();
  state = apply(state, { type: 'convert-quick-item-to-flow', quickItemId: 'call', flowTitle: '독립 Flow', expectedRevision: state.revision });
  const cp = checkpoint(trash(state, 'quick', 'call'), state);
  cp.state.quickConversionReceipts = [];
  cp.state.lastReceipt = { ...cp.state.lastReceipt, flowId: 'memo', title: 'NEIGHBOR_RECEIPT' };
  assert.equal(C.validateCheckpoint(cp).ok, true);
  blocked(request(cp, { kind: 'quick', id: 'call' }), 'delete-scope-unproven');
});

test('D33 one conversion id with conflicting snapshot source Quick owners blocks before scrub', () => {
  let state = M.seedState();
  state = apply(state, { type: 'convert-quick-item-to-flow', quickItemId: 'call', flowTitle: '독립 Flow', expectedRevision: state.revision });
  const cp = checkpoint(trash(state, 'quick', 'call'), state);
  cp.state.quickConversionReceipts[0].sourceQuickItemId = 'meeting';
  assert.equal(C.validateCheckpoint(cp).ok, true);
  blocked(request(cp, { kind: 'quick', id: 'call' }), 'delete-scope-unproven');
});

test('D34 same local converted Flow id with a different tuple cannot prove event ownership', () => {
  let state = M.seedState();
  state = apply(state, { type: 'convert-quick-item-to-flow', quickItemId: 'call', flowTitle: '독립 Flow', expectedRevision: state.revision });
  const cp = checkpoint(trash(state, 'quick', 'call'), state);
  const flow = cp.state.flows.at(-1);
  const oldCopyId = flow.savedCopyId;
  flow.savedCopyId = 'foreign-copy'; flow.ref = 'saved-flow:foreign-copy:' + encodeURIComponent(flow.sourceFlowId);
  cp.state.tasks.filter(task => task.flowId === flow.id).forEach(task => { task.ref = task.ref.replace(encodeURIComponent(oldCopyId), 'foreign-copy'); });
  assert.equal(C.validateCheckpoint(cp).ok, true);
  blocked(request(cp, { kind: 'quick', id: 'call' }), 'delete-scope-unproven');
});
