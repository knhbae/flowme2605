import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { programDueLabel } from './due-date';
import { createEmptyTextWorkspace, textEditorRows, textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';

// Redesign 2 (총괄 11/12, W-TXT-02): '- 마감: YYYY-MM-DD' under a task is its due date: D-n beside it, never its date.
const require = createRequire(import.meta.url);
const plans = require('./text-input-plan.cjs') as { planPropertyEnter: (raw: string, selection: { start: number; end: number; direction: string }) => unknown };

function doc(raw: string) {
  let state: TextWorkspaceState = M.addDocument(createEmptyTextWorkspace(), { title: '마감 글' });
  const id = state.documents.at(-1)!.id;
  const edit = M.editTextResult(state, id, raw, { folderText: true });
  assert.equal(edit.reason, null);
  state = edit.state;
  return { state, id, task: (title: string) => M.tasks(state).find(task => task.title === title)! };
}

test('the model reads a due date beside the task: never its date; a value without a year in its section\'s year', () => {
  const raw = '[2026-11-12]\n- [ ] 발표 자료\n  - 마감: 2026-11-20\n- [ ] 회의록\n  - 마감: 11/9\n- [ ] 언젠가\n  - 마감: 다음 달\n- [ ] 그냥\n[미정]\n- [ ] 미정 일\n  - 마감: 11/30';
  const { state, id, task } = doc(raw);
  assert.equal(M.raw(M.getDocument(state, id)!), raw, 'the text byte for byte');
  assert(M.validate(state));
  assert.deepEqual(Object.keys(state).sort(), ['bindings', 'documents', 'flows', 'folders', 'itemScopes', 'progressRecords', 'taskScopes', 'version'], 'the account shape (W-TXT-06)');
  assert.equal(state.version, 11);
  // 'none': no '- 마감:' line (the key is not there); null: a line whose value cannot be read.
  assert.deepEqual(['발표 자료', '회의록', '언젠가', '그냥', '미정 일'].map(title => [task(title).date, 'due' in task(title) ? task(title).due : 'none']), [
    ['2026-11-12', '2026-11-20'], ['2026-11-12', '2026-11-09'], ['2026-11-12', null], ['2026-11-12', 'none'], [null, null]]);
  // The line is the task's property: it belongs to the task (it moves with it), it is not a task or a note.
  const rows = M.rowMeta(state, id), due = rows.find(row => row.text.trim() === '- 마감: 2026-11-20')!;
  assert.equal(due.kind, 'property'); assert.equal(due.taskId, task('발표 자료').id);
  // The writing view's rows carry the date the model read, on the '- 마감:' line only.
  const meta = textEditorRows(state, id);
  assert.deepEqual(meta.filter(row => row.dueDate).map(row => [rows.find(entry => entry.id === row.id)!.text.trim(), row.dueDate]),
    [['- 마감: 2026-11-20', '2026-11-20'], ['- 마감: 11/9', '2026-11-09']]);
});

test('the list label: D-n ahead, 오늘 마감, past shown apart; none without a readable date', () => {
  assert.deepEqual(programDueLabel('2026-11-20', '2026-11-12'), { label: 'D-8', state: 'ahead', days: 8 });
  assert.deepEqual(programDueLabel('2026-11-12', '2026-11-12'), { label: '오늘 마감', state: 'today', days: 0 });
  assert.deepEqual(programDueLabel('2026-11-09', '2026-11-12'), { label: '마감 3일 지남', state: 'over', days: -3 });
  assert.deepEqual(programDueLabel('2026-12-01', '2026-11-30'), { label: 'D-1', state: 'ahead', days: 1 });
  assert.equal(programDueLabel(null, '2026-11-12'), null);
  assert.equal(programDueLabel('11/20', '2026-11-12'), null);
});

test('Enter at the end of a 마감 line opens the owner\'s next task, as at a 날짜 or 시간 line', () => {
  const raw = '[2026-11-12]\n- [ ] 발표 자료\n  - 마감: 2026-11-20', at = raw.length;
  const due = plans.planPropertyEnter(raw, { start: at, end: at, direction: 'none' });
  const dated = raw.replace('마감: 2026-11-20', '시간: 09:00'), atDated = dated.length;
  const time = plans.planPropertyEnter(dated, { start: atDated, end: atDated, direction: 'none' }) as { text: string } | null;
  assert(due && time, 'both plan the next task');
  assert.equal((due as { text: string }).text, time!.text);
});

test('the screen: the writing view paints 마감 with D-n and marks past and today; the 오늘 list shows D-n', () => {
  const editor = readFileSync(new URL('./vendor/text-editor.cjs', import.meta.url), 'utf8').replace(/\r/g, '');
  assert(editor.includes("const PROPERTY = /^(?: {2,}|\\t+)-\\s+(?:날짜|메모|시간|마감|기다림):/;"), 'W-TXT-09 adds 기다림 beside it');
  assert(editor.includes("return label && days !== null ? `마감 ${label} · ${dueText(days)}` : null;"));
  assert(editor.includes("if (dueIn !== null) labelSpan.dataset.due = dueIn < 0 ? 'over' : dueIn === 0 ? 'today' : 'ahead';"));
  assert(editor.includes("'repeatLabel', 'repeatAt', 'trace', 'dueDate'];"), 'the plain-row paint fields carry it');
  const css = readFileSync(new URL('./vendor/text-editor.css', import.meta.url), 'utf8');
  assert(css.includes('.tle-property-date-label[data-due="over"] { color: #8a4b1f; font-weight: 600; }'));
  const space = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramSpace.tsx', import.meta.url), 'utf8').replace(/\r/g, '');
  assert(space.includes("{(due => due && <><span className={due.state === 'over' ? styles.rowLate : undefined} data-row-due={due.state}>{due.label}</span> · </>)(programDueLabel(task.due, today))}"));
  const raw = '[2026-11-12]\n- [ ] 답 확인\n  - 마감: 11/20\n  - 기다림: 2026-11-10';
  const { state, id, task } = doc(raw);
  assert.equal(task('답 확인').due, '2026-11-20');
  assert.equal(task('답 확인').waitSince, '2026-11-10');
  const wait = M.rowMeta(state, id).find(row => row.text.trim() === '- 기다림: 2026-11-10')!;
  assert.equal(wait.kind, 'property'); assert.equal(wait.taskId, task('답 확인').id);
  assert.equal(M.raw(M.getDocument(state, id)!), raw, 'property recognition preserves RAW');
});
