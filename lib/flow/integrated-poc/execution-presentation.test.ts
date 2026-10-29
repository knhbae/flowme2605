import assert from 'node:assert/strict';
import test from 'node:test';
import { programExecutionList, programExecutionRowMeta, readProgramTaskDatePresentation, type ProgramExecutionListItem } from './execution-presentation';
import { programTaskDateChangeHint } from './text-context-presentation';
import type { ProgramOrderedExecutionRow } from './recurrence-order';
import { textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';

const today = '2026-10-29';
const row = (id: string, date: string | null, done = false) =>
  ({ kind: 'text-task', key: id, date, task: { id, date, done } }) as unknown as ProgramOrderedExecutionRow;
const shape = (items: ProgramExecutionListItem[]) => items.map(item => item.kind === 'heading' ? `# ${item.label}${item.addDate ? ' ＋' : ''}`
  : item.kind === 'row' ? `${item.entry.key}${item.dated ? '' : ' (date shown)'}` : `~ ${item.dates.length} ${item.open ? 'open' : 'folded'}`);

test('today splits into a counted overdue group and the viewed day, which carries "＋"', () => {
  const rows = [row('old', '2026-10-09'), row('older', '2026-10-20'), row('a', today), row('b', today)];
  assert.deepEqual(shape(programExecutionList(rows, 'today', today, today)),
    ['# 지난 미완료 · 2', 'old (date shown)', 'older (date shown)', '# 오늘 · 10월 29일 (목) ＋', 'a', 'b']);
  assert.deepEqual(shape(programExecutionList([row('a', '2026-10-31')], 'today', '2026-10-31', today)), ['# 10월 31일 (토) ＋', 'a']);
});

test('week gets a counted heading per day; days without rows fold into one line and open as empty headings in date order', () => {
  // 2026-10-29 (목) falls in the week 10/26 (월) – 11/1 (일).
  const rows = [row('mon', '2026-10-26'), row('thu1', today), row('thu2', today), row('sat', '2026-10-31')];
  assert.deepEqual(shape(programExecutionList(rows, 'week', today, today)),
    ['# 10월 26일 (월) · 1 ＋', 'mon', '# 오늘 · 10월 29일 (목) · 2 ＋', 'thu1', 'thu2', '# 10월 31일 (토) · 1 ＋', 'sat', '~ 4 folded']);
  assert.deepEqual(shape(programExecutionList(rows, 'week', today, today, true)),
    ['# 10월 26일 (월) · 1 ＋', 'mon', '# 10월 27일 (화) ＋', '# 10월 28일 (수) ＋', '# 오늘 · 10월 29일 (목) · 2 ＋', 'thu1', 'thu2',
      '# 10월 30일 (금) ＋', '# 10월 31일 (토) · 1 ＋', 'sat', '# 11월 1일 (일) ＋', '~ 4 open']);
  const month = programExecutionList([row('a', '2026-10-05')], 'month', today, today);
  assert.deepEqual(month.at(-1), { kind: 'empty-days', dates: Array.from({ length: 31 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}`).filter(day => day !== '2026-10-05'), open: false });
  assert.deepEqual(shape(programExecutionList([], 'week', today, today)), ['~ 7 folded']);
});

test('other views add no headings; the date-less view does not repeat "날짜 없음" on each row', () => {
  assert.deepEqual(shape(programExecutionList([row('a', today), row('b', null)], 'all', today, today)), ['a (date shown)', 'b (date shown)']);
  assert.deepEqual(shape(programExecutionList([row('b', null)], 'undated', today, today)), ['b']);
});

test('row meta says how late, merges a record made on the due day, and drops a date the heading already says', () => {
  const meta = (input: Partial<Parameters<typeof programExecutionRowMeta>[0]>) =>
    programExecutionRowMeta({ date: null, done: false, progress: null, today, dated: false, ...input });
  assert.deepEqual(meta({ date: '2026-10-09' }), { late: '20일 지남', parts: ['10월 9일'] });
  assert.deepEqual(meta({ date: '2026-10-09', progress: { date: '2026-10-09', percent: 50 } }), { late: '20일 지남', parts: ['50% 기록', '10월 9일'] });
  assert.deepEqual(meta({ date: '2026-10-09', progress: { date: '2026-10-20', percent: 50 } }), { late: '20일 지남', parts: ['10월 9일', '50% 기록 · 10월 20일'] });
  assert.deepEqual(meta({ date: '2026-10-09', done: true }), { late: null, parts: ['10월 9일 (금)'] });
  assert.deepEqual(meta({ date: '2026-10-31' }), { late: null, parts: ['10월 31일 (토)'] });
  assert.deepEqual(meta({ date: today }), { late: null, parts: ['오늘'] });
  assert.deepEqual(meta({ date: null }), { late: null, parts: ['날짜 없음'] });
  assert.deepEqual(meta({ date: today, dated: true }), { late: null, parts: [] });
  assert.deepEqual(meta({ date: today, dated: true, progress: { date: today, percent: 50 } }), { late: null, parts: [] });
  assert.deepEqual(meta({ date: today, dated: true, progress: { date: '2026-10-28', percent: 30 } }), { late: null, parts: ['30% 기록 · 어제'] });
});

test('the detail and editor date windows speak of "이 할 일의 날짜" and "날짜 묶음", not internal words or ISO dates', () => {
  let state = { version: 11, folders: [{ id: 'f', title: '합성', parentId: null }], documents: [{ id: 'd', title: '합성', folder: '합성', folderId: 'f', lines: [] }],
    flows: [], bindings: [], taskScopes: {}, itemScopes: {}, progressRecords: [] } as unknown as TextWorkspaceState;
  state = M.editText(state, 'd', '[2026-10-01]\n- [ ] 묶음 할 일\n- [ ] 따로 할 일\n  - 날짜: 2026-10-09');
  const [grouped, own] = M.tasks(state);
  const groupedDate = readProgramTaskDatePresentation(state, grouped, today)!, ownDate = readProgramTaskDatePresentation(state, own, today)!;
  assert.equal(groupedDate.label, '날짜 묶음 · 10월 1일');
  assert.deepEqual([ownDate.label, ownDate.context], ['이 할 일의 날짜 · 10월 9일', '위 날짜 묶음은 10월 1일']);
  assert.equal(programTaskDateChangeHint(groupedDate, '2026-10-31', undefined, today), '이 할 일만 10월 31일로 정합니다. 원문 위치와 날짜 묶음은 그대로입니다.');
  assert.equal(programTaskDateChangeHint(groupedDate, '', undefined, today), '이 할 일만 미정으로 정합니다. 원문 위치와 날짜 묶음은 그대로입니다.');
  assert.equal(programTaskDateChangeHint(groupedDate, '2026-10-01', { current: '', draft: '09:00' }, today),
    '시간을 바꾸면 이 할 일의 날짜도 10월 1일로 정해집니다. 원문 위치와 날짜 묶음은 그대로입니다.');
  for (const text of [groupedDate.label, ownDate.label, ownDate.context!]) assert.doesNotMatch(text, /\d{4}-\d{2}-\d{2}|개별|구획|조회 날짜/);
});
