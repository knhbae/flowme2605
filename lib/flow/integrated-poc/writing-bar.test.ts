import assert from 'node:assert/strict';
import test from 'node:test';
import { createWritingBarHold, taskMarkerLock, toggleTaskLine, writingBarLine } from './writing-bar';
import { textEditorRows, textWorkspaceModel as M, type TextEditorRowMeta, type TextWorkspaceState } from './text-workspace';

const end = (raw: string, index: number) => raw.split('\n').slice(0, index + 1).join('\n').length;
const noLock = () => null;

test('← needs indentation and → needs a previous line at least as deep, so the first item cannot be indented', () => {
  const line = (raw: string, index: number) => { const { canOutdent, canIndent, isTask } = writingBarLine(raw, end(raw, index), noLock); return { canOutdent, canIndent, isTask }; };
  assert.deepEqual(line('- [ ] 첫 할 일', 0), { canOutdent: false, canIndent: false, isTask: true });
  assert.deepEqual(line('- [ ] 위\n- [ ] 아래', 1), { canOutdent: false, canIndent: true, isTask: true });
  assert.deepEqual(line('- [ ] 위\n  - [ ] 아래', 1), { canOutdent: true, canIndent: false, isTask: true });
  assert.deepEqual(line('- [ ] 위\n\n메모', 2), { canOutdent: false, canIndent: true, isTask: false });
  let asked: boolean[] = [];
  writingBarLine('- [ ] 할 일\n그냥 글', end('- [ ] 할 일\n그냥 글', 1), isTask => { asked.push(isTask); return null; });
  assert.deepEqual(asked, [false]);
  asked = [];
  assert.equal(writingBarLine('- [x] 끝냄', 2, isTask => { asked.push(isTask); return '잠김'; }).markerLock, '잠김');
  assert.deepEqual(asked, [true]);
});

test('☐ turns a line into a task like typing "- [ ] ", and a task back into its plain text, keeping the caret in the text', () => {
  assert.deepEqual(toggleTaskLine('장보기', 3), { start: 0, end: 3, text: '- [ ] 장보기', caret: 9 });
  assert.deepEqual(toggleTaskLine('- 장보기', 5), { start: 0, end: 5, text: '- [ ] 장보기', caret: 9 });
  assert.deepEqual(toggleTaskLine('- [ ] 장보기', 9), { start: 0, end: 9, text: '장보기', caret: 3 });
  assert.deepEqual(toggleTaskLine('- [x] 장보기', 7), { start: 0, end: 9, text: '장보기', caret: 1 });
  assert.deepEqual(toggleTaskLine('- [ ] 장보기', 2), { start: 0, end: 9, text: '장보기', caret: 0 });
  assert.deepEqual(toggleTaskLine('- [ ] ', 6), { start: 0, end: 6, text: '', caret: 0 });
  const nested = '- [ ] 부모\n  빨래';
  assert.deepEqual(toggleTaskLine(nested, end(nested, 1)), { start: 9, end: 13, text: '  - [ ] 빨래', caret: 9 + 10 });
  assert.deepEqual(toggleTaskLine('  - [ ] 빨래', 10), { start: 0, end: 10, text: '  빨래', caret: 4 });
  assert.deepEqual(toggleTaskLine('', 0), { start: 0, end: 0, text: '- [ ] ', caret: 6 });
});

const meta = (patch: Partial<TextEditorRowMeta>) => ({ id: 'l', kind: 'task', isCanonical: true, depth: 0, guideLevels: [], subtreeEndIndex: 1, label: '', ...patch }) as TextEditorRowMeta;
const workspace = (patch: Partial<Pick<TextWorkspaceState, 'progressRecords' | 'bindings'>> = {}) => ({ progressRecords: [], bindings: [], ...patch });

test('☐ will not take the task mark off a reference, a task with records, or a task linked from another document', () => {
  assert.equal(taskMarkerLock(undefined, workspace(), 'd'), null);
  assert.equal(taskMarkerLock(meta({ progressTargetId: 't' }), workspace(), 'd'), null);
  assert.match(taskMarkerLock(meta({ kind: 'reference', progressTargetId: 't' }), workspace(), 'd')!, /다른 문서의 할 일을 가리키는/);
  assert.match(taskMarkerLock(meta({ progressTargetId: 't' }), workspace({ progressRecords: [{ taskId: 't', date: '2026-10-30', percent: 100 }] }), 'd')!, /진행 기록/);
  assert.match(taskMarkerLock(meta({ progressTargetId: 't' }), workspace({ bindings: [{ kind: 'task', docId: 'other', lineId: 'r', taskId: 't', dateMode: 'keep' }] }), 'd')!, /다른 문서에서 연결/);
  assert.equal(taskMarkerLock(meta({ progressTargetId: 't' }), workspace({ bindings: [{ kind: 'task', docId: 'd', lineId: 'r', taskId: 't', dateMode: 'keep' }] }), 'd'), null);
});

test('with real model rows, a task with a recorded check is locked and a fresh task is not', () => {
  let state = { version: 11, folders: [{ id: 'f', title: '합성', parentId: null }], documents: [{ id: 'd', title: '합성', folder: '합성', folderId: 'f', lines: [] }],
    flows: [], bindings: [], taskScopes: {}, itemScopes: {}, progressRecords: [] } as unknown as TextWorkspaceState;
  state = M.editText(state, 'd', '- [ ] 새 할 일\n- [ ] 끝낼 할 일', { progressDate: '2026-10-30' });
  state = M.recordProgress(state, M.tasks(state)[1].id, '2026-10-30', 100);
  const rows = textEditorRows(state, 'd');
  assert.equal(taskMarkerLock(rows[0], state, 'd'), null);
  assert.match(taskMarkerLock(rows[1], state, 'd')!, /진행 기록/);
});

test('a press while input is busy is held and runs exactly once when input settles', () => {
  const hold = createWritingBarHold();
  assert.equal(hold.press('indent', false), 'indent');
  assert.equal(hold.held(), null);

  assert.equal(hold.press('indent', true), null);
  assert.equal(hold.press('indent', true), null);
  assert.equal(hold.held(), 'indent');
  assert.equal(hold.release(true), null);
  assert.equal(hold.release(false), 'indent');
  assert.equal(hold.release(false), null);

  hold.press('task', true); hold.press('enter', true);
  assert.equal(hold.release(false), 'enter');
  hold.press('outdent', true); hold.cancel();
  assert.equal(hold.release(false), null);
});
