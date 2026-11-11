import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { captureProgramFolderOperation } from './folder-operation';
import { createEmptyTextWorkspace, textEditorRows, textWorkspaceModel as M } from './text-workspace';
import { PROGRAM_ROW_PATCH, PROGRAM_ROW_PATCH_KEY, programRowPatchEnabled } from './typing-row-patch';
import { programAlignRows, programSameOutline } from './writing-hold';

// typelag ② (총괄 11/11 09:4x·11:2x): typing redraws and measures only the rows it changed, under one switch.
const DOC = ['[2026-11-10]', '- /회사 일', '  - [ ] 회의실 잡기', '  - [ ] 보고서 초안', '    - 메모: 표 정리', '- /집안일', '  - [ ] 장보기', '',
  '[2026-11-11]', '- [ ] 발표 연습', '  - [ ] 슬라이드', '- [ ] 자료 인쇄', '```', '코드 - [ ] 아님', '```', '# 제목', '그냥 글'].join('\n');
function workspace(raw = DOC) {
  let state = M.addDocument(createEmptyTextWorkspace(), { title: '행 패치' });
  const id = state.documents.at(-1)!.id;
  state = M.editTextResult(state, id, raw, { folderText: true }).state;
  assert.equal(M.raw(M.getDocument(state, id)!), raw);
  return { state, id };
}
// The save fuzz's generator (writing-guard.test.ts, seed 0x53ef6839): deletes, one-character inserts, pastes.
function* fuzz(raw: string, count: number) {
  let seed = 0x53ef6839;
  const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; };
  const chars = ['가', ' ', '\n', '-', '/', '[', ']', 'x', '%', ':', '0', '\t'], pastes = ['- [', '- [ ] 새 할 일', '  - 메모: 붙여넣기', '[2026-13-45]', '- /정리', '\n\n', '제목\n다음 줄'];
  for (let i = 0; i < count; i++) {
    const kind = i % 3, start = Math.floor(rnd() * (raw.length + 1)), end = kind === 1 ? start : Math.min(raw.length, start + 1 + Math.floor(rnd() * (kind === 0 ? 8 : 20)));
    const text = kind === 0 ? '' : kind === 1 ? chars[Math.floor(rnd() * chars.length)] : pastes[Math.floor(rnd() * pastes.length)];
    yield raw.slice(0, start) + text + raw.slice(end);
  }
}
const withSwitch = <T>(on: boolean, run: () => T): T => { const was = PROGRAM_ROW_PATCH.enabled; PROGRAM_ROW_PATCH.enabled = on; try { return run(); } finally { PROGRAM_ROW_PATCH.enabled = was; } };

test('the switch: on by default; off in the module or on one device (localStorage) restores r3', () => {
  assert.equal(PROGRAM_ROW_PATCH.enabled, true);
  assert.equal(programRowPatchEnabled(null), true);
  assert.equal(programRowPatchEnabled({ getItem: () => null }), true);
  assert.equal(programRowPatchEnabled({ getItem: key => key === PROGRAM_ROW_PATCH_KEY ? 'off' : null }), false);
  assert.equal(programRowPatchEnabled({ getItem: () => { throw Error('blocked'); } }), true);
  assert.equal(withSwitch(false, () => programRowPatchEnabled(null)), false);
});

test('folder operations: the quiet path (switch on) answers exactly as the full path (off) over the save fuzz', () => {
  const { state, id } = workspace();
  let accepted = 0, operations = 0;
  for (const next of fuzz(DOC, 600)) {
    const edit = M.editTextResult(state, id, next, { folderText: true });
    if (edit.reason !== null) continue;
    accepted++;
    const on = withSwitch(true, () => captureProgramFolderOperation(state, edit.state));
    const off = withSwitch(false, () => captureProgramFolderOperation(state, edit.state));
    assert.deepEqual(on, off, JSON.stringify(next.slice(0, 80)));
    if (on) operations++;
  }
  // Words typed in a task title: no operation either way.
  const typed = M.editTextResult(state, id, DOC.replace('보고서 초안', '보고서 초안 가나'), { folderText: true }).state;
  assert.equal(withSwitch(true, () => captureProgramFolderOperation(state, typed)), null);
  assert(accepted > 200 && operations > 0, `${accepted} accepted, ${operations} operations`);
});

test('spans kept while words change inside lines are the model\'s spans for the text shown', () => {
  const { state, id } = workspace(), rows = M.rowMeta(state, id), a = DOC.split('\n');
  let same = 0, other = 0;
  for (const shown of fuzz(DOC, 600)) {
    const b = shown.split('\n'), outline = programSameOutline(a, b), aligned = programAlignRows(DOC, shown, rows, true) as (typeof rows[number] | undefined)[];
    if (!outline) { other++; assert(aligned.every(row => !row || row.subtreeEndIndex === undefined), 'another outline: no spans, as r3'); continue; }
    const edit = M.editTextResult(state, id, shown, { folderText: true });
    if (edit.reason !== null || M.raw(M.getDocument(edit.state, id)!) !== shown) continue;
    const truth = M.rowMeta(edit.state, id);
    aligned.forEach((row, index) => { if (row) assert.equal(row.subtreeEndIndex, truth[index].subtreeEndIndex, `${index}: ${b[index]}`); });
    same++;
  }
  // The switch off (keepSpans false) leaves every span out, as r3.
  const shown = DOC.replace('회의실 잡기', '회의실 잡기 가');
  assert(programSameOutline(a, shown.split('\n')));
  assert((programAlignRows(DOC, shown, rows) as (typeof rows[number] | undefined)[]).every(row => !row || row.subtreeEndIndex === undefined));
  assert((programAlignRows(DOC, shown, rows, true) as (typeof rows[number] | undefined)[]).some(row => row?.subtreeEndIndex !== undefined));
  // Indent, blankness and fence marks are the outline.
  for (const [from, to] of [['  - [ ] 장보기', '    - [ ] 장보기'], ['그냥 글', ''], ['코드 - [ ] 아님', '```']] as const) assert.equal(programSameOutline(a, DOC.replace(from, to).split('\n')), false, to);
  assert(same > 20 && other > 50, `${same} same, ${other} other`);
});

test('the editor: the patch path runs only with config.rowPatch; anything else renders every row as before', () => {
  const vendor = readFileSync(new URL('./vendor/text-editor.cjs', import.meta.url), 'utf8').replace(/\r/g, '');
  assert(vendor.includes('const rowPatchOn = config.rowPatch === true, ROW_PATCH_LIMIT = 8;'));
  assert(vendor.includes('const nextRowRender = rowPatchOn ? null : copyRowRender(rowRenderContext, lines, metadata, fenced, startLine, endLine, actionsDisabled);'), 'off: r3\'s plain-row path unchanged');
  assert(vendor.includes('const rowPatch = rowPatchOn ? planRowPatch(lines, metadata, fenced, editorActive, startLine, endLine, paintDisabled) : null;'));
  assert(vendor.includes("if (mode !== 'live' || readingView || foldedIds.size || hiddenRows.size || gesture || moveState || targetEntries.length) return null;"), 'reading, folded and move views draw every row');
  assert(vendor.includes('if (!last || last.view !== memo.view || !rowsIntact(last.rows)) return { changed: null, memo };'));
  assert(vendor.includes('if (last.sigs.length !== sigs.length) return planRowSplice(last, memo);'), 'a new row count: the splice plan (typelag ⑤)');
  assert(vendor.includes("lines.forEach((line, index) => { const row = buildRow(line, index); rows.push(row); fragment.append(row); });"), 'the full path builds each row with the same buildRow');
  assert(vendor.includes('[...only].some((index) => rows[index].offsetHeight !== geometryMemo.heights[index])))) { syncGeometry(); return; }'), 'a height change measures every row');
  assert(vendor.includes("if (!rowPatchOn) { root.style.setProperty('--tle-native-top',`${top}px`);root.style.setProperty('--tle-native-bottom',`${bottom}px`); }"), 'off: the root variables, as r3');
  const css = readFileSync(new URL('./vendor/text-editor.css', import.meta.url), 'utf8');
  assert(css.includes("@property --tle-native-top-own { syntax: '*'; inherits: false; }"));
  assert(css.includes('mask-image: linear-gradient(to bottom, transparent var(--tle-native-top-own, var(--tle-native-top)), #000 var(--tle-native-top-own, var(--tle-native-top))'), 'unset own values fall back to the root\'s');
  const editor = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramTextEditor.tsx', import.meta.url), 'utf8').replace(/\r/g, '');
  assert(editor.includes('const rowPatch = programRowPatchEnabled();') && editor.includes('      rowPatch,\n') && editor.includes('programAlignRows(accepted, shown, rows, rowPatch)'));
  const space = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramSpace.tsx', import.meta.url), 'utf8').replace(/\r/g, '');
  assert(space.includes('<ProgramPersonalAuthoringSheet live={!rowPatch || authoringSheetOpen}') && space.includes('onClose={() => setAuthoringSheetOpen(false)}'), 'the closed sheet stays mounted, frozen');
});

// typelag ⑤ (총괄 11/12, Codex inbox/enter-breakdown-20261111-2338): Enter and other edits that change the row count keep
// the rows before and after the edit, under the same switch.
test('the editor: a new row count keeps the rows before and after the edit (switch on), every row as before (off)', () => {
  const vendor = readFileSync(new URL('./vendor/text-editor.cjs', import.meta.url), 'utf8').replace(/\r/g, '');
  // The plan: the same text before and after the edit; a kept row whose signature changed, and every new line, is drawn.
  assert(vendor.includes('while (head < most && before[head] === after[head]) head++;'));
  assert(vendor.includes('if ((old < 0 || sigs[index] !== last.sigs[old]) && changed.push(index) > ROW_PATCH_LIMIT) return { changed: null, memo };'), 'more than a few rows: every row');
  // Signatures read other rows relative to the row; a move trace's button keeps its own index.
  assert(vendor.includes('owner === null ? null : owner - index, scope, action, owns, label, relativeDay(line), end, traced]) + metaJson;'));
  assert(vendor.includes("withoutSubtreeEnd = (key, value) => key === 'subtreeEndIndex' ? undefined : value;"));
  // A kept row takes its new index, owner and controls; its controls read their line when pressed (switch on only).
  assert(vendor.includes('row.dataset.lineIndex = String(index);\n          if (row.dataset.checkOwner !== undefined) row.dataset.checkOwner = String(Number(row.dataset.checkOwner) + delta);'));
  assert.equal(vendor.split('const at = () => rowPatchOn ? Number(button.dataset.lineIndex) : index;').length - 1, 2, 'check and row controls');
  assert(vendor.includes("button.addEventListener('click', () => toggleFold(rowPatchOn ? Number(button.dataset.lineIndex) : index));"));
  // The measure: kept controls move vertically only; a kept row whose height changed, or a control never measured, measures every row.
  assert(vendor.includes('(moved ? heights.some((value, index) => !only.has(index) && value !== geometryMemo.heights[index]) :'));
  assert(vendor.includes('if (movedChecks.includes(null)) { syncGeometry(); return; }'));
  // Native paint: the ruler is spliced, and measured once per command (switch on); off keeps r3's order and rebuild.
  assert(vendor.includes("if (rowPatchOn && nativePaintRows.length !== lines.length && nativePaintRows.length && nativePaintRows.length === old.split('\\n').length) {"));
  assert(vendor.includes("if (rowPatchOn && nativeDepth && !reconciled && doc.activeElement === textarea) { root.classList.add('tle-native-input'); return; }"));
  assert(vendor.includes('if (rowPatchOn) syncNativePaint(true);\n      syncGeometry(patchedRows, patchOwnersBefore);\n      if (!rowPatchOn) syncNativePaint(true);'));
});

test('row paint metadata names no row by position but its subtree\'s end: an Enter keeps every other row\'s, relative to the row', () => {
  const { state, id } = workspace(), before = textEditorRows(state, id), lines = DOC.split('\n');
  const relative = (row: (typeof before)[number], index: number) => JSON.stringify({ ...row, subtreeEndIndex: row.subtreeEndIndex === undefined ? undefined : row.subtreeEndIndex - index });
  let edits = 0;
  lines.forEach((line, n) => {
    if (!/^\s*- \[ \] \S/.test(line)) return;
    const end = lines.slice(0, n + 1).join('\n').length, next = DOC.slice(0, end) + `\n${/^(\s*)/.exec(line)![1]}- [ ] ` + DOC.slice(end);
    const edit = M.editTextResult(state, id, next, { folderText: true });
    if (edit.reason !== null) return;
    const after = textEditorRows(edit.state, id);
    assert.equal(after.length, before.length + 1);
    const changed = after.filter((row, index) => index === n + 1 || relative(row, index) !== relative(before[index <= n ? index : index - 1], index <= n ? index : index - 1)).length;
    // The new line, and the rows whose subtree now takes it in (its date head, folder and parent task).
    assert(changed <= 5, `${n}: ${changed} rows changed`);
    edits++;
  });
  assert(edits >= 5, `${edits} edits`);
});
