import { programId, type ProgramData, type ProgramPrivateSpace, type ProgramTransition } from './contract';
import { programSame } from './controller';
import { transitionProgramPrivateSpace, type ProgramPrivateMutationBase } from './private-space';
import { programProgressTextPlan, type ProgramProgressTextChange } from './progress-text';
import { applyProgramDateLineChoices, programDateLineAccountPlan, programDateLinesKeepLines, type ProgramDateLineChoices, type ProgramDateLinePlan } from './date-property-migration';
import { programTaskRepeatMembers } from './task-date-move';
import { textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';

/** Redesign 1 + 3 (W-TXT-01·03, 총괄 11/12): the account's writing is brought to the new rules once, as one list asked
 *  when the app opens: a box line's progress (latest record 1-99) into its text as [n%], and the '- 날짜:' lines
 *  (date-property-migration.ts). [바꾸기] applies all of it in one save, and 되돌리기 puts the whole writing back in one save.
 *  The snapshot is that save's own record: Alpha keeps every private save with its inverse (↶ takes the whole text back),
 *  and the screen holds the writing before it for [되돌리기]. Saved revisions (저장본) are not written: an Alpha client
 *  command may not change them (ALPHA_M3_FIELDS). */
export type ProgramTextCleanupPlan = {
  progress: { documentId: string; title: string; changes: ProgramProgressTextChange[] }[];
  dates: ProgramDateLinePlan[];
  progressLines: number; dateLines: number;
};

/** The account's list; null when nothing is left to bring over. */
export function programTextCleanupPlan(space: ProgramPrivateSpace): ProgramTextCleanupPlan | null {
  const repeats = programTaskRepeatMembers(space);
  const progress = space.text.documents.flatMap(doc => {
    const changes = programProgressTextPlan(space, doc.id, repeats);
    return changes.length ? [{ documentId: doc.id, title: doc.title || '새 문서', changes }] : [];
  });
  const dates = programDateLineAccountPlan(space);
  if (!progress.length && !dates.length) return null;
  return { progress, dates, progressLines: progress.reduce((sum, doc) => sum + doc.changes.length, 0), dateLines: dates.reduce((sum, doc) => sum + doc.lines, 0) };
}

/** The documents a plan changes, in document order. */
export const programTextCleanupDocuments = (plan: ProgramTextCleanupPlan) => [...new Set([...plan.progress.map(doc => doc.documentId), ...plan.dates.map(doc => doc.documentId)])];

/** The plan, with these date choices, on the text (no snapshot): progress tokens first, then the date lines. Null when
 *  anything would change that should not (W-TXT-03's line check included). */
export function applyProgramTextCleanupText(text: TextWorkspaceState, plan: ProgramTextCleanupPlan, choices: ProgramDateLineChoices): TextWorkspaceState | null {
  let next = text;
  for (const doc of plan.progress) {
    const after = new Map(doc.changes.map(change => [change.lineId, change])), current = M.getDocument(next, doc.documentId);
    if (!current || doc.changes.some(change => current.lines.find(line => line.id === change.lineId)?.text !== change.before)) return null;
    next = { ...next, documents: next.documents.map(item => item.id === doc.documentId ? { ...item, lines: item.lines.map(line => after.has(line.id) ? { id: line.id, text: after.get(line.id)!.after } : line) } : item) };
  }
  if (!M.validate(next) || !programSame(text.progressRecords, next.progressRecords)) return null;
  const progressed = next;
  for (const doc of plan.dates) {
    const changed = applyProgramDateLineChoices(next, doc, choices);
    if (!changed) return null;
    next = changed;
  }
  return programDateLinesKeepLines(progressed, next) && M.validate(next) ? next : null;
}

/** 총괄 11/12 ①: the snapshot is kept in the writing itself, so it outlives this visit and any history: archived documents
 *  titled '전환 전 원문 · <when>', made in the same save. Each changed document's whole text sits in fenced blocks (the
 *  model reads them as plain text, never as tasks, headings or folders), tagged with the cleanup's stamp, the
 *  document's id and the part's number; split over several documents when one would pass a document's limits. Each
 *  kept line's id carries its original's (stamp~id), so a restore gives the lines their identities back (records,
 *  folders and links stay theirs) without guessing from the words. */
export const PROGRAM_CLEANUP_ARCHIVE_TITLE = '전환 전 원문', PROGRAM_CLEANUP_RESTORE_TITLE = '되돌리기 전 원문';
const ARCHIVE_INFO = 'flowme-original';
const ARCHIVE_LIMITS = { lines: 1000, chars: 90_000 };
const ARCHIVE_INTRO = ['이 글은 보관용 원문입니다. [이 원문으로 되돌리기]를 누르면 아래 원문을 원래 글에 다시 써 넣습니다. 이 글은 고치지 마세요.', ''];
const archiveOpen = (line: string) => new RegExp(`^(~{4,}) ${ARCHIVE_INFO} (\\S+) (\\S+) ([1-9][0-9]{0,3})$`).exec(line);
const chars = (lines: readonly { text: string }[]) => lines.reduce((sum, line) => sum + line.text.length + 1, 0);
type ArchiveLine = { id: string; text: string };
function archiveBlocks(text: TextWorkspaceState, documentIds: readonly string[], stamp: string): ArchiveLine[][] | null {
  const blocks: ArchiveLine[][] = [];
  for (const id of documentIds) {
    const doc = M.getDocument(text, id);
    if (!doc) continue;
    const longest = Math.max(3, ...doc.lines.map(line => /^ *(~+)/.exec(line.text)?.[1].length ?? 0)), fence = '~'.repeat(longest + 1);
    const kept = doc.lines.map(line => ({ id: `${stamp}~${line.id}`.length <= 160 ? `${stamp}~${line.id}` : programId('line'), text: line.text }));
    let part = 0;
    for (let from = 0; from < kept.length || part === 0;) {
      const chunk: ArchiveLine[] = [];
      while (from < kept.length && chunk.length < ARCHIVE_LIMITS.lines && chars(chunk) + kept[from].text.length + 1 <= ARCHIVE_LIMITS.chars) chunk.push(kept[from++]);
      if (!chunk.length && from < kept.length) return null; // one line longer than a document can hold with its frame
      part += 1;
      blocks.push([
        { id: programId('line'), text: `## ${doc.title || '새 문서'}${part > 1 ? ` (${part})` : ''}` },
        { id: programId('line'), text: `${fence} ${ARCHIVE_INFO} ${stamp} ${doc.id} ${part}` },
        ...chunk, { id: programId('line'), text: fence }, { id: programId('line'), text: '' }]);
    }
  }
  return blocks;
}
/** Adds the archived documents holding `documentIds` as they are in `text`. Null when the account cannot take them. */
export function programArchiveOriginals(text: TextWorkspaceState, documentIds: readonly string[], stamp: string, title: string): { text: TextWorkspaceState; ids: string[] } | null {
  const blocks = archiveBlocks(text, documentIds, stamp);
  if (!blocks) return null;
  const intro = () => ARCHIVE_INTRO.map(line => ({ id: programId('line'), text: line }));
  const parts: ArchiveLine[][] = [];
  let part = intro();
  for (const block of blocks) {
    if (part.length > ARCHIVE_INTRO.length && (part.length + block.length > 1150 || chars(part) + chars(block) > 98_000)) { parts.push(part); part = intro(); }
    part.push(...block);
  }
  if (part.length > ARCHIVE_INTRO.length) parts.push(part);
  let next = text;
  const ids: string[] = [];
  for (const [index, lines] of parts.entries()) {
    const added = M.addDocument(next, { title: parts.length > 1 ? `${title} (${index + 1})` : title });
    if (added === next) return null;
    const doc = added.documents.find(item => !next.documents.some(old => old.id === item.id))!;
    next = { ...added, documents: added.documents.map(item => item.id === doc.id ? { ...item, lines } : item) };
    ids.push(doc.id);
  }
  return M.validate(next) ? { text: next, ids } : null;
}
/** The originals a stamp kept, one per document in the order kept: the words, and each line's original id (null when
 *  the archive no longer knows it). */
export function programCleanupArchive(text: TextWorkspaceState, stamp: string): { documentId: string; raw: string; ids: (string | null)[] }[] {
  const parts = new Map<string, Map<number, { id: string; text: string }[]>>();
  for (const doc of text.documents) {
    for (let index = 0; index < doc.lines.length; index++) {
      const open = archiveOpen(doc.lines[index].text);
      if (!open || open[2] !== stamp) continue;
      const end = doc.lines.findIndex((line, at) => at > index && new RegExp(`^~{${open[1].length},}\\s*$`).test(line.text));
      if (end < 0) continue;
      if (!parts.has(open[3])) parts.set(open[3], new Map());
      parts.get(open[3])!.set(Number(open[4]), doc.lines.slice(index + 1, end));
      index = end;
    }
  }
  return [...parts].flatMap(([documentId, chunks]) => {
    const numbers = [...chunks.keys()].sort((a, b) => a - b);
    if (numbers.some((number, at) => number !== at + 1)) return []; // a part is missing: never write half a document back
    const lines = numbers.flatMap(number => chunks.get(number)!);
    return [{ documentId, raw: lines.map(line => line.text).join('\n'), ids: lines.map(line => line.id.startsWith(`${stamp}~`) ? line.id.slice(stamp.length + 1) : null) }];
  });
}
/** The stamp an archived original holds (null for any other document). */
export function programCleanupArchiveStamp(text: TextWorkspaceState, documentId: string): string | null {
  const doc = M.getDocument(text, documentId);
  if (!doc || ![PROGRAM_CLEANUP_ARCHIVE_TITLE, PROGRAM_CLEANUP_RESTORE_TITLE].some(title => doc.title.startsWith(title))) return null;
  for (const line of doc.lines) { const open = archiveOpen(line.text); if (open) return open[2]; }
  return null;
}

/** [바꾸기]: only while the account reads the same list; one save, the originals archived in it ('전환 전 원문 · when'). The
 *  result is the stamp 되돌리기 restores from. */
export function applyProgramTextCleanup(data: ProgramData, input: ProgramPrivateMutationBase & { plan: ProgramTextCleanupPlan; choices: ProgramDateLineChoices; when: string }): ProgramTransition<string> {
  const fields = {
    progress: input.plan.progress.map(doc => ({ documentId: doc.documentId, changes: doc.changes.map(change => ({ lineId: change.lineId, before: change.before, after: change.after })) })),
    dates: input.plan.dates.map(doc => ({ documentId: doc.documentId, items: doc.items.map(item => ({ ownerId: item.ownerId, lineIds: item.lineIds, value: item.value, kind: item.kind })) })),
    choices: input.choices, when: input.when,
  };
  return transitionProgramPrivateSpace(data, input, 'private-text-cleanup', fields, space => {
    const plan = programTextCleanupPlan(space);
    if (!plan || !programSame(plan, input.plan)) return { result: '', reason: 'conflict' };
    if (!PROGRAM_WHEN.test(input.when)) return { result: '', reason: 'invalid' };
    const documents = programTextCleanupDocuments(plan), stamp = programId('cleanup');
    const next = applyProgramTextCleanupText(space.text, plan, input.choices);
    if (!next) return { result: stamp, reason: 'unresolved' };
    // The originals as they were before this save, archived in it.
    const archived = programArchiveOriginals(space.text, documents, stamp, `${PROGRAM_CLEANUP_ARCHIVE_TITLE} · ${input.when}`);
    if (!archived) return { result: stamp, reason: 'limit' };
    const added = archived.text.documents.filter(doc => archived.ids.includes(doc.id));
    space.text = { ...next, documents: [...next.documents, ...added] };
    if (!M.validate(space.text)) return { result: stamp, reason: 'unresolved' };
    space.archivedDocumentIds = [...space.archivedDocumentIds, ...archived.ids];
    return { result: stamp };
  });
}
const PROGRAM_WHEN = /^[0-9][0-9 :.-]{0,39}$/;
/** The archive title's time: this device's date and minute, 'YYYY-MM-DD HH:MM'. */
export const programCleanupWhen = (now: Date) => {
  const two = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())} ${two(now.getHours())}:${two(now.getMinutes())}`;
};

/** A check the person made since (a box's done state, or 100%) stays: only the words the cleanup changed go back. */
function keepLaterChecks(text: TextWorkspaceState, documentId: string, lines: string[], ids: (string | null)[]): string[] {
  const now = new Map(M.getDocument(text, documentId)!.lines.map(line => [line.id, line.text]));
  return lines.map((line, index) => {
    const box = /^( *-\s+\[)([ xX])(\](?:\s+|$))/.exec(line), current = ids[index] ? now.get(ids[index]!) : undefined;
    const token = current === undefined ? undefined : /^ *-\s+\[([^\]\r\n]*)\](?:\s+|$)/.exec(current)?.[1];
    if (!box || token === undefined) return line;
    const numeric = M.parseProgressToken(token), done = /^[ xX]$/.test(token) ? token.toLowerCase() === 'x' : numeric.ok ? numeric.percent === 100 : null;
    if (done === null || done === (box[2].toLowerCase() === 'x')) return line;
    return box[1] + (done ? 'x' : ' ') + line.slice(box[1].length + 1);
  });
}

/** 되돌리기 (총괄 11/12 ①): the originals an archive holds are written back into their documents, from any visit (no
 *  history or memory needed), each line with its own identity. What those documents say now is archived first
 *  ('되돌리기 전 원문 · when', which can itself be restored), in the same save, so nothing written since is lost. A
 *  document no longer there is left out; a check made since stays. */
export function restoreProgramTextCleanup(data: ProgramData, input: ProgramPrivateMutationBase & { stamp: string; when: string }): ProgramTransition<string> {
  return transitionProgramPrivateSpace(data, input, 'private-text-cleanup-restore', { stamp: input.stamp, when: input.when }, space => {
    if (!PROGRAM_WHEN.test(input.when)) return { result: input.stamp, reason: 'invalid' };
    const blocks = programCleanupArchive(space.text, input.stamp)
      .filter(block => space.text.documents.some(doc => doc.id === block.documentId && !space.archivedDocumentIds.includes(doc.id)))
      .map(block => ({ ...block, raw: keepLaterChecks(space.text, block.documentId, block.raw.split('\n'), block.ids).join('\n') }));
    if (!blocks.length) return { result: input.stamp, reason: 'missing' };
    const changed = blocks.filter(block => M.raw(M.getDocument(space.text, block.documentId)!) !== block.raw);
    if (!changed.length) return { result: input.stamp };
    const archived = programArchiveOriginals(space.text, changed.map(block => block.documentId), programId('cleanup'), `${PROGRAM_CLEANUP_RESTORE_TITLE} · ${input.when}`);
    if (!archived) return { result: input.stamp, reason: 'limit' };
    let text = archived.text;
    for (const block of changed) {
      const edited = M.editTextResult(text, block.documentId, block.raw, { folderText: true, lineIds: block.ids });
      if (edited.reason !== null || M.raw(M.getDocument(edited.state, block.documentId)!) !== block.raw) return { result: input.stamp, reason: 'unresolved' };
      text = edited.state;
    }
    if (!M.validate(text)) return { result: input.stamp, reason: 'unresolved' };
    space.text = text;
    space.archivedDocumentIds = [...space.archivedDocumentIds, ...archived.ids];
    return { result: input.stamp };
  });
}