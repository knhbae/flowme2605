import test from 'node:test';
import assert from 'node:assert/strict';
import { createProgramData, validateProgramData, createProgramEnvelope } from './program-data';
import { programClone, PROGRAM_STATE_KEY, type ProgramData, type ProgramTransition } from './contract';
import { setProgramCreatorWorking, applyProgramCreatorAction, handoffProgramCreatorDraft, fingerprintPersonalWorkspacePocAuthoringSource as fp } from './creator-workspace';
import { listPersonalWorkspacePocStructureTemplatePreviews } from './creator-workspace-tools';
import { currentCreatorExecutionRevision } from './creator-execution-source';
import { resolveProgramExecutionSource, programCreatorTaskSourceFacts } from './execution-source';
import { readProgramExecutionOccurrences, readProgramOccurrencePeriod, updateProgramOccurrenceExecution } from './recurrence-state';
import { readProgramOccurrenceRecovery, reconnectProgramOccurrenceSource } from './recurrence-recovery';
import { programRecurrencePeriodRows, programPreservesSeriesMetadata } from './recurrence-target';
import { createProgramController } from './controller';
import { textWorkspaceModel as M } from './text-workspace';
import { createProgramDocument, archiveProgramDocument } from './private-space';
import { moveProgramTaskDocument } from './task-document-move';
import { materializePersonalWorkspacePocAuthoring } from '../personal-workspace-poc-authoring';
import { createPersonalWorkspacePocState } from '../personal-workspace-poc-state';
import { hydrateProgramLegacy } from './legacy-projection';
import type { PersonalWorkspacePocResultSourceAttributes } from '../personal-workspace-poc-source-attributes-contract';
const actorId = 'local-user', NOW = '2026-09-12T12:00:00.000Z', TODAY = '2026-09-12';
export const CREATOR_SERIES_RAW = '# 운동\n\n## 시작\n- [ ] 걷기\n  - 날짜: 2026-09-14\n  - 시간: 09:30\n  - 시간대: Asia/Seoul\n  - 반복: 매주 월\n  - 반복 종료: 2026-10-30';
export function creatorAccept(result: ProgramTransition<string>) { if (!result.ok) assert.fail(result.reason); assert(validateProgramData(result.data)); return result; }
export function saveCreatorExecution(raw = CREATOR_SERIES_RAW, data = createProgramData()) {
  const previous = data.spaces[actorId].creatorWorkspace?.working ?? null;
  const working = creatorAccept(setProgramCreatorWorking(data, { actorId, expectedWorking: previous, working: { draftId: 'creator-exec-test', title: '제작 실행', rawText: raw, baseRecordRevision: previous?.baseRecordRevision ?? null } }, NOW)).data;
  const library = working.spaces[actorId].creatorWorkspace!.library;
  return creatorAccept(applyProgramCreatorAction(working, { actorId, requestId: `save-${library.revision}`, action: { type: 'save', draftId: 'creator-exec-test', rawText: raw, title: '제작 실행', sourceFingerprint: fp(raw), expectedLibraryRevision: library.revision,
    ...(previous?.baseRecordRevision ? { expectedRecordRevision: previous.baseRecordRevision } : {}), now: NOW } }, NOW)).data;
}
export function handoffCreatorExecution(data: ProgramData) { return handoffProgramCreatorDraft(data, { actorId, requestId: `handoff-${data.spaces[actorId].creatorWorkspace!.library.revision}`, draftId: 'creator-exec-test', expectedRecordRevision: data.spaces[actorId].creatorWorkspace!.library.records['creator-exec-test'].recordRevision, today: TODAY }, NOW); }
function own(data: ProgramData) { const owner = data.spaces[actorId].creatorWorkspace!.executionSources!['creator-exec-test']; return { owner, revision: currentCreatorExecutionRevision(owner) }; }
function read(data: ProgramData) { const { revision } = own(data); const result = readProgramExecutionOccurrences(data, { actorId, flowRef: revision.flow.ref, localToday: TODAY }); assert(result.ok, result.ok ? '' : result.reason); return result; }

for (const template of listPersonalWorkspacePocStructureTemplatePreviews()) test(`real ${template.templateId}: source rows retain genuine IDs and repeat/timezone execution is usable`, () => {
  const initial = saveCreatorExecution(template.expectedRawText), before = JSON.stringify(initial), result = creatorAccept(handoffCreatorExecution(initial)), space = result.data.spaces[actorId];
  const { owner, revision } = own(result.data), resolved = resolveProgramExecutionSource(space, revision.flow.ref); assert(resolved.ok && resolved.kind === 'creator');
  assert.equal(space.legacySnapshot, null); assert.equal(space.savedBindings.length, 0); assert.equal(revision.raw, template.expectedRawText);
  assert.equal(revision.rows.length, revision.flow.items.length); assert.equal(new Set(revision.rows.map(r => r.rowId)).size, revision.rows.length);
  for (const row of revision.rows) assert.equal(revision.flow.authoring.sourceLineItemIdentityMap![String(row.sourceLine)].itemRef, row.itemRef);
  const execution = read(result.data);
  assert.equal(execution.series.length, revision.rows.filter(r => r.kind === 'series').length);
  for (const row of execution.rows) { assert(row.identity.creatorOwner); assert.equal(row.identity.creatorOwner.ownerId, owner.id); assert.equal(row.completion, 'unrecorded'); assert.equal(row.completedAt, null); }
  for (const row of revision.rows) {
    const facts = programCreatorTaskSourceFacts(space, owner.documentId, row.documentLineId); assert(facts);
    const attrs: PersonalWorkspacePocResultSourceAttributes = resolved.contexts.get(row.itemRef)!.attributes; assert.equal(facts.timeZone, attrs.timeZone ?? null); assert.equal(facts.wallTime, attrs.time ?? null);
  }
  assert.equal(JSON.stringify(initial), before); assert.deepEqual(result.data.public, initial.public);
});

test('creator occurrence complete/move/reopen/exclude and effective-date periods share one owner with immutable source', () => {
  let data = creatorAccept(handoffCreatorExecution(saveCreatorExecution())).data; const snapshot = JSON.stringify(own(data).owner), initial = read(data).rows[0];
  const input = { actorId, flowRef: initial.identity.sourceFlowRef, localToday: TODAY, identity: initial.identity, expected: initial.stored };
  data = creatorAccept(updateProgramOccurrenceExecution(data, { ...input, changes: { completion: { status: 'completed', completedAt: NOW }, schedule: { mode: 'fixed_date', date: '2027-03-05' } } })).data;
  const moved = readProgramOccurrencePeriod(data, { actorId, flowRef: input.flowRef, localToday: TODAY, from: '2027-03-05', to: '2027-03-05' }); assert(moved.ok); assert.equal(moved.rows.length,1); assert.equal(moved.rows[0].key,initial.key); assert.equal(moved.rows[0].timeZone,'Asia/Seoul');
  data = creatorAccept(updateProgramOccurrenceExecution(data, { ...input, expected: moved.rows[0].stored, changes: { completion: { status: 'open', completedAt: null }, participation: 'excluded' } })).data;
  assert.equal(programRecurrencePeriodRows(data,{period:'week',date:'2027-03-05',today:TODAY}).rows.length,0);
  assert.equal(programRecurrencePeriodRows(data,{period:'week',date:'2027-03-05',today:TODAY,includeExcluded:true}).rows.filter(r=>r.key===initial.key).length,1);
  assert.equal(JSON.stringify(own(data).owner),snapshot);
});

test('prefix insertion preserves canonical row/occurrence identity while actual materializer ref changes; explicit reconnect retains records', () => {
  let data = creatorAccept(handoffCreatorExecution(saveCreatorExecution())).data, initial = read(data).rows[0];
  data = creatorAccept(updateProgramOccurrenceExecution(data,{actorId,flowRef:initial.identity.sourceFlowRef,localToday:TODAY,identity:initial.identity,expected:null,changes:{completion:{status:'completed',completedAt:NOW}}})).data;
  const oldOwner = programClone(own(data).owner), oldEntry = programClone(read(data).rows[0].stored!);
  data = creatorAccept(handoffCreatorExecution(saveCreatorExecution('제작 설명 추가\n'+CREATOR_SERIES_RAW,data))).data;
  const changed = read(data).rows[0]; assert.equal(changed.key,initial.key); assert.notEqual(changed.sourceItemRef,initial.sourceItemRef); assert(changed.sourceConflict);
  assert.deepEqual(own(data).owner.revisions[0],oldOwner.revisions[0]); assert.deepEqual(data.spaces[actorId].recurrenceExecution!.entries[initial.key],oldEntry);
  const recovery = readProgramOccurrenceRecovery(data,{actorId,localToday:TODAY}); assert.equal(recovery.length,1); assert(recovery[0].canReconnect);
  const kept = creatorAccept(reconnectProgramOccurrenceSource(data,{actorId,localToday:TODAY,expected:oldEntry,currentIdentity:changed.identity,choice:'keep'})); assert.equal(kept.changed,false);
  data = creatorAccept(reconnectProgramOccurrenceSource(data,{actorId,localToday:TODAY,expected:oldEntry,currentIdentity:changed.identity,choice:'reconnect'})).data;
  assert.equal(read(data).rows[0].completion,'completed'); assert.equal(read(data).rows[0].completedAt,NOW);
});

test('rule change and series-to-ordinary retain old occurrence history without assigning it to new work', () => {
  let data = creatorAccept(handoffCreatorExecution(saveCreatorExecution())).data; const row = read(data).rows[0];
  data = creatorAccept(updateProgramOccurrenceExecution(data,{actorId,flowRef:row.identity.sourceFlowRef,localToday:TODAY,identity:row.identity,expected:null,changes:{completion:{status:'completed',completedAt:NOW}}})).data;
  const old = programClone(data.spaces[actorId].recurrenceExecution);
  data = creatorAccept(handoffCreatorExecution(saveCreatorExecution(CREATOR_SERIES_RAW.replace('매주 월','매주 화'),data))).data;
  assert.deepEqual(data.spaces[actorId].recurrenceExecution,old); assert.equal(readProgramOccurrenceRecovery(data,{actorId,localToday:TODAY})[0].canReconnect,false);
  const ordinary = CREATOR_SERIES_RAW.replace('\n  - 반복: 매주 월\n  - 반복 종료: 2026-10-30','');
  data = creatorAccept(handoffCreatorExecution(saveCreatorExecution(ordinary,data))).data;
  assert.equal(read(data).rows.length,0); assert.equal(readProgramOccurrenceRecovery(data,{actorId,localToday:TODAY}).length,1);
  assert.deepEqual(data.spaces[actorId].recurrenceExecution,old); assert.equal(M.tasks(data.spaces[actorId].text).filter(t=>t.docId===own(data).owner.documentId).length,1);
});

test('ordinary-to-series preserves prior task/progress in private archived retention and creates no completed occurrences', () => {
  const ordinary = CREATOR_SERIES_RAW.replace('\n  - 반복: 매주 월\n  - 반복 종료: 2026-10-30','');
  let data = creatorAccept(handoffCreatorExecution(saveCreatorExecution(ordinary))).data;
  const docId = own(data).owner.documentId, task = M.tasks(data.spaces[actorId].text).find(t=>t.docId===docId)!;
  data.spaces[actorId].text = M.recordProgress(data.spaces[actorId].text,task.id,TODAY,20);
  const records = programClone(data.spaces[actorId].text.progressRecords);
  data = creatorAccept(handoffCreatorExecution(saveCreatorExecution(CREATOR_SERIES_RAW,data))).data;
  const retained = data.spaces[actorId].retentionDocuments![docId]; assert(retained); assert(data.spaces[actorId].archivedDocumentIds.includes(retained));
  assert(M.getDocument(data.spaces[actorId].text,retained)!.lines.some(l=>l.id===task.id));
  assert.deepEqual(data.spaces[actorId].text.progressRecords,records); assert(read(data).rows.every(r=>r.completion==='unrecorded'));
});

test('series source metadata is protected and private changes conflict rather than overwritten', () => {
  const data = creatorAccept(handoffCreatorExecution(saveCreatorExecution())).data, space=data.spaces[actorId], docId=own(data).owner.documentId;
  const changed=M.editText(space.text,docId,M.raw(M.getDocument(space.text,docId)).replace('09:30','11:00'));
  assert.equal(programPreservesSeriesMetadata(space,changed),false);
  const personalAdded=M.editText(space.text,docId,M.raw(M.getDocument(space.text,docId))+'\n개인 메모');
  assert.equal(programPreservesSeriesMetadata(space,personalAdded),true);
  const privateSpace={...space,text:personalAdded};
  const personalEdited=M.editText(personalAdded,docId,M.raw(M.getDocument(personalAdded,docId)).replace('개인 메모','고친 개인 메모'));
  assert.equal(programPreservesSeriesMetadata(privateSpace,personalEdited),true);
  const personal=programClone(data); personal.spaces[actorId].text=M.editText(space.text,docId,M.raw(M.getDocument(space.text,docId))+'\n개인 메모');
  const saved=saveCreatorExecution(CREATOR_SERIES_RAW+'\n제작 메모',personal), failure=handoffCreatorExecution(saved); assert(!failure.ok); assert.equal(failure.data,saved);
});

test('strict source validation rejects missing/foreign native maps, damaged immutable flow, timezone, revision and protected metadata', () => {
  const data=creatorAccept(handoffCreatorExecution(saveCreatorExecution())).data;
  for (const corrupt of [
    (d:ProgramData)=>{own(d).revision.raw+='\n손상';},
    (d:ProgramData)=>{own(d).revision.rows[0].itemRef='foreign';},
    (d:ProgramData)=>{own(d).revision.rows[0].documentLineId='missing';},
    (d:ProgramData)=>{own(d).revision.sourceLines[0].id=own(d).revision.sourceLines[1].id;},
    (d:ProgramData)=>{own(d).revision.protectedLineIds.pop();},
    (d:ProgramData)=>{Object.assign(own(d).revision.flow.items[0],{title:'손상'});},
    (d:ProgramData)=>{own(d).owner.currentRevisionId='missing';},
    (d:ProgramData)=>{own(d).revision.recordRevision=100;},
    (d:ProgramData)=>{d.spaces[actorId].text=M.editText(d.spaces[actorId].text,own(d).owner.documentId,M.raw(M.getDocument(d.spaces[actorId].text,own(d).owner.documentId)).replace('Asia/Seoul','Asia/Tokyo'));},
  ]) { const bad=programClone(data);corrupt(bad);assert.equal(validateProgramData(bad),false); }
});

test('archived document, wrong actor/identity, stale execution and unbounded/foreign windows fail without writes', () => {
  const data=creatorAccept(handoffCreatorExecution(saveCreatorExecution())).data,row=read(data).rows[0],before=JSON.stringify(data);
  const input={actorId,flowRef:row.identity.sourceFlowRef,localToday:TODAY,identity:row.identity,expected:null,changes:{completion:{status:'completed' as const,completedAt:NOW}}};
  for(const patch of [{actorId:'creator-minji'},{identity:{...row.identity,creatorOwner:{...row.identity.creatorOwner!,rowId:'foreign'}}},{window:{windowWeeks:1000}},{window:{unknown:1}}]) {
    const result=updateProgramOccurrenceExecution(data,{...input,...patch});assert(!result.ok);assert.equal(result.data,data);
  }
  const changed=creatorAccept(updateProgramOccurrenceExecution(data,input)).data;assert.equal(updateProgramOccurrenceExecution(changed,input).ok,false);
  const archived=creatorAccept(archiveProgramDocument(data,{actorId,requestId:'archive-series',expectedSpace:data.spaces[actorId],documentId:own(data).owner.documentId})).data;
  assert.equal(updateProgramOccurrenceExecution(archived,input).ok,false);assert.equal(JSON.stringify(data),before);
});

test('ordinary creator task can move privately while its canonical ID still resolves exact source time/zone', () => {
  const raw=CREATOR_SERIES_RAW.replace('\n  - 반복: 매주 월\n  - 반복 종료: 2026-10-30','');
  let data=creatorAccept(handoffCreatorExecution(saveCreatorExecution(raw))).data;const {owner,revision}=own(data),lineId=revision.rows[0].documentLineId;
  const created=creatorAccept(createProgramDocument(data,{actorId,requestId:'destination',expectedSpace:data.spaces[actorId],title:'개인 목적 문서'}));data=created.data;
  data=creatorAccept(moveProgramTaskDocument(data,{actorId,requestId:'move-source-task',expectedSpace:data.spaces[actorId],taskId:lineId,destinationId:created.result})).data;
  const facts=programCreatorTaskSourceFacts(data.spaces[actorId],created.result,lineId);assert(facts);assert.equal(facts.timeZone,'Asia/Seoul');assert.equal(facts.ownerId,owner.id);
  assert.equal(programCreatorTaskSourceFacts(data.spaces[actorId],owner.documentId,lineId),null);
});

test('controller handoff quota/CAS/replay/Undo/reload leaves operating bytes and existing private owners untouched', async () => {
  const data=saveCreatorExecution(), values=new Map([[PROGRAM_STATE_KEY,JSON.stringify(createProgramEnvelope(data))],['flow:protected','original\r\nbytes']]); let quota=true; const writes:string[]=[];
  const storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{assert.equal(k,PROGRAM_STATE_KEY);if(quota)throw Error('quota');writes.push(k);values.set(k,v);},removeItem:()=>assert.fail('remove forbidden')};
  const controller=createProgramController({initialData:data,storage,exclusive:async work=>work()}); assert(controller.ok); const before=values.get(PROGRAM_STATE_KEY);
  assert.equal((await controller.mutate('인계',handoffCreatorExecution,{actorId})).ok,false); assert.equal(values.get(PROGRAM_STATE_KEY),before);
  quota=false; assert((await controller.mutate('인계',handoffCreatorExecution,{actorId})).ok); const after=controller.snapshot().envelope.data;
  assert((await controller.undo(actorId)).ok); assert.deepEqual(controller.snapshot().envelope.data.spaces[actorId],data.spaces[actorId]);
  assert((await controller.redo(actorId)).ok); assert.deepEqual(controller.snapshot().envelope.data.spaces[actorId],after.spaces[actorId]);
  const reloaded=createProgramController({initialData:data,storage,exclusive:async work=>work()});assert(reloaded.ok);assert.deepEqual(reloaded.snapshot().envelope.data,after);assert.equal(values.get('flow:protected'),'original\r\nbytes');
});

test('existing real legacy source and newly authored source coexist without mixing IDs, snapshot bytes or execution entries',()=>{
  const legacy=materializePersonalWorkspacePocAuthoring({handoffId:'old-real-handoff',documentId:'old-real-document',revisionId:'old-real-revision',rawText:CREATOR_SERIES_RAW,committedAt:NOW});assert(legacy.ok);
  const state=createPersonalWorkspacePocState(NOW),projected=creatorAccept(hydrateProgramLegacy(createProgramData(),{version:1,flows:[legacy.flow]},state,{actorId,preserveUnsupported:true}));
  const snapshot=programClone(projected.data.spaces[actorId].legacySnapshot),bindings=programClone(projected.data.spaces[actorId].savedBindings);
  const before=readProgramExecutionOccurrences(projected.data,{actorId,flowRef:legacy.flow.ref,localToday:TODAY});assert(before.ok);
  const combined=creatorAccept(handoffCreatorExecution(saveCreatorExecution(CREATOR_SERIES_RAW,projected.data))).data;
  const after=readProgramExecutionOccurrences(combined,{actorId,flowRef:legacy.flow.ref,localToday:TODAY});assert(after.ok);assert.deepEqual(after,before);
  assert.deepEqual(combined.spaces[actorId].legacySnapshot,snapshot);assert.deepEqual(combined.spaces[actorId].savedBindings,bindings);
  assert.notEqual(read(combined).rows[0].key,after.rows[0].key);assert(read(combined).rows[0].identity.creatorOwner);assert.equal(after.rows[0].identity.creatorOwner,undefined);
});

test('single native source-line title edit keeps row ID, while ambiguous duplicate source Items never acquire each other records',()=>{
  let data=creatorAccept(handoffCreatorExecution(saveCreatorExecution())).data;const initial=own(data).revision.rows[0].rowId;
  data=creatorAccept(handoffCreatorExecution(saveCreatorExecution(CREATOR_SERIES_RAW.replace('- [ ] 걷기','- [ ] 가볍게 걷기'),data))).data;
  assert.equal(own(data).revision.rows[0].rowId,initial);
  const duplicated=CREATOR_SERIES_RAW+'\n\n- [ ] 걷기\n  - 날짜: 2026-09-16\n  - 반복: 매주 수\n  - 반복 종료: 2026-10-30';
  data=creatorAccept(handoffCreatorExecution(saveCreatorExecution(duplicated,data))).data;
  assert.equal(new Set(own(data).revision.rows.map(row=>row.rowId)).size,2);
  assert(!own(data).revision.rows.some(row=>row.rowId===initial));
});
