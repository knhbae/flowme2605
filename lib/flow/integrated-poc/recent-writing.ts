import { textWorkspaceModel as M, type TextRow, type TextWorkspaceState } from './text-workspace';
import { programShiftDate } from './execution';
import { programDate } from './program-data';

/** 11/5 결정 (쓰기 '최근만 쓰기', W-a): a long document is written in its recent part. The writing view's editor gets the
 *  document without its old date sections (dated before the last 7 days), and a save puts them back exactly where they
 *  were, byte for byte with their own IDs, folder links, scopes and progress records. Nothing is saved for the fold: the
 *  text, other devices, the 오늘 and 분류 tabs and the rollback build read the whole document as before.
 *  A section another line refers to (a reference's task) stays in view, and a document whose recent part would read
 *  differently alone (a code fence left open, say) is not folded. */
export const PROGRAM_RECENT_WRITING = Object.freeze({ lines: 200, days: 7 });

/** What one writing session folds: the lines folded when the document was opened, and the day before which a section
 *  is old. A section in view then is never folded later in the session (one dated back by hand stays in view). */
export interface ProgramRecentHold { documentId: string; since: string; lineIds: ReadonlySet<string> }
export interface ProgramRecentFold { lineIds: string[]; through: string; days: number; tasks: number; open: number; atEnd: boolean }
export type ProgramRecentExtend = { ok: true; state: TextWorkspaceState } | { ok: false; reason: 'document' | 'hidden-line' | 'invalid' | 'hidden-context' | 'visible-context' };

const rowsOf = (state: TextWorkspaceState, documentId: string) => M.rowMeta(state, documentId);
/** The date rows of old sections and the rows under them. */
function oldSections(rows: readonly TextRow[], since: string) {
  const old = new Set(rows.filter(row => row.kind === 'date' && programDate(row.date) && row.date < since).map(row => row.id));
  return rows.filter(row => old.has(row.id) || !!row.dateLineId && old.has(row.dateLineId));
}
/** What the writing view compares, row by row, between the whole document and its recent part. */
const rowShape = (row: TextRow) => JSON.stringify([row.kind, row.depth, row.parentLineId, row.groupDate, row.date ?? null, row.dateLineId,
  row.title ?? null, row.done ?? null, row.isCanonical ?? null, row.isReference ?? null, row.scopeId ?? null, row.ancestorScopeIds ?? null,
  row.progressPercent ?? null, row.time ?? null, row.note ?? null, row.taskId ?? null]);

/** The session's fold, or null: 200 lines or fewer, nothing old, or a recent part that would not read the same alone. */
export function programRecentHold(state: TextWorkspaceState, documentId: string, today: string): ProgramRecentHold | null {
  const doc = state.documents.find(entry => entry.id === documentId);
  if (!doc || doc.lines.length <= PROGRAM_RECENT_WRITING.lines || !programDate(today)) return null;
  const since = programShiftDate(today, 1 - PROGRAM_RECENT_WRITING.days), rows = rowsOf(state, documentId);
  // A section with a line another line refers to stays in view: its task must be there for the reference.
  const referred = new Set(state.bindings.flatMap(binding => binding.kind === 'task' ? [binding.taskId] : []));
  const bySection = new Map<string, TextRow[]>();
  for (const row of oldSections(rows, since)) { const key = row.kind === 'date' ? row.id : row.dateLineId!; bySection.set(key, [...bySection.get(key) ?? [], row]); }
  const lineIds = new Set([...bySection.values()].filter(section => !section.some(row => referred.has(row.id))).flat().map(row => row.id));
  if (!lineIds.size) return null;
  const hold = { documentId, since, lineIds };
  const restricted = restrictProgramRecent(state, documentId, lineIds);
  if (!M.validate(restricted)) return null;
  const alone = new Map(rowsOf(restricted, documentId).map(row => [row.id, rowShape(row)]));
  return rows.every(row => lineIds.has(row.id) || alone.get(row.id) === rowShape(row)) ? hold : null;
}

/** The lines folded in `state` now: every line of a section whose date line was folded when the session began and is
 *  still an old day (a line added to it since, by another device or an import, reads as that day's and folds with it). */
export function programRecentHidden(state: TextWorkspaceState, hold: ProgramRecentHold): Set<string> {
  // Asked for again and again while typing (each check of the editor's state), so kept per state and hold.
  const known = hiddenKnown.get(state)?.get(hold);
  if (known) return known;
  let hidden = new Set<string>();
  if (M.getDocument(state, hold.documentId)) {
    const rows = oldSections(rowsOf(state, hold.documentId), hold.since);
    const sections = new Set(rows.filter(row => row.kind === 'date' && hold.lineIds.has(row.id)).map(row => row.id));
    hidden = new Set(rows.filter(row => sections.has(row.kind === 'date' ? row.id : row.dateLineId!)).map(row => row.id));
  }
  if (!hiddenKnown.has(state)) hiddenKnown.set(state, new WeakMap());
  hiddenKnown.get(state)!.set(hold, hidden);
  return hidden;
}
const hiddenKnown = new WeakMap<TextWorkspaceState, WeakMap<ProgramRecentHold, Set<string>>>();

const omit = (entries: Record<string, string>, hidden: ReadonlySet<string>) => Object.fromEntries(Object.entries(entries).filter(([id]) => !hidden.has(id)));
const pick = (entries: Record<string, string>, hidden: ReadonlySet<string>) => Object.fromEntries(Object.entries(entries).filter(([id]) => hidden.has(id)));

/** The workspace the writing view's editor gets: the document without the hidden lines, and without what belongs to
 *  them (their folder links and references, scopes and progress records). Everything else is as it was. */
export function restrictProgramRecent(state: TextWorkspaceState, documentId: string, hidden: ReadonlySet<string>): TextWorkspaceState {
  if (!hidden.size) return state;
  return { ...state, documents: state.documents.map(doc => doc.id === documentId ? { ...doc, lines: doc.lines.filter(line => !hidden.has(line.id)) } : doc),
    bindings: state.bindings.filter(binding => !hidden.has(binding.lineId)), taskScopes: omit(state.taskScopes, hidden), itemScopes: omit(state.itemScopes, hidden),
    progressRecords: state.progressRecords.filter(record => !hidden.has(record.taskId)) };
}

/** `restricted` with the hidden items of `full` put back where they were: each run of them right before the first item
 *  that followed it in `full` and is still in `restricted`, else at the end. Leaving the hidden items out of the result
 *  gives `restricted` again, and weaving `full`'s own restriction gives `full` again. */
export function weaveProgramRecent<T>(full: readonly T[], restricted: readonly T[], hidden: (item: T) => boolean, key: (item: T) => string): T[] {
  const present = new Set(restricted.map(key)), before = new Map<string, T[]>();
  let waiting: T[] = [];
  for (const item of full) {
    if (hidden(item)) { waiting.push(item); continue; }
    if (waiting.length && present.has(key(item))) { before.set(key(item), [...before.get(key(item)) ?? [], ...waiting]); waiting = []; }
  }
  return [...restricted.flatMap(item => [...before.get(key(item)) ?? [], item]), ...waiting];
}

/** The whole workspace a save of the writing view's `next` makes: `base`'s hidden lines (and what belongs to them) put
 *  back. `check` proves it: the whole model accepts it, the hidden lines read exactly as in `base`, and the lines in view
 *  read exactly as the editor had them. Without `check` (a quick look at each key) only the lines go back. */
export function extendProgramRecent(base: TextWorkspaceState, next: TextWorkspaceState, documentId: string, hidden: ReadonlySet<string>,
  check = true): ProgramRecentExtend {
  if (!hidden.size) return { ok: true, state: next };
  const baseDoc = base.documents.find(doc => doc.id === documentId), nextDoc = next.documents.find(doc => doc.id === documentId);
  if (!baseDoc || !nextDoc) return { ok: false, reason: 'document' };
  if (nextDoc.lines.some(line => hidden.has(line.id))) return { ok: false, reason: 'hidden-line' };
  const lines = weaveProgramRecent(baseDoc.lines, nextDoc.lines, line => hidden.has(line.id), line => line.id);
  const state: TextWorkspaceState = { ...next, documents: next.documents.map(doc => doc.id === documentId ? { ...doc, lines } : doc),
    bindings: weaveProgramRecent(base.bindings, next.bindings, binding => hidden.has(binding.lineId), binding => binding.lineId),
    taskScopes: { ...next.taskScopes, ...pick(base.taskScopes, hidden) }, itemScopes: { ...next.itemScopes, ...pick(base.itemScopes, hidden) },
    progressRecords: weaveProgramRecent(base.progressRecords, next.progressRecords, record => hidden.has(record.taskId), record => `${record.taskId}\u0000${record.date}`) };
  if (!check) return { ok: true, state };
  if (!M.validate(state)) return { ok: false, reason: 'invalid' };
  const whole = new Map(rowsOf(state, documentId).map(row => [row.id, rowShape(row)]));
  if (rowsOf(base, documentId).some(row => hidden.has(row.id) && whole.get(row.id) !== rowShape(row))) return { ok: false, reason: 'hidden-context' };
  if (rowsOf(next, documentId).some(row => whole.get(row.id) !== rowShape(row))) return { ok: false, reason: 'visible-context' };
  return { ok: true, state };
}

/** The whole raw for a raw typed in the recent view (what the 복구함 keeps): each folded run right before the line that
 *  followed it, found by its text after the run put back last, else at the end. Unchanged, it is the whole document. */
export function extendProgramRecentRaw(base: TextWorkspaceState, documentId: string, hidden: ReadonlySet<string>, raw: string): string {
  const doc = M.getDocument(base, documentId);
  if (!doc || !hidden.size) return raw;
  if (raw === doc.lines.filter(line => !hidden.has(line.id)).map(line => line.text).join('\n')) return M.raw(doc);
  const runs: { lines: string[]; next: string | null }[] = [];
  for (const [index, line] of doc.lines.entries()) {
    if (!hidden.has(line.id)) continue;
    if (index && hidden.has(doc.lines[index - 1].id)) runs.at(-1)!.lines.push(line.text);
    else runs.push({ lines: [line.text], next: null });
    const after = doc.lines[index + 1];
    if (after && !hidden.has(after.id)) runs.at(-1)!.next = after.text;
  }
  const typed = raw.split('\n'), out: string[] = [], last: string[] = [];
  let cursor = 0;
  for (const run of runs) {
    const at = run.next === null ? -1 : typed.indexOf(run.next, cursor);
    if (at < 0) { last.push(...run.lines); continue; }
    out.push(...typed.slice(cursor, at), ...run.lines); cursor = at;
  }
  return [...out, ...typed.slice(cursor), ...last].join('\n');
}

/** An offset in one raw moved to the same line (and column) in another, by line ID; 0 when that line is not there. */
export function moveProgramRecentOffset(from: readonly { id: string; text: string }[], to: readonly { id: string; text: string }[], offset: number): number {
  let index = 0, start = 0;
  while (index < from.length - 1 && start + from[index].text.length < offset) { start += from[index].text.length + 1; index++; }
  const target = to.findIndex(line => line.id === from[index]?.id);
  if (target < 0) return 0;
  return to.slice(0, target).reduce((sum, line) => sum + line.text.length + 1, 0) + Math.min(Math.max(0, offset - start), to[target].text.length);
}

/** The folded runs, for the '지난 기록' line: through which day, how many days, tasks and tasks still open. */
export function programRecentFolds(state: TextWorkspaceState, documentId: string, hidden: ReadonlySet<string>): ProgramRecentFold[] {
  const rows = rowsOf(state, documentId), folds: ProgramRecentFold[] = [];
  let run: TextRow[] = [];
  const close = (atEnd: boolean) => {
    if (!run.length) return;
    const dates = run.filter(row => row.kind === 'date' && programDate(row.date)).map(row => row.date!), tasks = run.filter(row => row.kind === 'task' && row.isCanonical);
    folds.push({ lineIds: run.map(row => row.id), through: dates.reduce((last, date) => date > last ? date : last, ''), days: dates.length,
      tasks: tasks.length, open: tasks.filter(row => !row.done).length, atEnd });
    run = [];
  };
  for (const row of rows) { if (hidden.has(row.id)) run.push(row); else close(false); }
  close(true);
  return folds;
}
