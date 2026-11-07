import assert from 'node:assert/strict';
import test from 'node:test';
import { PROGRAM_SCHEMA } from './contract';
import { createProgramPrivateSpace } from './program-data';
import { createProgramDocument } from './private-space';
import { textWorkspaceModel as M } from './text-workspace';
import { ALPHA_SCHEMA, type AlphaAccount } from './alpha-persistence/contract';
import { materializeAccount } from './alpha-persistence/program-adapter';
import { emptyAlphaReferences } from './alpha-social/projection';
import { readProgramFolderRegions, planProgramRegionEdit } from './folder-document-regions';
import { previewProgramRegionText } from '../../../components/flow/integrated-poc/ProgramFolderRegionEditor';

// Region fix (11/7, QA NO_GO): a folder on 30 or more days made the region editor's writes fail to save and its caret
// jump. Each region carried every context row outside it (O(regions × rows) in the view and in every check of it), and
// every region's editor re-ran the whole check and the whole document's rows on every draw. Now a context row belongs to
// one region, previews are kept per view, and an unchanged region reads its view's own rows.
const owner = '99999999-9999-4999-8999-999999999991';
function setup(n: number) {
  const out: string[] = [], end = new Date('2026-11-06T00:00:00Z');
  for (let i = 0; i < n; i++) { const d = new Date(end); d.setUTCDate(d.getUTCDate() - i); out.push(`[${d.toISOString().slice(0, 10)}]`, '- /회사 미분류', `  - [ ] 주간 정리 ${i}`, '- /미분류', `  - [x] 다른 일 ${i}`, ''); }
  const account: AlphaAccount = { schema: ALPHA_SCHEMA, ownerId: owner, revision: 0, source: { schema: PROGRAM_SCHEMA, actorId: owner, revision: 0 }, space: createProgramPrivateSpace(), legacyUndo: [], legacyReceipts: [] };
  const initial = materializeAccount(account, emptyAlphaReferences(owner)).data;
  const made = createProgramDocument(initial, { actorId: owner, requestId: `many-${n}`, expectedSpace: initial.spaces[owner], title: '긴 글', raw: '' });
  assert.ok(made.ok);
  const typed = M.editTextResult(made.data.spaces[owner].text, made.result, out.join('\n'), { folderText: true });
  assert.equal(typed.reason, null);
  const folder = typed.state.folders.find(entry => entry.title === '회사 미분류')!;
  return { state: typed.state, docId: made.result, view: readProgramFolderRegions(typed.state, made.result, folder.id)! };
}

for (const n of [2, 5, 12, 20, 42, 80]) test(`${n} days: every context line once (a day's head line and the folder line), every region editable and checkable`, () => {
  const { state, view } = setup(n);
  assert.equal(view.regions.length, n);
  const context = view.regions.flatMap(region => region.contextRows);
  assert.equal(new Set(context.map(row => row.id)).size, context.length, 'no context line twice');
  assert.equal(context.filter(row => /^\[\d{4}-\d{2}-\d{2}\]$/.test(row.text)).length, n, 'each day');
  assert.equal(context.filter(row => row.text === '- /회사 미분류').length, n, 'each folder line');
  assert.ok(context.every(row => view.regions.every(region => region.readOnly || row.index < region.startIndex || row.index >= region.endIndex)), 'never inside a region');
  // A write in the last region (the oldest day) is checked as one whole-document edit.
  const last = view.regions.at(-1)!, plan = planProgramRegionEdit(state, view, last.key, `${last.raw} 준비`);
  assert.ok(plan.ok, !plan.ok ? plan.reason : '');
});

test('the view grows with the days, not with their square; previews are kept per view and region text', () => {
  const size = (n: number) => { const { view } = setup(n); return JSON.stringify({ ...view, workspace: undefined }).length; };
  const twenty = size(20), eighty = size(80);
  assert.ok(eighty / twenty < 6, `${eighty} / ${twenty}`);
  const { view } = setup(42), region = view.regions[3];
  const first = previewProgramRegionText(view, region.key, region.raw);
  assert.ok(first && first.rows.length === region.lineIds.length);
  assert.equal(previewProgramRegionText(view, region.key, region.raw), first);
  const edited = previewProgramRegionText(view, region.key, `${region.raw} 준비`);
  assert.ok(edited && edited.fullRaw.includes('준비') && edited !== first);
});

test('the editor side: one view per workspace, region editors repaint on their own text or a new view, keys checked against a current view', async () => {
  const { readFileSync } = await import('node:fs');
  const read = (path: string) => readFileSync(new URL(`../../../${path}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const editor = read('components/flow/integrated-poc/ProgramTextEditor.tsx'), region = read('components/flow/integrated-poc/ProgramFolderRegionEditor.tsx');
  const model = read('lib/flow/integrated-poc/folder-document-regions.ts');
  assert.match(editor, /const folderView = useMemo\(\(\) => props\.folderId \? readProgramFolderRegions\(draft\.working, props\.docId, props\.folderId\) : null,\n\s+\[draft\.working, props\.docId, props\.folderId\]\);/);
  assert.match(region, /\}, \[props\.raw, props\.readOnly, props\.version, props\.composing\]\);/);
  assert.doesNotMatch(region, /props\.rows, props\.composing\]/);
  assert.match(region, /if \(captured\.workspace === workspace\) return captured;\n\s+return readProgramFolderRegions\(workspace, captured\.documentId, captured\.folderId\) \?\? captured;/);
  for (const use of ['canApply={raw => planProgramRegionEdit(latest.current.workspace(), viewNow(), entry.region!.key, raw).ok}',
    "onChange={raw => { if (controller.update(viewNow(), entry.region!.key, raw)) { setNotice(''); schedule(); } }}"]) assert.ok(region.includes(use), use);
  // The same check is kept per view (the safety checks before it still run each time).
  assert.match(model, /if \(state !== view\.workspace\) return planRegion\(state, view, doc, region, replacement, options\);/);
});