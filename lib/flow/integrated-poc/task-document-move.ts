import { programClone, programFailure, programId, type ProgramData, type ProgramPrivateSpace, type ProgramTransition } from './contract';
import { programSame } from './controller';
import { transitionProgramPrivateSpace, type ProgramPrivateMutationBase } from './private-space';
import { textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';
import { programDateHeadIndex } from './input-bar';

const documents = (text: TextWorkspaceState) => [...text.documents, ...text.flows];
const items = (text: TextWorkspaceState) => documents(text).flatMap(doc => M.parseDocument(doc, text).items);
const fields = ['title', 'date', 'done', 'note', 'time'] as const;

export function inspectProgramTaskDocumentMove(space: ProgramPrivateSpace, taskId: string) {
  const task = M.tasks(space.text).find(row => row.id === taskId);
  if (!task) return { ok: false as const, reason: 'missing' as const };
  if (space.archivedDocumentIds.includes(task.docId)) return { ok: false as const, reason: 'missing' as const };
  // A source Item retains its parent Flow. Other documents can link to it, not take ownership of it.
  const sourceOwned = task.scopeKind === 'flow' || space.copies.some(copy => Object.values(copy.itemLines).includes(taskId))
    || space.savedBindings.some(binding => Object.values(binding.itemLines).includes(taskId));
  if (sourceOwned) return { ok: false as const, reason: 'source-owned' as const };
  const selection = M.selectionForMove(space.text, task.docId, taskId);
  if (!selection || selection.kind !== 'task') return { ok: false as const, reason: 'unresolved' as const };
  return { ok: true as const, task, selection };
}

/** Move one canonical personal block, preserving IDs, scopes, references and dated progress.
 * The same helper is usable for legacy read projection; it has no storage/writer. */
export function moveProgramPersonalTaskText(text: TextWorkspaceState, taskId: string, destinationId: string): TextWorkspaceState | null {
  if (!M.validate(text)) return null;
  const task = M.tasks(text).find(row => row.id === taskId), target = text.documents.find(doc => doc.id === destinationId);
  if (!task || !target || task.scopeKind === 'flow') return null;
  if (task.docId === destinationId) return text;
  const source = M.getDocument(text, task.docId)!, selection = M.selectionForMove(text, source.id, taskId);
  if (!selection || selection.kind !== 'task') return null;
  const movedIds = new Set(selection.lineIds), beforeItems = items(text);
  const movedItems = beforeItems.filter(item => movedIds.has(item.id));
  const beforeMeta = M.rowMeta(text, source.id), next = programClone(text);
  const sourceNext = M.getDocument(next, source.id)!, targetNext = M.getDocument(next, target.id)!;
  const moved = source.lines.slice(selection.startIndex, selection.endIndex).map(line => {
    const row = beforeMeta.find(row => row.id === line.id)!;
    if (!line.text.trim() || row.kind === 'fence' && !/^ *(?:`{3,}|~{3,})/.test(line.text)) return programClone(line);
    return { id: line.id, text: '  '.repeat(Math.max(0, row.depth - selection.depth)) + line.text.trimStart() };
  });
  sourceNext.lines = sourceNext.lines.filter(line => !movedIds.has(line.id));
  for (const binding of next.bindings) if (binding.docId === source.id && movedIds.has(binding.lineId)) binding.docId = target.id;
  // Moving to another document must not reschedule the work. Redesign 3 (DECISION-1): the day is the date section, so
  // the block goes to the end of its day's section there (a heading made where the writing bar would make it), not to
  // the end with a '- 날짜:' line. A document without headings takes an undated task at its end.
  const heads = M.parseDocument(targetNext, next).rows.filter(row => row.kind === 'date');
  const day = heads.filter(row => row.date === task.date).at(-1);
  let at = targetNext.lines.length;
  if (day) {
    at = heads.find(row => row.index > day.index)?.index ?? targetNext.lines.length;
    while (at > day.index + 1 && !targetNext.lines[at - 1].text.trim()) at -= 1;
    targetNext.lines.splice(at, 0, ...moved);
  } else if (task.date === null && !heads.length) {
    if (targetNext.lines.length && targetNext.lines.at(-1)!.text.trim()) targetNext.lines.push({ id: programId('move-separator'), text: '' });
    targetNext.lines.push(...moved);
  } else {
    at = task.date ? programDateHeadIndex(targetNext.lines.map(line => line.text), task.date) : targetNext.lines.length;
    const apart = at > 0 && targetNext.lines[at - 1].text.trim() ? [{ id: programId('move-separator'), text: '' }] : [];
    targetNext.lines.splice(at, 0, ...apart, { id: programId('move-date'), text: `[${task.date ?? '미정'}]` }, ...moved);
  }
  if (!M.validate(next)) return null;
  const afterItems = new Map(items(next).map(item => [item.id, item]));
  if (beforeItems.length !== afterItems.size || !beforeItems.every(before => {
    const after = afterItems.get(before.id);
    return after && fields.every(key => before[key] === after[key]) && (movedIds.has(before.id) ? after.docId === target.id : before.docId === after.docId);
  })) return null;
  if (!programSame(text.taskScopes, next.taskScopes) || !programSame(text.itemScopes, next.itemScopes) || !programSame(text.progressRecords, next.progressRecords)) return null;
  return next;
}

export function moveProgramTaskDocument(data: ProgramData, input: ProgramPrivateMutationBase & { taskId: string; destinationId: string }): ProgramTransition<string> {
  if (data.activeActorId !== input.actorId) return programFailure(data, 'forbidden');
  return transitionProgramPrivateSpace(data, input, 'private-task-document-move', { taskId: input.taskId, destinationId: input.destinationId }, space => {
    const inspected = inspectProgramTaskDocumentMove(space, input.taskId), result = input.taskId;
    if (!inspected.ok) return { result, reason: inspected.reason === 'source-owned' ? 'forbidden' : inspected.reason };
    if (!space.text.documents.some(doc => doc.id === input.destinationId) || space.archivedDocumentIds.includes(input.destinationId)) return { result, reason: 'missing' };
    if (inspected.task.docId === input.destinationId) return { result };
    const movedIds = new Set(inspected.selection.lineIds), next = moveProgramPersonalTaskText(space.text, result, input.destinationId);
    if (!next) return { result, reason: 'unresolved' };
    space.text = next;
    for (const order of Object.values(space.executionTimelineOrders ?? {})) for (let index = 0; index < order.length; index++) {
      const key: unknown[] = JSON.parse(order[index]);
      if (key[0] === 'text-task' && key[1] === inspected.task.docId && movedIds.has(String(key[2]))) order[index] = JSON.stringify(['text-task', input.destinationId, key[2]]);
    }
    if (space.position.documentId === inspected.task.docId && space.position.lineId && movedIds.has(space.position.lineId)) {
      const target = M.getDocument(next, input.destinationId)!, lineIndex = target.lines.findIndex(line => line.id === space.position.lineId);
      const offset = target.lines.slice(0, lineIndex).reduce((sum, line) => sum + line.text.length + 1, 0);
      space.position = { documentId: target.id, lineId: space.position.lineId, start: offset, end: offset, scrollTop: 0 };
    }
    return { result };
  });
}
