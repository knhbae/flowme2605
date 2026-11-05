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
  // The card's one press is the sheet with every choice as it comes, for the tasks going on. (A finished task deleted
  // in the sheet loses all its left-over copies, a memo under one too; the card only takes those that say nothing.)
  const defaults = new Map(items.filter(item => !item.finished).map(item => [item.kind, item.choice]));
  assert.deepEqual(planProgramCarryover(space(data), '2026-11-05', undefined, defaults).lines, planProgramCarryover(space(data), '2026-11-05').lines);
});

test('N11b: 날짜 미정, 지우기 and taking a finished task up again, in one save; 되돌리기 brings the text back', () => {
  const { data, docId } = write(week);
  const items = programCarryoverItems(space(data), '2026-11-05'), kind = (title: string) => items.find(item => item.title === title)!.kind;
  const choices = new Map<string, ProgramCarryoverChoice>([[kind('세차 예약'), 'undated'], [kind('은행 서류'), 'delete'], [kind('운동 30분'), 'today']]);
  const counted = planProgramCarryover(space(data), '2026-11-05', undefined, choices);
  // 세차 6 copies, 영어 5, 운동 3 (taken up again: one line stays), 보고서 1 and 책 1 left-overs; 은행's 7 deleted.
  assert.deepEqual({ moved: counted.moved, undated: counted.undated, dropped: counted.dropped, droppedUnder: counted.droppedUnder, removed: counted.removed },
    { moved: 3, undated: 1, dropped: 7, droppedUnder: 0, removed: 16 });
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
  assert.deepEqual({ dropped: counted.dropped, droppedUnder: counted.droppedUnder, blocked: counted.blocked }, { dropped: 2, droppedUnder: 1, blocked: { recorded: 1 } });
  const done = ok(apply(data, new Map([[item.kind, 'delete']])));
  assert.equal(raw(done.data, start.docId), '[2026-11-03]\n- [ ] 영어', 'the memo went with its line; the recorded copy stays where it was');
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
  assert(host.includes('onClick={openCarrySheet}>하나씩 정리</button>'));
  assert(host.includes('const carrySheetPlan = useMemo(() => carryItems && period === \'today\' ? planProgramCarryover(space, today, undefined,'));
  assert(host.includes('const plan = carrySheetPlan;'));
  assert(host.includes('{!!carrySheetPlan?.droppedUnder && <small className={styles.carryApplyNote}>메모 {carrySheetPlan.droppedUnder}개 함께 지움</small>}'));
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
