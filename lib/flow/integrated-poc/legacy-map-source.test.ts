import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { buildSourceBackedFlowMapSavedSnapshot, buildSourceBackedFlowMapPersistenceRecord, sourceBackedMyFlowBundles } from '../source-backed-my-flow';
import { buildPersonalWorkspacePocReadModel } from '../personal-workspace-poc-read-model';
import { createPersonalWorkspacePocState } from '../personal-workspace-poc-state';
import { createProgramData } from './program-data';
import { hydrateProgramLegacy } from './legacy-projection';
import { inspectProgramLegacySnapshotPayload, type ProgramLegacySnapshotPayload } from './legacy-snapshot';
import { readProgramLegacyMapSourceConnection, transitionProgramLegacySourcePayload, type ProgramLegacySourceAction } from './legacy-source-lifecycle';
import { readProgramLegacyCurrentMapSource, programLegacyMapRevisionId, validateProgramLegacyMapRevision } from './legacy-map-source';
import { programLegacySourceChanges, sourceCanonical } from './legacy-source-lifecycle-contract';
import { applyProgramLegacySourceAction, applyProgramLegacyAction, applyProgramLegacyMapReview, prepareProgramLegacyView } from './legacy-transaction';
import { textWorkspaceModel as M } from './text-workspace';
import { createProgramController } from './controller';
import { createProgramLegacyPort } from './legacy-port';
import { PROGRAM_STATE_KEY } from './contract';
import { programExecutionTasks } from './execution';
import { readProgramLegacyMapReview, transitionProgramLegacyMapReview, programLegacyTaskQualityHold, programPreservesLegacyQualityHold } from './legacy-map-review';
import { updateProgramTask, recordProgramTaskProgress } from './private-space';

const NOW = '2026-09-12T13:20:00.000Z', actorId = 'local-user';
/** Real map factory with an explicitly simulated older saved Step title and
 * absent discovery link, not a fictitious published catalog version. */
export function structuredMapFixture(mapId = 'moving-d30', older = true) {
  const snapshot = buildSourceBackedFlowMapSavedSnapshot(mapId, { savedAt: NOW, anchor: '2026-09-30' })!;
  const persistence = buildSourceBackedFlowMapPersistenceRecord(mapId, { savedAt: NOW, anchor: '2026-09-30' })!;
  const entries: Record<string, string> = { [`flow:map:saved:${mapId}`]: JSON.stringify(snapshot), [`flow:map:persistence:${mapId}`]: JSON.stringify(persistence) };
  const read = buildPersonalWorkspacePocReadModel({ length: 2, key: i => Object.keys(entries)[i] ?? null, getItem: key => entries[key] ?? null }, sourceBackedMyFlowBundles); assert.ok(read.ok);
  const model = structuredClone(read.model);
  if (older) {
    const flow = model.flows[0], item = flow.items[0];
    (model as { flows: typeof model.flows }).flows = model.flows.map(row => row !== flow ? row : { ...flow, presentation: { ...flow.presentation, discovery: { sourceUrls: [] } },
      items: flow.items.map(row => row !== item ? row : { ...item, title: '이전에 저장한 Step 제목', fieldOwnership: { ...item.fieldOwnership!, title: { ...item.fieldOwnership!.title, source: { value: '이전에 저장한 Step 제목', owner: 'source', provenance: 'saved-map-persistence' }, effective: { value: '이전에 저장한 Step 제목', owner: 'source', provenance: 'saved-map-persistence' } } } }) });
  }
  const payload: ProgramLegacySnapshotPayload = { model, state: createPersonalWorkspacePocState(NOW) };
  assert.ok(inspectProgramLegacySnapshotPayload(payload).ok);
  const h = hydrateProgramLegacy(createProgramData(), model, payload.state, { actorId, preserveUnsupported: true }); assert.ok(h.ok);
  return { payload, data: h.data, flow: model.flows[0], entries };
}
function transition(payload: ProgramLegacySnapshotPayload, action: ProgramLegacySourceAction) {
  const result = transitionProgramLegacySourcePayload(payload, action); assert.ok(result.ok, JSON.stringify(result)); return result.payload;
}
test('MS01 actual Flow/Step/provenance is verified and connected without fabricated TXT or identity mapping', () => {
  const f = structuredMapFixture(), prepared = readProgramLegacyMapSourceConnection(f.payload, f.flow.ref); assert.ok(prepared);
  const current = readProgramLegacyCurrentMapSource(f.flow, NOW); assert.ok(current); assert.ok(validateProgramLegacyMapRevision(current, f.flow));
  assert.ok(current.flow.items.every(item => current.persistence.childFlows.some(flow => flow.steps.some(step => step.stepId === item.itemId))));
  let payload = transition(f.payload, { type: 'connect-map', flowRef: f.flow.ref, requestId: 'connect', expectedSourceToken: prepared.sourceToken, now: NOW });
  payload = transition(payload, { type: 'stage-map', flowRef: f.flow.ref, requestId: 'compare', now: NOW });
  const owner = payload.sourceLifecycle!.owners[f.flow.ref], review = owner.reviews[0];
  assert.equal(review.incomingRevisionId, programLegacyMapRevisionId(current)); assert.deepEqual(owner.revisions, {});
  assert.equal(Object.values(owner.structured!.revisions).some(revision => 'authoring' in revision.flow), false);
  assert.ok(programLegacySourceChanges(owner, review.incomingRevisionId).some(change => change.kind === 'flow'));
  assert.ok(programLegacySourceChanges(owner, review.incomingRevisionId).some(change => change.itemRef === f.flow.items[0].ref));
  assert.deepEqual(payload.model, f.payload.model); assert.deepEqual(payload.state, f.payload.state);
  assert.ok(inspectProgramLegacySnapshotPayload(JSON.parse(JSON.stringify(payload))).ok);
});
test('MS02 Map source transaction preserves personal title/memo/date/progress and other original children through partial apply and source Undo', () => {
  const f = structuredMapFixture(); let data = f.data; const binding = data.spaces[actorId].savedBindings.find(row => row.flowRef === f.flow.ref)!;
  const id = binding.itemLines[f.flow.items[0].ref], space = data.spaces[actorId];
  space.text = M.updateTask(space.text, id, { title: '개인 제목', note: '개인 메모', date: '2026-10-03' }); space.text = M.recordProgress(space.text, id, '2026-09-12', 55);
  const commit = (action: ProgramLegacySourceAction) => { const view = prepareProgramLegacyView(data, { actorId, now: NOW, onlyFlowRef: f.flow.ref, sourceReview: true }); assert.ok(view.ok, JSON.stringify(view)); const result = applyProgramLegacySourceAction(data, { actorId, expectedToken: view.token, action }); assert.ok(result.transition.ok, JSON.stringify({ issues: result.issues, conflicts: result.conflicts })); data = result.transition.data; };
  commit({ type: 'connect-map', flowRef: f.flow.ref, requestId: 'connect', expectedSourceToken: sourceCanonical(f.flow), now: NOW });
  commit({ type: 'stage-map', flowRef: f.flow.ref, requestId: 'compare', now: NOW });
  const payload = JSON.parse(data.spaces[actorId].legacySnapshot!.raw) as ProgramLegacySnapshotPayload, owner = payload.sourceLifecycle!.owners[f.flow.ref];
  for (const change of programLegacySourceChanges(owner, owner.reviews[0].incomingRevisionId)) commit({ type: 'choice', flowRef: f.flow.ref, reviewId: 'compare', changeId: change.id, choice: change.kind === 'flow' || change.itemRef === f.flow.items[0].ref ? 'incoming' : 'mine', now: NOW });
  commit({ type: 'apply', flowRef: f.flow.ref, reviewId: 'compare', now: NOW });
  const checked = inspectProgramLegacySnapshotPayload(JSON.parse(data.spaces[actorId].legacySnapshot!.raw)); assert.ok(checked.ok);
  assert.ok(checked.mapSourceFlows.find(flow => flow.ref === f.flow.ref)!.presentation!.discovery!.sourceUrls.length);
  const task = M.tasks(data.spaces[actorId].text).find(task => task.id === id)!; assert.equal(task.title, '개인 제목'); assert.equal(task.note, '개인 메모'); assert.equal(task.date, '2026-10-03'); assert.equal(M.latestProgress(data.spaces[actorId].text, id)?.percent, 55);
  commit({ type: 'undo', flowRef: f.flow.ref, now: NOW });
  assert.deepEqual(JSON.parse(data.spaces[actorId].legacySnapshot!.raw).model, f.payload.model);
  assert.equal(data.spaces[actorId].text.flows.length, f.data.spaces[actorId].text.flows.length);
});
test('MS03 corrupted provenance, a foreign Step tuple, authored mixing and stale confirmation fail closed', () => {
  const f = structuredMapFixture(), current = readProgramLegacyCurrentMapSource(f.flow, NOW)!;
  for (const patch of [
    (x: typeof current) => { x.flow = { ...x.flow, flowId: 'foreign' }; },
    (x: typeof current) => { x.persistence.childFlows[0].steps[0].stepId = 'foreign'; },
    (x: typeof current) => { x.flow = { ...x.flow, items: [{ ...x.flow.items[0], itemId: 'foreign' }, ...x.flow.items.slice(1)] }; },
    (x: typeof current) => { (x.flow as unknown as Record<string, unknown>).authoring = { rawText: 'not original TXT' }; },
  ]) { const bad = structuredClone(current); patch(bad); assert.equal(validateProgramLegacyMapRevision(bad, f.flow), false); }
  const stale = transitionProgramLegacySourcePayload(f.payload, { type: 'connect-map', flowRef: f.flow.ref, requestId: 'stale', expectedSourceToken: 'old', now: NOW }); assert.equal(stale.ok, false); assert.equal(stale.payload, f.payload);
  const payload = transition(f.payload, { type: 'connect-map', flowRef: f.flow.ref, requestId: 'connect', expectedSourceToken: sourceCanonical(f.flow), now: NOW });
  assert.equal(transitionProgramLegacySourcePayload(payload, { type: 'stage', flowRef: f.flow.ref, requestId: 'fake', rawText: '# fake\n- [ ] invented', now: NOW }).ok, false);
  const mixed = structuredClone(payload); (mixed.sourceLifecycle!.owners[f.flow.ref].revisions as Record<string, unknown>).fake = { authoring: {} }; assert.equal(inspectProgramLegacySnapshotPayload(mixed).ok, false);
});
test('MS04 five genuine quality-held factories remain held after structured connection and source acceptance', () => {
  for (const mapId of ['baby-health-schedule', 'year-end-tax-submit', 'curated-funmom-learning-park', 'curated-child-vaccination-schedule', 'baby-food-map']) {
    const f = structuredMapFixture(mapId, false); let data = f.data;
    const commit = (action: ProgramLegacySourceAction) => { const view = prepareProgramLegacyView(data, { actorId, now: NOW, onlyFlowRef: f.flow.ref, sourceReview: true }); assert.ok(view.ok, `${mapId}:${JSON.stringify(view)}`); const result = applyProgramLegacySourceAction(data, { actorId, expectedToken: view.token, action }); assert.ok(result.transition.ok, `${mapId}:${JSON.stringify(result.issues)}`); data = result.transition.data; };
    commit({ type: 'connect-map', flowRef: f.flow.ref, requestId: 'connect', expectedSourceToken: sourceCanonical(f.flow), now: NOW });
    commit({ type: 'stage-map', flowRef: f.flow.ref, requestId: 'compare', now: NOW });
    const payload = JSON.parse(data.spaces[actorId].legacySnapshot!.raw) as ProgramLegacySnapshotPayload, owner = payload.sourceLifecycle!.owners[f.flow.ref];
    for (const change of programLegacySourceChanges(owner, owner.reviews[0].incomingRevisionId)) commit({ type: 'choice', flowRef: f.flow.ref, reviewId: 'compare', changeId: change.id, choice: 'incoming', now: NOW });
    commit({ type: 'apply', flowRef: f.flow.ref, reviewId: 'compare', now: NOW });
    const checked = inspectProgramLegacySnapshotPayload(JSON.parse(data.spaces[actorId].legacySnapshot!.raw)); assert.ok(checked.ok);
    assert.ok(checked.model.flows.every(flow => flow.presentation!.mapGroup!.executionState === 'review-hold'), mapId);
    assert.equal(programExecutionTasks(data.spaces[actorId], { period: 'all' }).length, 0);
    const map = readProgramLegacyMapReview(checked.mapSourceFlows, f.flow.presentation!.mapGroup!.groupRef)!;
    assert.ok(map.blockers.length); assert.equal(transitionProgramLegacyMapReview(checked.mapSourceFlows, checked.payload.mapReview, { groupRef: map.groupRef, requestId: 'personal-approve', expectedSourceToken: map.sourceToken, now: NOW, acknowledgedReasons: map.reasons, sourceByItemRef: Object.fromEntries(map.items.map(item => [item.itemRef, item.sourceUrls[0]])) }).ok, false);
    assert.deepEqual(checked.payload.model, f.payload.model);
  }
});
test('MS05 changed effective structured source invalidates old personal Map approval; source Undo restores its exact source token', () => {
  const f = structuredMapFixture('moving-d30', false);
  f.payload.model = { ...f.payload.model, flows: f.payload.model.flows.map(flow => ({ ...flow, presentation: { ...flow.presentation, mapGroup: { ...flow.presentation!.mapGroup!, executionState: 'review-hold', reviewReasons: ['원문 링크 개인 확인'] } } })) };
  const original = f.payload.model.flows[0], groupRef = original.presentation!.mapGroup!.groupRef;
  const old = readProgramLegacyMapReview(f.payload.model.flows, groupRef)!;
  const approved = transitionProgramLegacyMapReview(f.payload.model.flows, undefined, { groupRef, requestId: 'approved', expectedSourceToken: old.sourceToken, now: NOW, acknowledgedReasons: old.reasons, sourceByItemRef: Object.fromEntries(old.items.map(item => [item.itemRef, item.sourceUrls[0]])) }); assert.ok(approved.ok);
  let payload = { ...f.payload, mapReview: approved.store };
  payload = transition(payload, { type: 'connect-map', flowRef: original.ref, requestId: 'connect', expectedSourceToken: sourceCanonical(original), now: NOW }) as typeof payload;
  payload = transition(payload, { type: 'stage-map', flowRef: original.ref, requestId: 'compare', now: NOW }) as typeof payload;
  // Metadata is unchanged; exact Step provenance changes alone must also make
  // the approval stale, not only sourceUrl/title changes.
  const owner = payload.sourceLifecycle!.owners[original.ref];
  for (const change of programLegacySourceChanges(owner, owner.reviews[0].incomingRevisionId)) payload = transition(payload, { type: 'choice', flowRef: original.ref, reviewId: 'compare', changeId: change.id, choice: 'incoming', now: NOW }) as typeof payload;
  payload = transition(payload, { type: 'apply', flowRef: original.ref, reviewId: 'compare', now: NOW }) as typeof payload;
  const after = inspectProgramLegacySnapshotPayload(payload); assert.ok(after.ok);
  assert.ok(after.model.flows.every(flow => flow.presentation!.mapGroup!.executionState === 'review-hold'));
  payload = transition(payload, { type: 'undo', flowRef: original.ref, now: NOW }) as typeof payload;
  const undone = inspectProgramLegacySnapshotPayload(payload); assert.ok(undone.ok); assert.ok(undone.model.flows.every(flow => flow.presentation!.mapGroup!.executionState === 'executable'));
});
test('MS06 real four-origin fixture + Map controller quota/CAS/reload and source Undo preserve all documents and external bytes', async () => {
  const file = readFileSync('tests/e2e/personal-workspace-poc.spec.ts', 'utf8'), begin = file.indexOf('    const localDate =', file.indexOf('async function installFixturesAndAudit')), end = file.indexOf('    for (const [key, value] of fixtureEntries)', begin); assert.ok(begin > 0 && end > begin);
  const code = ts.transpileModule(file.slice(begin, end), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  const entries: [string, string][] = new Function(`${code}\nreturn fixtureEntries;`)(), keys = Object.fromEntries(entries);
  const read = buildPersonalWorkspacePocReadModel({ length: entries.length, key: i => entries[i]?.[0] ?? null, getItem: key => keys[key] ?? null }, JSON.parse(keys.flow_builder_mvp_bundles_v11)); assert.ok(read.ok);
  assert.equal(new Set(read.model.flows.map(flow => flow.origin)).size, 4);
  const f = structuredMapFixture(), initial = hydrateProgramLegacy(createProgramData(), { version: 1, flows: [...read.model.flows, ...f.payload.model.flows] }, f.payload.state, { actorId, preserveUnsupported: true }); assert.ok(initial.ok);
  let data = initial.data;
  for (const flow of read.model.flows) { const view = prepareProgramLegacyView(data, { actorId, now: NOW, onlyFlowRef: flow.ref }); assert.ok(view.ok); const done = applyProgramLegacyAction(data, { actorId, expectedToken: view.token, now: NOW, action: { type: 'complete', itemRef: flow.items[0].ref, completed: true, now: NOW }, executionDate: '2026-09-12' }); assert.ok(done.transition.ok); data = done.transition.data; }
  const baseline = structuredClone(data), values = new Map([...entries, ...Object.entries(f.entries), ['nonPoC-sentinel', '  exact bytes\r\n']]), protectedBefore = [...values], writes: string[] = []; let quota = true;
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, raw: string) => { assert.equal(key, PROGRAM_STATE_KEY); writes.push(key); if (quota) throw Error('quota'); values.set(key, raw); }, removeItem: (key: string) => { assert.equal(key, PROGRAM_STATE_KEY); values.delete(key); } };
  const controller = createProgramController({ initialData: data, storage, exclusive: async work => work() }); assert.ok(controller.ok);
  const port = createProgramLegacyPort({ actorId, readData: () => controller.snapshot().envelope.data, mutate: (label, build, options) => controller.mutate(label, build, { actorId, ...options }) });
  const view = port.readSource(NOW, f.flow.ref); assert.ok(view.ok);
  const action = { type: 'connect-map' as const, flowRef: f.flow.ref, requestId: 'connect', expectedSourceToken: sourceCanonical(f.flow), now: NOW };
  assert.equal((await port.commitSource({ expectedToken: view.token, action })).ok, false); assert.deepEqual(controller.snapshot().envelope.data, baseline);
  quota = false; assert.ok((await port.commitSource({ expectedToken: view.token, action })).ok); const count = writes.length;
  assert.equal((await port.commitSource({ expectedToken: view.token, action })).ok, false); assert.equal(writes.length, count);
  const commit = async (action: ProgramLegacySourceAction) => { const view = port.readSource(NOW, f.flow.ref); assert.ok(view.ok); const result = await port.commitSource({ expectedToken: view.token, action }); assert.ok(result.ok, JSON.stringify(result)); };
  await commit({ type: 'stage-map', flowRef: f.flow.ref, requestId: 'compare', now: NOW });
  const owner = (JSON.parse(controller.snapshot().envelope.data.spaces[actorId].legacySnapshot!.raw) as ProgramLegacySnapshotPayload).sourceLifecycle!.owners[f.flow.ref];
  for (const change of programLegacySourceChanges(owner, owner.reviews[0].incomingRevisionId)) await commit({ type: 'choice', flowRef: f.flow.ref, reviewId: 'compare', changeId: change.id, choice: 'incoming', now: NOW });
  await commit({ type: 'apply', flowRef: f.flow.ref, reviewId: 'compare', now: NOW });
  const execView = port.read(NOW, f.flow.ref); assert.ok(execView.ok);
  assert.ok((await port.commit({ expectedToken: execView.token, action: { type: 'complete', itemRef: f.flow.items[0].ref, completed: true, now: NOW }, now: NOW, executionDate: '2026-09-12' })).ok);
  await commit({ type: 'undo', flowRef: f.flow.ref, now: NOW });
  const after = controller.snapshot().envelope.data;
  for (const binding of baseline.spaces[actorId].savedBindings.filter(binding => binding.flowRef !== f.flow.ref)) assert.deepEqual(M.getDocument(after.spaces[actorId].text, binding.documentId), M.getDocument(baseline.spaces[actorId].text, binding.documentId));
  const beforeBinding = baseline.spaces[actorId].savedBindings.find(binding => binding.flowRef === f.flow.ref)!;
  assert.deepEqual(after.spaces[actorId].savedBindings.find(binding => binding.flowRef === f.flow.ref), beforeBinding);
  const restored = M.tasks(after.spaces[actorId].text).find(task => task.id === beforeBinding.itemLines[f.flow.items[0].ref])!; assert.equal(restored.title, f.flow.items[0].title); assert.equal(restored.done, true);
  assert.equal(programExecutionTasks(after.spaces[actorId]).filter(task => task.done).length, 5);
  const reloaded = createProgramController({ initialData: createProgramData(), storage, exclusive: async work => work() }); assert.ok(reloaded.ok); assert.deepEqual(reloaded.snapshot().envelope.data, after);
  assert.ok((await controller.undo(actorId)).ok); assert.equal(programExecutionTasks(controller.snapshot().envelope.data.spaces[actorId]).filter(task => task.done).length, 5);
  for (const [key, raw] of protectedBefore) assert.equal(values.get(key), raw);
});
test('MS07 genuine structured evidence validation uses only the supplied memory read port, never browser storage or network', () => {
  const f = structuredMapFixture(), properties = ['localStorage', 'sessionStorage', 'fetch'] as const;
  const prior = new Map(properties.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)])); let calls = 0;
  try {
    for (const key of properties) Object.defineProperty(globalThis, key, { configurable: true, get() { calls++; throw Error(`external access: ${key}`); } });
    const current = readProgramLegacyCurrentMapSource(f.flow, NOW); assert.ok(current); assert.ok(validateProgramLegacyMapRevision(current, f.flow));
    let payload = transition(f.payload, { type: 'connect-map', flowRef: f.flow.ref, requestId: 'connect', expectedSourceToken: sourceCanonical(f.flow), now: NOW });
    payload = transition(payload, { type: 'stage-map', flowRef: f.flow.ref, requestId: 'compare', now: NOW }); assert.ok(inspectProgramLegacySnapshotPayload(payload).ok); assert.equal(calls, 0);
  } finally { for (const key of properties) { const descriptor = prior.get(key); if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); } }
});
test('MS08 real newly supplied Step uses its exact ID; explicit source Undo retains its later execution record without deleting original siblings', () => {
  const f = structuredMapFixture('moving-d30', false), removed = f.flow.items.at(-1)!; assert.ok(f.flow.items.length > 1);
  // Explicit simulated older snapshot omitted this actual catalog Step. No
  // new title or index is used to identify the subsequently supplied Step.
  const model = { ...f.payload.model, flows: f.payload.model.flows.map(flow => flow.ref === f.flow.ref ? { ...flow, items: flow.items.filter(item => item.ref !== removed.ref) } : flow) };
  const h = hydrateProgramLegacy(createProgramData(), model, f.payload.state, { actorId, preserveUnsupported: true }); assert.ok(h.ok); let data = h.data;
  const run = (action: ProgramLegacySourceAction) => { const view = prepareProgramLegacyView(data, { actorId, now: NOW, onlyFlowRef: f.flow.ref, sourceReview: true }); assert.ok(view.ok); return applyProgramLegacySourceAction(data, { actorId, expectedToken: view.token, action }); };
  const commit = (action: ProgramLegacySourceAction) => { const result = run(action); assert.ok(result.transition.ok, JSON.stringify({ issues: result.issues, conflicts: result.conflicts })); data = result.transition.data; };
  commit({ type: 'connect-map', flowRef: f.flow.ref, requestId: 'connect', expectedSourceToken: sourceCanonical(model.flows[0]), now: NOW });
  commit({ type: 'stage-map', flowRef: f.flow.ref, requestId: 'compare', now: NOW });
  const owner = (JSON.parse(data.spaces[actorId].legacySnapshot!.raw) as ProgramLegacySnapshotPayload).sourceLifecycle!.owners[f.flow.ref];
  const changes = programLegacySourceChanges(owner, owner.reviews[0].incomingRevisionId); assert.ok(changes.some(change => change.kind === 'added' && change.itemRef === removed.ref));
  for (const change of changes) commit({ type: 'choice', flowRef: f.flow.ref, reviewId: 'compare', changeId: change.id, choice: change.kind === 'added' ? 'incoming' : 'mine', now: NOW });
  commit({ type: 'apply', flowRef: f.flow.ref, reviewId: 'compare', now: NOW });
  const view = prepareProgramLegacyView(data, { actorId, now: NOW, onlyFlowRef: f.flow.ref }); assert.ok(view.ok);
  const completed = applyProgramLegacyAction(data, { actorId, now: NOW, expectedToken: view.token, action: { type: 'complete', itemRef: removed.ref, completed: true, now: NOW }, executionDate: '2026-09-12' }); assert.ok(completed.transition.ok); data = completed.transition.data;
  const before = data, denied = run({ type: 'undo', flowRef: f.flow.ref, now: NOW }); assert.equal(denied.transition.ok, false); assert.equal(denied.transition.data, before); assert.ok(denied.issues.some(issue => issue.code === 'undo-personal-record-conflict'));
  commit({ type: 'undo', flowRef: f.flow.ref, now: NOW, retainAddedItemRefs: [removed.ref] });
  const checked = inspectProgramLegacySnapshotPayload(JSON.parse(data.spaces[actorId].legacySnapshot!.raw)); assert.ok(checked.ok);
  assert.ok(checked.payload.sourceLifecycle!.owners[f.flow.ref].effective.retainedItemRefs.includes(removed.ref)); assert.deepEqual(checked.payload.model, model);
  const id = data.spaces[actorId].savedBindings.find(binding => binding.flowRef === f.flow.ref)!.itemLines[removed.ref]; assert.equal(M.tasks(data.spaces[actorId].text).find(task => task.id === id)?.done, true);
  assert.equal(checked.model.flows.find(flow => flow.ref === f.flow.ref)!.items.length, f.flow.items.length); assert.ok(inspectProgramLegacySnapshotPayload(JSON.parse(JSON.stringify(checked.payload))).ok);
});
for (const mode of ['all', 'mixed'] as const) test(`MS09 ${mode}: executed Map -> changed provenance -> hold keeps canonical records and references, blocks every writer, then explicit re-review and source Undo/reload`, async () => {
  const f = structuredMapFixture('moving-d30', false);
  // Explicitly simulated readiness hold on actual normal source content.
  const model = { ...f.payload.model, flows: f.payload.model.flows.map(flow => ({ ...flow, presentation: { ...flow.presentation, mapGroup: { ...flow.presentation!.mapGroup!, executionState: 'review-hold' as const, reviewReasons: ['원문 링크 개인 확인'] } } })) };
  const h = hydrateProgramLegacy(createProgramData(), model, f.payload.state, { actorId, preserveUnsupported: true }); assert.ok(h.ok);
  const groupRef = model.flows[0].presentation!.mapGroup!.groupRef, oldReview = readProgramLegacyMapReview(model.flows, groupRef)!;
  const view = prepareProgramLegacyView(h.data, { actorId, now: NOW, onlyFlowRefs: model.flows.map(flow => flow.ref) }); assert.ok(view.ok);
  const approved = applyProgramLegacyMapReview(h.data, { actorId, expectedToken: view.token, action: { groupRef, requestId: 'original-approval', expectedSourceToken: oldReview.sourceToken, now: NOW, acknowledgedReasons: oldReview.reasons, sourceByItemRef: Object.fromEntries(oldReview.items.map(item => [item.itemRef, item.sourceUrls[0]])) } }); assert.ok(approved.transition.ok, JSON.stringify(approved.issues));
  const initial = approved.transition.data, space = initial.spaces[actorId], binding = space.savedBindings.find(binding => binding.flowRef === f.flow.ref)!, id = binding.itemLines[f.flow.items[0].ref];
  space.text = M.updateTask(space.text, id, { title: '실행 중 개인 제목', note: '재검토 뒤에도 보존할 메모', date: '2026-10-03' }); space.text = M.recordProgress(space.text, id, '2026-09-12', 55);
  space.text = M.addDocument(space.text, { title: '연결 참조' }); const linkedDocId = space.text.documents.at(-1)!.id; space.text = M.linkTask(space.text, linkedDocId, 0, id); const linkedBefore = M.getDocument(space.text, linkedDocId);
  const values = new Map([['flow:operating-sentinel', ' original\r\n']]), writes: string[] = [];
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, raw: string) => { assert.equal(key, PROGRAM_STATE_KEY); writes.push(key); values.set(key, raw); }, removeItem: (key: string) => { assert.equal(key, PROGRAM_STATE_KEY); values.delete(key); } };
  const controller = createProgramController({ initialData: initial, storage, exclusive: async work => work() }); assert.ok(controller.ok);
  const data = () => controller.snapshot().envelope.data, port = createProgramLegacyPort({ actorId, readData: data, mutate: (label, build, options) => controller.mutate(label, build, { actorId, ...options }) });
  const commit = async (action: ProgramLegacySourceAction) => { const view = port.readSource(NOW, f.flow.ref); assert.ok(view.ok, JSON.stringify(view)); const result = await port.commitSource({ expectedToken: view.token, action }); assert.ok(result.ok, JSON.stringify(result)); };
  await commit({ type: 'connect-map', flowRef: f.flow.ref, requestId: 'connect', expectedSourceToken: sourceCanonical(model.flows[0]), now: NOW });
  await commit({ type: 'stage-map', flowRef: f.flow.ref, requestId: 'compare', now: NOW });
  const owner = (JSON.parse(data().spaces[actorId].legacySnapshot!.raw) as ProgramLegacySnapshotPayload).sourceLifecycle!.owners[f.flow.ref];
  for (const [index, change] of programLegacySourceChanges(owner, owner.reviews[0].incomingRevisionId).entries()) await commit({ type: 'choice', flowRef: f.flow.ref, reviewId: 'compare', changeId: change.id, choice: mode === 'all' || index === 0 ? 'incoming' : 'mine', now: NOW });
  await commit({ type: 'apply', flowRef: f.flow.ref, reviewId: 'compare', now: NOW });
  const held = data().spaces[actorId], task = M.tasks(held.text).find(task => task.id === id)!;
  assert.ok(task); assert.equal(task.title, '실행 중 개인 제목'); assert.equal(task.note, '재검토 뒤에도 보존할 메모'); assert.equal(task.date, '2026-10-03'); assert.equal(M.latestProgress(held.text, id)?.percent, 55);
  assert.deepEqual(M.getDocument(held.text, linkedDocId), linkedBefore); assert.ok(programLegacyTaskQualityHold(held, id)); assert.equal(programExecutionTasks(held, { period: 'all' }).some(task => task.id === id), false);
  assert.equal(programPreservesLegacyQualityHold(held, M.updateTask(held.text, id, { title: '우회' })), false);
  const count = writes.length;
  assert.equal((await controller.mutate('우회 실행', before => updateProgramTask(before, { actorId, requestId: 'bypass-title', expectedSpace: before.spaces[actorId], taskId: id, patch: { title: '우회' } }), { actorId })).ok, false);
  assert.equal((await controller.mutate('우회 기록', before => recordProgramTaskProgress(before, { actorId, requestId: 'bypass-progress', expectedSpace: before.spaces[actorId], taskId: id, date: '2026-09-13', percent: 100 }), { actorId })).ok, false);
  const heldView = port.read(NOW, f.flow.ref); assert.ok(heldView.ok, JSON.stringify(heldView)); assert.equal((await port.commit({ expectedToken: heldView.token, now: NOW, executionDate: '2026-09-13', action: { type: 'complete', itemRef: f.flow.items[0].ref, completed: true, now: NOW } })).ok, false); assert.equal(writes.length, count);
  const checked = inspectProgramLegacySnapshotPayload(JSON.parse(held.legacySnapshot!.raw)); assert.ok(checked.ok);
  const review = readProgramLegacyMapReview(checked.mapSourceFlows, groupRef, checked.payload.sourceLifecycle)!; assert.notEqual(review.sourceToken, oldReview.sourceToken); assert.deepEqual(review.blockers, []);
  const fresh = prepareProgramLegacyView(data(), { actorId, now: NOW, onlyFlowRefs: model.flows.map(flow => flow.ref) }); assert.ok(fresh.ok, JSON.stringify(fresh));
  const confirmed = await port.commitMapReview({ expectedToken: fresh.token, action: { groupRef, requestId: 'new-approval', expectedSourceToken: review.sourceToken, now: NOW, acknowledgedReasons: review.reasons, sourceByItemRef: Object.fromEntries(review.items.map(item => [item.itemRef, item.sourceUrls[0]])) } }); assert.ok(confirmed.ok, JSON.stringify(confirmed));
  assert.equal(programLegacyTaskQualityHold(data().spaces[actorId], id), null); assert.equal(M.latestProgress(data().spaces[actorId].text, id)?.percent, 55);
  await commit({ type: 'undo', flowRef: f.flow.ref, now: NOW });
  const undone = data().spaces[actorId]; assert.ok(M.tasks(undone.text).some(task => task.id === id)); assert.equal(M.latestProgress(undone.text, id)?.percent, 55); assert.deepEqual(M.getDocument(undone.text, linkedDocId), linkedBefore);
  const loaded = createProgramController({ initialData: createProgramData(), storage, exclusive: async work => work() }); assert.ok(loaded.ok); assert.deepEqual(loaded.snapshot().envelope.data, data()); assert.deepEqual(JSON.parse(undone.legacySnapshot!.raw).model, model); assert.equal(values.get('flow:operating-sentinel'), ' original\r\n');
});
test('MS10 empty saved Map Step structure stays blocked until actual same-Flow factory Steps are explicitly accepted', () => {
  const f = structuredMapFixture('moving-d30', false), model = { ...f.payload.model, flows: f.payload.model.flows.map(flow => ({ ...flow, items: [], presentation: { ...flow.presentation, mapGroup: { ...flow.presentation!.mapGroup!, executionState: 'review-hold' as const, reviewReasons: ['Step이 없는 Flow: 저장 당시 누락'] } } })) };
  const h = hydrateProgramLegacy(createProgramData(), model, f.payload.state, { actorId, preserveUnsupported: true }); assert.ok(h.ok); let data = h.data;
  const commit = (action: ProgramLegacySourceAction) => { const view = prepareProgramLegacyView(data, { actorId, now: NOW, onlyFlowRef: action.flowRef, sourceReview: true }); assert.ok(view.ok, JSON.stringify(view)); const result = applyProgramLegacySourceAction(data, { actorId, expectedToken: view.token, action }); assert.ok(result.transition.ok, JSON.stringify({ issues: result.issues, conflicts: result.conflicts })); data = result.transition.data; };
  for (const flow of model.flows) {
    commit({ type: 'connect-map', flowRef: flow.ref, requestId: `connect-${flow.flowId}`, expectedSourceToken: sourceCanonical(flow), now: NOW });
    commit({ type: 'stage-map', flowRef: flow.ref, requestId: `compare-${flow.flowId}`, now: NOW });
    const owner = (JSON.parse(data.spaces[actorId].legacySnapshot!.raw) as ProgramLegacySnapshotPayload).sourceLifecycle!.owners[flow.ref];
    const pending = inspectProgramLegacySnapshotPayload(JSON.parse(data.spaces[actorId].legacySnapshot!.raw)); assert.ok(pending.ok); assert.ok(readProgramLegacyMapReview(pending.mapSourceFlows, flow.presentation.mapGroup.groupRef, pending.payload.sourceLifecycle)!.blockers.length);
    for (const change of programLegacySourceChanges(owner, owner.reviews[0].incomingRevisionId)) commit({ type: 'choice', flowRef: flow.ref, reviewId: `compare-${flow.flowId}`, changeId: change.id, choice: 'incoming', now: NOW });
    commit({ type: 'apply', flowRef: flow.ref, reviewId: `compare-${flow.flowId}`, now: NOW });
  }
  const checked = inspectProgramLegacySnapshotPayload(JSON.parse(data.spaces[actorId].legacySnapshot!.raw)); assert.ok(checked.ok);
  const groupRef = model.flows[0].presentation.mapGroup.groupRef, ready = readProgramLegacyMapReview(checked.mapSourceFlows, groupRef, checked.payload.sourceLifecycle)!; assert.deepEqual(ready.blockers, []); assert.equal(programExecutionTasks(data.spaces[actorId], { period: 'all' }).length, 0);
  const view = prepareProgramLegacyView(data, { actorId, now: NOW, onlyFlowRefs: model.flows.map(flow => flow.ref) }); assert.ok(view.ok);
  const started = applyProgramLegacyMapReview(data, { actorId, expectedToken: view.token, action: { groupRef, requestId: 'supplied-reviewed', expectedSourceToken: ready.sourceToken, now: NOW, acknowledgedReasons: ready.reasons, sourceByItemRef: Object.fromEntries(ready.items.map(item => [item.itemRef, item.sourceUrls[0]])) } }); assert.ok(started.transition.ok, JSON.stringify(started.issues));
  assert.equal(programExecutionTasks(started.transition.data.spaces[actorId], { period: 'all' }).length, f.payload.model.flows.reduce((sum, flow) => sum + flow.items.length, 0)); assert.deepEqual(JSON.parse(started.transition.data.spaces[actorId].legacySnapshot!.raw).model, model);
});
