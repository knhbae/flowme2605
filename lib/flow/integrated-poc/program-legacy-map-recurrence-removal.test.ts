import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildSourceBackedFlowMapSavedSnapshot, buildSourceBackedFlowMapPersistenceRecord, sourceBackedMyFlowBundles } from '../source-backed-my-flow';
import { buildPersonalWorkspacePocReadModel } from '../personal-workspace-poc-read-model';
import { createPersonalWorkspacePocState } from '../personal-workspace-poc-state';
import { createProgramData, createProgramEnvelope, validateProgramData } from './program-data';
import { hydrateProgramLegacy } from './legacy-projection';
import { prepareProgramLegacyView, applyProgramLegacySourceAction } from './legacy-transaction';
import type { ProgramLegacySourceAction } from './legacy-source-lifecycle';
import { programLegacySourceChanges, sourceCanonical } from './legacy-source-lifecycle-contract';
import type { ProgramLegacySnapshotPayload } from './legacy-snapshot';
import { PROGRAM_STATE_KEY, programClone, type ProgramData } from './contract';
import { createProgramController } from './controller';
import { readProgramExecutionOccurrences, updateProgramOccurrenceExecution } from './recurrence-state';
import { readProgramOccurrenceRecovery } from './recurrence-recovery';
import { inspectProgramRecurrence } from './recurrence-bridge';
import { resolveProgramExecutionSource } from './execution-source';
import { programExecutionTasks } from './execution';
import { textWorkspaceModel as M } from './text-workspace';

const now = '2026-09-14T11:00:00.000Z', actorId = 'local-user', start = '2026-09-30';
const payload = (data: ProgramData): ProgramLegacySnapshotPayload => JSON.parse(data.spaces[actorId].legacySnapshot!.raw);
function transition(data: ProgramData, action: ProgramLegacySourceAction) {
  const view = prepareProgramLegacyView(data, { actorId, now, onlyFlowRef: action.flowRef, sourceReview: true });
  assert(view.ok, JSON.stringify(view));
  return applyProgramLegacySourceAction(data, { actorId, expectedToken: view.token, action });
}
function apply(data: ProgramData, action: ProgramLegacySourceAction) {
  const result = transition(data, action);
  assert(result.transition.ok, JSON.stringify({ action: action.type, issues: result.issues, conflicts: result.conflicts, reason: result.transition.ok ? '' : result.transition.reason }));
  assert(validateProgramData(result.transition.data));
  return result.transition.data;
}
function choose(data: ProgramData, flowRef: string, reviewId: string) {
  const owner = payload(data).sourceLifecycle!.owners[flowRef], review = owner.reviews.find(row => row.id === reviewId)!;
  for (const change of programLegacySourceChanges(owner, review.incomingRevisionId)) {
    data = apply(data, { type: 'choice', flowRef, reviewId, changeId: change.id, choice: 'incoming', now });
  }
  return data;
}

/** Real factory IDs and rule; a later removal is explicitly simulated in this
 * isolated test worker only. Restore the original object even after failure. */
function fixture(t: TestContext) {
  const mapId = 'curated-allblanc-workout-park', flowId = 'flow-curated-allblanc-no-jump-cardio';
  const entries: Record<string, string> = {
    [`flow:map:saved:${mapId}`]: JSON.stringify(buildSourceBackedFlowMapSavedSnapshot(mapId, { savedAt: now, anchor: start })),
    [`flow:map:persistence:${mapId}`]: JSON.stringify(buildSourceBackedFlowMapPersistenceRecord(mapId, { savedAt: now, anchor: start })),
    'flow:operating-recurrence-removal': '{ "private": "preserve exact bytes" }',
  };
  const keys = Object.keys(entries), read = buildPersonalWorkspacePocReadModel({ length: keys.length, key: index => keys[index] ?? null, getItem: key => entries[key] ?? null }, sourceBackedMyFlowBundles);
  assert(read.ok);
  const flow = read.model.flows.find(row => row.flowId === flowId)!; assert(flow);
  const target = flow.items.find(item => item.itemId === 'allblanc-no-jump-run')!; assert(target);
  const index = sourceBackedMyFlowBundles.findIndex(bundle => bundle.flow.id === flow.flowId), original = sourceBackedMyFlowBundles[index]; assert(original);
  const originalBytes = JSON.stringify(original);
  assert.equal(original.items.find(item => item.id === target.itemId)!.repeat_rule, 'FREQ=WEEKLY;BYDAY=TU,TH');
  t.after(() => { sourceBackedMyFlowBundles[index] = original; assert.equal(JSON.stringify(original), originalBytes); });
  const hydrated = hydrateProgramLegacy(createProgramData(), read.model, createPersonalWorkspacePocState(now), { actorId, preserveUnsupported: true }); assert(hydrated.ok);
  let data = apply(hydrated.data, { type: 'connect-map', flowRef: flow.ref, requestId: 'connect', expectedSourceToken: sourceCanonical(flow), now });
  data = apply(data, { type: 'stage-map', flowRef: flow.ref, requestId: 'read-original', now });
  data = choose(data, flow.ref, 'read-original');
  data = apply(data, { type: 'apply', flowRef: flow.ref, reviewId: 'read-original', now });
  data = apply(data, { type: 'activate-map-recurrence', flowRef: flow.ref, requestId: 'activate-real-rule',
    itemRefs: [target.ref], expectedSelection: sourceCanonical(payload(data).sourceLifecycle!.owners[flow.ref].effective), now });
  const input = { actorId, flowRef: flow.ref, localToday: start };
  const occurrences = readProgramExecutionOccurrences(data, input); assert(occurrences.ok); assert.equal(occurrences.rows.length, 8);
  const first = occurrences.rows[0]; assert.equal(first.originalDate, '2026-10-01');
  const recorded = updateProgramOccurrenceExecution(data, { ...input, identity: first.identity, expected: null,
    changes: { schedule: { mode: 'fixed_date', date: '2026-10-03' }, completion: { status: 'completed', completedAt: now } } });
  assert(recorded.ok); data = recorded.data;
  const binding = data.spaces[actorId].savedBindings.find(row => row.flowRef === flow.ref)!;
  return { data, flow, target, input, first, entries, lineId: binding.itemLines[target.ref], documentId: binding.documentId,
    remove: () => { const next = programClone(original); next.items = next.items.filter(item => item.id !== target.itemId);
      if (next.itemDetails) next.itemDetails = next.itemDetails.filter(detail => detail.item_id !== target.itemId);
      sourceBackedMyFlowBundles[index] = next; },
    restore: () => { sourceBackedMyFlowBundles[index] = original; } };
}

test('removing an activated real Map recurrence retains completed occurrences without converting its metadata to an ordinary task', t => {
  const f = fixture(t); f.remove();
  let data = apply(f.data, { type: 'stage-map', flowRef: f.flow.ref, requestId: 'simulated-series-removal', now });
  const owner = payload(data).sourceLifecycle!.owners[f.flow.ref], review = owner.reviews.at(-1)!;
  assert(programLegacySourceChanges(owner, review.incomingRevisionId).some(change => change.kind === 'removed' && change.itemRef === f.target.ref));
  data = choose(data, f.flow.ref, review.id);
  const before = programClone(data);
  data = apply(data, { type: 'apply', flowRef: f.flow.ref, reviewId: review.id, now });
  assert(payload(data).sourceLifecycle!.owners[f.flow.ref].effective.retainedItemRefs.includes(f.target.ref));
  assert.deepEqual(data.spaces[actorId].recurrenceExecution, before.spaces[actorId].recurrenceExecution);
  assert.deepEqual(data.spaces[actorId].text.progressRecords, before.spaces[actorId].text.progressRecords);
  assert(!programExecutionTasks(data.spaces[actorId]).some(row => row.docId === f.documentId), 'removed recurrence metadata must not become an ordinary new execution');
  const after = readProgramExecutionOccurrences(data, f.input); assert(after.ok);
  assert.equal(after.rows.filter(row => row.identity.sourceItemRef === f.target.ref && !row.flowInactive && !row.sourceConflict).length, 0);
  const source = resolveProgramExecutionSource(data.spaces[actorId], f.flow.ref); assert(source.ok);
  assert.equal(source.contexts.has(f.target.ref), false, 'active execution reader excludes the retained source');
  const bridge = inspectProgramRecurrence(payload(data), { flowRef: f.flow.ref, localToday: start }); assert(bridge.ok);
  assert.equal(bridge.rows.filter(row => row.sourceItemRef === f.target.ref).length, 0, 'legacy recurrence bridge also excludes retained source');
  const retained = readProgramOccurrenceRecovery(data, { actorId, localToday: start, flowRefs: [f.flow.ref] });
  assert.equal(retained.length, 1); assert.equal(retained[0].stored.completion?.status, 'completed');
  assert.equal(retained[0].stored.schedule?.date, '2026-10-03'); assert.equal(retained[0].canReconnect, false);
  const binding = data.spaces[actorId].savedBindings.find(row => row.flowRef === f.flow.ref)!;
  assert.equal(binding.itemLines[f.target.ref], f.lineId,
    'source membership removal must retain the series metadata identity rather than create an ordinary unmapped identity');
  assert(M.getDocument(data.spaces[actorId].text, f.documentId)!.lines.some(line => line.id === f.lineId));
  assert.deepEqual(M.getDocument(data.spaces[actorId].text, f.documentId), M.getDocument(before.spaces[actorId].text, f.documentId),
    'source absence does not rewrite the retained personal document or its source metadata');
  if (process.env.FLOWME_MAP_RECURRENCE_REMOVAL_CAPTURE === '1') {
    const directory = new URL('../../../output/integrated-product-poc/', import.meta.url); mkdirSync(directory, { recursive: true });
    writeFileSync(new URL('map-recurrence-removal-browser-fixture.json', directory), JSON.stringify({
      evidenceKind: 'simulated-recurring-item-removal-through-actual-factory', generatedBy: fileURLToPath(import.meta.url),
      entries: f.entries, envelope: createProgramEnvelope(before), flowRef: f.flow.ref, itemRef: f.target.ref,
      lineId: f.lineId, documentId: f.documentId, reviewId: review.id, occurrenceKey: f.first.key,
      originalDate: f.first.originalDate, executionDate: '2026-10-03', acceptedSpace: data.spaces[actorId],
    }, null, 2));
  }
});

test('explicit reappearance of a removed Map recurrence preserves exact records through source choices, Undo and store reload', async t => {
  const f = fixture(t); f.remove();
  let data = apply(f.data, { type: 'stage-map', flowRef: f.flow.ref, requestId: 'remove-before-return', now });
  data = choose(data, f.flow.ref, 'remove-before-return');
  data = apply(data, { type: 'apply', flowRef: f.flow.ref, reviewId: 'remove-before-return', now });
  const records = programClone(data.spaces[actorId].recurrenceExecution);
  f.restore();
  data = apply(data, { type: 'stage-map', flowRef: f.flow.ref, requestId: 'actual-item-returned', now });
  const owner = payload(data).sourceLifecycle!.owners[f.flow.ref], review = owner.reviews.at(-1)!;
  assert(programLegacySourceChanges(owner, review.incomingRevisionId).some(change => change.itemRef === f.target.ref));
  data = choose(data, f.flow.ref, review.id);
  const values = new Map(Object.entries(f.entries)), writes: string[] = [];
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => {
    assert.equal(key, PROGRAM_STATE_KEY); writes.push(key); values.set(key, value);
  }, removeItem: () => assert.fail('no remove'), clear: () => assert.fail('no clear') };
  const controller = createProgramController({ initialData: data, storage, exclusive: async work => work() }); assert(controller.ok);
  const before = controller.snapshot();
  const restored = await controller.mutate('반복 항목 재등장 수용', current => {
    const result = transition(current, { type: 'apply', flowRef: f.flow.ref, reviewId: review.id, now });
    if (!result.transition.ok) t.diagnostic(JSON.stringify({ issues: result.issues, conflicts: result.conflicts, reason: result.transition.reason }));
    return result.transition;
  }, { actorId });
  assert(restored.ok, JSON.stringify(restored));
  const accepted = controller.snapshot().envelope.data;
  assert.deepEqual(accepted.spaces[actorId].recurrenceExecution, records);
  assert(!payload(accepted).sourceLifecycle!.owners[f.flow.ref].effective.retainedItemRefs.includes(f.target.ref));
  assert(!programExecutionTasks(accepted.spaces[actorId]).some(row => row.id === f.lineId));
  const after = readProgramExecutionOccurrences(accepted, f.input); assert(after.ok);
  assert.equal(after.rows.length, 8); assert.equal(new Set(after.rows.map(row => row.key)).size, 8);
  const same = after.rows.find(row => row.key === f.first.key)!; assert(same);
  assert.equal(same.completion, 'completed'); assert.equal(same.executionDate, '2026-10-03');
  assert((await controller.undo(actorId)).ok); assert.deepEqual(controller.snapshot().envelope.data.spaces, before.envelope.data.spaces);
  const reload = createProgramController({ initialData: createProgramData(), storage, exclusive: async work => work() }); assert(reload.ok);
  assert.deepEqual(reload.snapshot(), controller.snapshot());
  for (const [key, raw] of Object.entries(f.entries)) assert.equal(values.get(key), raw);
  assert(writes.every(key => key === PROGRAM_STATE_KEY));
});
