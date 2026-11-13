import assert from 'node:assert/strict';
import test from 'node:test';
import { createProgramData } from './program-data';
import { createProgramDocument } from './private-space';
import { programTextTransition } from './program-text-transition';
import { createProgramRecallIndex } from './task-recall';
import { recallProgramTask } from './task-recall-command';
import { programContinuedLines, programContinuationStarts, programLostContinuations, reviveProgramContinuation } from './continuation';
import { programDayCount } from './execution-presentation';
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
for (const child of [false, true]) test(`11/13 approved: other-folder ${child ? 'subordinate' : 'root'} receiver is explicit; day count, deletion and return`, () => {
  const { space, input, docId } = fixture(['[2026-11-10]', '- /합성 출발', '  - [40%] 자료 연결', '    - 마감: 11/20', '    - 기다림: 2026-11-09',
    '[2026-11-13]', '- /합성 도착', ...(child ? ['  - [ ] 합성 받는 부모', '    - [ ] 자료'] : ['  - [ ] 자료'])].join('\n'));
  const before = structuredClone(space.text), chosen = input('자료 연결'), parent = M.getDocument(before, docId)!.lines.find(line => line.text.includes('합성 받는 부모'));
  const result = recallProgramTask(space, chosen); assert(result.ok, result.ok ? '' : result.reason);
  assert.match(M.raw(M.getDocument(result.next, docId)), /- 이어감: 2026-11-13 · 40% · \/합성 도착/);
  const link = programContinuedLines(result.next).find(line => line.lineId === chosen.candidate.lineId)!;
  assert.deepEqual([link.scope, link.receiverScope, link.received], ['합성 출발', '합성 도착', result.lineId]);
  assert.equal(programContinuationStarts(result.next).get(result.lineId), '2026-11-10');
  assert.equal(programDayCount(programContinuationStarts(result.next).get(result.lineId), today), 4);
  if (parent) { assert.deepEqual(M.getDocument(result.next, docId)!.lines.find(line => line.id === parent.id), parent); assert.equal(M.rowMeta(result.next, docId).find(row => row.id === result.lineId)!.structuralKind, 'subcheck'); }
  const rows = M.parseDocument(M.getDocument(result.next, docId)!, result.next).rows, row = rows.find(line => line.id === result.lineId)!;
  const gone = new Set(rows.slice(row.index, row.subtreeEndIndex).map(line => line.id));
  const keep = (scope: Record<string,string>) => Object.fromEntries(Object.entries(scope).filter(([id]) => !gone.has(id)));
  const deleted = { ...result.next, documents: result.next.documents.map(doc => doc.id === docId ? { ...doc, lines: doc.lines.filter(line => !gone.has(line.id)) } : doc),
    taskScopes: keep(result.next.taskScopes), itemScopes: keep(result.next.itemScopes), progressRecords: result.next.progressRecords.filter(record => !gone.has(record.taskId)) };
  assert(M.validate(deleted)); assert(programLostContinuations(deleted, today).some(line => line.lineId === chosen.candidate.lineId));
  const back = reviveProgramContinuation(deleted, { documentId: docId, lineId: chosen.candidate.lineId, today }); assert(back.ok, back.ok ? '' : back.reason);
  const recovered = M.tasks(back.next).find(task => task.id === back.newId)!;
  assert.deepEqual([recovered.scopeTitle, recovered.due, recovered.waitSince, M.currentProgress(back.next, back.newId)], ['합성 출발', '2026-11-20', '2026-11-09', 40]);
  assert.equal(programLostContinuations(back.next, today).filter(line => line.lineId === chosen.candidate.lineId).length, 0);
  assert.equal(programContinuationStarts(back.next).get(back.newId), '2026-11-10');
});
test('11/13 approved: same-folder child choice keeps the old note and parent bytes, with an independent receiving progress identity', () => {
  const { space, input, docId } = fixture('[2026-11-10]\n- [ ] 합성 옛 부모\n  - [30%] 자료 하위\n[2026-11-13]\n- [ ] 합성 새 부모\n  - [ ] 자료');
  const before = M.getDocument(space.text, docId)!, parents = before.lines.filter(line => /합성 (?:옛|새) 부모/.test(line.text));
  const result = recallProgramTask(space, input('자료 하위')); assert(result.ok, result.ok ? '' : result.reason);
  assert.match(M.raw(M.getDocument(result.next, docId)), /- 이어감: 2026-11-13 · 30%\n/); assert(!M.raw(M.getDocument(result.next, docId)).includes(' · /'));
  for (const parent of parents) assert.deepEqual(M.getDocument(result.next, docId)!.lines.find(line => line.id === parent.id), parent);
  assert.equal(M.rowMeta(result.next, docId).find(row => row.id === result.lineId)!.structuralKind, 'subcheck');
  assert.equal(programContinuationStarts(result.next).get(result.lineId), '2026-11-10');
});
test('11/13 approved: other-folder recall into unfiled writes the explicit / and never borrows another folder', () => {
  const { space, input, docId } = fixture('[2026-11-10]\n- /합성 출발\n  - [10%] 자료 미분류\n[2026-11-13]\n- [ ] 자료');
  const result = recallProgramTask(space, input('자료 미분류')); assert(result.ok, result.ok ? '' : result.reason);
  assert.match(M.raw(M.getDocument(result.next, docId)), /- 이어감: 2026-11-13 · 10% · \/\n/);
  assert.equal(programContinuedLines(result.next)[0].receiverScope, ''); assert.equal(programContinuedLines(result.next)[0].received, result.lineId);
});
test('11/13 approved: explicit target mismatch/duplicates do not fall back; a nearby explicit record never widens legacy lookup', () => {
  const { space, docId } = fixture('[2026-11-10]\n- /합성 출발\n  - [>] 자료 옛 표기\n    - 이어감: 2026-11-13 · 20%\n  - [>] 자료 새 표기\n    - 이어감: 2026-11-13 · 30% · /합성 도착\n[2026-11-13]\n- /합성 도착\n  - [ ] 자료 옛 표기\n  - [ ] 자료 새 표기\n  - [ ] 자료 새 표기\n  - [ ] 자료');
  const links = programContinuedLines(space.text); assert.equal(links.find(line => line.title === '자료 옛 표기')!.received, null);
  const explicit = links.find(line => line.title === '자료 새 표기')!; assert.equal(explicit.received, null); assert(explicit.ambiguous);
  const raw = M.raw(M.getDocument(space.text, docId));
  const renamed = M.editTextResult(space.text, docId, raw.replace('/합성 도착\n', '/합성 다른 곳\n'), { folderText: true });
  assert.equal(renamed.reason, null); assert.equal(programContinuedLines(renamed.state).find(line => line.title === '자료 새 표기')!.received, null);
});
test('11/13 approved: consecutive folder changes keep both root and partial-child chains and progress', () => {
  const { space, input, docId } = fixture('[2026-11-10]\n- /합성 출발\n  - [40%] 자료 연속\n    - [30%] 합성 부분 하위\n      - 마감: 11/20\n[2026-11-13]\n- /합성 도착\n  - [ ] 자료');
  const first = recallProgramTask(space, input('자료 연속')); assert(first.ok, first.ok ? '' : first.reason);
  const nextDay = '2026-11-14', raw = M.raw(M.getDocument(first.next, docId));
  const edit = M.editTextResult(first.next, docId, raw+'\n[2026-11-14]\n- /합성 마지막\n  - [ ] 자료', { folderText: true }); assert.equal(edit.reason, null);
  const current = { ...space, text: edit.state }, index = createProgramRecallIndex(current, nextDay), chosen = index.find(row => row.lineId === first.lineId)!, typed = index.find(row => row.title === '자료' && row.day === nextDay)!;
  const second = recallProgramTask(current, { candidate: chosen, documentId: docId, lineId: typed.lineId, expectedLine: M.getDocument(edit.state, docId)!.lines.find(line => line.id === typed.lineId)!.text, today: nextDay });
  assert(second.ok, second.ok ? '' : second.reason); assert(programContinuedLines(second.next).every(line => line.received !== null));
  const child = M.parseDocument(M.getDocument(second.next, docId)!, second.next).items.find(item => item.title === '합성 부분 하위')!;
  assert.deepEqual([M.currentProgress(second.next, second.lineId), M.currentProgress(second.next, child.id)], [40, 30]);
  const starts = programContinuationStarts(second.next); assert.equal(starts.get(second.lineId), '2026-11-10'); assert.equal(starts.get(child.id), '2026-11-10');
  assert.equal(programDayCount(starts.get(child.id), nextDay), 5);
});
