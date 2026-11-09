import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { programDatesNoticeAfterView, programMovedDayTarget, type ProgramDatesNoticeKeep } from './dates-notice-keep';

// P3d (QA P2, 11/9): [그날 보기] keeps the move's notice (its 되돌리기) until the view-change effect has seen the view it
// goes to — however late that effect runs (a slow phone) — and only through that change.
const undo = ['move'] as const;
type Undo = typeof undo;
/** The effect, run once per render with the view of that render; the notice and the keep as they end. */
function run(kept: ProgramDatesNoticeKeep<Undo> | null, renders: { period: 'today' | 'week' | 'month' | 'undated'; date: string }[]) {
  let notice: Undo | null = undo, keep: ProgramDatesNoticeKeep<Undo> | null = kept;
  for (const view of renders) {
    const now: ProgramDatesNoticeKeep<Undo> | null = keep, step: { keep: boolean; release: boolean } = programDatesNoticeAfterView(now, notice, view);
    notice = notice && step.keep ? notice : null;
    if (programDatesNoticeAfterView(now, now?.undo, view).release) keep = null;
  }
  return { notice, keep };
}

test('where 그날 보기 goes: the week at that day (a week or month stays), 날짜 없음; already there, nowhere', () => {
  assert.deepEqual(programMovedDayTarget({ period: 'today', date: '2026-11-09' }, '2026-11-16'), { period: 'week', date: '2026-11-16' });
  assert.deepEqual(programMovedDayTarget({ period: 'month', date: '2026-11-09' }, '2026-11-16'), { period: 'month', date: '2026-11-16' });
  assert.deepEqual(programMovedDayTarget({ period: 'today', date: '2026-11-09' }, null), { period: 'undated', date: null });
  assert.equal(programMovedDayTarget({ period: 'week', date: '2026-11-16' }, '2026-11-16'), null);
  assert.equal(programMovedDayTarget({ period: 'undated', date: '2026-11-09' }, null), null);
});

test('오늘 → 주간 → that day in two renders: the notice stays through both, the keep ends at the target', () => {
  const kept = { undo, period: 'week' as const, date: '2026-11-16' };
  const after = run(kept, [{ period: 'week', date: '2026-11-09' }, { period: 'week', date: '2026-11-16' }]);
  assert.equal(after.notice, undo);
  assert.equal(after.keep, null);
  // However late the effect runs, the order is what counts: one render with both changes keeps it as well.
  assert.deepEqual(run(kept, [{ period: 'week', date: '2026-11-16' }]), { notice: undo, keep: null });
  // 날짜 없음.
  assert.deepEqual(run({ undo, period: 'undated', date: null }, [{ period: 'undated', date: '2026-11-09' }]), { notice: undo, keep: null });
});

test('any other view change drops it: after the target (the keep is done), or with no keep at all', () => {
  const kept = { undo, period: 'week' as const, date: '2026-11-16' };
  assert.equal(run(kept, [{ period: 'week', date: '2026-11-16' }, { period: 'today', date: '2026-11-09' }]).notice, null);
  assert.equal(run(null, [{ period: 'week', date: '2026-11-16' }]).notice, null);
  // A different notice (another move's undo list) is not the kept one.
  assert.equal(programDatesNoticeAfterView(kept, ['other'] as unknown as Undo, { period: 'week', date: '2026-11-16' }).keep, false);
});

const space = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramSpace.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
test('the space keeps it by the effect, not by frames; a refused change releases it at once', () => {
  assert(space.includes('setDatesNotice(current => current && programDatesNoticeAfterView(kept, current.undo, { period, date }).keep ? current : null);'));
  assert(space.includes('if (programDatesNoticeAfterView(kept, kept?.undo, { period, date }).release) datesNoticeKept.current = null;'));
  const show = space.slice(space.indexOf('  async function showMovedDay('), space.indexOf("  /** A day heading's [모두]/[풀기]"));
  assert(!show.includes('requestAnimationFrame'));
  assert(show.includes('const undo = datesNotice?.undo, view = programMovedDayTarget({ period, date }, target);'));
  assert(show.includes('if (period !== view.period && !await changePeriod(view.period)) { release(); return; }'));
});
