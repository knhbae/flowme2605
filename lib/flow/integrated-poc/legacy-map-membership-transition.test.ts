import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildSourceBackedFlowMapSavedSnapshot, buildSourceBackedFlowMapPersistenceRecord, sourceBackedMyFlowBundles, sourceBackedMyFlowMaps } from '../source-backed-my-flow';
import { buildPersonalWorkspacePocReadModel } from '../personal-workspace-poc-read-model';
import { createPersonalWorkspacePocState } from '../personal-workspace-poc-state';
import { createProgramData, validateProgramData } from './program-data';
import { programClone, PROGRAM_STATE_KEY, type ProgramData } from './contract';
import { hydrateProgramLegacy } from './legacy-projection';
import { inspectProgramLegacySnapshotPayload, type ProgramLegacySnapshotPayload } from './legacy-snapshot';
import { readProgramLegacyMapMembership, transitionProgramLegacyMapMembershipPayload, applyProgramLegacyMapMembershipAction,
  previewProgramLegacyMapMembership, applyProgramLegacyMapMembershipPreview,
  type ProgramLegacyMapMembershipAction } from './legacy-map-membership-transition';
import { programLegacyMapMembershipReviewChanges, validateProgramLegacyMapMembershipStore } from './legacy-map-membership-state';
import { createProgramController } from './controller';
import { recordProgramTaskProgress, updateProgramTask } from './private-space';
import { programExecutionTasks } from './execution';
import { textWorkspaceModel as M } from './text-workspace';
import { readProgramLegacyMapPlan, applyProgramLegacyMapPlan, type ProgramLegacyMapPlanDraft } from './program-legacy-map-plan';
import { prepareProgramLegacyView, applyProgramLegacyAction, applyProgramLegacySourceAction } from './legacy-transaction';
import { reconcileProgramLegacy } from './legacy-reconcile';
import { readProgramExecutionOccurrences, updateProgramOccurrenceExecution } from './recurrence-state';
import { sourceCanonical, programLegacySourceChanges } from './legacy-source-lifecycle-contract';
import type { ProgramLegacySourceAction } from './legacy-source-lifecycle';

const now = '2026-09-14T14:00:00.000Z', actorId = 'local-user';
const payload = (data: ProgramData): ProgramLegacySnapshotPayload => JSON.parse(data.spaces[actorId].legacySnapshot!.raw);
function apply(data: ProgramData, action: ProgramLegacyMapMembershipAction) {
  const result = applyProgramLegacyMapMembershipAction(data, { actorId, expectedSpace: data.spaces[actorId], action });
  assert.ok(result.ok, JSON.stringify(result.ok ? '' : { reason: result.reason, detail: 'membershipReason' in result ? result.membershipReason : null }));
  return result.data;
}
function choices(data: ProgramData, groupRef: string, reviewId: string) {
  const read = readProgramLegacyMapMembership(data, actorId, groupRef); assert.ok(read.ok); assert.ok(read.owner);
  const review = read.owner.reviews.find(review => review.id === reviewId)!;
  const changes = programLegacyMapMembershipReviewChanges(read.owner, read.originalChildren, review); assert.ok(changes.ok);
  return Object.fromEntries(changes.changes.map(change => [change.id, 'incoming' as const]));
}
/** Actual source factory IDs. Only the test worker's Map declaration changes;
 * deletion/restoration are simulated packages, not published new releases. */
function fixture(t: TestContext, recurring = false) {
  const mapId = recurring ? 'curated-allblanc-workout-park' : 'curated-opic-mock-course';
  const index = sourceBackedMyFlowMaps.findIndex(map => map.id === mapId), originalMap = sourceBackedMyFlowMaps[index]; assert.ok(originalMap);
  const bytes = JSON.stringify(originalMap);
  t.after(() => { sourceBackedMyFlowMaps[index] = originalMap; assert.equal(JSON.stringify(originalMap), bytes); });
  const entries: Record<string, string> = {
    [`flow:map:saved:${mapId}`]: JSON.stringify(buildSourceBackedFlowMapSavedSnapshot(mapId, { savedAt: now, anchor: '2026-09-30' })),
    [`flow:map:persistence:${mapId}`]: JSON.stringify(buildSourceBackedFlowMapPersistenceRecord(mapId, { savedAt: now, anchor: '2026-09-30' })),
    'flow:membership-private-sentinel': '{ "value" : " preserve original bytes " }',
  };
  const keys = Object.keys(entries), read = buildPersonalWorkspacePocReadModel({ length: keys.length, key: i => keys[i] ?? null, getItem: key => entries[key] ?? null }, sourceBackedMyFlowBundles);
  assert.ok(read.ok);
  const original = programClone(read.model), flow = original.flows.find(flow => recurring ? flow.flowId === 'flow-curated-allblanc-no-jump-cardio' : flow.title === '오픽 모의고사 2주 계획표')!;
  assert.ok(flow);
  const groupRef = flow.presentation!.mapGroup!.groupRef;
  const hydrated = hydrateProgramLegacy(createProgramData(), original, createPersonalWorkspacePocState(now), { actorId, preserveUnsupported: true }); assert.ok(hydrated.ok);
  let data = hydrated.data;
  const binding = data.spaces[actorId].savedBindings.find(binding => binding.flowRef === flow.ref)!;
  const lineId = binding.itemLines[flow.items[0].ref];
  if (!recurring) {
    const edited = updateProgramTask(data, { actorId, expectedSpace: data.spaces[actorId], requestId: 'personal-before-removal', taskId: lineId,
      patch: { title: '개인적으로 진행한 준비', note: '원본 삭제 뒤에도 보존할 개인 메모', date: '2026-10-05' } }); assert.ok(edited.ok); data = edited.data;
    const progress = recordProgramTaskProgress(data, { actorId, expectedSpace: data.spaces[actorId], requestId: 'personal-progress-before-removal', taskId: lineId, date: '2026-10-05', percent: 35 }); assert.ok(progress.ok); data = progress.data;
  }
  const membership = readProgramLegacyMapMembership(data, actorId, groupRef); assert.ok(membership.ok);
  const stage = (target: ProgramData, requestId = 'simulated-child-removal') => apply(target, { type: 'stage', groupRef, requestId, expectedSourceToken: membership.sourceToken, now });
  return { data, original, flow, groupRef, entries, binding, lineId, stage,
    remove: () => { sourceBackedMyFlowMaps[index] = { ...programClone(originalMap), flowSlugs: originalMap.flowSlugs.filter(slug => slug !== flow.sourceSlug) }; },
    restore: () => { sourceBackedMyFlowMaps[index] = originalMap; } };
}

test('transient whole-Map compare and keep-all never write; explicit acceptance stores source and choices once', async t => {
  const f = fixture(t), original = programClone(f.data);
  f.remove();
  const read = readProgramLegacyMapMembership(f.data, actorId, f.groupRef); assert.ok(read.ok);
  const stage = { type: 'stage' as const, groupRef: f.groupRef, requestId: 'transient-comparison', expectedSourceToken: read.sourceToken, now };
  const preview = previewProgramLegacyMapMembership(f.data, { actorId, ...stage }); assert.ok(preview.ok);
  assert.deepEqual(f.data, original); assert.equal(payload(f.data).mapMembership, undefined);
  const selected = choices(preview.data, f.groupRef, stage.requestId);
  const values = new Map<string, string>(); let writes = 0, quota = false;
  const controller = createProgramController({ initialData: f.data, exclusive: async work => work(), storage: {
    getItem: key => values.get(key) ?? null, setItem: (key, value) => { assert.equal(key, PROGRAM_STATE_KEY); if (quota) throw Error('quota'); writes++; values.set(key, value); }, removeItem: () => assert.fail('no remove'),
  } }); assert.ok(controller.ok);
  const run = (selection: Record<string, 'mine' | 'incoming'>) => controller.mutate('Map composition', data => applyProgramLegacyMapMembershipPreview(data, {
    actorId, stage, choices: selection, expectedSpace: f.data.spaces[actorId], expectedPreview: preview.data,
  }), { actorId });
  const mine = Object.fromEntries(Object.keys(selected).map(key => [key, 'mine' as const]));
  const kept = await run(mine); assert.ok(kept.ok); assert.equal(writes, 0); assert.deepEqual(controller.snapshot().envelope.data, original);
  assert.equal((await run({})).ok, false); assert.equal(writes, 0);
  quota = true; assert.equal((await run(selected)).ok, false); assert.equal(writes, 0); assert.deepEqual(controller.snapshot().envelope.data, original);
  quota = false; assert.ok((await run(selected)).ok); assert.equal(writes, 1);
  const accepted = controller.snapshot().envelope.data;
  assert.equal(payload(accepted).mapMembership?.groups[f.groupRef].reviews.length, 1);
  assert.deepEqual(accepted.spaces[actorId].text, original.spaces[actorId].text);
  assert.ok((await controller.undo(actorId)).ok); assert.equal(writes, 2);
  assert.deepEqual(controller.snapshot().envelope.data.spaces[actorId], original.spaces[actorId]);
});

test('transient acceptance rechecks the exact source package and private snapshot before any write', t => {
  const f = fixture(t); f.remove();
  const read = readProgramLegacyMapMembership(f.data, actorId, f.groupRef); assert.ok(read.ok);
  const stage = { type: 'stage' as const, groupRef: f.groupRef, requestId: 'source-race', expectedSourceToken: read.sourceToken, now };
  const preview = previewProgramLegacyMapMembership(f.data, { actorId, ...stage }); assert.ok(preview.ok);
  const input = { actorId, stage, choices: choices(preview.data, f.groupRef, stage.requestId), expectedSpace: f.data.spaces[actorId], expectedPreview: preview.data };
  const wrongPreview = programClone(preview.data); wrongPreview.spaces[actorId].text.flows[0].title += ' changed';
  const mismatch = applyProgramLegacyMapMembershipPreview(f.data, { ...input, expectedPreview: wrongPreview }); assert.equal(mismatch.ok, false); assert.deepEqual(mismatch.data, f.data);
  const changed = programClone(f.data); changed.spaces[actorId].text.flows[0].title += ' personal';
  const stale = applyProgramLegacyMapMembershipPreview(changed, input); assert.equal(stale.ok, false); assert.deepEqual(stale.data, changed);
  f.restore(); const restored = applyProgramLegacyMapMembershipPreview(f.data, input); assert.equal(restored.ok, false); assert.deepEqual(restored.data, f.data);
});

test('Map child acceptance is one CAS write; unselected, quota, stale, retry and reload preserve personal records', async t => {
  const f = fixture(t), beforeRead = JSON.stringify(f.data);
  const base = readProgramLegacyMapMembership(f.data, actorId, f.groupRef); assert.ok(base.ok); assert.equal(base.owner, null);
  assert.equal(JSON.stringify(f.data), beforeRead);
  f.remove(); const staged = f.stage(f.data), reviewId = 'simulated-child-removal';
  const values = new Map(Object.entries(f.entries)); let writes = 0, quota = false;
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, raw: string) => {
    assert.equal(key, PROGRAM_STATE_KEY); if (quota) throw Error('quota'); writes++; values.set(key, raw);
  }, removeItem: () => assert.fail('no remove') };
  const controller = createProgramController({ initialData: staged, storage, exclusive: async work => work() }); assert.ok(controller.ok);
  const pendingEnvelope = programClone(controller.snapshot().envelope), before = programClone(staged.spaces[actorId]);
  const selected = choices(staged, f.groupRef, reviewId), selectedBytes = JSON.stringify(selected);
  const action: ProgramLegacyMapMembershipAction = { type: 'apply', groupRef: f.groupRef, reviewId, now, choices: selected };
  const commit = (nextAction: ProgramLegacyMapMembershipAction, expectedSpace = before) => controller.mutate('Map 구성 검토', data => applyProgramLegacyMapMembershipAction(data, { actorId, expectedSpace, action: nextAction }), { actorId });
  assert.equal((await commit({ type: 'apply', groupRef: f.groupRef, reviewId, now })).ok, false); assert.equal(writes, 0);
  quota = true; assert.equal((await commit(action)).ok, false); assert.equal(writes, 0); assert.deepEqual(controller.snapshot().envelope, pendingEnvelope);
  quota = false; assert.ok((await commit(action)).ok); assert.equal(writes, 1); assert.equal(JSON.stringify(selected), selectedBytes);
  const accepted = controller.snapshot().envelope.data, after = accepted.spaces[actorId];
  assert.deepEqual(after.text, before.text); assert.deepEqual(after.savedBindings, before.savedBindings); assert.deepEqual(after.archivedDocumentIds, before.archivedDocumentIds);
  assert.deepEqual(payload(accepted).model, f.original); assert.deepEqual(payload(accepted).state, payload(staged).state);
  assert.equal(programExecutionTasks(after, { period: 'today', date: '2026-10-05' }).some(task => task.id === f.lineId), false);
  assert.equal(M.progressHistory(after.text, f.lineId).at(-1)?.percent, 35);
  assert.equal(updateProgramTask(accepted, { actorId, expectedSpace: after, requestId: 'no-reference-bypass', taskId: f.lineId, patch: { date: '2026-11-01' } }).ok, false);
  assert.equal((await commit(action)).ok, false, 'old expectedSpace cannot replay acceptance'); assert.equal(writes, 1);
  assert.ok(inspectProgramLegacySnapshotPayload(payload(accepted)).ok); assert.ok(validateProgramData(accepted));
  const repeated = transitionProgramLegacyMapMembershipPayload(payload(accepted), { type: 'stage', groupRef: f.groupRef, requestId: 'same-absence', expectedSourceToken: base.sourceToken, now });
  assert.equal(repeated.ok, false); if (!repeated.ok) assert.equal(repeated.reason, 'no-source-change');
  const reloaded = createProgramController({ initialData: createProgramData(), storage, exclusive: async work => work() }); assert.ok(reloaded.ok);
  assert.deepEqual(reloaded.snapshot().envelope, controller.snapshot().envelope); assert.equal(writes, 1);
  assert.ok((await reloaded.undo(actorId)).ok); assert.equal(writes, 2); assert.deepEqual(reloaded.snapshot().envelope.data.spaces[actorId], before);
  for (const [key, raw] of Object.entries(f.entries)) assert.equal(values.get(key), raw);
  if (process.env.FLOWME_MAP_CHILD_REMOVAL_CAPTURE === '1') {
    const directory = new URL('../../../output/integrated-product-poc/', import.meta.url); mkdirSync(directory, { recursive: true });
    writeFileSync(new URL('map-child-removal-browser-fixture.json', directory), JSON.stringify({ evidenceKind: 'simulated-later-map-membership-through-actual-factory', generatedBy: fileURLToPath(import.meta.url),
      entries: f.entries, envelope: pendingEnvelope, groupRef: f.groupRef, flowRef: f.flow.ref, itemRef: f.flow.items[0].ref,
      lineId: f.lineId, documentId: f.binding.documentId, reviewId, choices: selected, acceptedSpace: after }, null, 2));
  }
});

test('identical child restoration is explicit and source-only Undo preserves later personal records', t => {
  const f = fixture(t); f.remove(); let data = f.stage(f.data);
  data = apply(data, { type: 'apply', groupRef: f.groupRef, reviewId: 'simulated-child-removal', now, choices: choices(data, f.groupRef, 'simulated-child-removal') });
  f.restore(); data = f.stage(data, 'identical-child-restoration');
  const read = readProgramLegacyMapMembership(data, actorId, f.groupRef); assert.ok(read.ok); assert.ok(read.owner);
  const review = read.owner.reviews.at(-1)!, diff = programLegacyMapMembershipReviewChanges(read.owner, read.originalChildren, review); assert.ok(diff.ok);
  assert.deepEqual(diff.changes.map(change => change.kind), ['restored']); assert.equal(read.retainedChildren.length, 1);
  data = apply(data, { type: 'apply', groupRef: f.groupRef, reviewId: review.id, now, choices: choices(data, f.groupRef, review.id) });
  assert.ok(programExecutionTasks(data.spaces[actorId]).some(task => task.id === f.lineId));
  const edited = recordProgramTaskProgress(data, { actorId, expectedSpace: data.spaces[actorId], requestId: 'later-personal-record', taskId: f.lineId, date: '2026-10-06', percent: 65 }); assert.ok(edited.ok); data = edited.data;
  const records = programClone(data.spaces[actorId].text.progressRecords);
  data = apply(data, { type: 'undo', groupRef: f.groupRef, now });
  assert.deepEqual(data.spaces[actorId].text.progressRecords, records); assert.equal(programExecutionTasks(data.spaces[actorId]).some(task => task.id === f.lineId), false);
  const undone = readProgramLegacyMapMembership(data, actorId, f.groupRef); assert.ok(undone.ok); assert.equal(undone.retainedChildren.length, 1);
  assert.ok(programLegacyMapMembershipReviewChanges(undone.owner!, undone.originalChildren, undone.owner!.reviews.at(-1)!).ok);
});

test('Map common plan excludes accepted child and retains its fixed mode and private date without erasing source', t => {
  const f = fixture(t), plan = readProgramLegacyMapPlan(f.data, actorId, f.flow.ref, now); assert.ok(plan.ok);
  const initialDraft: ProgramLegacyMapPlanDraft = { personalAnchor: '2026-10-10', children: Object.fromEntries(plan.children.map(child => [child.flow.ref,
    { mode: child.flow.ref === f.flow.ref ? { mode: 'fixed-child', anchor: '2026-09-30' } : { mode: 'follow-group' }, selection: { includedItemRefs: child.rows.map(row => row.itemRef) } }])) };
  const planned = applyProgramLegacyMapPlan(f.data, { actorId, flowRef: f.flow.ref, now, draft: initialDraft, expectedSpace: f.data.spaces[actorId] }); assert.ok(planned.ok);
  f.remove(); let data = f.stage(planned.data);
  data = apply(data, { type: 'apply', groupRef: f.groupRef, reviewId: 'simulated-child-removal', now, choices: choices(data, f.groupRef, 'simulated-child-removal') });
  assert.equal(readProgramLegacyMapPlan(data, actorId, f.flow.ref, now).ok, false);
  const survivor = f.original.flows.find(flow => flow.ref !== f.flow.ref)!;
  const active = readProgramLegacyMapPlan(data, actorId, survivor.ref, now); assert.ok(active.ok); assert.ok(active.stale); assert.deepEqual(active.childFlowRefs, [survivor.ref]);
  const before = programClone(data.spaces[actorId]), draft: ProgramLegacyMapPlanDraft = { personalAnchor: '2026-10-20', reviewSourceToken: active.token,
    children: Object.fromEntries(active.children.map(child => [child.flow.ref, { mode: { mode: 'follow-group' }, selection: { includedItemRefs: child.rows.filter(row => row.included).map(row => row.itemRef), ...(child.stale ? { reviewSourceToken: child.token } : {}) } }])) };
  const applied = applyProgramLegacyMapPlan(data, { actorId, flowRef: survivor.ref, now, draft, expectedSpace: before }); assert.ok(applied.ok, JSON.stringify(applied.ok ? '' : applied.reason));
  const saved = payload(applied.data).planSelections!.groups![f.groupRef];
  assert.deepEqual(saved.childFlowRefs, [survivor.ref]); assert.deepEqual(saved.retainedChildren![f.flow.ref].mode, { mode: 'fixed-child', anchor: '2026-09-30' });
  assert.deepEqual(M.getDocument(applied.data.spaces[actorId].text, f.binding.documentId), M.getDocument(before.text, f.binding.documentId));
  assert.deepEqual(payload(applied.data).model, f.original); assert.deepEqual(payload(applied.data).mapMembership, payload(data).mapMembership);
});

test('membership validation rejects forged choices and ordinary hydration/reconcile cannot erase an accepted owner', t => {
  const f = fixture(t); f.remove(); let data = f.stage(f.data);
  const staged = payload(data), owner = staged.mapMembership!.groups[f.groupRef];
  const forged = programClone(staged); forged.mapMembership!.groups[f.groupRef].effective.acceptedAbsences[f.flow.ref] = owner.reviews[0].incomingRevisionId;
  assert.equal(inspectProgramLegacySnapshotPayload(forged).ok, false, 'absence with no applied confirmation is not a valid store');
  const invalid = transitionProgramLegacyMapMembershipPayload(staged, { type: 'apply', groupRef: f.groupRef, reviewId: owner.reviews[0].id, now, choices: { foreign: 'incoming' } }); assert.equal(invalid.ok, false);
  const retry = transitionProgramLegacyMapMembershipPayload(staged, { type: 'stage', groupRef: f.groupRef, requestId: owner.reviews[0].id, expectedSourceToken: owner.baseSourceToken, now }); assert.ok(retry.ok); assert.equal(retry.changed, false); assert.equal(retry.payload, staged);
  data = apply(data, { type: 'apply', groupRef: f.groupRef, reviewId: owner.reviews[0].id, now, choices: choices(data, f.groupRef, owner.reviews[0].id) });
  const saved = payload(data), omitted = programClone(saved); delete omitted.mapMembership;
  const merged = reconcileProgramLegacy(data, omitted, { actorId, expectedSnapshotRaw: data.spaces[actorId].legacySnapshot!.raw }); assert.equal(merged.ok, false);
  assert.equal(hydrateProgramLegacy(data, saved.model, saved.state, { actorId, preserveUnsupported: true }).ok, false);
  assert.ok(validateProgramLegacyMapMembershipStore(undefined, saved.model.flows));
  const view = prepareProgramLegacyView(data, { actorId, now, onlyFlowRef: f.flow.ref }); assert.ok(view.ok, JSON.stringify(view));
  assert.deepEqual(view.payload.mapMembership, saved.mapMembership);
  const completed = applyProgramLegacyAction(data, { actorId, now, expectedToken: view.token, executionDate: '2026-10-05', action: { type: 'complete', itemRef: f.flow.items[0].ref, completed: true, now } });
  assert.equal(completed.transition.ok, false, 'legacy complete cannot bypass inactive membership');
});

test('storage readback failure does not report success or overwrite foreign bytes', async t => {
  const f = fixture(t); f.remove(); const staged = f.stage(f.data), expectedSpace = staged.spaces[actorId]; let writes = 0;
  const values = new Map(Object.entries(f.entries)), foreign = 'foreign concurrent writer';
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, _raw: string) => { assert.equal(key, PROGRAM_STATE_KEY); writes++; values.set(key, foreign); }, removeItem: () => assert.fail('no remove') };
  const controller = createProgramController({ initialData: staged, storage, exclusive: async work => work() }); assert.ok(controller.ok);
  const result = await controller.mutate('Map 구성', data => applyProgramLegacyMapMembershipAction(data, { actorId, expectedSpace,
    action: { type: 'apply', groupRef: f.groupRef, reviewId: 'simulated-child-removal', now, choices: choices(staged, f.groupRef, 'simulated-child-removal') } }), { actorId });
  assert.equal(result.ok, false); assert.equal(writes, 1); assert.equal(values.get(PROGRAM_STATE_KEY), foreign); assert.deepEqual(controller.snapshot().envelope.data, staged);
  for (const [key, raw] of Object.entries(f.entries)) assert.equal(values.get(key), raw);
});

test('unchanged source, stale review and repeated defer never replace a newer membership selection', t => {
  const f = fixture(t), read = readProgramLegacyMapMembership(f.data, actorId, f.groupRef); assert.ok(read.ok);
  const unchanged = transitionProgramLegacyMapMembershipPayload(payload(f.data), { type: 'stage', groupRef: f.groupRef, requestId: 'nothing-new', expectedSourceToken: read.sourceToken, now });
  assert.equal(unchanged.ok, false); if (!unchanged.ok) assert.equal(unchanged.reason, 'no-source-change');
  assert.equal(payload(f.data).mapMembership, undefined);
  f.remove(); let data = f.stage(f.data, 'first-comparison'); data = f.stage(data, 'second-comparison');
  data = apply(data, { type: 'defer', groupRef: f.groupRef, reviewId: 'second-comparison', now });
  const deferred = payload(data), noChange = transitionProgramLegacyMapMembershipPayload(deferred, { type: 'defer', groupRef: f.groupRef, reviewId: 'second-comparison', now });
  assert.ok(noChange.ok); assert.equal(noChange.changed, false); assert.equal(noChange.payload, deferred);
  const staleChoices = choices(data, f.groupRef, 'second-comparison');
  data = apply(data, { type: 'apply', groupRef: f.groupRef, reviewId: 'first-comparison', now, choices: choices(data, f.groupRef, 'first-comparison') });
  const before = payload(data), stale = transitionProgramLegacyMapMembershipPayload(before, { type: 'apply', groupRef: f.groupRef, reviewId: 'second-comparison', now, choices: staleChoices });
  assert.equal(stale.ok, false); if (!stale.ok) assert.equal(stale.reason, 'source-conflict'); assert.equal(stale.payload, before);
});

test('accepted recurring child retains occurrence records and identity but has no active occurrence writes until explicit restoration', t => {
  const f = fixture(t, true); let data = f.data;
  const source = (action: ProgramLegacySourceAction) => { const view = prepareProgramLegacyView(data, { actorId, now, onlyFlowRef: f.flow.ref, sourceReview: true }); assert.ok(view.ok);
    const result = applyProgramLegacySourceAction(data, { actorId, expectedToken: view.token, action }); assert.ok(result.transition.ok, JSON.stringify(result.issues)); data = result.transition.data; };
  source({ type: 'connect-map', flowRef: f.flow.ref, requestId: 'connect-series', expectedSourceToken: sourceCanonical(f.flow), now });
  source({ type: 'stage-map', flowRef: f.flow.ref, requestId: 'stage-series', now });
  let sourceOwner = payload(data).sourceLifecycle!.owners[f.flow.ref];
  for (const change of programLegacySourceChanges(sourceOwner, sourceOwner.reviews[0].incomingRevisionId)) source({ type: 'choice', flowRef: f.flow.ref, reviewId: 'stage-series', changeId: change.id, choice: 'incoming', now });
  source({ type: 'apply', flowRef: f.flow.ref, reviewId: 'stage-series', now }); sourceOwner = payload(data).sourceLifecycle!.owners[f.flow.ref];
  source({ type: 'activate-map-recurrence', flowRef: f.flow.ref, requestId: 'activate-series', expectedSelection: sourceCanonical(sourceOwner.effective), itemRefs: [f.flow.items[0].ref], now });
  const input = { actorId, flowRef: f.flow.ref, localToday: '2026-09-30' }, before = readProgramExecutionOccurrences(data, input); assert.ok(before.ok); assert.ok(before.rows.length);
  const first = before.rows[0], recorded = updateProgramOccurrenceExecution(data, { ...input, identity: first.identity, expected: null, changes: { completion: { status: 'completed', completedAt: now } } }); assert.ok(recorded.ok); data = recorded.data;
  const prior = programClone(data.spaces[actorId]); f.remove(); data = f.stage(data);
  data = apply(data, { type: 'apply', groupRef: f.groupRef, reviewId: 'simulated-child-removal', now, choices: choices(data, f.groupRef, 'simulated-child-removal') });
  const removed = readProgramExecutionOccurrences(data, input); assert.ok(removed.ok); assert.equal(removed.rows.length, before.rows.length); assert.ok(removed.rows.every(row => row.planExcluded));
  assert.deepEqual(data.spaces[actorId].recurrenceExecution, prior.recurrenceExecution); assert.deepEqual(data.spaces[actorId].text, prior.text);
  assert.equal(updateProgramOccurrenceExecution(data, { ...input, identity: first.identity, expected: removed.rows[0].stored, changes: { completion: { status: 'open', completedAt: null } } }).ok, false);
  f.restore(); data = f.stage(data, 'restore-series-child'); data = apply(data, { type: 'apply', groupRef: f.groupRef, reviewId: 'restore-series-child', now, choices: choices(data, f.groupRef, 'restore-series-child') });
  const restored = readProgramExecutionOccurrences(data, input); assert.ok(restored.ok); assert.ok(restored.rows.every(row => !row.planExcluded));
  assert.deepEqual(restored.rows[0].identity, first.identity); assert.equal(restored.rows[0].completion, 'completed');
});
