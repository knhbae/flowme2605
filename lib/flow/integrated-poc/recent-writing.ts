import { textWorkspaceModel as M, type TextLine, type TextRow, type TextWorkspaceState } from './text-workspace';
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
 *  is old. A section in view then is never folded later in the session (one dated back by hand stays in view).
 *  W-b: the finished tasks of [미정] folded then (the lines under them fold along; one checked later stays in view, one
 *  unchecked elsewhere comes back), and whether [미정] folded whole, holding nothing but folders, blank lines and
 *  finished tasks (its date line and all, '날짜 미정 · 끝낸 일 n개'). */
export interface ProgramRecentHold { documentId: string; since: string; lineIds: ReadonlySet<string>; done: ReadonlySet<string>; undated: boolean }
export interface ProgramRecentDone { count: number; whole: boolean }
export interface ProgramRecentFold { lineIds: string[]; through: string; days: number; tasks: number; open: number; atEnd: boolean }
export type ProgramRecentExtend = { ok: true; state: TextWorkspaceState } | { ok: false; reason: 'document' | 'hidden-line' | 'hidden-order' | 'invalid' | 'hidden-context' | 'visible-context' };

const rowsOf = (state: TextWorkspaceState, documentId: string) => M.rowMeta(state, documentId);
/** The date rows of old sections and the rows under them. */
function oldSections(rows: readonly TextRow[], since: string) {
  const old = new Set(rows.filter(row => row.kind === 'date' && programDate(row.date) && row.date < since).map(row => row.id));
  return rows.filter(row => old.has(row.id) || !!row.dateLineId && old.has(row.dateLineId));
}
const undatedHeader = (row: TextRow) => row.kind === 'date' && row.text.trim() === '[미정]';
/** W-b: each [미정] section's rows (its date line apart), and of them the finished tasks with nothing finished above. */
function undatedSections(rows: readonly TextRow[]) {
  const headers = new Set(rows.filter(undatedHeader).map(row => row.id));
  return [...headers].map(id => {
    const section = rows.filter(row => row.dateLineId === id && row.id !== id);
    const finished = section.filter(row => row.kind === 'task' && row.isCanonical && row.done);
    return { id, section, finished: finished.filter(row => !finished.some(above => above.index < row.index && row.index < above.subtreeEndIndex)) };
  });
}
/** A [미정] section with nothing but folders (linked, or still a '- /이름' line), blank lines and finished tasks (and
 *  what is under them). */
const onlyFinished = (rows: readonly TextRow[], section: readonly TextRow[], finished: readonly TextRow[]) => finished.length > 0
  && section.every(row => ['scope', 'blank'].includes(row.kind) || row.kind === 'note' && /^ *- \/\S/.test(row.text)
    || finished.some(task => task.index <= row.index && row.index < task.subtreeEndIndex));

/** What the writing view compares, row by row, between the whole document and its recent part. */
const rowShape = (row: TextRow) => JSON.stringify([row.kind, row.depth, row.parentLineId, row.groupDate, row.date ?? null, row.dateLineId,
  row.title ?? null, row.done ?? null, row.isCanonical ?? null, row.isReference ?? null, row.scopeId ?? null, row.ancestorScopeIds ?? null,
  row.progressPercent ?? null, row.time ?? null, row.note ?? null, row.taskId ?? null]);

/** The session's fold, or null: 200 lines or fewer, nothing to fold, or a recent part that would not read the same
 *  alone. `done: false` leaves [미정]'s finished tasks in view (shown by [보기]). */
export function programRecentHold(state: TextWorkspaceState, documentId: string, today: string, options: { done?: boolean } = {}): ProgramRecentHold | null {
  const doc = state.documents.find(entry => entry.id === documentId);
  if (!doc || doc.lines.length <= PROGRAM_RECENT_WRITING.lines || !programDate(today)) return null;
  const since = programShiftDate(today, 1 - PROGRAM_RECENT_WRITING.days), rows = rowsOf(state, documentId);
  // A section with a line another line refers to stays in view: its task must be there for the reference.
  const referred = new Set(state.bindings.flatMap(binding => binding.kind === 'task' ? [binding.taskId] : []));
  const bySection = new Map<string, TextRow[]>();
  for (const row of oldSections(rows, since)) { const key = row.kind === 'date' ? row.id : row.dateLineId!; bySection.set(key, [...bySection.get(key) ?? [], row]); }
  const lineIds = new Set([...bySection.values()].filter(section => !section.some(row => referred.has(row.id))).flat().map(row => row.id));
  const undated = options.done === false ? [] : undatedSections(rows).map(entry => ({ ...entry, finished: entry.finished.filter(row => !referred.has(row.id)) }));
  const done = new Set(undated.flatMap(entry => entry.finished.map(row => row.id)));
  if (!lineIds.size && !done.size) return null;
  const hold: ProgramRecentHold = { documentId, since, lineIds, done, undated: undated.some(entry => onlyFinished(rows, entry.section, entry.finished)) };
  const hidden = programRecentHidden(state, hold), restricted = restrictProgramRecent(state, documentId, hidden);
  if (!M.validate(restricted)) return null;
  const alone = new Map(rowsOf(restricted, documentId).map(row => [row.id, rowShape(row)]));
  return rows.every(row => hidden.has(row.id) || alone.get(row.id) === rowShape(row)) ? hold : null;
}

/** The lines folded in `state` now: every line of a section whose date line was folded when the session began and is
 *  still an old day (a line added to it since, by another device or an import, reads as that day's and folds with it). */
export function programRecentHidden(state: TextWorkspaceState, hold: ProgramRecentHold): Set<string> {
  // Asked for again and again while typing (each check of the editor's state), so kept per state and hold.
  const known = hiddenKnown.get(state)?.get(hold);
  if (known) return known;
  let hidden = new Set<string>();
  if (M.getDocument(state, hold.documentId)) {
    const all = rowsOf(state, hold.documentId), rows = oldSections(all, hold.since);
    const sections = new Set(rows.filter(row => row.kind === 'date' && hold.lineIds.has(row.id)).map(row => row.id));
    hidden = new Set(rows.filter(row => sections.has(row.kind === 'date' ? row.id : row.dateLineId!)).map(row => row.id));
    // W-b: [미정]'s finished tasks folded at the start, still finished, with whatever is under them now; the whole
    // section when it folded whole and still holds nothing else.
    if (hold.done.size) for (const entry of undatedSections(all)) {
      const folded = entry.finished.filter(row => hold.done.has(row.id));
      if (hold.undated && folded.length === entry.finished.length && onlyFinished(all, entry.section, entry.finished)) {
        hidden.add(entry.id); for (const row of entry.section) hidden.add(row.id); continue;
      }
      for (const task of folded) for (const row of all.slice(task.index, task.subtreeEndIndex)) hidden.add(row.id);
    }
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

/** The folded lines' order: their IDs as the document has them. */
const hiddenOrder = (lines: readonly TextLine[], hidden: ReadonlySet<string>) => lines.filter(line => hidden.has(line.id)).map(line => line.id).join('\n');
/** The whole workspace a save of the writing view's `next` makes: `base`'s hidden lines (and what belongs to them) put
 *  back. `check` proves it: the hidden lines keep their order (writing-view review F1: each run goes back before the line
 *  that followed it, so days in view swapped would swap the folded days between them), the whole model accepts it, the
 *  hidden lines read exactly as in `base`, and the lines in view read exactly as the editor had them. Without `check` (a
 *  quick look at each key) only the lines go back. */
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
  if (hiddenOrder(lines, hidden) !== hiddenOrder(baseDoc.lines, hidden)) return { ok: false, reason: 'hidden-order' };
  if (!M.validate(state)) return { ok: false, reason: 'invalid' };
  const whole = new Map(rowsOf(state, documentId).map(row => [row.id, rowShape(row)]));
  if (rowsOf(base, documentId).some(row => hidden.has(row.id) && whole.get(row.id) !== rowShape(row))) return { ok: false, reason: 'hidden-context' };
  if (rowsOf(next, documentId).some(row => whole.get(row.id) !== rowShape(row))) return { ok: false, reason: 'visible-context' };
  return { ok: true, state };
}

/** The whole raw for a raw typed in the recent view (what the 복구함 keeps), made as a save makes it (writing-view review
 *  F2: not by finding lines by their text): the model reads what was typed into lines with their IDs, and the folded
 *  lines go back by ID, in their order. Unchanged, it is the whole document. Typed input the model cannot read yet (a
 *  refused edit), or one whose folded lines could not keep their order, is kept by the lines it still shares with the
 *  recent part: each folded run after the line that came before it (else before the one that came after), never out of
 *  order. Nothing typed and nothing folded is left out. */
export function extendProgramRecentRaw(base: TextWorkspaceState, documentId: string, hidden: ReadonlySet<string>, raw: string): string {
  const doc = M.getDocument(base, documentId);
  if (!doc || !hidden.size) return raw;
  const restricted = restrictProgramRecent(base, documentId, hidden), shown = M.getDocument(restricted, documentId)!;
  if (raw === M.raw(shown)) return M.raw(doc);
  const typed = M.editTextResult(restricted, documentId, raw);
  if (!typed.reason && M.raw(M.getDocument(typed.state, documentId)) === raw) {
    const put = extendProgramRecent(base, typed.state, documentId, hidden, false), lines = put.ok ? M.getDocument(put.state, documentId)!.lines : null;
    if (lines && hiddenOrder(lines, hidden) === hiddenOrder(doc.lines, hidden)) return lines.map(line => line.text).join('\n');
  }
  return alignedRaw(doc.lines, shown.lines, raw.split('\n'), hidden);
}
/** The folded runs put into typed lines by the recent part's lines they still match (a longest common subsequence of
 *  identical lines): each after the typed place of the line before it, else before that of the line after it, else
 *  where the run before it went; never before the run before it. */
function alignedRaw(whole: readonly TextLine[], shown: readonly TextLine[], typed: readonly string[], hidden: ReadonlySet<string>): string {
  const n = shown.length, m = typed.length, table = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    table[i][j] = shown[i].text === typed[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
  const at = new Map<string, number>();
  for (let i = 0, j = 0; i < n && j < m;) {
    if (shown[i].text === typed[j] && table[i][j] === table[i + 1][j + 1] + 1) { at.set(shown[i].id, j); i++; j++; }
    else if (table[i + 1][j] >= table[i][j + 1]) i++; else j++;
  }
  const insert = new Map<number, string[]>();
  let floor = 0;
  for (let index = 0; index < whole.length;) {
    if (!hidden.has(whole[index].id)) { index++; continue; }
    const start = index;
    while (index < whole.length && hidden.has(whole[index].id)) index++;
    const before = whole.slice(0, start).reverse().find(line => !hidden.has(line.id)), after = whole.slice(index).find(line => !hidden.has(line.id));
    const place = before && at.has(before.id) ? at.get(before.id)! + 1 : after && at.has(after.id) ? at.get(after.id)! : !before ? 0 : !after ? m : floor;
    floor = Math.max(floor, place);
    insert.set(floor, [...insert.get(floor) ?? [], ...whole.slice(start, index).map(line => line.text)]);
  }
  const out: string[] = [];
  for (let j = 0; j <= m; j++) { out.push(...insert.get(j) ?? []); if (j < m) out.push(typed[j]); }
  return out.join('\n');
}

/** An offset in one raw moved to the same line (and column) in another, by line ID; 0 when that line is not there. */
export function moveProgramRecentOffset(from: readonly { id: string; text: string }[], to: readonly { id: string; text: string }[], offset: number): number {
  let index = 0, start = 0;
  while (index < from.length - 1 && start + from[index].text.length < offset) { start += from[index].text.length + 1; index++; }
  const target = to.findIndex(line => line.id === from[index]?.id);
  if (target < 0) return 0;
  return to.slice(0, target).reduce((sum, line) => sum + line.text.length + 1, 0) + Math.min(Math.max(0, offset - start), to[target].text.length);
}

/** W-b: how many finished tasks of [미정] are folded, and whether [미정] is folded whole. */
export function programRecentDone(state: TextWorkspaceState, documentId: string, hidden: ReadonlySet<string>): ProgramRecentDone {
  const sections = undatedSections(rowsOf(state, documentId));
  return { count: sections.reduce((sum, entry) => sum + entry.finished.filter(row => hidden.has(row.id)).length, 0), whole: sections.some(entry => hidden.has(entry.id)) };
}
/** W-b: how many finished tasks [미정] has (for the line that folds them again). */
export const programRecentDoneCount = (state: TextWorkspaceState, documentId: string) => undatedSections(rowsOf(state, documentId)).reduce((sum, entry) => sum + entry.finished.length, 0);

/** The folded runs of old days, for the '지난 기록' line: through which day, how many days, tasks and tasks still open. */
export function programRecentFolds(state: TextWorkspaceState, documentId: string, hidden: ReadonlySet<string>): ProgramRecentFold[] {
  const rows = rowsOf(state, documentId), folds: ProgramRecentFold[] = [], undated = new Set(rows.filter(undatedHeader).map(row => row.id));
  let run: TextRow[] = [];
  const close = (atEnd: boolean) => {
    if (!run.length) return;
    const dates = run.filter(row => row.kind === 'date' && programDate(row.date)).map(row => row.date!), tasks = run.filter(row => row.kind === 'task' && row.isCanonical);
    folds.push({ lineIds: run.map(row => row.id), through: dates.reduce((last, date) => date > last ? date : last, ''), days: dates.length,
      tasks: tasks.length, open: tasks.filter(row => !row.done).length, atEnd });
    run = [];
  };
  for (const row of rows) { if (hidden.has(row.id) && !undated.has(row.id) && !undated.has(row.dateLineId ?? '')) run.push(row); else close(false); }
  close(true);
  return folds;
}
