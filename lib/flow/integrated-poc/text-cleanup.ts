import { programId, type ProgramData, type ProgramPrivateSpace, type ProgramTransition } from './contract';
import { programSame } from './controller';
import { transitionProgramPrivateSpace, type ProgramPrivateMutationBase } from './private-space';
import { programProgressTextPlan, type ProgramProgressTextChange } from './progress-text';
import { applyProgramDateLineChoices, programDateLineAccountPlan, programDateLinesKeepLines, type ProgramDateLineChoices, type ProgramDateLinePlan } from './date-property-migration';
import { programStateHash, programTaskRepeatMembers } from './task-date-move';
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
 *  titled '전환 전 원문 · <when>', made in the same save and kept for good. Each changed document's whole text sits in
 *  fenced blocks (the model reads them as plain text, never as tasks, headings or folders), tagged with the cleanup's
 *  stamp, the document's id and the part's number, the first part also with the document's state hashes before and
 *  after the cleanup; split over several documents when one would pass a document's limits. Each kept line's id carries
 *  its original's (stamp~id), so a restore gives every line its own identity back. */
export const PROGRAM_CLEANUP_ARCHIVE_TITLE = '전환 전 원문';
const ARCHIVE_INFO = 'flowme-original';
const ARCHIVE_LIMITS = { lines: 1000, chars: 90_000 };
const ARCHIVE_INTRO = ['이 글은 보관용 원문입니다. 글을 바꾼 직후라면 [이 원문으로 되돌리기]로 원래대로 돌릴 수 있습니다. 그 뒤라면 필요한 부분을 옮겨 쓰세요. 이 글은 고치지 마세요.', ''];
const archiveOpen = (line: string) => new RegExp(`^(~{4,}) ${ARCHIVE_INFO} (\\S+) (\\S+) ([1-9][0-9]{0,3})/([1-9][0-9]{0,3})(?: ([0-9a-z]{1,16}) ([0-9a-z]{1,16}))?$`).exec(line);
/** Codex 3rd review P1-1 (11/12): every archived document also says how many documents the cleanup changed and which
 *  (a hash of their ids and part counts), so a block gone whole is noticed and nothing is restored. */
const archiveSet = (line: string) => /^~{4} flowme-set (\S+) ([1-9][0-9]{0,3}) ([0-9a-z]{1,16})$/.exec(line);
const archiveSetHash = (docs: readonly { documentId: string; parts: number }[]) => programStateHash(JSON.stringify(docs.map(doc => `${doc.documentId}:${doc.parts}`).sort()));
const chars = (lines: readonly { text: string }[]) => lines.reduce((sum, line) => sum + line.text.length + 1, 0);
const sortedKeys = (_: string, value: unknown) => value && typeof value === 'object' && !Array.isArray(value)
  ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : value;
/** 총괄 11/12 (Codex re-review): a document's whole state, as a hash: its lines (words and ids), the links from or to
 *  them, the progress records of its lines and their owners. A restore runs only from the state the cleanup left. */
export function programDocumentStateHash(text: TextWorkspaceState, documentId: string): string | null {
  const doc = M.getDocument(text, documentId);
  if (!doc) return null;
  const ids = new Set(doc.lines.map(line => line.id)), by = (value: unknown) => JSON.stringify(value, sortedKeys);
  const pick = (scopes: Record<string, string>) => Object.fromEntries(Object.entries(scopes).filter(([id]) => ids.has(id)));
  return programStateHash(by({
    lines: doc.lines.map(line => [line.id, line.text]),
    bindings: text.bindings.filter(binding => binding.docId === documentId || binding.kind === 'task' && ids.has(binding.taskId)).map(by).sort(),
    records: text.progressRecords.filter(record => ids.has(record.taskId)).map(by).sort(),
    taskScopes: pick(text.taskScopes), itemScopes: pick(text.itemScopes),
  }));
}
type ArchiveLine = { id: string; text: string };
type ArchiveHashes = ReadonlyMap<string, { before: string; after: string }>;
function archiveBlocks(text: TextWorkspaceState, documentIds: readonly string[], stamp: string, hashes: ArchiveHashes, sets: { documentId: string; parts: number }[]): ArchiveLine[][] | null {
  const blocks: ArchiveLine[][] = [];
  for (const id of documentIds) {
    const doc = M.getDocument(text, id), hash = hashes.get(id);
    if (!doc || !hash) return null;
    const longest = Math.max(3, ...doc.lines.map(line => /^ *(~+)/.exec(line.text)?.[1].length ?? 0)), fence = '~'.repeat(longest + 1);
    const kept = doc.lines.map(line => ({ id: `${stamp}~${line.id}`.length <= 160 ? `${stamp}~${line.id}` : programId('line'), text: line.text }));
    const chunks: ArchiveLine[][] = [];
    for (let from = 0; from < kept.length || !chunks.length;) {
      const chunk: ArchiveLine[] = [];
      while (from < kept.length && chunk.length < ARCHIVE_LIMITS.lines && chars(chunk) + kept[from].text.length + 1 <= ARCHIVE_LIMITS.chars) chunk.push(kept[from++]);
      if (!chunk.length && from < kept.length) return null; // one line longer than a document can hold with its frame
      chunks.push(chunk);
    }
    chunks.forEach((chunk, index) => {
      const part = index + 1;
      blocks.push([
        { id: programId('line'), text: `## ${doc.title || '새 문서'}${part > 1 ? ` (${part})` : ''}` },
        { id: programId('line'), text: `${fence} ${ARCHIVE_INFO} ${stamp} ${doc.id} ${part}/${chunks.length}${part === 1 ? ` ${hash.before} ${hash.after}` : ''}` },
        ...chunk, { id: programId('line'), text: fence }, { id: programId('line'), text: '' }]);
    });
    sets.push({ documentId: doc.id, parts: chunks.length });
  }
  return blocks;
}
/** Adds the archived documents holding `documentIds` as they are in `text`. Null when the account cannot take them. */
function programArchiveOriginals(text: TextWorkspaceState, documentIds: readonly string[], stamp: string, title: string, hashes: ArchiveHashes): { text: TextWorkspaceState; ids: string[] } | null {
  const sets: { documentId: string; parts: number }[] = [], blocks = archiveBlocks(text, documentIds, stamp, hashes, sets);
  if (!blocks) return null;
  const set = `~~~~ flowme-set ${stamp} ${sets.length} ${archiveSetHash(sets)}`;
  const intro = () => [...ARCHIVE_INTRO, set, '~~~~', ''].map(line => ({ id: programId('line'), text: line }));
  const parts: ArchiveLine[][] = [];
  let part = intro();
  for (const block of blocks) {
    if (part.length > ARCHIVE_INTRO.length + 3 && (part.length + block.length > 1150 || chars(part) + chars(block) > 98_000)) { parts.push(part); part = intro(); }
    part.push(...block);
  }
  if (part.length > ARCHIVE_INTRO.length + 3) parts.push(part);
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
export type ProgramCleanupOriginal = { documentId: string; raw: string; ids: (string | null)[]; before: string | null; after: string | null; parts: number };
/** The originals a stamp kept, one per document in the order kept: the words, each line's original id (null when the
 *  archive no longer knows it), and the document's state hashes before and after the cleanup. */
export function programCleanupArchive(text: TextWorkspaceState, stamp: string): ProgramCleanupOriginal[] {
  const parts = new Map<string, Map<number, { lines: { id: string; text: string }[]; total: number; before: string | null; after: string | null }>>();
  for (const doc of text.documents) {
    for (let index = 0; index < doc.lines.length; index++) {
      const open = archiveOpen(doc.lines[index].text);
      if (!open || open[2] !== stamp) continue;
      const end = doc.lines.findIndex((line, at) => at > index && new RegExp(`^~{${open[1].length},}\\s*$`).test(line.text));
      if (end < 0) continue;
      if (!parts.has(open[3])) parts.set(open[3], new Map());
      parts.get(open[3])!.set(Number(open[4]), { lines: doc.lines.slice(index + 1, end), total: Number(open[5]), before: open[6] ?? null, after: open[7] ?? null });
      index = end;
    }
  }
  return [...parts].flatMap(([documentId, chunks]) => {
    const numbers = [...chunks.keys()].sort((a, b) => a - b), total = chunks.get(1)?.total ?? 0;
    // A part missing (or parts disagreeing on how many there are): never write half a document back.
    if (numbers.length !== total || numbers.some((number, at) => number !== at + 1 || chunks.get(number)!.total !== total)) return [];
    const lines = numbers.flatMap(number => chunks.get(number)!.lines), first = chunks.get(1)!;
    return [{ documentId, raw: lines.map(line => line.text).join('\n'), ids: lines.map(line => line.id.startsWith(`${stamp}~`) ? line.id.slice(stamp.length + 1) : null),
      before: first.before, after: first.after, parts: total }];
  });
}
/** Every document the cleanup changed is in the archive, each whole (Codex 3rd review P1-1): the set line says which. */
export function programCleanupArchiveIntact(text: TextWorkspaceState, stamp: string, originals: readonly ProgramCleanupOriginal[]): boolean {
  const sets = text.documents.flatMap(doc => doc.lines.map(line => archiveSet(line.text)).filter((set): set is RegExpExecArray => !!set && set[1] === stamp));
  return sets.length > 0 && sets.every(set => Number(set[2]) === originals.length && set[3] === archiveSetHash(originals));
}
/** The stamp an archived original holds (null for any other document). */
export function programCleanupArchiveStamp(text: TextWorkspaceState, documentId: string): string | null {
  const doc = M.getDocument(text, documentId);
  if (!doc || !doc.title.startsWith(PROGRAM_CLEANUP_ARCHIVE_TITLE)) return null;
  for (const line of doc.lines) { const open = archiveOpen(line.text); if (open) return open[2]; }
  return null;
}
/** The archived document that holds a stamp's first part (the one to open). */
export function programCleanupArchiveDocument(space: ProgramPrivateSpace, stamp: string): string | null {
  return space.archivedDocumentIds.find(id => programCleanupArchiveStamp(space.text, id) === stamp) ?? null;
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
    const hashes = new Map(documents.map(id => [id, { before: programDocumentStateHash(space.text, id)!, after: programDocumentStateHash(next, id)! }]));
    // The originals as they were before this save, archived in it.
    const archived = programArchiveOriginals(space.text, documents, stamp, `${PROGRAM_CLEANUP_ARCHIVE_TITLE} · ${input.when}`, hashes);
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

/** 되돌리기 (총괄 11/12, after Codex's re-review: simple and safe, no merging). The originals are written back only while
 *  every document the cleanup changed is exactly as it left it (its state hash: words, line ids, links, records,
 *  owners); then each one is exactly as before it, which is checked the same way. Anything changed since (a check, a
 *  continuation, a move, a line) refuses it ('conflict'): the archived original stays, to take what is needed from. */
export function restoreProgramTextCleanup(data: ProgramData, input: ProgramPrivateMutationBase & { stamp: string }): ProgramTransition<string> {
  return transitionProgramPrivateSpace(data, input, 'private-text-cleanup-restore', { stamp: input.stamp }, space => {
    const blocks = programCleanupArchive(space.text, input.stamp);
    if (!blocks.length || !programCleanupArchiveIntact(space.text, input.stamp, blocks) || blocks.some(block => !block.before || !block.after || block.ids.some(id => id === null)
      || !space.text.documents.some(doc => doc.id === block.documentId) || space.archivedDocumentIds.includes(block.documentId))) return { result: input.stamp, reason: 'missing' };
    const now = blocks.map(block => programDocumentStateHash(space.text, block.documentId));
    if (blocks.every((block, index) => now[index] === block.before)) return { result: input.stamp }; // already back
    if (blocks.some((block, index) => now[index] !== block.after)) return { result: input.stamp, reason: 'conflict' };
    let text = space.text;
    for (const block of blocks) {
      const edited = M.editTextResult(text, block.documentId, block.raw, { folderText: true, lineIds: block.ids });
      if (edited.reason !== null) return { result: input.stamp, reason: 'unresolved' };
      text = edited.state;
    }
    if (!M.validate(text) || blocks.some(block => programDocumentStateHash(text, block.documentId) !== block.before)) return { result: input.stamp, reason: 'unresolved' };
    space.text = text;
    return { result: input.stamp };
  });
}