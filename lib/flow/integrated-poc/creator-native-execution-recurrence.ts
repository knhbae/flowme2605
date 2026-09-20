import type {ProgramResolvedExecutionSource} from './execution-source';
import type {ProgramRecurrenceInspection,ProgramRecurrenceRow,ProgramRecurrenceWindow} from './recurrence-bridge';
import {projectAuthoringRecurrenceDates,parseAuthoringRecurrenceRule,isValidAuthoringDate} from './native-creator-vendor/text-authoring/recurrence';
import {stableAuthoringId,stableAuthoringJson} from './native-creator-vendor/text-authoring/identity';
import type {AuthoringRecurrenceRule} from './native-creator-vendor/text-authoring/types';
import type {ProgramOccurrenceExecution} from './recurrence-state-contract';
import {programNativeExecutionRef,programNativeItemRef} from './creator-native-execution-contract';
import {programNativeSelectionHeld} from './creator-native-execution-validation';
export const programNativeSeriesKey=(ownerId:string,itemId:string,startDate:string,rule:AuthoringRecurrenceRule)=>stableAuthoringId('program-native-series',ownerId,itemId,startDate,stableAuthoringJson(rule));
export function inspectProgramNativeRecurrence(source:Extract<ProgramResolvedExecutionSource,{kind:'native'}>,window:ProgramRecurrenceWindow={}):ProgramRecurrenceInspection{
 if(Object.keys(window).some(k=>!['finiteOffset','finiteLimit','windowOffsetWeeks','windowWeeks'].includes(k))||!Number.isSafeInteger(window.finiteOffset??0)||(window.finiteOffset??0)<0||(window.finiteOffset??0)>10000||!Number.isSafeInteger(window.finiteLimit??30)||(window.finiteLimit??30)<1||(window.finiteLimit??30)>200||!Number.isSafeInteger(window.windowOffsetWeeks??0)||(window.windowOffsetWeeks??0)<0||(window.windowOffsetWeeks??0)>512||!Number.isSafeInteger(window.windowWeeks??4)||(window.windowWeeks??4)<1||(window.windowWeeks??4)>8)return{ok:false,reason:'invalid-window'};
 const rows:ProgramRecurrenceRow[]=[],series:Extract<ProgramRecurrenceInspection,{ok:true}>['series']=[];
 for(const selected of source.selected.filter(s=>s.row.kind==='series')){
  const ref=programNativeItemRef(source.owner.id,selected.row.itemId),context=source.contexts.get(ref),rule=context?.attributes.nativeRule,start=context?.attributes.date;if(!context||!rule||!start)return{ok:false,reason:'missing-native-recurrence-start'};
  const expanded=projectAuthoringRecurrenceDates({itemId:selected.row.itemId,startDate:start,rule,limit:window.finiteLimit??30,offset:window.finiteOffset??0,openEndedWeeks:window.windowWeeks??4,openEndedOffsetWeeks:window.windowOffsetWeeks??0});
  const seriesId=programNativeSeriesKey(source.owner.id,selected.row.itemId,start,rule),entries=expanded.occurrences.map(occ=>({rowId:occ.occurrenceId,occurrenceId:occ.occurrenceId,seriesId,sourceItemRef:ref,originalDate:occ.date,occurrenceIndex:occ.occurrenceIndex}));
  const {sourceRowIds:_,executionCondition:__,...sharedRule}=rule;
  series.push({sourceItemRef:ref,startDate:start,manifest:{version:1,sourceItemRef:ref,seriesId,rule:{version:1,...sharedRule},mode:rule.end?'finite':'open-ended',rows:entries,rowIds:entries.map(r=>r.rowId),occurrenceIds:entries.map(r=>r.occurrenceId),originalDates:entries.map(r=>r.originalDate),hasMore:expanded.hasMore,...(expanded.totalCount!==undefined?{totalCount:expanded.totalCount}:{}),...(expanded.window?{window:{...expanded.window,offsetWeeks:window.windowOffsetWeeks??0,weeks:window.windowWeeks??4}}:{})}});
  const held=programNativeSelectionHeld(source.owner,selected.selection);
  for(const occ of entries)rows.push({...occ,key:occ.occurrenceId,nativeOwner:{kind:'native-creator',ownerId:source.owner.id,rowId:selected.row.rowId,itemId:selected.row.itemId,rule},itemId:selected.row.itemId,title:context.nativeItem.title,memo:context.nativeItem.detail??'',time:context.attributes.time,timeZone:context.attributes.timeZone,executionDate:occ.originalDate,executionScheduleMode:'inherit',completion:'unrecorded',completedAt:null,flowInactive:source.inactive,mapReviewHold:held});
 }
 return{ok:true,flowRef:source.flow.ref,sourceSnapshotRaw:source.revision.nativeDocument.document.rawText,rows,series,outsideWindowExceptionIds:[],calendar:[...new Set(rows.map(r=>r.executionDate))].map(date=>({date,occurrenceIds:rows.filter(r=>r.executionDate===date).map(r=>r.occurrenceId)})),unsupportedCapabilities:['per-occurrence-hold','per-occurrence-exclusion','persist-expanded-window']};
}
/** Native state never uses the legacy tuple or occurrence-id grammar. */
export function validateNativeOccurrenceIdentity(value:ProgramOccurrenceExecution):boolean{
 try{const native=value.nativeOwner;if(!native||value.creatorOwner||Object.hasOwn(value,'savedCopyId')||Object.hasOwn(value,'flowId')||native.kind!=='native-creator'||Object.keys(native).sort().join(',')!=='itemId,kind,ownerId,rowId,rule'||![native.ownerId,native.itemId,native.rowId,value.seriesId,value.occurrenceId].every(v=>typeof v==='string'&&!!v&&v.length<=1200))return false;
  if(value.sourceWorkspaceId!==native.ownerId||value.sourceFlowRef!==programNativeExecutionRef(native.ownerId)||value.sourceItemRef!==programNativeItemRef(native.ownerId,native.itemId)||value.itemId!==native.itemId||!isValidAuthoringDate(value.originalDate)||!isValidAuthoringDate(value.sourceRule.startDate)||!Number.isSafeInteger(value.occurrenceIndex)||value.occurrenceIndex<1||value.occurrenceIndex>10200)return false;
  const parsed=parseAuthoringRecurrenceRule({raw:native.rule.raw,...(native.rule.end?{repeatEnd:native.rule.end.raw}:{}),...(native.rule.executionCondition?{executionCondition:native.rule.executionCondition}:{}),sourceRowIds:native.rule.sourceRowIds});if(!parsed.ok||stableAuthoringJson(parsed.rule)!==stableAuthoringJson(native.rule)||value.sourceRule.recurrence!==native.rule.raw||value.sourceRule.recurrenceEnd!==(native.rule.end?.raw??null)||value.seriesId!==programNativeSeriesKey(native.ownerId,native.itemId,value.sourceRule.startDate,native.rule))return false;
  const week=Math.floor((Date.parse(value.originalDate)-Date.parse(value.sourceRule.startDate))/604800000);if(week<0||!native.rule.end&&week>519)return false;
  const read=projectAuthoringRecurrenceDates({itemId:native.itemId,startDate:value.sourceRule.startDate,rule:native.rule,offset:value.occurrenceIndex-1,limit:1,openEndedOffsetWeeks:week,openEndedWeeks:1});return read.occurrences.some(occ=>occ.occurrenceId===value.occurrenceId&&occ.occurrenceIndex===value.occurrenceIndex&&occ.date===value.originalDate);
 }catch{return false;}
}
