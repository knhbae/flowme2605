'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm');
const M = require('./model.js'), C = require('./workspace-checkpoint.js'), P = require('./personal-plan-context.js');
const PD = require('./personal-plan-display.js'), R = require('./timeline-result-rank.js');
const DATE = '2026-09-05', NOW = DATE + 'T15:00:00.000Z';
const copy = value => JSON.parse(JSON.stringify(value)), bytes = value => JSON.stringify(value);
function fixture({ repeat = false, sourceUpdate = false, seed = false, duplicate = false } = {}) {
  let state = M.seedState(), flow;
  const raw = '# 계획\n앞선 원문 메모\n## A\n- [ ] A1\n  - 날짜: 2026-09-05\n  - 시간: 10:00\n'
    + (repeat ? '  - 반복: 매일\n  - 반복 종료: 3회\n' : '')
    + '- [ ] A2\n  - 날짜: 2026-09-05\n  - 시간: 08:00\n## B\n- [ ] B1\n  - 날짜: 2026-09-05\n  - 시간: 09:00';
  if (seed) {
    flow = state.flows[0];
    if (duplicate) {
      const ids = flow.steps[0].itemIds;
      flow.steps = [{ id: 'same', title: '동명', itemIds: [ids[0]] }, { id: 'same', title: '동명', itemIds: [ids[1]] }];
    }
  } else {
    for (const suffix of ['main', 'other']) {
      const handoff = M.makeHandoff(raw, { draftId: 'result-structure-' + suffix, handoffId: 'result-handoff-' + suffix, sourceConfirmed: true, folderId: null });
      const result = M.apply(state, { type: 'commit-authoring', handoff, now: NOW }); assert.equal(result.changed, true, result.error); state = result.state;
      if (suffix === 'main') flow = state.flows.find(f => f.handoffId === handoff.handoffId);
    }
  }
  state.future = { exact: '  \r\n🙂\t ', order: ['z', 'a'], values: [0, false, null] };
  let store = M.initialSourceCandidateStore(NOW);
  if (sourceUpdate) {
    const prepared = M.prepareLocalSourceCandidateReview(store, state, flow.id, { now: NOW, createdAt: NOW, incomingRawText: raw.replace('## A', '## 새 A') });
    assert.equal(prepared.ok, true, prepared.reason); store = prepared.store;
    for (const change of prepared.candidate.changes) {
      const resolved = M.resolveLocalSourceCandidateChange(store, { candidateId: prepared.candidate.candidateId, changeId: change.changeId, resolution: 'use-incoming', now: NOW });
      assert.equal(resolved.changed, true, resolved.code); store = resolved.store;
    }
    const applied = M.applyLocalSourceCandidate(store, state, flow.id, prepared.candidate.candidateId, NOW); assert.equal(applied.changed, true, applied.code); store = applied.store;
  }
  const packet = C.fromLegacy(' \r\n' + bytes({ version: 1, state, undo: null }) + '\n'); assert.equal(packet.ok, true, packet.reason);
  return { checkpoint: packet.checkpoint, sourceRead: { ok: true, raw: sourceUpdate ? bytes(store) : null }, sourceEpoch: 3, flowRef: flow.ref, flowId: flow.id, raw };
}
function changed(f, mutate) {
  const opened = C.inspectSourceBoundPersonalPlanStructureContext(f.checkpoint, { flowRef: f.flowRef, sourceRead: f.sourceRead, sourceEpoch: f.sourceEpoch });
  assert.equal(opened.ok, true, opened.reason); const draft = copy(opened.draft);
  (mutate || (d => { d.sectionTitles['step-1'] = { mode: 'override', value: '내 A' }; d.orderedItemRefs = [d.orderedItemRefs[0], d.orderedItemRefs[2], d.orderedItemRefs[1]]; }))(draft);
  const result = C.transitionCheckpoint(f.checkpoint, { type: 'commit-source-bound-personal-plan-structure-context', context: opened.context,
    draft, sourceRead: f.sourceRead, sourceEpoch: f.sourceEpoch, now: NOW }); assert.equal(result.changed, true, result.reason);
  return { ...f, checkpoint: result.checkpoint };
}
function read(f) {
  const input = { checkpoint: f.checkpoint, sourceRead: f.sourceRead, sourceEpoch: f.sourceEpoch };
  const display = PD.projectPersonalPlanDisplay(input), structure = PD.projectPersonalPlanStructureDisplay({ ...input, flowRef: f.flowRef });
  assert.equal(display.ok, true, display.reason); assert.equal(structure.ok, true, structure.reason);
  return { state: display.state, structure: structure.structure };
}
function project(f, extra = {}, api = M) {
  const before = bytes(f), r = read(f), inputs = bytes(r);
  const result = api.resultProjection(r.state, f.flowId, { baseDate: DATE, selectedDate: DATE, personalPlanStructureView: r.structure, ...extra });
  assert.ok(result, 'valid structure result must exist'); assert.equal(bytes(f), before); assert.equal(bytes(r), inputs); return result;
}
function loadM(code = fs.readFileSync(require.resolve('./model.js'), 'utf8')) {
  const sandbox = {
    FlowMePersonalWorkspaceLosslessAuthoring: require('./lossless-authoring-runtime.cjs').loadCommonJs(),
    FlowMePersonalWorkspacePocValidationExamples: require('./validation-examples-runtime.cjs').loadCommonJs(),
    FlowMePersonalWorkspaceStructureTemplate: require('./structure-template-runtime.cjs').loadCommonJs(),
    FlowMePersonalWorkspaceSourceUpdate: require('./source-update-runtime.cjs').loadCommonJs(),
  };
  for (const name of ['localStorage', 'document', 'fetch']) Object.defineProperty(sandbox, name, { get() { throw Error('forbidden ambient ' + name); } });
  vm.runInNewContext(code, sandbox); return sandbox.FlowMeIntegratedPoc;
}

test('R01 actual PD structure aligns linear Text Todo Sheet TXT manifests without changing source membership', () => {
  const f = fixture(), saved = changed(f), result = project(saved), r = read(saved);
  assert.deepEqual(result.sourceItemRefs, r.structure.orderedItemRefs); assert.deepEqual(result.items.map(item => item.title), ['A1', 'B1', 'A2']);
  assert.deepEqual(result.items.map(item => item.sectionTitle), ['내 A', 'B', '내 A']);
  assert.deepEqual(result.items.map(item => item.sourcePlanOrder), [0, 2, 1]); assert.deepEqual(result.items.map(item => item.planOrder), [0, 1, 2]);
  assert.deepEqual(result.todo, result.rowIds); assert.deepEqual(result.sheet.map(row => row.itemRef), result.rowIds);
  assert.deepEqual(result.sheet.map(row => row.sectionTitle), ['내 A', 'B', '내 A']);
  assert.deepEqual(result.textLines.filter(line => line.startsWith('## ')), ['## 내 A', '## B', '## 내 A']);
  assert.deepEqual(result.txt.split('\n').filter(line => ['[내 A]', '[B]'].includes(line)), ['[내 A]', '[B]', '[내 A]']);
  for (const key of ['flows', 'tasks', 'future', 'orders', 'timelineContextV1']) assert.deepEqual(saved.checkpoint.state[key], f.checkpoint.state[key]);
  for (const slot of Object.values(result.slots)) assert.deepEqual(slot.itemRefs, result.itemRefs);
});

test('R02 same-title readonly null section IDs remain separate display runs with original Step IDs untouched', () => {
  const f = fixture({ seed: true, duplicate: true }), r = read(f), result = project(f);
  assert.deepEqual(r.structure.sections.map(section => section.sectionId), [null, null]);
  assert.equal(result.txt.split('\n').filter(line => line === '[동명]').length, 2);
  assert.equal(new Set(result.items.map(item => item.sectionGroupKey)).size, 2);
  assert.ok(result.items.every(item => item.stepId === 'same'));
  assert.deepEqual(result.sourceItemRefs, r.structure.orderedItemRefs);
});

test('R03 supplied foreign missing duplicate order and stale section bindings fail as a whole', () => {
  const f = changed(fixture()), r = read(f), before = bytes(r);
  const other = r.state.flows.find(flow => flow.id !== f.flowId && flow.origin === 'authoring-handoff');
  for (const mutate of [v => { v.flowRef = other.ref; }, v => { v.orderedItemRefs.pop(); },
    v => { v.orderedItemRefs[1] = v.orderedItemRefs[0]; }, v => { v.orderedItemRefs[1] = 'flow-item:foreign'; },
    v => { v.sections[1].sourceOrder = 0; }, v => { v.sections[0].itemRefs.reverse(); },
    v => { v.sections[0].sourceTitle += 'old'; }, v => { v.sections[0].sectionId = 'foreign'; }]) {
    const bad = copy(r.structure); mutate(bad); assert.equal(M.resultProjection(r.state, f.flowId, { personalPlanStructureView: bad }), null);
  }
  assert.equal(bytes(r), before);
});

test('R04 supplied invalid options and unsafe descriptors never run getters or use the legacy fallback', () => {
  const f = fixture(), r = read(f); let getters = 0;
  for (const value of [null, undefined, true, {}, { ...r.structure, unknown: true }]) assert.equal(M.resultProjection(r.state, f.flowId, { personalPlanStructureView: value }), null);
  const options = {}; Object.defineProperty(options, 'personalPlanStructureView', { enumerable: true, get() { getters++; return r.structure; } });
  assert.equal(M.resultProjection(r.state, f.flowId, options), null);
  for (const mutate of [v => Object.defineProperty(v, 'orderedItemRefs', { enumerable: true, get() { getters++; return []; } }),
    v => { v.orderedItemRefs.toJSON = () => { getters++; return []; }; },
    v => { Object.setPrototypeOf(v.sections, Object.assign(Object.create(Array.prototype), { toJSON() { getters++; return []; } })); },
    v => { delete v.sections[0]; }, v => { v[Symbol('hidden')] = true; }]) {
    const value = copy(r.structure); mutate(value); assert.equal(M.resultProjection(r.state, f.flowId, { personalPlanStructureView: value }), null);
  }
  assert.equal(getters, 0); assert.ok(M.resultProjection(r.state, f.flowId));
});

test('R05 actual PD rejects current Undo and source failures; invalid supplied result option never renders a fallback', () => {
  const base = fixture(), f = changed(base), r = read(f);
  for (const sourceRead of [{ ok: false, reason: 'read-error' }, { ok: false, reason: 'unavailable' }, { ok: true, raw: '{' }]) {
    const failed = PD.projectPersonalPlanStructureDisplay({ checkpoint: f.checkpoint, sourceRead, sourceEpoch: 4, flowRef: f.flowRef });
    assert.equal(failed.ok, false); assert.equal(M.resultProjection(r.state, f.flowId, { personalPlanStructureView: failed.structure }), null);
  }
  const undoOnly = { ...base.checkpoint, undo: copy(f.checkpoint.state) };
  assert.equal(PD.projectPersonalPlanStructureDisplay({ checkpoint: undoOnly, sourceRead: { ok: false, reason: 'read-error' }, sourceEpoch: 5, flowRef: f.flowRef }).ok, false);
  const corrupt = copy(f.checkpoint); corrupt.undo = copy(f.checkpoint.state); corrupt.undo[P.METADATA_KEY].entries[f.flowRef].structure.orderedItemRefs.pop();
  assert.equal(PD.projectPersonalPlanStructureDisplay({ checkpoint: corrupt, sourceRead: f.sourceRead, sourceEpoch: 3, flowRef: f.flowRef }).ok, false);
  const corruptCurrent = copy(f.checkpoint); corruptCurrent.state[P.METADATA_KEY].entries[f.flowRef].structure.orderedItemRefs.pop();
  assert.equal(PD.projectPersonalPlanStructureDisplay({ checkpoint: corruptCurrent, sourceRead: f.sourceRead, sourceEpoch: 3, flowRef: f.flowRef }).ok, false);
});

test('R06 explicit timeline rank wins over personal Plan order while unavailable rank retains new Plan fallback', () => {
  const f = changed(fixture()), r = read(f), byTitle = Object.fromEntries(r.state.tasks.filter(t => t.flowId === f.flowId).map(t => [t.title, t.id]));
  const rank = ['A2', 'B1', 'A1'].map(title => byTitle[title]);
  const result = project(f, { timelineRankResolver: ({ id, date }) => ({ order: rank.indexOf(id), key: 'date:' + date, manual: true }) });
  assert.deepEqual(result.items.map(item => item.title), ['A1', 'B1', 'A2']); assert.deepEqual(result.calendar.selectedItems.map(item => item.title), ['A2', 'B1', 'A1']);
  for (const timelineRankResolver of [null, () => null, () => { throw Error('rank'); }, () => ({ order: 0, key: 'foreign', manual: true })]) {
    const fallback = project(f, { timelineRankResolver }); assert.deepEqual(fallback.calendar.selectedItems.map(item => item.title), ['A1', 'B1', 'A2']);
    assert.ok(fallback.timelineOrderFallbacks.some(entry => entry.reason === 'incomplete-source-task-membership'));
  }
  const actual = R.createResolver(f.checkpoint); assert.equal(actual.ok, true);
  const ranked = project(f, { timelineRankResolver: actual.resolve });
  assert.deepEqual(ranked.calendar.selectedItems.map(item => item.title), ['A2', 'B1', 'A1']);
});

test('R07 repeat occurrence identity and completion survive personal reorder and date-local Plan fallback', () => {
  const base = fixture({ repeat: true }), original = project(base), f = changed(base), result = project(f, { timelineRankResolver: () => ({ order: 999, key: 'date:' + DATE, manual: true }) });
  const facts = rows => Object.fromEntries(rows.map(row => [row.rowId, [row.sourceItemRef, row.occurrenceId, row.originalDate, row.executionDate, row.completed, row.completedAt]]));
  assert.deepEqual(facts(result.items), facts(original.items)); assert.equal(result.occurrenceIds.length, 3);
  assert.deepEqual(result.items.map(item => item.title), ['A1', 'A1', 'A1', 'B1', 'A2']);
  assert.deepEqual(result.calendar.selectedItems.map(item => item.title), ['A1', 'B1', 'A2']);
  assert.ok(result.timelineOrderFallbacks.some(entry => entry.contextKey === 'date:' + DATE && entry.reason === 'recurrence-order-out-of-scope'));
  assert.deepEqual(result.sheet.map(row => row.rowId), result.rowIds);
});

test('R08 source B explicit personal A and reset Undo retain exact raw source and correct aliases', () => {
  const f = fixture({ sourceUpdate: true }), saved = changed(f, d => { d.sectionTitles['step-1'] = { mode: 'override', value: 'A' }; d.orderedItemRefs.reverse(); });
  const result = project(saved); assert.equal(result.items.find(item => item.title === 'A1').sectionTitle, 'A');
  assert.deepEqual(result.items.map(item => item.title), ['B1', 'A2', 'A1']);
  const refs = read(f).structure.orderedItemRefs;
  const reset = changed(saved, d => { d.sectionTitles['step-1'] = { mode: 'inherit' }; d.orderedItemRefs = refs.slice(); });
  assert.equal(project(reset).items[0].sectionTitle, '새 A'); assert.deepEqual(project(reset).sourceItemRefs, refs);
  const undone = C.undoCheckpoint(reset.checkpoint); assert.equal(undone.changed, true);
  assert.deepEqual(project({ ...f, checkpoint: undone.checkpoint }).sourceItemRefs, result.sourceItemRefs);
  assert.equal(project(saved).workingSource.rawText, project(f).workingSource.rawText);
});

test('R09 raw and null WorkingSource plus authoring preview remain exact while result Text uses personal order', () => {
  for (const seed of [false, true]) {
    const f = fixture({ seed }), saved = changed(f, d => { d.orderedItemRefs.reverse(); }); const r = read(saved);
    const plain = M.resultProjection(r.state, f.flowId), personal = project(saved);
    assert.deepEqual(personal.workingSource, plain.workingSource);
    assert.deepEqual(personal.sourceItemRefs, r.structure.orderedItemRefs);
    assert.equal(bytes(M.authoringResultProjection(f.raw, { personalPlanStructureView: r.structure })), bytes(M.authoringResultProjection(f.raw)));
  }
});

test('R10 real UMD and CJS share personal result byte payloads without ambient or P/C dependencies', () => {
  const f = changed(fixture()), result = project(f), umd = project(f, {}, loadM());
  assert.equal(bytes(umd), bytes(result)); assert.equal(result.txt, result.downloads.txt.payload);
  assert.deepEqual(result.sheet.map(row => row.sectionTitle), ['내 A', 'B', '내 A']);
  assert.ok(result.downloads.csv.payload.startsWith('\uFEFF')); assert.ok(result.downloads.csv.payload.endsWith('\r\n'));
  assert.ok(result.downloads.csv.payload.includes('"내 A"')); assert.equal(result.txt.endsWith('\n\n'), false);
  const legacy = loadM(fs.readFileSync(require('node:path').resolve(__dirname, '../../../output/poc-gap-implementation/k3b/before-structure-result-read-20260905-01/model.js'), 'utf8'));
  const r = read(f);
  assert.equal(bytes(M.resultProjection(r.state, f.flowId)), bytes(legacy.resultProjection(r.state, f.flowId)));
});
