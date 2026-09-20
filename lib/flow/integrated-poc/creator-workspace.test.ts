import test from 'node:test';
import assert from 'node:assert/strict';
import { createProgramData, validateProgramData } from './program-data';
import { programClone, type ProgramData, type ProgramTransition } from './contract';
import { applyProgramCreatorAction, continueProgramCreatorDraft, setProgramCreatorWorking, handoffProgramCreatorDraft, previewProgramCreatorSource, fingerprintPersonalWorkspacePocAuthoringSource as fp } from './creator-workspace';
import { createPersonalWorkspacePocCreatorDraftLibrary, transitionPersonalWorkspacePocCreatorDraftLibrary } from '../personal-workspace-poc-creator-drafts';
import { validateProgramCreatorWorkspace } from './creator-workspace-validation';
import { textWorkspaceModel as M } from './text-workspace';
import { createProgramController } from './controller';
import { PROGRAM_STATE_KEY } from './contract';
import { importProgramCreatorDraft } from './creator-draft-bridge';
const NOW = '2026-09-12T09:00:00.000Z', DAY = '2026-09-12';
const RAW = '# 준비\n\n## 시작\n- [ ] 챙기기\n  - 날짜: 2026-09-15\n  - 완료 기준: 가방 확인';
function ok(result: ProgramTransition<string>) { if (!result.ok) assert.fail(result.reason); assert.ok(validateProgramData(result.data)); return result; }
function working(data = createProgramData(), rawText = RAW) { return ok(setProgramCreatorWorking(data, { actorId: data.activeActorId, expectedWorking: null, working: { draftId: 'creator-test', title: '준비', rawText, baseRecordRevision: null } }, NOW)).data; }
function save(data: ProgramData, requestId = 'save-one') {
  const workspace = data.spaces[data.activeActorId].creatorWorkspace!, w = workspace.working!;
  return applyProgramCreatorAction(data, { actorId: data.activeActorId, requestId, action: { type: 'save', draftId: w.draftId, expectedLibraryRevision: workspace.library.revision,
    ...(w.baseRecordRevision ? { expectedRecordRevision: w.baseRecordRevision } : {}), rawText: w.rawText, title: w.title, sourceFingerprint: fp(w.rawText), now: NOW } }, NOW);
}
function action(data: ProgramData, type: 'rename'|'archive'|'restore', title = '변경 이름') {
  const library = data.spaces[data.activeActorId].creatorWorkspace!.library;
  return applyProgramCreatorAction(data, { actorId: data.activeActorId, requestId: `${type}-${library.revision}`, action: { type, expectedLibraryRevision: library.revision,
    expectedRecordRevision: library.records['creator-test'].recordRevision, draftId: 'creator-test', title, now: NOW } }, NOW);
}
function handoff(data: ProgramData, requestId = 'handoff-one') { return handoffProgramCreatorDraft(data, { actorId: data.activeActorId, requestId, draftId: 'creator-test', expectedRecordRevision: data.spaces[data.activeActorId].creatorWorkspace!.library.records['creator-test'].recordRevision, today: DAY }, NOW); }
test('working autosave is separate from explicit library revision; blank working source is valid', () => {
  const data = working(createProgramData(), ''); assert.equal(data.spaces[data.activeActorId].creatorWorkspace!.library.revision, 0);
  assert.equal(save(data).ok, false); assert.ok(validateProgramData(data));
});
test('explicit save, rename, duplicate, archive and restore preserve source and independent identities', () => {
  let data = ok(save(working())).data; const baseline = M.raw(data.spaces[data.activeActorId].text.documents[0]);
  data = ok(action(data, 'rename')).data; assert.equal(data.spaces[data.activeActorId].creatorWorkspace!.library.records['creator-test'].rawText, RAW);
  let library = data.spaces[data.activeActorId].creatorWorkspace!.library;
  data = ok(applyProgramCreatorAction(data, { actorId: data.activeActorId, requestId: 'duplicate', action: { type: 'duplicate', sourceDraftId: 'creator-test', newDraftId: 'creator-copy', expectedLibraryRevision: library.revision, expectedSourceRecordRevision: library.records['creator-test'].recordRevision, now: NOW } }, NOW)).data;
  assert.equal(data.spaces[data.activeActorId].creatorWorkspace!.handoffs['creator-copy'], undefined);
  data = ok(action(data, 'archive')).data; assert.equal(handoff(data).ok, false);
  data = ok(action(data, 'restore')).data; assert.equal(data.spaces[data.activeActorId].creatorWorkspace!.library.records['creator-test'].status, 'active');
  assert.equal(M.raw(data.spaces[data.activeActorId].text.documents[0]), baseline);
});
test('same request is idempotent; mutated request, stale working and unknown actor are atomic', () => {
  const base = working(), saved = ok(save(base)), again = ok(save(base)); assert.ok(again.ok);
  const w = saved.data.spaces[saved.data.activeActorId].creatorWorkspace!.working!;
  const stale = setProgramCreatorWorking(saved.data, { actorId: saved.data.activeActorId, expectedWorking: null, working: w }, NOW); assert.equal(stale.ok, false); assert.equal(stale.data, saved.data);
  assert.equal(setProgramCreatorWorking(saved.data, { actorId: 'unknown', expectedWorking: null, working: w }, NOW).ok, false);
  const changed = programClone(w); changed.rawText += '\nchanged';
  const next = ok(setProgramCreatorWorking(saved.data, { actorId: saved.data.activeActorId, expectedWorking: w, working: changed }, NOW)).data;
  const duplicate = save(next); assert.equal(duplicate.ok, false); if (!duplicate.ok) assert.equal(duplicate.reason, 'duplicate-request');
});
test('original library current and actual one Undo are copied privately without mutating input or public data', () => {
  let library = createPersonalWorkspacePocCreatorDraftLibrary(NOW);
  library = transitionPersonalWorkspacePocCreatorDraftLibrary(library, { type: 'save', draftId: 'old-draft', rawText: RAW, sourceFingerprint: fp(RAW), expectedLibraryRevision: 0, now: NOW }).library;
  library = transitionPersonalWorkspacePocCreatorDraftLibrary(library, { type: 'rename', draftId: 'old-draft', title: '원래 이름', expectedLibraryRevision: 1, expectedRecordRevision: 1, now: NOW }).library;
  const data = createProgramData(), before = JSON.stringify({ data, library }), input = { actorId: 'local-user', requestId: 'continue-one', creatorDraftId: 'old-draft', expectedLibraryRevision: 2, expectedRecordRevision: 2 };
  const result = ok(continueProgramCreatorDraft(data, library, input, NOW));
  assert.equal(JSON.stringify({ data, library }), before); assert.deepEqual(result.data.public, data.public);
  assert.notEqual(result.result, 'old-draft'); assert.equal(result.data.spaces['local-user'].creatorWorkspace!.origins[result.result].undo!.recordRevision, 1);
  const repeated = ok(continueProgramCreatorDraft(result.data, library, input, NOW)); assert.equal(repeated.changed, false);
});
test('result reuses authoring projection; explicit handoff creates one document and same revision reopens it', () => {
  const data = ok(save(working())).data;
  const preview = previewProgramCreatorSource(data.spaces[data.activeActorId].creatorWorkspace!.working!, DAY, NOW);
  assert.equal(preview.materialized?.ok, true); assert.equal(preview.result?.ok, true);
  const result = ok(handoff(data)), again = ok(handoff(result.data, 'handoff-two'));
  assert.equal(again.result, result.result); assert.equal(again.changed, false);
  const task = M.tasks(result.data.spaces[data.activeActorId].text).find(t => t.title === '챙기기')!; assert.equal(task.date, '2026-09-15');
  assert.deepEqual(result.data.public, data.public);
});
test('same document update keeps identity and cannot overwrite personal edits; cancel is no-write', () => {
  let data = ok(handoff(ok(save(working())).data)).data;
  const space = data.spaces[data.activeActorId], id = space.creatorWorkspace!.handoffs['creator-test'].documentId;
  const originalTask = M.tasks(space.text).find(t => t.docId === id)!;
  const w = space.creatorWorkspace!.working!;
  data = ok(setProgramCreatorWorking(data, { actorId: data.activeActorId, expectedWorking: w, working: { ...w, rawText: `${RAW}\n\n추가 원문 메모` } }, NOW)).data;
  data = ok(save(data, 'save-two')).data;
  data = ok(handoff(data, 'handoff-update')).data; assert.equal(M.tasks(data.spaces[data.activeActorId].text).find(t => t.docId === id)!.id, originalTask.id);
  data.spaces[data.activeActorId].text = M.editText(data.spaces[data.activeActorId].text, id, `${M.raw(M.getDocument(data.spaces[data.activeActorId].text,id))}\n개인 메모`);
  const conflict = handoff(data, 'conflict'); assert.equal(conflict.ok, false); assert.equal(conflict.data, data);
  const cancel = ok(applyProgramCreatorAction(data, { actorId: data.activeActorId, requestId: 'cancel', action: { type: 'cancel' } }, NOW)); assert.equal(cancel.changed, false);
});
test('relative source resolves only explicit anchor; recurrence does not collapse to ordinary personal tasks', () => {
  const relative = '# 이사\n- 기준일: 2026-09-30\n\n- [ ] 준비\n  - 상대 날짜: D-3';
  const result = ok(handoff(ok(save(working(createProgramData(),relative))).data));
  assert.equal(M.tasks(result.data.spaces[result.data.activeActorId].text).find(t=>t.title==='준비')!.date,'2026-09-27');
  const recurring = '# 걷기\n\n- [ ] 걷기\n  - 날짜: 2026-09-14\n  - 반복: 매주 월\n  - 반복 종료: 2026-10-01';
  const accepted = ok(handoff(ok(save(working(createProgramData(),recurring))).data));
  assert.equal(M.tasks(accepted.data.spaces[accepted.data.activeActorId].text).filter(task => task.docId === accepted.result).length, 0);
  assert.equal(accepted.data.spaces[accepted.data.activeActorId].creatorWorkspace!.executionSources!['creator-test'].revisions[0].rows[0].kind, 'series');
});
test('strict workspace rejects corruption, foreign handoff and unknown fields', () => {
  const data = ok(save(working())).data, space = data.spaces[data.activeActorId], own = space.creatorWorkspace!;
  assert.ok(validateProgramCreatorWorkspace(own,space));
  assert.equal(validateProgramCreatorWorkspace({...own, leaked:true},space),false);
  assert.equal(validateProgramCreatorWorkspace({...own,handoffs:{'creator-test':{documentId:'foreign',recordRevision:1,raw:RAW,title:'준비'}}},space),false);
  assert.equal(validateProgramCreatorWorkspace({...own,library:null},space),false);
});
test('continuing a previously raw-imported CreatorDraft reuses that same personal document', () => {
  let library=createPersonalWorkspacePocCreatorDraftLibrary(NOW);
  library=transitionPersonalWorkspacePocCreatorDraftLibrary(library,{type:'save',draftId:'original',rawText:RAW,title:'준비',sourceFingerprint:fp(RAW),expectedLibraryRevision:0,now:NOW}).library;
  let data=createProgramData(); const actorId=data.activeActorId;
  const imported=ok(importProgramCreatorDraft(data,library,{actorId,requestId:'raw-import',creatorDraftId:'original',expectedLibraryRevision:1,expectedRecordRevision:1,expectedSourceFingerprint:fp(RAW),expectedSpace:data.spaces[actorId]},NOW));data=imported.data;
  const continued=ok(continueProgramCreatorDraft(data,library,{actorId,requestId:'continue',creatorDraftId:'original',expectedLibraryRevision:1,expectedRecordRevision:1},NOW));
  const handed=ok(handoffProgramCreatorDraft(continued.data,{actorId,requestId:'continue-handoff',draftId:continued.result,expectedRecordRevision:1,today:DAY},NOW));
  assert.equal(handed.result,imported.result);assert.equal(handed.data.spaces[actorId].text.documents.length,data.spaces[actorId].text.documents.length);
  assert.deepEqual(handed.data.spaces[actorId].creatorDraftImports,data.spaces[actorId].creatorDraftImports);
});
test('source checks are not fabricated personal execution and private source never goes into receipts', () => {
  const raw='# 원문 비공개 표식\n\n- [x] 확인\n  - [x] 하위 확인\n  - 날짜: 2026-09-15';
  const saved=ok(save(working(createProgramData(),raw))).data, handed=ok(handoff(saved)).data;
  assert.equal(JSON.stringify(handed.receipts).includes('원문 비공개 표식'),false);
  assert.deepEqual(handed.public,saved.public);assert.equal(M.tasks(handed.spaces[handed.activeActorId].text).some(t=>t.done),false);
  assert.deepEqual(handed.spaces[handed.activeActorId].text.progressRecords,[]);
});
test('dirty working source blocks archive rather than dropping autosaved input', () => {
  let data=ok(save(working())).data;const w=data.spaces[data.activeActorId].creatorWorkspace!.working!;
  data=ok(setProgramCreatorWorking(data,{actorId:data.activeActorId,expectedWorking:w,working:{...w,rawText:RAW+'\n아직 명시 저장 전'}},NOW)).data;
  const blocked=action(data,'archive');assert.equal(blocked.ok,false);assert.equal(blocked.data,data);
});
test('Program storage persists library and same-document handoff atomically; Undo/reload and quota keep operating keys intact', async () => {
  const initial=working(), actorId=initial.activeActorId, values=new Map([['flow:protected','original']]), writes:string[]=[];
  let quota=false;
  const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{assert.equal(key,PROGRAM_STATE_KEY);if(quota)throw Error('quota');writes.push(key);values.set(key,value);},removeItem:(key:string)=>{assert.equal(key,PROGRAM_STATE_KEY);values.delete(key);}};
  const controller=createProgramController({storage,initialData:initial,exclusive:async work=>work()});if(!controller.ok)assert.fail('controller');
  assert.equal((await controller.mutate('save',data=>save(data),{actorId})).ok,true);
  assert.equal((await controller.mutate('handoff',data=>handoff(data),{actorId})).ok,true);
  const id=controller.snapshot().envelope.data.spaces[actorId].creatorWorkspace!.handoffs['creator-test'].documentId;
  assert.ok(id);assert.equal((await controller.undo(actorId)).ok,true);
  const reload=createProgramController({storage,initialData:initial,exclusive:async work=>work()});if(!reload.ok)assert.fail('reload');
  assert.equal(reload.snapshot().envelope.data.spaces[actorId].creatorWorkspace!.handoffs['creator-test'],undefined);
  const staleReceipt=await reload.mutate('repeat undone',data=>handoff(data),{actorId});assert.equal(staleReceipt.ok,false);
  const before=values.get(PROGRAM_STATE_KEY);quota=true;
  assert.equal((await reload.mutate('handoff quota',data=>handoff(data,'fresh-request'),{actorId})).ok,false);
  assert.equal(values.get(PROGRAM_STATE_KEY),before);assert.equal(values.get('flow:protected'),'original');assert.ok(writes.length>0);
});
