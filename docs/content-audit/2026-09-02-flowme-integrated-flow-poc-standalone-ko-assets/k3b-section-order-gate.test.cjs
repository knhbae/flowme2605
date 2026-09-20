'use strict';
// Characterization only: PASS records current evidence/gaps, not B2 completion.
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('./model.js');
const P = require('./personal-plan-context.js');
const NOW = '2026-09-05T12:00:00.000Z';
const clone = value => JSON.parse(JSON.stringify(value));
function authored(handoffId = 'b2-gate-handoff') {
  const rawText = '# 준비\n## 같은 구간\n- [ ] 첫 항목\n## 같은 구간\n- [ ] 둘째 항목';
  const handoff = M.makeHandoff(rawText, { draftId: 'b2-gate-draft', handoffId, sourceConfirmed: true, folderId: null });
  const result = M.apply(M.seedState(), { type: 'commit-authoring', handoff, now: NOW });
  assert.equal(result.changed, true, result.error);
  return { state: result.state, flow: result.state.flows.find(flow => flow.handoffId === handoffId), rawText };
}
test('B2G01 standalone personal-draft seed has exact stored outline id but no imported bundle capability proof', () => {
  const state = M.seedState(); const flow = state.flows.find(value => value.id === 'memo');
  assert.equal(flow.ref, 'saved-flow:copy-draft-memo:flow-memo');
  assert.equal(flow.origin, 'personal-draft');
  assert.deepEqual(flow.steps, [{ id: 'outline', title: '실행 순서', itemIds: ['memo-outline', 'memo-share'] }]);
  assert.equal(Object.hasOwn(flow, 'sections'), false);
  assert.equal(Object.hasOwn(flow, 'sectionCapabilities'), false);
  assert.equal(flow.rawText, null);
});
test('B2G02 existing general validator accepts missing/duplicate Step ids, so it is not a section-capability validator', () => {
  for (const variant of ['missing', 'duplicate']) {
    const f = authored();
    if (variant === 'missing') delete f.flow.steps[0].id;
    else f.flow.steps[1].id = f.flow.steps[0].id;
    assert.deepEqual(M.validate(f.state), []);
    const before = JSON.stringify(f.state);
    const projected = M.standaloneAuthoredFlowForSourceUpdate(f.state, f.flow.id);
    assert.ok(projected);
    if (variant === 'missing') assert.equal(projected.sections[0].sectionId, 'step-1');
    else assert.equal(projected.sections[0].sectionId, projected.sections[1].sectionId);
    assert.equal(JSON.stringify(f.state), before);
  }
});
test('B2G03 same titled sections use stored local Step ids while full Flow/Item tuples separate copies', () => {
  const first = authored('b2-gate-copy-a'); const second = authored('b2-gate-copy-b');
  assert.deepEqual(first.flow.steps.map(step => step.title), ['같은 구간', '같은 구간']);
  assert.deepEqual(first.flow.steps.map(step => step.id), ['step-1', 'step-2']);
  assert.deepEqual(second.flow.steps.map(step => step.id), ['step-1', 'step-2']);
  assert.notEqual(first.flow.ref, second.flow.ref);
  const firstRefs = new Set(first.state.tasks.filter(task => task.flowId === first.flow.id).map(task => task.ref));
  assert.equal(second.state.tasks.filter(task => task.flowId === second.flow.id).some(task => firstRefs.has(task.ref)), false);
});
test('B2G04 frozen Plan v1 rejects sectionTitles and orderedItemRefs even when empty without changing input', () => {
  const f = authored(); const opened = P.inspectPlanContext({ state: f.state, flowRef: f.flow.ref }); assert.equal(opened.ok, true, opened.reason);
  for (const extra of [{ sectionTitles: {} }, { orderedItemRefs: [] }, { sectionTitles: { 'step-1': { mode: 'override', value: '개인 구간' } } }]) {
    const before = JSON.stringify(f.state); const draft = { ...clone(opened.draft), ...extra };
    assert.equal(P.normalizePlanDraft(opened.context, draft).ok, false);
    assert.equal(P.planPersonalPlanState({ state: f.state, context: opened.context, draft, now: NOW }).ok, false);
    assert.equal(JSON.stringify(f.state), before);
  }
});
test('B2G05 source candidate new Item exists in the source version but current standalone composition does not append a raw task', () => {
  const f = authored(); const before = JSON.stringify(f.state);
  const prepared = M.prepareLocalSourceCandidateReview(M.initialSourceCandidateStore(NOW), f.state, f.flow.id, { now: NOW, createdAt: NOW, incomingRawText: f.rawText + '\n- [ ] 새 원문 항목' });
  assert.equal(prepared.ok, true, prepared.reason);
  let store = prepared.store;
  for (const change of prepared.candidate.changes) {
    const result = M.resolveLocalSourceCandidateChange(store, { candidateId: prepared.candidate.candidateId, changeId: change.changeId, resolution: 'use-incoming', now: NOW });
    assert.equal(result.changed, true, result.code); store = result.store;
  }
  const applied = M.applyLocalSourceCandidate(store, f.state, f.flow.id, prepared.candidate.candidateId, NOW);
  assert.equal(applied.changed, true, applied.code);
  const version = applied.store.effectiveVersions[f.flow.ref];
  assert.equal(version.projectedFlow.items.length, 3);
  const effective = M.composeSourceCandidateState(f.state, applied.store);
  assert.equal(effective.tasks.filter(task => task.flowId === f.flow.id).length, 2);
  assert.deepEqual(effective.flows.find(flow => flow.id === f.flow.id).steps.map(step => step.itemIds), f.flow.steps.map(step => step.itemIds));
  const bound = P.readPersonalPlanSourceContext({ rawState: f.state, legacyBaseRaw: null, undo: null,
    sourceRead: { ok: true, raw: JSON.stringify(applied.store) }, sourceEpoch: 0 });
  assert.equal(bound.ok, false);
  assert.equal(bound.reason, 'source-membership-not-supported');
  assert.equal(bound.canEdit, false);
  assert.equal(JSON.stringify(f.state), before);
});
