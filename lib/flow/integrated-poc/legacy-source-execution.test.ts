import assert from 'node:assert/strict';
import test from 'node:test';
import { materializePersonalWorkspacePocAuthoring } from '../personal-workspace-poc-authoring';
import { createPersonalWorkspacePocState } from '../personal-workspace-poc-state';
import { createProgramData, validateProgramData } from './program-data';
import { hydrateProgramLegacy } from './legacy-projection';
import { applyProgramLegacySourceAction, prepareProgramLegacyView } from './legacy-transaction';
import { readProgramLegacySourceLifecycle, type ProgramLegacySourceAction } from './legacy-source-lifecycle';
import { programLegacySourceChanges } from './legacy-source-lifecycle-contract';
import { textWorkspaceModel as M } from './text-workspace';
import { PROGRAM_STATE_KEY, type ProgramData } from './contract';
import { createProgramController } from './controller';
import { createProgramLegacyPort } from './legacy-port';
import { inspectProgramLegacySnapshotPayload } from './legacy-snapshot';
import { readProgramExecutionOccurrences, updateProgramOccurrenceExecution } from './recurrence-state';

const NOW = '2026-09-12T12:00:00.000Z', ACTOR = 'local-user';
const RAW = '# 전환\n- [ ] 방문\n  - 날짜: 2026-09-13\n  - 시간: 10:00\n';
const SERIES = RAW + '  - 반복: 매일\n  - 반복 종료: 3회\n';
function fixture(raw = RAW) {
  const made = materializePersonalWorkspacePocAuthoring({ handoffId: 'kind-handoff', documentId: 'kind-doc', revisionId: 'v1', rawText: raw, committedAt: NOW }); assert.ok(made.ok);
  const state = createPersonalWorkspacePocState(NOW); state.authoredFlows = [made.flow];
  state.authoringReceipts = [{ handoffId: made.flow.authoring.handoffId, flowRef: made.flow.ref, committedAt: NOW }];
  const result = hydrateProgramLegacy(createProgramData(), { version: 1, flows: [] }, state, { actorId: ACTOR, preserveUnsupported: true }); assert.ok(result.ok);
  return { data: result.data, flow: made.flow };
}
function apply(data: ProgramData, action: ProgramLegacySourceAction) {
  const view = prepareProgramLegacyView(data, { actorId: ACTOR, now: NOW, onlyFlowRef: action.flowRef, sourceReview: true }); assert.ok(view.ok, JSON.stringify(view));
  const result = applyProgramLegacySourceAction(data, { actorId: ACTOR, expectedToken: view.token, action });
  assert.ok(result.transition.ok, JSON.stringify({ issues: result.issues, conflicts: result.conflicts }));
  assert.ok(validateProgramData(result.transition.data)); return result.transition.data;
}
function candidate(data: ProgramData, flowRef: string, rawText: string, requestId = 'change') {
  data = apply(data, { type: 'stage', flowRef, rawText, requestId, now: NOW });
  const read = readProgramLegacySourceLifecycle(JSON.parse(data.spaces[ACTOR].legacySnapshot!.raw), flowRef); assert.ok(read.ok);
  for (const change of programLegacySourceChanges(read.owner, `program-source:${requestId}`)) data = apply(data, { type: 'choice', flowRef, reviewId: requestId, changeId: change.id, choice: 'incoming', now: NOW });
  return data;
}
test('KE01 ordinary → series preserves canonical ID, private subtree/date/completion/history; source Undo restores it after occurrence records and reload', () => {
  const f = fixture(); let data = f.data, space = data.spaces[ACTOR];
  const b = space.savedBindings[0], id = b.itemLines[f.flow.items[0].ref], docId = b.documentId;
  space.text = M.updateTask(space.text, id, { title: '개인 방문', note: '개인 메모', date: '2026-09-20' });
  space.text = M.recordProgress(space.text, id, '2026-09-12', 100);
  const beforeTask = M.tasks(space.text).find(t => t.id === id)!;
  const history = JSON.stringify(space.text.progressRecords), original = JSON.parse(space.legacySnapshot!.raw);
  data = candidate(data, f.flow.ref, SERIES);
  data = apply(data, { type: 'apply', flowRef: f.flow.ref, reviewId: 'change', now: NOW });
  space = data.spaces[ACTOR];
  const archivedId = space.retentionDocuments![docId]; assert.ok(space.archivedDocumentIds.includes(archivedId));
  const kept = M.tasks(space.text).find(t => t.id === id)!;
  assert.equal(kept.docId, archivedId); assert.equal(kept.title, beforeTask.title); assert.equal(kept.date, beforeTask.date); assert.equal(kept.note, beforeTask.note); assert.equal(kept.done, true);
  assert.equal(JSON.stringify(space.text.progressRecords), history); assert.notEqual(space.savedBindings[0].itemLines[f.flow.items[0].ref], id);
  let occurrences = readProgramExecutionOccurrences(data, { actorId: ACTOR, flowRef: f.flow.ref, localToday: '2026-09-12' }); assert.ok(occurrences.ok, JSON.stringify(occurrences));
  assert.equal(occurrences.rows.length, 3); assert.ok(occurrences.rows.every(row => row.completion !== 'completed'));
  const row = occurrences.rows[0];
  const recorded = updateProgramOccurrenceExecution(data, { actorId: ACTOR, flowRef: f.flow.ref, identity: row.identity, expected: row.stored, localToday: '2026-09-12', changes: { completion: { status: 'completed', completedAt: NOW } } });
  assert.ok(recorded.ok); data = recorded.data;
  const occurrenceBytes = JSON.stringify(data.spaces[ACTOR].recurrenceExecution);
  data = apply(data, { type: 'undo', flowRef: f.flow.ref, now: NOW }); data = JSON.parse(JSON.stringify(data));
  assert.equal(JSON.stringify(data.spaces[ACTOR].recurrenceExecution), occurrenceBytes);
  const restored = M.tasks(data.spaces[ACTOR].text).find(t => t.id === id)!; assert.equal(restored.docId, docId); assert.equal(restored.title, beforeTask.title); assert.equal(restored.note, beforeTask.note); assert.equal(restored.date, beforeTask.date); assert.equal(restored.done, true);
  assert.equal(JSON.stringify(data.spaces[ACTOR].text.progressRecords), history);
  const payload = JSON.parse(data.spaces[ACTOR].legacySnapshot!.raw); assert.deepEqual(payload.model, original.model); assert.deepEqual(payload.state.authoredFlows, original.state.authoredFlows);
  assert.ok(prepareProgramLegacyView(data, { actorId: ACTOR, now: NOW, onlyFlowRef: f.flow.ref }).ok);
});

test('KE02 series → ordinary → source Undo preserves past occurrence entries without copying their completion', () => {
  const f = fixture(SERIES); let data = f.data;
  const read = readProgramExecutionOccurrences(data, { actorId: ACTOR, flowRef: f.flow.ref, localToday: '2026-09-12' }); assert.ok(read.ok);
  const row = read.rows[0];
  const changed = updateProgramOccurrenceExecution(data, { actorId: ACTOR, flowRef: f.flow.ref, identity: row.identity, expected: row.stored, localToday: '2026-09-12', changes: { completion: { status: 'completed', completedAt: NOW } } }); assert.ok(changed.ok); data = changed.data;
  const history = JSON.stringify(data.spaces[ACTOR].recurrenceExecution);
  data = candidate(data, f.flow.ref, RAW); data = apply(data, { type: 'apply', flowRef: f.flow.ref, reviewId: 'change', now: NOW });
  const task = M.tasks(data.spaces[ACTOR].text).find(t => t.isCanonical)!; assert.equal(task.done, false);
  data.spaces[ACTOR].text = M.updateTask(data.spaces[ACTOR].text, task.id, { note: '일반 전환 후 메모' });
  data = apply(data, { type: 'undo', flowRef: f.flow.ref, now: NOW });
  assert.equal(JSON.stringify(data.spaces[ACTOR].recurrenceExecution), history);
  const retained = M.tasks(data.spaces[ACTOR].text).find(t => t.id === task.id)!; assert.equal(retained.note, '일반 전환 후 메모');
  assert.ok(data.spaces[ACTOR].archivedDocumentIds.includes(retained.docId));
});

test('KE03 private child records, reference bindings, mixed sibling rows and timeline order survive two handoffs', () => {
  const f = fixture(); let data = f.data, space = data.spaces[ACTOR];
  const b = space.savedBindings[0], id = b.itemLines[f.flow.items[0].ref];
  space.text = M.editText(space.text, b.documentId, M.raw(M.getDocument(space.text, b.documentId)) + '\n  - [ ] 개인 하위 확인\n\n- [ ] 별도 개인 일\n  - 날짜: 2026-10-01');
  const child = M.parseDocument(M.getDocument(space.text, b.documentId)!, space.text).items.find(t => t.title === '개인 하위 확인')!;
  assert.ok(child); space.text = M.recordProgress(space.text, child.id, '2026-09-12', 30);
  space.text = M.addDocument(space.text, { title: '참조', folderId: 'folder-unfiled' });
  space.text = M.linkTask(space.text, space.text.documents.at(-1)!.id, 0, id);
  space.timelineOrders['2026-09-13'] = [id];
  const bindings = JSON.stringify(space.text.bindings), history = JSON.stringify(space.text.progressRecords);
  data = candidate(data, f.flow.ref, SERIES); data = apply(data, { type: 'apply', flowRef: f.flow.ref, reviewId: 'change', now: NOW });
  assert.equal(JSON.stringify(data.spaces[ACTOR].text.bindings), bindings); assert.equal(JSON.stringify(data.spaces[ACTOR].text.progressRecords), history);
  assert.equal(M.tasks(data.spaces[ACTOR].text).find(t => t.title === '별도 개인 일')!.docId, b.documentId);
  const allView=prepareProgramLegacyView(data, { actorId: ACTOR, now: NOW }); assert.ok(allView.ok,JSON.stringify(allView));
  data = apply(data, { type: 'undo', flowRef: f.flow.ref, now: NOW });
  assert.equal(JSON.stringify(data.spaces[ACTOR].text.bindings), bindings); assert.equal(JSON.stringify(data.spaces[ACTOR].text.progressRecords), history);
  assert.equal(M.tasks(data.spaces[ACTOR].text).find(t => t.id === id)!.subchecks[0].id, child.id);
});

test('KE04 kind conversion quota failure is atomic, exact retry writes one envelope, stale personal comparison rejects, reload + Program Undo preserve all bytes', async () => {
  const f = fixture(), staged = candidate(f.data, f.flow.ref, SERIES), sentinel = 'old operating bytes';
  const values = new Map<string,string>([['flow:operating', sentinel]]), calls:string[] = []; let quota = true;
  const storage = { getItem:(key:string)=>values.get(key)??null, setItem:(key:string,raw:string)=>{calls.push(key);if(quota)throw Error('QuotaExceededError');values.set(key,raw);}, removeItem:(key:string)=>{calls.push(key);values.delete(key);} };
  const controller = createProgramController({ initialData: staged, storage, exclusive: async work=>work() }); assert.ok(controller.ok);
  const port = createProgramLegacyPort({ actorId:ACTOR,readData:()=>controller.snapshot().envelope.data,mutate:(label,build,options)=>controller.mutate(label,build,{actorId:ACTOR,...options}) });
  const view = port.read(NOW,f.flow.ref); assert.ok(view.ok);
  const action:ProgramLegacySourceAction={type:'apply',flowRef:f.flow.ref,reviewId:'change',now:NOW};
  assert.equal((await port.commitSource({expectedToken:view.token,action})).ok,false); assert.equal(values.has(PROGRAM_STATE_KEY),false); assert.deepEqual(controller.snapshot().envelope.data,staged);
  quota=false; assert.ok((await port.commitSource({expectedToken:view.token,action})).ok); const saved=values.get(PROGRAM_STATE_KEY), count=calls.length;
  assert.equal((await port.commitSource({expectedToken:view.token,action})).ok,false); assert.equal(calls.length,count);
  const loaded=createProgramController({initialData:createProgramData(),storage,exclusive:async work=>work()});assert.ok(loaded.ok);assert.equal(JSON.stringify(loaded.snapshot().envelope.data),JSON.stringify(controller.snapshot().envelope.data));
  assert.ok(await loaded.undo(ACTOR)); assert.deepEqual(loaded.snapshot().envelope.data.spaces[ACTOR],staged.spaces[ACTOR]);
  assert.notEqual(saved,values.get(PROGRAM_STATE_KEY));assert.equal(values.get('flow:operating'),sentinel);assert.deepEqual([...new Set(calls)],[PROGRAM_STATE_KEY]);
  const personal=JSON.parse(JSON.stringify(staged)); const id=personal.spaces[ACTOR].savedBindings[0].itemLines[f.flow.items[0].ref];personal.spaces[ACTOR].text=M.updateTask(personal.spaces[ACTOR].text,id,{note:'나중에 수정'});
  const stale=applyProgramLegacySourceAction(personal,{actorId:ACTOR,expectedToken:view.token,action});assert.equal(stale.transition.ok,false);assert.equal(stale.transition.data,personal);
});

test('KE05 forged handoff evidence and foreign canonical retention identities never bypass source validation', () => {
  const f=fixture(SERIES), staged=candidate(f.data,f.flow.ref,SERIES.replace('3회','5회'));
  const payload=JSON.parse(staged.spaces[ACTOR].legacySnapshot!.raw);payload.sourceLifecycle.owners[f.flow.ref].executionHandoffs={version:1,itemRefs:[f.flow.items[0].ref]};
  assert.equal(inspectProgramLegacySnapshotPayload(payload).ok,false);
  const other=fixture();let data=candidate(other.data,other.flow.ref,SERIES);const b=data.spaces[ACTOR].savedBindings[0];
  data.spaces[ACTOR].text.documents.push({id:`${b.documentId}-retained`,title:'이미 있는 개인 문서',folderId:'folder-unfiled',folder:'미분류',lines:[]});
  assert.ok(validateProgramData(data));const view=prepareProgramLegacyView(data,{actorId:ACTOR,now:NOW,onlyFlowRef:other.flow.ref});assert.ok(view.ok);
  const result=applyProgramLegacySourceAction(data,{actorId:ACTOR,expectedToken:view.token,action:{type:'apply',flowRef:other.flow.ref,reviewId:'change',now:NOW}});
  assert.equal(result.transition.ok,false);assert.equal(result.transition.data,data);
});

test('KE06 only the changed tuple relocates; another ordinary source update and later personal edits still round-trip', () => {
  const raw=RAW+'- [ ] 기록\n  - 날짜: 2026-09-21\n  - 시간: 09:00\n', f=fixture(raw);let data=f.data;
  const firstId=data.spaces[ACTOR].savedBindings[0].itemLines[f.flow.items[0].ref], secondId=data.spaces[ACTOR].savedBindings[0].itemLines[f.flow.items[1].ref];
  const incoming=raw.replace('- [ ] 기록','  - 반복: 매일\n  - 반복 종료: 3회\n- [ ] 기록').replace('09:00','11:00');
  // Real source-line identity changes when lines are inserted. The old second
  // tuple is retained, not zipped to the newly materialized second Item.
  data=candidate(data,f.flow.ref,incoming);data=apply(data,{type:'apply',flowRef:f.flow.ref,reviewId:'change',now:NOW});
  assert.ok(data.spaces[ACTOR].archivedDocumentIds.includes(M.tasks(data.spaces[ACTOR].text).find(t=>t.id===firstId)!.docId));
  const second=M.tasks(data.spaces[ACTOR].text).find(t=>t.id===secondId)!;assert.ok(second);assert.equal(second.time,'09:00');
  data.spaces[ACTOR].text=M.updateTask(data.spaces[ACTOR].text,secondId,{note:'다른 항목은 계속 수정'});
  const view=prepareProgramLegacyView(data,{actorId:ACTOR,now:NOW,onlyFlowRef:f.flow.ref});assert.ok(view.ok,JSON.stringify(view));
  assert.equal(view.payload.state.personalPlanOverlays?.[f.flow.ref]?.items[f.flow.items[1].ref]?.memo,'다른 항목은 계속 수정');
  const damaged=JSON.parse(JSON.stringify(data));damaged.spaces[ACTOR].recurrenceExecution={version:1,entries:{foreign:{sourceItemRef:f.flow.items[0].ref}}};
  assert.equal(readProgramExecutionOccurrences(damaged,{actorId:ACTOR,flowRef:f.flow.ref,localToday:'2026-09-12'}).ok,false);
});

test('KE07 a newer valid retained private snapshot is preserved by source Undo, not overwritten by the old handoff', () => {
  const f=fixture();let data=candidate(f.data,f.flow.ref,SERIES);data=apply(data,{type:'apply',flowRef:f.flow.ref,reviewId:'change',now:NOW});
  const space=data.spaces[ACTOR], retainedId=space.retentionDocuments![space.savedBindings[0].documentId];
  const id=M.tasks(space.text).find(t=>t.docId===retainedId)!.id;
  space.text=M.updateTask(space.text,id,{note:'보관 이후의 개인 메모'});
  space.text=M.recordProgress(space.text,id,'2026-09-12',60);
  assert.ok(validateProgramData(data));assert.ok(prepareProgramLegacyView(data,{actorId:ACTOR,now:NOW,onlyFlowRef:f.flow.ref}).ok);
  data=apply(data,{type:'undo',flowRef:f.flow.ref,now:NOW});
  assert.equal(M.tasks(data.spaces[ACTOR].text).find(t=>t.id===id)!.note,'보관 이후의 개인 메모');
  assert.equal(M.latestProgress(data.spaces[ACTOR].text,id)!.percent,60);
});
