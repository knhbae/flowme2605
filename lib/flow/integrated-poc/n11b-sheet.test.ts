import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { PROGRAM_SCHEMA, type ProgramData, type ProgramTransition } from './contract';
import { createProgramPrivateSpace, validateProgramData } from './program-data';
import { createProgramDocument, recordProgramTaskProgress } from './private-space';
import { textWorkspaceModel as M } from './text-workspace';
import { ALPHA_SCHEMA, type AlphaAccount } from './alpha-persistence/contract';
import { materializeAccount } from './alpha-persistence/program-adapter';
import { emptyAlphaReferences } from './alpha-social/projection';
import { programExecutionTasks } from './execution';
import { carryProgramTasksToToday, planProgramCarryover, programCarryoverBefore, programCarryoverItems, programCarryoverProof, restoreProgramCarryover,
  type ProgramCarryoverChoice } from './carryover';
import { CARRYOVER_PRODUCTION_DOCUMENTS } from './n11a-carryover-fixture';

// N11b 하나씩 정리 (PROPOSAL 4-3): task by task, the person sends a task's line to today or 날짜 미정, or deletes it.
const owner = '77777777-7777-4777-8777-777777777777';
let request = 0;
const ok = <T,>(result: ProgramTransition<T>) => { assert(result.ok, result.ok ? '' : result.reason); return result; };
const base = (data: ProgramData) => ({ actorId: owner, requestId: `n11b-${++request}`, expectedSpace: data.spaces[owner] });
const space = (data: ProgramData) => data.spaces[owner];
function write(raw: string, data = empty()) {
  const made = ok(createProgramDocument(data, { ...base(data), title: '할 일', raw }));
  return { data: made.data, docId: made.result };
}
function empty(): ProgramData {
  const account: AlphaAccount = { schema: ALPHA_SCHEMA, ownerId: owner, revision: 0, source: { schema: PROGRAM_SCHEMA, actorId: owner, revision: 0 },
    space: createProgramPrivateSpace(), legacyUndo: [], legacyReceipts: [] };
  return materializeAccount(account, emptyAlphaReferences(owner)).data;
}
const raw = (data: ProgramData, docId: string) => M.raw(M.getDocument(space(data).text, docId));
const rows = (data: ProgramData, period: 'today' | 'undated', date = '2026-11-05') => programExecutionTasks(space(data), { period, date })
  .filter(task => !task.done && (period === 'undated' || task.date === date)).map(task => task.title).sort();
const apply = (data: ProgramData, choices: ReadonlyMap<string, ProgramCarryoverChoice>) =>
  carryProgramTasksToToday(data, { ...base(data), today: '2026-11-05', lines: planProgramCarryover(space(data), '2026-11-05', undefined, choices).lines });

const days = ['2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04'];
const plan: Record<string, string[]> = {
  '2026-10-29': ['운동 30분', '영어 단어 20개', '보고서 초안', '세차 예약', '은행 서류'],
  '2026-10-30': ['운동 30분', '영어 단어 20개', '보고서 초안', '세차 예약', '은행 서류', '책 반납'],
  '2026-10-31': ['운동 30분', '영어 단어 20개', '세차 예약', '은행 서류', '책 반납'],
  '2026-11-01': ['운동 30분', '영어 단어 20개', '세차 예약', '은행 서류'],
  '2026-11-02': ['운동 30분', '영어 단어 20개', '세차 예약', '은행 서류', '장보기'],
  '2026-11-03': ['운동 30분', '영어 단어 20개', '세차 예약', '은행 서류'],
  '2026-11-04': ['운동 30분', '영어 단어 20개', '세차 예약', '은행 서류', '치과 예약'],
};
const finished: Record<string, string[]> = { '2026-10-29': ['운동 30분'], '2026-10-30': ['보고서 초안'], '2026-10-31': ['책 반납', '영어 단어 20개'], '2026-11-02': ['장보기', '운동 30분'], '2026-11-04': ['운동 30분'] };
const week = days.flatMap(day => [`[${day}]`, ...plan[day].map(title => `- [${(finished[day] ?? []).includes(title) ? 'x' : ' '}] ${title}`), '']).join('\n');

test('N11b: the sheet lists each task once, oldest first, with how long, how many copies, and finished ones apart', () => {
  const { data } = write(week);
  const items = programCarryoverItems(space(data), '2026-11-05');
  assert.deepEqual(items.map(item => [item.title, item.lines, item.since, item.finished, item.choice]), [
    ['보고서 초안', 1, '2026-10-29', '2026-10-30', 'delete'],
    ['세차 예약', 7, '2026-10-29', null, 'today'],
    ['영어 단어 20개', 6, '2026-10-29', null, 'today'],
    ['은행 서류', 7, '2026-10-29', null, 'today'],
    ['운동 30분', 4, '2026-10-30', '2026-11-04', 'delete'],
    ['책 반납', 1, '2026-10-30', '2026-10-31', 'delete'],
    ['치과 예약', 1, '2026-11-04', null, 'today'],
  ]);
  // The card's one press leaves the text the sheet does with every choice as it comes. (A finished task deleted in the
  // sheet loses all its left-over copies, a memo under one too; the card only takes those that say nothing. None here.)
  const defaults = new Map(items.map(item => [item.kind, item.choice]));
  // (Compared as text: a new date line gets a new ID each time.)
  const docId = space(data).text.documents[0].id;
  assert.equal(raw(ok(apply(data, defaults)).data, docId), raw(ok(carryProgramTasksToToday(data, { ...base(data), today: '2026-11-05',
    lines: planProgramCarryover(space(data), '2026-11-05').lines })).data, docId));
});

test('N11b: 날짜 미정, 지우기 and taking a finished task up again, in one save; 되돌리기 brings the text back', () => {
  const { data, docId } = write(week);
  const items = programCarryoverItems(space(data), '2026-11-05'), kind = (title: string) => items.find(item => item.title === title)!.kind;
  // The sheet's choices name every task it lists (QA F1): those left as they come, these three changed.
  const choices = new Map<string, ProgramCarryoverChoice>([...items.map(item => [item.kind, item.choice] as const),
    [kind('세차 예약'), 'undated'], [kind('은행 서류'), 'delete'], [kind('운동 30분'), 'today']]);
  const counted = planProgramCarryover(space(data), '2026-11-05', undefined, choices);
  // 세차 6 copies, 영어 5, 운동 3 (taken up again: one line stays) go beside the line kept; 은행's 7 and the left-overs
  // of 보고서 and 책 (deleted, as they come) are deleted.
  assert.deepEqual({ moved: counted.moved, undated: counted.undated, dropped: counted.dropped, droppedUnder: counted.droppedUnder, removed: counted.removed },
    { moved: 3, undated: 1, dropped: 9, droppedUnder: { memo: 0, check: 0, other: 0 }, removed: 14 });
  const done = ok(apply(data, choices));
  assert.deepEqual(rows(done.data, 'today'), ['영어 단어 20개', '운동 30분', '치과 예약'].sort());
  assert.deepEqual(rows(done.data, 'undated'), ['세차 예약']);
  const text = raw(done.data, docId);
  assert(!text.includes('은행 서류'), 'every copy of the deleted task is gone');
  assert(text.includes('- [ ] 세차 예약\n  - 날짜: 미정'), 'the one kept line says 날짜 미정');
  assert.equal(text.split('\n').filter(line => line === '- [ ] 세차 예약').length, 1);
  assert(validateProgramData(done.data));
  const undone = ok(restoreProgramCarryover(done.data, { ...base(done.data), before: programCarryoverBefore(space(data)), after: programCarryoverProof(space(done.data)) }));
  assert.equal(raw(undone.data, docId), week);
});

test('N11b: deleting takes a memo with its line, but never a recorded copy; a forged drop of one is refused', () => {
  const start = write(['[2026-11-01]', '- [ ] 영어', '  - 메모: 단어장 3쪽', '', '[2026-11-02]', '- [ ] 영어', '', '[2026-11-03]', '- [ ] 영어'].join('\n'));
  const recordedId = M.tasks(space(start.data).text)[2].id;
  const data = ok(recordProgramTaskProgress(start.data, { ...base(start.data), taskId: recordedId, date: '2026-11-03', percent: 20 })).data;
  const [item] = programCarryoverItems(space(data), '2026-11-05');
  const counted = planProgramCarryover(space(data), '2026-11-05', undefined, new Map([[item.kind, 'delete']]));
  // One of the two lines deleted takes a memo along: the sheet says '메모 1개 함께 지움' before saving.
  assert.deepEqual({ dropped: counted.dropped, droppedUnder: counted.droppedUnder, blocked: counted.blocked }, { dropped: 2, droppedUnder: { memo: 1, check: 0, other: 0 }, blocked: { recorded: 1 } });
  const done = ok(apply(data, new Map([[item.kind, 'delete']])));
  // Redesign 1 (11/12): its 20% record is in its text ([20%]).
  assert.equal(raw(done.data, start.docId), '[2026-11-03]\n- [20%] 영어', 'the memo went with its line; the recorded copy stays where it was');
  // One 되돌리기 brings the line and its memo back, byte for byte.
  const undone = ok(restoreProgramCarryover(done.data, { ...base(done.data), before: programCarryoverBefore(space(data)), after: programCarryoverProof(space(done.data)) }));
  assert.equal(raw(undone.data, start.docId), raw(data, start.docId));
  assert(raw(undone.data, start.docId).includes('- [ ] 영어\n  - 메모: 단어장 3쪽'));
  assert.deepEqual(space(undone.data).text, space(data).text);
  // A plan that would delete the recorded copy is refused whole.
  const forged = carryProgramTasksToToday(data, { ...base(data), today: '2026-11-05', lines: [...counted.lines, { ...counted.lines[0], taskId: recordedId,
    state: planProgramCarryover(space(data), '2026-11-05').lines.find(line => line.taskId === recordedId)!.state }] });
  assert(!forged.ok && forged.reason === 'conflict');
});

test('N11b: the card opens the sheet; 이대로 정리 saves every choice at once; 오늘 rows say when their words are in two 분류', () => {
  const host = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramSpace.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert(host.includes('onClick={() => openCarrySheet()}>하나씩 정리</button>'));
  assert(host.includes('const carrySheetPlan = useMemo(() => carryItems && carrySheetSpace && period === \'today\' ? planProgramCarryover(carrySheetSpace, today, undefined,'));
  assert(host.includes('const plan = carrySheetPlan;'));
  assert(host.includes('{carryAlong && <small className={styles.carryApplyNote}>{carryAlong} 함께 지움</small>}'));
  assert(host.includes("...(carryNotice.undatedView ? [{ label: '날짜 미정 보기', run: () => void changePeriod('undated') }] : [])"));
  assert(host.includes("`${carryPlaces.get(task.id)!.place || '분류 없음'} · 분류 ${carryPlaces.get(task.id)!.count}곳`"));
  assert(host.includes("const options: ProgramCarryoverChoice[] = item.finished ? ['delete', 'today'] : ['today', 'undated', 'delete'];")
    || host.includes("options: ProgramCarryoverChoice[] = item.finished ? ['delete', 'today'] : ['today', 'undated', 'delete'];"));
});

test('N11b: each sheet task names its 분류: a folder, or a "- /" line still text', () => {
  let data = empty();
  for (const doc of CARRYOVER_PRODUCTION_DOCUMENTS.slice(0, 1)) {
    const made = write('', data);
    const typed = M.editTextResult(space(made.data).text, made.docId, doc.raw, { folderText: true, folderDeclare: doc.declare, folderHold: doc.hold });
    assert.equal(typed.reason, null);
    data = structuredClone(made.data); space(data).text = typed.state;
  }
  const items = programCarryoverItems(space(data), '2026-11-05');
  assert.deepEqual(items.map(item => `${item.place}:${item.title}`).sort(),
    ['공부:영어 단어', '공부:책 읽기', '운동:러닝', '운동:스트레칭', '집안 일:빨래', '집안 일:정리', '회사 일:보고서', '회사 일:정리'].sort());
});

test('N11b + N11a QA F2: deleting a task of 150 copies takes a hundred in one save, the other fifty in the next', () => {
  let { data } = write(['[2026-11-01]', ...Array.from({ length: 150 }, () => '- [ ] 같은 일')].join('\n'));
  const [item] = programCarryoverItems(space(data), '2026-11-05'), choices = new Map([[item.kind, 'delete' as const]]);
  const first = planProgramCarryover(space(data), '2026-11-05', undefined, choices);
  assert.deepEqual({ dropped: first.dropped, left: first.left, lines: first.lines.length }, { dropped: 100, left: 50, lines: 100 });
  data = ok(apply(data, choices)).data;
  const second = planProgramCarryover(space(data), '2026-11-05', undefined, choices);
  assert.deepEqual({ dropped: second.dropped, left: second.left }, { dropped: 50, left: 0 });
  assert.equal(M.tasks(space(ok(apply(data, choices)).data).text).length, 0);
});

// N11b independent QA (NO_GO, 11/5). F1: the open sheet's save planned on the newest account, so a memo another
// device had just written was deleted, and a task the sheet never showed was sorted by the card's choice.
test('N11b QA F1: the sheet saves only what it showed: a task it did not list is untouched, a line changed since refuses all', () => {
  const start = write(['[2026-11-01]', '- [ ] 은행 서류', '  - 메모: 통장 사본', '', '[2026-11-02]', '- [ ] 은행 서류', '  - 메모: 통장 사본'].join('\n'));
  const shown = space(start.data), items = programCarryoverItems(shown, '2026-11-05');
  const choices = new Map(items.map(item => [item.kind, 'delete' as ProgramCarryoverChoice]));
  // Another device adds a task the sheet never listed: the sheet's choices leave it alone.
  const added = structuredClone(start.data);
  space(added).text = M.editText(space(added).text, start.docId, `${raw(start.data, start.docId)}\n- [ ] 새로 쓴 일`);
  const newer = planProgramCarryover(space(added), '2026-11-05', undefined, choices);
  assert(!newer.lines.some(line => M.tasks(space(added).text).find(task => task.id === line.taskId)?.title === '새로 쓴 일'), 'a task the sheet did not show is not touched');
  // Another device changes the memo of a shown line: the plan the sheet made when it opened is refused whole.
  const edited = structuredClone(start.data), memo = M.getDocument(space(edited).text, start.docId)!.lines[2];
  space(edited).text = M.editText(space(edited).text, start.docId, raw(edited, start.docId).replace('  - 메모: 통장 사본', '  - 메모: 새 메모 (다른 기기)'));
  assert(M.getDocument(space(edited).text, start.docId)!.lines.some(line => line.id === memo.id && line.text.includes('새 메모')));
  const frozen = planProgramCarryover(shown, '2026-11-05', undefined, choices);
  const refused = carryProgramTasksToToday(edited, { ...base(edited), today: '2026-11-05', lines: frozen.lines });
  assert(!refused.ok && refused.reason === 'conflict');
  assert.deepEqual(refused.data, edited, 'the new memo stays');
  // The host plans the sheet's save on the space it showed, and on a conflict shows the list again with why.
  const host = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramSpace.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert(host.includes('planProgramCarryover(carrySheetSpace, today, undefined,'));
  assert(host.includes("setCarrySheetNote('다른 곳에서 바뀌었어요. 목록을 다시 확인해 주세요');"));
});

// F2: sent to 날짜 미정 in more than one save, each save kept one more line: the line already parked was not seen.
test('N11b QA F2: a task sent to 날짜 미정 over several saves ends as one line', () => {
  for (const [copies, saves] of [[100, 1], [101, 2], [400, 4], [401, 5]] as const) {
    let { data } = write(['[2026-11-01]', ...Array.from({ length: copies }, () => '- [ ] 같은 일')].join('\n'));
    let count = 0;
    for (;;) {
      const items = programCarryoverItems(space(data), '2026-11-05');
      if (!items.length) break;
      const choices = new Map(items.map(item => [item.kind, 'undated' as ProgramCarryoverChoice]));
      const plan = planProgramCarryover(space(data), '2026-11-05', undefined, choices);
      assert(plan.lines.filter(line => line.action !== 'hold').length <= 100 && ++count <= saves, `${copies}: save ${count}`);
      data = ok(apply(data, choices)).data;
    }
    assert.equal(count, saves, `${copies} copies`);
    assert.deepEqual(M.tasks(space(data).text).map(task => [task.title, task.date]), [['같은 일', null]], `${copies}: one line, 날짜 미정`);
  }
});

// F3: the note said '메모 1개' for a line with two memo lines, and for a line with only a check under it.
test('N11b QA F3: what a deletion takes along is counted line by line and by kind', () => {
  const { data } = write(['[2026-11-01]', '- [ ] 영어', '  - 메모: 단어장 3쪽', '  - 메모: 듣기 2회', '- [ ] 운동', '  - [ ] 스트레칭', '- [ ] 장보기', '  - 시간: 18:00', '  - 우유 사기'].join('\n'));
  const choices = new Map(programCarryoverItems(space(data), '2026-11-05').map(item => [item.kind, 'delete' as ProgramCarryoverChoice]));
  const counted = planProgramCarryover(space(data), '2026-11-05', undefined, choices);
  assert.deepEqual({ dropped: counted.dropped, droppedUnder: counted.droppedUnder }, { dropped: 3, droppedUnder: { memo: 3, check: 1, other: 1 } });
});

// P3: a save of more than a hundred changes made by hand (not by the planner) is refused too.
test('N11b QA P3: the command itself takes at most a hundred changed lines', () => {
  const { data } = write(['[2026-11-01]', ...Array.from({ length: 101 }, () => '- [ ] 같은 일')].join('\n'));
  const states = new Map(planProgramCarryover(space(data), '2026-11-05', 500).lines.map(line => [line.taskId, line.state]));
  const lines = M.tasks(space(data).text).map(task => ({ taskId: task.id, state: states.get(task.id)!, action: 'drop' as const }));
  const forged = carryProgramTasksToToday(data, { ...base(data), today: '2026-11-05', lines });
  assert(!forged.ok && forged.reason === 'invalid');
});
