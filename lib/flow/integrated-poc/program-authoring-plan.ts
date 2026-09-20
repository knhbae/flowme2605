import type { DateMovementOccurrenceTarget, DateMovementState } from '../date-movement';
import { appendPersonalStructuralRecurrenceRevision, buildPersonalStructuralOccurrenceId, setPersonalStructuralOccurrenceOverride,
  type PersonalStructuralRecurrenceRule } from '../personal-structural-recurrence';
import type { PersonalStructuralOccurrenceProjectionResult } from '../personal-structural-occurrence';
import { buildPersonalStructuralScheduleProjection } from '../personal-structural-schedule';
import { projectAuthoringRecurrenceDates } from './native-creator-vendor/text-authoring/recurrence';
import { programPublicRecurrenceFromAuthoring, programPublicRecurrenceToAuthoring } from './public-recurrence-contract';

/** Program-only resource bounds, not a recurrence end or a source-schema migration.
 * The common personal revision/target shape is reused; dates use authoring-v1, never D1 RRULE. */
export const PROGRAM_AUTHORING_PLAN_WINDOW_V1 = Object.freeze({ maxDays: 100000, maxCandidates: 10200, maxRows: 1000 });
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const day = (date: string) => Date.parse(`${date}T00:00:00Z`) / 86400000;
function add(date: string, days: number): string | null {
  try { const value = new Date((day(date) + days) * 86400000).toISOString().slice(0, 10); return /^\d{4}-\d\d-\d\d$/.test(value) ? value : null; } catch { return null; }
}
function seriesOf(state: DateMovementState) {
  const schedule = state.items[0]?.schedule;
  return schedule?.mode === 'fixed_date' && schedule.repeat && 'revisions' in schedule.repeat ? schedule.repeat : null;
}
function publicRuleOf(rule: PersonalStructuralRecurrenceRule) {
  return programPublicRecurrenceFromAuthoring({ ...rule, end: rule.end ? { ...rule.end,
    raw: rule.end.mode === 'count' ? `${rule.end.count}회` : rule.end.date } : undefined });
}

/** Pure query of replayed private revisions. A temporary UNTIL bounds the genuine date
 * generator; the stored COUNT/UNTIL, rule, source identity and personal state never change. */
export function projectProgramAuthoringPlan(state: DateMovementState, range: { start: string; end: string }): PersonalStructuralOccurrenceProjectionResult {
  const series = seriesOf(state), item = state.items[0], records = state.occurrenceExecutionRecords ?? [];
  const result: PersonalStructuralOccurrenceProjectionResult = { ...(series ? { series } : {}), occurrences: [], projectedOccurrences: [], executionRecords: clone(records), warnings: [], generationLimitReached: false };
  if (!series || !item || range.start > range.end) { result.warnings.push('invalid-authoring-plan'); return result; }
  const bound = PROGRAM_AUTHORING_PLAN_WINDOW_V1;
  let end = range.end;
  for (const override of series.occurrenceOverrides) {
    const date = /:occurrence:(\d{4}-\d\d-\d\d)T/.exec(override.occurrenceId)?.[1];
    if (date && date > end) end = date;
  }
  const revisions = [...series.revisions].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  const overrides = new Map(series.occurrenceOverrides.map(value => [value.occurrenceId, value]));
  const executions = new Map(records.map(value => [value.occurrenceId, value]));
  for (let i = 0; i < revisions.length; i++) {
    const revision = revisions[i], publicRule = publicRuleOf(revision.rule);
    const rule = publicRule && programPublicRecurrenceToAuthoring(publicRule);
    if (!rule) { result.warnings.push('invalid-authoring-rule'); result.generationLimitReached = true; continue; }
    let until = end;
    if (revisions[i + 1]) until = [until, add(revisions[i + 1].effectiveFrom, -1)!].sort()[0];
    if (rule.end?.mode === 'until') until = [until, rule.end.date].sort()[0];
    if (until < revision.effectiveFrom) continue;
    const resourceEnd = add(revision.effectiveFrom, bound.maxDays) ?? '9999-12-31';
    const queryEnd = until < resourceEnd ? until : resourceEnd;
    const count = rule.end?.mode === 'count' ? rule.end.count : Infinity;
    try {
      const query = projectAuthoringRecurrenceDates({ itemId: item.itemId, startDate: revision.effectiveFrom,
        rule: { ...rule, end: { mode: 'until', date: queryEnd, raw: queryEnd } }, limit: Math.min(count, bound.maxCandidates + 1) });
      if (query.occurrences.length > bound.maxCandidates || until > resourceEnd && (query.totalCount ?? 0) < count) result.generationLimitReached = true;
      for (const occurrence of query.occurrences.slice(0, Math.min(count, bound.maxCandidates))) {
        const template = revision.scheduleTemplate ?? {}, originalDate = occurrence.date;
        const occurrenceId = buildPersonalStructuralOccurrenceId({ revisionId: revision.revisionId, scheduledDate: originalDate, startTime: template.time });
        const override = overrides.get(occurrenceId), effective = override?.mode === 'reschedule' && override.schedule ? override.schedule : { date: originalDate, ...template };
        if (effective.date < range.start || effective.date > range.end) continue;
        const scheduleProjection = buildPersonalStructuralScheduleProjection({ schedule: { mode: 'fixed_date', ...effective }, identityNamespace: state.identityNamespace, itemId: item.itemId });
        // A date-only source can still carry an explicit author timezone. Preserve it as context.
        if (!effective.time && effective.timeZone) scheduleProjection.timeZone = effective.timeZone;
        const eligible = override?.mode !== 'exclude';
        result.occurrences.push({ itemId: item.itemId, seriesId: series.seriesId, revisionId: revision.revisionId, occurrenceId,
          originalDate, localDate: effective.date, scheduleProjection, personalOrderRank: 0,
          executionState: executions.get(occurrenceId)?.state ?? 'pending',
          projectionEligibility: { calendarScreen: eligible, calendarIcs: eligible }, occurrenceOverrideApplied: !!override,
          validationWarnings: scheduleProjection.validationWarnings });
      }
    } catch { result.warnings.push('authoring-date-out-of-range'); result.generationLimitReached = true; }
  }
  result.occurrences.sort((a, b) => a.localDate.localeCompare(b.localDate) || a.occurrenceId.localeCompare(b.occurrenceId));
  if (result.occurrences.length > bound.maxRows) { result.occurrences.length = bound.maxRows; result.generationLimitReached = true; }
  result.projectedOccurrences = result.occurrences.filter(row => row.projectionEligibility.calendarScreen);
  if (result.generationLimitReached) result.warnings.push('authoring-plan-query-limit');
  return result;
}

/** Same approved personal movement policy as D1, but no D1 normalization/date expansion.
 * COUNT belongs to the new revision; UNTIL and weekdays shift, monthly uses the selected day.
 * Future/backward policy, exact target and retained-history checks are enforced by the caller. */
export function moveProgramAuthoringPlan(state: DateMovementState, input: {
  scope: 'whole_series' | 'future_series'; target: DateMovementOccurrenceTarget; targetDate: string; at: string;
}): { ok: true; state: DateMovementState } | { ok: false; reason: string } {
  const series = seriesOf(state);
  if (!series) return { ok: false, reason: 'invalid-private-series' };
  const history = (state.occurrenceExecutionRecords?.length ?? 0) > 0;
  if ((input.scope === 'future_series' || history) && input.targetDate < input.target.currentDate) return { ok: false, reason: 'backward_series_shift_requires_explicit_cutover_policy' };
  const revision = [...series.revisions].filter(row => row.effectiveFrom <= input.target.originalDate).sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom)).at(-1);
  if (!revision) return { ok: false, reason: 'active_recurrence_revision_not_found' };
  const delta = day(input.targetDate) - day(input.target.currentDate), rule: PersonalStructuralRecurrenceRule = clone(revision.rule);
  const weekdays = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const;
  if (rule.frequency === 'weekly') rule.weekdays = rule.weekdays!.map(value => weekdays[(weekdays.indexOf(value) + delta % 7 + 7) % 7]).sort((a, b) => weekdays.indexOf(a) - weekdays.indexOf(b));
  if (rule.frequency === 'monthly') rule.dayOfMonth = Number(input.targetDate.slice(8, 10));
  if (rule.end?.mode === 'until') {
    const date = add(rule.end.date, delta); if (!date) return { ok: false, reason: 'authoring-date-out-of-range' }; rule.end.date = date;
  }
  if (!publicRuleOf(rule)) return { ok: false, reason: 'invalid-authoring-rule' };
  let prior = clone(series);
  if (input.targetDate > input.target.currentDate && (input.scope === 'future_series' || history)) {
    const end = add(input.targetDate, -1)!;
    const gap = projectProgramAuthoringPlan(state, { start: input.target.currentDate, end });
    // Never apply only the first page of exclusions and call the plan complete.
    if (gap.generationLimitReached || gap.warnings.length) return { ok: false, reason: 'authoring-plan-gap-limit' };
    for (const row of gap.occurrences) prior = setPersonalStructuralOccurrenceOverride({ series: prior,
      override: { occurrenceId: row.occurrenceId, mode: 'exclude', updatedAt: input.at } });
  }
  const next = clone(state), schedule = next.items[0].schedule!;
  if (schedule.mode !== 'fixed_date') return { ok: false, reason: 'invalid-private-series' };
  schedule.repeat = appendPersonalStructuralRecurrenceRevision({ series: prior, scope: input.scope === 'future_series' ? 'future' : 'all',
    effectiveFrom: input.targetDate, rule, scheduleTemplate: clone(revision.scheduleTemplate ?? {}), updatedAt: input.at,
    executionRecordCount: state.occurrenceExecutionRecords?.length ?? 0 });
  if (input.scope === 'whole_series' && !history) { schedule.date = input.targetDate; next.items[0].effectiveDate = input.targetDate; }
  return { ok: true, state: next };
}
