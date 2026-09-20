import assert from 'node:assert/strict';
import test from 'node:test';
import { PROGRAM_STATE_KEY, PROGRAM_COPY_SCHEDULE_RETENTION, programClone, type ProgramCopyField, type ProgramData, type ProgramPublicItem, type ProgramTransition } from './contract';
import { createProgramData, validateProgramData, validateProgramEnvelope } from './program-data';
import { applyProgramCopyVersion, compareProgramCopyVersion, createProgramDocument, importProgramPublicVersion, previewProgramCopyScheduleResolution, setProgramCopyAnchor, setProgramCopySeriesStart } from './private-space';
import { createProgramController } from './controller';
import { loadProgramStore } from './program-store';
import { programRecurringScheduleFromDraft } from './public-recurrence-contract';
import { programPublicCopyExecutionRef, readProgramPublicCopyRecurrenceSource } from './public-copy-recurrence';
import { readProgramExecutionOccurrences, updateProgramOccurrenceExecution } from './recurrence-state';
import { prepareProgramRecurrencePlan, applyProgramRecurrencePlanTransition, readProgramRecurrencePlanRecoveries, readProgramPersonalRecurrences, updateProgramPersonalOccurrence } from './program-recurrence-plan-state';
import { resolveProgramRecurrencePlanTarget, previewProgramRecurrencePlan } from './program-recurrence-plan';
import { textWorkspaceModel as M } from './text-workspace';
import { programOccurrenceSourceFacts, readProgramOccurrenceRecovery } from './recurrence-recovery';

const at='2026-12-01T00:00:00.000Z', actorId='local-user';
const base=(data:ProgramData,requestId:string)=>({actorId,requestId,expectedSpace:data.spaces[actorId]});
function success<T>(value:ProgramTransition<T>){assert(value.ok,value.ok?'':value.reason);assert(validateProgramData(value.data));return value;}
function fixture(startKind:'fixed'|'undated'='fixed'){
  let data=createProgramData();
  const schedule=programRecurringScheduleFromDraft({version:1,raw:'매주 화, 목',end:'8회',startKind,startValue:startKind==='fixed'?'2026-12-01':'',time:'07:00',timeZone:'Asia/Seoul'});assert(schedule);
  const item:ProgramPublicItem={id:'series',title:'주간 운동',description:'원래 설명',completionCriteria:'원래 마무리',sourceUrl:'https://example.org/original',schedule,subchecks:[{id:'prep',title:'준비 확인'},{id:'finish',title:'정리 확인'}]};
  data.public.flows.push({id:'update-flow',ownerId:'creator-minji',currentVersionId:'update-v1',category:'운동',situations:[],derivedFrom:null,archived:false});
  data.public.versions.push({id:'update-v1',flowId:'update-flow',number:1,parentVersionId:null,title:'반복 수용 계약 fixture',summary:'원문 보존',items:[item],source:{kind:'simulated-example',label:'검증 예시',url:null,checkedAt:null},createdBy:'creator-minji',createdAt:at});
  const document=success(createProgramDocument(data,{...base(data,'doc'),title:'개인 참조',raw:'PRIVATE-NOTE\n- [ ] 개인 예약'}));data=document.data;
  const imported=success(importProgramPublicVersion(data,{...base(data,'import'),versionId:'update-v1',itemIds:['series'],anchor:null,targetDocumentId:document.result}));data=imported.data;
  const copy=data.spaces[actorId].copies.find(c=>c.id===imported.result)!;
  return {data,copy,documentId:document.result};
}
function version2(f:ReturnType<typeof fixture>,patch:Partial<ProgramPublicItem>){
  const data=programClone(f.data),original=data.public.versions.find(v=>v.id==='update-v1')!;
  data.public.versions.push({...programClone(original),id:'update-v2',parentVersionId:original.id,number:2,items:[{...programClone(original.items[0]),...patch}]});
  data.public.flows.find(flow=>flow.id==='update-flow')!.currentVersionId='update-v2';assert(validateProgramData(data));return data;
}
function apply(f:ReturnType<typeof fixture>,data:ProgramData,fields:ProgramCopyField[],requestId='apply'){
  return applyProgramCopyVersion(data,{...base(data,requestId),copyId:f.copy.id,versionId:'update-v2',expectedBaseVersionId:'update-v1',itemIds:['series'],fields});
}
function read(f:ReturnType<typeof fixture>,data=f.data){const result=readProgramExecutionOccurrences(data,{actorId,flowRef:programPublicCopyExecutionRef(f.copy.id),localToday:'2026-12-01'});assert(result.ok,result.ok?'':result.reason);return result;}
function withRecord(f:ReturnType<typeof fixture>){
  const row=read(f).rows[0];assert(row);
  f.data=success(updateProgramOccurrenceExecution(f.data,{actorId,flowRef:programPublicCopyExecutionRef(f.copy.id),localToday:'2026-12-01',identity:row.identity,expected:null,
    changes:{completion:{status:'completed',completedAt:at},schedule:{mode:'fixed_date',date:'2026-12-02'}}})).data;return {f,row};
}

test('PCF source facts use the exact accepted schedule version rather than latest metadata',()=>{
  const f=fixture(),data=success(apply(f,version2(f,{title:'최신 제목',description:'최신 설명'}),['description'])).data;
  const before=JSON.stringify(data),identity=read(f,data).rows[0].identity;
  const facts=programOccurrenceSourceFacts(identity,data.public) as {flowTitle:string;item:ProgramPublicItem;publicVersion:{id:string;number:number};context:{attributes:{time:string}}};
  assert.equal(facts.flowTitle,'반복 수용 계약 fixture');assert.equal(facts.item.title,'주간 운동');assert.equal(facts.item.description,'원래 설명');
  assert.deepEqual(facts.publicVersion,{id:'update-v1',number:1});assert.equal(facts.context.attributes.time,'07:00');assert.equal(JSON.stringify(data),before);
});

test('PCF changed public series shows old and current pinned facts without matching different occurrences',()=>{
  const {f,row}=withRecord(fixture()),schedule=programRecurringScheduleFromDraft({version:1,raw:'매주 수, 금',end:'6회',startKind:'fixed',startValue:'2026-12-02',time:'09:00',timeZone:'Asia/Seoul'});assert(schedule);
  const data=success(apply(f,version2(f,{schedule}),['schedule'])).data,before=JSON.stringify(data);
  const recovery=readProgramOccurrenceRecovery(data,{actorId,localToday:'2026-12-01'})[0];assert(recovery);assert.equal(recovery.current,null);assert.equal(recovery.canReconnect,false);
  const old=programOccurrenceSourceFacts(recovery.stored,data.public) as {item:ProgramPublicItem;publicVersion:{id:string}};
  const current=recovery.currentSourceFacts as {item:ProgramPublicItem;publicVersion:{id:string}};
  assert.equal(old.publicVersion.id,'update-v1');assert.equal(current.publicVersion.id,'update-v2');assert.deepEqual(current.item.schedule,schedule);
  assert.deepEqual(recovery.stored.sourceRule,row.identity.sourceRule);assert.equal(JSON.stringify(data),before);
});

test('PCF missing duplicate foreign or forged public source is explicitly unavailable, never another item',()=>{
  const f=fixture(),identity=read(f).rows[0].identity,original=JSON.stringify(f.data);
  for(const change of ['missing','duplicate','foreign','item','schedule'] as const){
    const repo=programClone(f.data.public),version=repo.versions.find(v=>v.id==='update-v1')!;
    if(change==='missing')repo.versions=repo.versions.filter(v=>v.id!=='update-v1');
    if(change==='duplicate')repo.versions.push(programClone(version));
    if(change==='foreign')version.flowId='another-flow';
    if(change==='item')version.items[0].id='different-item';
    if(change==='schedule'&&version.items[0].schedule.kind==='recurring')version.items[0].schedule.time='11:00';
    assert.deepEqual(programOccurrenceSourceFacts(identity,repo),{unavailable:true},change);
  }
  assert.deepEqual(programOccurrenceSourceFacts({...identity,sourceItemRef:'forged'},f.data.public),{unavailable:true});
  assert.deepEqual(programOccurrenceSourceFacts({...identity,sourceRevisionToken:'{'},f.data.public),{unavailable:true});
  assert.deepEqual(programOccurrenceSourceFacts(identity),{unavailable:true});assert.equal(JSON.stringify(f.data),original);
});

test('PCF source facts do not label a personal start date as the public original date',()=>{
  const f=fixture('undated');f.data=success(setProgramCopySeriesStart(f.data,{...base(f.data,'start'),copyId:f.copy.id,itemId:'series',start:'2026-12-03'})).data;
  const facts=programOccurrenceSourceFacts(read(f).rows[0].identity,f.data.public) as {context:{attributes:{date:string}}};
  assert.equal(facts.context.attributes.date,'시작 미정');assert(!JSON.stringify(facts).includes('2026-12-03'));
});

test('PCF displayed source facts are detached from immutable repository values',()=>{
  const f=fixture(),before=JSON.stringify(f.data),facts=programOccurrenceSourceFacts(read(f).rows[0].identity,f.data.public) as {item:ProgramPublicItem};
  facts.item.title='display edit';facts.item.subchecks[0].title='display check';assert.equal(JSON.stringify(f.data),before);
});

test('PCU unchanged real imported series metadata is not a private title or subcheck edit',()=>{
  const f=fixture(),before=JSON.stringify(f.data),comparison=success(compareProgramCopyVersion(f.data,{actorId,copyId:f.copy.id,versionId:'update-v1'}));
  assert(comparison.result.items[0].fields.every(field=>!field.privateChanged&&field.alreadyApplied));assert.equal(JSON.stringify(f.data),before);
});
test('PCU selected source description updates actual series metadata without a checkbox owner',()=>{
  const f=fixture(),data=version2(f,{description:'새 설명\n새로운 근거'}),before=JSON.stringify(data),result=success(apply(f,data,['description']));
  const space=result.data.spaces[actorId],source=readProgramPublicCopyRecurrenceSource(space,result.data.public,f.copy.id);assert(source.ok,source.ok?'':source.reason);
  assert.equal(source.source.items[0].item.description,'새 설명\n새로운 근거');assert.equal(source.source.items[0].scheduleVersionId,'update-v1');
  assert(!M.tasks(space.text).some(task=>task.id===f.copy.itemLines.series));
  assert.deepEqual(M.getDocument(space.text,f.documentId),M.getDocument(data.spaces[actorId].text,f.documentId));
  assert.deepEqual(result.data.public,data.public);assert.equal(JSON.stringify(data),before);
});

test('PCU five selected metadata fields preserve recurrence identity records personal tasks and stable child rows',()=>{
  const {f,row}=withRecord(fixture()),fields:ProgramCopyField[]=['title','description','completionCriteria','sourceUrl','subchecks'];
  const data=version2(f,{title:'수정한 주간 운동',description:'새 설명',completionCriteria:'새 마무리',sourceUrl:'https://example.org/revised',subchecks:[{id:'prep',title:'수정한 준비'},{id:'new-check',title:'새 확인'}]}),before=programClone(data);
  const result=success(apply(f,data,fields)),space=result.data.spaces[actorId],copy=space.copies.find(c=>c.id===f.copy.id)!;
  assert.equal(copy.itemLines.series,f.copy.itemLines.series);assert.equal(copy.subcheckLines.series.prep,f.copy.subcheckLines.series.prep);assert.equal(copy.subcheckLines.series.finish,f.copy.subcheckLines.series.finish);
  const doc=M.getDocument(space.text,copy.documentId)!;
  assert(doc.lines.some(line=>line.id===`${f.copy.subcheckLines.series.finish}:source-removed`));assert(doc.lines.some(line=>line.id===f.copy.subcheckLines.series.finish&&line.text.includes('정리 확인')));
  assert(doc.lines.some(line=>line.id===copy.subcheckLines.series['new-check']&&line.text==='  반복 확인: 새 확인'));
  assert.deepEqual(M.tasks(space.text),M.tasks(before.spaces[actorId].text));assert.deepEqual(space.text.progressRecords,before.spaces[actorId].text.progressRecords);
  assert.deepEqual(space.recurrenceExecution,before.spaces[actorId].recurrenceExecution);assert.deepEqual(copy.recurrence,f.copy.recurrence);
  const ref=copy.recurrence!.references![0],personal=M.getDocument(space.text,f.documentId)!;
  assert.equal(personal.lines.find(line=>line.id===ref.lineId)?.text,'반복 참조: 수정한 주간 운동');assert(personal.lines.some(line=>line.text==='PRIVATE-NOTE'));
  const source=readProgramPublicCopyRecurrenceSource(space,result.data.public,copy.id);assert(source.ok);assert.equal(source.source.items[0].item.title,'수정한 주간 운동');assert.equal(source.source.items[0].scheduleVersionId,'update-v1');
  assert.equal(read(f,result.data).rows.find(value=>value.key===row.key)?.completion,'completed');assert.equal(read(f,result.data).rows.find(value=>value.key===row.key)?.executionDate,'2026-12-02');
  assert.deepEqual(result.data.public,before.public);assert.deepEqual(result.data.spaces['creator-minji'],before.spaces['creator-minji']);assert.deepEqual(data,before);
  const comparison=success(compareProgramCopyVersion(result.data,{actorId,copyId:copy.id,versionId:'update-v2'}));assert(comparison.result.items[0].fields.filter(field=>fields.includes(field.field)).every(field=>field.alreadyApplied&&!field.privateChanged));
  const again=success(apply(f,result.data,fields,'same-fields'));assert.equal(again.changed,false);assert.equal(again.data,result.data);
});

for(const field of ['title','description','subchecks'] as const)test(`PCU private ${field} edit conflicts only with the selected source field`,()=>{
  const f=fixture(),data=version2(f,{title:'새 제목',description:'새 설명',completionCriteria:'새 기준',subchecks:[{id:'prep',title:'새 준비'},{id:'finish',title:'정리 확인'}]}),space=data.spaces[actorId],doc=M.getDocument(space.text,f.copy.documentId)!;
  const lineId=field==='title'?f.copy.itemLines.series:field==='description'?`${f.copy.itemLines.series}:description:0`:f.copy.subcheckLines.series.prep;
  doc.lines.find(line=>line.id===lineId)!.text=field==='title'?'반복: 내 제목':field==='description'?'  설명: 내 설명':'  반복 확인: 내 확인';assert(validateProgramData(data));
  const before=programClone(data),comparison=success(compareProgramCopyVersion(data,{actorId,copyId:f.copy.id,versionId:'update-v2'})),changed=comparison.result.items[0].fields.find(value=>value.field===field)!;
  assert(changed.privateChanged);assert(!changed.canApply);const rejected=apply(f,data,[field]);assert(!rejected.ok);assert.equal(rejected.data,data);assert.deepEqual(data,before);
  const accepted=success(apply(f,data,['completionCriteria'],'safe-field'));assert.equal(M.getDocument(accepted.data.spaces[actorId].text,f.copy.documentId)!.lines.find(line=>line.id===lineId)!.text,doc.lines.find(line=>line.id===lineId)!.text);
});

test('PCU personal reference captions are not rewritten by an accepted source title',()=>{
  const f=fixture(),data=version2(f,{title:'새 제목'}),ref=f.copy.recurrence!.references![0];
  M.getDocument(data.spaces[actorId].text,ref.documentId)!.lines.find(line=>line.id===ref.lineId)!.text='이 문서에서는 개인 운동이라고 부름';assert(validateProgramData(data));
  const result=success(apply(f,data,['title']));assert.equal(M.getDocument(result.data.spaces[actorId].text,ref.documentId)!.lines.find(line=>line.id===ref.lineId)!.text,'이 문서에서는 개인 운동이라고 부름');
});

test('PCU accepted recurring schedule changes future reads but holds old execution facts without rewriting them',()=>{
  const {f,row}=withRecord(fixture()),schedule=programRecurringScheduleFromDraft({version:1,raw:'매주 수, 금',end:'6회',startKind:'fixed',startValue:'2026-12-02',time:'09:00',timeZone:'Asia/Seoul'});assert(schedule);
  const data=version2(f,{schedule}),before=programClone(data.spaces[actorId].recurrenceExecution),result=success(apply(f,data,['schedule']));
  const projected=read(f,result.data);assert(projected.sourceConflictKeys.includes(row.key));assert(projected.rows.some(value=>value.originalDate==='2026-12-02'&&value.time==='09:00'));
  assert.deepEqual(result.data.spaces[actorId].recurrenceExecution,before);assert.deepEqual(result.data.public,data.public);assert.equal(result.data.spaces[actorId].copies[0].appliedFields.series.schedule,'update-v2');
});

test('PCU private pending start is not silently discarded by source schedule acceptance',()=>{
  const f=fixture('undated');f.data=success(setProgramCopySeriesStart(f.data,{...base(f.data,'start'),copyId:f.copy.id,itemId:'series',start:'2026-12-03'})).data;
  const schedule=programRecurringScheduleFromDraft({version:1,raw:'매주 화, 목',end:'8회',startKind:'fixed',startValue:'2026-12-01',time:'07:00',timeZone:'Asia/Seoul'});assert(schedule);
  const data=version2(f,{schedule}),comparison=success(compareProgramCopyVersion(data,{actorId,copyId:f.copy.id,versionId:'update-v2'}));
  assert.equal(comparison.result.items[0].fields.find(field=>field.field==='schedule')?.blockedReason,'series-private-start');assert(!apply(f,data,['schedule']).ok);
  const cleared=success(setProgramCopySeriesStart(data,{...base(data,'clear-start'),copyId:f.copy.id,itemId:'series',start:null}));
  const accepted=success(apply(f,cleared.data,['schedule']));assert.equal(read(f,accepted.data).rows[0].originalDate,'2026-12-01');assert(!Object.hasOwn(accepted.data.spaces[actorId].copies[0].recurrence!.starts!,'series'));
});

test('PCU a separate personal plan blocks schedule acceptance but not an independent description update',()=>{
  const f=fixture(),source=read(f).rows[0].identity;
  const prepared=prepareProgramRecurrencePlan(f.data,{actorId,flowRef:programPublicCopyExecutionRef(f.copy.id),sourceIdentity:source,ownerId:'personal-plan',localToday:'2026-12-01',now:at});assert(prepared.ok);
  const target=resolveProgramRecurrencePlanTarget(prepared.value.owner,{originalDate:source.originalDate});assert(target.ok);
  const preview=previewProgramRecurrencePlan(prepared.value.owner,{actorId,expected:programClone(prepared.value.owner),currentSource:source,operation:{scope:'whole_series',targetDate:'2026-12-02',target:target.value,sourceCutover:source,at}});assert(preview.ok);
  f.data=success(applyProgramRecurrencePlanTransition(f.data,{actorId,expectedSpace:prepared.value.expectedSpace,expectedOwner:null,preview:preview.value,localToday:'2026-12-01'})).data;
  const schedule=programClone(f.data.public.versions.find(v=>v.id==='update-v1')!.items[0].schedule);assert(schedule.kind==='recurring');schedule.time='09:00';
  const data=version2(f,{schedule,description:'새 설명'}),before=programClone(data.spaces[actorId].recurrencePlans),comparison=success(compareProgramCopyVersion(data,{actorId,copyId:f.copy.id,versionId:'update-v2'}));
  assert.equal(comparison.result.items[0].fields.find(field=>field.field==='schedule')?.blockedReason,'series-personal-plan');assert(!apply(f,data,['schedule']).ok);
  const result=success(apply(f,data,['description']));assert.deepEqual(result.data.spaces[actorId].recurrencePlans,before);
});

test('PCU recurring to ordinary ownership changes are not advertised as an ordinary schedule edit',()=>{
  const f=fixture(),data=version2(f,{schedule:{kind:'fixed',date:'2026-12-01'}}),before=JSON.stringify(data),comparison=success(compareProgramCopyVersion(data,{actorId,copyId:f.copy.id,versionId:'update-v2'}));
  assert.equal(comparison.result.items[0].fields.find(field=>field.field==='schedule')?.blockedReason,'series-kind-change');assert(!apply(f,data,['schedule']).ok);assert.equal(JSON.stringify(data),before);
});

test('PCU ordinary to recurring ownership changes require a dedicated transition as well',()=>{
  const original=fixture(),seed=createProgramData();seed.public=programClone(original.data.public);
  seed.public.versions.find(v=>v.id==='update-v1')!.items[0].schedule={kind:'fixed',date:'2026-12-01'};
  const imported=success(importProgramPublicVersion(seed,{...base(seed,'ordinary-import'),versionId:'update-v1',itemIds:['series'],anchor:null}));
  const f={...original,data:imported.data,copy:imported.data.spaces[actorId].copies[0]};
  const data=version2(f,{schedule:programClone(original.data.public.versions.find(v=>v.id==='update-v1')!.items[0].schedule)}),before=JSON.stringify(data);
  const comparison=success(compareProgramCopyVersion(data,{actorId,copyId:f.copy.id,versionId:'update-v2'}));assert.equal(comparison.result.items[0].fields.find(field=>field.field==='schedule')?.blockedReason,'series-kind-change');
  assert(!apply(f,data,['schedule']).ok);assert.equal(JSON.stringify(data),before);assert(M.tasks(data.spaces[actorId].text).some(task=>task.id===f.copy.itemLines.series));
});

test('PCU retired subcheck content is preserved when a readded source would overwrite it',()=>{
  const f=fixture(),data=version2(f,{subchecks:[{id:'prep',title:'준비 확인'}]}),removed=success(apply(f,data,['subchecks']));
  const next=programClone(removed.data),doc=M.getDocument(next.spaces[actorId].text,f.copy.documentId)!;
  doc.lines.find(line=>line.id===f.copy.subcheckLines.series.finish)!.text='  반복 확인: 보관 후에 적은 개인 내용';
  const old=next.public.versions.find(v=>v.id==='update-v1')!,latest=next.public.versions.find(v=>v.id==='update-v2')!;
  next.public.versions.push({...programClone(latest),id:'update-v3',number:3,parentVersionId:latest.id,items:programClone(old.items)});next.public.flows.find(flow=>flow.id==='update-flow')!.currentVersionId='update-v3';assert(validateProgramData(next));
  const before=JSON.stringify(next),comparison=success(compareProgramCopyVersion(next,{actorId,copyId:f.copy.id,versionId:'update-v3'}));assert.equal(comparison.result.items[0].fields.find(field=>field.field==='subchecks')?.blockedReason,'retired-check-review');
  const result=applyProgramCopyVersion(next,{...base(next,'readd'),copyId:f.copy.id,versionId:'update-v3',expectedBaseVersionId:'update-v1',itemIds:['series'],fields:['subchecks']});assert(!result.ok);assert.equal(JSON.stringify(next),before);
});

test('PCU actual source acceptance quota retry no-op Undo Redo and reload stay within the PoC namespace',async()=>{
  const {f}=withRecord(fixture()),data=version2(f,{description:'저장할 설명'}),protectedValue='{ "exact": "보존\\r\\n" }',values=new Map([['flow:operating',protectedValue]]),attempts:string[]=[],committed:string[]=[];let quota=true;
  const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{attempts.push(key);assert.equal(key,PROGRAM_STATE_KEY);if(quota)throw Error('quota');values.set(key,value);committed.push(key);},removeItem:()=>assert.fail('remove forbidden'),clear:()=>assert.fail('clear forbidden')};
  const exclusive=async<T,>(work:()=>T|Promise<T>)=>work(),controller=createProgramController({initialData:data,storage,exclusive});assert(controller.ok);
  const before=controller.snapshot();assert(!(await controller.mutate('설명 반영',current=>apply(f,current,['description'],'store'),{actorId})).ok);assert.deepEqual(controller.snapshot().envelope,before.envelope);assert.equal(committed.length,0);
  quota=false;assert((await controller.mutate('설명 반영',current=>apply(f,current,['description'],'store'),{actorId})).ok);assert.equal(committed.length,1);
  const applied=controller.snapshot(),count=attempts.length;assert((await controller.mutate('같은 설명',current=>apply(f,current,['description'],'same'),{actorId})).ok);assert.equal(attempts.length,count);
  assert((await controller.undo(actorId)).ok);assert.deepEqual(controller.snapshot().envelope.data.spaces[actorId],data.spaces[actorId]);assert.deepEqual(controller.snapshot().envelope.data.public,data.public);
  assert((await controller.redo(actorId)).ok);assert.deepEqual(controller.snapshot().envelope.data.spaces[actorId],applied.envelope.data.spaces[actorId]);
  assert.equal(loadProgramStore(storage,validateProgramEnvelope).kind,'ready');const reloaded=createProgramController({initialData:data,storage,exclusive});assert(reloaded.ok);assert.deepEqual(reloaded.snapshot(),controller.snapshot());
  assert.equal(values.get('flow:operating'),protectedValue);assert(attempts.every(key=>key===PROGRAM_STATE_KEY));
});

function resolutionFixture(scope?: 'whole_series' | 'future_series', startKind: 'fixed' | 'undated' = 'undated') {
  const f = fixture(startKind);
  if (startKind === 'undated') f.data = success(setProgramCopySeriesStart(f.data, { ...base(f.data, 'private-start'), copyId: f.copy.id, itemId: 'series', start: '2026-12-03' })).data;
  withRecord(f);
  if (scope) {
    const identity = read(f).rows[1].identity;
    const prepared = prepareProgramRecurrencePlan(f.data, { actorId, flowRef: programPublicCopyExecutionRef(f.copy.id), sourceIdentity: identity, ownerId: 'retained-plan', localToday: '2026-12-01', now: at }); assert(prepared.ok);
    const target = resolveProgramRecurrencePlanTarget(prepared.value.owner, { originalDate: identity.originalDate }); assert(target.ok);
    const preview = previewProgramRecurrencePlan(prepared.value.owner, { actorId, expected: prepared.value.owner, currentSource: identity,
      operation: { scope, targetDate: '2026-12-09', target: target.value, sourceCutover: identity, at } }); assert(preview.ok);
    f.data = success(applyProgramRecurrencePlanTransition(f.data, { actorId, expectedSpace: prepared.value.expectedSpace, expectedOwner: null, preview: preview.value, localToday: '2026-12-01' })).data;
    const personal = readProgramPersonalRecurrences(f.data, { actorId, ownerId: 'retained-plan', range: { start: '2026-12-01', end: '2027-01-01' }, localToday: '2026-12-01' }); assert(personal.ok);
    const row = personal.value.rows[0]; assert(row);
    f.data = success(updateProgramPersonalOccurrence(f.data, { actorId, ownerId: 'retained-plan', expectedOwner: personal.value.owner,
      identity: row.personalPlan.identity, changes: { completion: { status: 'completed', completedAt: at } }, at, localToday: '2026-12-01' })).data;
  }
  const schedule = programRecurringScheduleFromDraft({ version: 1, raw: '매주 월, 목', end: '8회', startKind: 'fixed', startValue: '2026-12-01', time: '09:00', timeZone: 'Asia/Seoul' }); assert(schedule);
  const data = version2(f, { schedule, description: '아직 수용하지 않은 새 설명' });
  const preview = success(previewProgramCopyScheduleResolution(data, { actorId, copyId: f.copy.id, itemId: 'series', versionId: 'update-v2' })).result;
  const input = { ...base(data, 'retain-and-accept'), copyId: f.copy.id, versionId: 'update-v2', expectedBaseVersionId: 'update-v1', itemIds: ['series'], fields: ['schedule'] as ProgramCopyField[],
    scheduleResolution: { confirmed: true as const, at, preview } };
  return { f, data, input, preview };
}

for (const scope of [undefined, 'whole_series', 'future_series'] as const) test(`PCS explicit schedule resolution retains private start and ${scope ?? 'source'} records without copying completion`, () => {
  const { f, data, input, preview } = resolutionFixture(scope), before = programClone(data);
  assert.equal(preview.beforeStartDate, '2026-12-03'); assert.equal(preview.nextStartDate, '2026-12-01');
  assert.deepEqual(preview.previousStart, { present: true, date: '2026-12-03' }); assert.equal(preview.personalPlans.length, scope ? 1 : 0);
  assert(preview.personalPlans.every(plan => !plan.continuesAfter && plan.executionRecords === 1));
  assert(!apply(f, data, ['schedule']).ok);
  const result = success(applyProgramCopyVersion(data, input)), copy = result.data.spaces[actorId].copies.find(copy => copy.id === f.copy.id)!;
  assert.deepEqual(data, before); assert.deepEqual(result.data.public, before.public);
  assert.deepEqual(result.data.spaces[actorId].recurrencePlans, before.spaces[actorId].recurrencePlans);
  assert.deepEqual(result.data.spaces[actorId].recurrenceExecution, before.spaces[actorId].recurrenceExecution);
  assert.deepEqual(result.data.spaces[actorId].text, { ...before.spaces[actorId].text,
    flows: result.data.spaces[actorId].text.flows, documents: result.data.spaces[actorId].text.documents });
  assert.deepEqual(M.tasks(result.data.spaces[actorId].text), M.tasks(before.spaces[actorId].text));
  assert.deepEqual(M.getDocument(result.data.spaces[actorId].text, f.documentId), M.getDocument(before.spaces[actorId].text, f.documentId));
  assert.deepEqual(copy.itemLines, f.copy.itemLines); assert.deepEqual(copy.recurrence?.references, f.copy.recurrence?.references);
  assert.deepEqual(copy.recurrence?.retainedChoices?.entries, [{ id: input.requestId, itemId: 'series', fromVersionId: 'update-v1', toVersionId: 'update-v2', previousStart: preview.previousStart, personalPlanOwnerIds: scope ? ['retained-plan'] : [], at }]);
  assert.equal(copy.recurrence?.starts?.series, undefined); assert.equal(copy.appliedFields.series.schedule, 'update-v2'); assert.equal(copy.appliedFields.series.description, undefined);
  const actualRows = read(f, result.data).rows;
  const newRows = actualRows.filter(row => row.identity.publicOwner?.scheduleVersionId === 'update-v2');
  assert.equal(newRows.length, 8); assert(newRows.every(row => row.completion === 'unrecorded'));
  if (scope) assert(actualRows.some(row => row.identity.publicOwner?.scheduleVersionId === 'update-v1' && row.completion === 'completed' && row.flowInactive));
  if (scope) { const recovery = readProgramRecurrencePlanRecoveries(result.data, { actorId, localToday: '2026-12-01' }).find(entry => entry.owner.ownerId === 'retained-plan');
    assert(recovery); assert.equal(recovery.retainedPersonal.length, 1); assert.equal(recovery.retainedPersonal[0].completion.status, 'completed'); }
  const duplicate = success(applyProgramCopyVersion(result.data, input)); assert.equal(duplicate.changed, false); assert.equal(duplicate.data, result.data);
  assert(!previewProgramCopyScheduleResolution(result.data, { actorId, copyId: copy.id, itemId: 'series', versionId: 'update-v2' }).ok);
});

test('PCS preview is detached and rejects same-ID public changes, missing acknowledgement, private changes, kind changes and wider field writes', () => {
  const { f, data, input } = resolutionFixture('future_series'), before = programClone(data);
  const fresh = success(previewProgramCopyScheduleResolution(data, { actorId, copyId: f.copy.id, itemId: 'series', versionId: 'update-v2' }));
  fresh.result.incoming.time = '22:00'; assert.deepEqual(data, before);
  for (const kind of ['unconfirmed', 'extra', 'wide', 'preview', 'bad-time', 'public', 'private', 'kind', 'actor'] as const) {
    const candidate = programClone(data), choice = programClone(input);
    if (kind === 'unconfirmed') Object.assign(choice.scheduleResolution, { confirmed: false });
    if (kind === 'extra') Object.assign(choice.scheduleResolution, { hidden: true });
    if (kind === 'wide') choice.fields.push('description');
    if (kind === 'preview') choice.scheduleResolution.preview.nextStartDate = '2027-01-01';
    if (kind === 'bad-time') choice.scheduleResolution.at = '2026-02-31T00:00:00.000Z';
    if (kind === 'public') { const schedule = candidate.public.versions.find(version => version.id === 'update-v2')!.items[0].schedule; assert(schedule.kind === 'recurring'); schedule.time = '22:00'; }
    if (kind === 'private') { candidate.spaces[actorId].copies[0].recurrence!.starts!.series = '2026-12-10'; choice.expectedSpace = candidate.spaces[actorId]; }
    if (kind === 'kind') candidate.public.versions.find(version => version.id === 'update-v2')!.items[0].schedule = { kind: 'fixed', date: '2026-12-01' };
    if (kind === 'actor') choice.actorId = 'creator-minji';
    const raw = JSON.stringify(candidate), failed = applyProgramCopyVersion(candidate, choice); assert(!failed.ok, kind); assert.equal(JSON.stringify(candidate), raw, kind); assert.equal(failed.data, candidate);
  }
});

test('PCS a reaccepted exact old plan is explicitly previewed as active, not silently called archived', () => {
  const { data, input, f } = resolutionFixture('whole_series', 'fixed'), accepted = success(applyProgramCopyVersion(data, input)).data;
  const back = success(previewProgramCopyScheduleResolution(accepted, { actorId, copyId: f.copy.id, itemId: 'series', versionId: 'update-v1' })).result;
  assert.equal(back.personalPlans[0].continuesAfter, true);
  const restored = success(applyProgramCopyVersion(accepted, { ...base(accepted, 'accept-original'), copyId: f.copy.id, versionId: 'update-v1', expectedBaseVersionId: 'update-v1', itemIds: ['series'], fields: ['schedule'], scheduleResolution: { confirmed: true, at, preview: back } })).data;
  const plan = readProgramPersonalRecurrences(restored, { actorId, ownerId: 'retained-plan', localToday: '2026-12-01', range: { start: '2026-12-01', end: '2027-01-01' } }); assert(plan.ok);
  assert(plan.value.sourceAvailable); assert(plan.value.rows.some(row => row.completion === 'completed'));
  assert.equal(restored.spaces[actorId].copies[0].recurrence?.retainedChoices?.entries.length, 2);
});

test('PCS strict retention rejects corrupt history and reaches its limit without dropping older entries', () => {
  const { data, input, f } = resolutionFixture(), accepted = success(applyProgramCopyVersion(data, input)).data;
  for (const kind of ['future', 'extra', 'duplicate', 'date', 'absent-date', 'foreign-version', 'foreign-item', 'same-version', 'bad-time', 'limit'] as const) {
    const corrupt = programClone(accepted), history = corrupt.spaces[actorId].copies[0].recurrence!.retainedChoices!, entry = history.entries[0];
    if (kind === 'future') Object.assign(history, { version: 2 });
    if (kind === 'extra') Object.assign(entry, { privateRaw: 'must reject' });
    if (kind === 'duplicate') history.entries.push(programClone(entry));
    if (kind === 'date') entry.previousStart.date = '2026-02-31';
    if (kind === 'absent-date') entry.previousStart.present = false;
    if (kind === 'foreign-version') entry.fromVersionId = 'unknown-version';
    if (kind === 'foreign-item') entry.itemId = 'unknown-item';
    if (kind === 'same-version') entry.toVersionId = entry.fromVersionId;
    if (kind === 'bad-time') entry.at = '2026-02-31T00:00:00.000Z';
    if (kind === 'limit') history.entries = Array.from({ length: PROGRAM_COPY_SCHEDULE_RETENTION.entries + 1 }, (_, index) => ({ ...programClone(entry), id: `choice-${index}` }));
    assert(!readProgramPublicCopyRecurrenceSource(corrupt.spaces[actorId], corrupt.public, f.copy.id).ok, kind); assert(!validateProgramData(corrupt), kind);
  }
  const capped = programClone(data);
  capped.spaces[actorId].copies[0].recurrence!.retainedChoices = { version: 1, entries: Array.from({ length: PROGRAM_COPY_SCHEDULE_RETENTION.entries }, (_, index) => ({ ...programClone(accepted.spaces[actorId].copies[0].recurrence!.retainedChoices!.entries[0]), id: `past-${index}` })) };
  assert(validateProgramData(capped)); const raw = JSON.stringify(capped);
  const rejected = applyProgramCopyVersion(capped, { ...input, expectedSpace: capped.spaces[actorId] }); assert(!rejected.ok); assert.equal(rejected.reason, 'limit'); assert.equal(JSON.stringify(capped), raw);
});

test('PCS confirmed resolution quota retry receipt Undo Redo reload and corrupt store are namespace confined', async () => {
  const { data, input } = resolutionFixture('future_series'), protectedBytes = '{ "raw": "운영\\r\\n" }', values = new Map([['flow:operating', protectedBytes]]), attempts: string[] = []; let fail = true, writes = 0;
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { attempts.push(key); assert.equal(key, PROGRAM_STATE_KEY); if (fail) throw Error('quota'); values.set(key, value); writes++; }, removeItem: () => assert.fail('no remove'), clear: () => assert.fail('no clear') };
  const exclusive = async <T,>(work: () => T | Promise<T>) => work(), controller = createProgramController({ initialData: data, storage, exclusive }); assert(controller.ok);
  const original = controller.snapshot(); assert(!(await controller.mutate('일정 수용', current => applyProgramCopyVersion(current, input), { actorId })).ok);
  assert.equal(writes, 0); assert.deepEqual(controller.snapshot(), original);
  fail = false; assert((await controller.mutate('일정 수용', current => applyProgramCopyVersion(current, input), { actorId })).ok); assert.equal(writes, 1);
  const accepted = controller.snapshot(), count = attempts.length;
  assert((await controller.mutate('같은 요청', current => applyProgramCopyVersion(current, input), { actorId })).ok); assert.equal(attempts.length, count);
  assert((await controller.undo(actorId)).ok); assert.deepEqual(controller.snapshot().envelope.data.spaces[actorId], data.spaces[actorId]);
  assert((await controller.redo(actorId)).ok); assert.deepEqual(controller.snapshot().envelope.data.spaces[actorId], accepted.envelope.data.spaces[actorId]);
  const reloaded = createProgramController({ initialData: data, storage, exclusive }); assert(reloaded.ok); assert.deepEqual(reloaded.snapshot(), controller.snapshot());
  assert.equal(values.get('flow:operating'), protectedBytes); assert(attempts.every(key => key === PROGRAM_STATE_KEY));
  values.set(PROGRAM_STATE_KEY, '{'); assert.notEqual(loadProgramStore(storage, validateProgramEnvelope).kind, 'ready'); assert.equal(writes, 3);
});

for (const start of ['undated', 'relative'] as const) test(`PCS ${start} source start preserves an explicit choice or waits for an anchor without guessing today`, () => {
  const { data, f } = resolutionFixture('future_series'), incoming = data.public.versions.find(version => version.id === 'update-v2')!.items[0].schedule; assert(incoming.kind === 'recurring');
  incoming.start = start === 'undated' ? { kind: 'undated' } : { kind: 'relative', days: 2 };
  const preview = success(previewProgramCopyScheduleResolution(data, { actorId, copyId: f.copy.id, itemId: 'series', versionId: 'update-v2' })).result;
  assert.equal(preview.nextStartDate, start === 'undated' ? '2026-12-03' : null);
  const accepted = success(applyProgramCopyVersion(data, { ...base(data, `accept-${start}`), copyId: f.copy.id, versionId: 'update-v2', expectedBaseVersionId: 'update-v1', itemIds: ['series'], fields: ['schedule'], scheduleResolution: { confirmed: true, at, preview } })).data;
  const copy = accepted.spaces[actorId].copies[0]; assert.equal(copy.recurrence?.starts?.series, start === 'undated' ? '2026-12-03' : undefined);
  const source = readProgramPublicCopyRecurrenceSource(accepted.spaces[actorId], accepted.public, f.copy.id); assert(source.ok); assert.equal(source.source.items[0].startDate, preview.nextStartDate);
  assert.deepEqual(copy.recurrence?.retainedChoices?.entries[0].previousStart, { present: true, date: '2026-12-03' }); assert.deepEqual(accepted.spaces[actorId].recurrencePlans, data.spaces[actorId].recurrencePlans);
});

function waitingStartFixture(start: 'undated' | 'relative', scope: 'whole_series' | 'future_series' = 'future_series') {
  const { data, f } = resolutionFixture(scope, 'fixed');
  const incoming = data.public.versions.find(version => version.id === 'update-v2')!.items[0].schedule; assert(incoming.kind === 'recurring');
  incoming.start = start === 'undated' ? { kind: 'undated' } : { kind: 'relative', days: 2 };
  const preview = success(previewProgramCopyScheduleResolution(data, { actorId, copyId: f.copy.id, itemId: 'series', versionId: 'update-v2' })).result;
  const accepted = success(applyProgramCopyVersion(data, { ...base(data, 'accept-waiting-start'), copyId: f.copy.id, versionId: 'update-v2', expectedBaseVersionId: 'update-v1', itemIds: ['series'], fields: ['schedule'], scheduleResolution: { confirmed: true, at, preview } })).data;
  const change = (current: ProgramData, value: string | null, requestId: string) => start === 'undated'
    ? setProgramCopySeriesStart(current, { ...base(current, requestId), copyId: f.copy.id, itemId: 'series', start: value })
    : setProgramCopyAnchor(current, { ...base(current, requestId), copyId: f.copy.id, anchor: value });
  return { f, accepted, change };
}

for (const start of ['undated', 'relative'] as const) for (const scope of ['whole_series', 'future_series'] as const) {
  test(`PCS ${start} can begin an explicitly accepted new source while preserving the old ${scope}`, () => {
    const { f, accepted, change } = waitingStartFixture(start, scope), before = programClone(accepted);
    const started = success(change(accepted, '2026-12-08', 'begin-accepted-source')).data;
    assert.deepEqual(accepted, before); assert.deepEqual(started.public, accepted.public);
    assert.deepEqual(started.spaces[actorId].recurrencePlans, accepted.spaces[actorId].recurrencePlans);
    assert.deepEqual(started.spaces[actorId].recurrenceExecution, accepted.spaces[actorId].recurrenceExecution);
    assert.deepEqual(started.spaces[actorId].text, accepted.spaces[actorId].text);
    assert.deepEqual(started.spaces[actorId].copies[0].recurrence!.retainedChoices, accepted.spaces[actorId].copies[0].recurrence!.retainedChoices);
    const rows = read(f, started).rows.filter(row => row.identity.publicOwner?.scheduleVersionId === 'update-v2');
    assert.equal(rows.length, 8); assert.equal(rows[0].identity.sourceRule.startDate, start === 'undated' ? '2026-12-08' : '2026-12-10');
    assert(rows.every(row => row.completion === 'unrecorded'));
    const recovery = readProgramRecurrencePlanRecoveries(started, { actorId, localToday: '2026-12-01' }).find(entry => entry.owner.ownerId === 'retained-plan');
    assert(recovery); assert.equal(recovery.reason, 'source-changed-or-unavailable'); assert.equal(recovery.retainedPersonal[0].completion.status, 'completed');
    assert.equal(success(change(started, '2026-12-08', 'same-start')).changed, false);
    // A plan belonging to the newly accepted source still needs a plan-scoped decision.
    const identity = rows[1].identity, prepared = prepareProgramRecurrencePlan(started, { actorId, flowRef: programPublicCopyExecutionRef(f.copy.id), sourceIdentity: identity, ownerId: 'current-plan', localToday: '2026-12-01', now: at }); assert(prepared.ok);
    const target = resolveProgramRecurrencePlanTarget(prepared.value.owner, { originalDate: identity.originalDate }); assert(target.ok);
    const preview = previewProgramRecurrencePlan(prepared.value.owner, { actorId, expected: prepared.value.owner, currentSource: identity, operation: { scope, targetDate: '2026-12-18', target: target.value, sourceCutover: identity, at } }); assert(preview.ok);
    const planned = success(applyProgramRecurrencePlanTransition(started, { actorId, expectedSpace: prepared.value.expectedSpace, expectedOwner: null, preview: preview.value, localToday: '2026-12-01' })).data;
    const raw = JSON.stringify(planned), denied = change(planned, '2026-12-09', 'do-not-rewrite-current-plan');
    assert(!denied.ok); assert.equal(denied.reason, 'unresolved'); assert.equal(JSON.stringify(planned), raw);
  });
}

test('PCS old plan exemption requires the exact accepted version item and retained owner acknowledgement', () => {
  for (const start of ['undated', 'relative'] as const) for (const kind of ['missing', 'version', 'owner'] as const) {
    const { accepted, change } = waitingStartFixture(start), copy = accepted.spaces[actorId].copies[0];
    if (kind === 'missing') delete copy.recurrence!.retainedChoices;
    if (kind === 'version') {
      const v2 = accepted.public.versions.find(version => version.id === 'update-v2')!;
      accepted.public.versions.push({ ...programClone(v2), id: 'update-v3', number: 3, parentVersionId: v2.id });
      copy.recurrence!.retainedChoices!.entries[0].toVersionId = 'update-v3';
    }
    if (kind === 'owner') copy.recurrence!.retainedChoices!.entries[0].personalPlanOwnerIds = [];
    assert(validateProgramData(accepted)); const raw = JSON.stringify(accepted), denied = change(accepted, '2026-12-08', `unacknowledged-${kind}`);
    assert(!denied.ok); assert.equal(denied.reason, 'unresolved'); assert.equal(JSON.stringify(accepted), raw);
  }
});

for (const start of ['undated', 'relative'] as const) test(`PCS ${start} start after retention uses controller quota retry Undo Redo reload and exact prefix`, async () => {
  const { accepted, change } = waitingStartFixture(start), sentinel = '{ "private": "운영\\r\\n" }';
  const values = new Map([['flow:operating-start', sentinel]]), attempts: string[] = []; let fail = true, writes = 0;
  const storage = { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { assert.equal(key, PROGRAM_STATE_KEY); attempts.push(key); if (fail) throw Error('quota'); values.set(key, value); writes++; },
    removeItem: () => assert.fail('no remove'), clear: () => assert.fail('no clear') };
  const exclusive = async <T,>(work: () => T | Promise<T>) => work(), controller = createProgramController({ initialData: accepted, storage, exclusive }); assert(controller.ok);
  const before = controller.snapshot(), transition = (current: ProgramData) => change(current, '2026-12-08', `begin-${start}`);
  assert(!(await controller.mutate('새 원문 시작', transition, { actorId })).ok); assert.deepEqual(controller.snapshot(), before); assert.equal(writes, 0);
  fail = false; assert((await controller.mutate('새 원문 시작', transition, { actorId })).ok); const saved = controller.snapshot(); assert.equal(writes, 1);
  const count = attempts.length; assert((await controller.mutate('같은 요청', transition, { actorId })).ok); assert.equal(attempts.length, count);
  assert((await controller.undo(actorId)).ok); assert.deepEqual(controller.snapshot().envelope.data.spaces, accepted.spaces);
  assert((await controller.redo(actorId)).ok); assert.deepEqual(controller.snapshot().envelope.data.spaces, saved.envelope.data.spaces);
  const reloaded = createProgramController({ initialData: accepted, storage, exclusive }); assert(reloaded.ok); assert.deepEqual(reloaded.snapshot(), controller.snapshot());
  assert.deepEqual(saved.envelope.data.public, accepted.public); assert.equal(values.get('flow:operating-start'), sentinel); assert.equal(writes, 3);
});
