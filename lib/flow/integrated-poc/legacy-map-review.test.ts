import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { buildSourceBackedFlowMapSavedSnapshot, buildSourceBackedFlowMapPersistenceRecord, sourceBackedMyFlowBundles } from '../source-backed-my-flow';
import { buildPersonalWorkspacePocReadModel } from '../personal-workspace-poc-read-model';
import { createPersonalWorkspacePocState } from '../personal-workspace-poc-state';
import { readProgramLegacyMapReview, transitionProgramLegacyMapReview, programLegacyTaskQualityHold, programPreservesLegacyQualityHold, type ProgramLegacyMapReviewAction } from './legacy-map-review';
import { inspectProgramLegacySnapshotPayload, type ProgramLegacySnapshotPayload } from './legacy-snapshot';
import { hydrateProgramLegacy } from './legacy-projection';
import { createProgramData, validateProgramData } from './program-data';
import { applyProgramLegacyMapReview, applyProgramLegacyAction, prepareProgramLegacyView } from './legacy-transaction';
import { reconcileProgramLegacy } from './legacy-reconcile';
import { createProgramController } from './controller';
import { createProgramLegacyPort } from './legacy-port';
import { textWorkspaceModel as M } from './text-workspace';
import { PROGRAM_STATE_KEY, programClone } from './contract';
import { toPersonalWorkspacePocFlowRef, toPersonalWorkspacePocFlowItemRef } from '../personal-workspace-poc-contract';
import { completeProgramTask, recordProgramTaskProgress, updateProgramTask } from './private-space';
import { programExecutionTasks } from './execution';

const NOW = '2026-09-12T10:45:00.000Z', ACTOR = 'local-user';
/** Genuine source-backed factory; readiness fault is explicitly simulated. */
export function mapReviewFixture(mapId = 'moving-d30', injectHold = true) {
  const saved = buildSourceBackedFlowMapSavedSnapshot(mapId, { savedAt: NOW, anchor: '2026-09-30' });
  const persisted = buildSourceBackedFlowMapPersistenceRecord(mapId, { savedAt: NOW, anchor: '2026-09-30' });
  assert.ok(saved); assert.ok(persisted);
  if (injectHold) persisted.readiness = { ...persisted.readiness, content: 'needs_creator_review', reasons: ['원문 링크가 없는 Step: 출처를 개인 실행 전에 확인'] };
  const keys: Record<string, string> = { [`flow:map:saved:${mapId}`]: JSON.stringify(saved), [`flow:map:persistence:${mapId}`]: JSON.stringify(persisted) };
  const model = buildPersonalWorkspacePocReadModel({ get length() { return Object.keys(keys).length; }, key: index => Object.keys(keys)[index] ?? null, getItem: key => keys[key] ?? null }, sourceBackedMyFlowBundles);
  assert.ok(model.ok, JSON.stringify(model));
  const payload: ProgramLegacySnapshotPayload = { model: model.model, state: createPersonalWorkspacePocState(NOW) };
  const checked = inspectProgramLegacySnapshotPayload(payload); assert.ok(checked.ok);
  const groupRef = checked.model.flows[0].presentation!.mapGroup!.groupRef;
  const view = readProgramLegacyMapReview(checked.mapSourceFlows, groupRef)!;
  const action: ProgramLegacyMapReviewAction = { groupRef, expectedSourceToken: view.sourceToken, requestId: 'map-review-one', now: NOW,
    acknowledgedReasons: [...view.reasons], sourceByItemRef: Object.fromEntries(view.items.map(item => [item.itemRef, item.sourceUrls[0]])) };
  const hydrated = hydrateProgramLegacy(createProgramData(), payload.model, payload.state, { actorId: ACTOR, preserveUnsupported: true }); assert.ok(hydrated.ok);
  return { payload, data: hydrated.data, action, view, sourceKeys: keys };
}

test('MR01 real source-backed Map source selection opens execution without altering operating source, raw model or state', () => {
  const f = mapReviewFixture(); assert.deepEqual(f.view.blockers, []); assert.ok(f.view.items.length > 1);
  const before = JSON.stringify(f.payload), reviewed = transitionProgramLegacyMapReview(f.payload.model.flows, undefined, f.action); assert.ok(reviewed.ok);
  const next = { ...f.payload, mapReview: reviewed.store }, checked = inspectProgramLegacySnapshotPayload(next); assert.ok(checked.ok);
  assert.ok(checked.model.flows.every(flow => flow.presentation!.mapGroup!.executionState === 'executable'));
  assert.equal(JSON.stringify(f.payload), before); assert.deepEqual(next.model, f.payload.model); assert.deepEqual(next.state, f.payload.state);
  assert.equal(inspectProgramLegacySnapshotPayload(JSON.parse(JSON.stringify(next))).ok, true);
});

test('MR02 exact reasons and item source mappings are required; unknown/unsafe URLs and foreign IDs never unlock', () => {
  const f = mapReviewFixture(), ref = f.view.items[0].itemRef;
  for (const action of [{ ...f.action, acknowledgedReasons: [] }, { ...f.action, sourceByItemRef: {} },
    ...['javascript:alert(1)', 'http://localhost/a', 'https://127.0.0.1/a', 'https://unknown.example/a'].map(url => ({ ...f.action, sourceByItemRef: { ...f.action.sourceByItemRef, [ref]: url } })),
    { ...f.action, sourceByItemRef: { ...f.action.sourceByItemRef, foreign: f.view.items[0].sourceUrls[0] } }]) {
    assert.equal(transitionProgramLegacyMapReview(f.payload.model.flows, undefined, action).ok, false);
  }
});

test('MR03 quality gates and missing actual source structure cannot be acknowledged away', () => {
  const f = mapReviewFixture(), clone = programClone(f.payload);
  const flows = clone.model.flows.map(flow => ({ ...flow, presentation: { ...flow.presentation, mapGroup: { ...flow.presentation!.mapGroup!, ownerId: 'baby-weaning-150-180' } } }));
  assert.ok(readProgramLegacyMapReview(flows, f.action.groupRef)!.blockers.length);
  const missing = f.payload.model.flows.map(flow => ({ ...flow, items: [], presentation: { ...flow.presentation, discovery: { sourceUrls: [] } } }));
  assert.ok(readProgramLegacyMapReview(missing, f.action.groupRef)!.blockers.length);
});

test('MR04 stale source retains review evidence but never keeps execution unlocked; duplicate request is idempotent', () => {
  const f = mapReviewFixture(), once = transitionProgramLegacyMapReview(f.payload.model.flows, undefined, f.action); assert.ok(once.ok);
  const twice = transitionProgramLegacyMapReview(f.payload.model.flows, once.store, f.action); assert.ok(twice.ok); assert.equal(twice.changed, false);
  const changed = { ...f.payload, model: { ...f.payload.model, flows: f.payload.model.flows.map(flow => ({ ...flow, title: `${flow.title} 원문 수정` })) }, mapReview: once.store };
  const checked = inspectProgramLegacySnapshotPayload(changed); assert.ok(checked.ok);
  assert.ok(checked.model.flows.every(flow => flow.presentation!.mapGroup!.executionState === 'review-hold'));
  assert.deepEqual(checked.payload.mapReview, once.store);
  assert.equal(transitionProgramLegacyMapReview(changed.model.flows, once.store, f.action).ok, false);
});

test('MR05 common transaction converts metadata to canonical same-ID tasks and ordinary edits round-trip; generic owner injection rejected', () => {
  const f = mapReviewFixture(), view = prepareProgramLegacyView(f.data, { actorId: ACTOR, now: NOW }); assert.ok(view.ok);
  const result = applyProgramLegacyMapReview(f.data, { actorId: ACTOR, expectedToken: view.token, action: f.action }); assert.ok(result.transition.ok, JSON.stringify(result));
  const data = result.transition.data, space = data.spaces[ACTOR]; assert.equal(validateProgramData(data), true);
  assert.equal(M.tasks(space.text).length, f.view.items.length);
  assert.deepEqual(space.savedBindings[0].itemLines, f.data.spaces[ACTOR].savedBindings[0].itemLines);
  const reopened = prepareProgramLegacyView(data, { actorId: ACTOR, now: NOW }); assert.ok(reopened.ok, JSON.stringify(reopened));
  const item = f.view.items[0];
  const completed = applyProgramLegacyAction(data, { actorId: ACTOR, expectedToken: reopened.token, now: NOW, executionDate: '2026-09-12', action: { type: 'complete', itemRef: item.itemRef, completed: true, now: NOW } }); assert.ok(completed.transition.ok, JSON.stringify(completed));
  const completedView = prepareProgramLegacyView(completed.transition.data, { actorId: ACTOR, now: NOW }); assert.ok(completedView.ok);
  assert.equal(completedView.payload.state.completions[item.itemRef].status, 'completed');
  const original = JSON.parse(f.data.spaces[ACTOR].legacySnapshot!.raw), raw = JSON.parse(space.legacySnapshot!.raw);
  assert.deepEqual(raw.model, original.model); assert.deepEqual(raw.state, original.state);
  const injected = reconcileProgramLegacy(f.data, raw, { actorId: ACTOR }); assert.equal(injected.ok, false);
});

test('MR06 single Program writer, Undo/reload, stale CAS and quota failure preserve full source and private state', async () => {
  const f = mapReviewFixture(); let raw: string | null = null, writes = 0, reject = false;
  const storage = { getItem: (key: string) => { assert.equal(key, PROGRAM_STATE_KEY); return raw; }, setItem: (key: string, value: string) => { assert.equal(key, PROGRAM_STATE_KEY); if (reject) throw Error('quota'); writes++; raw = value; }, removeItem: () => { throw Error('unexpected remove'); } };
  const controller = createProgramController({ storage, initialData: f.data, exclusive: async work => work() }); assert.ok(controller.ok);
  const port = createProgramLegacyPort({ actorId: ACTOR, readData: () => controller.snapshot().envelope.data, mutate: (label, build, options) => controller.mutate(label, build, { actorId: ACTOR, ...options }) });
  const view = port.read(NOW); assert.ok(view.ok);
  reject = true; assert.equal((await port.commitMapReview({ expectedToken: view.token, action: f.action })).ok, false); assert.equal(raw, null); assert.equal(writes, 0);
  reject = false; assert.equal((await port.commitMapReview({ expectedToken: view.token, action: f.action })).ok, true); assert.equal(writes, 1);
  assert.equal((await port.commitMapReview({ expectedToken: view.token, action: f.action })).ok, false); assert.equal(writes, 1);
  assert.equal((await controller.undo(ACTOR)).ok, true); assert.equal(writes, 2);
  assert.deepEqual(controller.snapshot().envelope.data.spaces[ACTOR], f.data.spaces[ACTOR]);
  const reload = createProgramController({ storage, initialData: createProgramData(), exclusive: async work => work() }); assert.ok(reload.ok);
  assert.deepEqual(reload.snapshot().envelope.data.spaces[ACTOR], f.data.spaces[ACTOR]); assert.equal(writes, 2);
});

test('MR07 unrelated archived plan cannot block Map approval and its exact private contents remain untouched', () => {
  const f = mapReviewFixture(), savedCopyId = 'unrelated-copy', flowId = 'unrelated-flow';
  const extra = { ref: toPersonalWorkspacePocFlowRef(savedCopyId, flowId), savedCopyId, flowId, sourceSlug: 'unrelated-source', title: '보관한 다른 계획', origin: 'legacy-saved-plan' as const,
    items: [{ ref: toPersonalWorkspacePocFlowItemRef(savedCopyId, flowId, 'item'), savedCopyId, flowId, itemId: 'item', title: '다른 일', sourceOrder: 0 }] };
  const initial = hydrateProgramLegacy(createProgramData(), { ...f.payload.model, flows: [...f.payload.model.flows, extra] }, f.payload.state, { actorId: ACTOR, preserveUnsupported: true }); assert.ok(initial.ok);
  const space = initial.data.spaces[ACTOR], docId = space.savedBindings.find(binding => binding.flowRef === extra.ref)!.documentId;
  space.archivedDocumentIds.push(docId); const original = programClone(M.getDocument(space.text, docId));
  const reviewed = applyProgramLegacyMapReview(initial.data, { actorId: ACTOR, expectedToken: JSON.stringify(space), action: f.action }); assert.ok(reviewed.transition.ok, JSON.stringify(reviewed));
  assert.deepEqual(M.getDocument(reviewed.transition.data.spaces[ACTOR].text, docId), original);
  assert.deepEqual(reviewed.transition.data.spaces[ACTOR].archivedDocumentIds, [docId]);
});

test('MR08 genuine two-child Map reviews the whole group atomically and never permits a partial child acknowledgment', () => {
  const f = mapReviewFixture('curated-opic-mock-course'); assert.equal(f.view.children.length, 2); assert.deepEqual(f.view.blockers, []);
  const firstChild = f.view.children[0].ref;
  const partial = { ...f.action, sourceByItemRef: Object.fromEntries(f.view.items.filter(item => item.flowRef === firstChild).map(item => [item.itemRef, item.sourceUrls[0]])) };
  assert.equal(transitionProgramLegacyMapReview(f.payload.model.flows, undefined, partial).ok, false);
  const result = applyProgramLegacyMapReview(f.data, { actorId: ACTOR, expectedToken: JSON.stringify(f.data.spaces[ACTOR]), action: f.action }); assert.ok(result.transition.ok, JSON.stringify(result));
  const read = inspectProgramLegacySnapshotPayload(JSON.parse(result.transition.data.spaces[ACTOR].legacySnapshot!.raw)); assert.ok(read.ok);
  assert.equal(read.model.flows.filter(flow => flow.presentation?.mapGroup?.executionState === 'executable').length, 2);
  assert.equal(M.tasks(result.transition.data.spaces[ACTOR].text).length, f.view.items.length);
});

const QUALITY_HELD_MAPS = ['baby-health-schedule', 'year-end-tax-submit', 'curated-funmom-learning-park', 'curated-child-vaccination-schedule', 'baby-food-map'];
for (const mapId of QUALITY_HELD_MAPS) test(`MR09 actual quality-held ${mapId}: readiness-ready source cannot bypass Program execution gate`, () => {
  const f = mapReviewFixture(mapId, false), before = JSON.stringify(f.payload);
  assert.ok(f.payload.model.flows.every(flow => flow.presentation?.mapGroup?.executionState === 'executable'), 'genuine old readiness reader is executable; no hold is injected');
  const checked = inspectProgramLegacySnapshotPayload(f.payload); assert.ok(checked.ok);
  const view = prepareProgramLegacyView(f.data, { actorId: ACTOR, now: NOW }); assert.ok(view.ok);
  const result = applyProgramLegacyAction(f.data, { actorId: ACTOR, expectedToken: view.token, now: NOW, executionDate: '2026-09-12',
    action: { type: 'complete', itemRef: f.view.items[0].itemRef, completed: true, now: NOW } });
  assert.ok(checked.model.flows.every(flow => flow.presentation?.mapGroup?.executionState === 'review-hold'), `Program read must apply the real public quality hold; direct completion currently accepted=${result.transition.ok}`);
  assert.equal(M.tasks(f.data.spaces[ACTOR].text).length, 0, 'new canonical execution is not manufactured');
  assert.equal(JSON.stringify(f.payload), before, 'original source and private state stay byte-equivalent');
  assert.equal(result.transition.ok, false); assert.equal(result.transition.data, f.data);
  assert.equal(applyProgramLegacyMapReview(f.data, { actorId: ACTOR, expectedToken: view.token, action: f.action }).transition.ok, false);
});

for (const mapId of QUALITY_HELD_MAPS) test(`MR10 already-saved checkbox ${mapId}: private editor/progress/subcheck/reference cannot bypass quality hold; old records remain`, () => {
  const f = mapReviewFixture(mapId, false), data = programClone(f.data), space = data.spaces[ACTOR];
  // Explicit pre-guard Program document shape; original factory snapshot bytes
  // are untouched. Do not claim this reconstruction is a user's saved profile.
  for (const binding of space.savedBindings) for (const [ref, id] of Object.entries(binding.itemLines)) {
    const source = f.view.items.find(item => item.itemRef === ref)!, doc = M.getDocument(space.text, binding.documentId)!;
    doc.lines.find(line => line.id === id)!.text = `- [ ] ${source.title}`;
    space.text.taskScopes[id] = binding.documentId; space.text.itemScopes[id] = binding.documentId;
  }
  const binding = space.savedBindings[0], taskId = Object.values(binding.itemLines)[0], doc = M.getDocument(space.text, binding.documentId)!;
  const childId = 'held-existing-subcheck';
  doc.lines.splice(doc.lines.findIndex(line => line.id === taskId) + 1, 0, { id: childId, text: '  - [ ] 기존 하위 기록' });
  space.text.taskScopes[childId] = binding.documentId; space.text.itemScopes[childId] = binding.documentId;
  space.text = M.recordProgress(space.text, taskId, '2026-09-10', 37);
  assert.equal(validateProgramData(data), true);
  const original = JSON.stringify(space), oldRaw = space.legacySnapshot!.raw;
  assert.ok(M.tasks(space.text).length); assert.equal(programExecutionTasks(space).length, 0);
  assert.ok(programLegacyTaskQualityHold(space, taskId)); assert.ok(programLegacyTaskQualityHold(space, childId));
  assert.ok(programPreservesLegacyQualityHold(space, space.text));
  const base = { actorId: ACTOR, expectedSpace: programClone(space), requestId: 'quality-denied' };
  for (const id of [taskId, childId]) {
    assert.equal(completeProgramTask(data, { ...base, taskId: id, date: '2026-09-12', done: true }).ok, false);
    assert.equal(recordProgramTaskProgress(data, { ...base, taskId: id, date: '2026-09-12', percent: 50 }).ok, false);
    assert.equal(updateProgramTask(data, { ...base, taskId: id, patch: { title: '우회 변경' } }).ok, false);
    for (const patch of [{ title: '우회 제목' }, { date: '2026-10-01' }, { time: '11:30' }, { note: '우회 메모' }]) {
      const next = M.updateTask(space.text, id, patch);
      assert.equal(programPreservesLegacyQualityHold(space, next), false, JSON.stringify({ id, patch }));
    }
    assert.equal(programPreservesLegacyQualityHold(space, M.recordProgress(space.text, id, '2026-09-12', 100)), false);
  }
  const sourceEdit = programClone(space.text); M.getDocument(sourceEdit, binding.documentId)!.lines.find(line => line.id === taskId)!.text += ' 원문 변경';
  assert.equal(programPreservesLegacyQualityHold(space, sourceEdit), false);
  const normal = programClone(space.text); normal.documents.push({ id: 'normal-doc', title: '개인 메모', folderId: 'folder-unfiled', folder: '미분류', lines: [{ id: 'normal-line', text: '다른 개인 문서의 자유로운 편집' }] });
  assert.equal(programPreservesLegacyQualityHold(space, normal), true);
  assert.equal(JSON.stringify(space), original); assert.equal(space.legacySnapshot!.raw, oldRaw);
  assert.deepEqual(M.progressHistory(space.text, taskId), [{ date: '2026-09-10', percent: 37 }]);
});

test('MR11 a normal real Map remains executable without any personal review approval', () => {
  const f = mapReviewFixture('moving-d30', false), view = prepareProgramLegacyView(f.data, { actorId: ACTOR, now: NOW }); assert.ok(view.ok);
  assert.ok(programExecutionTasks(f.data.spaces[ACTOR]).length > 0);
  const result = applyProgramLegacyAction(f.data, { actorId: ACTOR, expectedToken: view.token, now: NOW, executionDate: '2026-09-12', action: { type: 'complete', itemRef: f.view.items[0].itemRef, completed: true, now: NOW } }); assert.ok(result.transition.ok);
});

test('MR12 existing genuine four-origin storage fixtures remain readable and each ordinary completion still works', () => {
  const file = readFileSync('tests/e2e/personal-workspace-poc.spec.ts', 'utf8');
  const begin = file.indexOf('    const localDate =', file.indexOf('async function installFixturesAndAudit'));
  const end = file.indexOf('    for (const [key, value] of fixtureEntries)', begin);
  assert.ok(begin > 0 && end > begin);
  // Declarations only: never execute the old E2E page, storage audit or writer.
  const code = ts.transpileModule(file.slice(begin, end), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  const entries: [string, string][] = new Function(`${code}\nreturn fixtureEntries;`)();
  const keys = Object.fromEntries(entries), before = JSON.stringify(keys);
  const read = buildPersonalWorkspacePocReadModel({ get length() { return entries.length; }, key: index => entries[index]?.[0] ?? null, getItem: key => keys[key] ?? null }, JSON.parse(keys.flow_builder_mvp_bundles_v11)); assert.ok(read.ok);
  assert.deepEqual([...new Set(read.model.flows.map(flow => flow.origin))].sort(), ['canonical-personal-copy', 'legacy-saved-plan', 'personal-draft', 'source-backed-map'].sort());
  const initial = hydrateProgramLegacy(createProgramData(), read.model, createPersonalWorkspacePocState(NOW), { actorId: ACTOR, preserveUnsupported: true }); assert.ok(initial.ok);
  let data = initial.data;
  for (const flow of read.model.flows) {
    const view = prepareProgramLegacyView(data, { actorId: ACTOR, now: NOW, onlyFlowRef: flow.ref }); assert.ok(view.ok);
    const result = applyProgramLegacyAction(data, { actorId: ACTOR, expectedToken: view.token, now: NOW, executionDate: '2026-09-12', action: { type: 'complete', itemRef: flow.items[0].ref, completed: true, now: NOW } }); assert.ok(result.transition.ok, JSON.stringify(result)); data = result.transition.data;
  }
  assert.equal(programExecutionTasks(data.spaces[ACTOR]).filter(task => task.done).length, 4);
  assert.equal(JSON.stringify(keys), before);
});
