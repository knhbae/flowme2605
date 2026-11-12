import assert from 'node:assert/strict';
import test from 'node:test';
import { programClone, type ProgramData, type ProgramTransition } from './contract';
import { createProgramData } from './program-data';
import { createProgramDocument } from './private-space';
import { carryProgramTasksToToday, programCarryoverBefore, programCarryoverProof, programLastWrittenDay, programMorningCarry, restoreProgramCarryover } from './carryover';
import { programShortDate } from './date-label';
import { programContinuedLines, programLostContinuations } from './continuation';
import { textWorkspaceModel as M } from './text-workspace';

// 오늘 탭 ② (W-CARRY-12, 총괄 11/12, mockup ③): the morning button takes the last day tasks were written.
let request = 0;
const actor = (data: ProgramData) => data.activeActorId;
const space = (data: ProgramData) => data.spaces[actor(data)];
const ok = <T,>(result: ProgramTransition<T>) => { assert(result.ok, result.ok ? '' : result.reason); return result; };
const base = (data: ProgramData) => ({ actorId: actor(data), requestId: `mc-${++request}`, expectedSpace: space(data) });
function writing(text: string, title = '하루 기록', data = createProgramData()) {
  const created = ok(createProgramDocument(data, { ...base(data), title }));
  const next = programClone(created.data);
  space(next).text = M.editTextResult(space(next).text, created.result, text, { folderText: true }).state;
  assert.equal(M.raw(M.getDocument(space(next).text, created.result)!), text, 'seeded as written');
  return { data: next, docId: created.result };
}
const raw = (data: ProgramData, docId: string) => M.raw(M.getDocument(space(data).text, docId)!);
const TODAY = '2026-11-13';
const PAGE = ['[2026-11-05]', '- /회사', '  - [ ] 오래된 일', '', '[2026-11-10]', '- /EA', '  - [x] 끝낸 일', '  - [ ] 메모 있는 일', '    - 메모: 자료', '  - [ ] 빈 일',
  '    - [ ] 하위', '', '[2026-11-11]', ''].join('\n');

test('W-CARRY-12: the last day tasks were written is the nearest date section before today with a task line, not the calendar\'s yesterday', () => {
  const { data } = writing(PAGE);
  assert.equal(programLastWrittenDay(space(data), TODAY), '2026-11-10', '11/11 has a heading but no task line; 11/12 has none');
  assert.equal(programLastWrittenDay(space(data), '2026-11-10'), '2026-11-05');
  assert.equal(programLastWrittenDay(space(data), '2026-11-05'), null);
  assert.equal(programShortDate('2026-11-09'), '11/9(월)');
});

test('W-CARRY-12: the button takes that day\'s open tasks only, in task lines (moved and copied); the days before fold to 밀린 일 n개; one save, ↶ exact', () => {
  const { data, docId } = writing(PAGE);
  const morning = programMorningCarry(space(data), TODAY)!;
  assert.deepEqual([morning.day, morning.lines, morning.moved, morning.continued, morning.older, morning.stale], ['2026-11-10', 3, 2, 1, 1, false],
    '메모 있는 일 is copied (a memo is a record); 빈 일 and its open 하위 move; 오래된 일 of 11/5 is 밀린 일');
  const before = programCarryoverBefore(space(data));
  const carried = ok(carryProgramTasksToToday(data, { ...base(data), today: TODAY, lines: morning.plan.lines })).data;
  assert.equal(carried.receipts.length, data.receipts.length + 1, 'one save');
  const text = raw(carried, docId);
  assert(text.startsWith(['[2026-11-05]', '- /회사', '  - [ ] 오래된 일', ''].join('\n')), '오래된 일 stays on its day');
  assert(text.includes('  - [>] 메모 있는 일\n'), 'the line with a record stays as that day\'s record');
  const tasks = M.tasks(space(carried).text);
  assert.deepEqual(tasks.filter(task => task.date === TODAY).map(task => task.title).sort(), ['메모 있는 일', '빈 일']);
  assert.equal(tasks.find(task => task.title === '빈 일')!.subchecks.length, 1, 'its subtask moves with it');
  assert(!tasks.some(task => task.title === '빈 일' && task.date === '2026-11-10'), 'the one without a record moves (no line left)');
  assert.equal(programMorningCarry(space(carried), TODAY)!.lines, 0, 'nothing left to take from that day');
  const back = ok(restoreProgramCarryover(carried, { ...base(carried), before, after: programCarryoverProof(space(carried)) })).data;
  assert.deepEqual(space(back).text, space(data).text);
});

test('오늘 탭 ② (mockup ③, Fable): a block with a subtask at 50% is copied; the subtask keeps its own [>] and 이어감 · 50%, its copy goes on with its record; both read back as received', () => {
  const { data, docId } = writing(['[2026-11-12]', '- /EA', '  - [ ] 10 Min 잇', '    - [50%] 시간 조율', '- /지식 허브', '  - [ ] 전체적인 내용 보기'].join('\n'));
  const sub = M.parseDocument(M.getDocument(space(data).text, docId)!, space(data).text).items.find(item => item.title === '시간 조율')!.id;
  space(data).text = { ...space(data).text, progressRecords: [{ taskId: sub, date: '2026-11-12', percent: 50 }] };
  const morning = programMorningCarry(space(data), TODAY)!;
  assert.deepEqual([morning.day, morning.lines, morning.moved, morning.continued], ['2026-11-12', 3, 1, 2], '3개 이어 씀 (1개 옮김 · 2개 복사)');
  const carried = ok(carryProgramTasksToToday(data, { ...base(data), today: TODAY, lines: morning.plan.lines })).data;
  const text = raw(carried, docId);
  assert(text.startsWith(['[2026-11-12]', '- /EA', '  - [>] 10 Min 잇', '    - 이어감: 2026-11-13 · 0%', '    - [>] 시간 조율', '      - 이어감: 2026-11-13 · 50%', ''].join('\n')), text);
  assert(text.includes(['- /EA', '  - [ ] 10 Min 잇', '    - [50%] 시간 조율'].join('\n')) && text.includes(['- /지식 허브', '  - [ ] 전체적인 내용 보기'].join('\n')), text);
  assert(!/\[2026-11-12\][\s\S]*지식 허브[\s\S]*\[2026-11-13\]/.test(text), 'the moved block left nothing on its day');
  const copy = M.tasks(space(carried).text).find(task => task.title === '10 Min 잇' && task.date === TODAY)!.subchecks.find(item => item.title === '시간 조율')!;
  assert.notEqual(copy.id, sub);
  assert.deepEqual(space(carried).text.progressRecords, [{ taskId: copy.id, date: '2026-11-12', percent: 50 }], 'the record follows the copy');
  const lines = programContinuedLines(space(carried).text);
  assert.deepEqual(lines.map(line => [line.title, line.to, line.percent, !!line.received, line.ambiguous]), [['10 Min 잇', TODAY, 0, true, false], ['시간 조율', TODAY, 50, true, false]]);
  assert.equal(lines[1].received, copy.id);
  assert.deepEqual(programLostContinuations(space(carried).text, TODAY), []);
});

test('W-CARRY-12: the last day written more than 14 days back is stale (the first cleanup asks instead); no day, no button', () => {
  const { data } = writing(['[2026-10-20]', '- /EA', '  - [ ] 오래 전 일'].join('\n'));
  const morning = programMorningCarry(space(data), TODAY)!;
  assert.deepEqual([morning.day, morning.stale, morning.lines], ['2026-10-20', true, 1]);
  assert.equal(programMorningCarry(space(writing('[2026-11-13]\n- [ ] 오늘 일').data), TODAY), null);
});

test('W-CARRY-12: the card names the day and counts lines; the note after the press stays while the writing is as that save left it', async () => {
  const { readFileSync } = await import('node:fs');
  const host = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramSpace.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert(host.includes("`이어 쓸 일 ${morning.lines}개 · ${morningYesterday ? '어제 ' : ''}${programCalendarDate(morning.day, today)}`"));
  assert(host.includes('const morningButton = !!morning && morning.lines > 0 && !morning.stale && !morningHolds;'));
  assert(host.includes('programCarryoverProof(space) === morningDone.after'));
  assert(host.includes("text: `${early.lines}개 이어 씀${parts ? ` (${parts})` : ''}`"));
  assert(host.includes('오늘 구획을 고치기 전까지 이 자리에 남습니다.'));
});
