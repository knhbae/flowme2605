import type { ProgramPublicationDraft, ProgramPublicationDraftRow } from './contract';
import { applyProgramPublicationAnchor, planProgramPublicationAnchor, programAnchorChip, programPublicationRowDates, restoreProgramPublicationAnchor, type ProgramAnchorUndo } from './publication-anchor';
import { programDaysBetween } from './date-label';
import { programDate } from './program-data';
import { programShiftDate } from './execution';
import { captureProgramPublicationInput, programPublicationNativeValue, type ProgramPublicationNativeValue } from './publication-editor';
import type { TextRow, TextWorkspaceState } from './text-workspace';
import { programRecurringScheduleFromDraft } from './public-recurrence-contract';
import { readProgramRepeatMarker } from './repeat-line';
import { PROGRAM_PICK_MONTHS } from './public-repeat-import';

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
  // Enter 우선 3 (11/10, PRD 14-4): '한 줄 소개' is one line — a break that came in (a phone keyboard, a paste) is a
  // space once the field is changed; a summary nobody changed keeps its lines.
  const typed = values.find(value => !value.itemId && value.field === 'summary')?.value;
  const body = typed !== undefined && typed !== parts.body ? typed.replace(/[^\S\n]*\r?\n[^\S\n]*/g, ' ') : parts.body;
  const next = captureProgramPublicationInput(draft, values.filter(value => value.itemId || !['summary', 'anchorName'].includes(value.field)));
  const summary = name === parts.name && body === parts.body ? draft.summary : composeProgramPublicationSummary(name, body);
  return summary === next.summary ? next : { ...next, summary };
}
export function programPublicationStepNativeValue(draft: ProgramPublicationDraft, field: string, itemId?: string) {
  if (!itemId && field === 'anchorName') return programPublicationSummaryParts(draft.summary).name;
  if (!itemId && field === 'summary') return programPublicationSummaryParts(draft.summary).body;
  return programPublicationNativeValue(draft, field, itemId);
}

/** Keep the saved source dates in memory even after acknowledging a source edit.
 * No provenance field is added to the stored draft or public version. */
export function programPublicationSavedSourceDates(draft: ProgramPublicationDraft, text: TextWorkspaceState) {
  try {
    const document = JSON.parse(draft.sourceDocumentFingerprint);
    if (document?.id !== draft.documentId || !Array.isArray(document.lines)) return new Map<string, string>();
    if (![...text.documents, ...text.flows].some(current => current.id === document.id)) return new Map<string, string>();
    // rowMeta validates workspace-wide bindings and scope sidecars first. Keep
    // every other owner, replacing only this document's saved source snapshot.
    return programPublicationRowDates({ ...text,
      documents: text.documents.map(current => current.id === document.id ? document : current),
      flows: text.flows.map(current => current.id === document.id ? document : current),
    }, draft.documentId);
  } catch { return new Map<string, string>(); }
}

/** Next preserves the anchor implied by saved relative schedules. Only an
 * explicit date-mode choice rebases them; stored undated and manual choices stay. */
export function applyProgramPublicationStepDates(draft: ProgramPublicationDraft, dates: ReadonlyMap<string, string>, mode: ProgramPublicationDateMode, undo: ProgramAnchorUndo | null, manuallySet: ReadonlySet<string> = new Set(), savedSchedules: ReadonlySet<string> = new Set(), explicitMode = false, savedSourceDates: ReadonlyMap<string, string> = dates) {
  const managedUndo = undo ? { ...undo, rows: Object.fromEntries(Object.entries(undo.rows).filter(([id]) => !manuallySet.has(id))) } : null;
  const base = managedUndo ? restoreProgramPublicationAnchor(draft, managedUndo).draft : draft;
  const eligibleDates = new Map(dates);
  for (const row of draft.rows) if (row.rowId && manuallySet.has(row.itemId) && !savedSchedules.has(row.itemId)) eligibleDates.delete(row.rowId);
  for (const row of base.rows) if (row.rowId && savedSchedules.has(row.itemId) && row.scheduleKind === 'undated') eligibleDates.delete(row.rowId);
  const savedRelative = base.rows.filter(row => row.selected && savedSchedules.has(row.itemId) && row.scheduleKind === 'relative'
    && !readProgramRepeatMarker(row.title.trim()) && !PROGRAM_PICK_MONTHS.test(row.title.trim()));
  const sourceMissing = savedRelative.some(row => row.origin !== 'task' || !row.rowId || !programDate(eligibleDates.get(row.rowId)));
  const inferred = savedRelative.map(row => {
    const date = row.rowId ? savedSourceDates.get(row.rowId) : undefined, days = Number(row.scheduleValue);
    return programDate(date) && /^[+-]?\d+$/.test(row.scheduleValue) && Number.isSafeInteger(days) && Math.abs(days) <= 36600
      && date === dates.get(row.rowId!) ? programShiftDate(date, -days) : '';
  });
  const anchorUncertain = sourceMissing || inferred.some(anchor => !anchor) || new Set(inferred).size > 1;
  // With a missing source date even an explicit first/last choice cannot safely
  // rebase only part of a saved relative group. Removing dates needs no inference.
  const canRebase = explicitMode && (mode === 'none' || !sourceMissing);
  const rebaseIds = new Set(canRebase ? savedRelative.map(row => row.itemId) : []);
  const candidate = rebaseIds.size ? { ...base, rows: base.rows.map(row => rebaseIds.has(row.itemId) ? { ...row, scheduleKind: 'undated' as const, scheduleValue: '' } : row) } : base;
  const plan = planProgramPublicationAnchor(candidate, eligibleDates, mode === 'last' ? 'last' : 'first');
  if (mode === 'none') return { draft: candidate, undo: null, plan, issue: null, releasedSchedules: [...rebaseIds] };
  if ((plan.rows.length || explicitMode) && savedRelative.length && (explicitMode ? sourceMissing : anchorUncertain)) {
    plan.anchor = null; plan.rows = [];
    return { draft: base, undo: null, plan, issue: '저장한 일정의 기준일을 확인할 수 없어 새로 고른 할 일은 날짜 미정으로 둡니다.', releasedSchedules: [] };
  }
  if (!explicitMode && inferred.length && plan.rows.length) {
    plan.anchor = inferred[0];
    plan.rows = plan.rows.map(row => ({ ...row, days: programDaysBetween(inferred[0], row.date) }));
  }
  const applied = applyProgramPublicationAnchor(candidate, plan, programPublicationSummaryParts(draft.summary).name);
  return { ...applied, plan, issue: null, releasedSchedules: [...rebaseIds] };
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
