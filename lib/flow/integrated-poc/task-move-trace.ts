import { textWorkspaceModel as M, type TextRow, type TextWorkspaceState } from './text-workspace';
import { programCalendarDate } from './date-label';

/** F9 W-MENU-26 (11/11, 총괄 A): a task moved to another day leaves a grey line in the section it left
 *  ('→ 보고서 쓰기 · 50%까지 · 11월 13일 (금)으로 옮김 [그날 보기]'). The move itself is kept on this device only (its
 *  localStorage), never in the account: nothing of the text, the storage format or the database changes, and another
 *  device does not see it. A kept move is drawn only while the text still agrees with it (the task's last kept move
 *  ends on the day the task is on now, and the section it left is still there), so 되돌리기, ↶, a move back from
 *  another device or a hand edit never leave a false line. A line shows until its own day has passed. */
export type ProgramMoveTrace = {
  v: 1; id: string; docId: string; taskId: string;
  /** The section the task left: its date line and day. */
  fromHeadId: string; fromDate: string;
  /** The line right above the task where it was (its section's date line when it was first), to draw the trace there. */
  afterLineId: string;
  toDate: string | null; percent: number | null; at: number;
};
export const PROGRAM_MOVE_TRACE_LIMIT = 200;
export const programMoveTraceKey = (owner: string) => `flow:alpha:move-trace:v1:${owner}`;

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const text = (value: unknown, max = 200) => typeof value === 'string' && value.length > 0 && value.length <= max;
function isTrace(value: unknown): value is ProgramMoveTrace {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return row.v === 1 && text(row.id) && text(row.docId) && text(row.taskId) && text(row.fromHeadId) && text(row.afterLineId)
    && typeof row.fromDate === 'string' && DATE.test(row.fromDate) && (row.toDate === null || typeof row.toDate === 'string' && DATE.test(row.toDate))
    && (row.percent === null || typeof row.percent === 'number' && Number.isFinite(row.percent) && row.percent >= 0 && row.percent <= 100)
    && typeof row.at === 'number' && Number.isFinite(row.at);
}
type TraceStorage = Pick<Storage, 'getItem' | 'setItem'>;
/** The kept moves; nothing (not an error) when the storage is missing, refused or holds something else. */
export function readProgramMoveTraces(storage: TraceStorage | null | undefined, key: string): ProgramMoveTrace[] {
  try {
    const read: unknown = JSON.parse(storage?.getItem(key) ?? '[]');
    return Array.isArray(read) ? read.filter(isTrace) : [];
  } catch { return []; }
}
/** Keeps `list` without the moves whose day has passed (before yesterday: a clock a little behind still sees today's),
 *  the newest PROGRAM_MOVE_TRACE_LIMIT at most. False when the storage refused it (the move itself is unaffected). */
export function writeProgramMoveTraces(storage: TraceStorage | null | undefined, key: string, list: readonly ProgramMoveTrace[], today: string): boolean {
  const yesterday = new Date(Date.parse(`${today}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
  const kept = list.filter(entry => entry.fromDate >= yesterday).sort((a, b) => a.at - b.at).slice(-PROGRAM_MOVE_TRACE_LIMIT);
  try { storage?.setItem(key, JSON.stringify(kept)); return !!storage; } catch { return false; }
}

/** W-MENU-27: every way that moves a task to a date keeps its move here (the editor's ⋮ sheet and chips, the F7 chip,
 *  the bar; the host's 오늘 row detail, the band's 미루기, the folded writing view). The stored list is the base (another
 *  tab may have added to it); this tab's editors hear the change through PROGRAM_MOVE_TRACE_EVENT. */
export const PROGRAM_MOVE_TRACE_EVENT = 'flowme:move-trace';
export function keepProgramMoveTraces(storage: TraceStorage | null | undefined, key: string, change: (list: ProgramMoveTrace[]) => ProgramMoveTrace[], today: string, fallback: ProgramMoveTrace[] = []): ProgramMoveTrace[] {
  const next = change(storage ? readProgramMoveTraces(storage, key) : fallback);
  writeProgramMoveTraces(storage, key, next, today);
  try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(PROGRAM_MOVE_TRACE_EVENT, { detail: { key } })); } catch { /* nothing listens */ }
  return next;
}

/** The move to keep when `taskId` of `docId` goes from where it is in `before` to `toDate`: null when it was not in a
 *  dated section (no day to draw the line in), stays on its day, or goes to an earlier day (W-MENU-27: a trace shows
 *  work carried forward; moved back, there is none). */
export function programMoveTrace(before: TextWorkspaceState, docId: string, taskId: string, toDate: string | null, at: number, id: string): ProgramMoveTrace | null {
  const doc = M.getDocument(before, docId);
  if (!doc) return null;
  const rows = M.rowMeta(before, docId), row = rows.find(entry => entry.id === taskId);
  const head = row?.dateLineId ? rows.find(entry => entry.id === row.dateLineId) : undefined;
  if (!row || !head || head.kind !== 'date' || !head.date || !DATE.test(head.date) || head.date === toDate || toDate !== null && toDate < head.date) return null;
  const above = row.index > head.index ? doc.lines[row.index - 1]?.id : head.id;
  if (!above) return null;
  const percent = M.currentProgress(before, taskId);
  return { v: 1, id, docId, taskId, fromHeadId: head.id, fromDate: head.date, afterLineId: above, toDate,
    percent: typeof percent === 'number' && Number.isFinite(percent) ? percent : null, at };
}

const ro = (word: string) => { const last = [...word].reverse().find(char => char >= '가' && char <= '힣'); const final = last ? (last.charCodeAt(0) - 0xac00) % 28 : 0; return final === 0 || final === 8 ? '로' : '으로'; };
/** '→ 보고서 쓰기 · 50%까지 · 11월 13일 (금)으로 옮김'; no share when it had none (0% or no record). */
export function programMoveTraceText(title: string, percent: number | null, toDate: string | null, today: string): string {
  const day = toDate ? programCalendarDate(toDate, today) : '날짜 미정';
  return `→ ${title.trim() || '할 일'}${percent ? ` · ${percent}%까지` : ''} · ${day}${ro(day)} 옮김`;
}

export type ProgramMoveTraceLine = { traceId: string; taskId: string; toDate: string | null; text: string };
/** The trace lines to draw in `docId` now, by the ID of the line each goes under. Only moves the text still agrees with
 *  (see above), only while their day is today or later, one per task and section (its last move out of there). */
export function programMoveTraceLines(state: TextWorkspaceState, docId: string, traces: readonly ProgramMoveTrace[], today: string): Map<string, ProgramMoveTraceLine[]> {
  const out = new Map<string, ProgramMoveTraceLine[]>();
  const mine = traces.filter(entry => entry.docId === docId && entry.fromDate >= today);
  if (!mine.length || !M.getDocument(state, docId)) return out;
  const rows = M.rowMeta(state, docId), byId = new Map<string, TextRow>(rows.map(row => [row.id, row]));
  const latest = new Map<string, ProgramMoveTrace>();
  for (const entry of traces) if (entry.docId === docId && (latest.get(entry.taskId)?.at ?? -Infinity) <= entry.at) latest.set(entry.taskId, entry);
  const drawn = new Set<string>();
  for (const entry of [...mine].sort((a, b) => b.at - a.at)) {
    const task = byId.get(entry.taskId), head = byId.get(entry.fromHeadId), last = latest.get(entry.taskId);
    if (!task || !['task', 'subcheck'].includes(task.kind) || !head || head.kind !== 'date' || head.date !== entry.fromDate || !last) continue;
    // The task is on the day its last kept move took it to, in a section of that day (not still in the one it left).
    const now = task.dateLineId ? byId.get(task.dateLineId) : undefined;
    const nowDay = now?.kind === 'date' ? now.date ?? null : undefined;
    if (nowDay === undefined || nowDay !== last.toDate || task.dateLineId === entry.fromHeadId) continue;
    const key = `${entry.taskId}:${entry.fromHeadId}`;
    if (drawn.has(key)) continue;
    drawn.add(key);
    const above = byId.get(entry.afterLineId);
    const inSection = (row: TextRow | undefined) => !!row && (row.id === entry.fromHeadId || row.dateLineId === entry.fromHeadId);
    const anchor = inSection(above) ? above! : [...rows].reverse().find(row => row.dateLineId === entry.fromHeadId && row.kind !== 'blank') ?? head;
    const title = task.title ?? task.task?.title ?? task.text.replace(/^\s*-\s*\[[^\]]\]\s*/, '');
    const line = { traceId: entry.id, taskId: entry.taskId, toDate: nowDay, text: programMoveTraceText(title, entry.percent, nowDay, today) };
    out.set(anchor.id, [...out.get(anchor.id) ?? [], line]);
  }
  return out;
}
