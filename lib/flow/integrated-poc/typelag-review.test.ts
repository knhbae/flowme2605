import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { createEmptyTextWorkspace, textEditorRows, textWorkspaceModel as M } from './text-workspace';
import { programAlignRows, programHeldOnly, programPartialSave, programSameOutline } from './writing-hold';

// Codex 독립 검토 (inbox/typelag2-review-20261111-1602, 11/11) P2 두 건의 회귀 시험. 재현은 검토의 review.test.ts에서 옮겼다.
function workspace(raw: string) {
  let state = M.addDocument(createEmptyTextWorkspace(), { title: 'review synthetic' });
  const id = state.documents.at(-1)!.id, edit = M.editTextResult(state, id, raw, { folderText: true });
  assert.equal(edit.reason, null); state = edit.state;
  assert.equal(M.raw(M.getDocument(state, id)!), raw);
  return { state, id };
}
type Row = { offsetHeight: number; dataset: Record<string, string | undefined> };
const vendor = readFileSync(new URL('./vendor/text-editor.cjs', import.meta.url), 'utf8');
function membership(rows: Row[], only?: Set<number>, ownersBefore?: Set<string>) {
  const start = vendor.indexOf('    function syncMembershipGeometry('), end = vendor.indexOf('    function syncGeometry(', start);
  assert(start > 0 && end > start);
  vm.runInNewContext(vendor.slice(start, end) + '\nsyncMembershipGeometry(lineHeight, null, only, ownersBefore);', { rows, only, ownersBefore, lineHeight: 20 });
  return rows.map(row => row.dataset.membershipWrapped);
}
function owner(index: number, metadata: { kind: string; depth: number }[]) {
  const meta = metadata[index];
  if (!meta || meta.kind !== 'property' || !Number.isInteger(meta.depth)) return null;
  for (let p = index - 1; p >= 0; p--) {
    const a = metadata[p];
    if (!a) return null;
    if (a.kind === 'blank' || a.depth >= meta.depth) continue;
    return a.depth === meta.depth - 1 && ['task', 'reference', 'subcheck'].includes(a.kind) ? p : null;
  }
  return null;
}
const draw = (meta: { kind: string; depth: number }[], heights: number[]): Row[] => meta.map((m, index) => ({ offsetHeight: heights[index],
  dataset: m.kind === 'task' ? { checkOwner: String(index) } : owner(index, meta) !== null ? { checkOwner: String(owner(index, meta)) } : {} }));

test('P2-2: a memo that left its task takes the task\'s membership line away in a partial measure, as a full one does', () => {
  const raw = '- [ ] 할 일\n  - 메모: ' + '가'.repeat(50) + '\n다른 글', { state, id } = workspace(raw);
  const shown = raw.replace('메모:', '메모;'), edit = M.editTextResult(state, id, shown, { folderText: true });
  assert.equal(edit.reason, null);
  const a = textEditorRows(state, id), b = textEditorRows(edit.state, id);
  assert.deepEqual(a[0], b[0]); assert.equal(owner(1, a), 0); assert.equal(owner(1, b), null);
  const heights = [20, 60, 20], before = draw(a, heights);
  assert.deepEqual(membership(before), ['true', 'true', 'false']);
  // Only line 1 drawn again (its owner gone); its owner before the patch was line 0.
  const partial: Row[] = before.map((row, i) => i === 1 ? draw(b, heights)[i] : structuredClone(row));
  const full = membership(draw(b, heights));
  assert.deepEqual(full, ['false', 'false', 'false']);
  assert.deepEqual(membership(partial, new Set([1]), new Set(['0'])), full, 'the old owner\'s rows are measured again');
});

test('P2-1: rows the line pieces moved to another index keep no span; rows kept at their index keep the model\'s', () => {
  const raw = '- /가\n- /나\n- /다', { state, id } = workspace(raw), shown = '- /나\n- /다\n- /라';
  const rows = textEditorRows(state, id), aligned = programAlignRows(raw, shown, rows, true) as ({ id: string; subtreeEndIndex?: number } | undefined)[];
  assert.equal(programSameOutline(raw.split('\n'), shown.split('\n')), true);
  assert.equal(aligned[0]?.id, rows[1].id, 'the folder 나 moved from index 1 to 0');
  assert.equal(aligned[0]?.subtreeEndIndex, undefined);
  assert.equal(aligned[1]?.subtreeEndIndex, undefined);
  const doc = M.getDocument(state, id)!;
  const truth = M.parseDocument({ ...doc, lines: shown.split('\n').map((text, i) => ({ id: aligned[i]?.id ?? 'new-' + i, text })) }, state).rows;
  assert.equal(truth[0].subtreeEndIndex, 1, 'what a span there would have to be');
});

test('P2-1: the held paste (a recorded task taken, an invalid mark) keeps no span on the moved folders', () => {
  let { state, id } = workspace('- [ ] 완료\n- /나\n- /다');
  const task = M.tasks(state).find(t => t.title === '완료')!;
  state = M.recordProgress(state, task.id, '2026-11-11', 100);
  const accepted = M.raw(M.getDocument(state, id)!), shown = '- /나\n- /다\n- [101%] 새';
  assert.notEqual(M.editTextResult(state, id, shown, { folderText: true }).reason, null);
  assert.equal(programPartialSave(M, state, id, shown), null);
  assert(programHeldOnly(M, state, id, shown));
  const aligned = programAlignRows(accepted, shown, textEditorRows(state, id), true) as ({ kind: string; subtreeEndIndex?: number } | undefined)[];
  assert.equal(aligned[0]?.kind, 'scope');
  assert.equal(aligned[0]?.subtreeEndIndex, undefined);
});
