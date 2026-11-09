import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { programDeferChips } from './task-date-move';
import { programFlowProgressShort } from './flow-loop';

// Core3 P3 (11/8): 미루기 chips at the top of a list row's ⋯ (C6b's one date move, its notice and 되돌리기); 나 from
// the top — the 복구함 line, 내 활동 as four rows, 계정, 자료; the toasts' colors through tokens; '내 진행 n/m · 반복 k'.
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const C = '../../../components/flow/integrated-poc/';
const space = read(C + 'ProgramSpace.tsx'), alpha = read(C + 'AlphaWorkspace.tsx'), community = read(C + 'ProgramCommunity.tsx');
const spaceCss = read(C + 'ProgramSpace.module.css'), alphaCss = read(C + 'AlphaWorkspace.module.css');

test('미루기 chips: 내일, 이번 주말, 다음 주 (its Monday), each with its date; the task\'s own day and today are off', () => {
  const view = (today: string, current: string | null) => programDeferChips(today, current).map(chip => `${chip.label} ${chip.date}${chip.off ? ' off' : ''}`);
  // Wednesday 11/11.
  assert.deepEqual(view('2026-11-11', '2026-11-11'), ['내일 2026-11-12', '이번 주말 2026-11-14', '다음 주 2026-11-16']);
  assert.deepEqual(view('2026-11-11', '2026-11-12'), ['내일 2026-11-12 off', '이번 주말 2026-11-14', '다음 주 2026-11-16']);
  // Sunday 11/8: this weekend is today (off); next week starts tomorrow, the day 내일 already says (P3b: off).
  assert.deepEqual(view('2026-11-08', '2026-11-08'), ['내일 2026-11-09', '이번 주말 2026-11-08 off', '다음 주 2026-11-09 off']);
  // Friday 11/13: this weekend is tomorrow, 내일's day (off).
  assert.deepEqual(view('2026-11-13', '2026-11-13'), ['내일 2026-11-14', '이번 주말 2026-11-14 off', '다음 주 2026-11-16']);
  // A late task (11/6) or one without a date moves as well.
  assert.deepEqual(view('2026-11-11', '2026-11-06').filter(chip => chip.endsWith('off')), []);
  assert.deepEqual(view('2026-11-11', null).filter(chip => chip.endsWith('off')), []);
});

test('the chips sit at the top of the row\'s ⋯ for a row 고르기 could pick, and move it by C6b\'s one save', () => {
  assert(space.includes("const deferRow = detailTask && period !== 'documents' ? executionRows.find(row => row.kind === 'text-task' && row.task.id === detailTask.id) : undefined;"));
  assert(space.includes("const deferChips = deferRow?.kind === 'text-task' && !programSelectBlock(space, deferRow,"));
  const dialog = space.slice(space.indexOf('{detail?.kind === \'task\' && detailTask && <>'), space.indexOf('<div className={styles.detailOrigin}>'));
  assert(dialog.includes('role="group" aria-label="미루기" data-defer-chips') && dialog.includes('onClick={() => void deferTask(deferRow.task, chip.date)}>{chip.label}</button>'));
  assert(dialog.includes('>날짜 고르기</button>') && dialog.includes('min={programShiftDate(today, 1)}'));
  const defer = space.slice(space.indexOf('  async function deferTask('), space.indexOf('  /** C6b 2-6: 되돌리기'));
  assert(defer.includes("expected: { date: task.date, time: task.time ?? '', state: programTaskDateState(space, task.id) ?? undefined }, date: target };"));
  assert(defer.includes("countedMutate('미루기', current => { const next = moveProgramTaskDates(current, { actorId, requestId, moves: [move] });"));
  assert(defer.includes('{ history: true, awaitAutomaticRead: true,') && defer.includes('setDatesNotice({ actorId, count: 1, date: target, undo,'));
  assert(defer.indexOf('close();') < defer.indexOf('await countedMutate'), 'the ⋯ closes; the notice under the list says it');
  assert(spaceCss.includes('.space .deferChips > button { min-height: 44px; padding: 0 16px;'));
});

test('나: the 복구함 line on top (the badge\'s count, none at 0), then 내 활동 in four rows, 계정, 자료', () => {
  assert(alpha.includes('const meRecoveryLine = savedTotal > 0 && <button type="button" className={styles.meRecovery} data-me-recovery'));
  assert(alpha.includes('const meHead = meRecoveryLine ? <div className={styles.meHead}>{meRecoveryLine}</div> : null;'));
  const me = alpha.slice(alpha.indexOf('const meSections ='), alpha.indexOf('const serverStatusView'));
  assert(me.indexOf('aria-label="계정"') < me.indexOf('aria-label="자료"') && me.includes('{!savedTotal && recoveryButton}') && me.includes('onClick={openCreatorEntry}>Flow 만들기</button>'));
  // F6-B2: each row starts with its icon (내 공개 Flow · 받은 후기·반응 · 보낸 제안 · 내가 쓴 글).
  const groups = ['data-activity-group="flows"><summary><ProgramIcon name="flow" size={20} />내 공개 Flow', 'data-activity-group="received"><summary><ProgramIcon name="link" size={20} />받은 후기·반응', 'data-activity-group="sent"><summary><ProgramIcon name="mail" size={20} />보낸 제안', 'data-activity-group="posts"><summary><ProgramIcon name="write" size={20} />내가 쓴 글'].map(at => community.indexOf(at));
  assert(groups.every(at => at > 0) && groups.every((at, index) => !index || at > groups[index - 1]), String(groups));
  assert(community.includes('received: flowReviews.posts.length + activity.receivedReplies.length + activity.incomingProposals.length'));
  assert(alphaCss.includes('.page .meList > :is(button, a) { display: flex;') && alphaCss.includes('min-height: 52px;'));
});

test('내 진행 names the repeat lines after the count, so it adds up to the head\'s 할 일 n개', () => {
  const base = { tasks: 0, done: 0, repeats: 0, started: 0, week: 0, finished: false };
  assert.equal(programFlowProgressShort({ ...base, tasks: 6, repeats: 1 }), '내 진행 0/6 · 반복 1');
  assert.equal(programFlowProgressShort({ ...base, tasks: 6, done: 6 }), '내 진행 6/6');
});
