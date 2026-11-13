import assert from 'node:assert/strict';
import test from 'node:test';
import { createProgramData } from './program-data';
import { createProgramDocument } from './private-space';
import { programTextTransition } from './program-text-transition';
import { createProgramRecallIndex } from './task-recall';
import { recallProgramTask } from './task-recall-command';
import { programContinuedLines } from './continuation';
import { textWorkspaceModel as M } from './text-workspace';
const today = '2026-11-13';
function fixture(raw: string) {
  const data = createProgramData(), actorId = data.activeActorId;
  const made = createProgramDocument(data, { actorId, requestId: 'recall-command', expectedSpace: data.spaces[actorId], title: '합성 불러오기' }); assert(made.ok);
  const space = made.data.spaces[actorId], docId = made.result, edit = M.editTextResult(space.text, docId, raw, { folderText: true }); assert.equal(edit.reason, null); space.text = edit.state;
  const index = createProgramRecallIndex(space, today), target = index.find(row => row.title === '자료')!;
  return { data: made.data, actorId, space, docId, input: (title: string) => ({ candidate: index.find(row => row.title === title)!, documentId: docId, lineId: target.lineId, expectedLine: M.getDocument(space.text, docId)!.lines.find(line => line.id === target.lineId)!.text, today }) };
}
test('W-TXT-14: open task carries title/progress/due/wait/children, old memo remains, one inverse restores typed RAW', () => {
  const { space, input, data, actorId, docId } = fixture('[2026-11-12]\n- [40%] 자료 정리\n  - 마감: 11/20\n  - 기다림: 2026-11-10\n  - 메모: 합성 기록\n  - [ ] 합성 하위\n[2026-11-13]\n- [ ] 자료');
  const before = structuredClone(space.text), source = input('자료 정리').candidate;
  space.text.progressRecords = [{ taskId: source.lineId, date: '2026-11-12', percent: 40 }];
  const chosen = createProgramRecallIndex(space, today).find(row => row.lineId === source.lineId)!;
  const exactBefore = structuredClone(space.text), result = recallProgramTask(space, { ...input('자료 정리'), candidate: chosen }); assert(result.ok, result.ok ? '' : result.reason);
  const raw = M.raw(M.getDocument(result.next, docId));
  assert.match(raw, /\[>\] 자료 정리\n  - 마감: 11\/20\n  - 기다림: 2026-11-10\n  - 메모: 합성 기록\n  - 이어감: 2026-11-13 · 40%/);
  assert.match(raw, /\[40%\] 자료 정리\n  - 마감: 11\/20\n  - 기다림: 2026-11-10\n  - \[ \] 합성 하위$/);
  assert.equal(M.currentProgress(result.next, result.lineId), 40); assert.equal(programContinuedLines(result.next).find(row => row.lineId === source.lineId)?.received, result.lineId);
  const saved = programTextTransition(data, { actorId, documentId: docId, expected: exactBefore, next: result.next }); assert(saved.ok);
  const undone = programTextTransition(saved.data, { actorId, documentId: docId, expected: result.next, next: exactBefore }); assert(undone.ok); assert.deepEqual(undone.data.spaces[actorId].text, exactBefore);
  assert.equal(M.raw(M.getDocument(before, docId)), M.raw(M.getDocument(exactBefore, docId)));
});
test('W-TXT-14: selecting a child leaves its parent bytes/records and siblings unchanged', () => {
  const { space, input, docId } = fixture('[2026-11-12]\n- [60%] 합성 부모\n  - [40%] 자료 하위\n    - 마감: 11/20\n  - [ ] 합성 형제\n[2026-11-13]\n- [ ] 자료');
  const before = structuredClone(space.text), parent = M.tasks(before).find(task => task.title === '합성 부모')!;
  const result = recallProgramTask(space, input('자료 하위')); assert(result.ok, result.ok ? '' : result.reason);
  assert.deepEqual(M.getDocument(result.next, docId)!.lines.find(line => line.id === parent.id), M.getDocument(before, docId)!.lines.find(line => line.id === parent.id));
  const sibling = M.getDocument(before, docId)!.lines.find(line => line.text.includes('합성 형제'))!;
  assert.deepEqual(M.getDocument(result.next, docId)!.lines.find(line => line.id === sibling.id), sibling);
  assert.equal(M.currentProgress(result.next, parent.id), 60);
});
test('W-TXT-14: completed source unchanged, fresh checkbox, no old due or history copied', () => {
  const { space, input, docId } = fixture('[2026-11-12]\n- [x] 자료 완료\n  - 마감: 11/20\n[2026-11-13]\n- [ ] 자료');
  const original = M.getDocument(space.text, docId)!.lines.slice(0, 3), result = recallProgramTask(space, input('자료 완료')); assert(result.ok);
  assert.deepEqual(M.getDocument(result.next, docId)!.lines.slice(0, 3), original);
  assert.match(M.raw(M.getDocument(result.next, docId)), /- \[ \] 자료 완료$/);
});
test('W-TXT-18: undated source moves with IDs/history, typed folder owns it and no [>] is left', () => {
  const { space, input, docId } = fixture('[미정]\n- /합성 출발\n  - [30%] 자료 미정\n    - 메모: 합성 메모\n[2026-11-13]\n- /합성 받는 곳\n  - [ ] 자료');
  const chosen = input('자료 미정'), result = recallProgramTask(space, chosen); assert(result.ok, result.ok ? '' : result.reason);
  assert.equal(result.lineId, chosen.candidate.lineId); assert(!M.raw(M.getDocument(result.next, docId)).includes('[>]'));
  assert.match(M.raw(M.getDocument(result.next, docId)), /- \/합성 받는 곳\n  - \[30%\] 자료 미정\n    - 메모: 합성 메모$/);
});
test('W-TXT-14: source changed, typed bytes changed, typed memo/progress, or ambiguous receiver changes nothing', () => {
  const f = fixture('[2026-11-12]\n- [ ] 자료 정리\n[2026-11-13]\n- [ ] 자료'), before = JSON.stringify(f.space), input = f.input('자료 정리');
  assert(!recallProgramTask(f.space, { ...input, expectedLine: input.expectedLine + '다름' }).ok);
  assert.equal(JSON.stringify(f.space), before);
  f.space.text = M.updateTask(f.space.text, input.candidate.lineId, { title: '자료 변경' }); assert(!recallProgramTask(f.space, input).ok);
  const withMemo = fixture('[2026-11-12]\n- [ ] 자료 정리\n[2026-11-13]\n- [ ] 자료\n  - 메모: 합성 입력'); assert(!recallProgramTask(withMemo.space, withMemo.input('자료 정리')).ok);
  const duplicate = fixture('[2026-11-12]\n- [ ] 자료 정리\n[2026-11-13]\n- [ ] 자료 정리\n- [ ] 자료'); assert(!recallProgramTask(duplicate.space, duplicate.input('자료 정리')).ok);
});
for (const section of ['[미정]', '[2026-11-12]']) test(`W-TXT-14·18 preservation: ${section} fenced payload retains every space/tab byte`, () => {
  const { space, input, docId } = fixture([section, '- [20%] 자료 코드', '  - [ ] 합성 하위', '    ```text', '      alpha', '\t beta', '        gamma', '    ```', '[2026-11-13]', '- [ ] 자료'].join('\n'));
  const before = structuredClone(space.text), doc = M.getDocument(before, docId)!, rows = M.parseDocument(doc, before).rows;
  const payload = rows.filter(row => row.kind === 'fence' && !/^ *(?:`{3,}|~{3,})/.test(row.text)).map(row => doc.lines[row.index]); assert.equal(payload.length, 3);
  const result = recallProgramTask(space, input('자료 코드')); assert(result.ok, result.ok ? '' : result.reason);
  for (const line of payload) assert.deepEqual(M.getDocument(result.next, docId)!.lines.find(entry => entry.id === line.id), line, 'fence contents are RAW, not parser depth');
});
for (const [open, close, payload] of [['````text', '````', '      ```'], ['~~~text', '~~~', '      ```'], ['````text', '````', '      ````not-a-close']]) test(`W-TXT-18 preservation: fence-looking payload ${open}/${payload} survives a depth change`, () => {
  const { space, input, docId } = fixture(['[미정]', '- [20%] 자료 코드', `  ${open}`, payload, '    unique body', `  ${close}`, '[2026-11-13]', '- /합성 받는 폴더', '  - [ ] 자료'].join('\n'));
  const before = M.getDocument(space.text, docId)!, kept = before.lines.filter(line => line.text === payload || line.text === '    unique body'); assert.equal(kept.length, 2);
  const result = recallProgramTask(space, input('자료 코드')); assert(result.ok, result.ok ? '' : result.reason);
  for (const line of kept) assert.deepEqual(M.getDocument(result.next, docId)!.lines.find(entry => entry.id === line.id), line);
});
