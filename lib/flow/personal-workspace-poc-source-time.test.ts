import assert from 'node:assert/strict';
import test from 'node:test';
import { materializePersonalWorkspacePocAuthoring } from './personal-workspace-poc-authoring';
import { composePersonalWorkspacePocReadModel } from './personal-workspace-poc-composition';
import { getPersonalWorkspacePocEffectiveSourceFlow } from './personal-workspace-poc-canonical-ownership';
import {
  PERSONAL_WORKSPACE_POC_VERSION,
  type PersonalWorkspacePocAuthoredFlow,
  type PersonalWorkspacePocReadModel,
  type PersonalWorkspacePocState,
} from './personal-workspace-poc-contract';
import { buildPersonalWorkspacePocResultProjection } from './personal-workspace-poc-result-projection';
import { buildPersonalWorkspacePocSourceReadIndex, type PersonalWorkspacePocSourceReadIndex } from './personal-workspace-poc-source-attributes';
import { createPersonalWorkspacePocState, isPersonalWorkspacePocState } from './personal-workspace-poc-state';
import { buildPersonalWorkspacePocTaskGroups, buildPersonalWorkspacePocTasks } from './personal-workspace-poc-view-model';
import {
  applyPersonalWorkspacePocSourceCandidate, createPersonalWorkspacePocLocalFixtureEnvelope,
  createPersonalWorkspacePocSourceCandidateStore, resolvePersonalWorkspacePocSourceCandidateChange,
  stagePersonalWorkspacePocSourceCandidate,
} from './personal-workspace-poc-source-candidates';

// K3-B B0-T: actual requirements remain RED until a verified source reader is
// connected. These pure probes neither persist nor claim browser coverage.
const NOW = '2026-09-05T00:00:00.000Z';
const TODAY = '2026-09-05';
const DEFAULT_SOURCE = '# 시간 검사\r\n## 준비\r\n- [ ] 접수\r\n  - 날짜: 2026-09-05\r\n  - 시간: 09:30';

function authored(handoffId = 'k3b-time-first', rawText = DEFAULT_SOURCE) {
  const made = materializePersonalWorkspacePocAuthoring({
    handoffId, documentId: `${handoffId}-document`, revisionId: `${handoffId}-revision`, rawText, committedAt: NOW,
  });
  assert.ok(made.ok, 'fixture must pass the actual authoring materializer');
  return made.flow;
}

function fixture(flows = [authored()]) {
  const state = createPersonalWorkspacePocState(NOW);
  state.authoredFlows = flows;
  state.authoringReceipts = flows.map(flow => ({ handoffId: flow.authoring.handoffId, flowRef: flow.ref, committedAt: NOW }));
  assert.ok(isPersonalWorkspacePocState(state));
  return { state, sourceModel: { version: PERSONAL_WORKSPACE_POC_VERSION, flows } satisfies PersonalWorkspacePocReadModel };
}

function project(sourceModel: PersonalWorkspacePocReadModel, state: PersonalWorkspacePocState, flowRef = sourceModel.flows[0].ref, sourceIndex?: PersonalWorkspacePocSourceReadIndex) {
  const before = JSON.stringify({ sourceModel, state });
  const result = buildPersonalWorkspacePocResultProjection({ model: sourceModel, state, flowRef, localToday: TODAY, sourceIndex });
  assert.equal(JSON.stringify({ sourceModel, state }), before, 'source result read changes no input');
  return result;
}

function rows(state: PersonalWorkspacePocState) {
  const before = JSON.stringify(state);
  const composed = composePersonalWorkspacePocReadModel({ version: PERSONAL_WORKSPACE_POC_VERSION, flows: [] }, state);
  assert.ok(composed.ok);
  const sourceRead = buildPersonalWorkspacePocSourceReadIndex({
    baseModel: { version: PERSONAL_WORKSPACE_POC_VERSION, flows: [] }, authoredFlows: state.authoredFlows ?? [],
  });
  assert.ok(sourceRead.ok);
  const tasks = buildPersonalWorkspacePocTasks(composed.model, state, sourceRead.index);
  assert.equal(JSON.stringify(state), before, 'task read changes no source, placement, completion or Undo bytes');
  return tasks;
}

test('T01 typed source 09:30 reaches the task without a personal placement time', (context) => {
  const { sourceModel, state } = fixture(); const result = project(sourceModel, state);
  assert.ok(result.ok); assert.equal(result.projection.items[0].time, '09:30');
  const task = rows(state)[0];
  context.diagnostic(JSON.stringify({ case: 'T01', sourceTime: result.projection.items[0].time, taskTime: task.time ?? null, label: task.sourceTimingLabel, placement: state.placements[task.ref] ?? null }));
  assert.equal(task.time, '09:30');
});

test('T02 an explicit execution time wins without changing the typed source time', () => {
  const { sourceModel, state } = fixture(); const ref = sourceModel.flows[0].items[0].ref;
  state.placements[ref] = { itemRef: ref, scheduleMode: 'fixed_date', date: TODAY, time: '11:45', timelinePolicy: 'auto' };
  const result = project(sourceModel, state); assert.ok(result.ok);
  assert.equal(result.projection.items[0].sourceAttributes?.time, '09:30');
  assert.equal(result.projection.items[0].time, '11:45'); assert.equal(rows(state)[0].time, '11:45');
});

test('T03 an authoring item without typed time stays untimed', () => {
  const { sourceModel, state } = fixture([authored('no-time', '# 시간 없음\n- [ ] 접수\n  - 날짜: 2026-09-05')]);
  const result = project(sourceModel, state); assert.ok(result.ok);
  assert.equal(result.projection.items[0].time, undefined); assert.equal(rows(state)[0].time, undefined);
});

test('T04 a saved-origin timing label is not parsed into invented HH:mm', () => {
  const source = authored();
  const { authoring: _lineage, ...ordinary } = source;
  const model: PersonalWorkspacePocReadModel = { version: PERSONAL_WORKSPACE_POC_VERSION, flows: [{
    ...ordinary, origin: 'legacy-saved-plan', items: ordinary.items.map(item => ({ ...item, sourceTimingLabel: 'D-2 · 09:30 · Asia/Seoul' })),
  }] };
  const state = createPersonalWorkspacePocState(NOW);
  const result = project(model, state); assert.ok(result.ok);
  assert.equal(result.projection.items[0].time, undefined);
  assert.equal(buildPersonalWorkspacePocTasks(model, state)[0].time, undefined);
});

test('T05 personal title and order changes keep source time joined by exact original ref', (context) => {
  const flow = authored('two-items', DEFAULT_SOURCE + '\r\n- [ ] 접수\r\n  - 날짜: 2026-09-05\r\n  - 시간: 15:20');
  const { sourceModel, state } = fixture([flow]); const [first, second] = flow.items;
  state.personalPlanOverlays = { [flow.ref]: { flowRef: flow.ref, savedCopyId: flow.savedCopyId, flowId: flow.flowId,
    orderedItemRefs: [second.ref, first.ref], items: { [first.ref]: { itemRef: first.ref, title: '개인 제목' } },
  } };
  const result = project(sourceModel, state); assert.ok(result.ok);
  const expected = new Map(result.projection.items.map(item => [item.ref, item.time]));
  const tasks = rows(state);
  context.diagnostic(JSON.stringify({ case: 'T05', expected: [...expected], actual: tasks.map(task => [task.ref, task.title, task.time ?? null, task.sourceOrder]) }));
  assert.deepEqual(tasks.map(task => task.ref), [second.ref, first.ref]);
  for (const task of tasks) assert.equal(task.time, expected.get(task.ref));
});

test('T06 same-title copies do not borrow one another source time', () => {
  const first = authored('copy-first');
  const second = authored('copy-second', DEFAULT_SOURCE.replace('09:30', '16:10'));
  const { sourceModel, state } = fixture([first, second]);
  assert.notEqual(first.items[0].ref, second.items[0].ref);
  const expected = new Map([[first.items[0].ref, '09:30'], [second.items[0].ref, '16:10']]);
  for (const flow of sourceModel.flows) assert.ok(project(sourceModel, state, flow.ref).ok);
  for (const task of rows(state)) assert.equal(task.time, expected.get(task.ref));
});

test('T07 unscheduled execution changes the date, not the existing source-time fallback', () => {
  const { sourceModel, state } = fixture(); const ref = sourceModel.flows[0].items[0].ref;
  state.placements[ref] = { itemRef: ref, scheduleMode: 'unscheduled', timelinePolicy: 'auto' };
  const result = project(sourceModel, state); assert.ok(result.ok);
  assert.equal(result.projection.items[0].effectiveDate, undefined);
  assert.equal(result.projection.items[0].time, '09:30');
  const task = rows(state)[0]; assert.equal(task.date, undefined); assert.equal(task.time, '09:30');
});

test('T08 default period order uses known source times before source list order', () => {
  const flow = authored('time-order', DEFAULT_SOURCE.replace('09:30', '13:40') + '\r\n- [ ] 먼저 방문\r\n  - 날짜: 2026-09-05\r\n  - 시간: 09:30');
  const { state } = fixture([flow]);
  const group = buildPersonalWorkspacePocTaskGroups(rows(state), state, 'today', TODAY)[0];
  assert.deepEqual(group.tasks.map(task => task.ref), [flow.items[1].ref, flow.items[0].ref]);
});

test('T09 an explicit date TimelineOrder remains ahead of default source-time sorting', () => {
  const flow = authored('manual-order', DEFAULT_SOURCE.replace('09:30', '13:40') + '\r\n- [ ] 먼저 방문\r\n  - 날짜: 2026-09-05\r\n  - 시간: 09:30');
  const { state } = fixture([flow]);
  state.timelineOrders = [{ context: 'date', contextKey: TODAY, orderedRefKeys: flow.items.map(item => item.ref), revision: 1 }];
  const group = buildPersonalWorkspacePocTaskGroups(rows(state), state, 'today', TODAY)[0];
  assert.equal(group.manualOrder, true); assert.deepEqual(group.tasks.map(task => task.ref), flow.items.map(item => item.ref));
});

test('T10 existing result provenance rejects raw text drift without a matching fingerprint', () => {
  const { sourceModel, state } = fixture(); const original = sourceModel.flows[0];
  const flow = { ...original, authoring: { ...original.authoring, rawText: original.authoring.rawText + '\n원문 변경' } };
  assert.deepEqual(project({ ...sourceModel, flows: [flow] }, state), { ok: false, reason: 'invalid-authoring-lineage' });
});

test('T11 existing result identity validation rejects duplicate source Items', () => {
  const { sourceModel, state } = fixture(); const flow = sourceModel.flows[0];
  assert.deepEqual(project({ ...sourceModel, flows: [{ ...flow, items: [...flow.items, flow.items[0]] }] }, state), { ok: false, reason: 'duplicate-item-identity' });
});

test('T12 existing result map rejects a foreign copy even when its title matches', () => {
  const { sourceModel, state } = fixture(); const original = sourceModel.flows[0]; const foreign = authored('foreign-copy');
  const line = Object.keys(original.authoring.sourceLineItemIdentityMap!)[0];
  const flow = { ...original, authoring: { ...original.authoring, sourceLineItemIdentityMap: {
    ...original.authoring.sourceLineItemIdentityMap, [line]: { ...original.authoring.sourceLineItemIdentityMap![line], savedCopyId: foreign.savedCopyId, itemRef: foreign.items[0].ref },
  } } };
  assert.deepEqual(project({ ...sourceModel, flows: [flow] }, state), { ok: false, reason: 'invalid-authoring-lineage' });
});

test('T13 state provenance rejects altered parsed time; a shape-only result read is not a substitute', (context) => {
  for (const time of ['17:45', '25:99']) {
    const { sourceModel, state } = fixture(); const original = sourceModel.flows[0];
    const flow = { ...original, authoring: { ...original.authoring, parsedItems: original.authoring.parsedItems!.map(item => ({ ...item, time })) } };
    const alteredState = { ...state, authoredFlows: [flow] };
    assert.equal(isPersonalWorkspacePocState(alteredState), false);
    const directResult = project({ ...sourceModel, flows: [flow] }, alteredState);
    context.diagnostic(JSON.stringify({ case: 'T13', alteredTime: time, stateAccepted: false, directResultAccepted: directResult.ok, directResultTime: directResult.ok ? directResult.projection.items[0].time : null }));
    assert.equal(directResult.ok, false, 'the shared reader now also consumes full source/fidelity validation');
  }
});

test('T14 a genuinely legacy authoring payload without typed attributes stays untimed', () => {
  const original = authored();
  const { source: _source, parsedItems: _parsed, sourceLineItemIdentityMap: _map, fidelityManifest: _fidelity, ...legacyLineage } = original.authoring;
  const flow = { ...original, authoring: legacyLineage } as PersonalWorkspacePocAuthoredFlow;
  const { sourceModel, state } = fixture([flow]);
  const result = project(sourceModel, state); assert.ok(result.ok);
  assert.equal(result.projection.source.authoring?.itemMapping, 'legacy-unavailable');
  assert.equal(result.projection.items[0].time, undefined); assert.equal(rows(state)[0].time, undefined);
});

test('T15 an accepted source update keeps stable identity without inventing a missing typed time map', (context) => {
  const original = authored(); const { state } = fixture([original]);
  const update = createPersonalWorkspacePocLocalFixtureEnvelope(original, {
    candidateId: 'source-time-update', incomingRevisionId: 'source-time-incoming',
    incomingRawText: DEFAULT_SOURCE.replace('09:30', '17:00').replace('# 시간 검사', '# 변경된 시간 검사'), createdAt: NOW,
  });
  assert.ok(update.ok);
  let store = stagePersonalWorkspacePocSourceCandidate(createPersonalWorkspacePocSourceCandidateStore(NOW), update.envelope, update.current, NOW).store;
  for (const change of update.envelope.changes) {
    store = resolvePersonalWorkspacePocSourceCandidateChange(store, {
      candidateId: update.envelope.candidateId, changeId: change.changeId, resolution: 'use-incoming', now: NOW,
    }).store;
  }
  const applied = applyPersonalWorkspacePocSourceCandidate(store, { candidateId: update.envelope.candidateId, current: update.current, now: NOW });
  assert.equal(applied.code, 'applied');
  const effective = getPersonalWorkspacePocEffectiveSourceFlow(original, applied.store);
  assert.ok(effective.ok); assert.equal(effective.flow.ref, original.ref);
  const sourceRead = buildPersonalWorkspacePocSourceReadIndex({
    baseModel: { version: PERSONAL_WORKSPACE_POC_VERSION, flows: [] },
    authoredFlows: [original], sourceCandidateStore: applied.store,
  });
  assert.ok(sourceRead.ok);
  const result = project({ version: PERSONAL_WORKSPACE_POC_VERSION, flows: [effective.flow] }, state, effective.flow.ref, sourceRead.index);
  assert.ok(result.ok); assert.equal(result.projection.source.authoring?.itemMapping, 'legacy-unavailable');
  assert.equal(result.projection.items[0].time, undefined);
  context.diagnostic(JSON.stringify({ case: 'T15', mapping: result.projection.source.authoring?.itemMapping,
    resultAccepted: result.ok, stateAuthoredSourceAccepted: isPersonalWorkspacePocState({ ...state, authoredFlows: [effective.flow] }),
    label: effective.flow.items[0].sourceTimingLabel ?? null, typedTime: result.projection.items[0].time ?? null }));
});
