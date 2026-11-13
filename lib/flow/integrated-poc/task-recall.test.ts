import assert from 'node:assert/strict';
import test from 'node:test';
import { createProgramData } from './program-data';
import { createProgramDocument } from './private-space';
import { textWorkspaceModel as M } from './text-workspace';
import { createProgramRecallIndex, programRecallChoices, programRecallKey, programRecallProof, programRecallQueryReady, readProgramRecallLine } from './task-recall';

const today = '2026-11-13';
function fixture(raw: string) {
  const data = createProgramData(), actor = data.activeActorId;
  const made = createProgramDocument(data, { actorId: actor, requestId: 'recall-fixture', expectedSpace: data.spaces[actor], title: '합성 지난 일' });
  assert(made.ok); const space = made.data.spaces[actor], docId = made.result;
  const edit = M.editTextResult(space.text, docId, raw, { folderText: true });
  assert.equal(edit.reason, null); space.text = edit.state;
  return { space, docId, index: () => createProgramRecallIndex(space, today) };
}

test('W-TXT-12: confirmed syllables two, Latin/digits three; unfinished jamo do not match', () => {
  for (const word of ['자료', '가나', 'abc', '123', '자료 a']) assert(programRecallQueryReady(word), word);
  for (const word of ['', '가', 'ab', '12', '자ㄹ', 'ㄱㄴ', '가', '가!!', '...']) assert(!programRecallQueryReady(word), word);
});
test('W-TXT-13: children, progress, due and source block proof belong to the saved index', () => {
  const { space, docId, index } = fixture('[2026-11-12]\n- /합성 폴더\n  - [ ] 자료 부모\n    - [40%] 자료 하위\n      - 마감: 11/20\n[2026-11-13]\n- [ ] 자료');
  const child = index().find(row => row.title === '자료 하위'); assert(child);
  assert.deepEqual([child.parentTitle, child.percent, child.due, child.folder], ['자료 부모', 40, '2026-11-20', '합성 폴더']);
  assert(Object.isFrozen(child)); assert.equal(programRecallProof(space.text, docId, child.lineId), child.proof);
  const changed = M.updateTask(space.text, child.lineId, { title: '자료 바뀜' });
  assert.notEqual(programRecallProof(changed, docId, child.lineId), child.proof);
});
test('W-TXT-13: prefix before substring, open then typed folder then recent, no default selection', () => {
  const { index } = fixture('[2026-11-01]\n- /합성 하나\n  - [ ] 자료 오래\n[2026-11-12]\n- /합성 둘\n  - [ ] 자료 최근\n  - [x] 자료 끝냄\n  - [ ] 모은 자료\n[2026-11-13]\n- /합성 하나\n  - [ ] 자료');
  const all = index(), typed = all.find(row => row.title === '자료')!;
  const rows = programRecallChoices(all, { query: '자료', lineId: typed.lineId, folder: '합성 하나', limit: 5 });
  assert.deepEqual(rows.map(row => row.title), ['자료 오래', '자료 최근', '자료 끝냄', '모은 자료']);
  assert.equal(programRecallKey('Enter', -1, rows.length, false).kind, 'pass');
});
test('W-TXT-13: same-task dedup retains latest line, NFC/lowercase/collapsed-space match; 60-day boundary', () => {
  const { index } = fixture('[2026-09-13]\n- [x] 자료 너무 오래\n[2026-09-14]\n- [x] 자료 경계\n[2026-11-01]\n- [ ] 자료 반복.\n[2026-11-12]\n- [x] 자료 반복\n- [ ] ABC   자료\n[2026-11-13]\n- [ ] 자료');
  const all = index(), rows = programRecallChoices(all, { query: '자료', lineId: all.find(row => row.title === '자료')!.lineId, folder: '', limit: 5 });
  assert(!all.some(row => row.title === '자료 너무 오래')); assert(all.some(row => row.title === '자료 경계'));
  assert.equal(rows.filter(row => row.key === '자료 반복').length, 1); assert(rows.find(row => row.key === '자료 반복')!.done);
  assert.equal(programRecallChoices(all, { query: 'abc 자료', lineId: '', folder: '', limit: 3 })[0]?.title, 'ABC   자료');
});
test('W-TXT-13: repeats and their done children, continued lines, archives and trash never become candidates', () => {
  const { space, docId, index } = fixture('[2026-11-12]\n- [ ] 자료 반복 @매일\n  - [x] 자료 반복 하위\n- [x] 자료 끝낸 반복 @매일\n- [>] 자료 이어감\n  - 이어감: 2026-11-13 · 0%\n- [ ] 자료 일반');
  assert.deepEqual(index().filter(row => row.documentId === docId).map(row => row.title), ['자료 일반']);
  space.archivedDocumentIds.push(docId); assert(!index().some(row => row.documentId === docId));
  space.archivedDocumentIds = []; space.documentTrash = { [docId]: { trashedAt: today, wasArchived: false } }; assert(!index().some(row => row.documentId === docId));
  delete space.documentTrash; space.text.documents.find(doc => doc.id === docId)!.id = 'doc-flowme-trash'; assert(!index().some(row => row.documentId === 'doc-flowme-trash'));
});
test('W-TXT-13: recent completion record admits an old section, folder is not a parent title, NFC dedup', () => {
  const { space, index } = fixture('[2026-08-01]\n- /합성 폴더\n  - [x] 자료 최근 끝냄\n[2026-11-11]\n- [ ] 자료 가나다\n[2026-11-12]\n- [ ] 자료 가나다'.normalize('NFD'));
  const old = index().find(row => row.title.normalize('NFC') === '자료 최근 끝냄'); assert(!old);
  const target = M.tasks(space.text).find(row => row.title.normalize('NFC') === '자료 최근 끝냄')!;
  space.text.progressRecords.push({ taskId: target.id, date: '2026-11-12', percent: 100 });
  const all = index(), admitted = all.find(row => row.lineId === target.id)!; assert(admitted); assert.equal(admitted.parentTitle, null);
  const rows = programRecallChoices(all, { query: '자료', lineId: '', folder: '', limit: 5 });
  assert.equal(rows.filter(row => row.key === '자료 가나다').length, 1);
});
test('W-TXT-12: only today canonical task title, identical accepted RAW, collapsed native selection', () => {
  const raw = '[2026-11-12]\n- [ ] 자료 지난\n[2026-11-13]\n- [ ] 자료 오늘\n- [ ] 다른 합성 일\n  - 메모: 자료\n- /자료';
  const { space, docId } = fixture(raw), caret = raw.indexOf('자료 오늘') + '자료 오늘'.length;
  assert.equal(readProgramRecallLine(space.text, docId, raw, caret, caret, today)?.query, '자료 오늘');
  for (const at of [raw.indexOf('자료 지난') + 3, raw.indexOf('메모:') + 6, raw.length, raw.indexOf('자료 오늘') - 1, raw.indexOf('자료 오늘')]) assert.equal(readProgramRecallLine(space.text, docId, raw, at, at, today), null);
  assert.equal(readProgramRecallLine(space.text, docId, raw+'x', caret, caret, today), null);
  assert.equal(readProgramRecallLine(space.text, docId, raw, caret-1, caret, today), null);
  const plain = fixture('- [ ] 자료 오늘'); assert.equal(readProgramRecallLine(plain.space.text, plain.docId, '- [ ] 자료 오늘', 11, 11, today), null);
  const noteRaw = '[2026-11-13]\n- [ ] 자료 오늘\n  - 메모: 남겨야 할 합성 입력', note = fixture(noteRaw), at = noteRaw.indexOf('자료 오늘') + 5;
  assert.equal(readProgramRecallLine(note.space.text, note.docId, noteRaw, at, at, today), null, 'a title with its own saved body is not replaced by a recall choice');
});
test('W-TXT-15: no Enter/Tab/space hijack, explicit down then Enter only, IME and modified keys pass', () => {
  for (const key of ['Enter', 'Tab', ' ', 'ArrowUp']) assert.equal(programRecallKey(key, -1, 3, false).kind, 'pass');
  assert.deepEqual(programRecallKey('ArrowDown', -1, 3, false), { kind: 'highlight', index: 0 });
  assert.deepEqual(programRecallKey('Enter', 0, 3, false), { kind: 'select', index: 0 });
  for (const key of ['Enter', 'ArrowDown', 'Escape']) assert.equal(programRecallKey(key, 0, 3, true).kind, 'pass');
  assert.equal(programRecallKey('Enter', 0, 3, false, true).kind, 'pass');
});
