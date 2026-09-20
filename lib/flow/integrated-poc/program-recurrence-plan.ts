import { planDateMovement, type DateMovementState, type DateMovementOccurrenceTarget } from '../date-movement';
import { createPersonalStructuralRecurrenceSeries, setPersonalStructuralOccurrenceOverride, type PersonalStructuralRecurrenceRule } from '../personal-structural-recurrence';
import { generatePersonalStructuralOccurrences, type PersonalStructuralOccurrence, type PersonalStructuralOccurrenceExecutionRecord } from '../personal-structural-occurrence';
import { parsePersonalWorkspacePocRecurrence } from '../personal-workspace-poc-occurrence';
import { isProgramOccurrenceExecution, programOccurrenceDate } from './recurrence-state-validation';
import { programOccurrenceExecutionKey, type ProgramOccurrenceIdentity } from './recurrence-state-contract';
import { resolveProgramMapSchedule } from './legacy-map-recurrence';
import { projectProgramAuthoringPlan, moveProgramAuthoringPlan } from './program-authoring-plan';
import { programPersonalOccurrenceKey, type ProgramPersonalOccurrenceExecution, type ProgramPersonalOccurrenceIdentity, type ProgramPersonalOccurrenceEvent, type ProgramRecurrencePlanOwner, type ProgramRecurrencePlanOperation, type ProgramRecurrencePlanResult } from './program-recurrence-plan-contract';

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const canonical = (v: unknown): string => JSON.stringify(v, (_key, value) => value && typeof value === 'object' && !Array.isArray(value)
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, value[key]])) : value);
const same = (a: unknown, b: unknown): boolean => canonical(a) === canonical(b);
const fail = (reason: string) => ({ ok: false as const, reason });
const stamp = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v;
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype
  && Object.values(Object.getOwnPropertyDescriptors(v)).every(d => 'value' in d && d.enumerable) && Object.getOwnPropertySymbols(v).length === 0;
const keys = (v: Record<string, unknown>, expected: string) => Object.keys(v).sort().join(',') === expected.split(',').sort().join(',');
const id = (v: unknown): v is string => typeof v === 'string' && /^[\w-]{1,120}$/.test(v);
function sourceValid(v: unknown): v is ProgramOccurrenceIdentity {
  if (object(v) && Object.hasOwn(v, 'publicOwner')) return keys(v, 'publicOwner,sourceWorkspaceId,sourceFlowRef,sourceRevisionToken,itemId,sourceItemRef,seriesId,occurrenceId,occurrenceIndex,originalDate,sourceRule')
    && isProgramOccurrenceExecution({ ...v, schedule: { mode: 'inherit', date: null }, completion: { status: 'unrecorded', completedAt: null }, participation: 'included' });
  return object(v) && keys(v, `sourceWorkspaceId,sourceFlowRef,sourceRevisionToken,savedCopyId,flowId,itemId,sourceItemRef,seriesId,occurrenceId,occurrenceIndex,originalDate,sourceRule${Object.hasOwn(v,'creatorOwner')?',creatorOwner':''}${Object.hasOwn(v,'structuredOwner')?',structuredOwner':''}`) && isProgramOccurrenceExecution({ ...v,
    schedule: { mode: 'inherit', date: null }, completion: { status: 'unrecorded', completedAt: null }, participation: 'included' });
}
export function sameProgramRecurrencePlanSource(a: ProgramOccurrenceIdentity, b: ProgramOccurrenceIdentity) {
  if (a.publicOwner || b.publicOwner) return !!a.publicOwner && !!b.publicOwner
    && ['sourceWorkspaceId','sourceFlowRef','itemId','sourceItemRef','seriesId'].every(k => a[k as keyof typeof a] === b[k as keyof typeof b])
    && same(a.publicOwner,b.publicOwner) && same(a.sourceRule,b.sourceRule);
  return ['sourceWorkspaceId','sourceFlowRef','sourceRevisionToken','savedCopyId','flowId','itemId','sourceItemRef','seriesId'].every(k => a[k as keyof typeof a] === b[k as keyof typeof b]) && same(a.sourceRule, b.sourceRule) && same(a.creatorOwner??null,b.creatorOwner??null) && same(a.structuredOwner??null,b.structuredOwner??null);
}
const sameSource = sameProgramRecurrencePlanSource;
function seed(owner: ProgramRecurrencePlanOwner): DateMovementState | null {
  const structured = owner.source.structuredOwner && resolveProgramMapSchedule(owner.source.sourceFlowRef, owner.source.itemId,
    owner.source.sourceRule.startDate, owner.source.sourceRule.recurrence, owner.source.sourceRule.recurrenceEnd);
  const parsed = parsePersonalWorkspacePocRecurrence({ recurrence: owner.source.sourceRule.recurrence,
    ...(owner.source.sourceRule.recurrenceEnd === null ? {} : { recurrenceEnd: owner.source.sourceRule.recurrenceEnd }) });
  if (!parsed.ok && !structured && !owner.source.publicOwner) return null;
  const r = owner.source.publicOwner?.schedule.rule ?? (structured ? structured.series.revisions[0].rule : parsed.ok ? parsed.rule : null);
  if (!r) return null;
  const rule: PersonalStructuralRecurrenceRule = { frequency: r.frequency, interval: r.interval,
    ...(r.weekdays ? { weekdays: [...r.weekdays] } : {}), ...(r.dayOfMonth ? { dayOfMonth: r.dayOfMonth, invalidMonthDayPolicy: 'skip' } : {}),
    ...(r.end ? { end: r.end.mode === 'count' ? { mode: 'count', count: r.end.count } : { mode: 'until', date: r.end.date } } : {}) };
  const identityNamespace = `program-recurrence-plan:v1:${owner.actorId}:${owner.ownerId}`, itemId = owner.source.itemId;
  const repeat = createPersonalStructuralRecurrenceSeries({ identityNamespace, itemId, effectiveFrom: owner.source.sourceRule.startDate,
    rule, scheduleTemplate: owner.template, updatedAt: owner.createdAt });
  return { identityNamespace, items: [{ itemId, dateOwnership: 'fixed', effectiveDate: owner.source.sourceRule.startDate,
    schedule: { mode: 'fixed_date', date: owner.source.sourceRule.startDate, ...owner.template, repeat } }], occurrenceExecutionRecords: [] };
}
function targetFor(row: PersonalStructuralOccurrence): DateMovementOccurrenceTarget {
  return { itemId: row.itemId, occurrenceId: row.occurrenceId, seriesId: row.seriesId, revisionId: row.revisionId,
    originalDate: row.originalDate, currentDate: row.localDate, executionState: row.executionState,
    ...(row.scheduleProjection.startTime ? { time: row.scheduleProjection.startTime } : {}),
    ...(row.scheduleProjection.durationMinutes ? { durationMinutes: row.scheduleProjection.durationMinutes } : {}),
    ...(row.scheduleProjection.timeZone ? { timeZone: row.scheduleProjection.timeZone } : {}) };
}
function project(owner: ProgramRecurrencePlanOwner, state: DateMovementState, range: {start:string;end:string}) {
  return owner.source.publicOwner ? projectProgramAuthoringPlan(state,range) : generatePersonalStructuralOccurrences({ identityNamespace:state.identityNamespace,
    itemId:state.items[0].itemId,schedule:state.items[0].schedule,range,executionRecords:state.occurrenceExecutionRecords });
}
function targetAt(owner: ProgramRecurrencePlanOwner, state: DateMovementState, date: string): DateMovementOccurrenceTarget[] {
  const item = state.items[0];
  const schedule = item.schedule, dates = new Set([date]);
  if (schedule?.mode === 'fixed_date' && schedule.repeat && 'occurrenceOverrides' in schedule.repeat)
    for (const override of schedule.repeat.occurrenceOverrides) if (override.mode === 'reschedule' && override.occurrenceId.includes(`:occurrence:${date}T`) && override.schedule) dates.add(override.schedule.date);
  return [...dates].flatMap(day => project(owner,state,{start:day,end:day}).occurrences).filter(row => row.originalDate === date).map(targetFor);
}
function sourceHistory(owner: ProgramRecurrencePlanOwner): boolean {
  return owner.retainedSourceExecutions.length > 0 || (JSON.parse(owner.retainedTaskRecordsRaw) as unknown[]).length > 0;
}
function sourceBoundary(owner: ProgramRecurrencePlanOwner): { mode: 'unchanged' | 'replaced' | 'cutover'; untilExclusive: string | null; baseRevisionId: string; sourceBasisActive: boolean } {
  const first = seed(owner)!.items[0].schedule!;
  const baseRevisionId = first.mode === 'fixed_date' && first.repeat && 'revisions' in first.repeat ? first.repeat.revisions[0].revisionId : '';
  const operation = owner.operations[0];
  const sourceBasisActive = !owner.operations.some((op,index) => op.scope === 'whole_series' && !sourceHistory(owner) && !(owner.executionEvents ?? []).some(event => event.afterOperationCount <= index));
  return !operation ? { mode: 'unchanged', untilExclusive: null, baseRevisionId, sourceBasisActive }
    : operation.scope === 'future_series' || sourceHistory(owner)
      ? { mode: 'cutover', untilExclusive: operation.sourceCutover!.originalDate, baseRevisionId, sourceBasisActive }
      : { mode: 'replaced', untilExclusive: null, baseRevisionId, sourceBasisActive };
}
/** Replay rejects malformed events instead of normalizing a corrupt persisted owner into success. */
export function programPersonalOccurrenceIdentity(owner: ProgramRecurrencePlanOwner, row: Pick<DateMovementOccurrenceTarget,'seriesId'|'revisionId'|'occurrenceId'|'originalDate'>): ProgramPersonalOccurrenceIdentity {
  return { ownerId: owner.ownerId, actorId: owner.actorId, sourceItemRef: owner.source.sourceItemRef, sourceRevisionToken: owner.source.sourceRevisionToken,
    seriesId: row.seriesId, revisionId: row.revisionId, occurrenceId: row.occurrenceId, originalDate: row.originalDate };
}
function personalEntryValid(entry: unknown): entry is ProgramPersonalOccurrenceExecution {
  if (!object(entry) || !keys(entry, 'ownerId,actorId,sourceItemRef,sourceRevisionToken,seriesId,revisionId,occurrenceId,originalDate,schedule,completion,participation')) return false;
  const schedule = entry.schedule, completion = entry.completion;
  return object(schedule) && keys(schedule, 'mode,date') && ['inherit','fixed_date','unscheduled'].includes(String(schedule.mode))
    && (schedule.mode === 'fixed_date' ? programOccurrenceDate(schedule.date) : schedule.date === null)
    && object(completion) && keys(completion,'status,completedAt') && ['unrecorded','open','completed'].includes(String(completion.status))
    && (completion.status === 'completed' ? stamp(completion.completedAt) : completion.completedAt === null)
    && ['included','excluded','held'].includes(String(entry.participation));
}
function replay(owner: ProgramRecurrencePlanOwner): ProgramRecurrencePlanResult<{state: DateMovementState; entries: Record<string,ProgramPersonalOccurrenceExecution>}> {
  let state = seed(owner); if (!state) return fail('invalid-source-rule');
  const entries: Record<string,ProgramPersonalOccurrenceExecution> = {}, records = new Map<string,PersonalStructuralOccurrenceExecutionRecord>();
  let eventIndex = 0, lastAt = owner.createdAt;
  for (let index = 0; index <= owner.operations.length; index++) {
    while (owner.executionEvents?.[eventIndex]?.afterOperationCount === index) {
      const event = owner.executionEvents[eventIndex++];
      if (index === 0 || !object(event) || !keys(event,'afterOperationCount,expected,next,at') || !stamp(event.at) || event.at < lastAt || !personalEntryValid(event.next)) return fail('invalid-execution-event');
      const next = event.next, key = programPersonalOccurrenceKey(next), before = entries[key] ?? null;
      if (!same(before,event.expected)) return fail('execution-conflict');
      const boundary = sourceBoundary({ ...owner, operations: owner.operations.slice(0,index), executionEvents: owner.executionEvents.slice(0,eventIndex-1) });
      const row = targetAt(owner,state,next.originalDate).find(row => same(programPersonalOccurrenceIdentity(owner,row), Object.fromEntries(Object.entries(next).filter(([k])=>!['schedule','completion','participation'].includes(k)))));
      if (!row || boundary.mode === 'cutover' && boundary.sourceBasisActive && row.revisionId === boundary.baseRevisionId) return fail('missing-private-occurrence');
      const baseline = before ?? { ...programPersonalOccurrenceIdentity(owner,row), schedule: {mode:'inherit' as const,date:null}, completion:{status:'unrecorded' as const,completedAt:null},participation:'included' as const };
      if (same(baseline,next)) return fail('unchanged-execution');
      const priorRecord = records.get(key), nextState: PersonalStructuralOccurrenceExecutionRecord['state'] = next.participation === 'excluded' ? 'skipped' : next.participation === 'held' ? 'held'
        : next.completion.status === 'completed' ? 'done' : next.completion.status === 'open' ? 'reopened' : 'pending';
      const previousState = priorRecord?.state ?? 'pending';
      records.set(key,{ occurrenceId:next.occurrenceId,seriesId:next.seriesId,revisionId:next.revisionId,state:nextState,updatedAt:event.at,
        ...(next.completion.completedAt ? {completedAt:next.completion.completedAt} : priorRecord?.completedAt ? {completedAt:priorRecord.completedAt} : {}),
        history:[...(priorRecord?.history ?? []),...(previousState === nextState ? [] : [{from:previousState,to:nextState,at:event.at}])] });
      entries[key] = clone(next); state.occurrenceExecutionRecords = [...records.values()];
      const schedule = state.items[0].schedule;
      if (!schedule || schedule.mode !== 'fixed_date' || !schedule.repeat || !('revisions' in schedule.repeat)) return fail('invalid-private-series');
      if (next.schedule.mode === 'fixed_date') schedule.repeat = setPersonalStructuralOccurrenceOverride({series:schedule.repeat,override:{occurrenceId:next.occurrenceId,mode:'reschedule',schedule:{date:next.schedule.date!,...owner.template},updatedAt:event.at}});
      else schedule.repeat = {...schedule.repeat,occurrenceOverrides:schedule.repeat.occurrenceOverrides.filter(override=>override.occurrenceId!==next.occurrenceId || override.mode!=='reschedule')};
      lastAt = event.at;
    }
    if (owner.executionEvents?.[eventIndex] && owner.executionEvents[eventIndex].afterOperationCount < index) return fail('invalid-execution-order');
    if (index === owner.operations.length) break;
    const op = owner.operations[index];
    if (!object(op) || !keys(op, 'scope,targetDate,target,sourceCutover,at') || !['whole_series','future_series'].includes(op.scope)
      || !programOccurrenceDate(op.targetDate) || !stamp(op.at) || op.at < lastAt
      || !object(op.target) || !programOccurrenceDate(op.target.originalDate)
      || !targetAt(owner,state, op.target.originalDate).some(target => same(target, op.target))) return fail('invalid-target');
    const priorBoundary = sourceBoundary({ ...owner, operations: owner.operations.slice(0, index) });
    if (index > 0 && priorBoundary.mode === 'cutover' && priorBoundary.sourceBasisActive && op.target.revisionId === priorBoundary.baseRevisionId) return fail('source-owned-occurrence');
    if (index > 0 && priorBoundary.mode === 'cutover' && op.targetDate < priorBoundary.untilExclusive!) return fail('source-coverage-conflict');
    if (op.targetDate === op.target.currentDate) return fail('unchanged-date');
    if (entries[programPersonalOccurrenceKey(programPersonalOccurrenceIdentity(owner,op.target))]?.schedule.mode === 'unscheduled') return fail('undated-cutover');
    if (index === 0) {
      if (!sourceValid(op.sourceCutover) || !sameSource(owner.source, op.sourceCutover) || op.sourceCutover.originalDate !== op.target.originalDate) return fail('source-cutover-required');
      const record = owner.retainedSourceExecutions.find(entry => programOccurrenceExecutionKey(entry) === programOccurrenceExecutionKey(op.sourceCutover!));
      if (record && (record.completion.status === 'completed' || record.participation !== 'included' || record.schedule.mode !== 'inherit')) return fail('source-cutover-requires-pending-inherited');
    } else if (op.sourceCutover !== null) return fail('unexpected-source-cutover');
    // Real retained history triggers the existing future revision policy, without inventing execution records.
    const hasHistory = sourceHistory(owner) || records.size > 0;
    const effectiveScope = op.scope === 'whole_series' && hasHistory ? 'future_series' : op.scope;
    if (effectiveScope === 'future_series' && !['pending','reopened'].includes(op.target.executionState)) return fail('series-cutover-requires-pending-or-reopened');
    if (owner.source.publicOwner) {
      const plan = moveProgramAuthoringPlan(state,{scope:effectiveScope,target:op.target,targetDate:op.targetDate,at:op.at});
      if (!plan.ok) return fail(plan.reason);
      state = plan.state;
    } else {
      const plan = planDateMovement(state, { scope: effectiveScope, operation: 'set_date', occurrence: op.target, targetDate: op.targetDate, updatedAt: op.at });
      if (!plan.canApply) return fail(plan.blockedReason ?? 'movement-blocked');
      if (plan.warnings.some(w => w.includes('invalid') || w.includes('defaulted'))) return fail('normalization-required');
      state = plan.nextState;
    }
    lastAt = op.at;
  }
  if (eventIndex !== (owner.executionEvents?.length ?? 0)) return fail('invalid-execution-order');
  return { ok: true, value: {state,entries} };
}
export function validateProgramRecurrencePlanOwner(value: unknown): value is ProgramRecurrencePlanOwner {
  try {
    if (!object(value) || !keys(Object.fromEntries(Object.entries(value).filter(([k])=>k!=='executionEvents')), 'version,ownerId,actorId,source,template,createdAt,retainedSourceExecutions,retainedTaskRecordsRaw,operations')
      || value.version !== 1 || !id(value.ownerId) || !id(value.actorId) || !sourceValid(value.source) || !stamp(value.createdAt)
      || !object(value.template) || Object.keys(value.template).some(k => !['time','durationMinutes','timeZone'].includes(k))
      || !Array.isArray(value.retainedSourceExecutions) || value.retainedSourceExecutions.length > 2000
      || !value.retainedSourceExecutions.every(e => isProgramOccurrenceExecution(e) && sameSource(value.source as ProgramOccurrenceIdentity, e))
      || new Set(value.retainedSourceExecutions.map(programOccurrenceExecutionKey)).size !== value.retainedSourceExecutions.length
      || typeof value.retainedTaskRecordsRaw !== 'string' || value.retainedTaskRecordsRaw.length > 2000000
      || !Array.isArray(JSON.parse(value.retainedTaskRecordsRaw)) || !Array.isArray(value.operations) || value.operations.length > 80
      || value.executionEvents !== undefined && (!Array.isArray(value.executionEvents) || value.executionEvents.length > 2000 || !value.executionEvents.every(event=>object(event)&&Number.isSafeInteger(event.afterOperationCount)&&Number(event.afterOperationCount)>0))) return false;
    const template = value.template;
    if (template.time !== undefined && (typeof template.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(template.time))) return false;
    if (template.durationMinutes !== undefined && (!Number.isInteger(template.durationMinutes) || Number(template.durationMinutes) < 5 || Number(template.durationMinutes) > 1440 || !template.time)) return false;
    if (template.timeZone !== undefined) { if (typeof template.timeZone !== 'string' || !template.time && !(value.source as ProgramOccurrenceIdentity).publicOwner) return false; new Intl.DateTimeFormat('en', { timeZone: template.timeZone }); }
    return replay(value as ProgramRecurrencePlanOwner).ok;
  } catch { return false; }
}
export function createProgramRecurrencePlanOwner(input: Omit<ProgramRecurrencePlanOwner, 'version' | 'operations'>): ProgramRecurrencePlanResult<ProgramRecurrencePlanOwner> {
  const value = { ...input, version: 1 as const, operations: [] };
  return validateProgramRecurrencePlanOwner(value) ? { ok: true, value: clone(value) } : fail('invalid-owner');
}
export function readProgramRecurrencePlan(owner: ProgramRecurrencePlanOwner, range: { start: string; end: string }) {
  if (!validateProgramRecurrencePlanOwner(owner) || !programOccurrenceDate(range.start) || !programOccurrenceDate(range.end) || range.start > range.end) return fail('invalid-owner-or-period');
  const result = replay(owner); if (!result.ok) return result;
  const {state,entries} = result.value, item = state.items[0];
  const projection = project(owner,state,range);
  const coverage = sourceBoundary(owner);
  const personalOccurrences = coverage.mode === 'unchanged' ? [] : projection.projectedOccurrences.filter(row => coverage.mode !== 'cutover' || !coverage.sourceBasisActive || row.revisionId !== coverage.baseRevisionId);
  // Retained source records are deliberately separate, even if their dates coincide with a new personal occurrence.
  const retained = owner.retainedSourceExecutions.filter(e => { const date = e.schedule.mode === 'unscheduled' ? null : e.schedule.date ?? e.originalDate;
    return date === null || date >= range.start && date <= range.end; });
  return { ok: true as const, value: { state, projection,
    /** Only these rows are new personal-plan execution. `projection` also contains source-basis preview rows. */
    personalOccurrences, sourceCoverage: coverage, executionEntries:clone(entries),
    targets: (coverage.mode === 'unchanged' ? projection.occurrences : personalOccurrences).map(targetFor),
    retainedSourceExecutions: clone(retained), retainedTaskRecordsRaw: owner.retainedTaskRecordsRaw,
    sourceCutover: owner.operations[0]?.sourceCutover ?? null, bounded: true as const, truncated: projection.generationLimitReached } };
}
export function appendProgramPersonalOccurrenceEvent(owner: ProgramRecurrencePlanOwner, event: ProgramPersonalOccurrenceEvent): ProgramRecurrencePlanResult<ProgramRecurrencePlanOwner> {
  if (!validateProgramRecurrencePlanOwner(owner) || event.afterOperationCount!==owner.operations.length) return fail('invalid-owner');
  const next = clone(owner); next.executionEvents = [...next.executionEvents ?? [],clone(event)];
  const checked = replay(next); return checked.ok && validateProgramRecurrencePlanOwner(next) ? {ok:true,value:next} : fail(checked.ok ? 'invalid-event' : checked.reason);
}
export function resolveProgramRecurrencePlanTarget(owner:ProgramRecurrencePlanOwner,input:{originalDate:string;personalIdentity?:ProgramPersonalOccurrenceIdentity}):ProgramRecurrencePlanResult<DateMovementOccurrenceTarget> {
  if(!validateProgramRecurrencePlanOwner(owner)||!programOccurrenceDate(input.originalDate))return fail('invalid-owner');
  const read=replay(owner);if(!read.ok)return read;
  const candidates=targetAt(owner,read.value.state,input.originalDate),boundary=sourceBoundary(owner);
  const row=candidates.find(row=>input.personalIdentity?same(programPersonalOccurrenceIdentity(owner,row),input.personalIdentity):!owner.operations.length);
  if(!row||owner.operations.length&&boundary.mode==='cutover'&&boundary.sourceBasisActive&&row.revisionId===boundary.baseRevisionId)return fail('missing-private-occurrence');
  const entry=read.value.entries[programPersonalOccurrenceKey(programPersonalOccurrenceIdentity(owner,row))];
  if(entry?.schedule.mode==='unscheduled')return fail('undated-cutover');
  return {ok:true,value:row};
}
/** Remaining personal rows are inspected against their actual revisions, never the original source manifest's end. */
export function programRecurrencePlanHasMore(owner:ProgramRecurrencePlanOwner,afterDate:string):boolean {
  if(!validateProgramRecurrencePlanOwner(owner)||!programOccurrenceDate(afterDate))return false;
  if(owner.source.publicOwner){
    if(!owner.operations.length||afterDate==='9999-12-31')return false;
    if(!owner.source.publicOwner.schedule.rule.end)return true;
    const next=new Date(`${afterDate}T00:00:00Z`);next.setUTCDate(next.getUTCDate()+1);
    const result=readProgramRecurrencePlan(owner,{start:next.toISOString().slice(0,10),end:'9999-12-31'});
    // Skipped short months defeat count*31 estimates. A resource limit is unknown continuation, never an asserted end.
    return result.ok&&(result.value.truncated||result.value.personalOccurrences.some(row=>row.localDate>afterDate));
  }
  const read=replay(owner);if(!read.ok)return false;const item=read.value.state.items[0],schedule=item.schedule;
  if(!schedule||schedule.mode!=='fixed_date'||!schedule.repeat||!('revisions' in schedule.repeat))return false;
  const boundary=sourceBoundary(owner),revisions=schedule.repeat.revisions.filter(rev=>!boundary.sourceBasisActive||rev.revisionId!==boundary.baseRevisionId);
  if(revisions.some(rev=>!rev.rule.end))return true;
  let last=afterDate;
  for(const revision of revisions){const end=revision.rule.end;if(!end)continue;
    if(end.mode==='until'){if(end.date>last)last=end.date;continue;}
    const date=new Date(`${revision.effectiveFrom}T00:00:00Z`),unit=revision.rule.frequency==='monthly'?31:revision.rule.frequency==='weekly'?7:1;
    date.setUTCDate(date.getUTCDate()+revision.rule.interval*unit*(end.count+1));const iso=Number.isFinite(date.getTime())?date.toISOString():'';
    const bound=/^\d{4}-/.test(iso)?iso.slice(0,10):'9999-12-31';if(bound>last)last=bound;
  }
  for(const entry of Object.values(read.value.entries))if(entry.schedule.mode==='fixed_date'&&entry.schedule.date!>last)last=entry.schedule.date!;
  const next=new Date(`${afterDate}T00:00:00Z`);next.setUTCDate(next.getUTCDate()+1);const first=next.toISOString().slice(0,10);
  if(first>last)return false;
  const result=readProgramRecurrencePlan(owner,{start:first,end:last});return result.ok&&result.value.personalOccurrences.some(row=>row.localDate>afterDate);
}
export type ProgramRecurrencePlanPreview = { before: ProgramRecurrencePlanOwner; after: ProgramRecurrencePlanOwner; operation: ProgramRecurrencePlanOperation };
export function previewProgramRecurrencePlan(owner: ProgramRecurrencePlanOwner | null, input: { actorId: string; expected: ProgramRecurrencePlanOwner; currentSource: ProgramOccurrenceIdentity; operation: ProgramRecurrencePlanOperation }): ProgramRecurrencePlanResult<ProgramRecurrencePlanPreview> {
  if (!owner || !validateProgramRecurrencePlanOwner(owner)) return fail('owner-required');
  if (owner.actorId !== input.actorId || !same(owner, input.expected) || !same(owner.source, input.currentSource)) return fail('conflict');
  if (owner.operations.length >= 80) return fail('history-limit');
  const after = clone(owner); after.operations.push(clone(input.operation));
  const checked = replay(after); if (!checked.ok) return checked;
  return validateProgramRecurrencePlanOwner(after) ? { ok: true, value: { before: clone(owner), after, operation: clone(input.operation) } } : fail('invalid-plan');
}
/** Pure CAS receipt only. The caller must commit this replacement through the Program transaction. */
export function applyProgramRecurrencePlan(owner: ProgramRecurrencePlanOwner, preview: ProgramRecurrencePlanPreview): ProgramRecurrencePlanResult<ProgramRecurrencePlanOwner> {
  const checked = previewProgramRecurrencePlan(owner, { actorId: owner.actorId, expected: preview.before, currentSource: preview.before.source, operation: preview.operation });
  return checked.ok && same(checked.value.after, preview.after) ? { ok: true, value: clone(preview.after) } : fail('conflict');
}
export function undoProgramRecurrencePlan(owner: ProgramRecurrencePlanOwner, preview: ProgramRecurrencePlanPreview): ProgramRecurrencePlanResult<ProgramRecurrencePlanOwner> {
  if (!same(owner, preview.after) || !applyProgramRecurrencePlan(preview.before, preview).ok) return fail('conflict');
  return { ok: true, value: clone(preview.before) };
}
