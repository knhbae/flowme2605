import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ProgramData, ProgramPublicItem, ProgramTransition, PublicSchedule } from './contract';
import { createProgramData, validateProgramData } from './program-data';
import { createProgramDocument, importProgramPublicVersion } from './private-space';
import { programExecutionTasks } from './execution';
import { programOrderedExecutionRows } from './recurrence-order';
import { programImportRepeatChoice, programImportRepeats } from './public-repeat-import';
import { programImportPreview, programImportSpan } from './import-preview';
import { programImportArrivalNotice, programImportRepeatNotice } from './program-discovery-display';
import { programMonthGrid } from './month-grid';
import { makeProgramOutput } from './output';

// Flow pipeline stage 1 (UX 11/8 2절): the sheet's '이렇게 놓입니다' is the calendar after the import (the same functions),
// the arrival notice says where the tasks landed, the month marks the Flow's days, and an ICS item's UID stays its own.
const ACTOR = 'local-user', OWNER = 'creator-minji', NOW = '2026-11-08T00:00:00.000Z', TODAY = '2026-11-08', ANCHOR = '2026-11-22';
let request = 0;
const ok = <T,>(result: ProgramTransition<T>) => { assert(result.ok, result.ok ? '' : result.reason); return result; };
const item = (id: string, title: string, schedule: PublicSchedule = { kind: 'undated' }): ProgramPublicItem => ({ id, title, description: '', completionCriteria: '', sourceUrl: null, schedule, subchecks: [] });
const ITEMS = [
  item('pack', '짐 목록 만들기', { kind: 'relative', days: -14 }), item('move-in', '전입 신고 예약', { kind: 'relative', days: -7 }),
  item('net', '인터넷 이전', { kind: 'relative', days: -7 }), item('fridge', '냉장고 비우기', { kind: 'relative', days: -1 }),
  item('fee', '관리비 정산', { kind: 'fixed', date: '2026-11-30' }), item('sort', '짐 정리 30분 @매주 토'),
  item('address', '주소 변경 알리기'), item('filter', '정수기 필터 교환 @?개월마다'),
];
function catalog(): ProgramData {
  const data = createProgramData();
  data.public.flows.push({ id: 'move', ownerId: OWNER, currentVersionId: 'move-v1', category: '생활', situations: [], derivedFrom: null, archived: false });
  data.public.versions.push({ id: 'move-v1', flowId: 'move', number: 1, parentVersionId: null, title: '이사 준비 2주', summary: '합성 Flow', items: ITEMS,
    source: { kind: 'user-text', label: 'FlowMe 정리', url: null, checkedAt: null }, createdBy: OWNER, createdAt: NOW });
  assert(validateProgramData(data));
  return data;
}
/** The sheet's preview and then the import, with what the sheet sends (as ProgramDiscovery does). */
function take(data: ProgramData, anchor: string | null, months: Record<string, string> = {}) {
  const version = data.public.versions.find(row => row.id === 'move-v1')!, ids = version.items.map(row => row.id);
  const repeats = programImportRepeats(data.spaces[ACTOR], version, ids), choice = programImportRepeatChoice(repeats, { starts: {}, months }, TODAY)!;
  const preview = programImportPreview(version, ids, anchor, repeats, TODAY, choice);
  const done = ok(importProgramPublicVersion(data, { actorId: ACTOR, requestId: `s1-${++request}`, expectedSpace: data.spaces[ACTOR], versionId: version.id, itemIds: ids, anchor, ...choice }));
  const copy = done.data.spaces[ACTOR].copies.find(row => row.id === done.result)!;
  return { preview, data: done.data, documentId: copy.documentId, copyId: copy.id };
}
const month = (data: ProgramData) => programOrderedExecutionRows(data, { period: 'month', date: TODAY, today: TODAY, folderId: '', query: '', includeHeld: false, includeExcluded: false, page: 0 }).rows;
const countByDate = (dates: readonly string[]) => [...dates.reduce((map, date) => map.set(date, (map.get(date) ?? 0) + 1), new Map<string, number>())].sort(([a], [b]) => a.localeCompare(b));

test('criterion 1: what the sheet previews is what the month shows after the import (dated, repeat, 미정; with and without a 기준일)', () => {
  for (const anchor of [ANCHOR, null]) {
    const { preview, data, documentId } = take(catalog(), anchor);
    const placed = month(data).flatMap(row => row.kind === 'text-task' && row.task.docId === documentId && row.date ? [row.date] : []);
    const previewed = [...preview.dated.flatMap(day => Array<string>(day.count).fill(day.date)), ...preview.repeats.flatMap(row => row.first ? [row.first] : [])];
    assert.deepEqual(countByDate(placed), countByDate(previewed), `dates and counts, anchor ${anchor}`);
    const undated = programExecutionTasks(data.spaces[ACTOR]).filter(task => task.docId === documentId && !task.date).map(task => task.title);
    assert.equal(preview.undated.count, undated.length, `미정, anchor ${anchor}`);
  }
  const { preview } = take(catalog(), ANCHOR);
  assert.deepEqual(preview.dated, [{ date: '2026-11-08', count: 1, titles: ['짐 목록 만들기'] }, { date: '2026-11-15', count: 2, titles: ['전입 신고 예약', '인터넷 이전'] },
    { date: '2026-11-21', count: 1, titles: ['냉장고 비우기'] }, { date: '2026-11-30', count: 1, titles: ['관리비 정산'] }]);
  assert.deepEqual(preview.repeats, [{ itemId: 'sort', title: '짐 정리 30분', label: '매주 토', first: '2026-11-14' }]);
  assert.deepEqual(preview.undated, { count: 2, titles: ['주소 변경 알리기', '정수기 필터 교환'] });
  // Months typed for a `@?개월마다` item make it a repeat; left empty, it is 미정 (as programImportRepeatLines writes it).
  const typed = take(catalog(), ANCHOR, { filter: '6' });
  assert.equal(typed.preview.undated.count, 1);
  assert.deepEqual(typed.preview.repeats.map(row => [row.title, row.label]), [['짐 정리 30분', '매주 토'], ['정수기 필터 교환', '6개월마다']]);
  // Its first round is six months on (May 2027), past this month: compared on the tasks' own dates.
  const placed = programExecutionTasks(typed.data.spaces[ACTOR]).flatMap(task => task.docId === typed.documentId && task.date ? [task.date] : []);
  assert.deepEqual(countByDate(placed), countByDate([...typed.preview.dated.flatMap(day => Array<string>(day.count).fill(day.date)), ...typed.preview.repeats.flatMap(row => row.first ? [row.first] : [])]));
  assert.equal(typed.preview.repeats[1].first, '2027-05-08');
});

test('a repeat I already have a line for is not previewed (nor written)', () => {
  const first = take(catalog(), ANCHOR), version = first.data.public.versions[0];
  const again = programImportPreview(version, ['sort'], ANCHOR, programImportRepeats(first.data.spaces[ACTOR], version, ['sort']), TODAY);
  assert.deepEqual([again.repeats.length, again.skipped], [0, 1]);
});

test('S2: the arrival notice names the span of the dated tasks and the 미정 ones; with none dated, where they are', () => {
  const { data, documentId } = take(catalog(), ANCHOR);
  const span = programImportSpan(programExecutionTasks(data.spaces[ACTOR]).filter(task => task.docId === documentId));
  assert.deepEqual(span, { first: '2026-11-08', last: '2026-11-30', dated: 6, undated: 2 });
  assert.equal(programImportArrivalNotice('이사 준비 2주', false, programImportRepeatNotice(1, 0), { ...span, today: TODAY }),
    '‘이사 준비 2주’를 가져왔습니다. 오늘부터 11월 30일까지 6개, 날짜 미정 2개. 반복 1개를 넣었습니다.');
  assert.equal(programImportArrivalNotice('짐', false, '', { first: null, last: null, dated: 0, undated: 3, today: TODAY }), '‘짐’을 가져왔습니다. 날짜 미정 3개는 오늘 › 날짜 미정에 있습니다.');
  assert.equal(programImportArrivalNotice('짐', false, '', { first: '2026-11-12', last: '2026-11-12', dated: 2, undated: 0, today: TODAY }), '‘짐’을 가져왔습니다. 11월 12일에 2개.');
  assert.equal(programImportArrivalNotice('운동', true), '‘운동’을 가져왔습니다. 날짜가 있는 할 일은 오늘에도 보입니다. 필요 없으면 문서를 휴지통으로 옮길 수 있습니다. 다시 쓰려면 휴지통에서 복원합니다.', 'without a span, as before');
});

test('criterion 2: the month marks the Flow\'s days with one flow dot first; other rows keep theirs; nothing else changes', () => {
  const taken = take(catalog(), ANCHOR);
  const mine = ok(createProgramDocument(taken.data, { actorId: ACTOR, requestId: `s1-${++request}`, expectedSpace: taken.data.spaces[ACTOR], title: '내 글', raw: '[2026-11-15]\n- [ ] 내 일\n' }));
  const rows = month(mine.data), flow = { title: '이사 준비 2주', test: (row: (typeof rows)[number]) => row.kind === 'text-task' && row.task.docId === taken.documentId };
  const plain = programMonthGrid(rows, TODAY, TODAY, TODAY), marked = programMonthGrid(rows, TODAY, TODAY, TODAY, flow);
  const cell = (grid: typeof plain, date: string) => grid.weeks.flat().find(entry => entry?.date === date)!;
  assert.deepEqual([cell(marked, '2026-11-15').dots, cell(marked, '2026-11-15').flow, cell(marked, '2026-11-15').more], [['flow', 'open'], 2, 0]);
  assert.match(cell(marked, '2026-11-15').label, /할 일 3개, 이사 준비 2주 2개$/);
  assert.deepEqual(cell(marked, '2026-11-14').dots, ['flow'], 'a repeat line\'s first round is the Flow\'s too');
  assert.deepEqual(cell(plain, '2026-11-15').dots, ['open', 'open', 'open'], 'unmarked, as before');
  assert.equal(cell(plain, '2026-11-15').flow, 0);
  assert.deepEqual(marked.weeks.flat().filter(entry => entry?.flow).map(entry => entry!.date), ['2026-11-08', '2026-11-14', '2026-11-15', '2026-11-21', '2026-11-30']);
});

test('S9: an ICS item\'s UID is its own (version and item), whatever the 기준일 or the time it is taken', () => {
  const version = catalog().public.versions[0];
  const uids = (anchor: string, at: string) => {
    const output = makeProgramOutput(version, { selectedItemIds: ['move-in', 'fee'], anchor, format: 'ics' }, new Date(at));
    assert(output.ok); return output.payload.replace(/\r\n[ \t]/g, '').split('\r\n').filter(line => line.startsWith('UID:'));
  };
  const first = uids(ANCHOR, NOW);
  assert.equal(first.length, 2);
  assert.deepEqual(uids('2026-12-20', '2026-11-20T09:00:00.000Z'), first);
});

test('the wiring: one check for 오늘 and the band; the band over my writing documents only; [달력에서 보기] saves nothing', () => {
  const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8').replace(/\r\n/g, '\n');
  const space = read('components/flow/integrated-poc/ProgramSpace.tsx'), discovery = read('components/flow/integrated-poc/ProgramDiscovery.tsx');
  const band = read('components/flow/integrated-poc/ProgramFlowTodayBand.module.css'), workspace = read('components/flow/integrated-poc/AlphaWorkspace.tsx');
  assert(space.includes('onClick={() => { void checkTaskFromList(task); }}'), 'the 오늘 list');
  assert(space.includes("void checkTaskFromList(live, 'band').then(outcome => {"), 'the band');
  assert.match(space, /const bandDocumentId = period === 'documents' && !folderId && !!selectedDoc && !selectedArchived && !selectedTrashed\n\s+&& space\.text\.documents\.some\(doc => doc\.id === selectedDoc\.id\)/);
  assert(space.includes("programOrderedExecutionRows(data, { period: 'today', date: today, today, folderId: '', query: '', includeHeld: false, includeExcluded: false, page: 0 }).rows"), '오늘\'s own query and order');
  const calendar = space.slice(space.indexOf('async function showFlowOnCalendar('), space.indexOf('/** C6a: into 고르기'));
  assert(calendar.includes("setMonthViewState('grid')") && !/\b(run|mutate|setMonthView)\(/.test(calendar), 'screen state only; the stored month view stays');
  assert(band.includes(':global([data-writing-keyboard="true"]) .band { display: none; }'));
  assert(discovery.includes('programImportPreview(version, useItemIds, detail.anchor || null, sheetRepeats, today, { ...(repeatChoice ?? {}), recurrenceStarts })'), 'what runImport sends');
  assert(workspace.includes('const placed = programExecutionTasks(live!.spaces[owner]).filter(task => task.docId === copy.documentId), span = programImportSpan(placed);'));
});
