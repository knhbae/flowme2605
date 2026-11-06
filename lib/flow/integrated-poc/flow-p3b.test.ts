import assert from 'node:assert/strict';
import test from 'node:test';
import type { ProgramData, ProgramPublicItem, ProgramTransition } from './contract';
import { createProgramData, validateProgramData } from './program-data';
import { createProgramDocument, importProgramPublicVersion } from './private-space';
import { programFlowCardLines, programVersionScheduleShape } from './program-discovery-display';
import { programImportRepeatChoice, programImportRepeats } from './public-repeat-import';
import { executeAlphaSocialIntent } from './alpha-social/dispatch';
import { textWorkspaceModel as M } from './text-workspace';

// 2차 공식 공개 리허설 (11/6, BLOCKED 1): the car Flow taken with the oil months left empty puts in a plain
// '엔진오일 교환하기' line; taking the Flow again did not see it (only lines with an `@…` marker counted) and wrote it a
// second time. With it, the cards of repeat Flows read '날짜 미정'.
const B = 'local-user', A = 'creator-minji', NOW = '2026-11-06T00:00:00.000Z', TODAY = '2026-11-06';
let request = 0;
const ok = <T,>(result: ProgramTransition<T>) => { assert(result.ok, result.ok ? '' : result.reason); return result; };
const base = (data: ProgramData) => ({ actorId: B, requestId: `p3b-${++request}`, expectedSpace: data.spaces[B] });
const item = (id: string, title: string, description = ''): ProgramPublicItem => ({ id, title, description, completionCriteria: '', sourceUrl: null, schedule: { kind: 'undated' }, subchecks: [] });
const FLOWS: Record<string, { title: string; items: ProgramPublicItem[] }> = {
  car: { title: '차 관리 반복 일정', items: [item('inspection', '자동차 정기검사 받기'), item('insurance', '자동차 보험 만기 확인하기'),
    item('tire', '타이어 공기압 확인하기 @1개월마다', '한 달에 한 번 공기압을 잽니다.'), item('oil', '엔진오일 교환하기 @?개월마다', '취급설명서의 주기에 맞춰 갑니다.')] },
  exercise: { title: '근력·유산소 운동 반복하기', items: [item('strength', '근력 운동 하기 @매주 월 목'), item('walk', '빠르게 걷기 30분 @매주 월 화 수 목 금')] },
  review: { title: '하루 돌아보기', items: [item('note', '오늘 끝낸 일 한 줄 적기 @매일')] },
  passport: { title: '여권 발급 준비', items: [item('photo', '여권 사진 준비하기')] },
};
function catalog(): ProgramData {
  const data = createProgramData();
  for (const [id, flow] of Object.entries(FLOWS)) {
    data.public.flows.push({ id, ownerId: A, currentVersionId: `${id}-v1`, category: '생활', situations: [], derivedFrom: null, archived: false });
    data.public.versions.push({ id: `${id}-v1`, flowId: id, number: 1, parentVersionId: null, title: flow.title, summary: '합성', items: flow.items,
      source: { kind: 'user-text', label: '합성', url: null, checkedAt: null }, createdBy: A, createdAt: NOW });
  }
  assert(validateProgramData(data));
  return data;
}
const versionOf = (data: ProgramData, flowId: string) => data.public.versions.find(row => row.flowId === flowId)!;
/** What the sheet sends, with the months typed (none: the box left empty). */
function sheet(data: ProgramData, flowId: string, months: Record<string, string> = {}) {
  const version = versionOf(data, flowId);
  return { versionId: version.id, itemIds: version.items.map(row => row.id), anchor: null,
    ...programImportRepeatChoice(programImportRepeats(data.spaces[B], version), { starts: {}, months }, TODAY)! };
}
const take = (data: ProgramData, flowId: string, months: Record<string, string> = {}) => ok(importProgramPublicVersion(data, { ...base(data), ...sheet(data, flowId, months) })).data;
const all = (data: ProgramData) => [...data.spaces[B].text.documents, ...data.spaces[B].text.flows].flatMap(doc => doc.lines.map(line => line.text));
const count = (data: ProgramData, text: string) => all(data).filter(line => line === text).length;
const existing = (data: ProgramData, flowId: string) => Object.fromEntries(programImportRepeats(data.spaces[B], versionOf(data, flowId)).map(row => [row.itemId, row.existing?.marker ?? null]));

test('BLOCKED: the oil line taken with its months left empty is 이미 있음 when the Flow is taken again; nothing is written twice', () => {
  const first = take(catalog(), 'car');
  assert.equal(count(first, '- [ ] 엔진오일 교환하기'), 1, 'the months left empty: a plain task');
  assert.deepEqual(existing(first, 'car'), { tire: '@1개월마다', oil: '반복 없음' });
  const raw = all(first);
  const again = ok(importProgramPublicVersion(first, { ...base(first), ...sheet(first, 'car') }));
  assert.equal(count(again.data, '- [ ] 엔진오일 교환하기'), 1, 'not written again');
  assert.deepEqual(all(again.data), raw, 'my lines are as they were');
  // The server runs the same import from the social intent.
  const intent = { type: 'copy-import' as const, ...sheet(first, 'car') };
  const served = executeAlphaSocialIntent(first, B, intent, 'p3b-server', NOW);
  assert(served.ok);
  assert.equal(count(served.data, '- [ ] 엔진오일 교환하기'), 1);
  // A months box filled the second time does not make a second line either: the item is already one of mine.
  assert.deepEqual(sheet(first, 'car', { oil: '6' }).repeatMonths, undefined, 'no months box for a line I already have');
});

test('a plain line counts when it carries this Flow\'s memo or an import wrote it, and never my own task of the same words', () => {
  // A line I wrote myself (no import line ID) under this Flow's memo.
  const memo = ok(createProgramDocument(catalog(), { ...base(catalog()), title: '옮겨 적은 줄', raw: '- [ ] 엔진오일 교환하기\n  - 메모: ‘차 관리 반복 일정’에서 · 취급설명서의 주기에 맞춰 갑니다.' }));
  assert(!M.tasks(memo.data.spaces[B].text)[0].id.startsWith('repeat-line-'));
  assert.deepEqual(existing(memo.data, 'car'), { tire: null, oil: '반복 없음' });
  const other = ok(createProgramDocument(catalog(), { ...base(catalog()), title: '다른 Flow 메모', raw: '- [ ] 엔진오일 교환하기\n  - 메모: ‘다른 차 Flow’에서' }));
  assert.equal(existing(other.data, 'car').oil, null, 'another Flow\'s memo is not this one');
  // My own task of the same words, no memo, not written by an import: the Flow puts its line in as before.
  const mine = ok(createProgramDocument(catalog(), { ...base(catalog()), title: '내 차', raw: '- [ ] 엔진오일 교환하기\n- [ ] 타이어 공기압 확인하기' }));
  assert.deepEqual(existing(mine.data, 'car'), { tire: null, oil: null });
  const taken = take(mine.data, 'car');
  assert.equal(count(taken, '- [ ] 엔진오일 교환하기'), 2, 'mine and the Flow\'s');
  assert.equal(all(taken).filter(line => line.startsWith('- [ ] 타이어 공기압 확인하기')).length, 2);
});

test('a marker I took off an imported line keeps it mine and 이미 있음; the months-filled line counts as before', () => {
  const first = take(catalog(), 'car'), copy = first.spaces[B].copies.find(row => row.flowId === 'car')!;
  const doc = M.getDocument(first.spaces[B].text, copy.documentId)!;
  const text = M.editText(first.spaces[B].text, doc.id, M.raw(doc).replace('- [ ] 타이어 공기압 확인하기 @1개월마다', '- [ ] 타이어 공기압 확인하기'));
  const unmarked = { ...first, spaces: { ...first.spaces, [B]: { ...first.spaces[B], text } } };
  assert.deepEqual(existing(unmarked, 'car'), { tire: '반복 없음', oil: '반복 없음' });
  const raw = all(unmarked);
  assert.deepEqual(all(ok(importProgramPublicVersion(unmarked, { ...base(unmarked), ...sheet(unmarked, 'car') })).data), raw, 'my line stays without its marker');
  const filled = take(catalog(), 'car', { oil: '6' });
  assert.equal(count(filled, '- [ ] 엔진오일 교환하기 @6개월마다'), 1);
  assert.deepEqual(existing(filled, 'car'), { tire: '@1개월마다', oil: '@6개월마다' });
});

test('the card and the detail read a repeat Flow as repeating: its chip for one, 반복 할 일 for more, 반복 포함 among one-time items', () => {
  const data = catalog(), shape = (flowId: string) => programVersionScheduleShape(versionOf(data, flowId));
  assert.deepEqual(['review', 'exercise', 'car', 'passport'].map(shape), ['↻ 매일', '반복 할 일', '반복 포함', '날짜 미정']);
  const card = (flowId: string) => programFlowCardLines(data.public.flows.find(row => row.id === flowId)!, versionOf(data, flowId), { needsReview: false, inMyDocuments: false }).meta;
  assert.equal(card('exercise'), '할 일 2개 · 반복 할 일 · 생활');
  assert.equal(programVersionScheduleShape({ items: [item('oil', '엔진오일 교환하기 @?개월마다')] }), '반복 할 일', 'months chosen when taken: no chip of its own');
});
