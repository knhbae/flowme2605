import { programId } from './contract';
import { programSameTaskKey } from './continue-band';
import { moveTaskLocation, readTaskLocationSource } from './task-location-move';
import { textWorkspaceModel as M, type TextLine, type TextTask, type TextWorkspaceState } from './text-workspace';

/** Redesign 4 (W-MENU-25, W-TXT-04·05·08; 총괄 11/12: the text alone). A task with a record taken to today is continued:
 *  yesterday's line stays as that day's record, `[>]` with `- 이어감: YYYY-MM-DD · n%` under it, and a new line in
 *  today's section (same folder) carries on its current state: its progress `[n%]`, its `- 마감:` (also left on the old
 *  line), its subtasks. The old line's memo and time stay with the record. No ID suffix and no new account key: the old
 *  line's owner, progress records and links pass to the new line (the old one is no task any more), and the two lines
 *  are found again by the same task key in the 이어감 day's section. */
export const PROGRAM_CONTINUED = /^( *-\s+\[)>(\](?:\s+|$))(.*?)(\s*)$/;
export const PROGRAM_CONTINUE_LINE = /^( *-\s+)이어감:\s*(\d{4}-\d{2}-\d{2})(?:\s*·\s*(\d{1,3})%)?\s*$/;
const TASK = /^( *-\s+\[)([^\]\r\n]*)(\](?:\s+|$))(.*?)(\s*)$/;

/** A record (W-MENU-25, 기획 안 A): progress 1-99 (text or latest record), a checked subtask, or a memo under it. */
export function programTaskHasRecord(text: TextWorkspaceState, task: TextTask): boolean {
  const percent = M.currentProgress(text, task.id) ?? 0;
  return percent > 0 && percent < 100 || task.subchecks.some(sub => sub.done) || !!task.note.trim();
}

export type ProgramContinuation = { ok: true; next: TextWorkspaceState; oldId: string; newId: string; percent: number } | { ok: false; reason: string };

/** Continues one open task of a past day to `today` (W-MENU-25). The new line gets `newId` (made when not given). */
export function continueProgramTask(text: TextWorkspaceState, input: { documentId: string; taskId: string; today: string; newId?: string }): ProgramContinuation {
  const fail = (reason: string): ProgramContinuation => ({ ok: false, reason });
  const source = readTaskLocationSource(text, input.documentId, input.taskId);
  if (!source) return fail('protected');
  const { doc, rows, row, task } = source;
  if (task.done || row.groupDate === null || row.groupDate >= input.today) return fail('not-past');
  const line = doc.lines[row.index], parts = TASK.exec(line.text);
  if (!parts) return fail('protected');
  const percent = M.currentProgress(text, task.id) ?? 0, pad = '  '.repeat(row.depth + 1);
  const subtree = rows.slice(row.index + 1, row.subtreeEndIndex);
  // The subtasks (with what is under them) go on with the new line; its own properties stay as the day's record.
  const carried = new Set<string>();
  for (const child of subtree) if ((child.kind === 'task' || child.kind === 'subcheck') && child.parentLineId === task.id)
    for (const entry of rows.slice(child.index, child.subtreeEndIndex)) carried.add(entry.id);
  const own = subtree.filter(entry => entry.kind === 'property' && entry.parentLineId === task.id);
  const newId = input.newId ?? programId('line');
  const fresh: TextLine[] = [{ id: newId, text: `${'  '.repeat(row.depth)}- [${percent > 0 && percent < 100 ? `${percent}%` : ' '}] ${task.title}` },
    ...own.filter(entry => /^ *-\s+마감:/.test(entry.text)).map(entry => ({ id: programId('line'), text: pad + entry.text.trimStart() })),
    ...doc.lines.filter(entry => carried.has(entry.id))];
  const note = { id: programId('line'), text: `${pad}- 이어감: ${input.today} · ${percent}%` };
  const after = own.at(-1)?.id ?? task.id;
  let end = row.subtreeEndIndex;
  while (end > row.index + 1 && !doc.lines[end - 1].text.trim()) end -= 1;
  const lines: TextLine[] = [];
  doc.lines.forEach((entry, index) => {
    if (!carried.has(entry.id)) lines.push(entry.id === task.id ? { id: entry.id, text: `${parts[1]}>${parts[3]}${parts[4]}${parts[5]}` } : entry);
    if (entry.id === after) lines.push(note);
    if (index === end - 1) lines.push(...fresh);
  });
  const taskScopes = { ...text.taskScopes }, itemScopes = { ...text.itemScopes };
  taskScopes[newId] = taskScopes[task.id]; delete taskScopes[task.id];
  if (Object.hasOwn(itemScopes, task.id)) { itemScopes[newId] = itemScopes[task.id]; delete itemScopes[task.id]; }
  const staged: TextWorkspaceState = { ...text, taskScopes, itemScopes,
    documents: text.documents.map(item => item.id === doc.id ? { ...item, lines } : item),
    progressRecords: text.progressRecords.map(record => record.taskId === task.id ? { ...record, taskId: newId } : record),
    bindings: text.bindings.map(binding => binding.kind === 'task' && binding.taskId === task.id ? { ...binding, taskId: newId } : binding) };
  if (!M.validate(staged)) return fail('unsafe');
  const moved = moveTaskLocation(staged, { documentId: doc.id, taskId: newId, target: { kind: 'date', date: input.today } });
  if (!moved.ok || moved.due !== undefined) return fail(moved.ok ? 'no-heading' : moved.reason);
  const now = M.tasks(moved.next).find(item => item.id === newId);
  if (!now || now.date !== input.today || now.title !== task.title || (M.currentProgress(moved.next, newId) ?? 0) !== percent
    || M.tasks(moved.next).some(item => item.id === task.id) || moved.next.progressRecords.length !== text.progressRecords.length) return fail('meaning-changed');
  return { ok: true, next: moved.next, oldId: task.id, newId, percent };
}

/** A `[>]` line of the writing: the day it is in, where it says it went (its 이어감), and the line that received it
 *  there (W-TXT-05: the same task key in that day's section, in any document), or null when none does (W-TXT-08). */
export type ProgramContinuedLine = { docId: string; lineId: string; title: string; key: string; day: string | null; to: string | null; percent: number | null; received: string | null };
export function programContinuedLines(text: TextWorkspaceState): ProgramContinuedLine[] {
  const byDay = new Map<string, string>();
  for (const task of M.tasks(text)) if (task.date) { const at = `${programSameTaskKey(task.title)}|${task.date}`; if (!byDay.has(at)) byDay.set(at, task.id); }
  const out: ProgramContinuedLine[] = [];
  for (const doc of text.documents) {
    if (!doc.lines.some(line => line.text.includes('[>]'))) continue;
    const rows = M.parseDocument(doc, text).rows;
    for (const row of rows) {
      const parts = PROGRAM_CONTINUED.exec(row.text);
      if (!parts || !parts[3].trim()) continue;
      const note = rows.slice(row.index + 1, row.subtreeEndIndex).map(entry => entry.parentLineId === row.id ? PROGRAM_CONTINUE_LINE.exec(entry.text) : null).find(Boolean);
      const title = parts[3].trim(), key = programSameTaskKey(title), to = note ? note[2] : null;
      out.push({ docId: doc.id, lineId: row.id, title, key, day: row.groupDate, to, percent: note?.[3] ? Number(note[3]) : null, received: null });
    }
  }
  // A line continued again is received too (its own [>] line is that day's line of the task).
  for (const line of out) if (line.day) { const at = `${line.key}|${line.day}`; if (!byDay.has(at)) byDay.set(at, line.lineId); }
  for (const line of out) line.received = line.to ? byDay.get(`${line.key}|${line.to}`) ?? null : null;
  return out;
}

/** '7일째' (총괄 11/12): for each task a continued line reached, the day its chain began (following 이어감 back). */
export function programContinuationStarts(text: TextWorkspaceState): Map<string, string> {
  const lines = programContinuedLines(text), into = new Map<string, ProgramContinuedLine[]>();
  for (const line of lines) if (line.to) { const at = `${line.key}|${line.to}`; into.set(at, [...into.get(at) ?? [], line]); }
  const starts = new Map<string, string>();
  for (const task of M.tasks(text)) {
    if (!task.date) continue;
    let key = programSameTaskKey(task.title), day = task.date, start: string | null = null;
    for (let guard = 0; guard < 400; guard++) {
      const from = (into.get(`${key}|${day}`) ?? []).map(line => line.day).filter((value): value is string => !!value && value < day).sort()[0];
      if (!from) break;
      start = from; day = from;
    }
    if (start) starts.set(task.id, start);
  }
  return starts;
}

/** W-TXT-08: the `[>]` lines of a past day nothing receives any more (today's line deleted or moved off its day, or a
 *  hand-typed `[>]`): the remaining work they stand for, shown again with 어제 남은 일. */
export function programLostContinuations(text: TextWorkspaceState, today: string): ProgramContinuedLine[] {
  return programContinuedLines(text).filter(line => line.received === null && line.day !== null && line.day < today);
}

/** [오늘로] on a lost `[>]` line (W-TXT-08): it is continued again. Its 이어감 says today (with the % it said), and a new
 *  line in today's section (the same folder) takes up the task: that %, its `- 마감:`. Nothing else of the text changes. */
export function reviveProgramContinuation(text: TextWorkspaceState, input: { documentId: string; lineId: string; today: string; newId?: string }): ProgramContinuation {
  const fail = (reason: string): ProgramContinuation => ({ ok: false, reason });
  const lost = programLostContinuations(text, input.today).find(line => line.lineId === input.lineId && line.docId === input.documentId);
  const doc = M.getDocument(text, input.documentId);
  if (!lost || !doc) return fail('not-lost');
  const rows = M.parseDocument(doc, text).rows, row = rows.find(entry => entry.id === input.lineId)!;
  const under = rows.slice(row.index + 1, row.subtreeEndIndex).filter(entry => entry.parentLineId === row.id);
  const note = under.find(entry => PROGRAM_CONTINUE_LINE.test(entry.text)), percent = lost.percent ?? 0, pad = '  '.repeat(row.depth + 1);
  const newId = input.newId ?? programId('line');
  const fresh: TextLine[] = [{ id: newId, text: `${'  '.repeat(row.depth)}- [${percent > 0 && percent < 100 ? `${percent}%` : ' '}] ${lost.title}` },
    ...under.filter(entry => /^ *-\s+마감:/.test(entry.text)).map(entry => ({ id: programId('line'), text: pad + entry.text.trimStart() }))];
  const said = { id: note?.id ?? programId('line'), text: `${pad}- 이어감: ${input.today} · ${percent}%` };
  let end = row.subtreeEndIndex;
  while (end > row.index + 1 && !doc.lines[end - 1].text.trim()) end -= 1;
  const lines: TextLine[] = [];
  doc.lines.forEach((entry, index) => {
    lines.push(note && entry.id === note.id ? said : entry);
    if (!note && entry.id === row.id) lines.push(said);
    if (index === end - 1) lines.push(...fresh);
  });
  const scope = row.ancestorScopeId ?? doc.folderId;
  const staged: TextWorkspaceState = { ...text, taskScopes: { ...text.taskScopes, [newId]: scope }, itemScopes: { ...text.itemScopes, [newId]: scope },
    documents: text.documents.map(item => item.id === doc.id ? { ...item, lines } : item) };
  if (!M.validate(staged)) return fail('unsafe');
  const moved = moveTaskLocation(staged, { documentId: doc.id, taskId: newId, target: { kind: 'date', date: input.today } });
  if (!moved.ok || moved.due !== undefined) return fail(moved.ok ? 'no-heading' : moved.reason);
  const now = M.tasks(moved.next).find(item => item.id === newId);
  if (!now || now.date !== input.today || programLostContinuations(moved.next, input.today).some(line => line.lineId === input.lineId)) return fail('meaning-changed');
  return { ok: true, next: moved.next, oldId: input.lineId, newId, percent };
}
