'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const M = require('./model.js'), P = require('./personal-plan-context.js'), C = require('./workspace-checkpoint.js');
const PD = require('./personal-plan-display.js');
const NOW = '2026-09-05T14:50:00.000Z';
const copy = value => JSON.parse(JSON.stringify(value));
function fixture() {
  const handoff = M.makeHandoff('# 개인 계획\n## A\n- [ ] A1\n- [ ] A2\n## B\n- [ ] B1',
    { draftId: 'structure-display', handoffId: 'structure-display-handoff', sourceConfirmed: true, folderId: null });
  const made = M.apply(M.seedState(), { type: 'commit-authoring', handoff, now: NOW });
  assert.equal(made.changed, true);
  const packet = C.fromLegacy(JSON.stringify({ version: 1, state: made.state, undo: null }));
  assert.equal(packet.ok, true);
  return { checkpoint: packet.checkpoint, flowRef: made.state.flows.find(flow => flow.handoffId === handoff.handoffId).ref,
    sourceRead: { ok: true, raw: null }, sourceEpoch: 3 };
}
function changed(f, modify) {
  const opened = C.inspectSourceBoundPersonalPlanStructureContext(f.checkpoint, { flowRef: f.flowRef, sourceRead: f.sourceRead, sourceEpoch: f.sourceEpoch });
  assert.equal(opened.ok, true, opened.reason);
  const draft = copy(opened.draft);
  (modify || (draft => { draft.sectionTitles['step-1'] = { mode: 'override', value: '내 A' };
    draft.orderedItemRefs = [draft.orderedItemRefs[0], draft.orderedItemRefs[2], draft.orderedItemRefs[1]]; }))(draft);
  const result = C.transitionCheckpoint(f.checkpoint, { type: 'commit-source-bound-personal-plan-structure-context',
    context: opened.context, draft, sourceRead: f.sourceRead, sourceEpoch: f.sourceEpoch, now: NOW });
  assert.equal(result.changed, true, result.reason);
  return { ...f, checkpoint: result.checkpoint };
}
function read(f, api = PD) {
  assert.equal(typeof api.projectPersonalPlanStructureDisplay, 'function');
  const before = JSON.stringify(f), result = api.projectPersonalPlanStructureDisplay(f);
  assert.equal(JSON.stringify(f), before);
  assert.equal(result.scope, 'structure-display-only');
  for (const name of ['context', 'sourceContext', 'candidate', 'checkpoint', 'capabilities', 'state']) assert.equal(Object.hasOwn(result, name), false);
  if (!result.ok) assert.equal(Object.hasOwn(result, 'structure'), false);
  return result;
}
test('B2PD01 no-P actual authored structure is detached frozen and causes no metadata migration', () => {
  const f = fixture(), result = read(f); assert.equal(result.ok, true, result.reason);
  assert.equal(Object.hasOwn(f.checkpoint.state, P.METADATA_KEY), false);
  assert.equal(result.structure.flowRef, f.flowRef); assert.equal(result.structure.viewOnly, true);
  assert.deepEqual(result.structure.sections.map(section => section.title), ['A', 'B']);
  assert.ok(Object.isFrozen(result.structure.sections[0].itemRefs)); assert.ok(Object.isFrozen(result));
});
test('B2PD02 alias and cross-section full permutation preserve raw arrays and original membership', () => {
  const f = fixture(), before = read(f), after = changed(f), result = read(after); assert.equal(result.ok, true, result.reason);
  const refs = before.structure.orderedItemRefs;
  assert.deepEqual(result.structure.orderedItemRefs, [refs[0], refs[2], refs[1]]);
  assert.equal(result.structure.sections[0].sourceTitle, 'A'); assert.equal(result.structure.sections[0].title, '내 A');
  assert.deepEqual(result.structure.sections.map(section => section.itemRefs), before.structure.sections.map(section => section.itemRefs));
  assert.deepEqual(after.checkpoint.state.tasks, f.checkpoint.state.tasks); assert.deepEqual(after.checkpoint.state.flows, f.checkpoint.state.flows);
});
test('B2PD03 actual C Undo restores the prior view and read failure cannot skip reachable personal Undo', () => {
  const f = fixture(), after = changed(f), undone = C.undoCheckpoint(after.checkpoint);
  assert.equal(undone.changed, true); assert.deepEqual(read({ ...f, checkpoint: undone.checkpoint }).structure, read(f).structure);
  const undoOnly = { ...f, checkpoint: { ...copy(f.checkpoint), undo: copy(after.checkpoint.state) } };
  assert.equal(read(undoOnly).ok, true);
  const blocked = read({ ...undoOnly, sourceRead: { ok: false, reason: 'read-error' } }); assert.equal(blocked.ok, false);
});
test('B2PD04 readonly origins get separate section rows without granting edit or writer authority', () => {
  const f = fixture();
  for (const flow of f.checkpoint.state.flows.filter(flow => flow.origin !== 'authoring-handoff')) {
    const result = read({ ...f, flowRef: flow.ref }); assert.equal(result.ok, true, result.reason);
    assert.ok(result.structure.sections.every(section => section.editCapability === 'readonly'));
    assert.equal(result.structure.orderedItemRefs.length, flow.steps.flatMap(step => step.itemIds).length);
  }
});
test('B2PD05 exact unknown/getter/foreign Flow and malformed current metadata fail without a structure fallback', () => {
  const f = changed(fixture());
  assert.equal(read({ ...f, unexpected: true }).ok, false); assert.equal(read({ ...f, flowRef: 'foreign' }).ok, false);
  const corrupt = copy(f); corrupt.checkpoint.state[P.METADATA_KEY].entries[f.flowRef].structure.orderedItemRefs.pop();
  assert.equal(read(corrupt).ok, false);
  let getters = 0; const hostile = { ...f };
  Object.defineProperty(hostile, 'flowRef', { enumerable: true, get() { getters += 1; throw new Error('getter'); } });
  assert.equal(PD.projectPersonalPlanStructureDisplay(hostile).ok, false); assert.equal(getters, 0);
});
test('B2PD06 source errors and corrupt source bytes cannot create a source-empty view', () => {
  for (const f of [fixture(), changed(fixture())]) for (const sourceRead of [{ ok: false, reason: 'read-error' },
    { ok: false, reason: 'unavailable' }, { ok: true, raw: '{' }]) assert.equal(read({ ...f, sourceRead }).ok, false);
});
test('B2PD07 core-only v1 and explicit order reset keep existing personal display ABI exact', () => {
  const f = fixture(), core = changed(f, draft => { draft.title = { mode: 'override', value: '개인 제목' }; });
  assert.equal(core.checkpoint.state[P.METADATA_KEY].version, 1); assert.equal(read(core).ok, true);
  const withOrder = changed(core), refs = read(f).structure.orderedItemRefs;
  const reset = changed(withOrder, draft => { draft.sectionTitles['step-1'] = { mode: 'inherit' }; draft.orderedItemRefs = refs.slice(); });
  assert.deepEqual(read(reset).structure, read(f).structure);
  const display = PD.projectPersonalPlanDisplay({ checkpoint: reset.checkpoint, sourceRead: reset.sourceRead, sourceEpoch: reset.sourceEpoch });
  assert.equal(display.ok, true); assert.equal(display.scope, 'display-only'); assert.equal(PD.VERSION, 1);
  assert.equal(display.state.flows.find(flow => flow.ref === f.flowRef).title, '개인 제목');
});
test('B2PD08 actual UMD issues no editor token and calls no inspector planner or ambient storage', () => {
  let calls = 0;
  const forbidden = () => { calls += 1; throw new Error('forbidden'); };
  const load = personalPlan => {
    const sandbox = { FlowMeIntegratedPoc: M, FlowPocWorkspaceCheckpoint: C, FlowPocPersonalPlanContext: personalPlan };
    for (const key of ['localStorage', 'window', 'document', 'fetch']) Object.defineProperty(sandbox, key, { get: forbidden });
    vm.runInNewContext(fs.readFileSync(require.resolve('./personal-plan-display.js'), 'utf8'), sandbox);
    return sandbox.FlowPocPersonalPlanDisplay;
  };
  const api = load({ ...P, inspectPersonalPlanStructureEditor: forbidden, inspectPersonalPlanSourceEditor: forbidden,
    planPersonalPlanStructureState: forbidden, planPersonalPlanSourceState: forbidden });
  assert.equal(read(changed(fixture()), api).ok, true); assert.equal(calls, 0);
  assert.equal(read(fixture(), load({ ...P, readPersonalPlanStructureView: null })).ok, false); assert.equal(calls, 0);
});
