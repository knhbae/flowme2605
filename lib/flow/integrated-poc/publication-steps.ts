import type { ProgramPublicationDraft, ProgramPublicationDraftRow } from './contract';
import { applyProgramPublicationAnchor, planProgramPublicationAnchor, restoreProgramPublicationAnchor, type ProgramAnchorUndo } from './publication-anchor';
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
export function applyProgramPublicationStepDates(draft: ProgramPublicationDraft, dates: ReadonlyMap<string, string>, mode: ProgramPublicationDateMode, undo: ProgramAnchorUndo | null, manuallySet: ReadonlySet<string> = new Set()) {
  const managedUndo = undo ? { ...undo, rows: Object.fromEntries(Object.entries(undo.rows).filter(([id]) => !manuallySet.has(id))) } : null;
  const base = managedUndo ? restoreProgramPublicationAnchor(draft, managedUndo).draft : draft;
  const eligibleDates = new Map(dates);
  for (const row of draft.rows) if (row.rowId && manuallySet.has(row.itemId)) eligibleDates.delete(row.rowId);
  const plan = planProgramPublicationAnchor(base, eligibleDates, mode === 'last' ? 'last' : 'first');
  if (mode === 'none') return { draft: base, undo: null, plan };
  const applied = applyProgramPublicationAnchor(base, plan, programPublicationSummaryParts(draft.summary).name);
  return { ...applied, plan };
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
