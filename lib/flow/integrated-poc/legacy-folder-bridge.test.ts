import test from 'node:test';
import assert from 'node:assert/strict';
import { PROGRAM_STATE_KEY, type ProgramData } from './contract';
import { createProgramData, validateProgramData } from './program-data';
import { createProgramFolder, renameProgramFolder, moveProgramFolder, deleteProgramFolder, setProgramDocumentFolder } from './private-space';
import { hydrateProgramLegacy, programLegacyIdentity } from './legacy-projection';
import { prepareProgramLegacyView, applyProgramLegacyAction } from './legacy-transaction';
import { programLegacyFolders, setProgramLegacyFlowFolder } from './legacy-folder-bridge';
import { createProgramLegacyPort } from './legacy-port';
import { createProgramController } from './controller';
import { textWorkspaceModel as M } from './text-workspace';
import { createPersonalWorkspacePocState } from '../personal-workspace-poc-state';
import { toPersonalWorkspacePocFlowRef, toPersonalWorkspacePocFlowItemRef, type PersonalWorkspacePocReadModel } from '../personal-workspace-poc-contract';
const ACTOR = 'local-user', NOW = '2026-09-12T09:00:00.000Z';
let request = 0;
const base = (data: ProgramData) => ({ actorId: ACTOR, expectedSpace: data.spaces[ACTOR], requestId: `folder-test-${++request}` });
function fixture() {
  const model: PersonalWorkspacePocReadModel = { version: 1, flows: ['a', 'b'].map(id => ({ ref: toPersonalWorkspacePocFlowRef(id, id), savedCopyId: id, flowId: id,
    title: `계획 ${id}`, origin: 'legacy-saved-plan', sourceSlug: `source-${id}`, items: [{ ref: toPersonalWorkspacePocFlowItemRef(id, id, 'one'), savedCopyId: id, flowId: id, itemId: 'one', title: `할 일 ${id}`, sourceOrder: 0, sourceDate: '2026-09-12' }] })) };
  const state = createPersonalWorkspacePocState(NOW); state.folders = [{ folderId: 'old-parent', title: '이전 상위', orderKey: 0 }, { folderId: 'old-child', title: '이전 하위', parentFolderId: 'old-parent', orderKey: 0 }];
  state.memberships = model.flows.map((flow, orderKey) => ({ member: 'saved_flow', memberRef: flow.ref, folderId: 'old-child', orderKey }));
  const result = hydrateProgramLegacy(createProgramData(), model, state, { actorId: ACTOR }); assert.ok(result.ok, result.ok ? '' : result.reason);
  return { data: result.data, model, state, flowRef: model.flows[0].ref, otherRef: model.flows[1].ref, itemRef: model.flows[0].items[0].ref };
}
function deepFolders(data: ProgramData) {
  const ids: string[] = [];
  for (const title of ['프로젝트', '이사', '서류']) {
    const made = createProgramFolder(data, { ...base(data), title, parentId: ids.at(-1) ?? null }); assert.ok(made.ok);
    ids.push(made.result); data = made.data;
  }
  return { data, ids };
}
test('F01 new three-level canonical folders, old folder rename/move/delete and inherited task ownership remain readable without modifying the source snapshot', () => {
  const f = fixture(), original = f.data.spaces[ACTOR].legacySnapshot!.raw;
  let { data, ids } = deepFolders(f.data);
  const docId = data.spaces[ACTOR].savedBindings[0].documentId;
  const moved = setProgramDocumentFolder(data, { ...base(data), documentId: docId, folderId: ids[2] }); assert.ok(moved.ok); data = moved.data;
  let view = prepareProgramLegacyView(data, { actorId: ACTOR, now: NOW }); assert.ok(view.ok, JSON.stringify(view));
  assert.equal(view.canonicalFolders.byFlow[f.flowRef].path, '프로젝트 / 이사 / 서류');
  assert.equal(view.canonicalFolders.byItem[f.itemRef].folderId, ids[2]);
  assert.equal(M.tasks(data.spaces[ACTOR].text, { folder: ids[0] }).filter(task => task.id === data.spaces[ACTOR].savedBindings[0].itemLines[f.itemRef]).length, 1);
  const oldParent = programLegacyIdentity('folder', f.state.workspaceId, 'old-parent'), oldChild = programLegacyIdentity('folder', f.state.workspaceId, 'old-child');
  let result = renameProgramFolder(data, { ...base(data), folderId: oldParent, title: '바꾼 상위' }); assert.ok(result.ok); data = result.data;
  result = moveProgramFolder(data, { ...base(data), folderId: oldParent, parentId: ids[2] }); assert.ok(result.ok); data = result.data;
  view = prepareProgramLegacyView(data, { actorId: ACTOR, now: NOW }); assert.ok(view.ok);
  assert.equal(view.canonicalFolders.byFlow[f.otherRef].path, '프로젝트 / 이사 / 서류 / 바꾼 상위 / 이전 하위');
  assert.equal(view.canonicalFolders.folders.find(folder => folder.id === oldChild)!.depth, 4);
  result = deleteProgramFolder(data, { ...base(data), folderId: oldChild }); assert.ok(result.ok); data = result.data;
  assert.equal(programLegacyFolders(data.spaces[ACTOR]).byFlow[f.otherRef].folderId, 'folder-unfiled');
  result = deleteProgramFolder(data, { ...base(data), folderId: ids[2] }); assert.ok(result.ok); data = result.data;
  assert.equal(programLegacyFolders(data.spaces[ACTOR]).byFlow[f.flowRef].folderId, 'folder-unfiled');
  assert.equal(data.spaces[ACTOR].text.folders.find(folder => folder.id === oldParent)!.parentId, null);
  assert.ok(prepareProgramLegacyView(data, { actorId: ACTOR, now: NOW }).ok);
  assert.equal(data.spaces[ACTOR].legacySnapshot!.raw, original); assert.equal(validateProgramData(data), true);
});
test('F02 canonical folder port is one shared transaction with exact target, no-op/stale guards, reload and Undo', async () => {
  const f = fixture(), prepared = deepFolders(f.data), values = new Map<string, string>([['flow:protected', 'original']]); let writes = 0;
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { assert.equal(key, PROGRAM_STATE_KEY); writes++; values.set(key, value); }, removeItem: () => assert.fail('no removal') };
  const controller = createProgramController({ initialData: prepared.data, storage, exclusive: async run => run() }); assert.ok(controller.ok);
  const read = () => controller.snapshot().envelope.data;
  const port = createProgramLegacyPort({ actorId: ACTOR, readData: read, mutate: (label, build, options) => controller.mutate(label, build, { actorId: ACTOR, ...options }) });
  const before = read(), originalRaw = before.spaces[ACTOR].legacySnapshot!.raw, token = JSON.stringify(before.spaces[ACTOR]);
  const request = { flowRef: f.flowRef, folderId: prepared.ids[2], expectedToken: token, requestId: 'folder-port' };
  assert.ok((await port.commitFolder(request)).ok); assert.equal(writes, 1);
  assert.equal(port.read(NOW, f.flowRef).ok, true);
  const folderView = programLegacyFolders(read().spaces[ACTOR]); assert.equal(folderView.byFlow[f.flowRef].folderId, prepared.ids[2]); assert.equal(folderView.byItem[f.itemRef].folderId, prepared.ids[2]);
  assert.equal((await port.commitFolder({ ...request, requestId: 'stale-folder' })).ok, false); assert.equal(writes, 1);
  assert.ok((await port.commitFolder({ ...request, expectedToken: JSON.stringify(read().spaces[ACTOR]), requestId: 'same-folder' })).ok); assert.equal(writes, 1);
  const reopened = createProgramController({ initialData: createProgramData(), storage, exclusive: async run => run() }); assert.ok(reopened.ok);
  assert.equal(programLegacyFolders(reopened.snapshot().envelope.data.spaces[ACTOR]).byFlow[f.flowRef].folderId, prepared.ids[2]);
  assert.ok((await controller.undo(ACTOR)).ok); assert.equal(writes, 2);
  assert.equal(programLegacyFolders(read().spaces[ACTOR]).byFlow[f.flowRef].folderId, programLegacyIdentity('folder', f.state.workspaceId, 'old-child'));
  assert.equal(read().spaces[ACTOR].legacySnapshot!.raw, originalRaw); assert.equal(values.get('flow:protected'), 'original');
});
test('F03 one archived linked document cannot block another flow read/edit, and the archived document stays byte-identical', () => {
  const f = fixture(), space = f.data.spaces[ACTOR], blocked = space.savedBindings.find(binding => binding.flowRef === f.otherRef)!;
  space.archivedDocumentIds.push(blocked.documentId);
  const blockedBefore = JSON.stringify(M.getDocument(space.text, blocked.documentId));
  assert.equal(prepareProgramLegacyView(f.data, { actorId: ACTOR, now: NOW, onlyFlowRef: f.otherRef }).ok, false);
  const view = prepareProgramLegacyView(f.data, { actorId: ACTOR, now: NOW, onlyFlowRef: f.flowRef }); assert.ok(view.ok);
  const changed = applyProgramLegacyAction(f.data, { actorId: ACTOR, now: NOW, expectedToken: view.token,
    action: { type: 'move-date', itemRef: f.itemRef, date: '2026-10-12', now: NOW } });
  assert.ok(changed.transition.ok, JSON.stringify(changed));
  assert.equal(JSON.stringify(M.getDocument(changed.transition.data.spaces[ACTOR].text, blocked.documentId)), blockedBefore);
  assert.deepEqual(changed.transition.data.spaces[ACTOR].archivedDocumentIds, [blocked.documentId]);
  assert.equal(M.tasks(changed.transition.data.spaces[ACTOR].text).find(task => task.id === space.savedBindings[0].itemLines[f.itemRef])!.date, '2026-10-12');
});
test('F04 one unsupported structural edit remains local while a different flow commits normally', () => {
  const f = fixture(), space = f.data.spaces[ACTOR], blocked = space.savedBindings.find(binding => binding.flowRef === f.otherRef)!;
  const doc = M.getDocument(space.text, blocked.documentId)!;
  space.text = M.editText(space.text, doc.id, M.raw(doc) + '\n  - [ ] 개인적으로 추가한 하위 항목');
  assert.equal(validateProgramData(f.data), true);
  const before = JSON.stringify(M.getDocument(space.text, blocked.documentId));
  const bad = prepareProgramLegacyView(f.data, { actorId: ACTOR, now: NOW, onlyFlowRef: f.otherRef }); assert.equal(bad.ok, false);
  const good = prepareProgramLegacyView(f.data, { actorId: ACTOR, now: NOW, onlyFlowRef: f.flowRef }); assert.ok(good.ok, JSON.stringify(good));
  const changed = applyProgramLegacyAction(f.data, { actorId: ACTOR, now: NOW, expectedToken: good.token, action: { type: 'complete', itemRef: f.itemRef, completed: true, now: NOW }, executionDate: '2026-09-12' });
  assert.ok(changed.transition.ok, JSON.stringify(changed));
  assert.equal(JSON.stringify(M.getDocument(changed.transition.data.spaces[ACTOR].text, blocked.documentId)), before);
  assert.deepEqual(JSON.parse(changed.transition.data.spaces[ACTOR].legacySnapshot!.raw).model, f.model);
});
test('F05 deep folder stays canonical while a later legacy title/date edit is reconciled', () => {
  const f = fixture(), prepared = deepFolders(f.data), original = JSON.parse(f.data.spaces[ACTOR].legacySnapshot!.raw);
  let data = prepared.data, target = data.spaces[ACTOR].savedBindings[0];
  const filed = setProgramLegacyFlowFolder(data, { actorId: ACTOR, expectedToken: JSON.stringify(data.spaces[ACTOR]), flowRef: f.flowRef, folderId: prepared.ids[2], requestId: 'file-deep' }); assert.ok(filed.ok); data = filed.data;
  const beforeFolders = JSON.stringify(data.spaces[ACTOR].text.folders), view = prepareProgramLegacyView(data, { actorId: ACTOR, now: NOW, onlyFlowRef: f.flowRef }); assert.ok(view.ok);
  const changed = applyProgramLegacyAction(data, { actorId: ACTOR, now: NOW, expectedToken: view.token, action: { type: 'move-date', itemRef: f.itemRef, date: '2026-12-01', now: NOW } }); assert.ok(changed.transition.ok, JSON.stringify(changed));
  const after = changed.transition.data.spaces[ACTOR]; assert.equal(JSON.stringify(after.text.folders), beforeFolders); assert.equal(M.getDocument(after.text, target.documentId)!.folderId, prepared.ids[2]);
  assert.equal(programLegacyFolders(after).byItem[f.itemRef].path, '프로젝트 / 이사 / 서류');
  assert.deepEqual(JSON.parse(after.legacySnapshot!.raw).model, original.model); assert.deepEqual(JSON.parse(after.legacySnapshot!.raw).sourceCandidateStore, original.sourceCandidateStore);
});
test('F06 foreign actors, stale tokens and unknown canonical folder IDs never mutate data', () => {
  const f = fixture(), token = JSON.stringify(f.data.spaces[ACTOR]), input = { actorId: ACTOR, expectedToken: token, flowRef: f.flowRef, folderId: 'missing', requestId: 'negative' };
  for (const request of [input, { ...input, actorId: 'creator-minji' }, { ...input, expectedToken: 'stale' }, { ...input, flowRef: 'foreign' }]) {
    const result = setProgramLegacyFlowFolder(f.data, request); assert.equal(result.ok, false); assert.equal(result.data, f.data);
  }
});
test('F07 folder write failure preserves both views and an exact retry cannot touch other actors, public content or the legacy snapshot', async () => {
  const f = fixture(), prepared = deepFolders(f.data); let raw: string | null = null, fault = true, writes = 0;
  const controller = createProgramController({ initialData: prepared.data, exclusive: async run => run(), storage: {
    getItem: key => { assert.equal(key, PROGRAM_STATE_KEY); return raw; },
    setItem: (key, value) => { assert.equal(key, PROGRAM_STATE_KEY); if (fault) throw Error('quota'); raw = value; writes++; },
    removeItem: () => { raw = null; },
  } }); assert.ok(controller.ok);
  const read = () => controller.snapshot().envelope.data;
  const port = createProgramLegacyPort({ actorId: ACTOR, readData: read, mutate: (label, build, options) => controller.mutate(label, build, { actorId: ACTOR, ...options }) });
  const before = read(), input = { flowRef: f.flowRef, folderId: prepared.ids[2], requestId: 'retry-folder', expectedToken: JSON.stringify(before.spaces[ACTOR]) };
  assert.equal((await port.commitFolder(input)).ok, false); assert.deepEqual(read(), before); assert.equal(writes, 0);
  fault = false; assert.ok((await port.commitFolder(input)).ok); assert.equal(writes, 1);
  const after = read(); assert.deepEqual(after.public, before.public);
  for (const actor of before.actors.filter(actor => actor.id !== ACTOR)) assert.deepEqual(after.spaces[actor.id], before.spaces[actor.id]);
  assert.equal(after.spaces[ACTOR].legacySnapshot!.raw, before.spaces[ACTOR].legacySnapshot!.raw);
  assert.deepEqual(after.spaces[ACTOR].savedBindings, before.spaces[ACTOR].savedBindings);
});
