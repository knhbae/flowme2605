import assert from 'node:assert/strict';
import test from 'node:test';
import { programClone } from './contract';
import { createProgramData, validateProgramData } from './program-data';
import { hydrateProgramLegacy } from './legacy-projection';
import { reconcileProgramLegacy } from './legacy-reconcile';
import { textWorkspaceModel as M } from './text-workspace';
import { createPersonalWorkspacePocState } from '../personal-workspace-poc-state';
import { materializePersonalWorkspacePocAuthoring } from '../personal-workspace-poc-authoring';
import { toPersonalWorkspacePocFlowRef, toPersonalWorkspacePocFlowItemRef, toPersonalWorkspacePocQuickItemRef, toPersonalWorkspacePocMapGroupRef,
  type PersonalWorkspacePocReadModel } from '../personal-workspace-poc-contract';

const ACTOR = 'local-user', NOW = '2026-09-12T00:00:00.000Z';
function fixture() {
  const savedCopyId = 'saved-one', flowId = 'flow-one', itemId = 'item-one';
  const flowRef = toPersonalWorkspacePocFlowRef(savedCopyId, flowId), itemRef = toPersonalWorkspacePocFlowItemRef(savedCopyId, flowId, itemId);
  const model: PersonalWorkspacePocReadModel = { version: 1, flows: [{ ref: flowRef, savedCopyId, flowId, title: '원래 제목', origin: 'legacy-saved-plan', sourceSlug: 'original',
    items: [{ ref: itemRef, savedCopyId, flowId, itemId, title: '원래 할 일', description: '원문 설명', completionCriterion: '원문 완료 기준', sourceOrder: 0, sourceDate: '2026-09-10' }] }] };
  const state = createPersonalWorkspacePocState(NOW);
  state.folders.push({ folderId: 'folder-a', title: '폴더 A', orderKey: 0 }, { folderId: 'folder-b', title: '폴더 B', orderKey: 1 });
  state.memberships.push({ member: 'saved_flow', memberRef: flowRef, folderId: 'folder-a', orderKey: 0 });
  state.personalPlanOverlays = { [flowRef]: { flowRef, savedCopyId, flowId, items: { [itemRef]: { itemRef, memo: '첫 메모\n둘째 메모' } } } };
  const hydrated = hydrateProgramLegacy(createProgramData(), model, state, { actorId: ACTOR });
  assert.ok(hydrated.ok);
  const data = hydrated.data, task = M.tasks(data.spaces[ACTOR].text)[0], docId = task.docId;
  return { data, model, state, taskId: task.id, docId, flowRef, itemRef };
}
function frozen<T>(value: T): T {
  if (value && typeof value === 'object') { Object.values(value).forEach(frozen); Object.freeze(value); }
  return value;
}
test('R01 unchanged input is identity no-op and immutable', () => {
  const f = fixture(), before = JSON.stringify(f);
  const result = reconcileProgramLegacy(frozen(f.data), frozen({ model: f.model, state: f.state }), { actorId: ACTOR });
  assert.ok(result.ok); assert.equal(result.changed, false); assert.equal(result.data, f.data);
  assert.deepEqual(result.shadowPlan.patches, []); assert.equal(JSON.stringify(f), before);
});
test('R02 same task local title and legacy done/date/memo merge independently; private additions/progress remain', () => {
  const f = fixture(), space = f.data.spaces[ACTOR];
  space.text = M.updateTask(space.text, f.taskId, { title: '내 개인 제목' });
  M.getDocument(space.text, f.docId)!.lines.push({ id: 'private-note', text: '나만의 추가 문장' });
  space.text = M.addDocument(space.text, { title: '별도 개인 문서' });
  const privateDoc = space.text.documents.find(doc => doc.title === '별도 개인 문서')!;
  space.text = M.addTask(space.text, { docId: privateDoc.id, title: '개인 추가 할 일' });
  const privateTask = M.tasks(space.text).find(task => task.docId === privateDoc.id)!;
  space.text = M.recordProgress(space.text, privateTask.id, '2026-09-12', 45);
  const expectedPrivateDoc = M.getDocument(space.text, privateDoc.id)!;
  const latest = programClone(f.state); latest.revision++;
  latest.placements[f.itemRef] = { itemRef: f.itemRef, scheduleMode: 'fixed_date', date: '2026-10-05', time: '14:30', timelinePolicy: 'excluded' };
  latest.completions[f.itemRef] = { status: 'completed', completedAt: NOW };
  latest.personalPlanOverlays![f.flowRef] = { ...latest.personalPlanOverlays![f.flowRef], items: { [f.itemRef]: { itemRef: f.itemRef, memo: '기존 도구 새 메모' } } };
  const original = JSON.stringify(f.data), result = reconcileProgramLegacy(frozen(f.data), { model: f.model, state: latest }, { actorId: ACTOR });
  assert.ok(result.ok, JSON.stringify(result));
  const after = result.data.spaces[ACTOR], task = M.tasks(after.text).find(row => row.id === f.taskId)!;
  assert.equal(task.title, '내 개인 제목'); assert.equal(task.done, true); assert.equal(task.date, '2026-10-05'); assert.equal(task.time, '14:30'); assert.equal(task.note, '기존 도구 새 메모');
  assert.deepEqual(after.text.progressRecords, space.text.progressRecords); assert.deepEqual(M.getDocument(after.text, privateDoc.id), expectedPrivateDoc);
  assert.ok(M.getDocument(after.text, f.docId)!.lines.some(line => line.id === 'private-note' && line.text === '나만의 추가 문장'));
  assert.equal(after.legacySnapshot!.revision, 1); assert.equal(after.legacyTimelinePolicies[f.taskId], 'excluded');
  assert.deepEqual(result.shadowPlan.patches.filter(patch => patch.field === 'title').map(patch => patch.value), ['내 개인 제목']);
  assert.equal(JSON.stringify(f.data), original); assert.deepEqual(result.data.public, f.data.public);
  const again = reconcileProgramLegacy(result.data, { model: f.model, state: latest }, { actorId: ACTOR });
  assert.ok(again.ok); assert.equal(again.changed, false);
});
test('R03 same-field title conflict returns original object and complete comparison', () => {
  const f = fixture(); f.data.spaces[ACTOR].text = M.updateTask(f.data.spaces[ACTOR].text, f.taskId, { title: '프로그램 변경' });
  f.state.personalPlanOverlays![f.flowRef] = { ...f.state.personalPlanOverlays![f.flowRef], items: { [f.itemRef]: { itemRef: f.itemRef, title: '기존 도구 변경', memo: '첫 메모\n둘째 메모' } } };
  const result = reconcileProgramLegacy(f.data, { model: f.model, state: f.state }, { actorId: ACTOR });
  assert.equal(result.ok, false); if (result.ok) return;
  assert.equal(result.data, f.data); assert.ok(result.conflicts.some(row => row.field === 'title' && row.program === '프로그램 변경' && row.legacy === '기존 도구 변경'));
});
test('R04 different lines of the same memo are still one conflicting field', () => {
  const f = fixture(); f.data.spaces[ACTOR].text = M.updateTask(f.data.spaces[ACTOR].text, f.taskId, { note: '내 첫줄\n둘째 메모' });
  f.state.personalPlanOverlays![f.flowRef] = { ...f.state.personalPlanOverlays![f.flowRef], items: { [f.itemRef]: { itemRef: f.itemRef, memo: '첫 메모\n기존 둘째줄' } } };
  const result = reconcileProgramLegacy(f.data, { model: f.model, state: f.state }, { actorId: ACTOR });
  assert.equal(result.ok, false); if (!result.ok) assert.ok(result.conflicts.some(row => row.field === 'note'));
});
test('R05 local memo/date and legacy task title preserve each other and emit reverse plan', () => {
  const f = fixture(); f.data.spaces[ACTOR].text = M.updateTask(f.data.spaces[ACTOR].text, f.taskId, { note: '내 메모\n추가 메모\n세 번째', date: null });
  f.state.personalPlanOverlays![f.flowRef] = { ...f.state.personalPlanOverlays![f.flowRef], items: { [f.itemRef]: { itemRef: f.itemRef, title: '기존 새 제목', memo: '첫 메모\n둘째 메모' } } };
  const result = reconcileProgramLegacy(f.data, { model: f.model, state: f.state }, { actorId: ACTOR });
  assert.ok(result.ok, JSON.stringify(result));
  const task = M.tasks(result.data.spaces[ACTOR].text)[0];
  assert.equal(task.title, '기존 새 제목'); assert.equal(task.note, '내 메모\n추가 메모\n세 번째'); assert.equal(task.date, null);
  assert.ok(result.shadowPlan.patches.some(row => row.field === 'date' && row.value === null));
});
test('R06 personal flow title and legacy folder move/rename are independent', () => {
  const f = fixture(); M.getDocument(f.data.spaces[ACTOR].text, f.docId)!.title = '내 문서 이름';
  f.state.memberships[0].folderId = 'folder-b'; f.state.folders.find(folder => folder.folderId === 'folder-b')!.title = '변경 폴더';
  const result = reconcileProgramLegacy(f.data, { model: f.model, state: f.state }, { actorId: ACTOR });
  assert.ok(result.ok, JSON.stringify(result)); const doc = M.getDocument(result.data.spaces[ACTOR].text, f.docId)!;
  assert.equal(doc.title, '내 문서 이름'); assert.equal(doc.folder, '변경 폴더');
});
test('R07 matching semantic changes converge', () => {
  const f = fixture(); f.data.spaces[ACTOR].text = M.updateTask(f.data.spaces[ACTOR].text, f.taskId, { title: '같은 제목', note: '같은 메모', date: '2026-10-10' });
  f.state.personalPlanOverlays![f.flowRef] = { ...f.state.personalPlanOverlays![f.flowRef], items: { [f.itemRef]: { itemRef: f.itemRef, title: '같은 제목', memo: '같은 메모' } } };
  f.state.placements[f.itemRef] = { itemRef: f.itemRef, scheduleMode: 'fixed_date', date: '2026-10-10', timelinePolicy: 'auto' };
  const result = reconcileProgramLegacy(f.data, { model: f.model, state: f.state }, { actorId: ACTOR }); assert.ok(result.ok, JSON.stringify(result));
});
test('R08 legacy new quick item adds without replacing private documents', () => {
  const f = fixture(); f.data.spaces[ACTOR].text = M.addDocument(f.data.spaces[ACTOR].text, { title: '내 문서' });
  f.state.quickItems.push({ quickItemId: 'quick-new', title: '새 빠른 할 일', memo: '새 메모', status: 'open', createdAt: NOW });
  f.state.memberships.push({ member: 'quick_item', memberRef: toPersonalWorkspacePocQuickItemRef('quick-new'), orderKey: 0 });
  f.state.placements[toPersonalWorkspacePocQuickItemRef('quick-new')] = { itemRef: toPersonalWorkspacePocQuickItemRef('quick-new'), scheduleMode: 'unscheduled', timelinePolicy: 'auto' };
  const result = reconcileProgramLegacy(f.data, { model: f.model, state: f.state }, { actorId: ACTOR }); assert.ok(result.ok, JSON.stringify(result));
  assert.ok(M.tasks(result.data.spaces[ACTOR].text).some(task => task.title === '새 빠른 할 일'));
  assert.ok(result.data.spaces[ACTOR].legacyQuickItemLines[toPersonalWorkspacePocQuickItemRef('quick-new')]);
  assert.ok(result.data.spaces[ACTOR].text.documents.some(doc => doc.title === '내 문서'));
});
test('R09 legacy deletion remains an open review and preserves all local rows', () => {
  const f = fixture(); f.state.trashEntries = [{ member: 'saved_flow', memberRef: f.flowRef, trashedAt: NOW, hadMembership: true, previousFolderId: 'folder-a', previousOrderKey: 0 }];
  f.state.memberships = [];
  const result = reconcileProgramLegacy(f.data, { model: f.model, state: f.state }, { actorId: ACTOR });
  assert.equal(result.ok, false); assert.equal(result.data, f.data); if (!result.ok) assert.ok(result.conflicts.some(row => row.code === 'deletion-review-required'));
});
test('R10 original source edits are not silently accepted as personal refresh', () => {
  const f = fixture(), model = { ...f.model, flows: f.model.flows.map(flow => ({ ...flow, title: '새 원본 판본' })) };
  const result = reconcileProgramLegacy(f.data, { model, state: f.state }, { actorId: ACTOR });
  assert.equal(result.ok, false); if (!result.ok) assert.equal(result.conflicts[0].code, 'source-review-required');
});
test('R11 wrong actor/workspace, stale baseline/revision and invalid inputs are atomic', () => {
  const f = fixture();
  for (const result of [
    reconcileProgramLegacy(f.data, { model: f.model, state: f.state }, { actorId: 'absent' }),
    reconcileProgramLegacy(f.data, { model: f.model, state: f.state }, { actorId: ACTOR, expectedSnapshotRaw: 'stale' }),
    reconcileProgramLegacy(f.data, { model: f.model, state: { ...f.state, workspaceId: 'another' } }, { actorId: ACTOR }),
    reconcileProgramLegacy(f.data, { model: f.model, state: { ...f.state, revision: -1 } }, { actorId: ACTOR }),
  ]) { assert.equal(result.ok, false); assert.equal(result.data, f.data); }
});
test('R12 recurrence occurrence data remains unresolved instead of a collapsed checkbox', () => {
  const f = fixture(); f.state.occurrencePlacements = { 'occurrence:one': { occurrenceId: 'occurrence:one', sourceItemRef: f.itemRef, originalDate: '2026-09-10', scheduleMode: 'fixed_date', date: '2026-09-11' } };
  const result = reconcileProgramLegacy(f.data, { model: f.model, state: f.state }, { actorId: ACTOR }); assert.equal(result.ok, false); assert.equal(result.data, f.data);
});
test('R13 private folders/title and other actors/public/receipts remain untouched', () => {
  const f = fixture(), otherId = f.data.actors.find(actor => actor.id !== ACTOR)!.id;
  const other = programClone(f.data.spaces[otherId]), publicData = programClone(f.data.public);
  f.state.completions[f.itemRef] = { status: 'completed', completedAt: NOW };
  const result = reconcileProgramLegacy(f.data, { model: f.model, state: f.state }, { actorId: ACTOR }); assert.ok(result.ok);
  assert.equal(validateProgramData(result.data), true); assert.deepEqual(result.data.spaces[otherId], other); assert.deepEqual(result.data.public, publicData); assert.deepEqual(result.data.receipts, f.data.receipts);
});
test('R14 legacy completion cannot silently override a personal numeric progress record', () => {
  const f = fixture(); f.data.spaces[ACTOR].text = M.recordProgress(f.data.spaces[ACTOR].text, f.taskId, '2026-09-12', 45);
  f.state.completions[f.itemRef] = { status: 'completed', completedAt: NOW };
  const result = reconcileProgramLegacy(f.data, { model: f.model, state: f.state }, { actorId: ACTOR });
  assert.equal(result.ok, false); assert.equal(result.data, f.data);
  if (!result.ok) assert.ok(result.conflicts.some(row => row.field === 'done-vs-progress'));
});
test('R15 same new time with distinct editor/source line IDs converges once', () => {
  const f = fixture(); f.data.spaces[ACTOR].text = M.updateTask(f.data.spaces[ACTOR].text, f.taskId, { time: '12:30' });
  f.state.placements[f.itemRef] = { itemRef: f.itemRef, scheduleMode: 'inherit', time: '12:30', timelinePolicy: 'auto' };
  const result = reconcileProgramLegacy(f.data, { model: f.model, state: f.state }, { actorId: ACTOR }); assert.ok(result.ok, JSON.stringify(result));
  assert.equal(M.getDocument(result.data.spaces[ACTOR].text, f.docId)!.lines.filter(line => /시간:/.test(line.text)).length, 1);
});
test('R16 new recurring authored content is retained as non-executable series metadata beside ordinary tasks', () => {
  const f = fixture(), authored = materializePersonalWorkspacePocAuthoring({ handoffId: 'repeat-handoff', documentId: 'repeat-doc', revisionId: 'repeat-revision',
    rawText: '# 반복\n- [ ] 운동\n  - 날짜: 2026-09-13\n  - 반복: 매일\n  - 반복 종료: 5회\n', committedAt: NOW });
  assert.ok(authored.ok); f.state.authoredFlows = [authored.flow]; f.state.authoringReceipts = [{ handoffId: authored.flow.authoring.handoffId, flowRef: authored.flow.ref, committedAt: NOW }];
  const result = reconcileProgramLegacy(f.data, { model: f.model, state: f.state }, { actorId: ACTOR }); assert.ok(result.ok);
  const binding = result.data.spaces[ACTOR].savedBindings.find(row => row.flowRef === authored.flow.ref)!;
  assert.ok(binding); assert.equal(M.tasks(result.data.spaces[ACTOR].text).some(task => task.id === binding.itemLines[authored.flow.items[0].ref]), false);
  assert.ok(M.getDocument(result.data.spaces[ACTOR].text, binding.documentId)!.lines.some(line => line.text.includes('반복')));
  assert.equal(M.tasks(result.data.spaces[ACTOR].text).some(task => task.id === f.taskId), true);
});
test('R17 review-held Map never becomes silently executable', () => {
  const f = fixture(), model = { ...f.model, flows: f.model.flows.map(flow => ({ ...flow, presentation: { mapGroup: { groupRef: toPersonalWorkspacePocMapGroupRef('held'), ownerId: 'held', title: '검토 대기',
    childCount: 1, childOrder: 0, executionState: 'review-hold' as const, reviewReasons: ['출처 확인'] } } })) };
  const result = reconcileProgramLegacy(f.data, { model, state: f.state }, { actorId: ACTOR }); assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.conflicts.some(issue => issue.code === 'source-review-required'), 'changing an ordinary source into held Map is still a source-owner change, not ordinary reconciliation');
});
test('R18 getter/cycle input never invokes caller code or writes anything', () => {
  const f = fixture(); let reads = 0; const model = programClone(f.model);
  Object.defineProperty(model.flows[0], 'title', { enumerable: true, get: () => { reads++; return 'bad'; } });
  assert.equal(reconcileProgramLegacy(f.data, { model, state: f.state }, { actorId: ACTOR }).ok, false); assert.equal(reads, 0);
});
test('R19 same-field folder move conflict preserves both choices and old baseline', () => {
  const f = fixture(), doc = M.getDocument(f.data.spaces[ACTOR].text, f.docId)!;
  doc.folderId = 'folder-unfiled'; doc.folder = '미분류'; f.state.memberships[0].folderId = 'folder-b';
  const result = reconcileProgramLegacy(f.data, { model: f.model, state: f.state }, { actorId: ACTOR }); assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.conflicts.some(row => row.field === 'folderId'));
  assert.equal(result.data, f.data);
});

test('R20 parser-owned property after private prose still reports a real same-field conflict', () => {
  const f=fixture(),space=f.data.spaces[ACTOR];space.text=M.updateTask(space.text,f.taskId,{time:'12:30'});
  const doc=M.getDocument(space.text,f.docId)!,line=doc.lines.find(l=>l.text.includes('시간:'))!;
  doc.lines.splice(doc.lines.indexOf(line),0,{id:'private-before-time',text:'  다른 개인 문장'});
  f.state.placements[f.itemRef]={itemRef:f.itemRef,scheduleMode:'inherit',time:'16:00',timelinePolicy:'auto'};
  const before=JSON.stringify(f.data),result=reconcileProgramLegacy(f.data,{model:f.model,state:f.state},{actorId:ACTOR});
  assert.equal(result.ok,false);if(!result.ok)assert.ok(result.conflicts.some(c=>c.field==='time'&&c.program==='12:30'&&c.legacy==='16:00'));
  assert.equal(result.data,f.data);assert.equal(JSON.stringify(f.data),before);
});

test('R21 duplicate raw IDs and detached properties are not repaired by guessing a preceding Item', () => {
  const f=fixture(),doc=M.getDocument(f.data.spaces[ACTOR].text,f.docId)!;
  doc.lines.push({id:'detached-heading',text:'# 다른 문맥'},{id:'detached-property',text:'  - 시간: 19:00'});
  assert.ok(validateProgramData(f.data));const before=JSON.stringify(f.data);
  const unchanged=reconcileProgramLegacy(f.data,{model:f.model,state:f.state},{actorId:ACTOR});assert.ok(unchanged.ok);assert.equal(JSON.stringify(unchanged.data),before);
  assert.equal(M.tasks(unchanged.data.spaces[ACTOR].text).find(t=>t.id===f.taskId)!.time,null);
  doc.lines.push({...doc.lines[0]});const corrupt=reconcileProgramLegacy(f.data,{model:f.model,state:f.state},{actorId:ACTOR});
  assert.equal(corrupt.ok,false);if(!corrupt.ok)assert.equal(corrupt.reason,'invalid');assert.equal(corrupt.data,f.data);
});
