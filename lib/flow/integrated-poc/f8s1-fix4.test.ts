import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { PROGRAM_SCHEMA, type ProgramData, type ProgramTransition } from './contract';
import { createProgramPrivateSpace } from './program-data';
import { createProgramDocument } from './private-space';
import { textWorkspaceModel as M } from './text-workspace';
import { ALPHA_SCHEMA, type AlphaAccount } from './alpha-persistence/contract';
import { materializeAccount } from './alpha-persistence/program-adapter';
import { emptyAlphaReferences } from './alpha-social/projection';
import { programOrderedExecutionRows, type ProgramOrderedExecutionRow } from './recurrence-order';
import { carryProgramTasksToToday, planProgramCarryover, programCarryoverBefore, programCarryoverProof, restoreProgramCarryover,
  programCarryoverItems, programCarryoverSummary, programCarryoverGroupScope } from './carryover';
import { programSameTaskGroups } from './continue-band';

const owner = '55555555-5555-4555-8555-555555555555', today = '2026-11-10'; let serial = 0;
const base = (data: ProgramData) => ({ actorId: owner, requestId: `fix4-${++serial}`, expectedSpace: data.spaces[owner] });
const ok = <T,>(result: ProgramTransition<T>) => { assert(result.ok, result.ok ? '' : result.reason); return result; };
function written(raw: string) {
  const account: AlphaAccount = { schema: ALPHA_SCHEMA, ownerId: owner, revision: 0, source: { schema: PROGRAM_SCHEMA, actorId: owner, revision: 0 },
    space: createProgramPrivateSpace(), legacyUndo: [], legacyReceipts: [] };
  const data = materializeAccount(account, emptyAlphaReferences(owner)).data;
  const made = ok(createProgramDocument(data, { ...base(data), title: '합성 FIX4', raw }));
  return { data: made.data, documentId: made.result };
}
const rows = (data: ProgramData) => programOrderedExecutionRows(data, { period: 'today', date: today, today, folderId: '', query: '', includeHeld: false, includeExcluded: false, page: 0 }).rows;
const rawOf = (data: ProgramData, id: string) => M.raw(M.getDocument(data.spaces[owner].text, id));
const hash = (s: string) => createHash('sha256').update(Buffer.from(s, 'utf8')).digest('hex');

test('FIX4 punctuation key: one move keeps original title bytes, one undo restores RAW and all three fields', () => {
  const raw = '[2026-11-07]\n- [ ] 합성 서류.\n\n[2026-11-08]\n- [ ] 합성 서류!!';
  const { data, documentId } = written(raw), space = data.spaces[owner], before = programCarryoverBefore(space), plan = planProgramCarryover(space, today);
  assert.equal(rawOf(data, documentId), raw);
  assert.deepEqual([plan.kinds, plan.count, plan.toToday, plan.removed], [1, 2, 1, 1]);
  assert.equal(programCarryoverItems(space, today)[0].title, '합성 서류.', 'display spelling is not a normalization key');
  const summary = programCarryoverSummary(space, today, rows(data));
  assert.deepEqual(summary, { kinds: 1, repeats: 0, count: 1, lines: 2 });
  const groups = programSameTaskGroups(M.tasks(space.text).map(task => ({ task, group: 'past-incomplete' })), programCarryoverGroupScope(space));
  assert.equal(groups.hidden.size, 1);
  const moved = ok(carryProgramTasksToToday(data, { ...base(data), today, lines: plan.lines })).data;
  const after = rawOf(moved, documentId), remaining = M.tasks(moved.spaces[owner].text);
  assert.notEqual(hash(after), hash(raw)); assert.equal(remaining.length, 1); assert.equal(remaining[0].date, today);
  assert(['합성 서류.', '합성 서류!!'].includes(remaining[0].title), 'no normalized title written');
  const undo = ok(restoreProgramCarryover(moved, { ...base(moved), before, after: programCarryoverProof(moved.spaces[owner]) })).data;
  assert.deepEqual(Buffer.from(rawOf(undo, documentId), 'utf8'), Buffer.from(raw, 'utf8'));
  assert.deepEqual(programCarryoverBefore(undo.spaces[owner]), before);
});

test('FIX4 empty title keys and still-text classifications never collapse distinct source lines', () => {
  const { data } = written('[2026-11-07]\n- [ ] ...\n- [ ] !!!\n- /합성 분류 가\n  - [ ] 합성 분류 일.\n- /합성 분류 나\n  - [ ] 합성 분류 일');
  const space = data.spaces[owner], plan = planProgramCarryover(space, today);
  assert.deepEqual([plan.kinds, plan.toToday, plan.removed], [4, 4, 0]);
  assert.equal(programCarryoverSummary(space, today, rows(data)).count, 4);
  const groups = programSameTaskGroups(M.tasks(space.text).map(task => ({ task, group: 'past-incomplete' })), programCarryoverGroupScope(space));
  assert.equal(groups.hidden.size, 0);
});

test('FIX4 different memos and a progress box stay after the same-key move; no source payload is discarded', () => {
  const { data, documentId } = written('[2026-11-07]\n- [ ] 합성 보존.\n  - 메모: 합성 오전\n\n[2026-11-08]\n- [ ] 합성 보존\n  - 메모: 합성 오후\n- [40%] 합성 진행');
  const plan = planProgramCarryover(data.spaces[owner], today);
  assert.equal(plan.removed, 0);
  const moved = ok(carryProgramTasksToToday(data, { ...base(data), today, lines: plan.lines })).data;
  const raw = rawOf(moved, documentId);
  for (const text of ['합성 보존.', '합성 보존', '합성 오전', '합성 오후', '- [40%] 합성 진행']) assert(raw.includes(text));
  assert.equal(M.tasks(moved.spaces[owner].text).length, 3);
});

test('FIX4 repeat-only occurrences are each counted by row key and completed rounds stay out', () => {
  const { data } = written('[2026-11-10]\n합성 빈 글');
  const occurrence = (key: string, completion = 'open') => ({ kind: 'occurrence', key, date: '2026-11-08', row: { completion } }) as ProgramOrderedExecutionRow;
  assert.deepEqual(programCarryoverSummary(data.spaces[owner], today, [occurrence('round-a'), occurrence('round-b'), occurrence('round-a'), occurrence('done', 'completed')]),
    { kinds: 0, repeats: 2, count: 2, lines: 2 });
});

test('FIX4 completed and current100 progress rows stay out of the late display summary', () => {
  const { data } = written('[2026-11-07]\n- [x] 합성 완료\n- [100%] 합성 진행 완료\n- [40%] 합성 진행 중');
  assert.deepEqual(programCarryoverSummary(data.spaces[owner], today, rows(data)), { kinds: 1, repeats: 0, count: 1, lines: 1 });
  const before = programCarryoverBefore(data.spaces[owner]), plan = planProgramCarryover(data.spaces[owner], today);
  const moved = ok(carryProgramTasksToToday(data, { ...base(data), today, lines: plan.lines })).data;
  const doneBefore = M.tasks(before.text).find(task => task.title === '합성 진행 완료')!;
  assert.deepEqual(M.tasks(moved.spaces[owner].text).find(task => task.id === doneBefore.id), doneBefore);
});

test('FIX4 the late-only band is one today-navigation button, and its late text is one inline flex child', () => {
  const band = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramFlowTodayBand.tsx', import.meta.url), 'utf8');
  const lateOnly = band.slice(band.indexOf('if (!props.rows.length) return'), band.indexOf('const shown ='));
  assert(lateOnly.includes('data-late-only') && lateOnly.includes('onClick={props.onShowToday}'));
  assert(!lateOnly.includes('aria-expanded') && !lateOnly.includes('remember(') && !lateOnly.includes('props.open'));
  assert(band.includes("<span><span className={styles.late}>밀린 일 {props.late}가지</span>{' · 오늘 탭에서 정리'}</span>"));
  const host = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramSpace.tsx', import.meta.url), 'utf8');
  // 오늘 탭 ② (W-CARRY-12): the 오늘 card's own line is '밀린 일 n개' (task lines of the days before the last written day).
  assert(host.includes('late={carrySummary.count}') && host.includes('밀린 일 {morning.older > 0 ? morning.older : carrySummary.lines}개'));
  assert(!host.includes("bandDocumentId ? planProgramCarryover"), 'typing does not create a write plan');
});
