import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { PROGRAM_SCHEMA, type ProgramData, type ProgramTransition } from './contract';
import { createProgramPrivateSpace } from './program-data';
import { createProgramDocument } from './private-space';
import { textWorkspaceModel as M } from './text-workspace';
import { ALPHA_SCHEMA, type AlphaAccount } from './alpha-persistence/contract';
import { materializeAccount } from './alpha-persistence/program-adapter';
import { emptyAlphaReferences } from './alpha-social/projection';
import { carryProgramTasksToToday, planProgramCarryover, programCarryoverItems } from './carryover';

// 11/5 phone P3: the card said '밀린 일 43가지 · 45줄' and the sheet '오늘로 옮길 일 · 43', but the button said
// '오늘로 옮기기 · 44' and the notice '44가지를 오늘로 옮겼습니다': those counted lines dated today, and a task whose
// two copies carry different memos keeps both. Of the other two extra lines, one copy was taken out ('겹친 줄 1개').
const owner = '44444444-4444-4444-8444-444444444444';
let request = 0;
const ok = <T,>(result: ProgramTransition<T>) => { assert(result.ok, result.ok ? '' : result.reason); return result; };
const base = (data: ProgramData) => ({ actorId: owner, requestId: `count-${++request}`, expectedSpace: data.spaces[owner] });
function write(raw: string) {
  const account: AlphaAccount = { schema: ALPHA_SCHEMA, ownerId: owner, revision: 0, source: { schema: PROGRAM_SCHEMA, actorId: owner, revision: 0 },
    space: createProgramPrivateSpace(), legacyUndo: [], legacyReceipts: [] };
  const initial = materializeAccount(account, emptyAlphaReferences(owner)).data;
  return ok(createProgramDocument(initial, { ...base(initial), title: '할 일', raw })).data;
}
const today = '2026-11-05';

test('P3: the button and the notice count tasks (가지) as the card and the sheet do, not the lines dated today', () => {
  const data = write(['[2026-10-29]', '- [ ] 장보기', '- [ ] 세차 예약', '  - 메모: 오전', '', '[2026-10-30]', '- [ ] 장보기', '- [ ] 세차 예약', '  - 메모: 오후', '- [ ] 은행 서류', ''].join('\n'));
  const space = data.spaces[owner], plan = planProgramCarryover(space, today);
  // The card: 3가지 · 5줄. One press dates four lines (세차 예약 keeps both, each memo with it) and takes one out.
  assert.deepEqual({ kinds: plan.kinds, count: plan.count, moved: plan.moved, removed: plan.removed, toToday: plan.toToday },
    { kinds: 3, count: 5, moved: 4, removed: 1, toToday: 3 });
  // The sheet: '오늘로 옮길 일 · 3', '이대로 정리 · 오늘 3'.
  const items = programCarryoverItems(space, today);
  assert.deepEqual([items.length, items.filter(item => !item.finished && item.choice === 'today').length], [3, 3]);
  // After the press, three different tasks are on today (세차 예약 twice, a memo each).
  const done = ok(carryProgramTasksToToday(data, { ...base(data), today, lines: plan.lines })).data;
  const onToday = M.tasks(done.spaces[owner].text).filter(task => task.date === today && !task.done);
  assert.deepEqual([...new Set(onToday.map(task => task.title))].sort(), ['세차 예약', '은행 서류', '장보기']);
  assert.equal(onToday.length, 4);
});

test('P3: a task found today already counts once, with or without a copy dated today', () => {
  const data = write(['[2026-10-30]', '- [ ] 장보기', '- [ ] 세차 예약', '  - 메모: 오전', '', `[${today}]`, '- [ ] 세차 예약', '  - 메모: 오후', ''].join('\n'));
  const plan = planProgramCarryover(data.spaces[owner], today);
  assert.equal(plan.kinds, 2);
  assert.equal(plan.toToday, 2);
});

test('P3: the card\'s button and the notice read toToday', () => {
  const source = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramSpace.tsx', import.meta.url), 'utf8');
  assert(source.includes("`오늘로 옮기기 · ${carryPlan.toToday}`"));
  assert(source.includes('const kinds = plan.toToday;'));
  assert(!source.includes('carryPlan.moved'));
});

// 11/5 phone P3: the old-repeat card ('예전 방식 반복 1개가 있습니다 … 바꾸기/나중에') and the 옮기기·되돌리기 notice are
// both held at the bottom; the card lay over the notice and the list.
test('P3: the old-repeat card waits while a notice holds the bottom, and is defined after every notice it waits for', () => {
  const source = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramSpace.tsx', import.meta.url), 'utf8');
  assert(source.includes('{!detail && !bottomNoticeShown && legacyRepeatContent}'));
  const shown = source.indexOf('  const bottomNoticeShown = ');
  // F4-b (11/9): the folder screen's '＋ 오늘 할 일' notice holds the bottom too.
  assert(source.slice(shown, source.indexOf('\n', shown)).includes('!sheetOpen && (orderNoticeContent || checkNoticeContent || repeatNoticeContent) || datesNoticeContent || carryNoticeContent || folderTodayNoticeContent || locationNoticeContent || selecting && selectNotice'));
  for (const name of ['orderNoticeContent', 'checkNoticeContent', 'repeatNoticeContent', 'datesNoticeContent', 'carryNoticeContent', 'folderTodayNoticeContent', 'locationNoticeContent'])
    assert(source.search(new RegExp(`  const ${name}\\s*=`)) > 0 && source.search(new RegExp(`  const ${name}\\s*=`)) < shown, name);
});
