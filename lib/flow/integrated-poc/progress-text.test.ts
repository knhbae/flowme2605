import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { programClone, type ProgramData, type ProgramTransition } from './contract';
import { createProgramData } from './program-data';
import { archiveProgramDocument, createProgramDocument, recordProgramTaskProgress } from './private-space';
import { applyProgramProgressText, programProgressTextMark, programProgressTextPlan } from './progress-text';
import { undoProgramTaskLocation } from './task-location-command';
import { textWorkspaceModel as M } from './text-workspace';

// Redesign 1 (총괄 11/12, REDESIGN-TECH-1 §1): progress lives in the text ([n%]); the records are its history.
const TODAY = '2026-11-12';
let request = 0;
const actor = (data: ProgramData) => data.activeActorId;
const space = (data: ProgramData) => data.spaces[actor(data)];
const ok = <T,>(result: ProgramTransition<T>) => { assert(result.ok, result.ok ? '' : result.reason); return result; };
const base = (data: ProgramData) => ({ actorId: actor(data), requestId: `pt-${++request}`, expectedSpace: space(data) });

function writing(raw: string) {
  let data = createProgramData();
  const created = ok(createProgramDocument(data, { ...base(data), title: '진행 글' }));
  data = programClone(created.data);
  space(data).text = M.editText(space(data).text, created.result, raw);
  const docId = created.result;
  const doc = (state: ProgramData) => space(state).text.documents.find(row => row.id === docId)!;
  const id = (state: ProgramData, title: string) => M.tasks(space(state).text).find(task => task.title === title)?.id
    ?? M.rowMeta(space(state).text, docId).find(row => row.title === title)!.id;
  return { data, docId, doc, id };
}

test('a progress entry on a box line writes [n%] into the text: the same text and value as typing it', () => {
  const sheet = writing(`[${TODAY}]\n- [ ] 발표 자료\n  - [ ] 표 그리기`);
  let state = ok(recordProgramTaskProgress(sheet.data, { ...base(sheet.data), taskId: sheet.id(sheet.data, '발표 자료'), date: TODAY, percent: 30 })).data;
  state = ok(recordProgramTaskProgress(state, { ...base(state), taskId: sheet.id(state, '표 그리기'), date: TODAY, percent: 45 })).data;
  const typedRaw = `[${TODAY}]\n- [30%] 발표 자료\n  - [45%] 표 그리기`;
  assert.equal(M.raw(sheet.doc(state)), typedRaw, 'the sheet writes what one would type');
  const typed = writing(typedRaw);
  for (const title of ['발표 자료', '표 그리기']) {
    assert.equal(M.currentProgress(space(state).text, sheet.id(state, title)), M.currentProgress(space(typed.data).text, typed.id(typed.data, title)), title);
  }
  const shape = (data: ProgramData, docId: string) => M.rowMeta(space(data).text, docId).map(row => [row.kind, row.text, row.progressPercent, row.done]);
  assert.deepEqual(shape(state, sheet.docId), shape(typed.data, typed.docId), 'read the same (kind, text, percent, done)');
  // The record is the history of the entry; typing writes none (the text is the source either way).
  assert.equal(space(state).text.progressRecords.length, 2);
  assert.equal(space(typed.data).text.progressRecords.length, 0);
});

test('100 is [x], 0 is [ ], a box already right stays; a past entry under a later record leaves the later value', () => {
  const { data, doc, id } = writing(`[${TODAY}]\n- [ ] 하나\n- [x] 둘\n- [ ] 셋`);
  let state = ok(recordProgramTaskProgress(data, { ...base(data), taskId: id(data, '하나'), date: TODAY, percent: 100 })).data;
  state = ok(recordProgramTaskProgress(state, { ...base(state), taskId: id(state, '둘'), date: TODAY, percent: 0 })).data;
  assert.equal(M.raw(doc(state)), `[${TODAY}]\n- [x] 하나\n- [ ] 둘\n- [ ] 셋`);
  // A box line whose later record an older app left (70 on 11/12): an entry for 11/10 writes the latest value, 70.
  const older = programClone(state);
  space(older).text.progressRecords = [...space(older).text.progressRecords, { taskId: id(older, '셋'), date: TODAY, percent: 70 }];
  state = ok(recordProgramTaskProgress(older, { ...base(older), taskId: id(older, '셋'), date: '2026-11-10', percent: 20 })).data;
  assert(M.raw(doc(state)).endsWith('- [70%] 셋'), 'the latest record (11/12, 70) is the value');
});

test('a numeric line follows the same rule: the latest record by date; 100 is [x], 0 is [ ]; 50 then 0 gives the box back', () => {
  const { data, doc, id } = writing(`[${TODAY}]\n- [30%] 가\n- [ ] 나\n- [40%] 다`);
  let state = ok(recordProgramTaskProgress(data, { ...base(data), taskId: id(data, '가'), date: TODAY, percent: 100 })).data;
  state = ok(recordProgramTaskProgress(state, { ...base(state), taskId: id(state, '나'), date: TODAY, percent: 50 })).data;
  const fifty = M.raw(doc(state));
  state = ok(recordProgramTaskProgress(state, { ...base(state), taskId: id(state, '나'), date: TODAY, percent: 0 })).data;
  state = ok(recordProgramTaskProgress(state, { ...base(state), taskId: id(state, '다'), date: TODAY, percent: 70 })).data;
  state = ok(recordProgramTaskProgress(state, { ...base(state), taskId: id(state, '다'), date: '2026-11-10', percent: 20 })).data;
  assert(fifty.includes('- [50%] 나'));
  assert.equal(M.raw(doc(state)), `[${TODAY}]\n- [x] 가\n- [ ] 나\n- [70%] 다`, '[x] at 100, [ ] back at 0, the later 70 stays over an entry for 11/10');
});

function legacy() {
  const raw = `[${TODAY}]\n- [ ] 가\n- [ ] 나\n- [x] 다\n- [x] 라\n- [40%] 마\n- [ ] 바\n- [ ] 운동 @매주 월\n- [ ] 사`;
  const w = writing(raw), text = space(w.data).text;
  const rec = (title: string, date: string, percent: number) => ({ taskId: w.id(w.data, title), date, percent });
  // Records as an older app left them (a box line's % only in the records).
  text.progressRecords = [rec('가', '2026-11-10', 30), rec('가', '2026-11-11', 60),
    rec('라', '2026-11-11', 100), rec('마', '2026-11-11', 40), rec('운동 @매주 월', '2026-11-11', 50), rec('사', '2026-11-09', 20)];
  assert(M.validate(text), 'valid data, as an older app left it');
  return { ...w, raw };
}

test('the conversion plan: a box line takes its latest record; a numeric line, a line without records, a repeat line stay', () => {
  const { data, docId } = legacy();
  const plan = programProgressTextPlan(space(data), docId);
  // A box whose done state disagrees with its latest record (100 on [ ], 0 on [x]) is not valid data (the model refuses
  // it), so only 1-99 ever moves; [x] with 100, a numeric line, a line without records and a repeat line stay.
  assert.deepEqual(plan.map(change => [change.title, change.before.trim(), change.after.trim(), change.percent, change.date]), [
    ['가', '- [ ] 가', '- [60%] 가', 60, '2026-11-11'],
    ['사', '- [ ] 사', '- [20%] 사', 20, '2026-11-09'],
  ]);
});

test('Fable review: the conversion moves only 1-99; a [ ] line with a 100% record (opened again by hand) and 0 stay as written', () => {
  assert.deepEqual([0, 1, 50, 99, 100].map(programProgressTextMark), [null, '1%', '50%', '99%', null]);
  // [ ] with a 100 record and [x] with a 0 record: the model itself refuses that data (an older app or a typed reopen
  // cannot leave it: typing it back to [ ] is a progress-check-conflict), and the plan would not touch either line.
  const { data, docId, id } = writing(`[${TODAY}]\n- [ ] 다시 연 일\n- [x] 닫은 일\n- [ ] 하던 일`);
  const text = space(data).text;
  const odd = { ...text, progressRecords: [{ taskId: id(data, '다시 연 일'), date: '2026-11-11', percent: 100 }, { taskId: id(data, '닫은 일'), date: '2026-11-11', percent: 0 }] };
  assert.equal(M.validate(odd), false, 'not valid data in the model');
  assert.deepEqual(programProgressTextPlan({ ...space(data), text: odd }, docId), []);
  // A [x] line whose latest record is 100 and a [ ] line whose latest is 0 stay too; only 1-99 is written.
  const valid = { ...text, progressRecords: [{ taskId: id(data, '닫은 일'), date: '2026-11-11', percent: 100 }, { taskId: id(data, '다시 연 일'), date: '2026-11-11', percent: 0 },
    { taskId: id(data, '하던 일'), date: '2026-11-10', percent: 100 }, { taskId: id(data, '하던 일'), date: '2026-11-11', percent: 45 }] };
  assert(M.validate(valid));
  assert.deepEqual(programProgressTextPlan({ ...space(data), text: valid }, docId).map(change => [change.title, change.after.trim()]), [['하던 일', '- [45%] 하던 일']]);
  // Typing a closed task open again (Codex P2-2): the text is the source, so with the edit's day it records 0 for that
  // day; an edit without a day is still refused as before.
  const reopened = M.editTextResult(valid, docId, `[${TODAY}]\n- [ ] 다시 연 일\n- [ ] 닫은 일\n- [ ] 하던 일`, { progressDate: TODAY });
  assert.equal(reopened.reason, null);
  assert.deepEqual(M.progressHistory(reopened.state, id(data, '닫은 일')), [{ date: '2026-11-11', percent: 100 }, { date: TODAY, percent: 0 }]);
  assert.equal(M.currentProgress(reopened.state, id(data, '닫은 일')), 0);
  assert.equal(M.editTextResult(valid, docId, `[${TODAY}]\n- [ ] 다시 연 일\n- [ ] 닫은 일\n- [ ] 하던 일`).reason, 'progress-check-conflict');
});

test("Codex review: a copy's, a saved plan's and a Flow run's document wait for step 5 (their progress as their dates)", () => {
  const { data, docId, id } = writing(`[${TODAY}]\n- [ ] 사본 할 일`);
  const text = { ...space(data).text, progressRecords: [{ taskId: id(data, '사본 할 일'), date: TODAY, percent: 40 }] };
  assert.equal(programProgressTextPlan({ ...space(data), text }, docId).length, 1, 'an ordinary document is offered');
  assert.deepEqual(programProgressTextPlan({ ...space(data), text, copies: [{ documentId: docId, itemLines: {}, subcheckLines: {} } as never] }, docId), [], 'a copy');
  assert.deepEqual(programProgressTextPlan({ ...space(data), text, savedBindings: [{ documentId: docId, itemLines: {} } as never] }, docId), [], 'a saved plan');
  assert.deepEqual(programProgressTextPlan({ ...space(data), text, personalAuthoring: { series: [], executions: [{ executionDocumentId: docId }] } as never }, docId), [], 'a Flow run');
});

test("Codex P2-2: a box typed over a number or the other state is that value (0 or 100) on the edit's day, as a number is", () => {
  const { data, docId, id, doc } = writing(`[${TODAY}]\n- [ ] 보고서\n- [ ] 정리`);
  // 진행 시트 50% → [50%], then typed [ ]: the task is at 0 now, and the list does not offer [50%] again.
  let state = ok(recordProgramTaskProgress(data, { ...base(data), taskId: id(data, '보고서'), date: TODAY, percent: 50 })).data;
  assert.equal(M.raw(doc(state)), `[${TODAY}]\n- [50%] 보고서\n- [ ] 정리`);
  const cleared = M.editTextResult(space(state).text, docId, `[${TODAY}]\n- [ ] 보고서\n- [ ] 정리`, { progressDate: TODAY });
  assert.equal(cleared.reason, null);
  assert.equal(M.currentProgress(cleared.state, id(data, '보고서')), 0);
  assert.deepEqual(programProgressTextPlan({ ...space(state), text: cleared.state }, docId), [], 'nothing to write back');
  // 진행 시트 100% → [x], typed [0%] (0, as typed), then [ ]: the same 0, accepted (no conflict).
  state = ok(recordProgramTaskProgress(state, { ...base(state), taskId: id(state, '정리'), date: TODAY, percent: 100 })).data;
  assert.equal(M.raw(doc(state)), `[${TODAY}]\n- [50%] 보고서\n- [x] 정리`);
  const zero = M.editTextResult(space(state).text, docId, `[${TODAY}]\n- [50%] 보고서\n- [0%] 정리`, { progressDate: TODAY });
  assert.equal(zero.reason, null); assert.equal(M.currentProgress(zero.state, id(data, '정리')), 0);
  const box = M.editTextResult(zero.state, docId, `[${TODAY}]\n- [50%] 보고서\n- [ ] 정리`, { progressDate: TODAY });
  assert.equal(box.reason, null); assert.equal(M.currentProgress(box.state, id(data, '정리')), 0);
  // And [x] typed over [50%] is 100 that day (it was a conflict before).
  const done = M.editTextResult(space(state).text, docId, `[${TODAY}]\n- [x] 보고서\n- [x] 정리`, { progressDate: TODAY });
  assert.equal(done.reason, null); assert.equal(M.currentProgress(done.state, id(data, '보고서')), 100);
});

test('the conversion: one save of that document; the records byte for byte; 되돌리기 gives the text back byte for byte', () => {
  const { data, docId, doc, raw } = legacy();
  const records = JSON.stringify(space(data).text.progressRecords), otherDocs = JSON.stringify(space(data).text.documents.filter(row => row.id !== docId));
  const plan = programProgressTextPlan(space(data), docId);
  const applied = ok(applyProgramProgressText(data, { ...base(data), documentId: docId, changes: plan })).data;
  assert.equal(M.raw(doc(applied)), `[${TODAY}]\n- [60%] 가\n- [ ] 나\n- [x] 다\n- [x] 라\n- [40%] 마\n- [ ] 바\n- [ ] 운동 @매주 월\n- [20%] 사`);
  assert.deepEqual(doc(applied).lines.map(line => line.id), doc(data).lines.map(line => line.id), 'line IDs kept');
  assert.equal(JSON.stringify(space(applied).text.progressRecords), records, 'the records are not touched');
  assert.equal(JSON.stringify(space(applied).text.documents.filter(row => row.id !== docId)), otherDocs);
  assert.deepEqual(programProgressTextPlan(space(applied), docId), [], 'nothing left to write');
  // The values shown are the same before and after (the text now says what the records said).
  for (const title of ['가', '나', '다', '라', '마', '사']) {
    const taskId = M.rowMeta(space(data).text, docId).find(row => row.title === title)!.id;
    assert.equal(M.currentProgress(space(applied).text, taskId), M.currentProgress(space(data).text, taskId), title);
  }
  const back = ok(undoProgramTaskLocation(applied, { actorId: actor(applied), documentId: docId, before: space(data).text, after: space(applied).text })).data;
  assert.equal(M.raw(doc(back)), raw);
  assert.equal(JSON.stringify(space(back).text.progressRecords), records);
});

test('changed since it was shown, or a locked document: nothing is written', () => {
  const { data, docId, doc } = legacy();
  const plan = programProgressTextPlan(space(data), docId);
  const edited = programClone(data);
  space(edited).text = M.editText(space(edited).text, docId, M.raw(doc(data)).replace('- [ ] 가', '- [ ] 가 고침'));
  const refused = applyProgramProgressText(edited, { ...base(edited), documentId: docId, changes: plan });
  assert(!refused.ok && refused.reason === 'conflict');
  const archived = ok(archiveProgramDocument(data, { ...base(data), documentId: docId })).data;
  assert.deepEqual(programProgressTextPlan(space(archived), docId), []);
  const locked = applyProgramProgressText(archived, { ...base(archived), documentId: docId, changes: plan });
  assert(!locked.ok);
});

test('the screen: the account\'s one list when the app opens (W-TXT-01·03), one save with history (↶), [되돌리기], [나중에]', () => {
  const source = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramSpace.tsx', import.meta.url), 'utf8').replace(/\r/g, '');
  assert(source.includes('if (programTextCleanupAsked.has(actorId)) return;'), 'asked once when the app opens');
  assert(source.includes("for (const id of programTextCleanupDocuments(ask.plan)) if (!await settleRecent(id)) { setMessage('입력이 끝나면 다시 눌러 주세요.'); return; }"), 'pending input saved first');
  assert(source.includes("const result = await run('글 정리', current => { const next = applyProgramTextCleanup(current, { ...base(current), plan: ask.plan, choices: ask.choices, when: programCleanupWhen(new Date()) });"));
  assert(/if \(next\.ok\) stamp = next\.result; return next; \}, true\);/.test(source), 'one save with history (↶)');
  assert(source.includes("restoreProgramTextCleanup(current, { ...base(current), stamp }), true)"), '되돌리기 from the archived original, only right after (총괄 11/12)');
  assert(source.includes('{ask.plan.progress.length > 0 && <><h3 className={styles.dateLinesHead}>진행률 {ask.plan.progressLines}줄 · 할 일 줄에 적습니다</h3>'));
  const model = readFileSync(new URL('./vendor/text-model.cjs', import.meta.url), 'utf8').replace(/\r/g, '');
  assert(model.includes("var mark = latest.percent > 0 && latest.percent < 100 ? String(latest.percent) + '%'"));
});
