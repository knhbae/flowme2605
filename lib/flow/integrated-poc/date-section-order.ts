import { textWorkspaceModel as M, type TextLine, type TextWorkspaceState } from './text-workspace';
import { programSame } from './controller';
import { applyProgramLinePermutation } from './line-permutation';
import type { DateBlockOrderPlan, DateOrderSelection } from './date-block-order';

/** F10 W-ORDER-05 (11/11): 글 ⋮ '날짜 순서 바꾸기' turns the dated sections of a document the other way round. Each
 *  section moves whole (its date line, then its lines in their order, IDs and all); the blank lines between sections
 *  stay where they are, as do the lines above the first date line and every [미정] section (they keep their places among
 *  the sections). Planned as the K4-W date order is (date-block-order): one explicit line permutation, checked to keep
 *  every task's day, time, memo, folder and finished state, every link and record, and to go back exactly; the editor
 *  applies it as one native edit (one save, one ↶). */
export type DateSectionOrderPlan = DateBlockOrderPlan & { headsBefore?: string[]; headsAfter?: string[] };
export type DateSectionOrderDirection = 'oldest-first' | 'newest-first' | 'mixed' | 'none';

/** The order of the document's dated sections: oldest first, newest first, neither, or fewer than two. */
export function programDateSectionDirection(state: TextWorkspaceState, documentId: string): DateSectionOrderDirection {
  const doc = M.getDocument(state, documentId);
  if (!doc) return 'none';
  const days = M.rowMeta(state, documentId).filter(row => row.kind === 'date' && !!row.date).map(row => row.date!);
  if (days.length < 2) return 'none';
  const up = days.every((day, index) => index === 0 || days[index - 1] <= day), down = days.every((day, index) => index === 0 || days[index - 1] >= day);
  return up && !down ? 'oldest-first' : down && !up ? 'newest-first' : 'mixed';
}

export function planProgramDateSectionReverse(state: TextWorkspaceState, documentId: string,
  selection: DateOrderSelection = { start: 0, end: 0, direction: 'none' }): DateSectionOrderPlan {
  const blocked = (reason: string): DateSectionOrderPlan => ({ status: 'blocked', reason });
  if (!M.validate(state)) return blocked('invalid-state');
  const doc = M.getDocument(state, documentId);
  if (!doc) return blocked('private-document-required');
  const raw = M.raw(doc);
  if (![selection.start, selection.end].every(Number.isInteger) || selection.start < 0 || selection.end < selection.start || selection.end > raw.length) return blocked('invalid-selection');
  const rows = M.parseDocument(doc, state).rows;
  const heads = rows.filter(row => row.kind === 'date' && row.depth === 0);
  // Each section: its date line to its last line that is not blank; the blanks after it are a slot that stays.
  const sections = heads.map((head, index) => {
    const limit = heads[index + 1]?.index ?? doc.lines.length;
    let last = limit - 1;
    while (last > head.index && !doc.lines[last].text.trim()) last--;
    return { head, dated: !!head.date, first: head.index, last, lines: doc.lines.slice(head.index, last + 1) };
  });
  const dated = sections.filter(section => section.dated);
  if (dated.length < 2) return { status: 'noop' };
  const reversed = [...dated].reverse();
  let turn = 0;
  const order = sections.map(section => section.dated ? reversed[turn++] : section);
  const expectedLines: TextLine[] = doc.lines.slice(0, sections[0].first);
  order.forEach((section, index) => {
    expectedLines.push(...section.lines);
    // The slot after the section that stood here (its blanks) stays here.
    expectedLines.push(...doc.lines.slice(sections[index].last + 1, sections[index + 1]?.first ?? doc.lines.length));
  });
  const afterLineIds = expectedLines.map(line => line.id), beforeLineIds = doc.lines.map(line => line.id);
  if (afterLineIds.length !== beforeLineIds.length) return blocked('permutation-rejected');
  const next = applyProgramLinePermutation(state, documentId, afterLineIds);
  if (!next) return blocked('permutation-rejected');
  const afterRaw = expectedLines.map(line => line.text).join('\n');
  if (M.raw(M.getDocument(next, documentId)) !== afterRaw) return blocked('permutation-rejected');
  const neutralize = (value: TextWorkspaceState) => ({ ...value,
    documents: value.documents.map(entry => entry.id === documentId ? { ...entry, lines: [] as TextLine[] } : entry),
    flows: value.flows.map(entry => entry.id === documentId ? { ...entry, lines: [] as TextLine[] } : entry) });
  if (!programSame(neutralize(next), neutralize(state))) return blocked('sidecar-change');
  const semantic = (value: TextWorkspaceState) => M.tasks(value).map(task => ({ id: task.id, date: task.date, note: task.note, time: task.time, done: task.done, scopeId: task.scopeId, parentTaskId: task.parentTaskId }))
    .sort((a, b) => a.id.localeCompare(b.id));
  if (!programSame(semantic(next), semantic(state))) return blocked('execution-meaning-change');
  if (!programSame(applyProgramLinePermutation(next, documentId, beforeLineIds), state)) return blocked('inverse-permutation-rejected');
  // The caret stays on its line (and column); a range shrinks to its start.
  const offsetOf = (lines: readonly TextLine[], id: string) => { let sum = 0; for (const line of lines) { if (line.id === id) return sum; sum += line.text.length + 1; } return 0; };
  const caretLine = raw.slice(0, selection.start).split('\n').length - 1, column = selection.start - offsetOf(doc.lines, doc.lines[caretLine]?.id ?? '');
  const caret = doc.lines[caretLine] ? offsetOf(expectedLines, doc.lines[caretLine].id) + column : 0;
  // One native edit: the text between the first and the last line that changed place.
  let start = 0; while (start < doc.lines.length && afterLineIds[start] === beforeLineIds[start]) start++;
  let end = doc.lines.length - 1; while (end > start && afterLineIds[end] === beforeLineIds[end]) end--;
  const from = offsetOf(doc.lines, beforeLineIds[start]), to = offsetOf(doc.lines, beforeLineIds[end]) + doc.lines[end].text.length;
  const text = expectedLines.slice(start, end + 1).map(line => line.text).join('\n');
  const label = (head: typeof heads[number]) => head.text.trim();
  return { status: 'ready', documentId, scopeLineId: '', beforeRaw: raw, afterRaw,
    selectionBefore: { ...selection }, selectionAfter: { start: caret, end: caret, direction: 'none' },
    beforeItemIds: dated.map(section => section.head.id), afterItemIds: reversed.map(section => section.head.id), beforeLineIds, afterLineIds,
    replacement: { start: from, end: to, text }, headsBefore: sections.map(section => label(section.head)), headsAfter: order.map(section => label(section.head)) };
}
