import assert from 'node:assert/strict';
import test from 'node:test';
import { textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';
import { readTaskDateSuggestion, undoTaskDateSuggestion, taskDateSuggestionLabel, taskDateSuggestionToday, taskDateSuggestionsEnabled } from './task-date-suggestion';

const today = '2026-11-10';
function fixture(raw: string) {
  const empty: TextWorkspaceState = { version: 11, folders: [{ id: 'f', title: '합성', parentId: null }],
    documents: [{ id: 'd', title: '합성', folder: '합성', folderId: 'f', lines: [] }],
    flows: [], bindings: [], taskScopes: {}, itemScopes: {}, progressRecords: [] };
  return M.editText(empty, 'd', raw);
}
function candidate(raw: string, index = 0) {
  const state = fixture(raw), lineId = M.getDocument(state, 'd')!.lines[index].id;
  return readTaskDateSuggestion(state, 'd', lineId, today);
}

test('only canonical unfinished task lines without a date property are suggested', () => {
  assert.equal(candidate('- [ ] 내일 합성 회의')?.date, '2026-11-11');
  for (const raw of ['내일 합성 메모', '- [x] 내일 합성 회의', '- [ ] 내일이나 모레 합성 회의',
    '- [ ] 내일 합성 회의\n  - 날짜: 2026-11-12', '- [ ] 내일 합성 회의\n  - 날짜: 미정']) assert.equal(candidate(raw), null, raw);
});

test('all suggestions are suppressed under another date section, including explicit date words', () => {
  assert.equal(candidate('[2026-11-16]\n- [ ] 내일 합성 회의', 1), null);
  assert.equal(candidate('[2026-11-16]\n- [ ] 11/20 합성 회의', 1), null);
  assert.equal(candidate('[미정]\n- [ ] 내일 합성 회의', 1), null);
  assert.equal(candidate(`[${today}]\n- [ ] 내일 합성 회의`, 1)?.date, '2026-11-11');
  assert.equal(candidate(`[${today}]\n- [ ] 오늘 합성 회의`, 1), null);
});

test('references and Flow source tasks cannot receive a suggestion', () => {
  let state = fixture('- [ ] 내일 합성 원본\n- [ ] 내일 합성 참조');
  const [first, second] = state.documents[0].lines;
  state = { ...state, bindings: [{ kind: 'task', docId: 'd', lineId: second.id, taskId: first.id, dateMode: 'keep' }] };
  assert.equal(readTaskDateSuggestion(state, 'd', second.id, today), null);
  const flow = { ...state.documents[0], private: true as const, sourceVersion: 'v1' };
  state = { ...state, documents: [], bindings: [], flows: [flow] };
  assert.equal(readTaskDateSuggestion(state, 'd', first.id, today), null);
});

test('N9 adds only one date property; removing that exact property retains later writing and IDs', () => {
  const raw = '- [ ] 내일 합성 회의\n- [ ] 합성 다음 줄', before = fixture(raw), doc = before.documents[0], task = M.tasks(before)[0];
  const next = M.updateTask(before, task.id, { date: '2026-11-11', time: '' });
  assert.equal(next.documents[0].lines[0].text, '- [ ] 내일 합성 회의');
  assert.equal(M.raw(next.documents[0]), '- [ ] 내일 합성 회의\n  - 날짜: 2026-11-11\n- [ ] 합성 다음 줄');
  const ids = new Set(doc.lines.map(line => line.id)), property = next.documents[0].lines.find(line => !ids.has(line.id))!;
  const typed = M.editText(next, 'd', M.raw(next.documents[0]) + ' 이어 쓰기');
  const undone = undoTaskDateSuggestion(typed, 'd', task.id, property, '2026-11-11');
  assert.ok(undone);
  assert.equal(M.raw(undone.documents[0]), raw + ' 이어 쓰기');
  assert.deepEqual(undone.documents[0].lines.map(line => line.id), doc.lines.map(line => line.id));
  const transferred: TextWorkspaceState = { ...typed, documents: [{ ...typed.documents[0], lines: [typed.documents[0].lines[0],
    { id: 'another-task', text: '- [ ] 합성 다른 할 일' }, ...typed.documents[0].lines.slice(1)] }] };
  assert.equal(undoTaskDateSuggestion(transferred, 'd', task.id, property, '2026-11-11'), null);
  const pending: TextWorkspaceState = { ...typed, documents: [{ ...typed.documents[0], lines: [...typed.documents[0].lines,
    { id: 'pending-folder', text: '- /아직 쓰는 합성 폴더' }] }] };
  const kept = undoTaskDateSuggestion(pending, 'd', task.id, property, '2026-11-11');
  assert.ok(kept);
  assert.equal(kept.documents[0].lines.at(-1)?.text, '- /아직 쓰는 합성 폴더');
  assert.deepEqual(kept.folders, pending.folders);
  assert.deepEqual(kept.bindings, pending.bindings);
  const resectioned: TextWorkspaceState = { ...typed, documents: [{ ...typed.documents[0], lines: [
    { id: 'later-date-head', text: '[2026-11-16]' }, ...typed.documents[0].lines] }] };
  const restoredSection = undoTaskDateSuggestion(resectioned, 'd', task.id, property, '2026-11-11');
  assert.ok(restoredSection);
  assert.equal(M.tasks(restoredSection).find(item => item.id === task.id)?.date, '2026-11-16');
});

test('KST clock, cross-year labels and device preference are explicit', () => {
  assert.equal(taskDateSuggestionToday(new Date('2026-11-10T15:01:00Z')), '2026-11-11');
  assert.equal(taskDateSuggestionLabel('2026-11-13', today), '11월 13일(금)로');
  assert.equal(taskDateSuggestionLabel('2027-01-02', today), '2027년 1월 2일(토)로');
  assert.equal(taskDateSuggestionsEnabled(null), true);
  assert.equal(taskDateSuggestionsEnabled({ getItem: () => 'off' }), false);
  assert.equal(taskDateSuggestionsEnabled({ getItem: () => { throw Error('blocked'); } }), true);
});
