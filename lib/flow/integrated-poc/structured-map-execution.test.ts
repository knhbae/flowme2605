import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSourceBackedFlowMapSavedSnapshot, buildSourceBackedFlowMapPersistenceRecord, sourceBackedMyFlowBundles, getSourceBackedFlowMapQualityDecision } from '../source-backed-my-flow';
import { buildPersonalWorkspacePocReadModel } from '../personal-workspace-poc-read-model';
import { createPersonalWorkspacePocState } from '../personal-workspace-poc-state';
import { createProgramData, validateProgramData } from './program-data';
import { hydrateProgramLegacy } from './legacy-projection';
import { sourceCanonical, programLegacySourceChanges, projectProgramLegacySource } from './legacy-source-lifecycle-contract';
import { transitionProgramLegacySourcePayload, type ProgramLegacySourceAction } from './legacy-source-lifecycle';
import { inspectProgramLegacySnapshotPayload, type ProgramLegacySnapshotPayload } from './legacy-snapshot';
import { prepareProgramLegacyView, applyProgramLegacySourceAction } from './legacy-transaction';
import { readProgramExecutionOccurrences, readProgramOccurrencePeriod, updateProgramOccurrenceExecution, programOccurrenceWindowFor } from './recurrence-state';
import { isProgramOccurrenceExecution } from './recurrence-state-validation';
import type { ProgramOccurrenceIdentity } from './recurrence-state-contract';
import { expandProgramStructuredOccurrences } from './structured-map-execution';
import { programStructuredRecurrence } from './legacy-source-context';
import { createProgramController, programSame } from './controller';
import { PROGRAM_STATE_KEY } from './contract';
import { prepareProgramRecurrencePlan, applyProgramRecurrencePlanTransition, undoProgramRecurrencePlanTransition, programOriginalOccurrenceIdentityAt } from './program-recurrence-plan-state';
import { readProgramRecurrencePlan, previewProgramRecurrencePlan } from './program-recurrence-plan';
import { textWorkspaceModel as M } from './text-workspace';
import { reconcileProgramLegacy } from './legacy-reconcile';
import { readProgramLegacyMapPlan, previewProgramLegacyMapPlan, applyProgramLegacyMapPlan, type ProgramLegacyMapPlanDraft } from './program-legacy-map-plan';
import { previewProgramLegacySeriesPlan, type ProgramLegacySeriesChoice } from './program-legacy-series-plan';
import { inspectProgramPrivateOutput, makeProgramPrivateOutput } from './private-output';
import { programPreservesSeriesMetadata, programSeriesMetadata } from './recurrence-target';
import { programReferenceExecutionAccess } from './reference-execution-guard';
import { programResult } from './contract';

const NOW = '2026-09-13T00:00:00.000Z', START = '2026-09-30', actorId = 'local-user';
function fixture(mapId = 'curated-allblanc-workout-park', flowId = 'flow-curated-allblanc-no-jump-cardio', simulatedReadinessHold = false) {
  const entries: Record<string, string> = {
    [`flow:map:saved:${mapId}`]: JSON.stringify(buildSourceBackedFlowMapSavedSnapshot(mapId, { savedAt: NOW, anchor: START })),
    [`flow:map:persistence:${mapId}`]: JSON.stringify(buildSourceBackedFlowMapPersistenceRecord(mapId, { savedAt: NOW, anchor: START })),
  };
  const model = buildPersonalWorkspacePocReadModel({ length: 2, key: i => Object.keys(entries)[i] ?? null, getItem: key => entries[key] ?? null }, sourceBackedMyFlowBundles); assert(model.ok);
  // Explicit negative QA variant only; never relax a genuine factory decision.
  if (simulatedReadinessHold) model.model = { ...model.model, flows: model.model.flows.map(flow => ({ ...flow, presentation: { ...flow.presentation,
    mapGroup: { ...flow.presentation!.mapGroup!, executionState: 'review-hold', reviewReasons: ['saved-readiness-review-required'] } } })) };
  const flow = model.model.flows.find(row => row.flowId === flowId)!; assert(flow);
  let payload: ProgramLegacySnapshotPayload = { model: model.model, state: createPersonalWorkspacePocState(NOW) };
  const step = (action: ProgramLegacySourceAction) => { const changed = transitionProgramLegacySourcePayload(payload, action); assert(changed.ok, changed.ok ? '' : changed.reason); payload = changed.payload; };
  step({ type: 'connect-map', flowRef: flow.ref, requestId: 'connect', expectedSourceToken: sourceCanonical(flow), now: NOW });
  step({ type: 'stage-map', flowRef: flow.ref, requestId: 'stage', now: NOW });
  const owner = payload.sourceLifecycle!.owners[flow.ref], review = owner.reviews.at(-1)!;
  for (const change of programLegacySourceChanges(owner, review.incomingRevisionId)) step({ type: 'choice', flowRef: flow.ref, reviewId: review.id, changeId: change.id, choice: 'incoming', now: NOW });
  step({ type: 'apply', flowRef: flow.ref, reviewId: review.id, now: NOW });
  const activated = (): Extract<ProgramLegacySourceAction, { type: 'activate-map-recurrence' }> => ({ type: 'activate-map-recurrence', flowRef: flow.ref,
    itemRefs: [flow.items[0].ref], expectedSelection: sourceCanonical(payload.sourceLifecycle!.owners[flow.ref].effective), requestId: 'activate', now: NOW });
  return { payload, flow, entries, activated };
}
function hydrated(f: ReturnType<typeof fixture>) {
  const result = hydrateProgramLegacy(createProgramData(), f.payload.model, f.payload.state,
    { actorId, preserveUnsupported: true, sourceLifecycle: f.payload.sourceLifecycle }); assert(result.ok);
  return result.data;
}

function activatedWholeMap() {
  const f = fixture(); let payload = f.payload;
  const step = (action: ProgramLegacySourceAction) => { const next = transitionProgramLegacySourcePayload(payload, action); assert(next.ok, next.ok ? '' : next.reason); payload = next.payload; };
  for (const flow of payload.model.flows) {
    if (flow.ref !== f.flow.ref) {
      step({ type: 'connect-map', flowRef: flow.ref, requestId: `connect-${flow.flowId}`, expectedSourceToken: sourceCanonical(flow), now: NOW });
      step({ type: 'stage-map', flowRef: flow.ref, requestId: `stage-${flow.flowId}`, now: NOW });
      const owner = payload.sourceLifecycle!.owners[flow.ref], review = owner.reviews.at(-1)!;
      for (const change of programLegacySourceChanges(owner, review.incomingRevisionId)) step({ type: 'choice', flowRef: flow.ref, reviewId: review.id, changeId: change.id, choice: 'incoming', now: NOW });
      step({ type: 'apply', flowRef: flow.ref, reviewId: review.id, now: NOW });
    }
    step({ type: 'activate-map-recurrence', flowRef: flow.ref, itemRefs: flow.items.map(item => item.ref),
      expectedSelection: sourceCanonical(payload.sourceLifecycle!.owners[flow.ref].effective), requestId: `activate-${flow.flowId}`, now: NOW });
  }
  return { f, data: hydrated({ ...f, payload }) };
}

function mapSeriesChoice(data: ReturnType<typeof hydrated>, flowRef: string, date: string, targetDate: string): ProgramLegacySeriesChoice {
  const read = readProgramOccurrencePeriod(data, { actorId, flowRef, localToday: START, from: date, to: date }); assert(read.ok);
  const row = read.rows.find(row => row.executionDate === date); assert(row, `real occurrence on ${date}`);
  const ready = prepareProgramRecurrencePlan(data, { actorId, flowRef, sourceIdentity: row.identity, ownerId: row.personalPlan?.ownerId ?? `map-plan-${row.identity.itemId}`, localToday: START, now: NOW }); assert(ready.ok, JSON.stringify(ready.ok ? {} : ready));
  return { ownerId: ready.value.owner.ownerId, expectedOwner: ready.value.expectedOwner, sourceIdentity: row.identity,
    ...(row.personalPlan ? { personalIdentity: row.personalPlan.identity } : {}), originalDate: row.originalDate, scope: 'future_series', targetDate, at: NOW };
}

test('ME13 genuine structured Map common anchor requires explicit recurrence choices instead of rejecting supported source semantics', () => {
  const { f, data } = activatedWholeMap(), before = JSON.stringify(data);
  const read = readProgramLegacyMapPlan(data, actorId, f.flow.ref, NOW); assert(read.ok); assert.equal(read.children.length, 2);
  const draft: ProgramLegacyMapPlanDraft = { personalAnchor: '2026-10-07', children: Object.fromEntries(read.children.map(child => [child.flow.ref,
    { mode: { mode: 'follow-group' }, selection: { includedItemRefs: child.rows.map(row => row.itemRef) } }])) };
  const preview = previewProgramLegacyMapPlan(data, { actorId, flowRef: f.flow.ref, now: NOW, draft }); assert(!preview.ok);
  assert.equal(preview.reason, 'relative-series-anchor-owner-required');
  assert.equal(JSON.stringify(data), before);
});

test('ME15 genuine structured recurrence output keeps source link, saved-calendar basis and exact cautions in all three file formats', () => {
  const { f, data } = activatedWholeMap(), before = JSON.stringify(data), space = data.spaces[actorId];
  const checked = inspectProgramLegacySnapshotPayload(JSON.parse(space.legacySnapshot!.raw)); assert(checked.ok);
  const context = programStructuredRecurrence(checked.sourceContextByFlow.get(f.flow.ref)!.get(f.flow.items[0].ref)); assert(context?.sourceUrl);
  const documentId = space.savedBindings.find(binding => binding.flowRef === f.flow.ref)!.documentId;
  const occurrenceRange = { from: '2026-10-01', to: '2026-11-30', includeUndated: false };
  const inspected = inspectProgramPrivateOutput(data, { actorId, documentId, occurrenceRange }); assert(inspected.ok && inspected.rows.length > 0);
  for (const row of inspected.rows) {
    assert.equal(row.sourceUrl, context.sourceUrl);
    assert(row.note.includes('저장한 개인 캘린더 설정'));
    if (context.warning) assert(row.note.includes(context.warning));
    if (context.conversionNote) assert(row.note.includes(context.conversionNote));
  }
  for (const format of ['txt', 'csv', 'ics'] as const) {
    const output = makeProgramPrivateOutput(data, { actorId, documentId, occurrenceRange, mode: 'tasks', selectedItemIds: [inspected.rows[0].id], format }, new Date(NOW)); assert(output.ok);
    const text = format === 'ics' ? output.payload.replace(/\r?\n[ \t]/g, '').replace(/\\([nN,;\\])/g, (_, char: string) => /n/i.test(char) ? '\n' : char)
      : format === 'csv' ? output.payload.replace(/""/g, '"') : output.payload;
    assert(text.includes(context.sourceUrl)); assert(text.includes('저장한 개인 캘린더 설정'));
    if (context.warning) assert(text.includes(context.warning), `${format} keeps exact decoded caution`);
  }
  assert.equal(JSON.stringify(data), before);
});

test('ME14 genuine common and fixed-child anchors share one transaction with an existing personal series and completed source history', async () => {
  const fixture = activatedWholeMap(), f = fixture.f; let data = fixture.data;
  const source = readProgramExecutionOccurrences(data, { actorId, flowRef: f.flow.ref, localToday: START }); assert(source.ok);
  const done = updateProgramOccurrenceExecution(data, { actorId, flowRef: f.flow.ref, localToday: START, identity: source.rows[0].identity, expected: null,
    changes: { schedule: { mode: 'fixed_date', date: '2026-11-02' }, completion: { status: 'completed', completedAt: NOW } } }); assert(done.ok); data = done.data;
  const firstChoice = mapSeriesChoice(data, f.flow.ref, '2026-10-06', '2026-10-13');
  const first = previewProgramLegacySeriesPlan(data, { actorId, flowRef: f.flow.ref, itemRef: f.flow.items[0].ref, localToday: START, choice: firstChoice }); assert(first.ok && first.value.preview);
  const planned = applyProgramRecurrencePlanTransition(data, { actorId, expectedSpace: data.spaces[actorId], expectedOwner: first.value.expectedOwner!, preview: first.value.preview, localToday: START }); assert(planned.ok); data = planned.data;
  const before = structuredClone(data), read = readProgramLegacyMapPlan(data, actorId, f.flow.ref, NOW); assert(read.ok);
  const draft: ProgramLegacyMapPlanDraft = { personalAnchor: '2026-10-07', children: Object.fromEntries(read.children.map(child => {
    const personal = child.flow.ref === f.flow.ref, choice = mapSeriesChoice(data, child.flow.ref, personal ? '2026-10-13' : '2026-10-02', personal ? '2026-10-27' : '2026-10-09');
    return [child.flow.ref, { mode: personal ? { mode: 'fixed-child', anchor: '2026-10-14' } : { mode: 'follow-group' },
      selection: { includedItemRefs: child.rows.map(row => row.itemRef), seriesChoices: { [child.rows[0].itemRef]: choice } } }];
  })) };
  const preview = previewProgramLegacyMapPlan(data, { actorId, flowRef: f.flow.ref, now: NOW, draft }); assert(preview.ok, JSON.stringify(preview.ok ? {} : preview));
  assert.equal(preview.previews.flatMap(p => p.seriesPreviews).filter(p => p.status === 'changed').length, 2);
  const applied = applyProgramLegacyMapPlan(data, { actorId, flowRef: f.flow.ref, now: NOW, draft, expectedSpace: data.spaces[actorId] }); assert(applied.ok && applied.changed);
  const space = applied.data.spaces[actorId], owners = Object.values(space.recurrencePlans!.owners);
  assert.equal(owners.length, 2); assert.equal(owners.find(owner => owner.ownerId === firstChoice.ownerId)!.operations.length, 2);
  assert.deepEqual(space.recurrenceExecution, before.spaces[actorId].recurrenceExecution);
  assert.deepEqual(space.text.progressRecords, before.spaces[actorId].text.progressRecords);
  assert.deepEqual(space.text.bindings, before.spaces[actorId].text.bindings);
  const original = JSON.parse(before.spaces[actorId].legacySnapshot!.raw), after = JSON.parse(space.legacySnapshot!.raw);
  assert.deepEqual(after.model, original.model); assert.deepEqual(after.sourceLifecycle, original.sourceLifecycle);
  assert.equal(after.planSelections.groups[read.group.groupRef].personalAnchor, '2026-10-07');
  assert.deepEqual(after.planSelections.groups[read.group.groupRef].childModes[f.flow.ref], { mode: 'fixed-child', anchor: '2026-10-14' });
  assert.deepEqual(applied.data.spaces['creator-minji'], before.spaces['creator-minji']);
  assert(validateProgramData(JSON.parse(JSON.stringify(applied.data))));
  assert.deepEqual(data, before);
  const stale = applyProgramLegacyMapPlan(applied.data, { actorId, flowRef: f.flow.ref, now: NOW, draft, expectedSpace: before.spaces[actorId] }); assert(!stale.ok && stale.reason === 'conflict'); assert.equal(stale.data, applied.data);
  const values = new Map(Object.entries(f.entries)), protectedBytes = [...values], calls: { key: string; failed: boolean }[] = []; let quota = true;
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => {
    calls.push({ key, failed: quota }); if (quota) throw new DOMException('simulated full storage', 'QuotaExceededError'); values.set(key, value);
  }, removeItem: (key: string) => { throw Error(`unexpected remove ${key}`); } };
  const options = { initialData: data, storage, exclusive: async <T,>(work: () => T | Promise<T>) => work() };
  const controller = createProgramController(options); assert(controller.ok);
  const commit = () => controller.mutate('실제 Map 기준일', current => applyProgramLegacyMapPlan(current,
    { actorId, flowRef: f.flow.ref, now: NOW, draft, expectedSpace: before.spaces[actorId] }), { actorId });
  assert(!(await commit()).ok); assert(programSame(controller.snapshot().envelope.data, before)); assert(!values.has(PROGRAM_STATE_KEY));
  quota = false; assert((await commit()).ok); assert.equal(calls.filter(call => !call.failed).length, 1);
  assert(programSame(controller.snapshot().envelope.data, applied.data));
  const unchangedDraft = structuredClone(draft); for (const child of Object.values(unchangedDraft.children)) delete child.selection.seriesChoices;
  const writeCount = calls.length;
  assert((await controller.mutate('같은 Map 선택', current => applyProgramLegacyMapPlan(current,
    { actorId, flowRef: f.flow.ref, now: NOW, draft: unchangedDraft, expectedSpace: current.spaces[actorId] }), { actorId })).ok);
  assert.equal(calls.length, writeCount);
  assert((await controller.undo(actorId)).ok); assert(programSame(controller.snapshot().envelope.data, before));
  assert((await controller.redo(actorId)).ok); assert(programSame(controller.snapshot().envelope.data, applied.data));
  const reloaded = createProgramController(options); assert(reloaded.ok); assert(programSame(reloaded.snapshot().envelope.data, applied.data));
  assert.deepEqual([...values].filter(([key]) => key !== PROGRAM_STATE_KEY), protectedBytes); assert(calls.every(call => call.key === PROGRAM_STATE_KEY));
});

test('ME01 old accepted Map stays unchanged on read; explicit exact-tuple activation has no fabricated authored line', () => {
  const f = fixture(), bytes = JSON.stringify(f.payload), input = JSON.stringify(f.entries);
  const before = inspectProgramLegacySnapshotPayload(f.payload); assert(before.ok); assert.equal(before.sourceContextByFlow.get(f.flow.ref)!.size, 0);
  assert.equal(JSON.stringify(f.payload), bytes);
  const result = transitionProgramLegacySourcePayload(f.payload, f.activated()); assert(result.ok && result.changed);
  const read = inspectProgramLegacySnapshotPayload(result.payload); assert(read.ok);
  const context = read.sourceContextByFlow.get(f.flow.ref)!.get(f.flow.items[0].ref)!;
  assert(!('sourceLine' in context)); assert.equal(programStructuredRecurrence(context)?.ruleBasis, 'saved-calendar-setting');
  assert.equal(programStructuredRecurrence(context)?.sourceRepeatRule, 'FREQ=WEEKLY;BYDAY=TU,TH');
  assert.deepEqual(result.payload.model, f.payload.model); assert.deepEqual(result.payload.state, f.payload.state);
  assert.equal(JSON.stringify(f.entries), input); assert.equal(JSON.stringify(f.payload), bytes);
  const again = transitionProgramLegacySourcePayload(result.payload, f.activated()); assert(again.ok && !again.changed); assert.equal(again.payload, result.payload);
});

test('ME02 stale/foreign/duplicate activation and forged receipt fail closed, with original bytes intact', () => {
  const f = fixture(), bytes = JSON.stringify(f.payload);
  for (const action of [{ ...f.activated(), expectedSelection: 'stale' }, { ...f.activated(), itemRefs: ['foreign'] },
    { ...f.activated(), itemRefs: [...f.activated().itemRefs, ...f.activated().itemRefs] }, { ...f.activated(), itemRefs: [] }]) {
    const result = transitionProgramLegacySourcePayload(f.payload, action); assert(!result.ok); assert.equal(result.payload, f.payload);
  }
  const good = transitionProgramLegacySourcePayload(f.payload, f.activated()); assert(good.ok);
  for (const patch of [
    (p: ProgramLegacySnapshotPayload) => { p.sourceLifecycle!.owners[f.flow.ref].mapExecution!.version = 2 as 1; },
    (p: ProgramLegacySnapshotPayload) => { p.sourceLifecycle!.owners[f.flow.ref].mapExecution!.items[f.flow.items[0].ref].revisionId = 'foreign'; },
    (p: ProgramLegacySnapshotPayload) => { delete p.sourceLifecycle!.owners[f.flow.ref].executionHandoffs; },
  ]) { const bad = structuredClone(good.payload); patch(bad); assert(!inspectProgramLegacySnapshotPayload(bad).ok); }
  assert.equal(JSON.stringify(f.payload), bytes);
});

test('ME03 real Program transaction activates Tue/Thu, preserves source/sibling, and supports completion/date/period/reload', () => {
  const f = fixture(); let data = hydrated(f);
  const sibling = data.spaces[actorId].savedBindings.find(b => b.flowRef !== f.flow.ref)!;
  const siblingBefore = JSON.stringify(data.spaces[actorId].text.flows.find(d => d.id === sibling.documentId));
  const view = prepareProgramLegacyView(data, { actorId, now: NOW, onlyFlowRef: f.flow.ref, sourceReview: true }); assert(view.ok);
  const applied = applyProgramLegacySourceAction(data, { actorId, expectedToken: view.token, action: f.activated() });
  assert(applied.transition.ok, JSON.stringify({ issues: applied.issues, conflicts: applied.conflicts })); data = applied.transition.data;
  assert(validateProgramData(data));
  const read = readProgramExecutionOccurrences(data, { actorId, flowRef: f.flow.ref, localToday: START }); assert(read.ok, JSON.stringify(read));
  assert.deepEqual(read.rows.map(r => r.originalDate), ['2026-10-01', '2026-10-06', '2026-10-08', '2026-10-13', '2026-10-15', '2026-10-20', '2026-10-22', '2026-10-27']);
  assert.equal(read.rows[0].identity.structuredOwner?.kind, 'structured-map'); assert.equal(read.rows[0].identity.sourceRule.recurrence, 'FREQ=WEEKLY;BYDAY=TU,TH');
  const row = read.rows[0]; assert(!row.mapReviewHold, 'genuine candidate must retain its actual quality decision');
  const changed = updateProgramOccurrenceExecution(data, { actorId, flowRef: f.flow.ref, localToday: START, identity: row.identity, expected: null,
    changes: { schedule: { mode: 'fixed_date', date: '2026-11-02' }, completion: { status: 'completed', completedAt: NOW } } }); assert(changed.ok, JSON.stringify(changed));
  data = JSON.parse(JSON.stringify(changed.data)); assert(validateProgramData(data));
  const period = readProgramOccurrencePeriod(data, { actorId, flowRef: f.flow.ref, localToday: START, from: '2026-11-02', to: '2026-11-02' }); assert(period.ok);
  assert.equal(period.rows.length, 1); assert.equal(period.rows[0].identity.occurrenceId, row.occurrenceId); assert.equal(period.rows[0].completion, 'completed');
  const reopen = updateProgramOccurrenceExecution(data, { actorId, flowRef: f.flow.ref, localToday: START, window: programOccurrenceWindowFor(row.identity), identity: row.identity,
    expected: period.rows[0].stored, changes: { completion: { status: 'open', completedAt: null } } }); assert(reopen.ok);
  const snapshot = JSON.parse(reopen.data.spaces[actorId].legacySnapshot!.raw); assert.deepEqual(snapshot.model, f.payload.model);
  assert.equal(JSON.stringify(data.spaces[actorId].text.flows.find(d => d.id === sibling.documentId)), siblingBefore);
});

test('ME04 D1 finite pages, monthly skip and global ordinals do not use authored first-day semantics', () => {
  const f = fixture(), base = { sourceFlowRef: f.flow.ref, sourceItemRef: f.flow.items[0].ref, itemId: f.flow.items[0].itemId };
  const rule = { startDate: START, recurrence: 'FREQ=WEEKLY;BYDAY=TU,TH;COUNT=40', recurrenceEnd: null };
  const page = expandProgramStructuredOccurrences({ ...base, sourceRule: rule }, { finiteOffset: 30, finiteLimit: 10 }); assert(page.ok);
  assert.equal(page.manifest.rows[0].occurrenceIndex, 31); assert.equal(page.manifest.rows.length, 10); assert.equal(page.manifest.hasMore, false); assert.equal(page.manifest.totalCount, 40);
  assert.equal(page.manifest.rule.raw, rule.recurrence);
  const monthly = expandProgramStructuredOccurrences({ ...base, sourceRule: { startDate: '2026-09-30', recurrence: 'FREQ=MONTHLY;BYMONTHDAY=31;COUNT=3', recurrenceEnd: null } }); assert(monthly.ok);
  assert.deepEqual(monthly.manifest.originalDates, ['2026-10-31', '2026-12-31', '2027-01-31']);
});

test('ME05 structured occurrence validator rejects foreign IDs, false ordinal and fake Wednesday; source Undo keeps receipt but deactivates rule', () => {
  const f = fixture(), result = transitionProgramLegacySourcePayload(f.payload, f.activated()); assert(result.ok);
  const data = hydrated({ ...f, payload: result.payload }), read = readProgramExecutionOccurrences(data, { actorId, flowRef: f.flow.ref, localToday: START }); assert(read.ok);
  const entry = { ...read.rows[0].identity, schedule: { mode: 'inherit' as const, date: null }, completion: { status: 'unrecorded' as const, completedAt: null }, participation: 'included' as const };
  assert(isProgramOccurrenceExecution(entry));
  for (const bad of [{ ...entry, originalDate: START }, { ...entry, occurrenceIndex: 2 }, { ...entry, itemId: 'foreign' },
    { ...entry, structuredOwner: { ...entry.structuredOwner!, seriesRevisionId: 'fake' } }, { ...entry, creatorOwner: { kind: 'creator', ownerId: 'fake', rowId: 'fake', executionItemRef: 'fake' } }]) assert(!isProgramOccurrenceExecution(bad));
  const undo = transitionProgramLegacySourcePayload(result.payload, { type: 'undo', flowRef: f.flow.ref, now: NOW }); assert(undo.ok);
  assert.equal(projectProgramLegacySource(undo.payload.sourceLifecycle!.owners[f.flow.ref])!.contexts.size, 0);
  assert.deepEqual(undo.payload.sourceLifecycle!.owners[f.flow.ref].mapExecution, result.payload.sourceLifecycle!.owners[f.flow.ref].mapExecution);
});

test('ME06 activation storage failure/no-op/Undo/Redo/reload preserves all original keys byte for byte', async () => {
  const f = fixture(), data = hydrated(f), values = new Map(Object.entries({ ...f.entries, 'flow:operating-sentinel': ' exact original bytes\r\n' }));
  const protectedBytes = [...values], writes: string[] = []; let quota = false;
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { writes.push(key); if (quota) throw Error('quota'); values.set(key, value); },
    removeItem: (key: string) => { writes.push(key); values.delete(key); }, clear: () => { throw Error('clear forbidden'); } };
  const options = { initialData: data, storage, exclusive: async <T,>(work: () => T | Promise<T>) => work() };
  const controller = createProgramController(options); assert(controller.ok);
  const activate = () => controller.mutate('반복 연결', current => {
    const view = prepareProgramLegacyView(current, { actorId, now: NOW, onlyFlowRef: f.flow.ref, sourceReview: true }); assert(view.ok);
    return applyProgramLegacySourceAction(current, { actorId, expectedToken: view.token, action: f.activated() }).transition;
  }, { actorId });
  quota = true; const before = JSON.stringify(controller.snapshot().envelope); assert(!(await activate()).ok);
  assert.equal(JSON.stringify(controller.snapshot().envelope), before); assert(!values.has(PROGRAM_STATE_KEY));
  quota = false; assert((await activate()).ok); const afterWrites = writes.length; assert((await activate()).ok); assert.equal(writes.length, afterWrites);
  const read = () => readProgramExecutionOccurrences(controller.snapshot().envelope.data, { actorId, flowRef: f.flow.ref, localToday: START });
  assert((await controller.undo(actorId)).ok); const undone = read(); assert(undone.ok); assert.equal(undone.rows.length, 0);
  assert((await controller.redo(actorId)).ok); const redone = read(); assert(redone.ok); assert.equal(redone.rows.length, 8);
  const reloaded = createProgramController(options); assert(reloaded.ok); const restored = readProgramExecutionOccurrences(reloaded.snapshot().envelope.data, { actorId, flowRef: f.flow.ref, localToday: START }); assert(restored.ok);
  assert.deepEqual(restored.rows.map(r => r.identity), redone.rows.map(r => r.identity));
  assert.deepEqual([...values].filter(([key]) => key !== PROGRAM_STATE_KEY), protectedBytes); assert(writes.every(key => key === PROGRAM_STATE_KEY));
});

test('ME07 real structured source supports explicit personal recurrence planning without rewriting source, completed history or Undo', () => {
  const f = fixture(), activated = transitionProgramLegacySourcePayload(f.payload, f.activated()); assert(activated.ok);
  let data = hydrated({ ...f, payload: activated.payload }); const input = { actorId, flowRef: f.flow.ref, localToday: START };
  const read = readProgramExecutionOccurrences(data, input); assert(read.ok);
  const completed = updateProgramOccurrenceExecution(data, { ...input, identity: read.rows[0].identity, expected: null, changes: { completion: { status: 'completed', completedAt: NOW } } }); assert(completed.ok); data = completed.data;
  const prepared = prepareProgramRecurrencePlan(data, { ...input, sourceIdentity: read.rows[1].identity, ownerId: 'map-personal-plan', now: NOW }); assert(prepared.ok, JSON.stringify(prepared));
  assert.equal(prepared.value.owner.source.structuredOwner?.kind, 'structured-map'); assert.equal(prepared.value.owner.retainedSourceExecutions.length, 1);
  const target = readProgramRecurrencePlan(prepared.value.owner, { start: read.rows[1].originalDate, end: read.rows[1].originalDate }); assert(target.ok);
  const preview = previewProgramRecurrencePlan(prepared.value.owner, { actorId, expected: prepared.value.owner, currentSource: prepared.value.owner.source,
    operation: { scope: 'future_series', targetDate: '2026-10-13', target: target.value.targets[0], sourceCutover: read.rows[1].identity, at: '2026-09-13T01:00:00.000Z' } }); assert(preview.ok, JSON.stringify(preview));
  const result = applyProgramRecurrencePlanTransition(data, { ...input, ...prepared.value, preview: preview.value }); assert(result.ok);
  assert.deepEqual(result.data.spaces[actorId].legacySnapshot, data.spaces[actorId].legacySnapshot);
  assert.deepEqual(result.data.spaces[actorId].recurrenceExecution, data.spaces[actorId].recurrenceExecution);
  assert(validateProgramData(JSON.parse(JSON.stringify(result.data))));
  const undo = undoProgramRecurrencePlanTransition(result.data, { ...input, expectedSpace: result.data.spaces[actorId], preview: preview.value }); assert(undo.ok);
  // Domain plan Undo leaves the established empty collection, whereas global
  // envelope Undo (ME06) restores the exact previous wire snapshot.
  assert.deepEqual(undo.data.spaces[actorId].recurrencePlans, { version: 1, owners: {} });
  const expected = structuredClone(data); expected.spaces[actorId].recurrencePlans = { version: 1, owners: {} }; assert.deepEqual(undo.data, expected);
});

test('ME08 real aircon two-week execution preserves actual catalog quality policy; park is not invented as a private execution hold', () => {
  const quality = JSON.stringify(getSourceBackedFlowMapQualityDecision('aircon-filter-cleaning'));
  const f = fixture('aircon-filter-cleaning', 'flow-source-backed-aircon-filter-cleaning'), activated = transitionProgramLegacySourcePayload(f.payload, f.activated()); assert(activated.ok);
  const data = hydrated({ ...f, payload: activated.payload }), read = readProgramExecutionOccurrences(data, { actorId, flowRef: f.flow.ref, localToday: START }); assert(read.ok);
  assert.deepEqual(read.rows.map(r => r.originalDate), [START, '2026-10-14']); assert(read.rows.every(row => row.mapReviewHold === (f.flow.presentation!.mapGroup!.executionState === 'review-hold')));
  assert.equal(JSON.stringify(getSourceBackedFlowMapQualityDecision('aircon-filter-cleaning')), quality); assert.deepEqual(activated.payload.model, f.payload.model);
});

test('ME10 explicit finite long-range schedules retain original identity beyond the open-window guard', () => {
  const f = fixture(), activated = transitionProgramLegacySourcePayload(f.payload, f.activated()); assert(activated.ok);
  const data = hydrated({ ...f, payload: activated.payload }), read = readProgramExecutionOccurrences(data, { actorId, flowRef: f.flow.ref, localToday: START }); assert(read.ok);
  // Deliberate schedule-boundary variants, not extra real catalog content.
  for (const recurrence of ['FREQ=MONTHLY;INTERVAL=120;BYMONTHDAY=30;COUNT=3', 'FREQ=MONTHLY;INTERVAL=120;BYMONTHDAY=30;UNTIL=20460930']) {
    const sourceRule = { startDate: START, recurrence, recurrenceEnd: null };
    const base: ProgramOccurrenceIdentity = read.rows[0].identity;
    const expanded = expandProgramStructuredOccurrences({ ...base, sourceRule }); assert(expanded.ok);
    assert.deepEqual(expanded.manifest.originalDates, ['2026-09-30', '2036-09-30', '2046-09-30']);
    const row = expanded.manifest.rows[2];
    const source: ProgramOccurrenceIdentity = { ...base, sourceRule, originalDate: row.originalDate, occurrenceIndex: row.occurrenceIndex,
      seriesId: row.seriesId, occurrenceId: row.occurrenceId, structuredOwner: { ...base.structuredOwner!, seriesRevisionId: expanded.seriesRevisionId } };
    const before = JSON.stringify(source);
    assert.deepEqual(programOriginalOccurrenceIdentityAt(source, '2046-09-30'), source);
    assert.equal(programOriginalOccurrenceIdentityAt(source, '2046-10-01'), null);
    assert.equal(JSON.stringify(source), before);
  }
});

test('ME09 explicit simulated readiness hold stays held after activation; personal confirmation cannot authorize completion', () => {
  const f = fixture(undefined, undefined, true), activated = transitionProgramLegacySourcePayload(f.payload, f.activated()); assert(activated.ok);
  const data = hydrated({ ...f, payload: activated.payload }), read = readProgramExecutionOccurrences(data, { actorId, flowRef: f.flow.ref, localToday: START }); assert(read.ok); assert(read.rows.every(row => row.mapReviewHold));
  const changed = updateProgramOccurrenceExecution(data, { actorId, flowRef: f.flow.ref, localToday: START, identity: read.rows[0].identity, expected: null,
    changes: { completion: { status: 'completed', completedAt: NOW } } }); assert(!changed.ok); assert.equal(changed.data, data);
});

function historicalPrivateFixture() {
  const f = fixture(), data = hydrated(f), space = data.spaces[actorId];
  const binding = space.savedBindings.find(row => row.flowRef === f.flow.ref)!;
  const id = binding.itemLines[f.flow.items[0].ref], documentId = binding.documentId;
  const doc = M.getDocument(space.text, documentId)!;
  // Explicit old-private-state fixture. These are personal notes and records,
  // not an invented sourceLine or a rewritten genuine Map/factory schedule.
  doc.lines.find(line => line.id === id)!.text = '- [ ] 개인 운동 실행 기록';
  space.text.taskScopes[id] = documentId; space.text.itemScopes[id] = documentId;
  assert(M.validate(space.text), 'historical private fixture has canonical item ownership');
  space.text = M.updateTask(space.text, id, { date: '2026-10-05', note: '이전 실행의 개인 메모' });
  space.text = M.editText(space.text, documentId, M.raw(M.getDocument(space.text, documentId)) + '\n  - [ ] 개인 준비 확인');
  const child = M.parseDocument(M.getDocument(space.text, documentId)!, space.text).items.find(task => task.title === '개인 준비 확인')!; assert(child, M.raw(M.getDocument(space.text, documentId)));
  space.text = M.recordProgress(space.text, id, '2026-09-11', 15);
  space.text = M.recordProgress(space.text, id, '2026-09-12', 35);
  space.text = M.recordProgress(space.text, child.id, '2026-09-12', 20);
  space.text = M.addDocument(space.text, { title: '기존 기록 참조 문서', folderId: 'folder-unfiled' });
  const referenceId = space.text.documents.at(-1)!.id;
  space.text = M.linkTask(space.text, referenceId, 0, id);
  assert(validateProgramData(data));
  return { f, data, space, id, documentId, child, referenceId };
}

test('ME11 genuine Map with explicit historical private records preserves subtree, references, dates and progress through activation and source Undo', () => {
  const prepared = historicalPrivateFixture(), { f, space, id, documentId, child, referenceId } = prepared;
  let data = prepared.data;
  const before = structuredClone(data), originalModel = JSON.parse(space.legacySnapshot!.raw).model;
  const history = JSON.stringify(space.text.progressRecords), references = JSON.stringify(space.text.bindings);
  const task = M.tasks(space.text).find(row => row.id === id)!;
  const apply = (action: ProgramLegacySourceAction) => {
    const view = prepareProgramLegacyView(data, { actorId, now: NOW, onlyFlowRef: f.flow.ref, sourceReview: true }); assert(view.ok, JSON.stringify(view.ok ? {} : view));
    const result = applyProgramLegacySourceAction(data, { actorId, expectedToken: view.token, action });
    if (!result.transition.ok) {
      const source = transitionProgramLegacySourcePayload(view.payload, action); assert(source.ok);
      const rebase = structuredClone(data), payload = structuredClone(source.payload);
      rebase.spaces[actorId].legacySnapshot = { workspaceId: view.payload.state.workspaceId, revision: view.payload.state.revision, raw: JSON.stringify(view.payload) };
      payload.state.revision++; payload.state.updatedAt = action.now; delete payload.state.undo;
      const merge = reconcileProgramLegacy(rebase, payload, { actorId, expectedSnapshotRaw: rebase.spaces[actorId].legacySnapshot!.raw,
        canonicalFolders: true, onlyFlowRef: f.flow.ref, sourceAction: action });
      assert.fail(JSON.stringify({ action: action.type, issues: result.issues, conflicts: result.conflicts,
        shadow: merge.ok ? { patches: merge.shadowPlan.patches, issues: merge.shadowPlan.issues } : merge.issues }));
    }
    data = result.transition.data;
    assert(validateProgramData(data));
  };
  apply(f.activated());
  const activated = data.spaces[actorId], retainedId = activated.retentionDocuments![documentId];
  assert(activated.archivedDocumentIds.includes(retainedId));
  const retained = M.tasks(activated.text).find(row => row.id === id)!;
  assert.equal(retained.docId, retainedId); assert.equal(retained.title, task.title);
  assert.equal(retained.date, task.date); assert.equal(retained.note, task.note);
  assert.equal(retained.subchecks[0].id, child.id);
  assert.equal(JSON.stringify(activated.text.progressRecords), history);
  assert.equal(JSON.stringify(activated.text.bindings), references);
  const occurrences = readProgramExecutionOccurrences(data, { actorId, flowRef: f.flow.ref, localToday: START }); assert(occurrences.ok);
  assert.equal(occurrences.rows.length, 8); assert(occurrences.rows.every(row => row.completion !== 'completed'));
  const first = occurrences.rows[0];
  const done = updateProgramOccurrenceExecution(data, { actorId, flowRef: f.flow.ref, localToday: START, identity: first.identity, expected: null,
    changes: { completion: { status: 'completed', completedAt: NOW } } }); assert(done.ok); data = done.data;
  const occurrenceBytes = JSON.stringify(data.spaces[actorId].recurrenceExecution);
  apply({ type: 'undo', flowRef: f.flow.ref, now: NOW });
  const restored = data.spaces[actorId], restoredTask = M.tasks(restored.text).find(row => row.id === id)!;
  assert.equal(restoredTask.docId, documentId); assert.equal(restoredTask.note, task.note); assert.equal(restoredTask.date, task.date);
  assert.equal(restoredTask.subchecks[0].id, child.id);
  assert.equal(JSON.stringify(restored.text.progressRecords), history);
  assert.equal(JSON.stringify(restored.text.bindings), references);
  assert.equal(JSON.stringify(restored.recurrenceExecution), occurrenceBytes);
  assert.deepEqual(JSON.parse(restored.legacySnapshot!.raw).model, originalModel);
  assert.deepEqual(data.spaces['creator-minji'], before.spaces['creator-minji']);
  assert.deepEqual(M.getDocument(restored.text, referenceId), M.getDocument(before.spaces[actorId].text, referenceId));
  assert(validateProgramData(JSON.parse(JSON.stringify(data))));
});

test('ME12 retained Map read is exact-source-review only; active recurrence metadata, missing evidence, foreign owner and stale CAS remain closed', () => {
  const { f, data, id, documentId } = historicalPrivateFixture(), bytes = JSON.stringify(data);
  const input = { actorId, now: NOW, onlyFlowRef: f.flow.ref };
  assert.equal(prepareProgramLegacyView(data, input).ok, false, 'ordinary execution is not enabled by a private fixture');
  assert.equal(prepareProgramLegacyView(data, { ...input, actorId: 'creator-minji', sourceReview: true }).ok, false);
  const review = prepareProgramLegacyView(data, { ...input, sourceReview: true }); assert(review.ok);
  assert.equal(review.rebased, false); assert.deepEqual(review.payload, f.payload);
  const stale = applyProgramLegacySourceAction(data, { actorId, expectedToken: 'stale', action: f.activated() });
  assert(!stale.transition.ok); assert.equal(stale.transition.data, data);
  const noEvidence = structuredClone(data), payload = JSON.parse(noEvidence.spaces[actorId].legacySnapshot!.raw);
  delete payload.sourceLifecycle.owners[f.flow.ref]; noEvidence.spaces[actorId].legacySnapshot!.raw = JSON.stringify(payload);
  assert(validateProgramData(noEvidence));
  assert.equal(prepareProgramLegacyView(noEvidence, { ...input, sourceReview: true }).ok, false);
  const foreign = structuredClone(data); foreign.spaces[actorId].text.taskScopes[id] = 'folder-unfiled'; foreign.spaces[actorId].text.itemScopes[id] = 'folder-unfiled';
  assert.equal(prepareProgramLegacyView(foreign, { ...input, sourceReview: true }).ok, false);
  const activated = applyProgramLegacySourceAction(data, { actorId, expectedToken: review.token, action: f.activated() }); assert(activated.transition.ok);
  const changed = structuredClone(activated.transition.data), nextSpace = changed.spaces[actorId];
  const currentId = nextSpace.savedBindings.find(row => row.flowRef === f.flow.ref)!.itemLines[f.flow.items[0].ref];
  M.getDocument(nextSpace.text, documentId)!.lines.find(line => line.id === currentId)!.text = '- [ ] 활성 반복 메타데이터의 임의 변경';
  nextSpace.text.taskScopes[currentId] = documentId; nextSpace.text.itemScopes[currentId] = documentId;
  assert(validateProgramData(changed));
  assert.equal(prepareProgramLegacyView(changed, { ...input, sourceReview: true }).ok, false);
  assert.equal(JSON.stringify(data), bytes);
});

function restoredHistoricalData() {
  const prepared = historicalPrivateFixture(); let data = prepared.data;
  for (const action of [prepared.f.activated(), { type: 'undo' as const, flowRef: prepared.f.flow.ref, now: NOW }]) {
    const view = prepareProgramLegacyView(data, { actorId, now: NOW, onlyFlowRef: prepared.f.flow.ref, sourceReview: true }); assert(view.ok);
    const changed = applyProgramLegacySourceAction(data, { actorId, expectedToken: view.token, action }); assert(changed.transition.ok);
    data = changed.transition.data;
  }
  return { ...prepared, data, space: data.spaces[actorId] };
}

test('ME16 source Undo restored ordinary task resumes private progress through the actual editor guard, controller, failure retry and Undo', async () => {
  const { data, space, id, documentId } = restoredHistoricalData(), original = structuredClone(data);
  assert.equal(programReferenceExecutionAccess(space, id).kind, 'active');
  const nextText = M.recordProgress(space.text, id, '2026-09-13', 45);
  assert(programPreservesSeriesMetadata(space, nextText), 'restored private progress must not be silently rejected as active source metadata');
  // Keep recurrence metadata discoverable so past completed occurrences remain reachable.
  assert(programSeriesMetadata(space).some(row => row.lineId === id));
  const memory: Record<string, string> = { 'flow:protected': 'exact operating bytes' };
  let quota = false; const writes: string[] = [];
  const options = { initialData: data, storage: { getItem: (key: string) => memory[key] ?? null, setItem: (key: string, value: string) => { writes.push(key); if (quota) throw new Error('quota'); memory[key] = value; }, removeItem: (key: string) => { assert.fail(`unexpected remove ${key}`); } }, exclusive: async <T,>(work: () => T | Promise<T>) => work() };
  const controller = createProgramController(options); assert(controller.ok);
  const commit = () => controller.mutate('날짜별 누적 진행', current => {
    assert(programPreservesSeriesMetadata(current.spaces[actorId], nextText));
    const next = structuredClone(current); next.spaces[actorId].text = nextText; return programResult(current, next, documentId);
  }, { actorId });
  quota = true; assert.equal((await commit()).ok, false); assert.deepEqual(controller.snapshot().envelope.data, original);
  assert.equal(memory[PROGRAM_STATE_KEY], undefined);
  quota = false; assert((await commit()).ok);
  assert.deepEqual(controller.snapshot().envelope.data.spaces[actorId].text.progressRecords, nextText.progressRecords);
  assert.equal(controller.snapshot().envelope.data.spaces[actorId].legacySnapshot!.raw, space.legacySnapshot!.raw);
  assert.deepEqual(controller.snapshot().envelope.data.spaces['creator-minji'], original.spaces['creator-minji']);
  assert.equal(memory['flow:protected'], 'exact operating bytes'); assert(writes.every(key => key === PROGRAM_STATE_KEY));
  const reloaded = createProgramController(options); assert(reloaded.ok); assert.deepEqual(reloaded.snapshot().envelope.data, controller.snapshot().envelope.data);
  assert((await controller.undo(actorId)).ok); assert.deepEqual(controller.snapshot().envelope.data, original);
});

test('ME17 restored Map exception never authorizes an unconfirmed, foreign, moved, active-series or invalid source task', () => {
  const initial = historicalPrivateFixture();
  assert.equal(programPreservesSeriesMetadata(initial.space, M.recordProgress(initial.space.text, initial.id, '2026-09-13', 45)), false);
  for (const variant of ['missing-receipt', 'foreign-scope', 'missing-retention', 'invalid-source'] as const) {
    const restored = restoredHistoricalData(), space = restored.space;
    if (variant === 'foreign-scope') { space.text.taskScopes[restored.id] = 'folder-unfiled'; space.text.itemScopes[restored.id] = 'folder-unfiled'; }
    else if (variant === 'missing-retention') delete space.retentionDocuments;
    else { const payload = JSON.parse(space.legacySnapshot!.raw); if (variant === 'missing-receipt') { delete payload.sourceLifecycle.owners[restored.f.flow.ref].executionHandoffs; delete payload.sourceLifecycle.owners[restored.f.flow.ref].mapExecution; } else payload.model.flows[0].flowId = 'foreign'; space.legacySnapshot!.raw = JSON.stringify(payload); }
    const next = M.recordProgress(space.text, restored.id, '2026-09-13', 45);
    assert.equal(programPreservesSeriesMetadata(space, next), false, variant);
  }
  const active = activatedWholeMap(), space = active.data.spaces[actorId], metadata = programSeriesMetadata(space)[0];
  const next = structuredClone(space.text); M.getDocument(next, metadata.documentId)!.lines.find(line => line.id === metadata.lineId)!.text = '- [ ] active metadata cannot become a private task';
  assert.equal(programPreservesSeriesMetadata(space, next), false);
});
