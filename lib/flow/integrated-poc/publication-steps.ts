import type { ProgramPublicationDraft, ProgramPublicationDraftRow } from './contract';
import { applyProgramPublicationAnchor, planProgramPublicationAnchor, programAnchorChip, restoreProgramPublicationAnchor, type ProgramAnchorUndo } from './publication-anchor';
import { programDaysBetween } from './date-label';
import { captureProgramPublicationInput, programPublicationNativeValue, type ProgramPublicationNativeValue } from './publication-editor';
import type { TextRow } from './text-workspace';
import { programRecurringScheduleFromDraft } from './public-recurrence-contract';

export type ProgramPublicationStep = 'pick' | 'refine' | 'preview';
export type ProgramPublicationDateMode = 'first' | 'last' | 'none';
export function programPublicationSummaryParts(summary: string) {
  const lines = summary.split('\n'), match = /^기준일: (.*)$/.exec(lines[0] ?? '');
  return { name: match?.[1] ?? '', body: match ? lines.slice(1).join('\n') : summary };
}
/** body is already decoded; never parse its first line as metadata again. */
export function composeProgramPublicationSummary(name: string, body: string) {
  return name ? `기준일: ${name}${body ? `\n${body}` : ''}` : body;
}

/** The visible summary omits its existing metadata line. Capture the native IME
 * values together, so closing, recovery and conflict checks retain both parts. */
export function captureProgramPublicationStepInput(draft: ProgramPublicationDraft, values: ProgramPublicationNativeValue[]) {
  const parts = programPublicationSummaryParts(draft.summary);
  const name = values.find(value => !value.itemId && value.field === 'anchorName')?.value ?? parts.name;
  const body = values.find(value => !value.itemId && value.field === 'summary')?.value ?? parts.body;
  const next = captureProgramPublicationInput(draft, values.filter(value => value.itemId || !['summary', 'anchorName'].includes(value.field)));
  const summary = name === parts.name && body === parts.body ? draft.summary : composeProgramPublicationSummary(name, body);
  return summary === next.summary ? next : { ...next, summary };
}
export function programPublicationStepNativeValue(draft: ProgramPublicationDraft, field: string, itemId?: string) {
  if (!itemId && field === 'anchorName') return programPublicationSummaryParts(draft.summary).name;
  if (!itemId && field === 'summary') return programPublicationSummaryParts(draft.summary).body;
  return programPublicationNativeValue(draft, field, itemId);
}

/** Only changes this session's automatic conversions or still-undated source
 * tasks. Explicit schedules and reopened draft schedules retain their meaning. */
export function applyProgramPublicationStepDates(draft: ProgramPublicationDraft, dates: ReadonlyMap<string, string>, mode: ProgramPublicationDateMode, undo: ProgramAnchorUndo | null, manuallySet: ReadonlySet<string> = new Set(), savedSchedules: ReadonlySet<string> = new Set()) {
  const managedUndo = undo ? { ...undo, rows: Object.fromEntries(Object.entries(undo.rows).filter(([id]) => !manuallySet.has(id))) } : null;
  const base = managedUndo ? restoreProgramPublicationAnchor(draft, managedUndo).draft : draft;
  const eligibleDates = new Map(dates);
  for (const row of draft.rows) if (row.rowId && manuallySet.has(row.itemId) && !savedSchedules.has(row.itemId)) eligibleDates.delete(row.rowId);
  // A saved undated choice stays undated. Saved relative rows keep their values,
  // but their source dates still take part in the first/last-day reference for
  // newly selected tasks. Do not infer or rewrite their conversion provenance.
  for (const row of base.rows) if (row.rowId && savedSchedules.has(row.itemId) && row.scheduleKind === 'undated') eligibleDates.delete(row.rowId);
  const plan = planProgramPublicationAnchor(base, eligibleDates, mode === 'last' ? 'last' : 'first');
  const reference = planProgramPublicationAnchor({ ...base, rows: base.rows.map(row => savedSchedules.has(row.itemId) && row.scheduleKind === 'relative' ? { ...row, scheduleKind: 'undated' as const } : row) }, eligibleDates, mode === 'last' ? 'last' : 'first');
  if (reference.anchor && plan.rows.length) {
    plan.anchor = reference.anchor;
    plan.rows = plan.rows.map(row => ({ ...row, days: programDaysBetween(reference.anchor!, row.date) }));
  }
  if (mode === 'none') return { draft: base, undo: null, plan };
  const applied = applyProgramPublicationAnchor(base, plan, programPublicationSummaryParts(draft.summary).name);
  return { ...applied, plan };
}

/** No persisted provenance is added: previously selected schedules are kept,
 * while an unselected saved row is a new choice when the author selects it. */
export function programPublicationSavedSchedules(rows: readonly ProgramPublicationDraftRow[]) {
  return new Set(rows.filter(row => row.selected).map(row => row.itemId));
}

export function programPublicationDateExample(draft: ProgramPublicationDraft) {
  const selected = draft.rows.filter(row => row.selected);
  const relative = selected.filter(row => row.scheduleKind === 'relative' && /^[+-]?\d+$/.test(row.scheduleValue));
  const row = relative.find(row => Number(row.scheduleValue) !== 0) ?? relative[0];
  return row ? {
    text: programAnchorChip(programPublicationSummaryParts(draft.summary).name, Number(row.scheduleValue)),
    allZero: relative.length === selected.length && relative.every(item => Number(item.scheduleValue) === 0),
  } : null;
}

export function programPublicationPickGroups(rows: ProgramPublicationDraftRow[], original: TextRow[]) {
  const groups = new Map<string, { key: string; date: string | null; rows: ProgramPublicationDraftRow[] }>();
  const meta = new Map(original.map(row => [row.id, row]));
  for (const row of rows) {
    const source = row.rowId ? meta.get(row.rowId) : undefined;
    const key = row.origin === 'previous-public' ? 'previous-public' : source?.dateLineId ?? 'undated';
    if (!groups.has(key)) groups.set(key, { key, date: source?.groupDate ?? null, rows: [] });
    groups.get(key)!.rows.push(row);
  }
  return [...groups.values()];
}

export function programPublicationExposure(draft: ProgramPublicationDraft) {
  const selected = draft.rows.filter(row => row.selected);
  return { fixed: selected.filter(row => {
    if (row.scheduleKind === 'fixed') return true;
    const schedule = row.scheduleKind === 'recurring' && row.recurrence ? programRecurringScheduleFromDraft(row.recurrence) : null;
    return !!schedule && (schedule.start.kind === 'fixed' || schedule.rule.end?.mode === 'until');
  }), notes: selected.filter(row => row.origin === 'note').length };
}
