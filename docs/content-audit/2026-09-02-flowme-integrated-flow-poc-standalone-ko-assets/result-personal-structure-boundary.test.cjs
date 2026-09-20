'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), vm = require('node:vm');
const M = require('./model.js'), C = require('./workspace-checkpoint.js'), PD = require('./personal-plan-display.js');
const copy = value => JSON.parse(JSON.stringify(value)), bytes = value => JSON.stringify(value);
const NOW = '2026-09-05T15:00:00.000Z', DATE = '2026-09-05';
function fixture(raw = '# 경계\n## A\n- [ ] 하나\n## B\n- [ ] 둘', seedState) {
  let state = seedState || M.seedState(), flow = seedState && seedState.flows[0];
  if (!seedState) {
    const handoff = M.makeHandoff(raw, { draftId: 'result-boundary', handoffId: 'result-boundary', sourceConfirmed: true, folderId: null });
    const committed = M.apply(state, { type: 'commit-authoring', handoff, now: NOW }); assert.equal(committed.changed, true, committed.error);
    state = committed.state; flow = state.flows.find(entry => entry.handoffId === 'result-boundary');
  }
  const packet = C.fromLegacy(bytes({ version: 1, state, undo: null })); assert.equal(packet.ok, true, packet.reason);
  return { checkpoint: packet.checkpoint, flowRef: flow.ref, flowId: flow.id, sourceRead: { ok: true, raw: null }, sourceEpoch: 0 };
}
function read(f) {
  const input = { checkpoint: f.checkpoint, sourceRead: f.sourceRead, sourceEpoch: f.sourceEpoch };
  const display = PD.projectPersonalPlanDisplay(input), structure = PD.projectPersonalPlanStructureDisplay({ ...input, flowRef: f.flowRef });
  assert.equal(display.ok, true, display.reason); assert.equal(structure.ok, true, structure.reason);
  return { state: display.state, structure: structure.structure };
}
function result(f, r = read(f)) {
  return M.resultProjection(r.state, f.flowId, { baseDate: DATE, selectedDate: DATE, personalPlanStructureView: r.structure });
}

test('R11 full source refs are required even when a forged view repeats an invalid local or cross-copy value', () => {
  const f = fixture(), original = read(f);
  for (const value of ['local-task', 'flow-item:foreign:foreign:item', 'flow-item:a:b:%']) {
    const r = copy(original), old = r.structure.orderedItemRefs[0];
    r.state.tasks.find(task => task.ref === old).ref = value;
    r.structure.orderedItemRefs[0] = value; r.structure.sections[0].itemRefs[0] = value;
    assert.equal(result(f, r), null);
  }
  const missing = copy(original); delete missing.state.tasks.find(task => task.ref === missing.structure.orderedItemRefs[0]).ref;
  assert.equal(result(f, missing), null);
  assert.ok(M.resultProjection(missing.state, f.flowId), 'option-absent historical fallback is unchanged');
});

test('R12 a duplicated raw section ID cannot be made uniquely editable by changing only one display section', () => {
  const state = M.seedState(), flow = state.flows[0], ids = flow.steps[0].itemIds;
  flow.steps = [{ id: 'same', title: '동명', itemIds: [ids[0]] }, { id: 'same', title: '동명', itemIds: [ids[1]] }];
  const f = fixture(undefined, state), r = read(f); assert.ok(result(f, r));
  const bad = copy(r); Object.assign(bad.structure.sections[0], { sectionId: 'same', editCapability: 'poc-shadow', title: '거짓 이름' });
  assert.equal(result(f, bad), null);
});

test('R13 descriptor-safe shape rejects nested accessors cycles hidden fields and custom prototypes without evaluating them', () => {
  const f = fixture(), original = read(f); let calls = 0;
  for (const mutate of [v => Object.defineProperty(v.sections[0].itemRefs, '0', { enumerable: true, get() { calls++; return 'fake'; } }),
    v => { Object.defineProperty(v.sections[0], 'hidden', { value: 'hidden' }); },
    v => { v.sections[0].itemRefs.push(v); },
    v => { Object.setPrototypeOf(v.sections[0], { get toJSON() { calls++; return () => ({}); } }); },
    v => { v.sections[0].title = undefined; }]) {
    const r = { state: original.state, structure: copy(original.structure) }; mutate(r.structure); assert.equal(result(f, r), null);
  }
  assert.equal(calls, 0);
  const foreign = vm.runInNewContext('JSON.parse(payload)', { payload: bytes(original.structure) });
  assert.ok(result(f, { state: original.state, structure: foreign }));
});

test('R14 existing recurrence completion and moved occurrence facts remain exact through personal structure reads', () => {
  let f = fixture('# 반복\n## A\n- [ ] 매일\n  - 날짜: 2026-09-05\n  - 시간: 09:30\n  - 반복: 매일\n  - 반복 종료: 3회\n## B\n- [ ] 별도');
  const selected = result(f).items[1];
  for (const action of [{ type: 'move-occurrence-date', date: '2026-09-10' }, { type: 'complete-occurrence', done: true, completedAt: NOW }]) {
    const changed = C.transitionCheckpoint(f.checkpoint, { ...action, sourceItemRef: selected.sourceItemRef, occurrenceId: selected.occurrenceId, originalDate: selected.originalDate, now: NOW });
    assert.equal(changed.changed, true, changed.reason); f = { ...f, checkpoint: changed.checkpoint };
  }
  const opened = C.inspectSourceBoundPersonalPlanStructureContext(f.checkpoint, { flowRef: f.flowRef, sourceRead: f.sourceRead, sourceEpoch: f.sourceEpoch }); assert.equal(opened.ok, true, opened.reason);
  const draft = copy(opened.draft); draft.orderedItemRefs.reverse();
  const saved = C.transitionCheckpoint(f.checkpoint, { type: 'commit-source-bound-personal-plan-structure-context', context: opened.context, draft, sourceRead: f.sourceRead, sourceEpoch: f.sourceEpoch, now: NOW });
  assert.equal(saved.changed, true, saved.reason);
  const before = bytes(saved.checkpoint), actual = result({ ...f, checkpoint: saved.checkpoint });
  const row = actual.items.find(item => item.occurrenceId === selected.occurrenceId);
  assert.equal(row.completed, true); assert.equal(row.completedAt, NOW); assert.equal(row.executionDate, '2026-09-10'); assert.equal(row.time, '09:30');
  assert.deepEqual(saved.checkpoint.state.occurrenceOverrides, f.checkpoint.state.occurrenceOverrides);
  assert.equal(bytes(saved.checkpoint), before);
  assert.equal(actual.items[0].title, '별도');
});

test('R15 four legacy origins preserve fullref manifest and WorkingSource when the read-only structure is supplied', () => {
  const f = fixture(undefined, M.seedState()), before = bytes(f.checkpoint); let origins = 0;
  for (const flow of f.checkpoint.state.flows) {
    const selected = { ...f, flowRef: flow.ref, flowId: flow.id }, r = read(selected);
    const historical = M.resultProjection(r.state, flow.id, { baseDate: DATE, selectedDate: DATE }), actual = result(selected, r);
    assert.ok(actual); assert.deepEqual(actual.sourceItemRefs, historical.sourceItemRefs); assert.deepEqual(actual.workingSource, historical.workingSource);
    assert.deepEqual(actual.items.map(row => [row.stepId, row.planOrder, row.sourcePlanOrder]), historical.items.map(row => [row.stepId, row.planOrder, row.sourcePlanOrder]));
    origins++;
  }
  assert.equal(origins, 4); assert.equal(bytes(f.checkpoint), before);
});

test('R16 empty source sections and prose stay in WorkingSource while frozen or position-remapped views stay read-only', () => {
  const raw = '# 원문\r\n자유 메모\r\n## 빈 구간\r\n## A\r\n- [ ] 하나\r\n## B\r\n- [ ] 둘';
  const f = fixture(raw), r = read(f), before = bytes(r);
  const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
  freeze(r.state); const actual = result(f, r); assert.ok(actual); assert.equal(actual.workingSource.rawText, raw);
  const reordered = { state: r.state, structure: copy(r.structure) }; reordered.structure.sections.reverse();
  assert.equal(bytes(result(f, reordered)), bytes(actual)); assert.equal(bytes(r), before);
});

function personalAliasFixture() {
  const f = fixture(), opened = C.inspectSourceBoundPersonalPlanStructureContext(f.checkpoint,
    { flowRef: f.flowRef, sourceRead: f.sourceRead, sourceEpoch: f.sourceEpoch });
  assert.equal(opened.ok, true, opened.reason);
  const draft = copy(opened.draft); draft.sectionTitles['step-1'] = { mode: 'override', value: '내 구간' };
  const saved = C.transitionCheckpoint(f.checkpoint, { type: 'commit-source-bound-personal-plan-structure-context', context: opened.context,
    draft, sourceRead: f.sourceRead, sourceEpoch: f.sourceEpoch, now: NOW });
  assert.equal(saved.changed, true, saved.reason);
  return { ...f, checkpoint: saved.checkpoint };
}

test('R17 actual P owner-capability pairs cannot be changed independently on the display DTO', () => {
  const f = personalAliasFixture(), original = read(f), section = original.structure.sections[0];
  assert.equal(section.titleOwner, 'authoring'); assert.equal(section.editCapability, 'poc-shadow'); assert.equal(section.title, '내 구간');
  for (const titleOwner of ['source', 'unproven']) {
    const bad = copy(original); bad.structure.sections[0].titleOwner = titleOwner;
    assert.equal(result(f, bad), null);
  }
  const noAlias = fixture(), readonly = read(noAlias); readonly.structure = copy(readonly.structure);
  readonly.structure.sections[0].editCapability = 'readonly';
  assert.equal(result(noAlias, readonly), null, 'P cannot emit readonly + authoring, even without an alias');
});

test('R18 explicit display aliases obey existing P trim-exact nonblank values without normalizing inherited source titles', () => {
  const f = personalAliasFixture(), original = read(f);
  for (const title of ['', ' ', ' 앞 공백', '뒤 공백 ', '\t내 구간\r\n']) {
    const bad = copy(original); bad.structure.sections[0].title = title; assert.equal(result(f, bad), null);
  }
  const state = M.seedState(); state.flows[0].steps[0].title = '  이전 원문 구간  ';
  const legacy = fixture(undefined, state), actual = result(legacy);
  assert.ok(actual); assert.equal(actual.items[0].sectionTitle, '  이전 원문 구간  ');
});
