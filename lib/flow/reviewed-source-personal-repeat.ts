import { getMyFlowDateOverrideKey, MY_FLOW_DATE_REMOVED_OVERRIDE, type StoredMyFlowItemDraft } from './my-flow-personal-state';
import { getPersonalDraftProjectionValueKey } from './personal-draft-projection-state';
import type { SavedRoutineRecurrenceDefinition } from './saved-routine-occurrence';
type PersonalRepeatChoice = Pick<SavedRoutineRecurrenceDefinition, 'repeatPreset' | 'startDate' | 'time' | 'durationMinutes'>;

/** Reader-only choices for an exact reviewed source. The effective row retains
 * the original storage owner key even when its personal date has changed. */
export function getReviewedSourcePersonalRepeats(options: {
  flowSlug: string;
  rows: readonly { id: string; date?: string; effectiveDateOverrideKey?: string }[];
  drafts: Record<string, StoredMyFlowItemDraft>;
  dateOverrides: Record<string, string>;
}): Record<string, PersonalRepeatChoice> {
  return Object.fromEntries(options.rows.flatMap<[string, PersonalRepeatChoice]>(row => {
    const key = row.effectiveDateOverrideKey ?? getMyFlowDateOverrideKey(options.flowSlug, row.id, row.date);
    const draft = { ...(options.drafts[getPersonalDraftProjectionValueKey(options.flowSlug, row.id)] ?? {}),
      ...(options.drafts[key] ?? {}) };
    const date = options.dateOverrides[key] ?? row.date;
    // An undated/explicitly cleared item must not borrow another item's anchor.
    if (!date || date === MY_FLOW_DATE_REMOVED_OVERRIDE) return [[row.id, { startDate: '', repeatPreset: 'none' }]];
    if (!['repeatPreset', 'time', 'durationMinutes'].some(field => Object.hasOwn(draft, field))) return [];
    return [[row.id, { startDate: date, repeatPreset: draft.repeatPreset === '' ? 'none' : draft.repeatPreset,
      time: draft.time, durationMinutes: draft.durationMinutes }]];
  }));
}
