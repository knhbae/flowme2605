import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { PROGRAM_SCHEMA, type ProgramData, type ProgramTransition } from './contract';
import { createProgramEnvelope, createProgramPrivateSpace, validateProgramData } from './program-data';
import { createProgramDocument } from './private-space';
import { textWorkspaceModel as M } from './text-workspace';
import { completeProgramRepeat, programRepeatState, readProgramRepeatCheck, settleProgramRepeatLines, undoProgramRepeat, type ProgramRepeatCheck } from './repeat-commands';
import { addProgramRepeatDay, programRepeatDayCount, programRepeatDays } from './repeat-log';
import { PROGRAM_REPEAT_LOG_DAYS } from './repeat-log-shape';
import { ALPHA_SCHEMA, type AlphaAccount } from './alpha-persistence/contract';
import { captureAlphaAccount, materializeAccount } from './alpha-persistence/program-adapter';
import { createAlphaFakeServer } from './alpha-persistence/fake-server';
import { createAlphaSyncController } from './alpha-sync/controller';
import { emptyAlphaReferences } from './alpha-social/projection';

// N10 independent QA (NO_GO, 11/4): F1 a duplicate check that changed nothing was handed a 되돌리기 that took back
// another tab's round; F2 two devices' different days were not kept after a revision conflict; F3 a folder view never
// gave a repeat line its first date; F4 the check's result grew with every kept day until a receipt refused it; F5 the
// old repeat card's press was refused without reaching the server; P3 a slow check's notice outlived its view.
const owner = '22222222-2222-4222-8222-222222222222';
let request = 0;
const ok = <T,>(result: ProgramTransition<T>) => { assert(result.ok, result.ok ? '' : result.reason); return result; };
const base = (data: ProgramData) => ({ actorId: owner, requestId: `n10qa-${++request}`, expectedSpace: data.spaces[owner] });
const space = (data: ProgramData) => data.spaces[owner];
function fixture(raw = '- [ ] 운동 @매주 월 목\n  - 날짜: 2026-11-09') {
  const account: AlphaAccount = { schema: ALPHA_SCHEMA, ownerId: owner, revision: 0, source: { schema: PROGRAM_SCHEMA, actorId: owner, revision: 0 },
    space: createProgramPrivateSpace(), legacyUndo: [], legacyReceipts: [] };
  const initial = materializeAccount(account, emptyAlphaReferences(owner)).data;
  const created = ok(createProgramDocument(initial, { ...base(initial), title: '반복', raw }));
  const tasks = M.tasks(space(created.data).text);
  return { data: created.data, docId: created.result, taskId: tasks[0].id, tasks };
}
const complete = (data: ProgramData, taskId: string, today: string, expected: string | null) => completeProgramRepeat(data, { ...base(data), taskId, today, expected });
const dateOf = (data: ProgramData, taskId: string) => M.tasks(space(data).text).find(task => task.id === taskId)!.date;

/** Two devices of one owner on one server (the real sync controller and the in-memory repository). */
function devices(data: ProgramData) {
  const server = createAlphaFakeServer([captureAlphaAccount(createProgramEnvelope(data), owner, owner)]);
  let wire = 0;
  const device = () => {
    let saved: unknown = null;
    const controller = createAlphaSyncController({ recovery: { load: () => ({ ok: true, value: saved }), save: (value: unknown) => { saved = structuredClone(value); return true; } } as never,
      requestId: () => `wire-${++wire}` });
    controller.bindSession(owner, server.connect(server.issueSession(owner)));
    return controller;
  };
  return { a: device(), b: device() };
}
type Device = ReturnType<typeof devices>['a'];
const shown = (device: Device) => device.snapshot().envelope!.data;
const check = (device: Device, taskId: string, today: string, expected: string | null, rebuild = true) => device.mutate('반복 회차 완료',
  current => complete(current, taskId, today, expected), { history: true, awaitAutomaticRead: true, ...(rebuild ? { rebuildOnConflict: true } : {}) });

test('F1: a check that found its round already done changes nothing and may not undo the other tab\'s round', async () => {
  const { data, taskId } = fixture();
  const { a, b } = devices(data);
  await a.refresh(); await b.refresh();
  assert(readProgramRepeatCheck((await check(a, taskId, '2026-11-09', '2026-11-09') as { result: string }).result)!.applied);
  // B reads the saved account (an automatic read) but its press still names the round its screen showed.
  await b.refresh();
  const duplicate = await check(b, taskId, '2026-11-09', '2026-11-09');
  assert(duplicate.ok && duplicate.changed === false);
  const token = readProgramRepeatCheck(duplicate.result)!;
  assert.equal(token.applied, false, 'no 되돌리기 for a request that changed nothing');
  const undo = await b.mutate('반복 되돌리기', current => undoProgramRepeat(current, { ...base(current), check: token }));
  assert(!undo.ok);
  assert.equal(dateOf(shown(b), taskId), '2026-11-12', 'A\'s round stays finished');
  assert.deepEqual(programRepeatDays(space(shown(b)), taskId), ['2026-11-09']);
});

test('F1: a newer round checked on a day already kept still undoes, keeping that day; a later change refuses it', () => {
  const { data, taskId } = fixture();
  const first = ok(complete(data, taskId, '2026-11-09', '2026-11-09'));
  // Thursday's round finished early, again on Monday: the date moves, the day was already there.
  const early = ok(complete(first.data, taskId, '2026-11-09', '2026-11-12'));
  const token = readProgramRepeatCheck(early.result)!;
  assert.deepEqual({ applied: token.applied, inserted: token.inserted, after: token.after }, { applied: true, inserted: false, after: '2026-11-16' });
  const undone = ok(undoProgramRepeat(early.data, { ...base(early.data), check: token }));
  assert.equal(dateOf(undone.data, taskId), '2026-11-12');
  assert.deepEqual(programRepeatDays(space(undone.data), taskId), ['2026-11-09'], 'the earlier check\'s day stays');
  // Any change after the check (here one more kept day) refuses its 되돌리기.
  const later = ok(complete(early.data, taskId, '2026-11-10', '2026-11-12'));
  const refused = undoProgramRepeat(later.data, { ...base(later.data), check: token });
  assert(!refused.ok && refused.reason === 'conflict');
  // A token that changed nothing is refused even when the line is exactly as it says.
  const forged: ProgramRepeatCheck = { ...token, applied: false };
  const forbidden = undoProgramRepeat(early.data, { ...base(early.data), check: forged });
  assert(!forbidden.ok && forbidden.reason === 'forbidden');
});

test('F2: two devices on one round: a revision conflict is built again on the newer account, the date moves once', async () => {
  for (const [dayA, dayB, days, applied] of [['2026-11-09', '2026-11-09', ['2026-11-09'], false], ['2026-11-09', '2026-11-10', ['2026-11-09', '2026-11-10'], true]] as const) {
    const { data, taskId } = fixture();
    const { a, b } = devices(data);
    await a.refresh(); await b.refresh();
    assert((await check(a, taskId, dayA, '2026-11-09')).ok);
    // B never saw A's save: its command goes to the old revision, is refused, and is built again on the new one.
    const second = await check(b, taskId, dayB, '2026-11-09');
    assert(second.ok, `${dayB}: ${second.ok ? '' : second.reason}`);
    assert.equal(readProgramRepeatCheck(second.result)!.applied, applied, dayB);
    assert.equal(b.snapshot().status === 'conflict' || !!b.snapshot().draft, false, `${dayB}: nothing left waiting`);
    await a.refresh();
    for (const device of [a, b]) {
      assert.equal(dateOf(shown(device), taskId), '2026-11-12', `${dayB}: one move`);
      assert.deepEqual(programRepeatDays(space(shown(device)), taskId), days, `${dayB}: every device's own day`);
      assert.deepEqual(space(shown(device)).text.progressRecords, []);
    }
    if (applied) {
      // B's 되돌리기 takes back B's day only; A's move and day stay.
      const token = readProgramRepeatCheck(second.result)!;
      assert.equal(token.before, token.after);
      assert((await b.mutate('반복 되돌리기', current => undoProgramRepeat(current, { ...base(current), check: token }))).ok);
      assert.equal(dateOf(shown(b), taskId), '2026-11-12');
      assert.deepEqual(programRepeatDays(space(shown(b)), taskId), ['2026-11-09']);
    }
  }
});

test('F2: other lines and other changes are kept; an undone day is not brought back; the next round may be checked', async () => {
  const { data, tasks } = fixture('- [ ] 운동 @매주 월 목\n  - 날짜: 2026-11-09\n- [ ] 영어 @매일\n  - 날짜: 2026-11-09\n- [ ] 장보기');
  const [run, english, plain] = tasks.map(task => task.id);
  const { a, b } = devices(data);
  await a.refresh(); await b.refresh();
  assert((await check(a, run, '2026-11-09', '2026-11-09')).ok);
  // A also changes something unrelated (a plain task's date) before B's stale press on another line.
  assert((await a.mutate('날짜', current => {
    const next = structuredClone(current); next.spaces[owner].text = M.updateTask(next.spaces[owner].text, plain, { date: '2026-11-20' });
    return { ok: true, data: next, changed: true, result: plain };
  })).ok);
  assert((await check(b, english, '2026-11-10', '2026-11-09')).ok);
  const merged = shown(b);
  assert.deepEqual([dateOf(merged, run), dateOf(merged, english), dateOf(merged, plain)], ['2026-11-12', '2026-11-11', '2026-11-20']);
  assert.deepEqual(space(merged).recurrenceExecution?.lines, { [run]: ['2026-11-09'], [english]: ['2026-11-10'] });
  // A takes its check back; B, still on the old revision, finishes the same round later: A's day does not return.
  const second = fixture(), pair = devices(second.data);
  await pair.a.refresh(); await pair.b.refresh();
  const done = await check(pair.a, second.taskId, '2026-11-09', '2026-11-09');
  assert(done.ok);
  assert((await pair.a.mutate('반복 되돌리기', current => undoProgramRepeat(current, { ...base(current), check: readProgramRepeatCheck(done.result)! }))).ok);
  assert((await check(pair.b, second.taskId, '2026-11-10', '2026-11-09')).ok);
  assert.equal(dateOf(shown(pair.b), second.taskId), '2026-11-12');
  assert.deepEqual(programRepeatDays(space(shown(pair.b)), second.taskId), ['2026-11-10'], 'the undone 11/9 stays out');
  // The new round is open to an intentional check.
  assert((await check(pair.b, second.taskId, '2026-11-12', '2026-11-12')).ok);
  assert.equal(dateOf(shown(pair.b), second.taskId), '2026-11-16');
});

test('F2: without the rebuild option a revision conflict stays a conflict (other writers, CAS unchanged)', async () => {
  const { data, taskId } = fixture();
  const { a, b } = devices(data);
  await a.refresh(); await b.refresh();
  assert((await check(a, taskId, '2026-11-09', '2026-11-09')).ok);
  const stale = await check(b, taskId, '2026-11-10', '2026-11-09', false);
  assert(!stale.ok && stale.reason === 'conflict');
  assert.equal(b.snapshot().status, 'conflict');
  assert(b.snapshot().draft, 'the refused input is kept for the person, as before');
  // A day the stale tab could not have seen moved the date some other way: that is still refused, not merged.
  const moved = structuredClone(shown(a));
  space(moved).text = M.updateTask(space(moved).text, taskId, { date: '2026-11-19' });
  const refused = complete(moved, taskId, '2026-11-10', '2026-11-09');
  assert(!refused.ok && refused.reason === 'conflict');
});

test('F4: a year of daily checks through the command, the account and the server; the result stays short', async () => {
  const { data, taskId } = fixture('- [ ] 영어 공부 @매일\n  - 날짜: 2026-01-01');
  const { a } = devices(data);
  await a.refresh();
  const lengths = new Set<number>();
  let day = '2026-01-01', last: ProgramRepeatCheck | null = null;
  for (let index = 0; index < 365; index++) {
    const result = await check(a, taskId, day, day);
    assert(result.ok, `${index + 1}: ${result.ok ? '' : result.reason}`);
    lengths.add(result.result.length); last = readProgramRepeatCheck(result.result)!;
    day = dateOf(shown(a), taskId)!;
  }
  assert.equal(programRepeatDays(space(shown(a)), taskId).length, 365);
  assert.equal(a.snapshot().account!.revision, 365);
  assert(Math.max(...lengths) < 300, `result at most ${Math.max(...lengths)} characters`);
  // 되돌리기 of the last check still sees exactly what it left.
  assert.equal(last!.state, programRepeatState(space(shown(a)), taskId));
  assert((await a.mutate('반복 되돌리기', current => undoProgramRepeat(current, { ...base(current), check: last! }))).ok);
  assert.equal(programRepeatDays(space(shown(a)), taskId).length, 364);
});

test('F4: line IDs of any allowed length; 9,999 kept days take one more, the 10,000-day cap refuses atomically', () => {
  const { data, taskId } = fixture();
  // Line IDs up to the text model's 160 characters: the check's result stays far inside a receipt's 1,200.
  for (const length of [8, 64, 160]) {
    const long = structuredClone(data), longId = `L${'x'.repeat(length - 1)}`, text = space(long).text, doc = text.documents[0];
    doc.lines = doc.lines.map(line => line.id === taskId ? { ...line, id: longId } : line);
    for (const scopes of [text.taskScopes, text.itemScopes]) { scopes[longId] = scopes[taskId]; delete scopes[taskId]; }
    assert(M.validate(space(long).text), `${length}`);
    const done = ok(complete(long, longId, '2026-11-09', '2026-11-09'));
    assert(done.result.length < 400, `${length}: ${done.result.length}`);
    assert(validateProgramData(done.data));
  }
  // Days kept on other lines fill the account to 9,999.
  const full = structuredClone(data);
  let filler = 0;
  for (let line = 0; programRepeatDayCount(space(full)) < PROGRAM_REPEAT_LOG_DAYS - 1; line++)
    for (let index = 0; index < 1000 && programRepeatDayCount(space(full)) < PROGRAM_REPEAT_LOG_DAYS - 1; index++) {
      const date = new Date(Date.UTC(2000, 0, 1 + index)).toISOString().slice(0, 10);
      assert(addProgramRepeatDay(space(full), `gone-line-${line}`, date).inserted); filler++;
    }
  assert.equal(filler, 9999);
  const ten = ok(complete(full, taskId, '2026-11-09', '2026-11-09'));
  assert.equal(programRepeatDayCount(space(ten.data)), PROGRAM_REPEAT_LOG_DAYS);
  assert(readProgramRepeatCheck(ten.result)!.state.length < 80);
  const capped = complete(ten.data, taskId, '2026-11-12', '2026-11-12');
  assert(!capped.ok && capped.reason === 'limit');
  assert.deepEqual(capped.data, ten.data, 'nothing of the refused check is written');
});

test('F3: settling takes only the lines a folder view shows; the editor settles there and after a save it waited on', () => {
  const { data, docId, tasks } = fixture('- [ ] 오일 @6개월마다\n- [ ] 운동 @매주 월 목');
  const settled = settleProgramRepeatLines(space(data), docId, '2026-11-09', null, new Set([tasks[0].id]));
  assert.deepEqual(settled.settled.map(entry => [entry.taskId, entry.date]), [[tasks[0].id, '2027-05-09']]);
  const read = (file: string) => readFileSync(new URL(file, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const editor = read('../../../components/flow/integrated-poc/ProgramTextEditor.tsx');
  const settle = editor.slice(editor.indexOf('  function settleRepeatLines(all: boolean) {'), editor.indexOf('  /** N10 (SPEC 2): a repeat line\'s tap'));
  assert(!settle.includes('propsRef.current.folderId ||'), 'a folder view no longer stops the settle');
  assert(settle.includes('if (state.saving || composingRef.current || repeatBusyRef.current || regionPendingRef.current || !folderId && (!area || area.value !== state.raw)) {\n      settleWantedRef.current = true; return;'));
  assert(settle.includes('.filter(region => !region.readOnly).flatMap(region => region.lineIds)'));
  assert(editor.includes('useEffect(() => { if (!draft.saving && settleWantedRef.current) { settleWantedRef.current = false; settleRepeatLines(false); } }, [draft.saving]);'));
  assert(editor.includes("regionLineRef.current = lineId ?? null; propsRef.current.onPosition?.({ start, end, scrollTop: 0 }, lineId); syncBarLine(); settleRepeatLines(false); }}"));
  assert(editor.includes("root.addEventListener('focusout', left);"));
});

test('F5 and P3: the old repeat card waits out an automatic read; a slow check speaks only in its own view', () => {
  const host = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramSpace.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const convert = host.slice(host.indexOf('  async function convertLegacyRepeat() {'), host.indexOf('  const legacyRepeatContent ='));
  assert(convert.includes('expectedSpace: current.spaces[actorId], seriesId: legacyRepeat.id, today }), true, undefined, undefined, true);'));
  assert(convert.includes("if (!result.ok && !['missing', 'unresolved'].includes(result.reason)) return;"), 'a save that did not run keeps the card');
  assert(host.includes('taskId, today, expected }), true, undefined, undefined, true, true);'), 'the check rebuilds on a conflict');
  assert(host.includes('const view = presentation.current, check = await finishRepeatRound(taskId, expected);\n    if (!checkViewOwns(view)) return;'));
  assert(host.includes('const view = presentation.current, done = await undoRepeatRound(check);\n    if (!checkViewOwns(view)) return;'));
  assert(host.includes('check: check.applied ? check : null }'));
});
