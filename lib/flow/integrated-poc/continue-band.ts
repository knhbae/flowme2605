import type { ProgramOrderedExecutionRow } from './recurrence-order';
import type { TextTask } from './text-workspace';
import { programRepeatTitle } from './repeat-line';

/** F8 1단계 (CO-1, 11/10): '이어지는 일' over a writing document — the open tasks 오늘 lists for today whose line is not in
 *  the open document's today section: another section (moved to today), a folded old one, another document, a Flow's
 *  copy, a repeat line whose round is today. The late ones (before today, still open) are only counted. Drawn only:
 *  nothing is written; a check is the 오늘 list's own check on the line where it is. */
export type ProgramContinueKind = 'flow' | 'moved' | 'progress' | 'repeat';
export type ProgramContinueRow = { task: TextTask; kind: ProgramContinueKind; percent: number | null; repeat: string | null; flowTitle: string | null };
export type ProgramContinueBand = { rows: ProgramContinueRow[]; late: number; flow: number };
export const PROGRAM_CONTINUE_ROWS = 5;
const ORDER: Record<ProgramContinueKind, number> = { flow: 0, moved: 1, progress: 2, repeat: 3 };

export function programContinueBand(rows: readonly ProgramOrderedExecutionRow[], context: {
  today: string; documentId: string; flowTitle(documentId: string): string | null; repeat(taskId: string): string | null; progress(taskId: string): number | null;
}): ProgramContinueBand {
  const seen = new Set<string>(), late = new Set<string>(), list: ProgramContinueRow[] = [];
  for (const row of rows) {
    if (row.kind !== 'text-task' || !row.date || seen.has(row.task.id)) continue;
    const task = row.task, value = context.progress(task.id) ?? (task.done ? 100 : 0);
    if (task.done || value === 100) continue;
    // int9 r2 (W-CARRY-01, 기타 int9 QA P2): a Flow's tasks 오늘 lists — today's and the ones still going from an earlier
    // day — are the band's Flow rows, as the Flow band drew them before F8; only my own earlier tasks are 밀린 일.
    const flowTitle = context.flowTitle(task.docId);
    if (row.date < context.today && flowTitle === null) { late.add(task.id); continue; }
    if (flowTitle === null && row.date !== context.today || task.docId === context.documentId && task.groupDate === context.today) continue;
    seen.add(task.id);
    const repeat = context.repeat(task.id);
    list.push({ task, kind: flowTitle !== null ? 'flow' : value > 0 ? 'progress' : repeat ? 'repeat' : 'moved', percent: value > 0 ? value : null, repeat, flowTitle });
  }
  // Flow, moved, progress, repeat; within each, the first written first (a stable sort keeps 오늘's order otherwise).
  const written = (row: ProgramContinueRow) => row.task.groupDate ?? '9999-99-99';
  list.sort((a, b) => ORDER[a.kind] - ORDER[b.kind] || (written(a) < written(b) ? -1 : written(a) > written(b) ? 1 : 0));
  return { rows: list, late: late.size, flow: list.filter(row => row.kind === 'flow').length };
}

/** The row's second line, as parts: where it was written ('11/7에 씀', or "‘회사’ 문서" for another document), whether its
 *  date was moved ('미룸' here, '오늘로 옮김' from another document; a repeat line's date is its start, not a move), and its
 *  folder (the host gives it). */
export function programContinueMeta(task: TextTask, documentId: string, folder: string | null, kind: ProgramContinueKind = 'moved'): string[] {
  const here = task.docId === documentId, day = task.groupDate && /^\d{4}-\d{2}-\d{2}$/.test(task.groupDate) ? `${Number(task.groupDate.slice(5, 7))}/${Number(task.groupDate.slice(8, 10))}` : null;
  return [here ? (day ? `${day}에 씀` : '날짜 없는 줄') : `‘${task.docTitle || '제목 없는 글'}’ 문서`, task.explicitDate && kind !== 'repeat' ? (here ? '미룸' : '오늘로 옮김') : '', folder ? `/ ${folder}` : '']
    .filter(Boolean);
}

/** F8 1단계 (CO-3 표시): the same task — its words without the repeat marker, spaces folded, the ending punctuation off. */
export function programSameTaskKey(title: string): string {
  return programRepeatTitle(title).replace(/\s+/g, ' ').trim().replace(/[\s.,!?~…·。、]+$/u, '').toLocaleLowerCase('ko-KR');
}

/** 오늘's rows of one group that are the same task in the same folder: the first written stands for them, with the others
 *  under it ('같은 일 n줄'); those others are not listed. `members` keeps the first written first. */
export function programSameTaskGroups(tasks: readonly { task: TextTask; group: string }[], folderOf: (task: TextTask) => string) {
  const byKey = new Map<string, TextTask[]>();
  for (const { task, group } of tasks) {
    const words = programSameTaskKey(task.title);
    if (!words) continue;
    const key = `${group}\u0000${folderOf(task)}\u0000${words}`;
    byKey.set(key, [...byKey.get(key) ?? [], task]);
  }
  const members = new Map<string, TextTask[]>(), hidden = new Set<string>();
  const written = (task: TextTask) => task.groupDate ?? '9999-99-99';
  for (const list of byKey.values()) {
    if (list.length < 2) continue;
    const ordered = [...list].sort((a, b) => written(a) < written(b) ? -1 : written(a) > written(b) ? 1 : a.docId === b.docId ? a.sourceIndex - b.sourceIndex : 0);
    members.set(ordered[0].id, ordered);
    for (const task of ordered.slice(1)) hidden.add(task.id);
  }
  return { members, hidden };
}
