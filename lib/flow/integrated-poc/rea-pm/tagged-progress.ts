import {canonicalJson,detached} from '../alpha-persistence/json';
import {freezeStored,validateReaStoredText,type ReaStoredText} from '../rea-stored-text';

export type TaggedProgressRequest={requestId:string;inputOwnerId:string;docId:string;occurrenceId:string;entityId:string;expectedInputRevision:number;expectedSemanticRevision:number;expectedCompositionEpoch:number;recordDate:string;percent:number};
export function taggedProgressDate(value:unknown):value is string {
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const[y,m,d]=value.split('-').map(Number),date=new Date(0);date.setUTCFullYear(y,m-1,d);
 return y>=1&&date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d;
}
/** REA local-task rule only. No v11 projection, bool/date inference, or real writer. */
export function setTaggedProgress(base:ReaStoredText,input:Pick<TaggedProgressRequest,'docId'|'occurrenceId'|'entityId'|'recordDate'|'percent'>){
 const reject=(reason:string)=>({ok:false as const,reason});
 if(!taggedProgressDate(input.recordDate)||!Number.isInteger(input.percent)||input.percent<0||input.percent>100)return reject('INVALID_PROGRESS_DATE_OR_PERCENT');
 const block=base.documents[input.docId]?.blocks[input.occurrenceId],task=base.tasks[input.entityId];
 if(!block||block.kind!=='task'||block.entityId!==input.entityId||!task||task.parentTaskId!==null)return reject('PROGRESS_TARGET_MISMATCH');
 const next=detached(base) as ReaStoredText,target=next.tasks[input.entityId];
 const beforeRecord=task.progressRecords.find(r=>r.recordDate===input.recordDate)??null;
 target.progressRecords=target.progressRecords.filter(r=>r.recordDate!==input.recordDate);
 target.progressRecords.push({recordDate:input.recordDate,percent:input.percent});
 target.progressRecords.sort((a,b)=>a.recordDate.localeCompare(b.recordDate));
 target.currentPercent=target.progressRecords.at(-1)!.percent;
 if(!validateReaStoredText(next))return reject('UNSUPPORTED_PROGRESS_SNAPSHOT');
 return{ok:true as const,changed:canonicalJson(task)!==canonicalJson(target),snapshot:freezeStored(next) as ReaStoredText,
  before:freezeStored({currentPercent:task.currentPercent,record:detached(beforeRecord)}),after:freezeStored({currentPercent:target.currentPercent,record:{recordDate:input.recordDate,percent:input.percent}})};
}
