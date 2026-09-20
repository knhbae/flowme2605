import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildSourceBackedFlowMapSavedSnapshot, buildSourceBackedFlowMapPersistenceRecord, sourceBackedMyFlowBundles } from '../source-backed-my-flow';
import { buildPersonalWorkspacePocReadModel } from '../personal-workspace-poc-read-model';
import { createPersonalWorkspacePocState } from '../personal-workspace-poc-state';
import { createProgramData, validateProgramData } from './program-data';
import { hydrateProgramLegacy } from './legacy-projection';
import { prepareProgramLegacyView, applyProgramLegacySourceAction } from './legacy-transaction';
import { transitionProgramLegacySourcePayload, type ProgramLegacySourceAction } from './legacy-source-lifecycle';
import { programLegacySourceChanges, sourceCanonical } from './legacy-source-lifecycle-contract';
import { inspectProgramLegacySnapshotPayload, type ProgramLegacySnapshotPayload } from './legacy-snapshot';
import { PROGRAM_STATE_KEY, programClone, type ProgramData } from './contract';
import { createProgramController } from './controller';
import { recordProgramTaskProgress, updateProgramTask } from './private-space';
import { programExecutionTasks } from './execution';
import { textWorkspaceModel as M } from './text-workspace';

const now = '2026-09-14T10:00:00.000Z', actorId = 'local-user';
const payload = (data: ProgramData): ProgramLegacySnapshotPayload => JSON.parse(data.spaces[actorId].legacySnapshot!.raw);
function transition(data: ProgramData, action: ProgramLegacySourceAction) {
  const view = prepareProgramLegacyView(data, { actorId, now: action.now, onlyFlowRef: action.flowRef, sourceReview: true });
  assert.ok(view.ok, JSON.stringify(view));
  return applyProgramLegacySourceAction(data, { actorId, expectedToken: view.token, action });
}
function apply(data: ProgramData, action: ProgramLegacySourceAction) {
  const result = transition(data, action);
  assert.ok(result.transition.ok, JSON.stringify({ issues: result.issues, conflicts: result.conflicts }));
  return result.transition.data;
}
function choose(data: ProgramData, flowRef: string, reviewId: string) {
  const owner = payload(data).sourceLifecycle!.owners[flowRef];
  const review = owner.reviews.find(row => row.id === reviewId)!;
  for (const change of programLegacySourceChanges(owner, review.incomingRevisionId)) {
    data = apply(data, { type: 'choice', flowRef, reviewId, changeId: change.id, choice: 'incoming', now });
  }
  return data;
}

/** A simulated later catalog on actual factory identities. Only this isolated
 * test worker's exported array entry is replaced; original source files,
 * browser state and operating storage are never changed. Every test restores
 * the exact original object even when an assertion fails. */
function fixture(t: TestContext) {
  const mapId = 'curated-opic-mock-course';
  const entries: Record<string, string> = {
    [`flow:map:saved:${mapId}`]: JSON.stringify(buildSourceBackedFlowMapSavedSnapshot(mapId, { savedAt: now, anchor: '2026-09-30' })),
    [`flow:map:persistence:${mapId}`]: JSON.stringify(buildSourceBackedFlowMapPersistenceRecord(mapId, { savedAt: now, anchor: '2026-09-30' })),
    'flow:operating-removal-sentinel': '{ "private" : " keep exact spaces " }',
  };
  const keys = Object.keys(entries);
  const read = buildPersonalWorkspacePocReadModel({ length: keys.length, key: index => keys[index] ?? null, getItem: key => entries[key] ?? null }, sourceBackedMyFlowBundles);
  assert.ok(read.ok, JSON.stringify(read));
  const original = programClone(read.model), flow = original.flows.find(row => row.title === '오픽 모의고사 2주 계획표')!;
  assert.ok(flow);
  const target = flow.items.at(-1)!;
  const index = sourceBackedMyFlowBundles.findIndex(bundle => bundle.flow.id === flow.flowId);
  assert.ok(index >= 0);
  const originalBundle = sourceBackedMyFlowBundles[index], originalBytes = JSON.stringify(originalBundle);
  t.after(() => { sourceBackedMyFlowBundles[index] = originalBundle; assert.equal(JSON.stringify(originalBundle), originalBytes); });
  const hydrated = hydrateProgramLegacy(createProgramData(), original, createPersonalWorkspacePocState(now), { actorId, preserveUnsupported: true });
  assert.ok(hydrated.ok);
  let data = apply(hydrated.data, { type: 'connect-map', flowRef: flow.ref, requestId: 'connect-original-map', expectedSourceToken: sourceCanonical(flow), now });
  data = apply(data, { type: 'stage-map', flowRef: flow.ref, requestId: 'read-original-catalog', now });
  data = choose(data, flow.ref, 'read-original-catalog');
  data = apply(data, { type: 'apply', flowRef: flow.ref, reviewId: 'read-original-catalog', now });
  const binding = data.spaces[actorId].savedBindings.find(row => row.flowRef === flow.ref)!;
  const lineId = binding.itemLines[target.ref]; assert.ok(lineId);
  const edited = updateProgramTask(data, { actorId, expectedSpace: data.spaces[actorId], requestId: 'private-date-note', taskId: lineId,
    patch: { date: '2026-10-05', note: '개인적으로 보존할 기록', title: '내가 정한 마지막 실행' } });
  assert.ok(edited.ok); data = edited.data;
  const progressed = recordProgramTaskProgress(data, { actorId, expectedSpace: data.spaces[actorId], requestId: 'private-progress', taskId: lineId, date: '2026-10-05', percent: 35 });
  assert.ok(progressed.ok); data = progressed.data;
  const remove = () => {
    const next = programClone(originalBundle);
    next.items = next.items.filter(item => item.id !== target.itemId);
    if (next.itemDetails) next.itemDetails = next.itemDetails.filter(detail => detail.item_id !== target.itemId);
    sourceBackedMyFlowBundles[index] = next;
  };
  return { data, flowRef: flow.ref, target, lineId, documentId: binding.documentId, entries, original, remove,
    changeOtherSourceItem: () => {
      const next = programClone(sourceBackedMyFlowBundles[index]);
      next.items[0].title += ' · 후속 catalog 가상 변경';
      sourceBackedMyFlowBundles[index] = next;
    },
    restore: () => { sourceBackedMyFlowBundles[index] = originalBundle; } };
}

test('accepted Map removal is not offered again and does not rewrite private records or operating keys', async t => {
  const f = fixture(t); f.remove();
  let staged = apply(f.data, { type: 'stage-map', flowRef: f.flowRef, requestId: 'simulated-deletion', now });
  const stagedOwner = payload(staged).sourceLifecycle!.owners[f.flowRef];
  assert.ok(programLegacySourceChanges(stagedOwner, stagedOwner.reviews.at(-1)!.incomingRevisionId).some(change => change.kind === 'removed' && change.itemRef === f.target.ref));
  staged = choose(staged, f.flowRef, 'simulated-deletion');
  const beforeSpace = programClone(staged.spaces[actorId]);
  const values = new Map(Object.entries(f.entries)), writes: string[] = [];
  let quota = false;
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, raw: string) => {
    assert.equal(key, PROGRAM_STATE_KEY); if (quota) throw Error('simulated quota'); writes.push(key); values.set(key, raw);
  }, removeItem: () => assert.fail('no remove'), clear: () => assert.fail('no clear') };
  const controller = createProgramController({ initialData: staged, storage, exclusive: async work => work() }); assert.ok(controller.ok);
  const pendingEnvelope = programClone(controller.snapshot().envelope);
  const commit = (action: ProgramLegacySourceAction) => controller.mutate('원본 변경', data => transition(data, action).transition, { actorId });
  quota = true;
  assert.equal((await commit({ type: 'apply', flowRef: f.flowRef, reviewId: 'simulated-deletion', now })).ok, false);
  assert.equal(writes.length, 0); assert.deepEqual(controller.snapshot().envelope.data, staged);
  quota = false;
  assert.ok((await commit({ type: 'apply', flowRef: f.flowRef, reviewId: 'simulated-deletion', now })).ok);
  assert.equal(writes.length, 1);
  const accepted = controller.snapshot().envelope.data, after = accepted.spaces[actorId], stored = payload(accepted);
  assert.deepEqual(stored.model, f.original);
  assert.ok(stored.sourceLifecycle!.owners[f.flowRef].effective.retainedItemRefs.includes(f.target.ref));
  assert.deepEqual(after.text.progressRecords, beforeSpace.text.progressRecords);
  assert.deepEqual(M.getDocument(after.text, f.documentId), M.getDocument(beforeSpace.text, f.documentId));
  assert.deepEqual(after.savedBindings.find(row => row.flowRef === f.flowRef)?.itemLines, beforeSpace.savedBindings.find(row => row.flowRef === f.flowRef)?.itemLines);
  const execution = programExecutionTasks(after, { period: 'today', date: '2026-10-05' }).find(task => task.id === f.lineId);
  assert.ok(execution, JSON.stringify({ before: programExecutionTasks(beforeSpace, { period: 'today', date: '2026-10-05' }).find(task => task.id === f.lineId),
    after: execution, task: M.tasks(after.text).find(task => task.id === f.lineId) }));
  assert.equal(M.progressHistory(after.text, f.lineId).at(-1)?.percent, 35);
  assert.ok(validateProgramData(accepted)); assert.ok(inspectProgramLegacySnapshotPayload(stored).ok);
  const repeated = transitionProgramLegacySourcePayload(stored, { type: 'stage-map', flowRef: f.flowRef, requestId: 'same-deletion-again', now });
  assert.equal(repeated.ok, false, 'the already acknowledged removal is not another pending source change');
  if (!repeated.ok) assert.equal(repeated.reason, 'no-source-change');
  assert.equal((await commit({ type: 'stage-map', flowRef: f.flowRef, requestId: 'same-deletion-again', now })).ok, false);
  assert.equal(writes.length, 1);
  const reloaded = createProgramController({ initialData: createProgramData(), storage, exclusive: async work => work() }); assert.ok(reloaded.ok);
  assert.deepEqual(reloaded.snapshot().envelope, controller.snapshot().envelope);
  assert.ok((await reloaded.undo(actorId)).ok);
  assert.deepEqual(reloaded.snapshot().envelope.data.spaces[actorId], beforeSpace);
  for (const [key, raw] of Object.entries(f.entries)) assert.equal(values.get(key), raw);
  if (process.env.FLOWME_MAP_REMOVAL_CAPTURE === '1') {
    const directory = new URL('../../../output/integrated-product-poc/', import.meta.url); mkdirSync(directory, { recursive: true });
    writeFileSync(new URL('map-removal-browser-fixture.json', directory), JSON.stringify({ evidenceKind: 'simulated-later-catalog-through-actual-factory',
      generatedBy: fileURLToPath(import.meta.url), entries: f.entries, envelope: pendingEnvelope, flowRef: f.flowRef, itemRef: f.target.ref,
      lineId: f.lineId, documentId: f.documentId, reviewId: 'simulated-deletion', acceptedSpace: after }, null, 2));
  }
});

test('a retained Map item offered again with identical content still requires explicit restoration', t => {
  const f = fixture(t); f.remove();
  let data = apply(f.data, { type: 'stage-map', flowRef: f.flowRef, requestId: 'remove-before-return', now });
  data = choose(data, f.flowRef, 'remove-before-return');
  data = apply(data, { type: 'apply', flowRef: f.flowRef, reviewId: 'remove-before-return', now });
  const before = programClone(data.spaces[actorId]);
  f.restore();
  data = apply(data, { type: 'stage-map', flowRef: f.flowRef, requestId: 'identical-item-returned', now });
  const owner = payload(data).sourceLifecycle!.owners[f.flowRef], review = owner.reviews.at(-1)!;
  assert.ok(programLegacySourceChanges(owner, review.incomingRevisionId).some(change => change.itemRef === f.target.ref),
    'reappearance changes membership even though preserved content is byte-identical');
  data = choose(data, f.flowRef, review.id);
  data = apply(data, { type: 'apply', flowRef: f.flowRef, reviewId: review.id, now });
  assert.ok(!payload(data).sourceLifecycle!.owners[f.flowRef].effective.retainedItemRefs.includes(f.target.ref));
  assert.deepEqual(data.spaces[actorId].text.progressRecords, before.text.progressRecords);
  assert.deepEqual(M.getDocument(data.spaces[actorId].text, f.documentId), M.getDocument(before.text, f.documentId));
  assert.ok(validateProgramData(data));
  data = apply(data, { type: 'undo', flowRef: f.flowRef, now });
  const undoneOwner = payload(data).sourceLifecycle!.owners[f.flowRef];
  assert.ok(undoneOwner.effective.retainedItemRefs.includes(f.target.ref), 'source-only Undo restores the retained membership');
  assert.ok(programLegacySourceChanges(undoneOwner, review.incomingRevisionId).some(change => change.itemRef === f.target.ref));
  assert.deepEqual(data.spaces[actorId].text.progressRecords, before.text.progressRecords);
});

test('older persisted duplicate-removal reviews remain readable without making obsolete choices actionable', t => {
  const f = fixture(t); f.remove();
  let data = apply(f.data, { type: 'stage-map', flowRef: f.flowRef, requestId: 'original-removal', now });
  data = choose(data, f.flowRef, 'original-removal');
  data = apply(data, { type: 'apply', flowRef: f.flowRef, reviewId: 'original-removal', now });
  const stored = payload(data), owner = stored.sourceLifecycle!.owners[f.flowRef];
  const incomingRevisionId = owner.reviews.at(-1)!.incomingRevisionId;
  // Reconstruct precisely the earlier writer's already-acknowledged review;
  // no invented source data or new producer is introduced by this legacy fixture.
  owner.reviews.push({ id: 'legacy-duplicate-removal', incomingRevisionId, expectedSelection: sourceCanonical(owner.effective),
    choices: { [`item:${f.target.ref}`]: 'incoming' }, status: 'pending', createdAt: now });
  const raw = JSON.stringify(stored);
  assert.ok(inspectProgramLegacySnapshotPayload(JSON.parse(raw)).ok, 'earlier valid payload must not fail closed after this comparator update');
  assert.deepEqual(programLegacySourceChanges(owner, incomingRevisionId), []);
  assert.equal(programLegacySourceChanges(owner, incomingRevisionId, { includeAcknowledgedRemovals: true }).length, 1);
  const refused = transitionProgramLegacySourcePayload(stored, { type: 'apply', flowRef: f.flowRef, reviewId: 'legacy-duplicate-removal', now });
  assert.equal(refused.ok, false); assert.equal(JSON.stringify(stored), raw);
});

test('older mixed review can apply its real change while retaining obsolete removal choices as evidence', t => {
  const f = fixture(t); f.remove();
  let data = apply(f.data, { type: 'stage-map', flowRef: f.flowRef, requestId: 'before-mixed-removal', now });
  data = choose(data, f.flowRef, 'before-mixed-removal');
  data = apply(data, { type: 'apply', flowRef: f.flowRef, reviewId: 'before-mixed-removal', now });
  f.changeOtherSourceItem();
  data = apply(data, { type: 'stage-map', flowRef: f.flowRef, requestId: 'mixed-historical-review', now });
  data = choose(data, f.flowRef, 'mixed-historical-review');
  const stored = payload(data), owner = stored.sourceLifecycle!.owners[f.flowRef], review = owner.reviews.at(-1)!;
  review.choices[`item:${f.target.ref}`] = 'incoming';
  assert.ok(inspectProgramLegacySnapshotPayload(JSON.parse(JSON.stringify(stored))).ok);
  data.spaces[actorId].legacySnapshot!.raw = JSON.stringify(stored);
  const reloaded = programClone(data), oldChoices = programClone(review.choices), records = programClone(reloaded.spaces[actorId].text.progressRecords);
  assert.ok(validateProgramData(reloaded));
  const result = apply(reloaded, { type: 'apply', flowRef: f.flowRef, reviewId: review.id, now });
  const updated = payload(result).sourceLifecycle!.owners[f.flowRef];
  assert.ok(updated.effective.retainedItemRefs.includes(f.target.ref));
  assert.deepEqual(updated.reviews.at(-1)!.choices, oldChoices, 'reading/applying does not clean up historical evidence');
  assert.deepEqual(result.spaces[actorId].text.progressRecords, records);
  assert.ok(inspectProgramLegacySnapshotPayload(payload(result)).ok);
  const checked = inspectProgramLegacySnapshotPayload(payload(result)); assert.ok(checked.ok);
  assert.ok(checked.model.flows.find(flow => flow.ref === f.flowRef)!.items[0].title.endsWith('후속 catalog 가상 변경'));
  const forged = programClone(stored); forged.sourceLifecycle!.owners[f.flowRef].reviews.at(-1)!.choices['item:foreign-id'] = 'incoming';
  assert.equal(inspectProgramLegacySnapshotPayload(forged).ok, false, 'unknown choices are not hidden by the legacy compatibility rule');
});
