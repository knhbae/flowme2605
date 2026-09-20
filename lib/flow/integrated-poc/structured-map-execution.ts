import { generatePersonalStructuralOccurrences } from '../personal-structural-occurrence';
import { isPersonalStructuralPlainDate } from '../personal-structural-schedule';
import type { PersonalWorkspacePocOccurrenceManifest, PersonalWorkspacePocOccurrenceRow } from '../personal-workspace-poc-occurrence';
import { resolveProgramMapSchedule, type ProgramStructuredMapRecurrenceContext } from './legacy-map-recurrence';
import type { ProgramRecurrenceWindow } from './recurrence-bridge';
import type { ProgramOccurrenceIdentity } from './recurrence-state-contract';

export type ProgramStructuredOccurrenceOwner = { kind: 'structured-map'; version: 1; mapId: string; sourceRevisionId: string; seriesRevisionId: string;
  ruleBasis: ProgramStructuredMapRecurrenceContext['ruleBasis'] };
/** Matches the existing D1 scan guard, not a source end or durable product rule. */
export const PROGRAM_MAP_EXECUTION_WINDOW = Object.freeze({ version: 1, chunkDays: 366, maxScanDays: 100000 });
const fail = (reason: string) => ({ ok: false as const, reason });
const add = (date: string, days: number) => {
  const value = new Date(`${date}T00:00:00.000Z`); value.setUTCDate(value.getUTCDate() + days);
  const result = Number.isFinite(value.getTime()) ? value.toISOString().slice(0, 10) : '';
  return isPersonalStructuralPlainDate(result) ? result : null;
};
type Pinned = Pick<ProgramOccurrenceIdentity, 'sourceFlowRef' | 'itemId' | 'sourceItemRef' | 'sourceRule'>;

/** D1 supplies every emitted date and ID. Disjoint bounded reads also supply
 * the global ordinal; neither the authoring first-date rule nor a page index
 * can fabricate a saved Map occurrence. No persisted expanded-window owner. */
export function expandProgramStructuredOccurrences(input: Pinned, window: ProgramRecurrenceWindow = {}) {
  const offset = window.finiteOffset ?? 0, limit = window.finiteLimit ?? 30, offsetWeeks = window.windowOffsetWeeks ?? 0, weeks = window.windowWeeks ?? 4;
  if (Object.keys(window).some(k => !['finiteOffset', 'finiteLimit', 'windowOffsetWeeks', 'windowWeeks'].includes(k))
    || !Number.isSafeInteger(offset) || offset < 0 || offset > 10000 || !Number.isSafeInteger(limit) || limit < 1 || limit > 200
    || !Number.isSafeInteger(offsetWeeks) || offsetWeeks < 0 || offsetWeeks > 512 || !Number.isSafeInteger(weeks) || weeks < 1 || weeks > 8) return fail('invalid-window');
  const pinned = input.sourceRule, resolved = resolveProgramMapSchedule(input.sourceFlowRef, input.itemId, pinned.startDate, pinned.recurrence, pinned.recurrenceEnd);
  if (!resolved) return fail('invalid-structured-rule');
  const { identityNamespace, series } = resolved, rule = series.revisions[0].rule, finite = !!rule.end;
  const windowStart = add(pinned.startDate, offsetWeeks * 7), windowEnd = add(pinned.startDate, (offsetWeeks + weeks) * 7 - 1);
  if (!windowStart || !windowEnd) return fail('projection-range-overflow');
  const rows: PersonalWorkspacePocOccurrenceRow[] = [];
  let count = 0, exhausted = false, hasMore = !finite;
  for (let day = 0; day < PROGRAM_MAP_EXECUTION_WINDOW.maxScanDays; day += PROGRAM_MAP_EXECUTION_WINDOW.chunkDays) {
    const start = add(pinned.startDate, day);
    let end = add(pinned.startDate, Math.min(day + PROGRAM_MAP_EXECUTION_WINDOW.chunkDays, PROGRAM_MAP_EXECUTION_WINDOW.maxScanDays) - 1);
    if (!start || !end) return fail('projection-range-overflow');
    if (!finite && end > windowEnd) end = windowEnd;
    if (rule.end?.mode === 'until' && end > rule.end.date) end = rule.end.date;
    if (start > end) { exhausted = true; break; }
    const projected = generatePersonalStructuralOccurrences({ identityNamespace, itemId: input.itemId,
      schedule: { mode: 'fixed_date', date: pinned.startDate, repeat: series }, range: { start, end },
      maxOccurrences: PROGRAM_MAP_EXECUTION_WINDOW.chunkDays + 1, fallbackTimestamp: series.updatedAt });
    if (projected.warnings.length || projected.generationLimitReached) return fail('structured-projection-bound');
    for (const row of projected.occurrences) {
      count++;
      if (finite ? count > offset && count <= offset + limit : row.originalDate >= windowStart) rows.push({
        rowId: row.occurrenceId, occurrenceId: row.occurrenceId, seriesId: row.seriesId, sourceItemRef: input.sourceItemRef, originalDate: row.originalDate, occurrenceIndex: count });
    }
    exhausted = rule.end?.mode === 'count' ? count === rule.end.count : rule.end?.mode === 'until' ? end === rule.end.date : false;
    if (finite && (count > offset + limit || exhausted)) { hasMore = count > offset + limit; break; }
    if (!finite && end === windowEnd) break;
    if (day + PROGRAM_MAP_EXECUTION_WINDOW.chunkDays >= PROGRAM_MAP_EXECUTION_WINDOW.maxScanDays) return fail('structured-projection-bound');
  }
  const manifest: PersonalWorkspacePocOccurrenceManifest = { version: 1, sourceItemRef: input.sourceItemRef, seriesId: series.seriesId,
    rule: { version: 1, raw: pinned.recurrence, frequency: rule.frequency, interval: rule.interval,
      ...(rule.weekdays ? { weekdays: rule.weekdays } : {}), ...(rule.dayOfMonth ? { dayOfMonth: rule.dayOfMonth } : {}),
      ...(rule.end ? { end: { ...rule.end, raw: rule.end.mode === 'count' ? `${rule.end.count}회` : rule.end.date } } : {}) },
    mode: finite ? 'finite' : 'open-ended', rows, occurrenceIds: rows.map(r => r.occurrenceId), rowIds: rows.map(r => r.rowId), originalDates: rows.map(r => r.originalDate),
    hasMore, ...(finite ? { finitePage: { offset, limit }, ...(exhausted ? { totalCount: count } : {}) } : { window: { start: windowStart, end: windowEnd, offsetWeeks, weeks } }) };
  return { ok: true as const, manifest, seriesRevisionId: series.revisions[0].revisionId };
}

export function programStructuredOccurrenceOwner(context: ProgramStructuredMapRecurrenceContext): ProgramStructuredOccurrenceOwner {
  return { kind: 'structured-map', version: 1, mapId: context.mapId, sourceRevisionId: context.revisionId,
    seriesRevisionId: context.series.revisions[0].revisionId, ruleBasis: context.ruleBasis };
}
export function validateProgramStructuredOccurrence(identity: ProgramOccurrenceIdentity): boolean {
  const owner = identity.structuredOwner;
  if (!owner || Object.keys(owner).sort().join(',') !== 'kind,mapId,ruleBasis,seriesRevisionId,sourceRevisionId,version'
    || owner.kind !== 'structured-map' || owner.version !== 1 || !['saved-calendar-setting', 'structured-source-rule'].includes(owner.ruleBasis)
    || [owner.mapId, owner.sourceRevisionId, owner.seriesRevisionId].some(id => typeof id !== 'string' || !id.trim() || id.length > 1200)
    || identity.creatorOwner || identity.nativeOwner) return false;
  // COUNT is embedded in the actual RRULE, not in a translated authoring end.
  const resolved = resolveProgramMapSchedule(identity.sourceFlowRef, identity.itemId, identity.sourceRule.startDate, identity.sourceRule.recurrence, identity.sourceRule.recurrenceEnd);
  const expanded = expandProgramStructuredOccurrences(identity, { finiteOffset: Math.min(identity.occurrenceIndex - 1, 10000),
    finiteLimit: Math.max(1, identity.occurrenceIndex - 10000), windowOffsetWeeks: resolved?.series.revisions[0].rule.end ? 0 : Math.floor((Date.parse(identity.originalDate) - Date.parse(identity.sourceRule.startDate)) / 604800000), windowWeeks: 1 });
  return expanded.ok && expanded.seriesRevisionId === owner.seriesRevisionId && expanded.manifest.rows.some(row => row.occurrenceId === identity.occurrenceId
    && row.seriesId === identity.seriesId && row.originalDate === identity.originalDate && row.occurrenceIndex === identity.occurrenceIndex);
}
