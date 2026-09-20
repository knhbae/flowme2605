import { programOccurrenceExecutionKey, type ProgramOccurrenceExecution, type ProgramRecurrenceExecutionState } from './recurrence-state-contract';
import { expandPersonalWorkspacePocOccurrences, isPersonalWorkspacePocOccurrenceIdFor } from '../personal-workspace-poc-occurrence';
import { toPersonalWorkspacePocFlowItemRef, toPersonalWorkspacePocFlowRef } from '../personal-workspace-poc-contract';
import { creatorExecutionItemRef } from './creator-execution-contract';
import {validateNativeOccurrenceIdentity} from './creator-native-execution-recurrence';
import { validateProgramStructuredOccurrence } from './structured-map-execution';
import { validateProgramPublicCopyOccurrenceIdentity } from './public-copy-recurrence';
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value))
  && !Object.getOwnPropertySymbols(value).length && Object.values(Object.getOwnPropertyDescriptors(value)).every(descriptor => 'value' in descriptor && descriptor.enumerable);
const keys = (value: Record<string, unknown>, names: string) => Object.keys(value).sort().join(',') === names.split(',').sort().join(',');
const identifier = (value: unknown) => typeof value === 'string' && value.trim().length > 0 && value.length <= 1200 && !['__proto__', 'constructor', 'prototype'].includes(value);
export const programOccurrenceDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(`${value}T00:00:00.000Z`)) && new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;
export function isProgramOccurrenceExecution(value: unknown): value is ProgramOccurrenceExecution {
  if (!record(value)) return false;
  if(value.nativeOwner!==undefined || value.publicOwner!==undefined){
    const ownerKey = value.publicOwner !== undefined ? 'publicOwner' : 'nativeOwner';
    if(!keys(value,`${ownerKey},sourceWorkspaceId,sourceFlowRef,sourceRevisionToken,itemId,sourceItemRef,seriesId,occurrenceId,occurrenceIndex,originalDate,sourceRule,schedule,completion,participation`)||typeof value.sourceRevisionToken!=='string'||!value.sourceRevisionToken||value.sourceRevisionToken.length>1000000
      || !(ownerKey === 'publicOwner' ? validateProgramPublicCopyOccurrenceIdentity(value as unknown as ProgramOccurrenceExecution) : validateNativeOccurrenceIdentity(value as unknown as ProgramOccurrenceExecution)))return false;
    const schedule=value.schedule,completion=value.completion;
    return record(schedule)&&keys(schedule,'mode,date')&&['inherit','fixed_date','unscheduled'].includes(String(schedule.mode))&&(schedule.mode==='fixed_date'?programOccurrenceDate(schedule.date):schedule.date===null)&&record(completion)&&keys(completion,'status,completedAt')&&['unrecorded','open','completed'].includes(String(completion.status))&&(completion.status==='completed'?typeof completion.completedAt==='string'&&Number.isFinite(Date.parse(completion.completedAt))&&new Date(completion.completedAt).toISOString()===completion.completedAt:completion.completedAt===null)&&['included','excluded','held'].includes(String(value.participation));
  }
  const { creatorOwner, structuredOwner, ...withoutOwner } = value;
  if (!keys(withoutOwner, 'sourceWorkspaceId,sourceFlowRef,sourceRevisionToken,savedCopyId,flowId,itemId,sourceItemRef,seriesId,occurrenceId,occurrenceIndex,originalDate,sourceRule,schedule,completion,participation')) return false;
  if (creatorOwner !== undefined && (!record(creatorOwner) || !keys(creatorOwner, 'kind,ownerId,rowId,executionItemRef') || creatorOwner.kind !== 'creator'
    || !identifier(creatorOwner.ownerId) || !identifier(creatorOwner.rowId) || creatorOwner.ownerId !== value.sourceWorkspaceId
    || creatorOwner.executionItemRef !== creatorExecutionItemRef(creatorOwner.ownerId as string, creatorOwner.rowId as string))) return false;
  const executionRef = record(creatorOwner) ? creatorOwner.executionItemRef as string : value.sourceItemRef as string;
  if (!['sourceWorkspaceId', 'sourceFlowRef', 'savedCopyId', 'flowId', 'itemId', 'sourceItemRef', 'seriesId', 'occurrenceId'].every(key => identifier(value[key]))
    || typeof value.sourceRevisionToken !== 'string' || !value.sourceRevisionToken || value.sourceRevisionToken.length > 1000000
    || !Number.isSafeInteger(value.occurrenceIndex) || (value.occurrenceIndex as number) < 1 || (value.occurrenceIndex as number) > 10200 || !programOccurrenceDate(value.originalDate)) return false;
  const pinned = value.sourceRule;
  if (!record(pinned) || !keys(pinned, 'startDate,recurrence,recurrenceEnd') || !programOccurrenceDate(pinned.startDate)
    || typeof pinned.recurrence !== 'string' || pinned.recurrence.length > 1200 || !(pinned.recurrenceEnd === null || typeof pinned.recurrenceEnd === 'string' && pinned.recurrenceEnd.length <= 1200)) return false;
  const rule = { recurrence: pinned.recurrence, ...(pinned.recurrenceEnd === null ? {} : { recurrenceEnd: pinned.recurrenceEnd }) };
  if (value.sourceItemRef !== toPersonalWorkspacePocFlowItemRef(value.savedCopyId as string, value.flowId as string, value.itemId as string)
    || value.sourceFlowRef !== toPersonalWorkspacePocFlowRef(value.savedCopyId as string, value.flowId as string)
    || (!structuredOwner && !isPersonalWorkspacePocOccurrenceIdFor({ sourceItemRef: executionRef, occurrenceId: value.occurrenceId as string, originalDate: value.originalDate, ...rule }))) return false;
  const dayOffset = (Date.parse(value.originalDate) - Date.parse(pinned.startDate)) / 86400000;
  const expanded = structuredOwner ? null : expandPersonalWorkspacePocOccurrences({ sourceItemRef: executionRef, startDate: pinned.startDate, ...rule,
    finiteOffset: Math.min((value.occurrenceIndex as number) - 1, 10000), finiteLimit: Math.max(1, (value.occurrenceIndex as number) - 10000), windowOffsetWeeks: Math.floor(dayOffset / 7), windowWeeks: 1 });
  if (structuredOwner !== undefined ? !record(structuredOwner) || !validateProgramStructuredOccurrence(value as unknown as ProgramOccurrenceExecution)
    : !expanded?.ok || !expanded.manifest.rows.some(row => row.occurrenceId === value.occurrenceId && row.seriesId === value.seriesId && row.occurrenceIndex === value.occurrenceIndex && row.originalDate === value.originalDate)) return false;
  const schedule = value.schedule, completion = value.completion;
  if (!record(schedule) || !keys(schedule, 'mode,date') || !['inherit', 'fixed_date', 'unscheduled'].includes(String(schedule.mode))
    || (schedule.mode === 'fixed_date' ? !programOccurrenceDate(schedule.date) : schedule.date !== null)) return false;
  if (!record(completion) || !keys(completion, 'status,completedAt') || !['unrecorded', 'open', 'completed'].includes(String(completion.status))) return false;
  if (completion.status === 'completed' ? typeof completion.completedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(completion.completedAt)
    || !Number.isFinite(Date.parse(completion.completedAt)) || new Date(completion.completedAt).toISOString() !== completion.completedAt : completion.completedAt !== null) return false;
  return ['included', 'excluded', 'held'].includes(String(value.participation));
}
/** Stale source entries remain valid retained history; writers check current source separately. */
export function isProgramRecurrenceExecutionState(value: unknown): value is ProgramRecurrenceExecutionState {
  if (!record(value) || !keys(value, 'version,entries') || value.version !== 1 || !record(value.entries) || Object.keys(value.entries).length > 2000) return false;
  return Object.entries(value.entries).every(([key, entry]) => isProgramOccurrenceExecution(entry) && key === programOccurrenceExecutionKey(entry));
}
