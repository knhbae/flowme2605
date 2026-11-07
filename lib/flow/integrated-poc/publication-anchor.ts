import type { ProgramPublicationDraft, ProgramPublicationDraftRow, ProgramPublicItem, ProgramPublicVersion } from './contract';
import { programImportPreview, type ProgramImportPreview } from './import-preview';
import { PROGRAM_PICK_MONTHS, programImportRepeatChoice, programImportRepeats } from './public-repeat-import';
import { programDate } from './program-data';
import { programDaysBetween } from './date-label';
import { readProgramRepeatMarker } from './repeat-line';
import { textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';

/** Flow pipeline stage 2 (S7, 11/8): '날짜를 기준일 기준으로'. A draft made from a document starts every row as 날짜 미정;
 *  this turns the chosen rows' own dates into days from one 기준일 — the first day (+n, '그날부터') or the last day (−n,
 *  '그날까지') — so the published Flow carries no private date and lands on the taker's own day. Only rows still 미정 that
 *  have a date in the document change; a schedule set by hand, a repeat (a series, or a line with a repeat marker that
 *  goes in as a repeat line) and a row without a date stay as they are. It writes the existing relative schedule only. */
export type ProgramAnchorMode = 'first' | 'last';
export type ProgramAnchorPlan = {
  mode: ProgramAnchorMode;
  /** The 기준일 in the writer's own document (the first or the last date of the rows that change). */
  anchor: string | null;
  rows: { itemId: string; date: string; days: number }[];
  /** Left as they are: a schedule set by hand, a repeat, a row with no date in the document. */
  handSet: number; repeats: number; undated: number;
  /** Every changing row is on one day: they all become '당일'. */
  single: boolean;
};
export type ProgramAnchorUndo = { rows: Record<string, { from: Pick<ProgramPublicationDraftRow, 'scheduleKind' | 'scheduleValue'>; to: string }>; summary: { from: string; to: string } | null };

/** Each task row's date in the document as it reads (its own `날짜:` or its day's head line). */
export function programPublicationRowDates(text: TextWorkspaceState, documentId: string): Map<string, string> {
  const dates = new Map<string, string>();
  for (const row of M.rowMeta(text, documentId)) {
    if (row.kind !== 'task') continue;
    const date = row.date === undefined ? row.groupDate : row.date;
    if (date && programDate(date)) dates.set(row.id, date);
  }
  return dates;
}
const repeatTitle = (title: string) => !!readProgramRepeatMarker(title.trim()) || PROGRAM_PICK_MONTHS.test(title.trim());

export function planProgramPublicationAnchor(draft: ProgramPublicationDraft, dates: ReadonlyMap<string, string>, mode: ProgramAnchorMode): ProgramAnchorPlan {
  const changing: { itemId: string; date: string }[] = [];
  let handSet = 0, repeats = 0, undated = 0;
  for (const row of draft.rows.filter(entry => entry.selected)) {
    if (row.scheduleKind === 'recurring' || repeatTitle(row.title)) { repeats++; continue; }
    if (row.scheduleKind !== 'undated') { handSet++; continue; }
    const date = row.origin === 'task' && row.rowId ? dates.get(row.rowId) : undefined;
    if (!date) { undated++; continue; }
    changing.push({ itemId: row.itemId, date });
  }
  const sorted = changing.map(row => row.date).sort(), anchor = (mode === 'first' ? sorted[0] : sorted[sorted.length - 1]) ?? null;
  return { mode, anchor, handSet, repeats, undated, single: new Set(sorted).size === 1,
    rows: anchor ? changing.map(row => ({ ...row, days: programDaysBetween(anchor, row.date) })) : [] };
}

/** "이사일 −7일", "이사일 당일", "시작일 +3일" (an empty name reads 기준일). */
export function programAnchorChip(name: string, days: number): string {
  const label = name.trim() || '기준일';
  return days === 0 ? `${label} 당일` : `${label} ${days > 0 ? '+' : '−'}${Math.abs(days)}일`;
}
/** The name goes where takers read it before choosing their day: the summary's first line, "기준일: 이사일". (The public
 *  version has no field for it; a named field would change what is stored and is left for a decision.) */
export const PROGRAM_ANCHOR_LINE = /^기준일: .*$/;
export function programAnchorSummary(summary: string, name: string): string {
  const lines = summary.split('\n'), line = `기준일: ${name.trim()}`;
  if (PROGRAM_ANCHOR_LINE.test(lines[0] ?? '')) return name.trim() ? [line, ...lines.slice(1)].join('\n') : lines.slice(1).join('\n');
  return name.trim() ? summary ? `${line}\n${summary}` : line : summary;
}

/** The changed draft and what puts it back ([원래대로]: rows and summary, each only while it still reads as changed). */
export function applyProgramPublicationAnchor(draft: ProgramPublicationDraft, plan: ProgramAnchorPlan, name: string): { draft: ProgramPublicationDraft; undo: ProgramAnchorUndo } {
  const undo: ProgramAnchorUndo = { rows: {}, summary: null };
  const rows = draft.rows.map(row => {
    const change = plan.rows.find(entry => entry.itemId === row.itemId);
    if (!change) return row;
    const to = String(change.days);
    undo.rows[row.itemId] = { from: { scheduleKind: row.scheduleKind, scheduleValue: row.scheduleValue }, to };
    return { ...row, scheduleKind: 'relative' as const, scheduleValue: to };
  });
  const summary = plan.rows.length ? programAnchorSummary(draft.summary, name) : draft.summary;
  if (summary !== draft.summary) undo.summary = { from: draft.summary, to: summary };
  return { draft: { ...draft, rows, summary }, undo };
}
/** S7's 공개 전 미리보기: where a taker with nothing yet who picks `anchor` would get each item — stage 1's sheet preview
 *  (programImportPreview) with the sheet's own repeat choice (first rounds from `today`). */
export function programPublicationTakerPreview(items: readonly ProgramPublicItem[], title: string, anchor: string | null, today: string): ProgramImportPreview {
  // programImportRepeats reads only the items and the title (its memo words) of a version.
  const version = { title, items: [...items] } as unknown as ProgramPublicVersion, ids = items.map(item => item.id);
  const repeats = programImportRepeats(undefined, version, ids), choice = programImportRepeatChoice(repeats, { starts: {}, months: {} }, today) ?? {};
  return programImportPreview(version, ids, anchor, repeats, today, choice);
}
export function restoreProgramPublicationAnchor(draft: ProgramPublicationDraft, undo: ProgramAnchorUndo): { draft: ProgramPublicationDraft; restored: number; kept: number } {
  let restored = 0, kept = 0;
  const rows = draft.rows.map(row => {
    const entry = undo.rows[row.itemId];
    if (!entry) return row;
    if (row.scheduleKind !== 'relative' || row.scheduleValue !== entry.to) { kept++; return row; }
    restored++;
    return { ...row, ...entry.from };
  });
  const summary = undo.summary && draft.summary === undo.summary.to ? undo.summary.from : draft.summary;
  return { draft: { ...draft, rows, summary }, restored, kept };
}
