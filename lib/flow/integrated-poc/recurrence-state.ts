import { programClone, programFailure, programResult, type ProgramData, type ProgramPrivateSpace, type ProgramTransition } from './contract';
import { programSame } from './controller';
import { validateProgramData } from './program-data';
import { inspectProgramRecurrence, inspectProgramCreatorRecurrence, type ProgramRecurrenceRow, type ProgramRecurrenceWindow } from './recurrence-bridge';
import { resolveProgramExecutionSource } from './execution-source';
import { programLegacyPlanSourceIncluded } from './program-legacy-plan-target';
import { programOccurrenceExecutionKey, type ProgramOccurrenceExecution, type ProgramOccurrenceIdentity, type ProgramRecurrenceExecutionState } from './recurrence-state-contract';
import { isProgramOccurrenceExecution, isProgramRecurrenceExecutionState, programOccurrenceDate } from './recurrence-state-validation';
import { programDocumentContentLock } from './reference-execution-guard';
import { readProgramPersonalRecurrences, createProgramRecurrencePlanSuppressor } from './program-recurrence-plan-state';
import type { ProgramPersonalOccurrenceIdentity, ProgramRecurrencePlanOwner } from './program-recurrence-plan-contract';
import { programRecurrencePlanHasMore } from './program-recurrence-plan';
import {inspectProgramNativeRecurrence} from './creator-native-execution-recurrence';
import { resolveProgramMapSchedule } from './legacy-map-recurrence';
import { inspectProgramPublicCopyRecurrence, programPublicCopyOccurrenceSourceCurrent, sameProgramPublicCopyOccurrence } from './public-copy-recurrence';
type Space = ProgramPrivateSpace & { recurrenceExecution?: ProgramRecurrenceExecutionState };
export type ProgramRecurrenceReadInput = { actorId: string; flowRef: string; localToday: string; window?: ProgramRecurrenceWindow; /** Internal source-only resolver; never grants write permission. */ skipPersonalPlans?: boolean };
export type ProgramExecutionOccurrenceRow = ProgramRecurrenceRow & { identity: ProgramOccurrenceIdentity; stored: ProgramOccurrenceExecution | null; participation: ProgramOccurrenceExecution['participation']; sourceConflict: boolean; planExcluded?: boolean; planSuperseded?: boolean; personalPlan?: {ownerId:string;identity:ProgramPersonalOccurrenceIdentity;expectedOwner:ProgramRecurrencePlanOwner} };
/** UI period results carry the exact original occurrence; use this bounded page
 * when dispatching a write, not the period's effective-date window. */
export function programOccurrenceWindowFor(identity: ProgramOccurrenceIdentity): ProgramRecurrenceWindow {
  if (identity.sourceRule.recurrenceEnd || identity.structuredOwner && resolveProgramMapSchedule(identity.sourceFlowRef, identity.itemId, identity.sourceRule.startDate, identity.sourceRule.recurrence, identity.sourceRule.recurrenceEnd)?.series.revisions[0].rule.end)
    return { finiteOffset: Math.min(identity.occurrenceIndex - 1, 10000), finiteLimit: Math.max(1, identity.occurrenceIndex - 10000) };
  const week = Math.max(0, Math.floor((Date.parse(identity.originalDate) - Date.parse(identity.sourceRule.startDate)) / 604800000));
  return { windowOffsetWeeks: Math.min(512, week), windowWeeks: Math.max(1, week - 512 + 1) };
}
/** Reuses the real materializer snapshot validator and bounded occurrence expander, without writing the legacy owner. */
export function readProgramExecutionOccurrences(data: ProgramData, input: ProgramRecurrenceReadInput): { ok: false; reason: string } | {
  ok: true; sourceRevisionToken: string; rows: ProgramExecutionOccurrenceRow[]; outsideWindowKeys: string[]; sourceConflictKeys: string[];
  series: Extract<ReturnType<typeof inspectProgramRecurrence>, { ok: true }>['series'];
  pendingStarts?: Extract<ReturnType<typeof inspectProgramRecurrence>, { ok: true }>['pendingStarts'];
  personalHasMore: boolean; personalTruncated: boolean;
} {
  const space = data.spaces[input.actorId] as Space | undefined;
  if (!space) return { ok: false, reason: 'missing-source' };
  const source = resolveProgramExecutionSource(space, input.flowRef, data.public);
  if (!source.ok) return source;
  const sourceRevisionToken = source.sourceRevisionToken;
  if (sourceRevisionToken.length > 1000000) return { ok: false, reason: 'source-limit' };
  const expanded = source.kind === 'public-copy' ? inspectProgramPublicCopyRecurrence(source.source, input.window) : source.kind==='native'?inspectProgramNativeRecurrence(source,input.window):source.kind === 'creator' ? inspectProgramCreatorRecurrence(source, input.window) : inspectProgramRecurrence(source.payload, input);
  if (!expanded.ok) return expanded;
  if (space.recurrenceExecution && !isProgramRecurrenceExecutionState(space.recurrenceExecution)) return { ok: false, reason: 'invalid-state' };
  const entries = space.recurrenceExecution?.entries ?? {};
  const suppressed = input.skipPersonalPlans ? () => false : createProgramRecurrencePlanSuppressor(space);
  const rows:ProgramExecutionOccurrenceRow[] = expanded.rows.map(row => {
    const series = expanded.series.find(entry => entry.sourceItemRef === row.sourceItemRef)!;
    const identity: ProgramOccurrenceIdentity = { ...(row.publicOwner ? { publicOwner: row.publicOwner } : {}), ...(row.structuredOwner ? { structuredOwner: row.structuredOwner } : {}), ...(row.nativeOwner?{nativeOwner:row.nativeOwner}:{}),...(row.creatorOwner ? { creatorOwner: row.creatorOwner } : {}), sourceWorkspaceId: source.workspaceId, sourceFlowRef: input.flowRef, sourceRevisionToken,
      ...(!row.nativeOwner && !row.publicOwner ? {savedCopyId: row.savedCopyId!, flowId: row.flowId!}:{}), itemId: row.itemId, sourceItemRef: row.sourceItemRef,
      seriesId: row.seriesId, occurrenceId: row.occurrenceId, occurrenceIndex: row.occurrenceIndex, originalDate: row.originalDate,
      sourceRule: row.structuredSourceRule ?? { startDate: series.startDate, recurrence: series.manifest.rule.raw, recurrenceEnd: series.manifest.rule.end?.raw ?? null } };
    const key = programOccurrenceExecutionKey(identity), stored = entries[key] ?? null;
    const sourceConflict = !!stored && !(row.publicOwner ? sameProgramPublicCopyOccurrence(identity, identityOf(stored)) : programSame(identity, identityOf(stored)));
    const usable = !sourceConflict ? stored : null;
    const binding = !row.creatorOwner&&!row.nativeOwner&&!row.publicOwner ? space.savedBindings.find(binding => binding.flowRef === input.flowRef && Object.hasOwn(binding.itemLines, row.sourceItemRef)) : undefined;
    const lineId = source.kind === 'public-copy' ? source.copy.itemLines[row.itemId] : binding?.itemLines[row.sourceItemRef];
    // A canonical source row may have moved to another document. The filing
    // scope and immutable legacy owner are not the current document lock.
    const documentId = lineId ? [...space.text.documents, ...space.text.flows].find(doc => doc.lines.some(line => line.id === lineId))?.id ?? binding?.documentId : binding?.documentId;
    const documentInactive = !!documentId && programDocumentContentLock(space, documentId) !== 'active';
    return { ...row, flowInactive: row.flowInactive || documentInactive, key, identity, stored, sourceConflict, planSuperseded: suppressed(identity), planExcluded: row.publicOwner ? !!row.publicExcluded : !row.creatorOwner&&!row.nativeOwner && !programLegacyPlanSourceIncluded(space, input.flowRef, row.sourceItemRef), participation: usable?.participation ?? 'included' as const,
      executionScheduleMode: usable?.schedule.mode ?? row.executionScheduleMode,
      executionDate: usable ? usable.schedule.mode === 'inherit' ? row.originalDate : usable.schedule.date : row.executionDate,
      completion: usable?.completion.status ?? row.completion, completedAt: usable ? usable.completion.completedAt : row.completedAt };
  });
  let personalHasMore=false,personalTruncated=false;
  if(!input.skipPersonalPlans)for(const owner of Object.values(space.recurrencePlans?.owners??{}).filter(owner=>owner.source.sourceFlowRef===input.flowRef)){
    const start=new Date(`${owner.operations[0].targetDate}T00:00:00Z`);start.setUTCDate(start.getUTCDate()+(input.window?.windowOffsetWeeks??0)*7);
    const end=new Date(start);end.setUTCDate(end.getUTCDate()+(input.window?.windowWeeks??4)*7-1);
    const personal=readProgramPersonalRecurrences(data,{actorId:input.actorId,ownerId:owner.ownerId,localToday:input.localToday,range:{start:start.toISOString().slice(0,10),end:end.toISOString().slice(0,10)}});
    if(!personal.ok)return personal;rows.push(...personal.value.rows);personalTruncated ||= personal.value.truncated;
    personalHasMore ||= programRecurrencePlanHasMore(owner,end.toISOString().slice(0,10));
  }
  const visible = new Set(rows.map(row => row.key));
  const relevant = Object.entries(entries).filter(([, entry]) => entry.sourceWorkspaceId === source.workspaceId && entry.sourceFlowRef === input.flowRef);
  return { ok: true, sourceRevisionToken, rows, series: expanded.series, pendingStarts: expanded.pendingStarts, personalHasMore,personalTruncated,outsideWindowKeys: relevant.filter(([key]) => !visible.has(key)).map(([key]) => key),
    sourceConflictKeys: relevant.filter(([, entry]) => source.kind === 'public-copy'
      ? !programPublicCopyOccurrenceSourceCurrent(entry, source.source) : entry.sourceRevisionToken !== sourceRevisionToken).map(([key]) => key) };
}
function identityOf(entry: ProgramOccurrenceExecution): ProgramOccurrenceIdentity {
  const { schedule: _schedule, completion: _completion, participation: _participation, ...identity } = entry; return identity;
}
export function updateProgramOccurrenceExecution(data: ProgramData, input: ProgramRecurrenceReadInput & {
  identity: ProgramOccurrenceIdentity; expected: ProgramOccurrenceExecution | null;
  changes: Partial<Pick<ProgramOccurrenceExecution, 'schedule' | 'completion' | 'participation'>>;
}): ProgramTransition<string> {
  if (!validateProgramData(data)) return programFailure(data, 'invalid');
  if (data.activeActorId !== input.actorId || !data.spaces[input.actorId]) return programFailure(data, 'forbidden');
  const read = readProgramExecutionOccurrences(data, {...input,skipPersonalPlans:false});
  if (!read.ok) return programFailure(data, 'conflict');
  const key = programOccurrenceExecutionKey(input.identity), row = read.rows.find(entry => entry.key === key);
  if (!row || row.personalPlan || row.planSuperseded || row.sourceConflict || row.mapReviewHold || row.flowInactive || row.planExcluded || !programSame(row.identity, input.identity) || !programSame(row.stored, input.expected)) return programFailure(data, 'conflict');
  if (!input.changes || Object.keys(input.changes).some(field => !['schedule', 'completion', 'participation'].includes(field))) return programFailure(data, 'invalid');
  const baseline: ProgramOccurrenceExecution = row.stored ?? { ...row.identity,
    schedule: { mode: row.executionScheduleMode, date: row.executionScheduleMode === 'fixed_date' ? row.executionDate : null },
    completion: { status: row.completion, completedAt: row.completedAt }, participation: row.participation };
  const updated = { ...baseline, ...input.changes };
  if (!isProgramOccurrenceExecution(updated)) return programFailure(data, 'invalid');
  if (programSame(updated, baseline)) return { ok: true, data, changed: false, result: key };
  const next = programClone(data), target = next.spaces[input.actorId] as Space;
  target.recurrenceExecution = { version: 1, entries: { ...target.recurrenceExecution?.entries, [key]: updated } };
  return validateProgramData(next) ? programResult(data, next, key) : programFailure(data, 'invalid');
}

/** Period union uses effective dates, including exceptions whose ORIGINAL date
 * lies outside the visible expansion. Every expansion remains bounded. */
export function readProgramOccurrencePeriod(data: ProgramData, input: Omit<ProgramRecurrenceReadInput, 'window'> & {
  from?: string; to?: string; undatedOnly?: boolean; includeExcluded?: boolean; includeHeld?: boolean;
}) {
  if ((input.from !== undefined && !programOccurrenceDate(input.from)) || (input.to !== undefined && !programOccurrenceDate(input.to))
    || (!!input.from !== !!input.to) || (input.from && input.to && input.from > input.to)) return { ok: false as const, reason: 'invalid-period' };
  const baseline = readProgramExecutionOccurrences(data, input); if (!baseline.ok) return baseline;
  const source = resolveProgramExecutionSource(data.spaces[input.actorId], input.flowRef, data.public); if (!source.ok) return source;
  const entries = (data.spaces[input.actorId] as Space).recurrenceExecution?.entries ?? {};
  const targetDates = new Set<string>();
  const currentEntries = Object.values(entries).filter(entry => entry.sourceWorkspaceId === source.workspaceId && entry.sourceFlowRef === input.flowRef
    && (source.kind === 'public-copy' ? programPublicCopyOccurrenceSourceCurrent(entry, source.source) : entry.sourceRevisionToken === baseline.sourceRevisionToken));
  for (const entry of currentEntries) targetDates.add(entry.originalDate);
  for (const entry of source.originalExceptions) {
    if (baseline.series.some(series => series.sourceItemRef === entry.sourceItemRef)) targetDates.add(entry.originalDate);
  }
  const windows = new Map<string, ProgramRecurrenceWindow>();
  const add = (window: ProgramRecurrenceWindow) => windows.set(JSON.stringify(window), window);
  let truncated = false;
  for (const series of baseline.series) {
    if (series.manifest.mode === 'finite') {
      // A finite scan is capped by the existing expander's 10,000-offset contract.
      const targetEnd = [input.to, ...targetDates].filter((date): date is string => !!date).sort().at(-1);
      if (!targetEnd) { add({ finiteOffset: 0, finiteLimit: 30 }); continue; }
      for (let offset = 0; offset <= 10000; offset += 200) {
        const page = readProgramExecutionOccurrences(data, { ...input, window: { finiteOffset: offset, finiteLimit: 200 } });
        if (!page.ok) return page;
        add({ finiteOffset: offset, finiteLimit: 200 });
        const own = page.series.find(entry => entry.sourceItemRef === series.sourceItemRef)!;
        if (!own.manifest.hasMore || own.manifest.rows.at(-1)?.originalDate! >= targetEnd) break;
        if (offset === 10000) truncated = true;
      }
    } else {
      const addDates = (from: string, to: string) => {
        const start = Date.parse(`${series.startDate}T00:00:00.000Z`), requestedFirst = Math.max(0, Math.floor((Date.parse(from) - start) / 604800000)), first = Math.min(512, requestedFirst);
        const last = Math.max(0, Math.floor((Date.parse(to) - start) / 604800000));
        for (let offset = first; offset <= Math.min(last, 512); offset += 8) add({ windowOffsetWeeks: offset, windowWeeks: Math.min(8, last - offset + 1, 520 - offset) });
        if (last > 519 || requestedFirst > 519) truncated = true;
      };
      if (input.from && input.to) addDates(input.from, input.to); else add({ windowOffsetWeeks: 0, windowWeeks: 4 });
      for (const date of targetDates) addDates(date, date);
    }
  }
  const rows = new Map<string, ProgramExecutionOccurrenceRow>();
  for (const window of windows.values()) {
    const page = readProgramExecutionOccurrences(data, { ...input, window }); if (!page.ok) return page;
    for (const row of page.rows) rows.set(row.key, row);
  }
  if(input.from&&input.to)for(const owner of Object.values(data.spaces[input.actorId].recurrencePlans?.owners??{}).filter(owner=>owner.source.sourceFlowRef===input.flowRef)){
    const personal=readProgramPersonalRecurrences(data,{actorId:input.actorId,ownerId:owner.ownerId,localToday:input.localToday,range:{start:input.from,end:input.to}});
    if(!personal.ok)return personal;for(const row of personal.value.rows)rows.set(row.key,row);truncated ||= personal.value.truncated;
  }
  const selected = [...rows.values()].filter(row => !row.planSuperseded && !row.sourceConflict && !row.flowInactive && !row.planExcluded
    && (input.includeHeld || row.participation !== 'held' && !row.mapReviewHold)
    && (input.includeExcluded || row.participation !== 'excluded')
    && (input.undatedOnly ? row.executionDate === null : !input.from || !!row.executionDate && row.executionDate >= input.from && row.executionDate <= input.to!))
    .sort((a, b) => (a.executionDate ?? '9999-99-99').localeCompare(b.executionDate ?? '9999-99-99') || a.originalDate.localeCompare(b.originalDate) || a.key.localeCompare(b.key));
  return { ok: true as const, rows: selected, series: baseline.series, pendingStarts: baseline.pendingStarts, sourceConflictKeys: baseline.sourceConflictKeys,
    /** False never asserts a series ended; the manifest owns that fact. */
    truncated, bounded: true as const };
}
