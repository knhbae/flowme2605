import assert from 'node:assert/strict';
import test from 'node:test';
import { PROGRAM_SCHEMA, type ProgramPrivateSpace, type ProgramTransition } from './contract';
import { createProgramPrivateSpace } from './program-data';
import { createProgramDocument } from './private-space';
import { textWorkspaceModel as M } from './text-workspace';
import { ALPHA_SCHEMA, type AlphaAccount } from './alpha-persistence/contract';
import { materializeAccount } from './alpha-persistence/program-adapter';
import { emptyAlphaReferences } from './alpha-social/projection';
import { settleProgramRepeatLines } from './repeat-commands';
import { extendProgramRecent, programRecentHidden, programRecentHold, restrictProgramRecent } from './recent-writing';

// 총괄 p3 (11/6): the editor writes a repeat line's first round ("- 날짜:") only on the lines it has, so in the recent
// view a repeat line in a folded old day got none until the whole document was opened. A day holding such a line now
// stays in view (as a day another line refers to does), and the round lands as in the whole document.
const owner = '88888888-8888-4888-8888-888888888888', today = '2026-11-05';
let request = 0;
const ok = <T,>(result: ProgramTransition<T>) => { assert(result.ok, result.ok ? '' : result.reason); return result; };
function write(raw: string): { space: ProgramPrivateSpace; docId: string } {
  const account: AlphaAccount = { schema: ALPHA_SCHEMA, ownerId: owner, revision: 0, source: { schema: PROGRAM_SCHEMA, actorId: owner, revision: 0 },
    space: createProgramPrivateSpace(), legacyUndo: [], legacyReceipts: [] };
  const initial = materializeAccount(account, emptyAlphaReferences(owner)).data;
  const made = ok(createProgramDocument(initial, { actorId: owner, requestId: `repeat-${++request}`, expectedSpace: initial.spaces[owner], title: '할 일', raw }));
  return { space: made.data.spaces[owner], docId: made.result };
}
const old = (date: string, extra: string[] = []) => [`[${date}]`, ...extra, ...Array.from({ length: 55 }, (_, index) => `- [x] ${date} 일 ${index}`),
  ...Array.from({ length: 50 }, (_, index) => `메모 ${date} ${index}`)];
const recent = ['[2026-11-04]', '- [ ] 어제 할 일', '[2026-11-05]', '- [ ] 오늘 할 일'];
/** What ProgramSpace keeps in view: the lines the whole document's settle would give a first round now. */
const keepOf = (space: ProgramPrivateSpace, docId: string) => new Set(settleProgramRepeatLines(space, docId, today, null).settled.map(entry => entry.taskId));
const lineOf = (space: ProgramPrivateSpace, docId: string, text: string) => M.getDocument(space.text, docId)!.lines.find(line => line.text === text)!.id;
/** The editor's settle (all lines it has, the caret gone) on the recent part, and the whole a save of it makes. */
function settleInRecent(space: ProgramPrivateSpace, docId: string, hold: NonNullable<ReturnType<typeof programRecentHold>>) {
  const hidden = programRecentHidden(space.text, hold), shown = restrictProgramRecent(space.text, docId, hidden);
  const settled = settleProgramRepeatLines({ ...space, text: shown }, docId, today, null);
  const whole = extendProgramRecent(space.text, settled.text, docId, hidden);
  assert(whole.ok, whole.ok ? '' : whole.reason);
  return { hidden, settled, whole: M.raw(M.getDocument(whole.state, docId)) };
}

test('p3: an old day holding a repeat line still to get its first round stays in view; the other old days fold', () => {
  const { space, docId } = write([...old('2026-10-01', ['- [ ] 물 마시기 @매일']), ...old('2026-10-02'), ...recent].join('\n'));
  const water = lineOf(space, docId, '- [ ] 물 마시기 @매일'), first = lineOf(space, docId, '[2026-10-01]'), second = lineOf(space, docId, '[2026-10-02]');
  assert.deepEqual([...keepOf(space, docId)], [water]);
  // Before: the day folded with its repeat line.
  const before = programRecentHold(space.text, docId, today)!;
  assert(before.lineIds.has(water) && before.lineIds.has(first));
  const hold = programRecentHold(space.text, docId, today, { keep: keepOf(space, docId) })!;
  const hidden = programRecentHidden(space.text, hold);
  assert(!hidden.has(water) && !hidden.has(first));
  assert(hidden.has(second) && hidden.size === 106);
});

test('p3: the recent view gives a folded day\'s repeat line the same first round, in the same place, as the whole document', () => {
  const { space, docId } = write([...old('2026-10-01', ['- [ ] 물 마시기 @매일', '- [ ] 보고 @매주 월']), ...old('2026-10-02'), ...recent].join('\n'));
  const expected = M.raw(M.getDocument(settleProgramRepeatLines(space, docId, today, null).text, docId));
  assert(expected.includes('- [ ] 물 마시기 @매일\n  - 날짜: 2026-10-01\n- [ ] 보고 @매주 월\n  - 날짜: 2026-10-01\n'));
  // Before p3 the day folded and the recent view's settle had nothing to write.
  const folded = settleInRecent(space, docId, programRecentHold(space.text, docId, today)!);
  assert.equal(folded.settled.settled.length, 0);
  assert.notEqual(folded.whole, expected);
  // Now: the same text as the whole document's settle, and the folded lines read as they were.
  const kept = settleInRecent(space, docId, programRecentHold(space.text, docId, today, { keep: keepOf(space, docId) })!);
  assert.equal(kept.settled.settled.length, 2);
  assert.equal(kept.whole, expected);
  const folds = (raw: string) => raw.split('\n').filter(line => line.includes('2026-10-02'));
  assert.deepEqual(folds(kept.whole), folds(M.raw(M.getDocument(space.text, docId))));
  // Settled, the line has its round and its day folds again the next time the document opens.
  const after = write(kept.whole);
  assert.equal(keepOf(after.space, after.docId).size, 0);
  assert(programRecentHold(after.space.text, after.docId, today, { keep: keepOf(after.space, after.docId) })!.lineIds.has(lineOf(after.space, after.docId, '- [ ] 물 마시기 @매일')));
});

test('p3: a repeat line with its round already, done, or blocked does not keep its day in view', () => {
  const { space, docId } = write([...old('2026-10-01', ['- [ ] 물 마시기 @매일', '  - 날짜: 2026-11-05', '- [x] 끝낸 반복 @매일', '- [ ] 묶음 @매일', '  - [ ] 하위']),
    ...old('2026-10-02'), ...recent].join('\n'));
  assert.equal(keepOf(space, docId).size, 0);
  assert(programRecentHold(space.text, docId, today, { keep: keepOf(space, docId) })!.lineIds.has(lineOf(space, docId, '[2026-10-01]')));
});

test('p3: a kept line under a finished task of [미정] keeps that task in view; today\'s first task stays in the recent part', () => {
  const undated = ['[미정]', '- [x] 끝낸 일', '  - [ ] 그 아래 줄', '- [x] 끝낸 다른 일'];
  const { space, docId } = write([...undated, ...old('2026-10-01'), ...old('2026-10-02'), ...recent].join('\n'));
  const done = lineOf(space, docId, '- [x] 끝낸 일'), other = lineOf(space, docId, '- [x] 끝낸 다른 일');
  const hold = programRecentHold(space.text, docId, today, { keep: new Set([lineOf(space, docId, '  - [ ] 그 아래 줄')]) })!;
  assert(!hold.done.has(done) && hold.done.has(other) && !hold.undated);
  const shown = M.raw(M.getDocument(restrictProgramRecent(space.text, docId, programRecentHidden(space.text, hold)), docId));
  assert(shown.includes('- [x] 끝낸 일\n  - [ ] 그 아래 줄') && shown.includes('[2026-11-05]\n- [ ] 오늘 할 일'));
  assert(!shown.includes('끝낸 다른 일'));
});
