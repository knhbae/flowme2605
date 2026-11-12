import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { programClone, type ProgramData, type ProgramTransition } from './contract';
import { createProgramData, validateProgramData } from './program-data';
import { addProgramQuickTask, createProgramDocument, importProgramPublicVersion, updateProgramTask } from './private-space';
import { textWorkspaceModel as M } from './text-workspace';
import { isAlphaTaskDateMoves } from './alpha-social/contract';
import { executeAlphaSocialIntent } from './alpha-social/dispatch';
import { detached } from './alpha-persistence/json';
import { moveProgramTaskDates, programTaskDateState, programTaskDateUndo, type ProgramTaskDateMove } from './task-date-move';

// C6b review (FIX): every pick is checked, also one already on the target date (P2-1 in the space, P2-2 in the
// command); 되돌리기 is made from the state the move really applied to (P2-3), and expects each task exactly as the
// move left it, the copy's override included (P2-4).
let request = 0;
const actor = (data: ProgramData) => data.activeActorId;
const space = (data: ProgramData) => data.spaces[actor(data)];
const base = (data: ProgramData) => ({ actorId: actor(data), requestId: `c6bfix-${++request}`, expectedSpace: space(data) });
const ok = <T,>(result: ProgramTransition<T>) => { assert(result.ok, result.ok ? '' : result.reason); return result; };
const task = (data: ProgramData, id: string) => M.tasks(space(data).text).find(row => row.id === id)!;
const pick = (data: ProgramData, taskId: string, date: string | null): ProgramTaskDateMove => {
  const row = task(data, taskId); return { taskId, expected: { date: row.date, time: row.time ?? '', state: programTaskDateState(space(data), taskId)! }, date };
};
function account() {
  let data = createProgramData();
  data.public.flows.push({ id: 'flow-a', ownerId: 'creator-minji', currentVersionId: 'version-a', category: '생활', situations: [], derivedFrom: null, archived: false });
  data.public.versions.push({ id: 'version-a', flowId: 'flow-a', number: 1, parentVersionId: null, title: '공개 흐름', summary: '',
    source: { kind: 'simulated-example', label: '예시', url: null, checkedAt: null }, createdBy: 'creator-minji', createdAt: '2026-10-01T00:00:00.000Z',
    items: [{ id: 'item-a', title: '사본 할 일', description: '', completionCriteria: '', sourceUrl: null, schedule: { kind: 'fixed', date: '2026-10-30' }, subchecks: [] }] });
  const ids: Record<string, string> = {};
  for (const [doc, title, date] of [['첫 글', 'A', '2026-10-29'], ['둘째 글', 'B', '2026-10-30']] as const) {
    const created = ok(createProgramDocument(data, { ...base(data), title: doc })); data = created.data;
    const added = ok(addProgramQuickTask(data, { ...base(data), documentId: created.result, title, date })); data = added.data; ids[title] = added.result;
  }
  data = ok(importProgramPublicVersion(data, { ...base(data), versionId: 'version-a', itemIds: ['item-a'], anchor: '2026-10-29' })).data;
  ids.copy = space(data).copies[0].itemLines['item-a'];
  assert(validateProgramData(data));
  return { data, ids };
}

test('P2-1: a pick already on the target date still carries its expectation; B changed since makes the whole list move nothing', () => {
  const { data, ids } = account();
  // Picked: A (10/29) and B (10/30); B then moves to 11/5 elsewhere; the list goes to 10/30.
  const moves = [pick(data, ids.A, '2026-10-30'), pick(data, ids.B, '2026-10-30')];
  const changed = ok(updateProgramTask(data, { ...base(data), taskId: ids.B, patch: { date: '2026-11-05' } })).data;
  const result = moveProgramTaskDates(changed, { actorId: actor(data), requestId: 'c6bfix-p1', moves });
  assert(!result.ok); assert.equal(result.reason, 'conflict'); assert.equal(task(changed, ids.A).date, '2026-10-29');
  // And the space sends every pick, not only the ones that move.
  const source = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramSpace.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert.match(source, /const moves: ProgramTaskDateMove\[\] = picks\.flatMap\(pick => pick \? \[\{ taskId: pick\.taskId, expected: \{ date: pick\.date, time: pick\.time, state: pick\.state \}, date: target \}\] : \[\]\);/);
});

test('P2-2: a locked task already on the target date refuses the whole list, in the command and on the server', () => {
  const { data, ids } = account();
  const locked = programClone(data); space(locked).archivedDocumentIds = [space(data).text.documents[1].id];
  const moves = [pick(locked, ids.A, '2026-10-30'), pick(locked, ids.B, '2026-10-30')];
  const result = moveProgramTaskDates(locked, { actorId: actor(data), requestId: 'c6bfix-p2', moves });
  assert(!result.ok); assert.equal(result.reason, 'unresolved');
  const served = executeAlphaSocialIntent(locked, actor(data), { type: 'private-task-dates', moves }, 'c6bfix-p2-server');
  assert(!served.ok); assert.equal(task(locked, ids.A).date, '2026-10-29');
});

test('P2-3: 되돌리기 comes from the state the move applied to, so an override made just before stays after it', () => {
  const { data, ids } = account();
  const shown = data;
  // Before the move really applies (an automatic read brought it), the copy's task got its own date override.
  const applied = ok(updateProgramTask(data, { ...base(data), taskId: ids.copy, patch: { date: '2026-10-31' } })).data;
  assert.deepEqual(space(applied).copies[0].itemOverrides['item-a'], { date: '2026-10-31' });
  assert.equal(space(shown).copies[0].itemOverrides['item-a'], undefined);
  const moves = [pick(applied, ids.copy, '2026-11-02')];
  const moved = ok(moveProgramTaskDates(applied, { actorId: actor(data), requestId: 'c6bfix-p3', moves }));
  const undo = programTaskDateUndo(space(applied), space(moved.data), moves);
  assert.equal(undo[0].clearOverride, undefined, 'it had an override when the move applied');
  const back = ok(moveProgramTaskDates(moved.data, { actorId: actor(data), requestId: 'c6bfix-p3-undo', moves: undo }));
  assert.deepEqual(space(back.data).copies[0].itemOverrides['item-a'], { date: '2026-10-31' });
  assert.equal(task(back.data, ids.copy).date, '2026-10-31');
  // The space makes it inside the save, from the very state the command gets.
  const source = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramSpace.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert.match(source, /current => \{ const next = moveProgramTaskDates\(current, \{ actorId, requestId, moves \}\); if \(next\.ok\) undo = programTaskDateUndo\(current\.spaces\[actorId\], next\.data\.spaces\[actorId\], moves\);/);
});

test('P2-4: 되돌리기 expects each task as the move left it: a title changed since, or the override taken away, refuses it all', () => {
  const { data, ids } = account();
  const moves = [pick(data, ids.A, '2026-11-02'), pick(data, ids.copy, '2026-11-02')];
  const moved = ok(moveProgramTaskDates(data, { actorId: actor(data), requestId: 'c6bfix-p4', moves }));
  const undo = programTaskDateUndo(space(data), space(moved.data), moves);
  assert(undo.every(move => typeof move.expected.state === 'string'));
  // A's title changed since the move.
  const retitled = ok(updateProgramTask(moved.data, { ...base(moved.data), taskId: ids.A, patch: { title: 'A 바뀜' } })).data;
  const first = moveProgramTaskDates(retitled, { actorId: actor(data), requestId: 'c6bfix-p4-a', moves: undo });
  assert(!first.ok); assert.equal(first.reason, 'conflict'); assert.equal(task(retitled, ids.copy).date, '2026-11-02');
  // The copy's override (set by the move) taken away since.
  const bare = programClone(moved.data); delete space(bare).copies[0].itemOverrides['item-a'];
  const second = moveProgramTaskDates(bare, { actorId: actor(data), requestId: 'c6bfix-p4-b', moves: undo });
  assert(!second.ok); assert.equal(second.reason, 'conflict');
  // Unchanged since: it goes back.
  ok(moveProgramTaskDates(moved.data, { actorId: actor(data), requestId: 'c6bfix-p4-c', moves: undo }));
  // The wire takes the state as a short token, nothing else.
  assert(isAlphaTaskDateMoves(undo));
  assert(!isAlphaTaskDateMoves([{ ...undo[0], expected: { ...undo[0].expected, state: 'x'.repeat(65) } }]));
});

test('rereview P2-1: actual detached override key normalization still permits unchanged dispatch undo', () => {
  const original = account();
  const data = ok(updateProgramTask(original.data, { ...base(original.data), taskId: original.ids.copy, patch: { title: '내 제목' } })).data;
  const moves = [pick(data, original.ids.copy, '2026-11-02')];
  const moved = ok(executeAlphaSocialIntent(data, actor(data), { type: 'private-task-dates', moves }, 'rereview-canonical-move'));
  const undo = programTaskDateUndo(space(data), space(moved.data), moves), stored = detached(moved.data);
  assert(validateProgramData(stored));
  const back = executeAlphaSocialIntent(stored, actor(stored), { type: 'private-task-dates', moves: undo }, 'rereview-canonical-undo');
  assert(back.ok, back.ok ? '' : back.reason);
  assert.equal(programTaskDateState(space(moved.data), original.ids.copy), programTaskDateState(space(stored), original.ids.copy));
  assert.deepEqual(space(back.data).copies[0].itemOverrides['item-a'], { title: '내 제목' });
  assert.deepEqual(back.data.public, data.public);
  assert.deepEqual(space(back.data).text.progressRecords, space(data).text.progressRecords);
});

test('rereview P2-2: parser-owned memo beyond a blank is checked for both move and undo dispatch', () => {
  let { data, ids } = account();
  const created = ok(createProgramDocument(data, { ...base(data), title: '빈 줄 메모' })); data = created.data;
  space(data).text = M.editText(space(data).text, created.result, '- [ ] 메모 대상\n\n  - 메모: 처음\n끝');
  const selected = M.tasks(space(data).text).find(row => row.docId === created.result)!;
  assert(selected.note.includes('처음'), 'the real parser owns this memo despite the blank');
  assert(validateProgramData(data));
  const moves = [pick(data, ids.A, '2026-11-02'), pick(data, selected.id, '2026-11-02')];
  const changedMemo = (source: ProgramData) => {
    const changed = programClone(source), doc = M.getDocument(space(changed).text, created.result)!;
    doc.lines.find(line => line.text.includes('- 메모:'))!.text = '  - 메모: 원격 변경';
    assert(validateProgramData(changed)); return changed;
  };
  const remote = changedMemo(data), refusedMove = executeAlphaSocialIntent(remote, actor(remote), { type: 'private-task-dates', moves }, 'rereview-memo-move');
  const moved = ok(executeAlphaSocialIntent(data, actor(data), { type: 'private-task-dates', moves }, 'rereview-memo-setup'));
  const undo = programTaskDateUndo(space(data), space(moved.data), moves), remoteAfter = changedMemo(moved.data);
  const refusedUndo = executeAlphaSocialIntent(remoteAfter, actor(remoteAfter), { type: 'private-task-dates', moves: undo }, 'rereview-memo-undo');
  assert.deepEqual([refusedMove.ok, refusedUndo.ok], [false, false]);
  if (!refusedMove.ok && !refusedUndo.ok) {
    assert.equal(refusedMove.reason, 'conflict'); assert.equal(refusedUndo.reason, 'conflict');
    assert.equal(refusedMove.data, remote); assert.equal(refusedUndo.data, remoteAfter);
  }
  assert.equal(task(remote, ids.A).date, task(data, ids.A).date, 'a later rejection never applies an earlier pick');
});

test('rereview P2-3: ancestor and independent descendant expectations are checked before either order is applied', () => {
  let { data } = account();
  const created = ok(createProgramDocument(data, { ...base(data), title: '상위와 독립 항목' })); data = created.data;
  // Redesign 3: under a date heading (in a document without one a date is the task's 마감, W-TXT-03).
  space(data).text = M.editText(space(data).text, created.result, '[2026-10-29]\n- [ ] 상위 A\n- [ ] 독립 C');
  const doc = M.getDocument(space(data).text, created.result)!, [, a, c] = doc.lines.map(line => line.id);
  doc.lines[2].text = '  - [ ] 독립 C';
  assert(validateProgramData(data)); assert(task(data, a)); assert(task(data, c));
  assert.equal(M.rowMeta(space(data).text, created.result).find(row => row.id === c)?.isCanonical, true);
  const moveA = pick(data, a, '2026-11-02'), moveC = pick(data, c, '2026-11-03');
  const forward = executeAlphaSocialIntent(data, actor(data), { type: 'private-task-dates', moves: [moveA, moveC] }, 'rereview-order-ac');
  const reverse = executeAlphaSocialIntent(data, actor(data), { type: 'private-task-dates', moves: [moveC, moveA] }, 'rereview-order-ca');
  assert.deepEqual([forward.ok, reverse.ok], [true, true]);
  if (!forward.ok || !reverse.ok) return;
  for (const moved of [forward, reverse]) {
    assert(validateProgramData(moved.data)); assert.equal(task(moved.data, a).date, moveA.date); assert.equal(task(moved.data, c).date, moveC.date);
    assert.deepEqual(M.getDocument(space(moved.data).text, created.result)!.lines.filter(line => [a, c].includes(line.id)).map(line => line.id), [a, c]);
    assert.deepEqual(space(moved.data).text.progressRecords, space(data).text.progressRecords); assert.deepEqual(moved.data.public, data.public);
  }
  assert.equal(M.raw(M.getDocument(space(forward.data).text, created.result)), M.raw(M.getDocument(space(reverse.data).text, created.result)));
  const changed = ok(updateProgramTask(data, { ...base(data), taskId: c, patch: { title: '원격에서 바뀐 C' } })).data;
  for (const moves of [[moveA, moveC], [moveC, moveA]]) {
    const rejected = executeAlphaSocialIntent(changed, actor(changed), { type: 'private-task-dates', moves }, `rereview-stale-${++request}`);
    assert(!rejected.ok); assert.equal(rejected.reason, 'conflict'); assert.equal(rejected.data, changed);
  }
});
