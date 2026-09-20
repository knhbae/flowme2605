import assert from 'node:assert/strict';
import test from 'node:test';
import { programClone } from './contract';
import { createProgramData, validateProgramData } from './program-data';
import { hydrateProgramLegacy, programLegacyIdentity } from './legacy-projection';
import { applyProgramLegacyAction, prepareProgramLegacyView } from './legacy-transaction';
import { textWorkspaceModel as M } from './text-workspace';
import { createPersonalWorkspacePocState } from '../personal-workspace-poc-state';
import { materializePersonalWorkspacePocAuthoring } from '../personal-workspace-poc-authoring';
import { createProgramDocument } from './private-space';
import { moveProgramTaskDocument } from './task-document-move';
import { toPersonalWorkspacePocFlowRef, toPersonalWorkspacePocFlowItemRef, toPersonalWorkspacePocQuickItemRef, type PersonalWorkspacePocReadModel } from '../personal-workspace-poc-contract';
const ACTOR = 'local-user', NOW = '2026-09-12T05:00:00.000Z';
function fixture() {
  const savedCopyId = 'saved', flowId = 'flow', flowRef = toPersonalWorkspacePocFlowRef(savedCopyId, flowId);
  const itemRef = toPersonalWorkspacePocFlowItemRef(savedCopyId, flowId, 'one');
  const model: PersonalWorkspacePocReadModel = { version: 1, flows: [{ ref: flowRef, savedCopyId, flowId, title: '기존 계획', origin: 'legacy-saved-plan', sourceSlug: 'source',
    items: ['one', 'two'].map((itemId, sourceOrder) => ({ ref: toPersonalWorkspacePocFlowItemRef(savedCopyId, flowId, itemId), savedCopyId, flowId, itemId, title: `할 일 ${itemId}`, sourceOrder, sourceDate: '2026-09-10' })) }] };
  const state = createPersonalWorkspacePocState(NOW);
  state.folders = [{ folderId: 'a', title: '폴더 A', orderKey: 0 }, { folderId: 'b', title: '폴더 B', orderKey: 1 }];
  state.memberships = [{ member: 'saved_flow', memberRef: flowRef, folderId: 'a', orderKey: 0 }];
  const result = hydrateProgramLegacy(createProgramData(), model, state, { actorId: ACTOR }); assert.ok(result.ok);
  const binding = result.data.spaces[ACTOR].savedBindings[0];
  return { data: result.data, model, state, flowRef, itemRef, docId: binding.documentId, lineId: binding.itemLines[itemRef] };
}
function freeze<T>(value: T): T { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }

test('T15 canonical QuickItem document transfer is a read-location projection; same ID edits return without touching original model', () => {
  const f = fixture(), view = prepareProgramLegacyView(f.data, { actorId: ACTOR, now: NOW }); assert.ok(view.ok);
  const added = applyProgramLegacyAction(f.data, { actorId: ACTOR, expectedToken: view.token, now: NOW,
    action: { type: 'create-quick-item', quickItemId: 'move-quick', title: '옮길 개인 항목', memo: '보존할 메모', date: '2026-10-02', now: NOW } }); assert.ok(added.transition.ok);
  const ref = toPersonalWorkspacePocQuickItemRef('move-quick'), id = added.transition.data.spaces[ACTOR].legacyQuickItemLines[ref];
  const created = createProgramDocument(added.transition.data, { actorId: ACTOR, requestId: 'destination', expectedSpace: programClone(added.transition.data.spaces[ACTOR]), title: '별도 개인 문서', raw: '내 일반 메모' }); assert.ok(created.ok);
  const from = M.tasks(created.data.spaces[ACTOR].text).find(task => task.id === id)!.docId;
  let data = created.data;
  for (const [index, destinationId] of [created.result, from, created.result].entries()) {
    const moved = moveProgramTaskDocument(data, { actorId: ACTOR, requestId: `move-${index}`, expectedSpace: programClone(data.spaces[ACTOR]), taskId: id, destinationId }); assert.ok(moved.ok); data = moved.data;
    const beforeRaw = data.spaces[ACTOR].legacySnapshot!.raw;
    const read = prepareProgramLegacyView(data, { actorId: ACTOR, now: NOW }); assert.ok(read.ok, JSON.stringify(read));
    assert.equal(data.spaces[ACTOR].legacySnapshot!.raw, beforeRaw, 'location read does not persist a shadow');
    const completed = applyProgramLegacyAction(data, { actorId: ACTOR, expectedToken: read.token, now: NOW, executionDate: '2026-09-12', action: { type: 'complete', itemRef: ref, completed: index % 2 === 0, now: NOW } });
    assert.ok(completed.transition.ok, JSON.stringify(completed)); data = completed.transition.data;
    const task = M.tasks(data.spaces[ACTOR].text).find(task => task.id === id)!;
    assert.equal(task.docId, destinationId); assert.equal(task.note, '보존할 메모'); assert.equal(task.date, '2026-10-02');
    assert.equal(data.spaces[ACTOR].legacyQuickItemLines[ref], id); assert.deepEqual(JSON.parse(data.spaces[ACTOR].legacySnapshot!.raw).model, f.model);
    assert.ok(prepareProgramLegacyView(JSON.parse(JSON.stringify(data)), { actorId: ACTOR, now: NOW }).ok);
  }
  assert.ok(M.getDocument(data.spaces[ACTOR].text, created.result)!.lines.some(line => line.text === '내 일반 메모'));
});
test('T01 read is pure, preserves original source and exposes newer personal values to old UI', () => {
  const f = fixture(), space = f.data.spaces[ACTOR];
  space.text = M.updateTask(space.text, f.lineId, { title: '개인 제목', note: '개인 메모', date: '2026-10-01', time: '13:30' });
  M.getDocument(space.text, f.docId)!.title = '내 계획 이름';
  const before = JSON.stringify(f.data), view = prepareProgramLegacyView(freeze(f.data), { actorId: ACTOR, now: NOW });
  assert.ok(view.ok, JSON.stringify(view)); assert.equal(view.rebased, true);
  assert.deepEqual(view.payload.model, f.model); assert.equal(view.payload.state.personalPlanOverlays![f.flowRef].title, '내 계획 이름');
  assert.equal(view.payload.state.personalPlanOverlays![f.flowRef].items[f.itemRef].title, '개인 제목');
  assert.equal(view.payload.state.placements[f.itemRef].date, '2026-10-01'); assert.equal(view.payload.state.placements[f.itemRef].time, '13:30');
  assert.equal(JSON.stringify(f.data), before);
});
test('T02 Program title -> legacy view -> deliberate legacy edit -> same Program item', () => {
  const f = fixture(); f.data.spaces[ACTOR].text = M.updateTask(f.data.spaces[ACTOR].text, f.lineId, { title: 'Program 수정', note: '개인 보존 메모' });
  const view = prepareProgramLegacyView(f.data, { actorId: ACTOR, now: NOW }); assert.ok(view.ok);
  const overlay = view.payload.state.personalPlanOverlays![f.flowRef];
  const result = applyProgramLegacyAction(freeze(f.data), { actorId: ACTOR, expectedToken: view.token, now: NOW,
    action: { type: 'apply-personal-plan', flowRef: f.flowRef, savedCopyId: 'saved', flowId: 'flow', origin: 'legacy-saved-plan', expectedRevision: view.payload.state.revision,
      knownItemRefs: f.model.flows[0].items.map(item => item.ref), overlay: { ...overlay, items: { ...overlay.items, [f.itemRef]: { ...overlay.items[f.itemRef], title: '기존 도구에서 다시 수정' } } }, now: NOW } });
  assert.ok(result.transition.ok, JSON.stringify({ issues: result.issues, conflicts: result.conflicts }));
  const task = M.tasks(result.transition.data.spaces[ACTOR].text).find(task => task.id === f.lineId)!;
  assert.equal(task.title, '기존 도구에서 다시 수정'); assert.equal(task.note, '개인 보존 메모');
  const reopened = prepareProgramLegacyView(result.transition.data, { actorId: ACTOR, now: NOW }); assert.ok(reopened.ok); assert.equal(reopened.rebased, false);
  assert.deepEqual(reopened.payload.model, f.model); assert.equal(reopened.payload.state.undo, undefined);
});
test('T03 legacy completion uses explicit local day, preserves prior numeric records, and reverses on reopen', () => {
  const f = fixture(); f.data.spaces[ACTOR].text = M.recordProgress(f.data.spaces[ACTOR].text, f.lineId, '2026-09-11', 45);
  const view = prepareProgramLegacyView(f.data, { actorId: ACTOR, now: NOW }); assert.ok(view.ok);
  const result = applyProgramLegacyAction(f.data, { actorId: ACTOR, expectedToken: view.token, now: NOW, executionDate: '2026-09-12', action: { type: 'complete', itemRef: f.itemRef, completed: true, now: NOW } });
  assert.ok(result.transition.ok, JSON.stringify({ issues: result.issues, conflicts: result.conflicts }));
  const space = result.transition.data.spaces[ACTOR]; assert.equal(M.tasks(space.text).find(task => task.id === f.lineId)!.done, true);
  assert.deepEqual(M.progressHistory(space.text, f.lineId), [{ taskId: f.lineId, date: '2026-09-11', percent: 45 }, { taskId: f.lineId, date: '2026-09-12', percent: 100 }].map(({ taskId: _id, ...record }) => record));
  const reopened = prepareProgramLegacyView(result.transition.data, { actorId: ACTOR, now: NOW }); assert.ok(reopened.ok); assert.equal(reopened.payload.state.completions[f.itemRef].status, 'completed');
});
test('T04 latest Program edit rejects stale old UI rather than overwriting it', () => {
  const f = fixture(), view = prepareProgramLegacyView(f.data, { actorId: ACTOR, now: NOW }); assert.ok(view.ok);
  f.data.spaces[ACTOR].text = M.updateTask(f.data.spaces[ACTOR].text, f.lineId, { note: '뒤늦게 저장' });
  const result = applyProgramLegacyAction(f.data, { actorId: ACTOR, expectedToken: view.token, now: NOW, action: { type: 'move-date', itemRef: f.itemRef, date: '2026-10-01', now: NOW } });
  assert.equal(result.transition.ok, false); assert.equal(result.transition.data, f.data); if (!result.transition.ok) assert.equal(result.transition.reason, 'conflict');
});
test('T05 folder changes travel both ways without changing source or private added document', () => {
  const f = fixture(), space = f.data.spaces[ACTOR], folderB = programLegacyIdentity('folder', f.state.workspaceId, 'b');
  M.getDocument(space.text, f.docId)!.folderId = folderB; M.getDocument(space.text, f.docId)!.folder = '폴더 B';
  space.text.folders.find(folder => folder.id === folderB)!.title = '개인 폴더 이름'; M.getDocument(space.text, f.docId)!.folder = '개인 폴더 이름';
  space.text = M.addDocument(space.text, { title: '기존으로 보내지 않을 개인 메모' }); const privateDoc = space.text.documents.at(-1)!;
  const view = prepareProgramLegacyView(f.data, { actorId: ACTOR, now: NOW }); assert.ok(view.ok, JSON.stringify(view));
  assert.equal(view.canonicalFolders.byFlow[f.flowRef].folderId, folderB);
  assert.equal(view.canonicalFolders.byFlow[f.flowRef].path, '개인 폴더 이름');
  assert.equal(view.payload.state.memberships.find(member => member.memberRef === f.flowRef)!.folderId, 'a', 'source shadow folder is no longer the canonical filing owner');
  const result = applyProgramLegacyAction(f.data, { actorId: ACTOR, expectedToken: view.token, now: NOW, action: { type: 'move-folder', member: 'saved_flow', memberRef: f.flowRef, folderId: 'a', now: NOW } });
  assert.ok(result.transition.ok, JSON.stringify({ issues: result.issues, conflicts: result.conflicts }));
  assert.equal(M.getDocument(result.transition.data.spaces[ACTOR].text, f.docId)!.folder, '폴더 A');
  assert.deepEqual(M.getDocument(result.transition.data.spaces[ACTOR].text, privateDoc.id), privateDoc); assert.equal(validateProgramData(result.transition.data), true);
});
test('T06 old quick-item creation creates exactly one bound Program item', () => {
  const f = fixture(), view = prepareProgramLegacyView(f.data, { actorId: ACTOR, now: NOW }); assert.ok(view.ok);
  const request = { actorId: ACTOR, expectedToken: view.token, now: NOW, action: { type: 'create-quick-item' as const, quickItemId: 'new-quick', title: '기존 도구 추가', memo: '메모', date: '2026-10-02', now: NOW } };
  const result = applyProgramLegacyAction(f.data, request); assert.ok(result.transition.ok, JSON.stringify(result.issues));
  const space = result.transition.data.spaces[ACTOR], ref = toPersonalWorkspacePocQuickItemRef('new-quick');
  assert.ok(space.legacyQuickItemLines[ref]); assert.equal(M.tasks(space.text).filter(task => task.title === '기존 도구 추가').length, 1);
  assert.equal(applyProgramLegacyAction(result.transition.data, request).transition.ok, false);
});
test('T07 cancel/noop are identity and legacy undo/source/recurrence/lifecycle are explicit unsupported actions', () => {
  const f = fixture(), view = prepareProgramLegacyView(f.data, { actorId: ACTOR, now: NOW }); assert.ok(view.ok);
  const cancel = applyProgramLegacyAction(f.data, { actorId: ACTOR, expectedToken: view.token, now: NOW, action: { type: 'cancel' } });
  assert.ok(cancel.transition.ok); assert.equal(cancel.transition.changed, false); assert.equal(cancel.transition.data, f.data);
  for (const action of [{ type: 'undo' as const, now: NOW }, { type: 'move-to-trash' as const, member: 'saved_flow' as const, memberRef: f.flowRef, now: NOW }]) {
    const result = applyProgramLegacyAction(f.data, { actorId: ACTOR, expectedToken: view.token, now: NOW, action }); assert.equal(result.transition.ok, false); assert.equal(result.transition.data, f.data); assert.equal(result.issues.length, 1);
  }
});
test('T08 absent snapshot and actor/date errors fail without changing anything', () => {
  assert.equal(prepareProgramLegacyView(createProgramData(), { actorId: ACTOR, now: NOW }).ok, false);
  const f = fixture(); assert.equal(prepareProgramLegacyView(f.data, { actorId: 'creator-minji', now: NOW }).ok, false);
  assert.equal(prepareProgramLegacyView(f.data, { actorId: ACTOR, now: 'invalid' }).ok, false);
});
test('T09 date clear/inherit and timeline inclusion stay explicit across both directions', () => {
  const f = fixture(); f.data.spaces[ACTOR].text = M.updateTask(f.data.spaces[ACTOR].text, f.lineId, { date: null });
  const view = prepareProgramLegacyView(f.data, { actorId: ACTOR, now: NOW }); assert.ok(view.ok); assert.equal(view.payload.state.placements[f.itemRef].scheduleMode, 'unscheduled');
  const restored = applyProgramLegacyAction(f.data, { actorId: ACTOR, expectedToken: view.token, now: NOW, action: { type: 'restore-execution-date', itemRef: f.itemRef, now: NOW } });
  assert.ok(restored.transition.ok, JSON.stringify({ issues: restored.issues, conflicts: restored.conflicts }));
  assert.equal(M.tasks(restored.transition.data.spaces[ACTOR].text).find(task => task.id === f.lineId)!.date, '2026-09-10');
  const current = prepareProgramLegacyView(restored.transition.data, { actorId: ACTOR, now: NOW }); assert.ok(current.ok);
  const excluded = applyProgramLegacyAction(restored.transition.data, { actorId: ACTOR, expectedToken: current.token, now: NOW, action: { type: 'set-timeline-policy', itemRef: f.itemRef, policy: 'excluded', now: NOW } });
  assert.ok(excluded.transition.ok); assert.equal(excluded.transition.data.spaces[ACTOR].legacyTimelinePolicies[f.lineId], 'excluded');
});
test('T10 Program source order and date-bucket order reverse independently', () => {
  const f = fixture(), space = f.data.spaces[ACTOR], doc = M.getDocument(space.text, f.docId)!;
  const tasks = M.tasks(space.text), second = tasks[1].id;
  const secondIndex = doc.lines.findIndex(line => line.id === second); doc.lines = [...doc.lines.slice(secondIndex), ...doc.lines.slice(0, secondIndex)];
  space.timelineOrders['2026-09-10'] = [f.lineId, second];
  const view = prepareProgramLegacyView(f.data, { actorId: ACTOR, now: NOW }); assert.ok(view.ok, JSON.stringify(view));
  assert.deepEqual(view.payload.state.personalPlanOverlays![f.flowRef].orderedItemRefs, f.model.flows[0].items.map(item => item.ref).reverse());
  assert.deepEqual(view.payload.state.timelineOrders[0].orderedRefKeys, f.model.flows[0].items.map(item => item.ref));
});
test('T11 private archived imported document is not advertised as an active legacy view', () => {
  const f = fixture(); f.data.spaces[ACTOR].archivedDocumentIds = [f.docId];
  const view = prepareProgramLegacyView(f.data, { actorId: ACTOR, now: NOW }); assert.equal(view.ok, false);
  if (!view.ok) assert.equal(view.issues[0].code, 'archived-document-review-required');
});
test('T12 newly created old folder is added once into Program folder tree', () => {
  const f = fixture(), view = prepareProgramLegacyView(f.data, { actorId: ACTOR, now: NOW }); assert.ok(view.ok);
  const result = applyProgramLegacyAction(f.data, { actorId: ACTOR, expectedToken: view.token, now: NOW, action: { type: 'create-folder', folderId: 'child', title: '새 하위 폴더', parentFolderId: 'a', now: NOW } });
  assert.ok(result.transition.ok, JSON.stringify(result.issues));
  const folders = result.transition.data.spaces[ACTOR].text.folders, child = folders.find(folder => folder.title === '새 하위 폴더')!;
  assert.equal(child.parentId, programLegacyIdentity('folder', f.state.workspaceId, 'a'));
});
test('T13 inherited source time cannot be silently cleared through a schema lacking that override', () => {
  const f = fixture(), authored = materializePersonalWorkspacePocAuthoring({ handoffId: 'timed', documentId: 'timed-doc', revisionId: 'timed-v1', rawText: '# 시간 있는 원본\n- [ ] 방문\n  - 시간: 14:30\n', committedAt: NOW });
  assert.ok(authored.ok); f.state.authoredFlows = [authored.flow]; f.state.authoringReceipts = [{ handoffId: 'timed', flowRef: authored.flow.ref, committedAt: NOW }];
  const hydrated = hydrateProgramLegacy(createProgramData(), f.model, f.state, { actorId: ACTOR }); assert.ok(hydrated.ok);
  const space = hydrated.data.spaces[ACTOR], task = M.tasks(space.text).find(task => task.title === '방문')!;
  space.text = M.updateTask(space.text, task.id, { time: '' });
  const result = prepareProgramLegacyView(hydrated.data, { actorId: ACTOR, now: NOW }); assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.issues.some(issue => issue.code === 'unrepresentable-shadow-field' && issue.field === 'time'));
});
test('T14 missing canonical series document is unresolved, while unrelated ordinary plans remain reachable', () => {
  const f = fixture(), authored = materializePersonalWorkspacePocAuthoring({ handoffId: 'repeat', documentId: 'repeat-doc', revisionId: 'repeat-v1', rawText: '# 반복\n- [ ] 운동\n  - 날짜: 2026-09-13\n  - 반복: 매일\n  - 반복 종료: 5회\n', committedAt: NOW });
  assert.ok(authored.ok); f.state.authoredFlows = [authored.flow]; f.state.authoringReceipts = [{ handoffId: 'repeat', flowRef: authored.flow.ref, committedAt: NOW }];
  f.data.spaces[ACTOR].legacySnapshot!.raw = JSON.stringify({ model: f.model, state: f.state }); assert.equal(validateProgramData(f.data), true);
  const result = prepareProgramLegacyView(f.data, { actorId: ACTOR, now: NOW }); assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.issues.some(issue => issue.code === 'structure-review-required'));
  assert.equal(prepareProgramLegacyView(f.data, { actorId: ACTOR, now: NOW, onlyFlowRef: f.flowRef }).ok, true);
});
