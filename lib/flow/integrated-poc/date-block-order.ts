import { textWorkspaceModel as M, type TextLine, type TextWorkspaceState } from './text-workspace';
import { programSame } from './controller';
import { applyProgramLinePermutation } from './line-permutation';

export interface DateOrderSelection { start: number; end: number; direction: 'forward' | 'backward' | 'none' }
export type DateBlockOrderPlan = { status: 'blocked'; reason: string } | { status: 'noop' } | {
  status: 'ready'; documentId: string; scopeLineId: string; beforeRaw: string; afterRaw: string;
  selectionBefore: DateOrderSelection; selectionAfter: DateOrderSelection;
  beforeItemIds: string[]; afterItemIds: string[];
  beforeLineIds: string[]; afterLineIds: string[];
  replacement: { start: number; end: number; text: string };
};

/** Read-only K4-W preview, not a storage/Undo ticket. Caller owns actor, revision and IME guards.
 * Explicit H2 Step only. Bodies move exactly; blank separator slots stay in place.
 * Both ordinary native input and its inverse must preserve every sidecar and line ID.
 */
export function planProgramDateBlockOrder(state: TextWorkspaceState, documentId: string, scopeLineId: string,
  selection: DateOrderSelection = { start: 0, end: 0, direction: 'none' }): DateBlockOrderPlan {
  const blocked = (reason: string): DateBlockOrderPlan => ({ status: 'blocked', reason });
  if (!M.validate(state)) return blocked('invalid-state');
  const doc = M.getDocument(state, documentId);
  if (!doc) return blocked('private-document-required');
  const raw = M.raw(doc);
  if (![selection.start, selection.end].every(Number.isInteger) || selection.start < 0 || selection.end < selection.start || selection.end > raw.length ||
    !['forward', 'backward', 'none'].includes(selection.direction)) return blocked('invalid-selection');
  const analysis = M.parseDocument(doc, state), scope = analysis.rows.find(row => row.id === scopeLineId);
  if (!scope || scope.kind !== 'heading' || !/^##\s+\S/.test(scope.text)) return blocked('explicit-h2-step-required');
  const end = analysis.rows.find(row => row.index > scope.index && row.kind === 'heading' && /^#{1,2}\s/.test(row.text))?.index ?? doc.lines.length;
  const rows = analysis.rows.slice(scope.index + 1, end);
  if (analysis.issues.some(issue => issue.index > scope.index && issue.index < end)) return blocked('unsupported-or-invalid-syntax');
  if (rows.some(row => ['date', 'scope', 'heading', 'fence'].includes(row.kind))) return blocked('mixed-scope-or-schedule');
  const tasks = analysis.items.filter(item => item.sourceIndex > scope.index && item.sourceIndex < end && item.depth === 0);
  if (tasks.length < 2) return { status: 'noop' };
  if (tasks.some(task => !task.explicitDate || !task.date)) return blocked('fixed-dated-items-required');
  if (state.bindings.some(binding => binding.docId === documentId && rows.some(row => row.id === binding.lineId))) return blocked('reference-or-scope-binding');
  const offsets: number[] = []; let offset = 0;
  doc.lines.forEach(line => { offsets.push(offset); offset += line.text.length + 1; });
  const bodies = tasks.map((task, index) => {
    const limit = tasks[index + 1]?.sourceIndex ?? end;
    let last = limit - 1;
    while (last > task.sourceIndex && !doc.lines[last].text.trim()) last--;
    const owned = analysis.rows.slice(task.sourceIndex, last + 1);
    const ids = new Set(analysis.items.filter(item => item.sourceIndex >= task.sourceIndex && item.sourceIndex <= last).map(item => item.id));
    const ownedLineIds = new Set(owned.map(row => row.id));
    const unsupported = owned.some(row => !['task', 'subcheck', 'property', 'blank', 'note'].includes(row.kind) ||
      (row.kind === 'note' && (!row.parentLineId || !ownedLineIds.has(row.parentLineId))) ||
      (row.kind === 'property' && (!row.taskId || !ids.has(row.taskId))));
    const properties = owned.filter(row => row.kind === 'property').map(row => `${row.taskId}:${row.text.trim().split(':')[0]}`);
    const duplicate = new Set(properties).size !== properties.length;
    const start = offsets[task.sourceIndex], finish = offsets[last] + doc.lines[last].text.length;
    return { task, start, finish, last, lines: doc.lines.slice(task.sourceIndex, last + 1), text: raw.slice(start, finish), unsupported: unsupported || duplicate };
  });
  if (rows.filter(row => row.index < tasks[0].sourceIndex).some(row => row.kind !== 'blank')) return blocked('unowned-step-prefix');
  if (bodies.some(body => body.unsupported)) return blocked('ambiguous-body-owner');
  const sorted = bodies.slice().sort((a, b) => a.task.date!.localeCompare(b.task.date!) ||
    (a.task.time ?? '').localeCompare(b.task.time ?? '') || a.task.sourceIndex - b.task.sourceIndex);
  if (sorted.every((body, index) => body === bodies[index])) return { status: 'noop' };
  const start = bodies[0].start, finish = bodies[bodies.length - 1].finish;
  const gaps = bodies.slice(0, -1).map((body, index) => raw.slice(body.finish, bodies[index + 1].start));
  const positions = new Map<string, number>(); let nextOffset = start;
  const text = sorted.map((body, index) => {
    positions.set(body.task.id, nextOffset);
    const piece = body.text + (gaps[index] ?? ''); nextOffset += piece.length; return piece;
  }).join('');
  const afterRaw = raw.slice(0, start) + text + raw.slice(finish);
  let selectionAfter = { ...selection };
  if (!(selection.end <= start || selection.start >= finish)) {
    const body = bodies.find(entry => selection.start >= entry.start && selection.end <= entry.finish);
    if (!body) return blocked('selection-crosses-body-boundary');
    const delta = positions.get(body.task.id)! - body.start;
    selectionAfter = { ...selection, start: selection.start + delta, end: selection.end + delta };
  }
  // Native input uses this explicit permutation, not ambiguous text reconciliation.
  const expectedLines = doc.lines.slice(0, bodies[0].task.sourceIndex);
  sorted.forEach((body, index) => {
    expectedLines.push(...body.lines);
    if (index < bodies.length - 1) expectedLines.push(...doc.lines.slice(bodies[index].last + 1, bodies[index + 1].task.sourceIndex));
  });
  expectedLines.push(...doc.lines.slice(bodies[bodies.length - 1].last + 1));
  const afterLineIds = expectedLines.map(line => line.id), beforeLineIds = doc.lines.map(line => line.id);
  const next = applyProgramLinePermutation(state, documentId, afterLineIds);
  if (!next || M.raw(M.getDocument(next, documentId)) !== afterRaw) return blocked('permutation-rejected');
  const neutralize = (value: TextWorkspaceState) => ({ ...value,
    documents: value.documents.map(entry => entry.id === documentId ? { ...entry, lines: [] as TextLine[] } : entry),
    flows: value.flows.map(entry => entry.id === documentId ? { ...entry, lines: [] as TextLine[] } : entry) });
  if (!programSame(neutralize(next), neutralize(state))) return blocked('sidecar-change');
  const semantic = (value: TextWorkspaceState) => M.tasks(value).map(task => ({ id: task.id, date: task.date, note: task.note, time: task.time, done: task.done, scopeId: task.scopeId })).sort((a, b) => a.id.localeCompare(b.id));
  if (!programSame(semantic(next), semantic(state))) return blocked('execution-meaning-change');
  if (!programSame(applyProgramLinePermutation(next, documentId, beforeLineIds), state)) return blocked('inverse-permutation-rejected');
  return { status: 'ready', documentId, scopeLineId, beforeRaw: raw, afterRaw,
    selectionBefore: { ...selection }, selectionAfter, beforeItemIds: bodies.map(body => body.task.id), afterItemIds: sorted.map(body => body.task.id), beforeLineIds, afterLineIds,
    replacement: { start, end: finish, text } };
}
