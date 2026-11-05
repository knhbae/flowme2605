import assert from 'node:assert/strict';
import test from 'node:test';
import type { ProgramData, ProgramPublicItem, ProgramTransition } from './contract';
import { createProgramData, validateProgramData } from './program-data';
import { createProgramDocument, importProgramPublicVersion } from './private-space';
import { textWorkspaceModel as M } from './text-workspace';
import { executeAlphaSocialIntent } from './alpha-social/dispatch';
import { isAlphaSocialIntent } from './alpha-social/contract';
import { programExecutionTasks } from './execution';
import { completeProgramRepeat, programRepeatLine } from './repeat-commands';
import { programImportItemView, programImportRepeatChoice, programImportRepeats } from './public-repeat-import';
import { compareProgramCopyVersion } from './private-space';
import { captureProgramImportLinks, unlinkProgramImportLines, remainingProgramImportLinks, programImportRepeatKept } from './program-import-links';
import { programImportArrivalNotice, programImportCancelNotice, programImportRepeatNotice, programImportTargetNotice } from './program-discovery-display';
import { createProgramPublicationDraft, publicationDraftAt, publishProgramDocument, saveProgramPublicationDraft } from './publication-editor';

test('a document published with `@24개월마다` and `@?개월마다` titles keeps them, and its import asks for the months (PROPOSAL 10절)', () => {
  let data = createProgramData();
  const made = ok(createProgramDocument(data, { ...base(data), title: '차 관리 원문', raw: '- [ ] 자동차 정기검사 받기 @24개월마다\n- [ ] 엔진오일 교환하기 @?개월마다' }));
  const draft = createProgramPublicationDraft(made.data, made.result, NOW)!;
  draft.title = '차 관리 반복 일정'; draft.summary = '합성'; draft.sourceKind = 'user-text';
  draft.rows = draft.rows.filter(row => row.origin === 'task').map(row => ({ ...row, selected: true }));
  const stored = ok(saveProgramPublicationDraft(made.data, ACTOR, draft, publicationDraftAt(made.data, ACTOR, draft.documentId)));
  const published = ok(publishProgramDocument(stored.data, ACTOR, draft, NOW)), version = published.data.public.versions.find(row => row.id === published.result)!;
  assert.deepEqual(version.items.map(row => [row.title, row.schedule.kind]), [['자동차 정기검사 받기 @24개월마다', 'undated'], ['엔진오일 교환하기 @?개월마다', 'undated']]);
  assert.deepEqual(programImportRepeats(undefined, version).map(row => [row.title, row.marker, row.pick]), [['자동차 정기검사 받기', '@24개월마다', false], ['엔진오일 교환하기', null, true]]);
});

test('the notices name the repeat lines written, the ones I already had, and the ones kept on 취소 (PROPOSAL 7절)', () => {
  assert.equal(programImportRepeatNotice(2, 1), '반복 2개를 넣었습니다. 이미 있던 반복 1개는 넣지 않았습니다.');
  assert.equal(programImportRepeatNotice(0, 0), '');
  assert.equal(programImportArrivalNotice('운동', true), programImportArrivalNotice('운동', true, ''), 'the old notice stays as it was');
  assert.match(programImportArrivalNotice('운동', false, programImportRepeatNotice(2, 0)), /^‘운동’을 가져왔습니다\. 반복 2개를 넣었습니다\. 날짜가 있는/);
  assert.deepEqual([programImportTargetNotice(3, 0, 0), programImportTargetNotice(0, 1, 1), programImportTargetNotice(2, 1, 0), programImportTargetNotice(0, 0, 2), programImportTargetNotice(0, 0, 0)], [
    '문서 끝에 할 일 3개를 넣었습니다.', '문서 끝에 반복 1개를 넣었습니다. 이미 있던 반복 1개는 넣지 않았습니다.', '문서 끝에 할 일 2개와 반복 1개를 넣었습니다.',
    '이미 있던 반복 2개는 넣지 않았습니다. 새로 넣은 것은 없습니다.', '이미 연결한 할 일입니다. 새로 넣은 것은 없습니다.']);
  assert.deepEqual([{ total: 2, remaining: 0 }, { total: 3, remaining: 0, kept: 1 }, { total: 1, remaining: 0, kept: 1 }, { total: 4, remaining: 1, kept: 1 }].map(programImportCancelNotice), [
    '넣은 할 일을 뺐습니다. 사본 문서와 원래 할 일·진행 기록은 그대로 남아 있습니다.', '넣은 할 일을 뺐습니다. 체크하거나 고친 반복 1개는 남겼습니다. 사본 문서와 원래 할 일·진행 기록은 그대로 남아 있습니다.',
    '체크하거나 고친 반복 1개는 남겼습니다. 뺀 것은 없습니다.', '2개를 뺐습니다. 남은 연결 1개는 다시 취소할 수 있습니다. 체크하거나 고친 반복 1개는 남겼습니다.']);
});

// 공식 반복 Flow 가져오기 (decision 11/5, PROPOSAL rev1 8절): a repeat item is written into my document as my own repeat
// line (N10), not linked as a copy item; one I already repeat is not written again.
const ACTOR = 'local-user', OWNER = 'creator-minji', NOW = '2026-11-05T00:00:00.000Z', TODAY = '2026-11-05';
let request = 0;
const ok = <T,>(result: ProgramTransition<T>) => { assert(result.ok, result.ok ? '' : result.reason); return result; };
const base = (data: ProgramData) => ({ actorId: ACTOR, requestId: `rf-${++request}`, expectedSpace: data.spaces[ACTOR] });
const space = (data: ProgramData) => data.spaces[ACTOR];
const item = (id: string, title: string, description: string): ProgramPublicItem => ({ id, title, description, completionCriteria: '', sourceUrl: null, schedule: { kind: 'undated' }, subchecks: [] });
// The three official Flows of FLOWS.md (3판), as a synthetic catalog for tests.
const FLOWS = {
  exercise: { title: '근력·유산소 운동 반복하기', items: [
    item('strength', '근력 운동 하기 @매주 월 목', '몸의 큰 근육을 두루 쓰는 근력 운동을 중간 강도 이상으로 합니다. 일주일에 이틀 이상이 WHO 권고입니다.'),
    item('walk', '빠르게 걷기 30분 @매주 월 화 수 목 금', '중강도 유산소 활동을 30분 합니다. 평일 5일이면 일주일 150분이 됩니다.')] },
  english: { title: '영어 단어 떠올리기 연습', items: [
    item('recall', '영어 단어 뜻 가리고 떠올리기 @매일', '오늘 볼 단어의 뜻을 가리고 먼저 떠올려 본 뒤 답을 확인합니다.'),
    item('retest', '이번 주 틀린 단어 다시 시험 보기 @매주 일', '한 주 동안 틀린 단어만 모아 다시 떠올리기를 합니다.')] },
  car: { title: '차 관리 반복 일정', items: [
    item('inspection', '자동차 정기검사 받기 @24개월마다', '2년마다 정기검사를 받습니다. 검사 기간 안에 받고, 내 차의 유효기간은 자동차등록증에서 확인하세요.'),
    item('tire', '타이어 공기압 확인하기 @1개월마다', '한 달에 한 번 네 바퀴 공기압을 재고 적정값에 맞춥니다.'),
    item('oil', '엔진오일 교환하기 @?개월마다', '내 차 취급설명서에 적힌 교환 주기에 맞춰 엔진오일을 갑니다. 다음 교환 주행거리는 메모 줄에 적어 둡니다.')] },
};
function catalog(data = createProgramData()): ProgramData {
  for (const [id, flow] of Object.entries(FLOWS)) {
    data.public.flows.push({ id, ownerId: OWNER, currentVersionId: `${id}-v1`, category: '생활', situations: [], derivedFrom: null, archived: false });
    data.public.versions.push({ id: `${id}-v1`, flowId: id, number: 1, parentVersionId: null, title: flow.title, summary: `${flow.title} 소개`, items: flow.items,
      source: { kind: 'user-text', label: 'FlowMe 정리', url: null, checkedAt: null }, createdBy: OWNER, createdAt: NOW });
  }
  assert(validateProgramData(data));
  return data;
}
/** What the sheet sends for what was typed in it (as ProgramDiscovery does). */
function sheet(data: ProgramData, versionId: string, chosen: { starts?: Record<string, string>; months?: Record<string, string> } = {}) {
  const version = data.public.versions.find(row => row.id === versionId)!;
  const choice = programImportRepeatChoice(programImportRepeats(space(data), version), { starts: chosen.starts ?? {}, months: chosen.months ?? {} }, TODAY);
  assert(choice);
  return { versionId, itemIds: version.items.map(row => row.id), anchor: null, ...choice };
}
const lines = (data: ProgramData, docId: string) => M.getDocument(space(data).text, docId)!.lines.map(line => line.text);

test('운동 into a new document on Thursday 11/5: two repeat lines of mine, dated today, no 반복: line; 근력 checked moves to 11/9', () => {
  const data = catalog(), done = ok(importProgramPublicVersion(data, { ...base(data), ...sheet(data, 'exercise-v1') }));
  const copy = space(done.data).copies.find(row => row.flowId === 'exercise')!;
  assert.deepEqual(lines(done.data, copy.documentId).slice(1), [
    '- [ ] 근력 운동 하기 @매주 월 목', '  - 날짜: 2026-11-05', '  - 메모: ‘근력·유산소 운동 반복하기’에서 · 몸의 큰 근육을 두루 쓰는 근력 운동을 중간 강도 이상으로 합니다.',
    '- [ ] 빠르게 걷기 30분 @매주 월 화 수 목 금', '  - 날짜: 2026-11-05', '  - 메모: ‘근력·유산소 운동 반복하기’에서 · 중강도 유산소 활동을 30분 합니다.']);
  assert(!lines(done.data, copy.documentId).some(line => line.startsWith('반복')), 'no Flow repeat line, no series');
  assert.deepEqual({ items: copy.itemLines, recurrence: copy.recurrence ?? null }, { items: {}, recurrence: null }, 'not copy items');
  const today = programExecutionTasks(space(done.data), { period: 'today', date: TODAY }).filter(task => task.date === TODAY).map(task => task.title);
  assert.deepEqual(today.sort(), ['근력 운동 하기 @매주 월 목', '빠르게 걷기 30분 @매주 월 화 수 목 금'].sort());
  const strength = M.tasks(space(done.data).text).find(task => task.title.startsWith('근력'))!;
  assert.equal(programRepeatLine(space(done.data), strength.id)?.block, null, 'a repeat line of mine');
  const checked = ok(completeProgramRepeat(done.data, { ...base(done.data), taskId: strength.id, today: TODAY, expected: TODAY }));
  assert.equal(M.tasks(space(checked.data).text).find(task => task.id === strength.id)!.date, '2026-11-09');
});

test('차 관리: the months chosen for 엔진오일 and a first date for 정기검사; with no months 엔진오일 is a plain task in 날짜 미정', () => {
  const data = catalog(), chosen = ok(importProgramPublicVersion(data, { ...base(data), ...sheet(data, 'car-v1', { starts: { inspection: '2027-08-10' }, months: { oil: '6' } }) }));
  const doc = space(chosen.data).copies.find(row => row.flowId === 'car')!.documentId, text = lines(chosen.data, doc);
  for (const [line, date] of [['- [ ] 자동차 정기검사 받기 @24개월마다', '2027-08-10'], ['- [ ] 타이어 공기압 확인하기 @1개월마다', '2026-12-05'], ['- [ ] 엔진오일 교환하기 @6개월마다', '2027-05-05']])
    assert.equal(text[text.indexOf(line) + 1], `  - 날짜: ${date}`, line);
  const plain = catalog(), none = ok(importProgramPublicVersion(plain, { ...base(plain), ...sheet(plain, 'car-v1') }));
  const plainText = lines(none.data, space(none.data).copies.find(row => row.flowId === 'car')!.documentId);
  assert.equal(plainText[plainText.indexOf('- [ ] 엔진오일 교환하기') + 1], '  - 날짜: 미정');
  assert(!plainText.some(line => line.includes('@?')));
  // Months out of 1-24, a first date for no line, or a repeat line without one: refused.
  const wrongs: { months?: Record<string, number>; starts?: Record<string, string> }[] = [{ months: { oil: 25 } }, { months: { tire: 3 } }, { starts: { strength: TODAY } }];
  for (const wrong of wrongs) {
    const bad = { ...sheet(data, 'car-v1'), ...(wrong.months ? { repeatMonths: wrong.months } : {}), ...(wrong.starts ? { repeatStarts: { ...sheet(data, 'car-v1').repeatStarts, ...wrong.starts } } : {}) };
    const refused = importProgramPublicVersion(data, { ...base(data), ...bad });
    assert(!refused.ok && refused.reason === 'invalid', JSON.stringify(wrong));
  }
  const missing = importProgramPublicVersion(data, { ...base(data), ...sheet(data, 'car-v1'), repeatStarts: {} });
  assert(!missing.ok && missing.reason === 'invalid');
});

test('a repeat line of mine with the same words is not written again (its rule aside); 되돌리기 takes back exactly what was written', () => {
  let data = catalog();
  const mine = ok(createProgramDocument(data, { ...base(data), title: '내 운동', raw: '- [ ] 근력 운동 하기 @매주 화\n  - 날짜: 2026-11-10\n- [ ] 장보기' }));
  data = mine.data;
  const before = lines(data, mine.result).join('\n');
  const repeats = programImportRepeats(space(data), data.public.versions.find(row => row.id === 'exercise-v1')!);
  assert.deepEqual(repeats.map(row => [row.itemId, row.existing]), [['strength', { documentTitle: '내 운동', marker: '@매주 화', same: false }], ['walk', null]]);
  const done = ok(importProgramPublicVersion(data, { ...base(data), ...sheet(data, 'exercise-v1'), targetDocumentId: mine.result }));
  const after = lines(done.data, mine.result);
  assert.equal(after.filter(line => line.startsWith('- [ ] 근력 운동 하기')).length, 1, 'mine stays the one');
  assert.equal(after.slice(0, 3).join('\n'), before, 'my lines are as they were');
  assert.deepEqual(after.slice(3, 5), ['- [ ] 빠르게 걷기 30분 @매주 월 화 수 목 금', '  - 날짜: 2026-11-05']);
  // 되돌리기 (the arrival notice): the written line goes with its date and memo; the document is as before, byte for byte.
  const copy = space(done.data).copies.find(row => row.flowId === 'exercise')!;
  const batch = captureProgramImportLinks(ACTOR, copy.id, mine.result, space(data), space(done.data));
  assert.equal(batch.repeat?.length, 1);
  const undone = ok(unlinkProgramImportLines(done.data, batch));
  assert.equal(lines(undone.data, mine.result).join('\n'), before);
  assert.equal(remainingProgramImportLinks(undone.data, batch).repeat.length, 0);
  // A written line checked since stays (its kept day stays too), and is said apart.
  const walk = M.tasks(space(done.data).text).find(task => task.title.startsWith('빠르게'))!;
  const checked = ok(completeProgramRepeat(done.data, { ...base(done.data), taskId: walk.id, today: TODAY, expected: TODAY }));
  assert.deepEqual({ free: remainingProgramImportLinks(checked.data, batch).repeat.length, kept: programImportRepeatKept(checked.data, batch) }, { free: 0, kept: 1 });
});

test('the server runs the same import from the social intent; the intent takes the first dates and 1-24 months only', () => {
  const data = catalog(), intent = { type: 'copy-import' as const, ...sheet(data, 'car-v1', { months: { oil: '12' } }) };
  assert(isAlphaSocialIntent(intent));
  for (const months of [0, 25, 1.5]) assert(!isAlphaSocialIntent({ ...intent, repeatMonths: { oil: months } }), String(months));
  assert(!isAlphaSocialIntent({ ...intent, repeatStarts: { oil: '2026-13-01' } }));
  const server = executeAlphaSocialIntent(data, ACTOR, intent, 'server-repeat-import', NOW);
  assert(server.ok, server.ok ? '' : server.reason);
  const text = lines(server.data, space(server.data).copies.find(row => row.flowId === 'car')!.documentId);
  assert(text.includes('- [ ] 엔진오일 교환하기 @12개월마다'));
  assert(validateProgramData(server.data));
});

test('the detail and the sheet: chips without the marker, months typed 1-24 only, a fixed rule takes no first date', () => {
  const [inspection, tire, oil] = FLOWS.car.items, [strength, walk] = FLOWS.exercise.items;
  assert.deepEqual([strength, walk, inspection, oil].map(programImportItemView), [
    { title: '근력 운동 하기', label: '↻ 매주 월·목' }, { title: '빠르게 걷기 30분', label: '↻ 평일' },
    { title: '자동차 정기검사 받기', label: '↻ 24개월마다' }, { title: '엔진오일 교환하기', label: '가져올 때 주기 고름' }]);
  assert.equal(programImportItemView(item('plain', '장보기', '')), null);
  const data = catalog(), car = programImportRepeats(space(data), data.public.versions.find(row => row.id === 'car-v1')!);
  for (const typed of ['0', '25', '6개월', '1.5', '-3']) assert.equal(programImportRepeatChoice(car, { starts: {}, months: { oil: typed } }, TODAY), null, typed);
  assert.deepEqual(programImportRepeatChoice(car, { starts: { tire: '2026-11-20' }, months: { oil: ' 3 ' } }, TODAY),
    { repeatStarts: { inspection: '2028-11-05', tire: '2026-11-20', oil: '2027-02-05' }, repeatMonths: { oil: 3 } });
  const exercise = programImportRepeats(space(data), data.public.versions.find(row => row.id === 'exercise-v1')!);
  assert.deepEqual(programImportRepeatChoice(exercise, { starts: { strength: '2026-12-01' }, months: {} }, '2026-11-07'), { repeatStarts: { strength: '2026-11-09', walk: '2026-11-09' } });
  assert.equal(tire.title, '타이어 공기압 확인하기 @1개월마다');
});

test('a new version leaves the repeat lines out of the copy comparison; a document ending in a day heading keeps the written date', () => {
  const data = catalog(), done = ok(importProgramPublicVersion(data, { ...base(data), ...sheet(data, 'exercise-v1') }));
  const next = done.data, v1 = next.public.versions.find(row => row.id === 'exercise-v1')!;
  next.public.versions.push({ ...v1, id: 'exercise-v2', number: 2, parentVersionId: v1.id, items: [...v1.items.map(row => ({ ...row, description: `${row.description} 고침` })), item('stretch', '스트레칭', '')] });
  next.public.flows.find(row => row.id === 'exercise')!.currentVersionId = 'exercise-v2';
  const copy = space(next).copies.find(row => row.flowId === 'exercise')!;
  const compared = compareProgramCopyVersion(next, { actorId: ACTOR, copyId: copy.id, versionId: 'exercise-v2' });
  assert(compared.ok);
  assert.deepEqual(compared.result.items.map(row => [row.itemId, row.state]), [['stretch', 'added']]);
  let dated = catalog();
  const mine = ok(createProgramDocument(dated, { ...base(dated), title: '이번 주', raw: '[2026-11-10]\n- [ ] 장보기' }));
  dated = ok(importProgramPublicVersion(mine.data, { ...base(mine.data), ...sheet(mine.data, 'exercise-v1'), targetDocumentId: mine.result })).data;
  const written = M.tasks(space(dated).text).filter(task => task.docId === mine.result).map(task => [task.title, task.date]);
  assert.deepEqual(written, [['장보기', '2026-11-10'], ['근력 운동 하기 @매주 월 목', TODAY], ['빠르게 걷기 30분 @매주 월 화 수 목 금', TODAY]]);
});
