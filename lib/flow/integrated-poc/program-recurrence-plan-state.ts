import { programClone, programFailure, programResult, type ProgramData, type ProgramPrivateSpace } from './contract';
import { programSame } from './controller';
import { validateProgramData } from './program-data';
import { programOccurrenceExecutionKey, type ProgramOccurrenceExecution, type ProgramOccurrenceIdentity } from './recurrence-state-contract';
import { readProgramExecutionOccurrences, programOccurrenceWindowFor, type ProgramExecutionOccurrenceRow } from './recurrence-state';
import { createProgramRecurrencePlanOwner, readProgramRecurrencePlan, applyProgramRecurrencePlan, undoProgramRecurrencePlan,
  appendProgramPersonalOccurrenceEvent, programPersonalOccurrenceIdentity, sameProgramRecurrencePlanSource, type ProgramRecurrencePlanPreview } from './program-recurrence-plan';
import { programPersonalOccurrenceKey, type ProgramPersonalOccurrenceIdentity, type ProgramPersonalOccurrenceExecution, type ProgramRecurrencePlanOwner } from './program-recurrence-plan-contract';
import { programOccurrenceDate } from './recurrence-state-validation';
import { resolveProgramExecutionSource } from './execution-source';
import { expandPersonalWorkspacePocOccurrences } from '../personal-workspace-poc-occurrence';
import { expandProgramStructuredOccurrences } from './structured-map-execution';
import { sameProgramPublicCopyOccurrence, programPublicCopyOccurrenceIdentityAt } from './public-copy-recurrence';

const failure = (reason: string) => ({ok:false as const,reason});
function sourceRow(data:ProgramData,actorId:string,identity:ProgramOccurrenceIdentity,localToday:string) {
  const read = readProgramExecutionOccurrences(data,{actorId,flowRef:identity.sourceFlowRef,localToday,window:programOccurrenceWindowFor(identity),skipPersonalPlans:true});
  if(!read.ok) return null;
  return read.rows.find(row=>identity.publicOwner ? sameProgramPublicCopyOccurrence(row.identity,identity) : programSame(row.identity,identity)) ?? null;
}
function active(row:ProgramExecutionOccurrenceRow|null) { return !!row && !row.sourceConflict && !row.mapReviewHold && !row.flowInactive && !row.planExcluded; }
const sameSource = sameProgramRecurrencePlanSource;
export function programOriginalOccurrenceIdentityAt(source:ProgramOccurrenceIdentity,date:string):ProgramOccurrenceIdentity|null {
  if(!programOccurrenceDate(date))return null;
  if(source.publicOwner)return programPublicCopyOccurrenceIdentityAt(source,date);
  // Finite RRULEs are paged by occurrence ordinal. The open-ended week guard
  // must not reject a valid distant COUNT/UNTIL occurrence during plan setup.
  const sourceWindow=programOccurrenceWindowFor({...source,originalDate:date});
  for(let offset=0;offset<=10000;offset+=200){
    const window = { ...sourceWindow, finiteOffset: offset, finiteLimit: 200, windowWeeks: 1 };
    const read=source.structuredOwner ? expandProgramStructuredOccurrences(source, window) : expandPersonalWorkspacePocOccurrences({sourceItemRef:source.creatorOwner?.executionItemRef??source.sourceItemRef,startDate:source.sourceRule.startDate,recurrence:source.sourceRule.recurrence,
      ...(source.sourceRule.recurrenceEnd?{recurrenceEnd:source.sourceRule.recurrenceEnd}:{}),finiteOffset:offset,finiteLimit:200,
      windowOffsetWeeks:Math.max(0,Math.floor((Date.parse(date)-Date.parse(source.sourceRule.startDate))/604800000)),windowWeeks:1});
    if(!read.ok)return null;const row=read.manifest.rows.find(row=>row.originalDate===date&&row.seriesId===source.seriesId);
    if(row)return {...source,seriesId:row.seriesId,occurrenceId:row.occurrenceId,occurrenceIndex:row.occurrenceIndex,originalDate:row.originalDate};
    if(read.manifest.mode==='open-ended'||!read.manifest.hasMore||(read.manifest.rows.at(-1)?.originalDate??'9999')>date)return null;
  }return null;
}
export function prepareProgramRecurrencePlan(data:ProgramData,input:{actorId:string;flowRef:string;sourceIdentity:ProgramOccurrenceIdentity;ownerId:string;localToday:string;now:string}) {
  if(!validateProgramData(data)||data.activeActorId!==input.actorId) return failure('forbidden');
  if(input.sourceIdentity.sourceFlowRef!==input.flowRef) return failure('conflict');
  const row=sourceRow(data,input.actorId,input.sourceIdentity,input.localToday);if(!active(row))return failure('source-unavailable-or-held');
  const space=data.spaces[input.actorId], existing=Object.values(space.recurrencePlans?.owners??{}).find(owner=>sameSource(owner.source,input.sourceIdentity));
  if(existing)return {ok:true as const,value:{owner:programClone(existing),expectedOwner:programClone(existing),expectedSpace:programClone(space)}};
  if(space.recurrencePlans?.owners[input.ownerId])return failure('owner-conflict');
  const retained=Object.values(space.recurrenceExecution?.entries??{}).filter(entry=>sameSource(entry,input.sourceIdentity));
  // Older operating exceptions are read through the existing owner; no source key is written.
  const source=resolveProgramExecutionSource(space,input.flowRef,data.public);if(!source.ok)return source;
  const dates=new Set(source.originalExceptions.filter(entry=>entry.sourceItemRef===input.sourceIdentity.sourceItemRef).map(entry=>entry.originalDate));dates.add(row!.originalDate);
  for(const date of dates){const identity=programOriginalOccurrenceIdentityAt(input.sourceIdentity,date);if(!identity)return failure('unresolved-original-exception');
    const original=sourceRow(data,input.actorId,identity,input.localToday);if(!original)return failure('unresolved-original-exception');
    if(!retained.some(entry=>programOccurrenceExecutionKey(entry)===original.key)&&(original.executionScheduleMode!=='inherit'||original.completion!=='unrecorded'||original.participation!=='included'))
      retained.push({...original.identity,schedule:{mode:original.executionScheduleMode,date:original.executionScheduleMode==='fixed_date'?original.executionDate:null},completion:{status:original.completion,completedAt:original.completedAt},participation:original.participation});
  }
  const binding=space.savedBindings.find(binding=>binding.flowRef===input.flowRef),lineId=source.kind==='creator'
    ?source.revision.rows.find(row=>row.rowId===input.sourceIdentity.creatorOwner?.rowId&&row.itemRef===input.sourceIdentity.sourceItemRef)?.documentLineId
    :source.kind==='public-copy'?source.copy.itemLines[input.sourceIdentity.itemId]:binding?.itemLines[input.sourceIdentity.sourceItemRef];
  const created=createProgramRecurrencePlanOwner({ownerId:input.ownerId,actorId:input.actorId,source:input.sourceIdentity,createdAt:input.now,
    template:{...(row!.time?{time:row!.time}:{}),...((row!.time||input.sourceIdentity.publicOwner)&&row!.timeZone?{timeZone:row!.timeZone}:{})},retainedSourceExecutions:retained,
    retainedTaskRecordsRaw:JSON.stringify(space.text.progressRecords.filter(record=>record.taskId===lineId))});
  return created.ok?{ok:true as const,value:{owner:created.value,expectedOwner:null,expectedSpace:programClone(space)}}:created;
}
export function applyProgramRecurrencePlanTransition(data:ProgramData,input:{actorId:string;expectedSpace:ProgramPrivateSpace;expectedOwner:ProgramRecurrencePlanOwner|null;preview:ProgramRecurrencePlanPreview;localToday:string}) {
  if(!validateProgramData(data)||data.activeActorId!==input.actorId)return programFailure(data,'forbidden');
  const space=data.spaces[input.actorId],owner=input.preview.before;
  if(!programSame(space,input.expectedSpace)||owner.actorId!==input.actorId||!programSame(space.recurrencePlans?.owners[owner.ownerId]??null,input.expectedOwner))return programFailure(data,'conflict');
  if(!active(sourceRow(data,input.actorId,owner.source,input.localToday)))return programFailure(data,'conflict');
  // Fresh seed must be reconstructed from the actual source and original records at commit time.
  if(input.expectedOwner===null){const fresh=prepareProgramRecurrencePlan(data,{actorId:input.actorId,flowRef:owner.source.sourceFlowRef,sourceIdentity:owner.source,ownerId:owner.ownerId,localToday:input.localToday,now:owner.createdAt});
    if(!fresh.ok||!programSame(fresh.value.owner,owner))return programFailure(data,'conflict');}
  const applied=applyProgramRecurrencePlan(input.expectedOwner??owner,input.preview);if(!applied.ok)return programFailure(data,'conflict');
  const next=programClone(data);next.spaces[input.actorId].recurrencePlans={version:1,owners:{...space.recurrencePlans?.owners,[owner.ownerId]:applied.value}};
  return validateProgramData(next)?programResult(data,next,owner.ownerId):programFailure(data,'invalid');
}
export type ProgramPersonalRecurrenceRow = ProgramExecutionOccurrenceRow & {personalPlan:{ownerId:string;identity:ProgramPersonalOccurrenceIdentity;expectedOwner:ProgramRecurrencePlanOwner};personalStored:ProgramPersonalOccurrenceExecution|null;retainedPersonal?:boolean};
export function readProgramPersonalRecurrences(data:ProgramData,input:{actorId:string;ownerId:string;range:{start:string;end:string};localToday:string}) {
  const owner=data.spaces[input.actorId]?.recurrencePlans?.owners[input.ownerId];if(!owner)return failure('missing-owner');
  const read=readProgramRecurrencePlan(owner,input.range);if(!read.ok)return read;
  const seed=sourceRow(data,input.actorId,owner.source,input.localToday),guard=!active(seed);
  const entries=read.value.executionEntries,actual=new Map(read.value.personalOccurrences.map(row=>[programPersonalOccurrenceKey(programPersonalOccurrenceIdentity(owner,row)),row])),retainedPersonal:ProgramPersonalOccurrenceExecution[]=[];
  // Include undated and distant fixed exceptions even when their original slot is outside this period.
  for(const entry of Object.values(entries)){
    const date=entry.schedule.mode==='unscheduled'?null:entry.schedule.date??entry.originalDate;
    const extra=readProgramRecurrencePlan(owner,{start:entry.schedule.date??entry.originalDate,end:entry.schedule.date??entry.originalDate});
    const current=extra.ok?extra.value.personalOccurrences.find(row=>row.occurrenceId===entry.occurrenceId&&row.revisionId===entry.revisionId):null;
    if(!current){retainedPersonal.push(entry);continue;}
    if(date===null||date>=input.range.start&&date<=input.range.end)actual.set(programPersonalOccurrenceKey(programPersonalOccurrenceIdentity(owner,current)),current);
  }
  const rows:ProgramPersonalRecurrenceRow[]=[];
  for(const [key,row] of actual){const identity=programPersonalOccurrenceIdentity(owner,row),entry=entries[key]??null;
    const executionDate=entry?.schedule.mode==='unscheduled'?null:entry?.schedule.date??row.localDate;
    if(executionDate!==null&&(executionDate<input.range.start||executionDate>input.range.end))continue;
    rows.push({...(seed??{savedCopyId:owner.source.savedCopyId,flowId:owner.source.flowId,itemId:owner.source.itemId,sourceItemRef:owner.source.sourceItemRef,title:owner.source.itemId,memo:'',time:owner.template.time??null,timeZone:owner.template.timeZone??null,mapReviewHold:false,flowInactive:true}),
      key,seriesId:row.seriesId,occurrenceId:row.occurrenceId,occurrenceIndex:0,originalDate:row.originalDate,executionDate,executionScheduleMode:entry?.schedule.mode??'inherit',
      completion:entry?.completion.status??'unrecorded',completedAt:entry?.completion.completedAt??null,participation:entry?.participation??'included',
      identity:owner.source,stored:null,sourceConflict:!seed||seed.sourceConflict,flowInactive:guard,planSuperseded:false,
      personalPlan:{ownerId:owner.ownerId,identity,expectedOwner:owner},personalStored:entry});
  }
  return {ok:true as const,value:{rows,retainedPersonal,retainedSourceExecutions:read.value.retainedSourceExecutions,sourceCoverage:read.value.sourceCoverage,truncated:read.value.truncated,owner,sourceAvailable:!guard,
    recoveryReason:!seed?'source-changed-or-unavailable':guard?'source-held':retainedPersonal.length?'retained-private-records'
      :owner.retainedSourceExecutions.some(entry=>read.value.sourceCoverage.mode==='replaced'||read.value.sourceCoverage.mode==='cutover'&&entry.originalDate>=read.value.sourceCoverage.untilExclusive!)?'retained-source-records':null}};
}
export function updateProgramPersonalOccurrence(data:ProgramData,input:{actorId:string;ownerId:string;expectedOwner:ProgramRecurrencePlanOwner;identity:ProgramPersonalOccurrenceIdentity;changes:Partial<Pick<ProgramPersonalOccurrenceExecution,'schedule'|'completion'|'participation'>>;at:string;localToday:string}) {
  if(!validateProgramData(data)||data.activeActorId!==input.actorId)return programFailure(data,'forbidden');
  const owner=data.spaces[input.actorId].recurrencePlans?.owners[input.ownerId];
  if(!owner||!programSame(owner,input.expectedOwner)||input.identity.ownerId!==owner.ownerId||!active(sourceRow(data,input.actorId,owner.source,input.localToday)))return programFailure(data,'conflict');
  const read=readProgramRecurrencePlan(owner,{start:input.identity.originalDate,end:input.identity.originalDate});if(!read.ok)return programFailure(data,'conflict');
  const key=programPersonalOccurrenceKey(input.identity),expected=read.value.executionEntries[key]??null;
  const {schedule:_schedule,completion:_completion,participation:_participation,...storedIdentity}=expected??{};
  if(expected?!programSame(storedIdentity,input.identity):!read.value.targets.some(target=>programSame(programPersonalOccurrenceIdentity(owner,target),input.identity)))return programFailure(data,'conflict');
  if(!input.changes||Object.keys(input.changes).some(k=>!['schedule','completion','participation'].includes(k)))return programFailure(data,'invalid');
  const baseline:ProgramPersonalOccurrenceExecution=expected??{...input.identity,schedule:{mode:'inherit',date:null},completion:{status:'unrecorded',completedAt:null},participation:'included'};
  const nextEntry={...baseline,...input.changes};if(programSame(nextEntry,baseline))return programResult(data,data,key);
  const applied=appendProgramPersonalOccurrenceEvent(owner,{afterOperationCount:owner.operations.length,expected,next:nextEntry,at:input.at});if(!applied.ok)return programFailure(data,'conflict');
  const next=programClone(data);next.spaces[input.actorId].recurrencePlans!.owners[input.ownerId]=applied.value;
  return validateProgramData(next)?programResult(data,next,key):programFailure(data,'invalid');
}
export function undoProgramRecurrencePlanTransition(data:ProgramData,input:{actorId:string;expectedSpace:ProgramPrivateSpace;preview:ProgramRecurrencePlanPreview;localToday:string}) {
  if(!validateProgramData(data)||data.activeActorId!==input.actorId||!programSame(data.spaces[input.actorId],input.expectedSpace))return programFailure(data,'conflict');
  const owner=data.spaces[input.actorId].recurrencePlans?.owners[input.preview.after.ownerId];if(!owner)return programFailure(data,'conflict');
  const undone=undoProgramRecurrencePlan(owner,input.preview);if(!undone.ok)return programFailure(data,'conflict');
  const next=programClone(data),plans=next.spaces[input.actorId].recurrencePlans!;
  if(undone.value.operations.length)plans.owners[owner.ownerId]=undone.value;else delete plans.owners[owner.ownerId];
  return validateProgramData(next)?programResult(data,next,owner.ownerId):programFailure(data,'invalid');
}
/** Suppression is exact source provenance only; retained original records remain readable, never copied as new execution. */
export function programRecurrencePlanSuppresses(space:ProgramPrivateSpace,identity:ProgramOccurrenceIdentity):boolean {
  return createProgramRecurrencePlanSuppressor(space)(identity);
}
/** Read once per immutable source projection, not one owner replay per expanded row. */
export function createProgramRecurrencePlanSuppressor(space:ProgramPrivateSpace) {
  const owners=Object.values(space.recurrencePlans?.owners??{}).map(owner=>({owner,read:readProgramRecurrencePlan(owner,{start:owner.source.originalDate,end:owner.source.originalDate})}));
  return (identity:ProgramOccurrenceIdentity):boolean=>{
    const match=owners.find(entry=>sameSource(entry.owner.source,identity));
    if(!match)return false;if(!match.read.ok)return true;const coverage=match.read.value.sourceCoverage;
    return coverage.mode==='replaced'||coverage.mode==='cutover'&&identity.originalDate>=coverage.untilExclusive!;
  };
}
/** A missing/changed source must not make the saved personal owner and its records disappear from recovery UI. */
export function readProgramRecurrencePlanRecoveries(data:ProgramData,input:{actorId:string;localToday:string}) {
  return Object.values(data.spaces[input.actorId]?.recurrencePlans?.owners??{}).flatMap(owner=>{
    const read=readProgramPersonalRecurrences(data,{...input,ownerId:owner.ownerId,range:{start:owner.source.sourceRule.startDate,end:owner.source.sourceRule.startDate}});
    if(!read.ok)return[{owner,reason:read.reason,retainedSourceExecutions:owner.retainedSourceExecutions,retainedPersonal:[] as ProgramPersonalOccurrenceExecution[]}];
    const entries:Record<string,ProgramPersonalOccurrenceExecution>={};for(const event of owner.executionEvents??[])entries[programPersonalOccurrenceKey(event.next)]=event.next;
    return read.value.recoveryReason?[{owner,reason:read.value.recoveryReason,retainedSourceExecutions:owner.retainedSourceExecutions,
      retainedPersonal:read.value.sourceAvailable?read.value.retainedPersonal:Object.values(entries)}]:[];
  });
}
