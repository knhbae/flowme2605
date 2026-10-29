import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import * as ts from 'typescript';
import { childPlace, insertPlaceAfter, insertPreview, planLayoutInsertion } from './writing-insert-place';
import { textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';

function workspace(raw: string) {
  const state = { version: 11, folders: [{ id: 'f', title: '합성', parentId: null }], documents: [{ id: 'd', title: '합성', folder: '합성', folderId: 'f', lines: [] }],
    flows: [], bindings: [], taskScopes: {}, itemScopes: {}, progressRecords: [] } as unknown as TextWorkspaceState;
  return M.editText(state, 'd', raw);
}
const PARENT = '- [ ] 부모\n  - 메모: 부모 메모\n  - [ ] 하위 1\n  - [ ] 하위 2\n- [ ] 다음';
const lineId = (state: TextWorkspaceState, text: string) => M.getDocument(state, 'd')!.lines.find(line => line.text.trim() === text)!.id;
const relations = (state: TextWorkspaceState, raw: string) => {
  const doc = M.getDocument(state, 'd')!, lines = raw.split('\n'), ids = new Map<number, string>();
  // Keep the old IDs on unchanged lines so "what each line belongs to" compares line by line.
  let cursor = 0;
  const kept = lines.map((text, index) => { if (cursor < doc.lines.length && doc.lines[cursor].text === text) { ids.set(index, doc.lines[cursor].id); return doc.lines[cursor++]; } return { id: `new-${index}`, text }; });
  const rows = M.parseDocument({ ...doc, lines: kept }, state).rows;
  return Object.fromEntries(rows.filter(row => !row.id.startsWith('new-') && row.kind !== 'blank')
    .map(row => [row.text.trim(), `${row.kind}<${row.parentLineId ? kept.find(line => line.id === row.parentLineId)!.text.trim() : '-'}`]));
};
const insert = (raw: string, offset: number, text: string, typed: string) => raw.slice(0, offset) + text.replace(/^(## )?/, `$1${typed}`) + raw.slice(offset);

// The rule R3 and S1 used: right after the pressed physical line.
function oldPlace(state: TextWorkspaceState, pressed: string, kind: 'step' | 'description') {
  const doc = M.getDocument(state, 'd')!, index = doc.lines.findIndex(line => line.text.trim() === pressed);
  const at = doc.lines.slice(0, index + 1).reduce((n, line, i) => n + line.text.length + (i < index ? 1 : 0), 0);
  return { at, text: '\n' + (kind === 'step' ? '## ' : '') };
}

test('reproduced: "단계 추가" on a child line, as R3 and S1 placed it, turns the next subcheck into a separate task', () => {
  const state = workspace(PARENT), raw = M.raw(M.getDocument(state, 'd')!);
  const before = relations(state, raw);
  assert.equal(before['- [ ] 하위 2'], 'subcheck<- [ ] 부모');
  const old = oldPlace(state, '- [ ] 하위 1', 'step');
  const after = relations(state, raw.slice(0, old.at) + old.text + '단계' + raw.slice(old.at));
  assert.equal(after['- [ ] 하위 2'], 'task<## 단계');
  // On the parent line the same rule cuts the memo off its task; the model refuses that edit outright.
  const parent = oldPlace(state, '- [ ] 부모', 'description');
  assert.equal(M.editText(state, 'd', raw.slice(0, parent.at) + parent.text + '설명' + raw.slice(parent.at)), state);
});

test('"단계 추가" and "설명 이어 쓰기" now land after the whole top-level block and keep every line where it was', () => {
  const state = workspace(PARENT), raw = M.raw(M.getDocument(state, 'd')!), before = relations(state, raw);
  for (const pressed of ['- [ ] 부모', '- 메모: 부모 메모', '- [ ] 하위 1', '- [ ] 하위 2']) for (const kind of ['step', 'description'] as const) {
    const place = planLayoutInsertion(state, 'd', lineId(state, pressed), kind);
    assert(place.ok, `${pressed} ${kind}`);
    assert.equal(place.index, 4);
    assert.equal(place.blockTitle, '부모');
    const next = insert(raw, place.offset, place.text, kind === 'step' ? '단계' : '설명');
    assert.equal(next.split('\n')[4], kind === 'step' ? '## 단계' : '설명');
    const after = relations(state, next);
    for (const [line, relation] of Object.entries(before)) assert.equal(after[line], relation, `${pressed} ${kind}: ${line}`);
  }
  assert.equal(insertPlaceAfter((planLayoutInsertion(state, 'd', lineId(state, '- [ ] 부모'), 'step') as { after: number }).after, '부모'), '‘부모’ 묶음 다음 · 3줄 뒤');
  const plain = workspace('- [ ] 혼자\n- [ ] 다음'), alone = planLayoutInsertion(plain, 'd', lineId(plain, '- [ ] 혼자'), 'step');
  assert(alone.ok); assert.equal(alone.index, 1); assert.equal(insertPlaceAfter(alone.after, alone.blockTitle), '바로 아래');
  // At the end of the document the new line goes after a separator and the caret sits after "## ".
  const last = planLayoutInsertion(plain, 'd', lineId(plain, '- [ ] 다음'), 'step');
  assert(last.ok); assert.deepEqual([last.text, last.caretOffset], ['\n## ', M.raw(M.getDocument(plain, 'd')!).length + 4]);
});

test('a place where the new line would not stay a step or a free line is refused, and the source is untouched', () => {
  const fenced = workspace('- [ ] 앞\n```\n코드 줄\n```\n- [ ] 뒤');
  for (const kind of ['step', 'description'] as const) {
    const place = planLayoutInsertion(fenced, 'd', lineId(fenced, '코드 줄'), kind);
    assert(!place.ok);
    assert.match(place.reason, /넣지 않았습니다\. 원문은 그대로입니다/);
  }
  assert(planLayoutInsertion(fenced, 'd', lineId(fenced, '- [ ] 앞'), 'step').ok);
});

test('menu places: 하위 할 일 after the memo as the first child, 다음 할 일 after the whole block (UX cases 1–3)', () => {
  const plain = workspace('- [ ] 혼자\n- [ ] 다음');
  assert.deepEqual(childPlace(plain, 'd', lineId(plain, '- [ ] 혼자')), { index: 1, label: '바로 아래' });
  const options = M.insertionOptions(plain, 'd', lineId(plain, '- [ ] 혼자')), next = options.find(option => option.label === '다음 할 일')!;
  assert.equal(insertPlaceAfter(next.index - 0 - 1, '혼자'), '바로 아래');

  const full = workspace(PARENT), parentId = lineId(full, '- [ ] 부모');
  assert.deepEqual(childPlace(full, 'd', parentId), { index: 2, label: '메모 다음, 첫 하위로' });
  const sibling = M.insertionOptions(full, 'd', parentId).find(option => option.label === '다음 할 일')!;
  assert.equal(insertPlaceAfter(sibling.index - 0 - 1, '부모'), '‘부모’ 묶음 다음 · 3줄 뒤');
  const childrenOnly = workspace('- [ ] 부모\n  - [ ] 하위 1');
  assert.equal(childPlace(childrenOnly, 'd', lineId(childrenOnly, '- [ ] 부모'))!.label, '바로 아래, 첫 하위로');

  // Case 3: ＋ on a child offers the next one at the same height, after that child's own block.
  const nested = workspace('- [ ] 부모\n  - [ ] 하위 1\n    - 메모: 하위 메모\n  - [ ] 하위 2'), childId = lineId(nested, '- [ ] 하위 1');
  const nextChild = M.insertionOptions(nested, 'd', childId).find(option => option.label === '다음 하위 체크')!;
  assert.deepEqual([nextChild.index, nextChild.depth], [3, 1]);
  assert.equal(insertPlaceAfter(nextChild.index - 1 - 1, '하위 1'), '‘하위 1’ 묶음 다음 · 1줄 뒤');
});

test('the preview shows the task, a few of its lines, and the dashed line exactly where the choice lands', () => {
  const full = workspace(PARENT), parentId = lineId(full, '- [ ] 부모');
  assert.deepEqual(insertPreview(full, 'd', parentId, 2, 1, '새 하위 할 일이 여기에').map(line => `${line.kind}:${line.text}`),
    ['anchor:부모', 'context:메모: 부모 메모', 'new:새 하위 할 일이 여기에', 'context:하위 1', 'more:… 1줄']);
  assert.deepEqual(insertPreview(full, 'd', parentId, 4, 0).map(line => `${line.kind}:${line.text}`),
    ['anchor:부모', 'context:메모: 부모 메모', 'context:하위 1', 'context:하위 2', 'new:새 할 일이 여기에']);
});

test('the editor menu uses these places: split child and memo buttons in UX order, layout through the guard', () => {
  const source = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramTextEditor.tsx', import.meta.url), 'utf8');
  const tree = ts.createSourceFile('ProgramTextEditor.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let layout = '', section = '';
  const visit = (node: ts.Node) => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'insertAuthoringLayout') layout = node.getText(tree);
    if (ts.isJsxElement(node) && node.openingElement.getText(tree).includes('aria-label="이 위치에 추가"')) section = node.getText(tree);
    ts.forEachChild(node, visit);
  };
  visit(tree);
  assert.match(layout, /planLayoutInsertion\(currentState\(\),propsRef\.current\.docId,panel\?\.lineId\?\?null,kind\)/);
  assert.match(layout, /if\(!place\.ok\)\{setMessage\(place\.reason\);return;\}/);
  const order = ["openAuthoringChild(row!.index,'task')", 'menuInsertions.map', "openAuthoringChild(row!.index,'memo')", "['step','description']", '반복·Flow 만들기'].map(part => section.indexOf(part));
  assert(order.every(index => index >= 0), String(order));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  assert.doesNotMatch(section, /부모 메모 · 독립 하위 할 일/);
  assert.match(source, /initialKind=\{childTarget\.kind\}/);
});
