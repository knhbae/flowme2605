import assert from 'node:assert/strict';
import test from 'node:test';
import plans from './text-input-plan.cjs';
import { createEmptyTextWorkspace, textEditorRows, textWorkspaceModel as M } from './text-workspace';

const caret = (raw: string, line: number, column = 3) => {
  const start = raw.split('\n').slice(0, line).reduce((sum, text) => sum + text.length + 1, 0) + column;
  return { start, end: start, direction: 'none' as const };
};
const outline = (raw: string) => raw.split('\n').map((line, index, lines) => {
  const depth = (line.match(/^ */)?.[0].length ?? 0) / 2;
  let subtreeEndIndex = index + 1;
  while (subtreeEndIndex < lines.length && (!lines[subtreeEndIndex].trim() || (lines[subtreeEndIndex].match(/^ */)?.[0].length ?? 0) / 2 > depth)) subtreeEndIndex++;
  return { kind: line.includes('- 메모:') ? 'property' : 'note', subtreeEndIndex };
});

test('memo property Enter plan repeats only the existing property spelling at the end', () => {
  const raw = '- [ ] 할 일\n  - 메모: 첫 문장', selection = caret(raw, 1, raw.split('\n')[1].length);
  const plan = plans.planMemoEnter(raw, selection, { kind: 'property' });
  assert(plan); assert.equal(plan.nextRaw, `${raw}\n  - 메모: `);
  assert.equal(plan.selectionAfter.start, plan.nextRaw.length); assert.equal(plan.selectionAfter.end, plan.nextRaw.length);
  for (const [value, selected, meta] of [
    [raw, { ...selection, end: selection.end - 1 }, { kind: 'property' }],
    [raw, caret(raw, 1, 10), { kind: 'property' }],
    ['  일반 메모', { start: 9, end: 9 }, { kind: 'note' }],
    ['  - 메모: 일반 목록', { start: 13, end: 13 }, { kind: 'note' }],
    ['   - 메모: 홀수', { start: 11, end: 11 }, { kind: 'property' }],
    ['  - 시간: 09:00', { start: 13, end: 13 }, { kind: 'property' }],
  ] as const) assert.equal(plans.planMemoEnter(value, selected, meta), null);
});

test('memo continuation uses the same Item and current parser with unchanged dates, ownership and history', () => {
  let state = M.addDocument(createEmptyTextWorkspace(), { title: '메모' });
  const id = state.documents[0].id, raw = '[2026-10-01]\n- [ ] 할 일\n  - 메모: 첫 문장';
  state = M.editText(state, id, raw);
  const task = M.tasks(state)[0]; state = M.recordProgress(state, task.id, '2026-09-30', 20);
  const plan = plans.planMemoEnter(raw, { start: raw.length, end: raw.length }, { kind: 'property' }); assert(plan);
  const result = M.editTextResult(state, id, `${plan.nextRaw}둘째 문장`);
  assert.equal(result.reason, null);
  const updated = M.tasks(result.state)[0];
  assert.equal(updated.id, task.id); assert.equal(updated.note, '첫 문장\n둘째 문장');
  assert.equal(updated.date, task.date); assert.deepEqual(result.state.itemScopes, state.itemScopes);
  assert.deepEqual(result.state.taskScopes, state.taskScopes); assert.deepEqual(result.state.progressRecords, state.progressRecords);
  assert.deepEqual(result.state.documents[0].lines.slice(0, 3), state.documents[0].lines);
});

test('task title-end Enter adds a sibling after properties and children without reassigning an Item', () => {
  let state = M.addDocument(createEmptyTextWorkspace(), { title: '할 일 형제' });
  const id = state.documents[0].id, raw = '[2026-10-01]\n- [ ] 원래 할 일\n  - 메모: 원래 메모\n  - 시간: 09:00\n  - [ ] 원래 자식\n- [ ] 뒤 할 일';
  state = M.editText(state, id, raw);
  const task = M.tasks(state)[0]; state = M.recordProgress(state, task.id, '2026-09-30', 20);
  const end = raw.indexOf('\n  - 메모:'), plan = plans.planTaskEnter(raw, { start: end, end }, textEditorRows(state, id)[1]);
  assert(plan); assert.equal(plan.start, raw.indexOf('\n- [ ] 뒤 할 일'));
  const scaffold = M.editTextResult(state, id, plan.nextRaw); assert.equal(scaffold.reason, null);
  const filled = plan.nextRaw.slice(0, plan.selectionAfter.start) + '새 할 일' + plan.nextRaw.slice(plan.selectionAfter.end);
  const result = M.editTextResult(scaffold.state, id, filled); assert.equal(result.reason, null);
  assert.deepEqual(M.tasks(result.state)[0], M.tasks(state)[0]);
  assert.equal(M.tasks(result.state)[1].title, '새 할 일'); assert.equal(M.tasks(result.state)[2].id, M.tasks(state)[1].id);
  assert.deepEqual(result.state.documents[0].lines.filter(line => state.documents[0].lines.some(before => before.id === line.id)), state.documents[0].lines);
  for (const field of ['bindings', 'progressRecords'] as const) assert.deepEqual(result.state[field], state[field]);
  for (const field of ['itemScopes', 'taskScopes'] as const) {
    for (const [lineId, scopeId] of Object.entries(state[field])) assert.equal(result.state[field][lineId], scopeId);
    assert.equal(result.state[field][M.tasks(result.state)[1].id], task.scopeId);
  }
});

test('task Enter plan is end-only, follows nested subtree depth, and refuses invalid metadata', () => {
  const raw = '- [ ] 부모\n  - [ ] 자식\n    - 메모: 보존\n    - [ ] 손자\n  - [ ] 뒤 자식', end = raw.indexOf('\n    - 메모:');
  const plan = plans.planTaskEnter(raw, { start: end, end }, { kind: 'subcheck', subtreeEndIndex: 4 });
  assert(plan); assert.equal(plan.nextRaw, '- [ ] 부모\n  - [ ] 자식\n    - 메모: 보존\n    - [ ] 손자\n  - [ ] \n  - [ ] 뒤 자식');
  for (const [selected, meta] of [
    [{ start: end - 1, end: end - 1 }, { kind: 'subcheck', subtreeEndIndex: 4 }],
    [{ start: end - 1, end }, { kind: 'subcheck', subtreeEndIndex: 4 }],
    [{ start: end, end }, { kind: 'note', subtreeEndIndex: 4 }],
    [{ start: end, end }, { kind: 'subcheck', subtreeEndIndex: 1 }],
    [{ start: end, end }, { kind: 'subcheck', subtreeEndIndex: 7 }],
  ] as const) assert.equal(plans.planTaskEnter(raw, selected, meta), null);
});

test('ShiftTab followed by Tab restores only the original subtree and leaves the following sibling untouched', () => {
  const raw = '- 부모\n  - 선택\n    - 자식\n  - 뒤 형제\n- 끝', selected = caret(raw, 1, 5);
  const first = plans.planIndent(raw, selected, outline(raw), true, [], null, 4); assert(first);
  assert.equal(first.endLine, 2);
  const lease = plans.indentLease(first, 5);
  const inverse = plans.planIndent(first.nextRaw, first.selectionAfter, outline(first.nextRaw), false, [], lease, 5); assert(inverse);
  assert.equal(inverse.endLine, 2); assert.equal(inverse.nextRaw, raw); assert.deepEqual(inverse.selectionAfter, selected);
  const ordinary = plans.planIndent(first.nextRaw, first.selectionAfter, outline(first.nextRaw), false, [], null, 5); assert(ordinary);
  assert.equal(ordinary.endLine, 3, 'the changed outline would otherwise absorb the following sibling');
});

test('Tab followed by ShiftTab restores a selected parent, properties and descendants', () => {
  const raw = '- 부모\n  - 앞\n  - 선택\n    - 메모: 보존\n    - 자식\n\n  - 뒤', selected = caret(raw, 2, 5);
  const first = plans.planIndent(raw, selected, outline(raw), false, [], null, 0); assert(first);
  const inverse = plans.planIndent(first.nextRaw, first.selectionAfter, outline(first.nextRaw), true, [], plans.indentLease(first, 1), 1); assert(inverse);
  assert.equal(inverse.nextRaw, raw); assert.deepEqual(inverse.selectionAfter, selected);
});

test('inverse lease expires after another input even if the raw later returns to the same bytes', () => {
  const raw = '- 부모\n  - 선택\n  - 뒤', first = plans.planIndent(raw, caret(raw, 1), outline(raw), true, [], null, 0); assert(first);
  const stale = plans.planIndent(first.nextRaw, first.selectionAfter, outline(first.nextRaw), false, [], plans.indentLease(first, 1), 3); assert(stale);
  assert.equal(stale.endLine, 2);
});

test('selection and direction changes expire the lease instead of forcing the old span', () => {
  const raw = '- 부모\n  - 선택\n  - 뒤', first = plans.planIndent(raw, caret(raw, 1), outline(raw), true, [], null, 0); assert(first);
  const lease = plans.indentLease(first, 1);
  for (const selected of [{ ...first.selectionAfter, direction: 'backward' as const }, caret(first.nextRaw, 2)]) {
    const next = plans.planIndent(first.nextRaw, selected, outline(first.nextRaw), false, [], lease, 1); assert(next);
    assert.equal(next.endLine, 2);
  }
});

test('same-direction indent recomputes the current span rather than treating a lease as a permanent block', () => {
  const raw = '- 부모\n  - 선택\n    - 자식\n  - 뒤', first = plans.planIndent(raw, caret(raw, 1), outline(raw), true, [], null, 0); assert(first);
  const next = plans.planIndent(first.nextRaw, first.selectionAfter, outline(first.nextRaw), true, [], plans.indentLease(first, 1), 1);
  assert.equal(next, null, 'current root-level source cannot be outdented');
});

test('multi-line selections exclude the next line when the selection ends at its start', () => {
  const raw = '- 첫 줄\n- 둘째 줄\n- 셋째 줄', end = raw.indexOf('- 셋째');
  const plan = plans.planIndent(raw, { start: 2, end, direction: 'backward' }, outline(raw), false); assert(plan);
  assert.equal(plan.endLine, 1); assert.equal(plan.nextRaw, '  - 첫 줄\n  - 둘째 줄\n- 셋째 줄');
  assert.deepEqual(plan.selectionAfter, { start: 4, end: end + 4, direction: 'backward' });
});

test('blank scaffold indentation and reversal do not create persisted Items', () => {
  const raw = '  ', first = plans.planIndent(raw, { start: 2, end: 2 }, {}, false); assert(first);
  const inverse = plans.planIndent(first.nextRaw, first.selectionAfter, {}, true, [], plans.indentLease(first, 1), 1); assert(inverse);
  assert.equal(inverse.nextRaw, raw);
  const state = M.addDocument(createEmptyTextWorkspace(), { title: '빈 줄' });
  const result = M.editTextResult(state, state.documents[0].id, first.nextRaw);
  assert.equal(result.reason, null); assert.deepEqual(M.tasks(result.state), []);
});

test('indent rejects tab prefixes, odd spaces, fences, root outdent and maximum depth', () => {
  for (const raw of ['\t- 목록', ' - 목록', `${'  '.repeat(32)}- 목록`]) assert.equal(plans.planIndent(raw, caret(raw, 0, 0), {}, false), null);
  assert.equal(plans.planIndent('- 목록', caret('- 목록', 0), {}, true), null);
  assert.equal(plans.planIndent('  fenced', caret('  fenced', 0), {}, false, [true]), null);
  const raw = `${'  '.repeat(32)}- 메모: 내용`, plan = plans.planIndent(raw, caret(raw, 0), { 0: { kind: 'property' } }, false);
  assert(plan, 'existing property depth allowance remains one greater than ordinary outline depth');
});
