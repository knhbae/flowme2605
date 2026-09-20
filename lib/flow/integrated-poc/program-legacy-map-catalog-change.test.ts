import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSourceBackedFlowMapSavedSnapshot, buildSourceBackedFlowMapPersistenceRecord, sourceBackedMyFlowBundles } from '../source-backed-my-flow';
import { buildPersonalWorkspacePocReadModel } from '../personal-workspace-poc-read-model';
import { createPersonalWorkspacePocState } from '../personal-workspace-poc-state';
import { createProgramData, validateProgramData } from './program-data';
import { hydrateProgramLegacy } from './legacy-projection';
import { programClone, PROGRAM_STATE_KEY, type ProgramData } from './contract';
import { readProgramLegacyMapPlan, previewProgramLegacyMapPlan, applyProgramLegacyMapPlan, type ProgramLegacyMapPlanDraft } from './program-legacy-map-plan';
import { inspectProgramLegacySnapshotPayload, type ProgramLegacySnapshotPayload } from './legacy-snapshot';
import { createProgramController } from './controller';
import { textWorkspaceModel as M } from './text-workspace';
import { prepareProgramLegacyView, applyProgramLegacySourceAction } from './legacy-transaction';
import { sourceCanonical, programLegacySourceChanges } from './legacy-source-lifecycle-contract';
import type { ProgramLegacySourceAction } from './legacy-source-lifecycle';

const now = '2026-09-13T14:00:00.000Z', actorId = 'local-user';
/** Structural model simulation on actual factory identities. Removing one
 * known row models an earlier/later catalog; it is not a real upstream release,
 * a browser action, or permission to alter operating saved keys. */
function fixture(earlierSubset = false) {
  const mapId = 'curated-opic-mock-course';
  const entries: Record<string, string> = {
    [`flow:map:saved:${mapId}`]: JSON.stringify(buildSourceBackedFlowMapSavedSnapshot(mapId, { savedAt: now, anchor: '2026-09-30' })),
    [`flow:map:persistence:${mapId}`]: JSON.stringify(buildSourceBackedFlowMapPersistenceRecord(mapId, { savedAt: now, anchor: '2026-09-30' })),
  };
  const read = buildPersonalWorkspacePocReadModel({ length: 2, key: i => Object.keys(entries)[i] ?? null, getItem: key => entries[key] ?? null }, sourceBackedMyFlowBundles);
  assert.ok(read.ok);
  const original = programClone(read.model), child = read.model.flows.find(flow => flow.title === '오픽 모의고사 2주 계획표')!;
  const target = child.items.at(-1)!;
  const model = earlierSubset ? { ...read.model, flows: read.model.flows.map(flow => flow.ref === child.ref ? { ...flow, items: flow.items.filter(item => item.ref !== target.ref) } : flow) } : read.model;
  const state = createPersonalWorkspacePocState(now);
  const pinned = child.items[0];
  state.placements[pinned.ref] = { itemRef: pinned.ref, scheduleMode: 'fixed_date', date: '2026-10-03', timelinePolicy: 'auto' };
  state.completions[pinned.ref] = { status: 'completed', completedAt: now };
  const hydrated = hydrateProgramLegacy(createProgramData(), model, state, { actorId, preserveUnsupported: true });
  assert.ok(hydrated.ok);
  return { data: hydrated.data, original, flowRef: child.ref, target, pinned, entries };
}
function draft(data: ProgramData, flowRef: string): ProgramLegacyMapPlanDraft {
  const current = readProgramLegacyMapPlan(data, actorId, flowRef, now); assert.ok(current.ok, JSON.stringify(current));
  return { personalAnchor: '2026-10-10', reviewSourceToken: current.token,
    children: Object.fromEntries(current.children.map(child => [child.flow.ref, { mode: { mode: 'follow-group' },
      selection: { reviewSourceToken: child.token, includedItemRefs: child.rows.filter(row => row.included).map(row => row.itemRef) } }])) };
}
function saveInitial(f: ReturnType<typeof fixture>) {
  const initial = applyProgramLegacyMapPlan(f.data, { actorId, flowRef: f.flowRef, now, draft: draft(f.data, f.flowRef), expectedSpace: f.data.spaces[actorId] });
  assert.ok(initial.ok, JSON.stringify(initial)); return initial.data;
}
function sourceAction(data: ProgramData, action: ProgramLegacySourceAction) {
  const view = prepareProgramLegacyView(data, { actorId, now, onlyFlowRef: action.flowRef, sourceReview: true }); assert.ok(view.ok, JSON.stringify(view));
  const result = applyProgramLegacySourceAction(data, { actorId, expectedToken: view.token, action });
  assert.ok(result.transition.ok, JSON.stringify({ issues: result.issues, conflicts: result.conflicts, reason: result.transition.ok ? '' : result.transition.reason }));
  return result.transition.data;
}
function acceptActualAddedRow(data: ProgramData, f: ReturnType<typeof fixture>) {
  const original = (JSON.parse(data.spaces[actorId].legacySnapshot!.raw) as ProgramLegacySnapshotPayload).model.flows.find(flow => flow.ref === f.flowRef)!;
  let current = sourceAction(data, { type: 'connect-map', flowRef: f.flowRef, requestId: 'catalog-connect', expectedSourceToken: sourceCanonical(original), now });
  current = sourceAction(current, { type: 'stage-map', flowRef: f.flowRef, requestId: 'catalog-stage', now });
  const owner = (JSON.parse(current.spaces[actorId].legacySnapshot!.raw) as ProgramLegacySnapshotPayload).sourceLifecycle!.owners[f.flowRef], review = owner.reviews.at(-1)!;
  const changes = programLegacySourceChanges(owner, review.incomingRevisionId);
  assert.ok(changes.some(change => change.itemRef === f.target.ref), 'actual current factory offers the row absent from simulated earlier subset');
  for (const change of changes) current = sourceAction(current, { type: 'choice', flowRef: f.flowRef, reviewId: review.id, changeId: change.id, choice: change.itemRef === f.target.ref ? 'incoming' : 'mine', now });
  return sourceAction(current, { type: 'apply', flowRef: f.flowRef, reviewId: review.id, now });
}

test('Map catalog addition requires explicit choice and preserves existing execution ownership on reload/Undo', async () => {
  const f = fixture(true), before = saveInitial(f), changed = acceptActualAddedRow(before, f);
  const current = readProgramLegacyMapPlan(changed, actorId, f.flowRef, now); assert.ok(current.ok, JSON.stringify(current)); assert.equal(current.stale, true);
  const child = current.children.find(row => row.flow.ref === f.flowRef)!;
  assert.equal(child.rows.find(row => row.itemRef === f.target.ref)?.pending, true);
  assert.equal(child.rows.find(row => row.itemRef === f.target.ref)?.included, false);
  const pending = draft(changed, f.flowRef), unresolved = previewProgramLegacyMapPlan(changed, { actorId, flowRef: f.flowRef, now, draft: pending });
  assert.equal(unresolved.ok, false); if (!unresolved.ok) assert.equal(unresolved.reason, 'new-items-need-explicit-choice');
  pending.children[f.flowRef].selection.newItemChoices = { [f.target.ref]: false };
  const excluded = previewProgramLegacyMapPlan(changed, { actorId, flowRef: f.flowRef, now, draft: pending }); assert.ok(excluded.ok, JSON.stringify(excluded));
  pending.children[f.flowRef].selection.newItemChoices = { [f.target.ref]: true };
  pending.children[f.flowRef].selection.includedItemRefs.push(f.target.ref);
  const values = new Map(Object.entries(f.entries)), writes: string[] = [];
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { assert.equal(key, PROGRAM_STATE_KEY); writes.push(key); values.set(key, value); }, removeItem: () => assert.fail('no remove') };
  const controller = createProgramController({ initialData: changed, storage, exclusive: async work => work() }); assert.ok(controller.ok);
  const applied = await controller.mutate('새 Map 항목 명시 포함', data => applyProgramLegacyMapPlan(data, { actorId, flowRef: f.flowRef, now, draft: pending, expectedSpace: changed.spaces[actorId] }), { actorId });
  assert.ok(applied.ok, JSON.stringify(applied)); assert.equal(writes.length, 1);
  const after = controller.snapshot().envelope.data.spaces[actorId], payload: ProgramLegacySnapshotPayload = JSON.parse(after.legacySnapshot!.raw);
  assert.deepEqual(payload.state.completions, JSON.parse(changed.spaces[actorId].legacySnapshot!.raw).state.completions);
  assert.deepEqual(payload.state.placements, JSON.parse(changed.spaces[actorId].legacySnapshot!.raw).state.placements);
  assert.ok(payload.planSelections!.flows[f.flowRef].includedItemRefs.includes(f.target.ref));
  const originalBinding = changed.spaces[actorId].savedBindings.find(row => row.flowRef === f.flowRef)!;
  const newBinding = after.savedBindings.find(row => row.flowRef === f.flowRef)!;
  for (const [ref, lineId] of Object.entries(originalBinding.itemLines)) assert.equal(newBinding.itemLines[ref], lineId);
  assert.ok(newBinding.itemLines[f.target.ref]);
  const reload = createProgramController({ initialData: changed, storage, exclusive: async work => work() }); assert.ok(reload.ok); assert.equal(writes.length, 1);
  assert.ok((await reload.undo(actorId)).ok); assert.deepEqual(reload.snapshot().envelope.data.spaces[actorId], changed.spaces[actorId]);
  for (const [key, value] of Object.entries(f.entries)) assert.equal(values.get(key), value);
});

test('Map source Undo explicitly retains added-row private history rather than deleting it', () => {
  const f = fixture(true), initial = acceptActualAddedRow(saveInitial(f), f), pending = draft(initial, f.flowRef);
  pending.children[f.flowRef].selection.newItemChoices = { [f.target.ref]: true }; pending.children[f.flowRef].selection.includedItemRefs.push(f.target.ref);
  const selected = applyProgramLegacyMapPlan(initial, { actorId, flowRef: f.flowRef, now, draft: pending, expectedSpace: initial.spaces[actorId] }); assert.ok(selected.ok);
  const space = selected.data.spaces[actorId];
  const binding = space.savedBindings.find(row => row.flowRef === f.flowRef)!, targetLine = binding.itemLines[f.target.ref];
  assert.ok(targetLine); space.text = M.recordProgress(space.text, targetLine, '2026-10-02', 35);
  const oldDocument = M.getDocument(space.text, binding.documentId), records = programClone(space.text.progressRecords);
  assert.ok(records.some(record => record.taskId === targetLine && record.percent === 35), 'fixture records actual private progress before catalog removal');
  const view = prepareProgramLegacyView(selected.data, { actorId, now, onlyFlowRef: f.flowRef, sourceReview: true }); assert.ok(view.ok, JSON.stringify(view));
  const refused = applyProgramLegacySourceAction(selected.data, { actorId, expectedToken: view.token, action: { type: 'undo', flowRef: f.flowRef, now } }); assert.equal(refused.transition.ok, false); assert.deepEqual(refused.transition.data, selected.data);
  const applied = sourceAction(selected.data, { type: 'undo', flowRef: f.flowRef, now, retainAddedItemRefs: [f.target.ref] });
  const final = applied.spaces[actorId], payload: ProgramLegacySnapshotPayload = JSON.parse(final.legacySnapshot!.raw);
  assert.deepEqual(final.text.progressRecords, records);
  assert.ok([...final.text.documents, ...final.text.flows].some(document => document.lines.some(line => line.id === targetLine)), 'past row identity remains addressable in its original document/Flow owner');
  assert.ok(payload.planSelections!.flows[f.flowRef].catalogItemRefs.includes(f.target.ref), 'retained decision is not silently forgotten');
  assert.ok(oldDocument!.lines.some(line => line.id === targetLine));
  assert.ok(payload.sourceLifecycle!.owners[f.flowRef].effective.retainedItemRefs.includes(f.target.ref));
  assert.ok(validateProgramData(applied)); assert.ok(inspectProgramLegacySnapshotPayload(payload).ok);
});
