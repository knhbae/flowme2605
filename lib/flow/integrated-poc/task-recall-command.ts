import { programId, type ProgramPrivateSpace } from './contract';
import { programContinuedLines } from './continuation';
import { programKeepDueYears } from './task-location-move';
import { createProgramRecallIndex, type ProgramRecallCandidate } from './task-recall';
import { textWorkspaceModel as M, type TextLine, type TextRow, type TextWorkspaceState } from './text-workspace';

const TASK = /^( *-\s+\[)([^\]\r\n]*)(\](?:\s+|$))(.*?)(\s*)$/;
export type ProgramTaskRecallInput = { candidate: ProgramRecallCandidate; documentId: string; lineId: string; expectedLine: string; today: string };
export type ProgramTaskRecallResult = { ok: true; next: TextWorkspaceState; lineId: string; message: string } | { ok: false; reason: 'stale' | 'protected' | 'receiver-contract' | 'ambiguous' | 'unsafe' };

/** Explicit choice, never a fuzzy/title-driven mutation. Both source and receiver belong to this one immutable input.
 * The existing reader's strict receiver contract stays enforced (cross-folder format is a separate pending decision). */
export function recallProgramTask(space: ProgramPrivateSpace, input: ProgramTaskRecallInput): ProgramTaskRecallResult {
  const fail = (reason: Extract<ProgramTaskRecallResult, { ok: false }>['reason']): ProgramTaskRecallResult => ({ ok: false, reason });
  const before = space.text;
  if (!M.validate(before)) return fail('unsafe');
  const chosen = createProgramRecallIndex(space, input.today).find(row => row.lineId === input.candidate.lineId && row.documentId === input.candidate.documentId);
  if (!chosen || JSON.stringify(chosen) !== JSON.stringify(input.candidate)) return fail('stale');
  const source = M.getDocument(before, chosen.documentId), destination = before.documents.find(doc => doc.id === input.documentId);
  if (!source || !destination || source.id === destination.id && chosen.lineId === input.lineId) return fail('protected');
  const sourceRows = M.parseDocumentCached(source, before).rows, destinationRows = M.parseDocumentCached(destination, before).rows;
  const row = sourceRows.find(entry => entry.id === chosen.lineId), target = destinationRows.find(entry => entry.id === input.lineId);
  const scope = before.itemScopes[input.lineId], original = destination.lines.find(line => line.id === input.lineId), typed = original && TASK.exec(original.text);
  if (!row || !target || !original || original.text !== input.expectedLine || !typed || typed[2] !== ' ' || target.groupDate !== input.today
    || !['task', 'subcheck'].includes(target.kind) || !before.folders.some(folder => folder.id === scope)
    || destinationRows.slice(target.index + 1, target.subtreeEndIndex).some(entry => entry.kind !== 'blank')
    || before.progressRecords.some(record => record.taskId === target.id)
    || before.bindings.some(binding => binding.lineId === target.id || binding.kind === 'task' && binding.taskId === target.id)
    || row.id === target.id || source.id === destination.id && target.index > row.index && target.index < row.subtreeEndIndex) return fail('protected');
  const targetCandidate = createProgramRecallIndex(space, input.today).find(entry => entry.lineId === target.id && entry.documentId === destination.id);
  if (!targetCandidate || targetCandidate.done) return fail('protected');
  if (chosen.done) {
    const line = { id: original.id, text: `${typed[1]} ${typed[3]}${chosen.title}` };
    const next = { ...before, documents: before.documents.map(doc => doc.id === destination.id ? { ...doc, lines: doc.lines.map(entry => entry.id === target.id ? line : entry) } : doc) };
    return M.validate(next) ? { ok: true, next, lineId: target.id, message: '같은 제목으로 새 할 일을 시작했습니다' } : fail('unsafe');
  }
  const block = sourceRows.slice(row.index, row.subtreeEndIndex);
  while (block.at(-1)?.kind === 'blank') block.pop();
  const ids = new Set(block.map(entry => entry.id));
  const available = new Set(createProgramRecallIndex(space, input.today).map(entry => entry.lineId));
  if (block.some(entry => entry.kind === 'scope' || entry.isReference || ['task', 'subcheck'].includes(entry.kind) && !available.has(entry.id))
    || before.bindings.some(binding => ids.has(binding.lineId) || binding.kind === 'task' && ids.has(binding.taskId))) return fail('protected');
  if (chosen.day !== null && (chosen.folder !== targetCandidate.folder || target.kind === 'subcheck')) return fail('receiver-contract');
  const moved = new Set<string>(), replacements = new Map<string, TextLine>(), insertions = new Map<string, TextLine[]>(), renamed = new Map<string, string>();
  const rowMap = new Map(sourceRows.map(entry => [entry.id, entry]));
  const fenceBodies = new Set<string>();
  let fence: { character: string; length: number } | null = null;
  for (const line of source.lines) {
    const mark = /^ *(`{3,}|~{3,})(.*)$/.exec(line.text);
    if (fence) {
      if (mark && mark[1][0] === fence.character && mark[1].length >= fence.length && !mark[2].trim()) fence = null;
      else fenceBodies.add(line.id);
    } else if (mark) fence = { character: mark[1][0], length: mark[1].length };
  }
  const pad = (depth: number) => '  '.repeat(depth), mark = (entry: TextRow) => { const parts = TASK.exec(entry.text)!; return { id: entry.id, text: `${parts[1]}>${parts[3]}${parts[4]}${parts[5]}` }; };
  const fromIndent = /^ */.exec(row.text)![0], toIndent = /^ */.exec(original.text)![0];
  // As the existing trash mover does: only the block's outer prefix changes. A parser deliberately assigns the
  // fence-opening depth to every payload line; that depth must never be used to rewrite the payload's whitespace.
  const rebase = (line: TextLine): TextLine | null => {
    if (fromIndent === toIndent || !line.text.trim() || fenceBodies.has(line.id)) return { id: line.id, text: line.text };
    return line.text.startsWith(fromIndent) ? { id: line.id, text: toIndent + line.text.slice(fromIndent.length) } : null;
  };
  let receiver: TextLine[], receiverId: string;
  if (chosen.day === null) {
    // W-TXT-18: an undated source moves, with its identity/history and no [>] left behind.
    for (const entry of block) moved.add(entry.id);
    const rebased = block.map(entry => rebase({ id: entry.id, text: entry.text }));
    if (rebased.some(line => !line)) return fail('protected');
    receiver = rebased as TextLine[]; receiverId = row.id;
  } else {
    const own = block.filter(entry => entry.kind === 'property' && entry.parentLineId === row.id);
    const parted = new Map<string, { id: string; percent: number; own: TextRow[] }>();
    for (const child of block) {
      if (!['task', 'subcheck'].includes(child.kind) || child.parentLineId !== row.id) continue;
      const percent = M.currentProgress(before, child.id) ?? 0;
      if (percent > 0 && percent < 100) parted.set(child.id, { id: programId('line'), percent, own: block.filter(entry => entry.kind === 'property' && entry.parentLineId === child.id) });
      const share = parted.get(child.id), kept = new Set(share ? [child.id, ...share.own.map(entry => entry.id)] : []);
      for (const entry of block.filter(entry => entry.index >= child.index && entry.index < child.subtreeEndIndex)) if (!kept.has(entry.id)) moved.add(entry.id);
    }
    const carryProperties = (properties: TextRow[], depth: number) => programKeepDueYears(properties.filter(entry => /^ *-\s+(?:마감|기다림):/.test(entry.text)), rowMap, input.today.slice(0, 4))
      .map(entry => ({ id: programId('line'), text: pad(depth) + entry.text.trimStart() }));
    receiver = [{ id: target.id, text: `${pad(target.depth)}- [${chosen.percent > 0 && chosen.percent < 100 ? `${chosen.percent}%` : ' '}] ${chosen.title}` }, ...carryProperties(own, target.depth + 1)];
    for (const entry of block.slice(1)) {
      const share = parted.get(entry.id);
      if (share) receiver.push({ id: share.id, text: `${pad(entry.depth - row.depth + target.depth)}- [${share.percent}%] ${entry.title}` }, ...carryProperties(share.own, entry.depth - row.depth + target.depth + 1));
      else if (moved.has(entry.id)) {
        const line = rebase(programKeepDueYears([entry], rowMap, input.today.slice(0, 4))[0]);
        if (!line) return fail('protected');
        receiver.push(line);
      }
    }
    const note = (depth: number, percent: number): TextLine => ({ id: programId('line'), text: `${pad(depth + 1)}- 이어감: ${input.today} · ${percent}%` });
    replacements.set(row.id, mark(row)); insertions.set(own.at(-1)?.id ?? row.id, [note(row.depth, chosen.percent)]); renamed.set(row.id, target.id);
    for (const [id, share] of parted) { const child = rowMap.get(id)!; replacements.set(id, mark(child)); insertions.set(share.own.at(-1)?.id ?? id, [note(child.depth, share.percent)]); renamed.set(id, share.id); }
    receiverId = target.id;
  }
  const changed = new Set([source.id, destination.id]);
  const documents = before.documents.map(doc => {
    if (!changed.has(doc.id)) return doc;
    const lines: TextLine[] = [];
    for (const line of doc.lines) {
      if (doc.id === destination.id && line.id === target.id) lines.push(...receiver);
      else if (!(doc.id === source.id && moved.has(line.id))) lines.push(replacements.get(line.id) ?? line);
      if (doc.id === source.id && insertions.has(line.id)) lines.push(...insertions.get(line.id)!);
    }
    return { ...doc, lines };
  });
  const taskScopes = { ...before.taskScopes }, itemScopes = { ...before.itemScopes };
  for (const [from, to] of renamed) { delete taskScopes[from]; delete itemScopes[from]; if (before.taskScopes[from] !== undefined) taskScopes[to] = scope; itemScopes[to] = scope; }
  if (receiverId !== target.id) { delete taskScopes[target.id]; delete itemScopes[target.id]; }
  for (const line of receiver) {
    if (Object.hasOwn(taskScopes, line.id)) taskScopes[line.id] = scope;
    if (Object.hasOwn(itemScopes, line.id)) itemScopes[line.id] = scope;
  }
  const next: TextWorkspaceState = { ...before, documents, taskScopes, itemScopes,
    progressRecords: before.progressRecords.map(record => renamed.has(record.taskId) ? { ...record, taskId: renamed.get(record.taskId)! } : record) };
  if (!M.validate(next) || next.progressRecords.length !== before.progressRecords.length || M.currentProgress(next, receiverId) !== M.currentProgress(before, row.id)) return fail('unsafe');
  if (chosen.day !== null && programContinuedLines(next).find(line => line.lineId === row.id)?.received !== receiverId) return fail('ambiguous');
  return { ok: true, next, lineId: receiverId, message: chosen.day === null ? '날짜 미정의 일을 이 자리로 옮겼습니다' : `${chosen.day.slice(5).replace('-', '/')} 줄에 이어감을 남겼습니다` };
}
