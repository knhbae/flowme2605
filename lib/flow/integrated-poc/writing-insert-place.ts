import { textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';

type Row = ReturnType<typeof M.parseDocument>['rows'][number];
export type LayoutInsertion =
  | { ok: true; index: number; offset: number; text: string; caretOffset: number; after: number; blockTitle: string }
  | { ok: false; reason: string };

const rowTitle = (row: Row | undefined) => (row?.text ?? '').replace(/^\s*-\s+(\[[^\]]*\]\s+)?/, '').replace(/^#+\s*/, '').trim();
const shortTitle = (title: string) => title.length > 14 ? `${title.slice(0, 13)}…` : title;

/** "단계 추가" (a "## " line) and "설명 이어 쓰기" (a free line) go after the whole top-level block the
 * pressed line sits in, never inside it, and only where no existing line changes what it belongs to.
 * Before this they went right after the pressed line, which could turn a later subcheck into a task. */
export function planLayoutInsertion(state: TextWorkspaceState, docId: string, lineId: string | null, kind: 'step' | 'description'): LayoutInsertion {
  const doc = M.getDocument(state, docId);
  if (!doc) return { ok: false, reason: '문서를 찾지 못했습니다.' };
  const prefix = kind === 'step' ? '## ' : '';
  if (!doc.lines.length) return { ok: true, index: 0, offset: 0, text: prefix, caretOffset: prefix.length, after: 0, blockTitle: '' };
  const analysis = M.parseDocument(doc, state), rows = analysis.rows, byId = new Map(rows.map(row => [row.id, row]));
  const pressed = rows.find(row => row.id === lineId) ?? rows[rows.length - 1];
  let top = pressed;
  while (top.parentLineId && byId.has(top.parentLineId)) top = byId.get(top.parentLineId)!;
  let index = top.subtreeEndIndex;
  while (index > top.index + 1 && rows[index - 1].kind === 'blank') index -= 1;
  // Check a typed line, not the empty scaffold: an empty line never moves anything until text arrives.
  let probeId = '__layout-insertion-probe__';
  while (byId.has(probeId)) probeId += '_';
  const projected = { ...doc, lines: [...doc.lines.slice(0, index), { id: probeId, text: prefix + (kind === 'step' ? '단계' : '설명') }, ...doc.lines.slice(index)] };
  const next = M.parseDocument(projected, state);
  const known = new Set(analysis.issues.map(issue => `${issue.code}:${issue.lineId}`));
  const added = next.rows.find(row => row.id === probeId);
  if (added?.kind !== (kind === 'step' ? 'heading' : 'note') || next.issues.some(issue => !known.has(`${issue.code}:${issue.lineId}`)) || next.rows.some(entry => {
    const prior = byId.get(entry.id);
    return prior && prior.kind !== 'blank' && (entry.kind !== prior.kind || entry.parentLineId !== prior.parentLineId
      || entry.ancestorScopeId !== prior.ancestorScopeId || entry.taskId !== prior.taskId || entry.groupDate !== prior.groupDate);
  })) return { ok: false, reason: `여기에 ${kind === 'step' ? '단계를' : '설명을'} 넣으면 다른 줄의 소속이 바뀌거나 코드 안에 들어가서 넣지 않았습니다. 원문은 그대로입니다.` };
  const atEnd = index === doc.lines.length;
  const offset = atEnd ? M.raw(doc).length : doc.lines.slice(0, index).reduce((sum, line) => sum + line.text.length + 1, 0);
  const text = atEnd ? `\n${prefix}` : `${prefix}\n`;
  return { ok: true, index, offset, text, caretOffset: offset + (atEnd ? 1 : 0) + prefix.length, after: index - pressed.index - 1, blockTitle: rowTitle(top) };
}

/** Where a "다음 …" line or a layout line lands, said in words: "바로 아래" or "‘제목’ 묶음 다음 · N줄 뒤". */
export function insertPlaceAfter(after: number, blockTitle: string): string {
  return after <= 0 ? '바로 아래' : `‘${shortTitle(blockTitle)}’ 묶음 다음 · ${after}줄 뒤`;
}

/** Where "하위 할 일" lands: after the task's memo lines, before its first child. */
export function childPlace(state: TextWorkspaceState, docId: string, parentId: string): { label: string; index: number } | null {
  const doc = M.getDocument(state, docId);
  if (!doc) return null;
  const rows = M.parseDocument(doc, state).rows, parent = rows.find(row => row.id === parentId);
  if (!parent) return null;
  const inside = rows.filter(row => row.index > parent.index && row.index < parent.subtreeEndIndex);
  const firstChild = inside.find(row => row.kind === 'task' || row.kind === 'subcheck');
  const memo = inside.some(row => row.kind === 'property' && (!firstChild || row.index < firstChild.index));
  return { index: firstChild?.index ?? parent.subtreeEndIndex, label: memo ? '메모 다음, 첫 하위로' : firstChild ? '바로 아래, 첫 하위로' : '바로 아래' };
}

export type InsertPreviewLine = { kind: 'anchor' | 'context' | 'more' | 'new'; text: string; depth: number };

/** A few lines around the pressed task with a dashed "새 … 여기에" line where the choice lands.
 * Read-only: the dialog draws this, the editor and the source are untouched. */
export function insertPreview(state: TextWorkspaceState, docId: string, anchorId: string, insertAt: number, depth: number, label = '새 할 일이 여기에'): InsertPreviewLine[] {
  const doc = M.getDocument(state, docId);
  if (!doc) return [];
  const rows = M.parseDocument(doc, state).rows, anchor = rows.find(row => row.id === anchorId);
  if (!anchor) return [];
  const lines: InsertPreviewLine[] = [{ kind: 'anchor', text: rowTitle(anchor), depth: anchor.depth }];
  const newLine: InsertPreviewLine = { kind: 'new', text: label, depth };
  const shown = rows.filter(row => row.index > anchor.index && row.index < Math.max(insertAt, anchor.subtreeEndIndex) && row.kind !== 'blank');
  const before = shown.filter(row => row.index < insertAt), afterRows = shown.filter(row => row.index >= insertAt);
  const pushRows = (list: Row[], limit: number) => {
    list.slice(0, limit).forEach(row => lines.push({ kind: 'context', text: rowTitle(row) || row.text.trim(), depth: row.depth }));
    if (list.length > limit) lines.push({ kind: 'more', text: `… ${list.length - limit}줄`, depth: anchor.depth + 1 });
  };
  pushRows(before, before.length > 3 ? 2 : 3);
  lines.push(newLine);
  pushRows(afterRows, 1);
  return lines;
}
