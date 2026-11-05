import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { PROGRAM_SCHEMA, type ProgramData, type ProgramTransition } from './contract';
import { createProgramEnvelope, createProgramPrivateSpace, validateProgramData } from './program-data';
import { createProgramDocument, createProgramFolder, recordProgramTaskProgress } from './private-space';
import { textWorkspaceModel as M } from './text-workspace';
import { ALPHA_SCHEMA, type AlphaAccount } from './alpha-persistence/contract';
import { captureAlphaAccount, materializeAccount } from './alpha-persistence/program-adapter';
import { createAlphaFakeServer } from './alpha-persistence/fake-server';
import { createAlphaSyncController } from './alpha-sync/controller';
import { emptyAlphaReferences } from './alpha-social/projection';
import { programExecutionTasks } from './execution';
import { programExecutionRowMeta } from './execution-presentation';
import { programTaskDateState, programTaskDateStates, programTaskRepeatMember, programTaskRepeatMembers } from './task-date-move';
import { programOpening, PROGRAM_OPENED_KEY } from './carryover-opening';
import { CARRYOVER_DOCUMENTS, CARRYOVER_PRODUCTION_DOCUMENTS } from './n11a-carryover-fixture';
import { carryProgramTasksToToday, planProgramCarryover, programCarryoverBefore, programCarryoverProof, restoreProgramCarryover, type ProgramCarryoverPlan } from './carryover';

// N11a 밀린 일 정리 (PROPOSAL 8, 완료 기준 1–3): one press moves the past unfinished tasks to today, one line per task.
const owner = '33333333-3333-4333-8333-333333333333';
let request = 0;
const ok = <T,>(result: ProgramTransition<T>) => { assert(result.ok, result.ok ? '' : result.reason); return result; };
const base = (data: ProgramData) => ({ actorId: owner, requestId: `n11a-${++request}`, expectedSpace: data.spaces[owner] });
const space = (data: ProgramData) => data.spaces[owner];
function empty(): ProgramData {
  const account: AlphaAccount = { schema: ALPHA_SCHEMA, ownerId: owner, revision: 0, source: { schema: PROGRAM_SCHEMA, actorId: owner, revision: 0 },
    space: createProgramPrivateSpace(), legacyUndo: [], legacyReceipts: [] };
  return materializeAccount(account, emptyAlphaReferences(owner)).data;
}
function write(data: ProgramData, title: string, raw: string, folderId?: string) {
  const made = ok(createProgramDocument(data, { ...base(data), title, raw, ...(folderId ? { folderId } : {}) }));
  return { data: made.data, docId: made.result };
}
const raw = (data: ProgramData, docId: string) => M.raw(M.getDocument(space(data).text, docId));
const carry = (data: ProgramData, today: string, plan: ProgramCarryoverPlan = planProgramCarryover(space(data), today)) =>
  carryProgramTasksToToday(data, { ...base(data), today, lines: plan.lines });
const onToday = (data: ProgramData, today: string) => programExecutionTasks(space(data), { period: 'today', date: today }).filter(task => task.date === today && !task.done);
const lineIds = (data: ProgramData) => space(data).text.documents.flatMap(doc => doc.lines.map(line => line.id));

// UX's synthetic week (ux/20261105-n11/probe/p1.cjs): each day the undone tasks are written again, the old lines left.
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

test('N11a 1: a week of copied lines becomes four, each where it was first written; the next day still has four date lines', () => {
  const { data, docId } = write(empty(), '할 일', week);
  const counted = planProgramCarryover(space(data), '2026-11-05');
  assert.deepEqual({ count: counted.count, kinds: counted.kinds, first: counted.first, repeated: counted.repeated, moved: counted.moved, removed: counted.removed, finished: counted.finished },
    { count: 27, kinds: 7, first: '2026-10-29', repeated: true, moved: 4, removed: 23, finished: 3 });
  const done = ok(carry(data, '2026-11-05', counted));
  assert.deepEqual(onToday(done.data, '2026-11-05').map(task => task.title).sort(), ['세차 예약', '영어 단어 20개', '은행 서류', '치과 예약'].sort());
  assert.equal(raw(done.data, docId), [
    '[2026-10-29]', '- [x] 운동 30분', '- [ ] 영어 단어 20개', '  - 날짜: 2026-11-05', '- [ ] 세차 예약', '  - 날짜: 2026-11-05', '- [ ] 은행 서류', '  - 날짜: 2026-11-05', '',
    '[2026-10-30]', '- [x] 보고서 초안', '',
    '[2026-10-31]', '- [x] 영어 단어 20개', '- [x] 책 반납', '',
    '[2026-11-02]', '- [x] 운동 30분', '- [x] 장보기', '',
    '[2026-11-04]', '- [x] 운동 30분', '- [ ] 치과 예약', '  - 날짜: 2026-11-05', ''].join('\n'));
  // '7일째' counts from the day each line was first written; 치과 예약 (11/4) is too new to say it.
  const since = (title: string) => onToday(done.data, '2026-11-05').find(task => task.title === title)!;
  for (const [title, words] of [['세차 예약', '7일째'], ['영어 단어 20개', '7일째'], ['치과 예약', null]] as const) {
    const task = since(title), meta = programExecutionRowMeta({ date: task.date, done: false, progress: null, today: '2026-11-05', dated: true, since: task.explicitDate ? task.groupDate : null });
    assert.equal(meta.parts.includes('7일째'), words !== null, title);
  }
  // 11/6: the card counts the four, and moving them again changes their date lines in place.
  const next = planProgramCarryover(space(done.data), '2026-11-06');
  assert.deepEqual({ count: next.count, kinds: next.kinds, first: next.first, moved: next.moved, removed: next.removed }, { count: 4, kinds: 4, first: '2026-10-29', moved: 4, removed: 0 });
  const again = raw(ok(carry(done.data, '2026-11-06', next)).data, docId);
  assert.equal(again.split('\n').filter(line => line.includes('- 날짜:')).length, 4);
  assert.equal(again, raw(done.data, docId).replaceAll('2026-11-05', '2026-11-06'));
  // 되돌리기: the writing exactly as before, byte for byte.
  const before = programCarryoverBefore(space(data));
  const undone = ok(restoreProgramCarryover(done.data, { ...base(done.data), before, after: programCarryoverProof(space(done.data)) }));
  assert.equal(raw(undone.data, docId), week);
  assert.deepEqual(space(undone.data).text, space(data).text);
  assert.equal(JSON.stringify(space(undone.data).text), JSON.stringify(space(data).text));
});

test('N11a 2: copies across three documents become one line each, in the document written in now; today\'s own line stays', () => {
  let data = empty();
  const october = write(data, '10월', '[2026-10-29]\n- [ ] 세차 예약\n- [ ] 은행 서류\n\n[2026-10-30]\n- [ ] 세차 예약\n- [ ] 은행 서류\n- [ ] 운동 30분'); data = october.data;
  const first = write(data, '11월 첫 주', '[2026-11-02]\n- [ ] 세차 예약\n- [ ] 은행 서류\n\n[2026-11-03]\n- [ ] 세차 예약\n- [x] 운동 30분'); data = first.data;
  const second = write(data, '11월 둘째 주', '[2026-11-04]\n- [ ] 은행 서류\n\n[2026-11-05]\n- [ ] 세차 예약'); data = second.data;
  const originals = [october, first, second].map(doc => raw(data, doc.docId));
  const counted = planProgramCarryover(space(data), '2026-11-05');
  assert.deepEqual({ count: counted.count, kinds: counted.kinds, moved: counted.moved, removed: counted.removed, today: counted.today, finished: counted.finished },
    { count: 9, kinds: 3, moved: 1, removed: 8, today: 1, finished: 1 });
  const done = ok(carry(data, '2026-11-05', counted));
  assert.deepEqual(onToday(done.data, '2026-11-05').map(task => `${task.docTitle}:${task.title}`).sort(), ['11월 둘째 주:세차 예약', '11월 둘째 주:은행 서류']);
  assert.equal(raw(done.data, second.docId), '[2026-11-04]\n- [ ] 은행 서류\n  - 날짜: 2026-11-05\n\n[2026-11-05]\n- [ ] 세차 예약', 'today\'s own line is kept');
  assert.equal(raw(done.data, first.docId), '[2026-11-03]\n- [x] 운동 30분');
  assert.equal(raw(done.data, october.docId), '', 'every day of it emptied');
  assert(validateProgramData(done.data));
  // 되돌리기 brings back all three documents, character for character.
  const undone = ok(restoreProgramCarryover(done.data, { ...base(done.data), before: programCarryoverBefore(space(data)), after: programCarryoverProof(space(done.data)) }));
  assert.deepEqual([october, first, second].map(doc => raw(undone.data, doc.docId)), originals);
  // Another tab changed one of the lines first: nothing is saved.
  const changed = structuredClone(data), target = M.tasks(space(changed).text).find(task => task.docId === october.docId)!;
  space(changed).text = M.updateTask(space(changed).text, target.id, { title: '세차 예약 (토요일)' });
  const refused = carry(changed, '2026-11-05', counted);
  assert(!refused.ok && refused.reason === 'conflict');
  assert.deepEqual(refused.data, changed);
  // And 되돌리기 after a later change is refused.
  const later = structuredClone(done.data), kept = onToday(later, '2026-11-05')[0];
  space(later).text = M.updateTask(space(later).text, kept.id, { title: `${kept.title}!` });
  const late = restoreProgramCarryover(later, { ...base(later), before: programCarryoverBefore(space(data)), after: programCarryoverProof(space(done.data)) });
  assert(!late.ok && late.reason === 'conflict');
});

test('N11a 3: lines with something under them, folder lines, repeat lines, progress lines and recorded ones never disappear', () => {
  const made = write(empty(), '섞인 것', '');
  const text = ['[2026-11-01]', '- [ ] 세차 예약', '  - [ ] 세제 사기', '- [ ] 은행 서류', '  - 메모: 통장 사본', '- [ ] 치과 예약', '  - 시간: 10:00',
    '- /운동', '  - [ ] 스트레칭', '- [ ] 영어 @매일', '- [30%] 독서', '- [ ] 일기', '',
    '[2026-11-02]', '- [ ] 세차 예약', '- [ ] 은행 서류', '- [ ] 치과 예약', '- /운동', '  - [ ] 스트레칭', '- [30%] 독서', '- [ ] 일기'].join('\n');
  const folders = text.split('\n').flatMap((line, index) => line.startsWith('- /') ? [index] : []);
  const typed = M.editTextResult(space(made.data).text, made.docId, text, { folderText: true, folderDeclare: folders });
  assert.equal(typed.reason, null);
  let data = structuredClone(made.data); space(data).text = typed.state;
  // A recorded progress (C2) on the later 일기 keeps it, though it has nothing under it.
  const diary = M.tasks(space(data).text).filter(task => task.title === '일기')[1];
  data = ok(recordProgramTaskProgress(data, { ...base(data), taskId: diary.id, date: '2026-11-02', percent: 20 })).data;
  assert(validateProgramData(data));
  const ids = lineIds(data), counted = planProgramCarryover(space(data), '2026-11-05');
  assert.equal(counted.repeats, 1, 'the repeat line goes on by its own check');
  // Six tasks have a copy to go; two stay (a progress box; a recorded line).
  assert.deepEqual({ copies: counted.copies, blocked: counted.blocked }, { copies: 6, blocked: { 'shape:progress-box': 1, progress: 1 } });
  const done = ok(carry(data, '2026-11-05', counted));
  const after = new Set(lineIds(done.data));
  const lost = ids.filter(id => !after.has(id)).map(id => space(data).text.documents[0].lines.find(line => line.id === id)!.text);
  // rev2: the copy with a check, a memo or a time under it is the one that stays, so its plain copies go; 스트레칭's
  // copy under the second '- /운동' goes too (rev1). The lines under a kept task, the progress boxes and the recorded
  // line stay.
  assert.deepEqual(lost, ['- [ ] 세차 예약', '- [ ] 은행 서류', '- [ ] 치과 예약', '  - [ ] 스트레칭']);
  const result = raw(done.data, made.docId);
  assert(result.includes('- [ ] 세차 예약\n  - 날짜: 2026-11-05\n  - [ ] 세제 사기\n') && result.includes('  - 메모: 통장 사본') && result.includes('  - 시간: 10:00'));
  assert.equal(result.split('\n').filter(line => line.startsWith('- /')).length, 2, 'folder lines as before, also the one left empty');
  assert(result.includes('- [ ] 영어 @매일\n'), 'the repeat line is untouched');
  assert.equal(onToday(done.data, '2026-11-05').length, 7);
});

test('N11a rev1: an account shaped as the real one (every task under a folder line, twenty days, three documents)', () => {
  let data = empty();
  const docs: string[] = [];
  for (const doc of CARRYOVER_DOCUMENTS) {
    const made = write(data, doc.title, '');
    const typed = M.editTextResult(space(made.data).text, made.docId, doc.raw, { folderText: true, folderDeclare: doc.raw.split('\n').flatMap((line, index) => line.startsWith('- /') ? [index] : []) });
    assert.equal(typed.reason, null, typed.folderProblem);
    data = structuredClone(made.data); space(data).text = typed.state; docs.push(made.docId);
  }
  // Three past 영어 단어 lines in the first document held by a legacy quick-item map: they may not go.
  const legacy = M.tasks(space(data).text).filter(task => task.title === '영어 단어' && !task.done && task.docId === docs[0]).slice(0, 3);
  space(data).legacyQuickItemLines = Object.fromEntries(legacy.map((task, index) => [`legacy-${index}`, task.id]));
  assert(validateProgramData(data));
  const folderLines = (value: ProgramData) => docs.map(docId => raw(value, docId).split('\n').filter(line => line.startsWith('- /')).length);
  const originals = docs.map(docId => raw(data, docId)), folders = folderLines(data);
  assert.deepEqual({ tasks: M.tasks(space(data).text).length, folders: folders.reduce((sum, count) => sum + count, 0) }, { tasks: 106, folders: 53 });
  const counted = planProgramCarryover(space(data), '2026-11-05');
  assert.deepEqual({ count: counted.count, kinds: counted.kinds, moved: counted.moved, removed: counted.removed, finished: counted.finished, split: counted.split,
    copies: counted.copies, blocked: counted.blocked }, { count: 84, kinds: 8, moved: 5, removed: 76, finished: 3, split: 1, copies: 79, blocked: { 'linked:legacyQuickItemLines': 3 } });
  const done = ok(carry(data, '2026-11-05', counted));
  assert.equal(M.tasks(space(done.data).text).length, 30, '106 task lines become 30');
  assert.deepEqual(folderLines(done.data), folders, 'every folder line stays, also those left with nothing under them');
  const folder = (scopeId: string) => space(done.data).text.folders.find(item => item.id === scopeId)?.title;
  const rows = programExecutionTasks(space(done.data), { period: 'today', date: '2026-11-05' }).filter(task => !task.done)
    .map(task => `${task.date === '2026-11-05' ? '오늘' : '지난'}:${folder(task.scopeId)}:${task.title}:${task.groupDate}`).sort();
  // One line per task in its 분류 (정리 apart in 집안일 and 공부; 집안일's was finished); the copy with a check or a
  // memo under it is the one kept (rev2); the three legacy-held lines are left where they are.
  assert.deepEqual(rows, ['오늘:공부:영어 단어:2026-10-30', '오늘:공부:정리:2026-10-31', '오늘:업무:보고서 쓰기:2026-10-20',
    '오늘:운동:스트레칭:2026-10-30', '오늘:집안일:빨래:2026-10-23',
    '지난:공부:영어 단어:2026-10-18', '지난:공부:영어 단어:2026-10-19', '지난:공부:영어 단어:2026-10-22']);
  assert.deepEqual(legacy.map(task => lineIds(done.data).includes(task.id)), [true, true, true]);
  const undone = ok(restoreProgramCarryover(done.data, { ...base(done.data), before: programCarryoverBefore(space(data)), after: programCarryoverProof(space(done.data)) }));
  assert.deepEqual(docs.map(docId => raw(undone.data, docId)), originals, 'all three documents come back byte for byte');
});

test('N11a rev2: the production shape (5 documents, 60 days, "- /" lines still text, memo lines copied along, recorded copies)', () => {
  let data = empty();
  const docs: string[] = [];
  for (const doc of CARRYOVER_PRODUCTION_DOCUMENTS) {
    const made = write(data, doc.title, '');
    const typed = M.editTextResult(space(made.data).text, made.docId, doc.raw, { folderText: true, folderDeclare: doc.declare, folderHold: doc.hold });
    assert.equal(typed.reason, null, typed.folderProblem);
    data = structuredClone(made.data); space(data).text = typed.state; docs.push(made.docId);
  }
  for (const task of M.tasks(space(data).text).filter(task => task.title === '러닝' && !task.done).filter((_, index) => index % 4 === 0))
    data = ok(recordProgramTaskProgress(data, { ...base(data), taskId: task.id, date: task.date!, percent: 40 })).data;
  assert(validateProgramData(data));
  const lines = (value: ProgramData) => space(value).text.documents.flatMap(doc => doc.lines.map(line => line.text));
  const originals = docs.map(docId => raw(data, docId)), carried = new Set(lines(data).filter(line => /^ {4}- (장소|메모):/.test(line)));
  const shapeOf = (value: ProgramData) => ({ tasks: M.tasks(space(value).text).length, slash: lines(value).filter(line => line.startsWith('- /')).length,
    folders: space(value).text.bindings.filter(binding => binding.kind === 'scope').length, dates: lines(value).filter(line => /^\s*- 날짜:/.test(line)).length,
    past: programExecutionTasks(space(value), { period: 'today', date: '2026-11-05' }).filter(task => task.date! < '2026-11-05' && !task.done).length,
    today: onToday(value, '2026-11-05').length });
  assert.deepEqual(shapeOf(data), { tasks: 240, slash: 120, folders: 60, dates: 0, past: 200, today: 0 });
  // Two presses (a hundred changed lines each at most).
  const first = planProgramCarryover(space(data), '2026-11-05');
  assert.deepEqual({ kinds: first.kinds, moved: first.moved, removed: first.removed, newDateLines: first.newDateLines, left: first.left, split: first.split, copies: first.copies, blocked: first.blocked },
    { kinds: 8, moved: 3, removed: 92, newDateLines: 3, left: 100, split: 1, copies: 194, blocked: { 'shape:different-under': 1, progress: 5 } });
  const once = ok(carry(data, '2026-11-05', first));
  const twice = ok(carry(once.data, '2026-11-05')).data;
  // 200 past lines become seven today (one per task and 분류, 책 읽기 twice for its two memos; 정리 apart under '- /회사
  // 일' and '- /집안 일', both still text; 러닝 and 빨래 were finished last, so only their left-over copies went) and
  // the five recorded copies; seven date lines; every '- /' line and folder stays.
  assert.deepEqual(shapeOf(twice), { tasks: 52, slash: 120, folders: 60, dates: 7, past: 5, today: 7 });
  const label = (task: { id: string; docId: string }) => { const doc = M.getDocument(space(twice).text, task.docId)!, rows = M.parseDocument(doc, space(twice).text).rows;
    let row = rows.find(item => item.id === task.id); while (row?.parentLineId) { row = rows.find(item => item.id === row!.parentLineId); if (row?.text.startsWith('- /')) return row.text.slice(3); } return ''; };
  assert.deepEqual(onToday(twice, '2026-11-05').map(task => `${label(task)}:${task.title}`).sort(),
    ['공부:영어 단어', '공부:책 읽기', '공부:책 읽기', '운동:스트레칭', '집안 일:정리', '회사 일:보고서', '회사 일:정리'].sort());
  assert.deepEqual(new Set(lines(twice).filter(line => /^ {4}- (장소|메모):/.test(line))), carried, 'every memo written is still there');
  // 되돌리기 of the first press brings back all five documents byte for byte.
  const undone = ok(restoreProgramCarryover(once.data, { ...base(once.data), before: programCarryoverBefore(space(data)), after: programCarryoverProof(space(once.data)) }));
  assert.deepEqual(docs.map(docId => raw(undone.data, docId)), originals);
});

test('N11a: the same words in two 분류 stay apart; a day\'s hand order and the saved place forget only lines taken out', () => {
  let data = empty();
  const work = ok(createProgramFolder(data, { ...base(data), title: '업무' })); data = work.data;
  const home = ok(createProgramFolder(data, { ...base(data), title: '개인' })); data = home.data;
  const a = write(data, '업무 할 일', '[2026-11-01]\n- [ ] 보고서\n\n[2026-11-02]\n- [ ] 보고서', work.result); data = a.data;
  const b = write(data, '개인 할 일', '[2026-11-02]\n- [ ] 보고서\n- [ ] 장보기', home.result); data = b.data;
  const lines = M.getDocument(space(data).text, a.docId)!.lines, gone = lines[4].id, kept = lines[1].id;
  data = structuredClone(data);
  space(data).timelineOrders = { '2026-11-02': [gone, M.getDocument(space(data).text, b.docId)!.lines[1].id] };
  space(data).position = { documentId: a.docId, lineId: gone, start: 3, end: 3, scrollTop: 0 };
  assert(validateProgramData(data));
  const counted = planProgramCarryover(space(data), '2026-11-05');
  assert.deepEqual({ kinds: counted.kinds, split: counted.split, moved: counted.moved, removed: counted.removed }, { kinds: 3, split: 1, moved: 3, removed: 1 });
  const done = ok(carry(data, '2026-11-05', counted));
  assert.deepEqual(onToday(done.data, '2026-11-05').map(task => `${task.docTitle}:${task.title}`).sort(), ['개인 할 일:보고서', '개인 할 일:장보기', '업무 할 일:보고서']);
  assert(onToday(done.data, '2026-11-05').some(task => task.id === kept));
  assert.deepEqual(space(done.data).timelineOrders['2026-11-02'], [M.getDocument(space(data).text, b.docId)!.lines[1].id]);
  assert.equal(space(done.data).position.lineId, null);
  const undone = ok(restoreProgramCarryover(done.data, { ...base(done.data), before: programCarryoverBefore(space(data)), after: programCarryoverProof(space(done.data)) }));
  assert.deepEqual([space(undone.data).text, space(undone.data).timelineOrders, space(undone.data).position], [space(data).text, space(data).timelineOrders, space(data).position]);
});

test('N11a: past a hundred changed lines the oldest tasks go first and the rest wait for another press', () => {
  const titles = Array.from({ length: 60 }, (_, index) => `할 일 ${String(index).padStart(2, '0')}`);
  const { data } = write(empty(), '많음', ['[2026-11-01]', ...titles.slice(0, 30).map(title => `- [ ] ${title}`), '', '[2026-11-02]',
    ...titles.map(title => `- [ ] ${title}`), '', '[2026-11-03]', ...titles.slice(30).map(title => `- [ ] ${title}`)].join('\n'));
  const counted = planProgramCarryover(space(data), '2026-11-05');
  assert.deepEqual({ count: counted.count, moved: counted.moved, removed: counted.removed, left: counted.left }, { count: 120, moved: 50, removed: 50, left: 20 });
  const done = ok(carry(data, '2026-11-05', counted)), rest = planProgramCarryover(space(done.data), '2026-11-05');
  assert.deepEqual({ count: rest.count, moved: rest.moved, removed: rest.removed, left: rest.left }, { count: 20, moved: 10, removed: 10, left: 0 });
  assert.equal(onToday(ok(carry(done.data, '2026-11-05', rest)).data, '2026-11-05').length, 60);
});

test('N11a: through the sync controller and the server, the save and its 되돌리기 come back exactly', async () => {
  const { data, docId } = write(empty(), '할 일', week);
  const server = createAlphaFakeServer([captureAlphaAccount(createProgramEnvelope(data), owner, owner)]);
  let saved: unknown = null, wire = 0;
  const device = createAlphaSyncController({ recovery: { load: () => ({ ok: true, value: saved }), save: (value: unknown) => { saved = structuredClone(value); return true; } } as never,
    requestId: () => `wire-${++wire}` });
  device.bindSession(owner, server.connect(server.issueSession(owner)));
  await device.refresh();
  const shown = () => device.snapshot().envelope!.data;
  const counted = planProgramCarryover(space(shown()), '2026-11-05');
  let before = programCarryoverBefore(space(shown())), after = '';
  const moved = await device.mutate('밀린 일 오늘로', current => {
    const next = carryProgramTasksToToday(current, { ...base(current), today: '2026-11-05', lines: counted.lines });
    if (next.ok) { before = programCarryoverBefore(space(current)); after = programCarryoverProof(space(next.data)); }
    return next;
  }, { history: true, awaitAutomaticRead: true });
  assert(moved.ok, moved.ok ? '' : moved.reason);
  await device.refresh();
  assert.equal(programCarryoverProof(space(shown())), after, 'the proof survives a read back from the server');
  const undone = await device.mutate('밀린 일 되돌리기', current => restoreProgramCarryover(current, { ...base(current), before, after }), { history: true, awaitAutomaticRead: true });
  assert(undone.ok, undone.ok ? '' : undone.reason);
  await device.refresh();
  assert.equal(raw(shown(), docId), week);
});

test('N11a 결정 2: three days or more since this device opened the space, the first screen is 오늘 (and the card says since when, that day)', () => {
  const store = new Map<string, string>(), storage = { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => { store.set(key, value); } };
  assert.deepEqual(programOpening(storage, '2026-11-01'), { first: false, since: null }, 'the first time ever');
  assert.deepEqual(programOpening(storage, '2026-11-03'), { first: false, since: null }, 'two days');
  assert.deepEqual(programOpening(storage, '2026-11-06'), { first: true, since: '2026-11-03' }, 'three days');
  assert.deepEqual(programOpening(storage, '2026-11-06'), { first: false, since: '2026-11-03' }, 'opened again that day');
  assert.deepEqual(programOpening(storage, '2026-11-07'), { first: false, since: null });
  store.set(PROGRAM_OPENED_KEY, 'not a record');
  assert.deepEqual(programOpening(storage, '2026-11-20'), { first: false, since: null });
  assert.deepEqual(programOpening(null, '2026-11-20'), { first: false, since: null }, 'no storage on this device');
});

test('N11a: the card folds only 오늘\'s past rows, is off while Korean is composed, and 고르기 still sees every row', () => {
  const host = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramSpace.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert(host.includes("const [period, setPeriod] = useState<ProgramPeriod>(() => opening.first ? 'today' : 'documents');"));
  assert(host.includes('const carryShown = period === \'today\' && date === today && !selecting;'));
  assert(host.includes('<ul className={styles.tasks} onKeyDown={selecting ? moveSelectFocus : undefined}>{listItems.map(renderListItem)}</ul>'));
  assert(host.includes('const start = () => { pageComposing.current = true; setComposingShown(true); };'));
  assert(host.includes('const carryWriting = composingShown || Object.values(dirty.current).some(Boolean);'));
  assert(host.includes('disabled={carryPending || saving || carryWriting || !!props.hostBusy?.()}'));
  assert(host.includes("if (!plan.lines.length || carryBusy.current || pageComposing.current) return;"));
  assert(host.includes('since: task.explicitDate ? task.groupDate : null });'));
});

test('N11a: the batch state tokens and repeat members are the one-by-one ones', () => {
  const made = write(empty(), '섞임', '[2026-11-01]\n- [ ] a\n  - [ ] b\n- [x] c\n- [30%] d\n- [ ] e @매일\n  - 날짜: 2026-11-02\n- [ ] f\n  - 메모: m');
  let data = made.data;
  const f = M.tasks(space(data).text).find(task => task.title === 'f')!;
  data = ok(recordProgramTaskProgress(data, { ...base(data), taskId: f.id, date: '2026-11-01', percent: 40 })).data;
  const states = programTaskDateStates(space(data)), members = programTaskRepeatMembers(space(data));
  for (const line of space(data).text.documents[0].lines) {
    assert.equal(states(line.id), programTaskDateState(space(data), line.id), line.text);
    assert.equal(members.has(line.id), programTaskRepeatMember(space(data), line.id), line.text);
  }
});
