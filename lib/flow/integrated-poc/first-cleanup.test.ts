import assert from 'node:assert/strict';
import test from 'node:test';
import { programClone, type ProgramData, type ProgramTransition } from './contract';
import { createProgramData } from './program-data';
import { createProgramDocument } from './private-space';
import { closeProgramAlreadyContinued, programAlreadyContinuedPlan } from './first-cleanup';
import { programCarryoverBefore, programCarryoverProof, restoreProgramCarryover } from './carryover';
import { programContinuedLines, programLostContinuations } from './continuation';
import { textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';

// 오늘 탭 처음 정리 ② (W-CARRY-13, 총괄 11/12, mockup ②): a past open task already written again later is closed.
let request = 0;
const actor = (data: ProgramData) => data.activeActorId;
const space = (data: ProgramData) => data.spaces[actor(data)];
const ok = <T,>(result: ProgramTransition<T>) => { assert(result.ok, result.ok ? '' : result.reason); return result; };
const base = (data: ProgramData) => ({ actorId: actor(data), requestId: `fc-${++request}`, expectedSpace: space(data) });
const raw = (data: ProgramData, docId: string) => M.raw(M.getDocument(space(data).text, docId)!);
function writing(text: string, title = '하루 기록', data = createProgramData()) {
  const created = ok(createProgramDocument(data, { ...base(data), title }));
  const next = programClone(created.data);
  space(next).text = M.editTextResult(space(next).text, created.result, text, { folderText: true }).state;
  assert.equal(raw(next, created.result), text, 'seeded as written');
  return { data: next, docId: created.result };
}
const id = (data: ProgramData, title: string, date?: string) => M.tasks(space(data).text).find(task => task.title === title && (!date || task.date === date))!.id;
const TODAY = '2026-11-13';
const PAGE = ['[2026-11-10]', '- /EA', '  - [ ] 발표 준비', '    - [x] 공지', '    - 메모: 자료는 금요일', '  - [40%] 보고서', '  - [ ] 그대로 둘 일', '',
  '[2026-11-12]', '- /EA', '  - [ ] 발표 준비', '  - [ ] 보고서'].join('\n');

test('W-CARRY-13: the already written-again lines are listed, closed with [>] and 이어감 (and their %), one save, read back received; ↶ gives every byte back', () => {
  const { data, docId } = writing(PAGE);
  const plan = programAlreadyContinuedPlan(space(data), TODAY);
  assert.deepEqual(plan.map(entry => [entry.title, entry.day, entry.to, entry.percent]), [['발표 준비', '2026-11-10', '2026-11-12', null], ['보고서', '2026-11-10', '2026-11-12', 40]]);
  const before = programCarryoverBefore(space(data));
  const closed = ok(closeProgramAlreadyContinued(data, { ...base(data), today: TODAY, lines: plan })).data;
  assert.equal(raw(closed, docId), ['[2026-11-10]', '- /EA', '  - [>] 발표 준비', '    - 이어감: 2026-11-12', '    - [x] 공지', '    - 메모: 자료는 금요일', '  - [>] 보고서', '    - 이어감: 2026-11-12 · 40%',
    '  - [ ] 그대로 둘 일', '', '[2026-11-12]', '- /EA', '  - [ ] 발표 준비', '  - [ ] 보고서'].join('\n'));
  assert.equal(closed.receipts.length, data.receipts.length + 1, 'one save');
  assert(programContinuedLines(space(closed).text).every(line => line.received && !line.ambiguous), 'each read back as received');
  assert.equal(programLostContinuations(space(closed).text, TODAY).length, 0);
  assert.deepEqual(M.tasks(space(closed).text).filter(task => !task.done && task.date === '2026-11-10').map(task => task.title), ['그대로 둘 일'], 'on 11/10 only the one not written again stays open');
  assert.deepEqual(programAlreadyContinuedPlan(space(closed), TODAY), [], 'nothing left to list');
  // ↶: exactly as before, while it is exactly as the save left it.
  const back = ok(restoreProgramCarryover(closed, { ...base(closed), before, after: programCarryoverProof(space(closed)) })).data;
  assert.deepEqual(space(back).text, space(data).text);
});

test('W-CARRY-13: only the chosen lines close; one shown differently since is refused (nothing changes)', () => {
  const { data, docId } = writing(PAGE);
  const plan = programAlreadyContinuedPlan(space(data), TODAY);
  const one = ok(closeProgramAlreadyContinued(data, { ...base(data), today: TODAY, lines: [plan[1]] })).data;
  assert(raw(one, docId).includes('  - [ ] 발표 준비\n    - [x] 공지'), 'the unchosen line stays as it is');
  assert(raw(one, docId).includes('  - [>] 보고서\n    - 이어감: 2026-11-12 · 40%'));
  const changed = programClone(data);
  space(changed).text = M.updateTask(space(changed).text, id(changed, '보고서', '2026-11-10'), { title: '보고서 초안' });
  const refused = closeProgramAlreadyContinued(changed, { ...base(changed), today: TODAY, lines: plan });
  assert(!refused.ok && refused.reason === 'conflict');
  assert.equal(refused.data, changed);
});

test('W-CARRY-13: left as they are: records, an open subtask, a link, the same words in another folder path, two candidates, a deleted document', () => {
  const text = ['[2026-11-09]', '- /회사', '  - /진행', '    - [ ] 경로 다른 일', '- /EA', '  - [ ] 기록 있는 일', '  - [ ] 하위 열린 일', '    - [ ] 아직 안 한 하위', '  - [ ] 연결된 일', '  - [ ] 후보 둘',
    '', '[2026-11-12]', '- /개인', '  - /진행', '    - [ ] 경로 다른 일', '- /EA', '  - [ ] 기록 있는 일', '  - [ ] 하위 열린 일', '  - [ ] 연결된 일', '  - [ ] 후보 둘', '  - [ ] 후보 둘'].join('\n');
  let { data } = writing(text);
  space(data).text = { ...space(data).text, progressRecords: [{ taskId: id(data, '기록 있는 일', '2026-11-09'), date: '2026-11-09', percent: 30 }] };
  const refs = writing('[2026-11-12]\n- 참조', '참조 글', data); data = refs.data;
  space(data).text = M.linkTask(space(data).text, refs.docId, 2, id(data, '연결된 일', '2026-11-09'));
  assert(M.validate(space(data).text));
  assert.deepEqual(programAlreadyContinuedPlan(space(data), TODAY), []);
  // A deleted document's lines are not listed either.
  const page = writing(PAGE, '지울 글');
  const trashed = programClone(page.data);
  space(trashed).documentTrash = { [page.docId]: { trashedAt: '2026-11-12T00:00:00.000Z', wasArchived: false } };
  space(trashed).archivedDocumentIds = [...space(trashed).archivedDocumentIds, page.docId];
  assert.deepEqual(programAlreadyContinuedPlan(space(trashed), TODAY), []);
});
