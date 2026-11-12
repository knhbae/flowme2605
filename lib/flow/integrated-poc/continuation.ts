import { programId } from './contract';
import { programSameTaskKey } from './continue-band';
import { moveTaskLocation, readTaskLocationSource } from './task-location-move';
import { textWorkspaceModel as M, type TextLine, type TextRow, type TextTask, type TextWorkspaceState } from './text-workspace';

/** Redesign 4 (W-MENU-25, W-TXT-04·05·08; 총괄 11/12: the text alone). A task with a record taken to today is continued:
 *  yesterday's line stays as that day's record, `[>]` with `- 이어감: YYYY-MM-DD · n%` under it, and a new line in
 *  today's section (same folder) carries on its current state: its progress `[n%]`, its `- 마감:` (also left on the old
 *  line), its subtasks. The old line's memo and time stay with the record. No ID suffix and no new account key: the old
 *  line's owner, progress records and links pass to the new line (the old one is no task any more), and the two lines
 *  are found again by the same task key in the 이어감 day's section. */
export const PROGRAM_CONTINUED = /^( *-\s+\[)>(\](?:\s+|$))(.*?)(\s*)$/;
export const PROGRAM_CONTINUE_LINE = /^( *-\s+)이어감:\s*(\d{4}-\d{2}-\d{2})(?:\s*·\s*(\d{1,3})%)?\s*$/;
const TASK = /^( *-\s+\[)([^\]\r\n]*)(\](?:\s+|$))(.*?)(\s*)$/;

const partial = (text: TextWorkspaceState, id: string) => { const percent = M.currentProgress(text, id) ?? 0; return percent > 0 && percent < 100 ? percent : 0; };
/** A record (W-MENU-25, 기획 안 A): progress 1-99 (text or latest record), a checked subtask, or a memo under it.
 *  오늘 탭 ② (mockup ③, Fable): a subtask with progress 1-99 is one too (the whole block is then copied). */
export function programTaskHasRecord(text: TextWorkspaceState, task: TextTask): boolean {
  return partial(text, task.id) > 0 || task.subchecks.some(sub => sub.done || partial(text, sub.id) > 0) || !!task.note.trim();
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
  // 오늘 탭 ② (mockup ③, Fable: a line with progress has its own 이어감): a direct subtask at 1-99% stays on the day as
  // `[>]` with its own `- 이어감: today · n%`, and a copy (a new id taking its records) goes on under the new line.
  const parted = new Map<string, { newId: string; percent: number; own: Set<string>; after: string }>();
  for (const child of subtree) {
    if (child.kind !== 'task' && child.kind !== 'subcheck' || child.parentLineId !== task.id || child.done || !TASK.test(doc.lines[child.index].text)) continue;
    const share = partial(text, child.id);
    if (!share) continue;
    const own = rows.slice(child.index + 1, child.subtreeEndIndex).filter(entry => entry.kind === 'property' && entry.parentLineId === child.id);
    parted.set(child.id, { newId: programId('line'), percent: share, own: new Set(own.map(entry => entry.id)), after: own.at(-1)?.id ?? child.id });
  }
  // The subtasks (with what is under them) go on with the new line; its own properties stay as the day's record.
  const carried = new Set<string>();
  for (const child of subtree) if ((child.kind === 'task' || child.kind === 'subcheck') && child.parentLineId === task.id)
    for (const entry of rows.slice(child.index, child.subtreeEndIndex)) if (!parted.has(child.id) || entry.id !== child.id && !parted.get(child.id)!.own.has(entry.id)) carried.add(entry.id);
  const own = subtree.filter(entry => entry.kind === 'property' && entry.parentLineId === task.id);
  const newId = input.newId ?? programId('line');
  const copyOf = (entry: TextRow) => { const share = parted.get(entry.id)!; return { id: share.newId, text: `${'  '.repeat(entry.depth)}- [${share.percent}%] ${entry.title}` }; };
  const fresh: TextLine[] = [{ id: newId, text: `${'  '.repeat(row.depth)}- [${percent > 0 && percent < 100 ? `${percent}%` : ' '}] ${task.title}` },
    ...own.filter(entry => /^ *-\s+마감:/.test(entry.text)).map(entry => ({ id: programId('line'), text: pad + entry.text.trimStart() })),
    ...subtree.flatMap(entry => parted.has(entry.id) ? [copyOf(entry)] : carried.has(entry.id) ? [doc.lines[entry.index]] : [])];
  const note = { id: programId('line'), text: `${pad}- 이어감: ${input.today} · ${percent}%` };
  const notes = new Map([...parted].map(([id, share]) => [share.after, { id: programId('line'), text: `${'  '.repeat(rows.find(entry => entry.id === id)!.depth + 1)}- 이어감: ${input.today} · ${share.percent}%` }]));
  const after = own.at(-1)?.id ?? task.id;
  let end = row.subtreeEndIndex;
  while (end > row.index + 1 && !doc.lines[end - 1].text.trim()) end -= 1;
  const mark = (entry: TextLine) => { const own = TASK.exec(entry.text)!; return { id: entry.id, text: `${own[1]}>${own[3]}${own[4]}${own[5]}` }; };
  const lines: TextLine[] = [];
  doc.lines.forEach((entry, index) => {
    if (!carried.has(entry.id)) lines.push(entry.id === task.id ? { id: entry.id, text: `${parts[1]}>${parts[3]}${parts[4]}${parts[5]}` } : parted.has(entry.id) ? mark(entry) : entry);
    if (entry.id === after) lines.push(note);
    if (notes.has(entry.id)) lines.push(notes.get(entry.id)!);
    if (index === end - 1) lines.push(...fresh);
  });
  const renamed = new Map([[task.id, newId], ...[...parted].map(([id, share]) => [id, share.newId] as [string, string])]);
  const taskScopes = { ...text.taskScopes }, itemScopes = { ...text.itemScopes };
  taskScopes[newId] = taskScopes[task.id]; delete taskScopes[task.id];
  for (const [from, to] of renamed) if (Object.hasOwn(itemScopes, from)) { itemScopes[to] = itemScopes[from]; delete itemScopes[from]; }
  const staged: TextWorkspaceState = { ...text, taskScopes, itemScopes,
    documents: text.documents.map(item => item.id === doc.id ? { ...item, lines } : item),
    progressRecords: text.progressRecords.map(record => renamed.has(record.taskId) ? { ...record, taskId: renamed.get(record.taskId)! } : record),
    bindings: text.bindings.map(binding => binding.kind === 'task' && renamed.has(binding.taskId) ? { ...binding, taskId: renamed.get(binding.taskId)! } : binding) };
  if (!M.validate(staged)) return fail('unsafe');
  const moved = moveTaskLocation(staged, { documentId: doc.id, taskId: newId, target: { kind: 'date', date: input.today } });
  if (!moved.ok || moved.due !== undefined) return fail(moved.ok ? 'no-heading' : moved.reason);
  const now = M.tasks(moved.next).find(item => item.id === newId);
  if (!now || now.date !== input.today || now.title !== task.title || (M.currentProgress(moved.next, newId) ?? 0) !== percent
    || [...parted.values()].some(share => (M.currentProgress(moved.next, share.newId) ?? 0) !== share.percent || !now.subchecks.some(sub => sub.id === share.newId))
    || M.tasks(moved.next).some(item => item.id === task.id) || moved.next.progressRecords.length !== text.progressRecords.length) return fail('meaning-changed');
  return { ok: true, next: moved.next, oldId: task.id, newId, percent };
}

/** A folder told by its whole path of names from the top ('' for none or 미분류): the same '- /name' in another document
 *  is the same folder by name; the same last name under another parent is another folder (Codex 3rd review P2-3). */
export function programFolderPath(text: TextWorkspaceState, id: string | null | undefined): string {
  const names: string[] = [];
  for (let at = id && id !== 'folder-unfiled' ? text.folders.find(folder => folder.id === id) : undefined, steps = 0; at && steps < 20; at = at.parentId ? text.folders.find(folder => folder.id === at!.parentId) : undefined, steps++) names.unshift(at.title);
  return names.join('/');
}

/** A `[>]` line of the writing: the day it is in, where it says it went (its 이어감), and the line that received it
 *  there (W-TXT-05: the same task key in that day's section, in any document), or null when none does (W-TXT-08).
 *  Codex re-review P1-1: the receiver is in the same folder as the `[>]` line (a task of the same words in another
 *  folder is another task), the one in the same document first; when two or more remain it is not guessed
 *  (`ambiguous`: not lost either, and no chain is counted through it). Codex 3rd review (11/12): a folder is its whole
 *  path, a line outside any '- /folder' line is in its document's folder (the `[>]` line and the task alike); two or
 *  more past lines on one receiving line are ambiguous too; a `[>]` in a code block is no line of work. */
export type ProgramContinuedLine = { docId: string; lineId: string; title: string; key: string; day: string | null; to: string | null; percent: number | null; received: string | null;
  scope: string; ambiguous: boolean };
export function programContinuedLines(text: TextWorkspaceState): ProgramContinuedLine[] {
  type Candidate = { id: string; docId: string; scope: string };
  const byDay = new Map<string, Candidate[]>(), add = (at: string, entry: Candidate) => byDay.set(at, [...byDay.get(at) ?? [], entry]);
  // A folder is told by its whole path of names (the same '- /name' in another document may be its own folder of that
  // name; the same last name under another parent is another folder).
  const named = (id: string | null | undefined) => programFolderPath(text, id);
  for (const task of M.tasks(text)) if (task.date) add(`${programSameTaskKey(task.title)}|${task.date}`, { id: task.id, docId: task.docId, scope: named(task.scopeId) });
  const out: ProgramContinuedLine[] = [];
  // 오늘 탭 ② (mockup ③): a `[>]` subtask under a `[>]` line is received under its parent's receiving line only.
  const under = new Map<string, string>();
  for (const doc of text.documents) {
    if (!doc.lines.some(line => line.text.includes('[>]'))) continue;
    const rows = M.parseDocument(doc, text).rows, continuedHere = new Set<string>();
    for (const row of rows) {
      const parts = row.kind === 'fence' ? null : PROGRAM_CONTINUED.exec(row.text);
      if (!parts || !parts[3].trim()) continue;
      if (row.parentLineId && continuedHere.has(row.parentLineId)) under.set(row.id, row.parentLineId);
      continuedHere.add(row.id);
      const note = rows.slice(row.index + 1, row.subtreeEndIndex).map(entry => entry.parentLineId === row.id ? PROGRAM_CONTINUE_LINE.exec(entry.text) : null).find(Boolean);
      const title = parts[3].trim(), key = programSameTaskKey(title), to = note ? note[2] : null;
      out.push({ docId: doc.id, lineId: row.id, title, key, day: row.groupDate, to, percent: note?.[3] ? Number(note[3]) : null, received: null,
        scope: named(row.ancestorScopeKind === 'folder' && row.ancestorScopeId ? row.ancestorScopeId : doc.folderId), ambiguous: false });
    }
  }
  // A line continued again is received too (its own [>] line is that day's line of the task).
  for (const line of out) if (line.day && !under.has(line.lineId)) add(`${line.key}|${line.day}`, { id: line.lineId, docId: line.docId, scope: line.scope });
  for (const line of out) {
    if (!line.to || under.has(line.lineId)) continue;
    const same = (byDay.get(`${line.key}|${line.to}`) ?? []).filter(entry => entry.scope === line.scope && entry.id !== line.lineId);
    const here = same.filter(entry => entry.docId === line.docId), pick = here.length ? here : same;
    if (pick.length === 1) line.received = pick[0].id; else if (pick.length > 1) line.ambiguous = true;
  }
  // The subtask lines, parents first: the one subtask (or `[>]` subtask) of the same key under the parent's receiving
  // line, for the same day; never a guess (none or two: not received).
  if (under.size) {
    const byId = new Map(out.map(line => [line.lineId, line])), subs = new Map(M.tasks(text).map(task => [task.id, task.subchecks]));
    const children = new Map<string, ProgramContinuedLine[]>();
    for (const line of out) { const parent = under.get(line.lineId); if (parent) children.set(parent, [...children.get(parent) ?? [], line]); }
    for (const line of out) {
      const parent = byId.get(under.get(line.lineId) ?? '');
      if (!parent || !line.to || !line.key || !parent.received || parent.to !== line.to) continue;
      const pool = [...(subs.get(parent.received) ?? []).map(sub => ({ id: sub.id, key: programSameTaskKey(sub.title) })),
        ...(children.get(parent.received) ?? []).map(child => ({ id: child.lineId, key: child.key }))].filter(entry => entry.key === line.key);
      if (pool.length === 1) line.received = pool[0].id; else if (pool.length > 1) line.ambiguous = true;
    }
  }
  // Two or more past lines on one receiving line: which one it took up is not known (Codex 3rd review P2-2).
  const taken = new Map<string, number>();
  for (const line of out) if (line.received) taken.set(line.received, (taken.get(line.received) ?? 0) + 1);
  for (const line of out) if (line.received && taken.get(line.received)! > 1) { line.received = null; line.ambiguous = true; }
  return out;
}

/** '7일째' (총괄 11/12): for each task a continued line reached, the day its chain began (following 이어감 back, line by
 *  line as received: never through a guess). */
export function programContinuationStarts(text: TextWorkspaceState): Map<string, string> {
  const lines = programContinuedLines(text), into = new Map(lines.filter(line => line.received).map(line => [line.received!, line]));
  const starts = new Map<string, string>();
  for (const task of M.tasks(text)) {
    if (!task.date) continue;
    let at = task.id, start: string | null = null;
    for (let guard = 0; guard < 400; guard++) {
      const from = into.get(at);
      if (!from || !from.day || (start ?? task.date) <= from.day) break;
      start = from.day; at = from.lineId;
    }
    if (start) starts.set(task.id, start);
  }
  return starts;
}
/** W-TXT-08: the `[>]` lines of a past day nothing receives any more (today's line deleted or moved off its day, or a
 *  hand-typed `[>]`): the remaining work they stand for, shown again with 어제 남은 일. */
export function programLostContinuations(text: TextWorkspaceState, today: string): ProgramContinuedLine[] {
  return programContinuedLines(text).filter(line => line.received === null && !line.ambiguous && line.day !== null && line.day < today);
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
