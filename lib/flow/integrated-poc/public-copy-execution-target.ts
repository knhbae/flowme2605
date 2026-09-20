import { isValidAuthoringDate } from './native-creator-vendor/text-authoring/recurrence';
import { stableAuthoringJson } from './native-creator-vendor/text-authoring/identity';
import { validateProgramPublicRecurrence, validateProgramPublicRecurringSchedule,
  type ProgramPublicRecurrenceV1, type ProgramPublicRecurringScheduleV1 } from './public-recurrence-contract';
import type { ProgramOccurrenceIdentity } from './recurrence-state-contract';
import type { ProgramRecurrenceWindow } from './recurrence-bridge';

const id = (value: unknown): value is string => typeof value === 'string' && !!value.trim() && value.length <= 1200
  && !/[\u0000-\u001f\u007f]/.test(value) && !['__proto__', 'constructor', 'prototype'].includes(value);
const date = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d\d-\d\d$/.test(value) && isValidAuthoringDate(value);
export type ProgramPublicCopyExecutionTarget = {
  kind: 'execution' | 'return'; copyId: string; flowId: string; itemId: string; startDate: string;
  rule: ProgramPublicRecurrenceV1; occurrenceIndex: number; originalDate: string; occurrenceKey: string;
  window: ProgramRecurrenceWindow; basis?: { versionId: string; schedule: ProgramPublicRecurringScheduleV1 };
};

/** Structural identity validation only. A current owner and the real authoring
 * expander must still prove that this exact occurrence exists before reentry.
 * Output links pin the accepted schedule separately from the stable ordering key. */
export function readProgramPublicCopyExecutionTarget(value: unknown): ProgramPublicCopyExecutionTarget | null {
  try {
    if (typeof value !== 'string' || value.length > 10000) return null;
    const tuple: unknown = JSON.parse(value);
    if (!Array.isArray(tuple) || JSON.stringify(tuple) !== value || tuple[0] !== 'occurrence') return null;
    const returning = tuple[1] === 'public-copy-return/1';
    if (tuple[1] !== 'public-copy-occurrence/1' && !returning || tuple.length !== (returning ? 11 : 9)) return null;
    const [, , copyId, flowId, itemId, startDate, serializedRule, occurrenceIndex, originalDate] = tuple;
    if (![copyId, flowId, itemId].every(id) || !date(startDate) || !date(originalDate) || originalDate < startDate
      || typeof serializedRule !== 'string' || serializedRule.length > 3000
      || !Number.isSafeInteger(occurrenceIndex) || occurrenceIndex < 1 || occurrenceIndex > 10200) return null;
    const rule: unknown = JSON.parse(serializedRule);
    if (!validateProgramPublicRecurrence(rule) || stableAuthoringJson(rule) !== serializedRule
      || rule.end?.mode === 'count' && occurrenceIndex > rule.end.count
      || rule.end?.mode === 'until' && originalDate > rule.end.date) return null;
    const week = Math.floor((Date.parse(originalDate) - Date.parse(startDate)) / 604800000);
    if (!rule.end && week > 519) return null;
    let basis: ProgramPublicCopyExecutionTarget['basis'];
    if (returning) {
      if (!id(tuple[9]) || typeof tuple[10] !== 'string' || tuple[10].length > 5000) return null;
      const schedule: unknown = JSON.parse(tuple[10]);
      if (!validateProgramPublicRecurringSchedule(schedule) || stableAuthoringJson(schedule) !== tuple[10]
        || stableAuthoringJson(schedule.rule) !== serializedRule
        || schedule.start.kind === 'fixed' && schedule.start.date !== startDate) return null;
      basis = { versionId: tuple[9], schedule };
    }
    return { kind: returning ? 'return' : 'execution', copyId, flowId, itemId, startDate, rule, occurrenceIndex, originalDate,
      occurrenceKey: JSON.stringify(['public-copy-occurrence/1', copyId, flowId, itemId, startDate, serializedRule, occurrenceIndex, originalDate]),
      window: rule.end ? { finiteOffset: Math.min(10000, occurrenceIndex - 1), finiteLimit: Math.max(1, occurrenceIndex - 10000) }
        : { windowOffsetWeeks: Math.min(512, week), windowWeeks: Math.max(1, week - 512 + 1) }, ...(basis ? { basis } : {}) };
  } catch { return null; }
}

/** A public-source output link must not silently follow a subsequently accepted
 * schedule version, even if its rule/date and stable occurrence key are unchanged. */
export function programPublicCopyOutputTargetKey(identity: ProgramOccurrenceIdentity): string | null {
  const owner = identity.publicOwner;
  if (!owner) return null;
  const key = JSON.stringify(['occurrence', 'public-copy-return/1', owner.copyId, owner.flowId, owner.itemId,
    identity.sourceRule.startDate, stableAuthoringJson(owner.schedule.rule), identity.occurrenceIndex, identity.originalDate,
    owner.scheduleVersionId, stableAuthoringJson(owner.schedule)]);
  return readProgramPublicCopyExecutionTarget(key) ? key : null;
}
