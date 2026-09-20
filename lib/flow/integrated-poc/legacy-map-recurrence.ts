import type { PersonalWorkspacePocFlow } from '../personal-workspace-poc-contract';
import { resolveSavedRoutineRecurrence } from '../saved-routine-occurrence';
import { generatePersonalStructuralOccurrences } from '../personal-structural-occurrence';
import { isPersonalStructuralPlainDate } from '../personal-structural-schedule';
import type { PersonalStructuralRecurrenceSeries } from '../personal-structural-recurrence';
import type { SourceBackedMyFlowRow } from '../source-backed-my-flow';
import { programLegacyMapRevisionId, validateProgramLegacyMapRevision, type ProgramLegacyMapSourceRevision } from './legacy-map-source';
import { sourceCanonical, validateProgramLegacySourceLifecycle, type ProgramLegacySourceOwner } from './legacy-source-lifecycle-contract';

/** Read-only, replaceable Program adapter. These bounds are not a repeat end,
 * source mutation, authoring grammar extension, or operating storage contract. */
export const PROGRAM_STRUCTURED_MAP_RECURRENCE = Object.freeze({ version: 1 as const, maxRangeDays: 366, maxRuleLength: 1200 });
const fail = (reason: string, itemRef?: string) => ({ ok: false as const, reason, ...(itemRef ? { itemRef } : {}) });
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const weekdays = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
const plainDate = (value: unknown): value is string => typeof value === 'string' && isPersonalStructuralPlainDate(value);
const positive = (value: string, max: number) => /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) <= max;
const addDays = (value: string, count: number) => {
  const date = new Date(`${value}T00:00:00.000Z`); date.setUTCDate(date.getUTCDate() + count);
  const result = Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : '';
  return plainDate(result) ? result : null;
};

/** The existing D1 resolver is intentionally tolerant. At this new boundary,
 * reject every field it would discard/default rather than changing that resolver.
 * No natural-language, title, date-time UNTIL, ordinal BYDAY or WKST inference. */
export function inspectProgramMapRrule(raw: unknown) {
  if (typeof raw !== 'string' || !raw || raw.length > PROGRAM_STRUCTURED_MAP_RECURRENCE.maxRuleLength) return fail('invalid-structured-rule');
  const value = raw.startsWith('RRULE:') ? raw.slice(6) : raw;
  const fields = new Map<string, string>();
  for (const part of value.split(';')) {
    const match = /^([A-Z]+)=([^;=\s]+)$/.exec(part);
    if (!match || fields.has(match[1]) || !['FREQ', 'INTERVAL', 'BYDAY', 'BYMONTHDAY', 'COUNT', 'UNTIL'].includes(match[1])) return fail('unsupported-structured-rule');
    fields.set(match[1], match[2]);
  }
  const frequency = fields.get('FREQ');
  if (!frequency || !['DAILY', 'WEEKLY', 'MONTHLY'].includes(frequency)
    || fields.has('INTERVAL') && !positive(fields.get('INTERVAL')!, 365)
    || fields.has('COUNT') && !positive(fields.get('COUNT')!, 10000)
    || fields.has('COUNT') && fields.has('UNTIL')) return fail('unsupported-structured-rule');
  if (fields.has('BYDAY')) {
    const values = fields.get('BYDAY')!.split(',');
    if (frequency !== 'WEEKLY' || new Set(values).size !== values.length || values.some(day => !weekdays.includes(day))) return fail('unsupported-structured-rule');
  }
  if (fields.has('BYMONTHDAY') && (frequency !== 'MONTHLY' || !positive(fields.get('BYMONTHDAY')!, 31))) return fail('unsupported-structured-rule');
  let endDate: string | undefined;
  if (fields.has('UNTIL')) {
    const match = /^(\d{4})(\d{2})(\d{2})$/.exec(fields.get('UNTIL')!);
    if (!match || !plainDate(`${match[1]}-${match[2]}-${match[3]}`)) return fail('unsupported-structured-rule');
    endDate = `${match[1]}-${match[2]}-${match[3]}`;
  }
  return { ok: true as const, raw, frequency, endDate, count: fields.has('COUNT') ? Number(fields.get('COUNT')) : undefined };
}

/** This is a structured Step context. Deliberately no fabricated sourceLine,
 * authoring document, raw TXT or Creator/public version identity. */
export type ProgramStructuredMapRecurrenceContext = {
  version: 1; kind: 'structured-map-recurrence'; mapId: string; revisionId: string;
  flowRef: string; savedCopyId: string; flowId: string; itemId: string; itemRef: string;
  sourceCalendar: SourceBackedMyFlowRow['calendar']; sourceRepeatRule: string;
  startDate: string; endDate: string | null; identityNamespace: string;
  /** A schedule-user-choice tag is retained evidence, not an inferred medical prescription. */
  ruleBasis: 'saved-calendar-setting' | 'structured-source-rule';
  dateBasis: 'saved-flow-anchor'; sourceTitle: string | null; sourceUrl: string | null;
  conversionNote: string | null; warning: string | null;
  series: PersonalStructuralRecurrenceSeries;
};

/** Reproduce a pinned saved schedule without trusting caller-supplied IDs. */
export function resolveProgramMapSchedule(flowRef: string, itemId: string, startDate: string, sourceRepeatRule: string, endDate: string | null) {
  const rule = inspectProgramMapRrule(sourceRepeatRule);
  if (!rule.ok || !plainDate(startDate) || endDate !== null && (!plainDate(endDate) || endDate < startDate)
    || endDate && (rule.count !== undefined || rule.endDate && rule.endDate !== endDate)) return null;
  const definition = { itemId, startDate, sourceRepeatRule, ...(endDate ? { endDate } : {}) };
  const resolved = resolveSavedRoutineRecurrence(definition, flowRef);
  if (!resolved.series || resolved.warnings.length) return null;
  const normalized = resolved.series.revisions[0].rule;
  const scheduleIdentity = sourceCanonical({ startDate, rule: { ...normalized,
    ...(normalized.weekdays ? { weekdays: weekdays.filter(day => normalized.weekdays!.includes(day as typeof normalized.weekdays[number])) } : {}) } });
  const identityNamespace = `program-structured-map:v1:${flowRef}:${scheduleIdentity}`;
  const series = resolveSavedRoutineRecurrence(definition, identityNamespace).series!;
  return { identityNamespace, series };
}

export function readProgramMapRevisionRecurrences(revision: ProgramLegacyMapSourceRevision, original: PersonalWorkspacePocFlow) {
  if (!validateProgramLegacyMapRevision(revision, original)) return fail('invalid-structured-evidence');
  const contexts = new Map<string, ProgramStructuredMapRecurrenceContext>();
  if (revision.kind === 'saved-map-projection') return { ok: true as const, contexts, evidence: 'saved-projection-only' as const };
  const child = revision.persistence.childFlows.find(row => row.flowId === revision.flow.flowId && row.slug === revision.flow.sourceSlug);
  const bundles = revision.bundles.filter(bundle => bundle.flow.id === revision.flow.flowId && bundle.flow.slug === revision.flow.sourceSlug);
  if (!child || bundles.length !== 1) return fail('ambiguous-structured-child');
  const bundle = bundles[0], revisionId = programLegacyMapRevisionId(revision);
  for (const step of child.steps) {
    if (step.calendar.mode !== 'routine' && !step.calendar.repeatRule) continue;
    const item = revision.flow.items.find(row => row.itemId === step.stepId);
    if (!item) return fail('missing-structured-item');
    const sourceItems = bundle.items.filter(row => row.id === step.stepId), calendar = step.calendar;
    if (sourceItems.length !== 1 || Object.keys(calendar).some(key => !['mode', 'anchorType', 'allDay', 'repeatRule'].includes(key))
      || calendar.mode !== 'routine' || calendar.allDay !== true || calendar.anchorType !== 'start_date'
      || calendar.dayOffset !== undefined || calendar.window !== undefined || !calendar.repeatRule || sourceItems[0].repeat_rule !== calendar.repeatRule
      || bundle.flow.structure_type !== 'routine') return fail('unsupported-structured-schedule', item.ref);
    const rule = inspectProgramMapRrule(calendar.repeatRule);
    if (!rule.ok) return fail(rule.reason, item.ref);
    const startDate = revision.flow.anchorDate;
    if (!plainDate(startDate)) return fail('structured-start-required', item.ref);
    const duration = bundle.flow.routine_duration_days;
    // Preserve the existing D1 source-duration end. Never substitute the view
    // window, nor silently discard a different explicit rule end.
    if (duration !== undefined && (!Number.isSafeInteger(duration) || duration < 1)) return fail('invalid-structured-duration', item.ref);
    const durationEnd = duration === undefined ? null : addDays(startDate, duration - 1);
    if (duration !== undefined && !durationEnd || durationEnd && (rule.count !== undefined || rule.endDate && rule.endDate !== durationEnd)) return fail('conflicting-structured-end', item.ref);
    const endDate = durationEnd ?? rule.endDate ?? null;
    if (endDate && endDate < startDate) return fail('structured-end-before-start', item.ref);
    // Snapshot/title metadata is provenance, not a new execution. Exact schedule
    // semantics distinguish changed rules; the full tuple avoids hash collisions.
    const resolved = resolveProgramMapSchedule(revision.flow.ref, item.itemId, startDate, rule.raw, endDate);
    if (!resolved) return fail('unresolved-structured-rule', item.ref);
    const { identityNamespace, series } = resolved;
    contexts.set(item.ref, { version: 1, kind: 'structured-map-recurrence', mapId: revision.snapshot.mapId, revisionId,
      flowRef: revision.flow.ref, savedCopyId: item.savedCopyId, flowId: item.flowId, itemId: item.itemId, itemRef: item.ref,
      sourceCalendar: clone(calendar), sourceRepeatRule: rule.raw, startDate, endDate, identityNamespace,
      ruleBasis: bundle.flow.tags?.includes('schedule-user-choice') ? 'saved-calendar-setting' : 'structured-source-rule',
      dateBasis: 'saved-flow-anchor', sourceTitle: child.sourceTitle ?? null, sourceUrl: step.sourceUrl ?? child.sourceUrl ?? null,
      conversionNote: bundle.flow.conversion_note ?? null, warning: bundle.flow.warning ?? null, series });
  }
  return { ok: true as const, contexts, evidence: 'structured-source' as const };
}

/** Read only the exact per-item source revisions the user already selected.
 * Availability does not authorize converting an existing ordinary task/history
 * into a series. That handoff must be an explicit Program transaction. */
export function readProgramSelectedMapRecurrences(owner: ProgramLegacySourceOwner, original: PersonalWorkspacePocFlow) {
  if (!owner?.structured || !original || !validateProgramLegacySourceLifecycle({ version: 1, owners: { [original.ref]: owner } }, [original])) return fail('invalid-structured-owner');
  const contexts = new Map<string, ProgramStructuredMapRecurrenceContext>();
  const reads = new Map<string, ReturnType<typeof readProgramMapRevisionRecurrences>>();
  for (const [ref, revisionId] of Object.entries(owner.effective.itemRevisions)) {
    let read = reads.get(revisionId);
    if (!read) { read = readProgramMapRevisionRecurrences(owner.structured.revisions[revisionId], original); reads.set(revisionId, read); }
    if (!read.ok) return read;
    const context = read.contexts.get(ref);
    if (context && !owner.effective.retainedItemRefs.includes(ref)) contexts.set(ref, context);
  }
  return { ok: true as const, contexts };
}

/** Pure bounded D1 expansion. The caller supplies authenticated selected
 * evidence, not a caller-crafted recurrence context. No clock or writer. */
export function projectProgramSelectedMapRecurrences(owner: ProgramLegacySourceOwner, original: PersonalWorkspacePocFlow, range: { start: string; end: string }) {
  if (!range || Object.keys(range).sort().join(',') !== 'end,start' || !plainDate(range.start) || !plainDate(range.end) || range.end < range.start
    || (Date.parse(range.end) - Date.parse(range.start)) / 86400000 >= PROGRAM_STRUCTURED_MAP_RECURRENCE.maxRangeDays) return fail('invalid-structured-window');
  const read = readProgramSelectedMapRecurrences(owner, original);
  if (!read.ok) return read;
  const projections = [...read.contexts.values()].map(context => ({ context, projection: generatePersonalStructuralOccurrences({
    identityNamespace: context.identityNamespace, itemId: context.itemId,
    schedule: { mode: 'fixed_date', date: context.startDate, repeat: context.series }, range,
    maxOccurrences: PROGRAM_STRUCTURED_MAP_RECURRENCE.maxRangeDays + 1, fallbackTimestamp: context.series.updatedAt }) }));
  if (projections.some(row => row.projection.warnings.length || row.projection.generationLimitReached)) return fail('structured-projection-limit-or-warning');
  return { ok: true as const, projections, bounded: true as const, writes: 0 as const };
}
