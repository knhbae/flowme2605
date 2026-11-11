import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { programClone, type ProgramData, type ProgramTransition } from './contract';
import { createProgramData } from './program-data';
import { completeProgramTask, createProgramDocument, recordProgramTaskProgress } from './private-space';
import { textWorkspaceModel as M } from './text-workspace';
import { programSameTaskProof, programSameTaskProofThen, undoProgramSameTasks, type ProgramSameTaskProof } from './same-task-undo';

// W-CARRY-10 (총괄 11/12; 기타 F12 QA A2·L1, also in typelag4): a check and its [되돌리기] leave the progress records exactly
// as before the check: a record the check added goes, one it changed gets its value back; a 0% record the person left
// before the check and other days' records stay.
const TODAY = '2026-11-11', YESTERDAY = '2026-11-10';
let request = 0;
const actor = (data: ProgramData) => data.activeActorId;
const space = (data: ProgramData) => data.spaces[actor(data)];
const ok = <T,>(result: ProgramTransition<T>) => { assert(result.ok, result.ok ? '' : result.reason); return result; };
const base = (data: ProgramData) => ({ actorId: actor(data), requestId: `c10-${++request}`, expectedSpace: space(data) });
const RAW = `[${TODAY}]\n- [ ] 보고서 쓰기\n- [ ] 장보기\n- [ ] 전화하기`;

function writing(raw = RAW) {
  let data = createProgramData();
  const created = ok(createProgramDocument(data, { ...base(data), title: '체크 글' }));
  data = programClone(created.data);
  space(data).text = M.editText(space(data).text, created.result, raw);
  const id = (title: string) => M.tasks(space(data).text).find(task => task.title === title)!.id;
  const doc = (state: ProgramData) => M.raw(space(state).text.documents.find(row => row.id === created.result)!);
  return { data, id, doc };
}
const records = (data: ProgramData) => JSON.stringify(space(data).text.progressRecords);
/** A check as the list makes it: the save, and the proof of its one line (before and after). */
function check(data: ProgramData, ids: string[], done = true) {
  let state = data;
  for (const id of ids) state = ok(completeProgramTask(state, { ...base(state), taskId: id, date: TODAY, done })).data;
  return { state, proof: programSameTaskProof(space(data).text, space(state).text, ids, TODAY)! };
}
const undo = (data: ProgramData, proof: ProgramSameTaskProof) => undoProgramSameTasks(data, { ...base(data), proof });

test('a check and [되돌리기]: no record before → none after (the old way left a 0% record); the line as before', () => {
  const { data, id, doc } = writing();
  const before = records(data), raw = doc(data);
  const { state, proof } = check(data, [id('보고서 쓰기')]);
  assert.notEqual(records(state), before);
  // The old 되돌리기 (the check's own command with 0%): a 0% record of today stays.
  const old = ok(completeProgramTask(state, { ...base(state), taskId: id('보고서 쓰기'), date: TODAY, done: false })).data;
  assert(space(old).text.progressRecords.some(record => record.date === TODAY && record.percent === 0), 'W-CARRY-10 as found');
  const back = ok(undo(state, proof)).data;
  assert.equal(records(back), before, 'the records, byte for byte');
  assert.equal(doc(back), raw);
});

test('a record of the same day already there gets its value back; a 0% the person left stays; another day\'s stays', () => {
  for (const [percent, day] of [[40, TODAY], [0, TODAY], [30, YESTERDAY]] as const) {
    const { data, id, doc } = writing();
    const marked = ok(recordProgramTaskProgress(data, { ...base(data), taskId: id('장보기'), date: day, percent })).data;
    const before = records(marked), raw = doc(marked);
    const { state, proof } = check(marked, [id('장보기')]);
    assert.equal(M.currentProgress(space(state).text, id('장보기')), 100);
    const back = ok(undo(state, proof)).data;
    assert.equal(records(back), before, `${percent}% on ${day}`);
    assert.equal(doc(back), raw);
  }
});

test('several lines checked together come back together, byte for byte', () => {
  const { data, id, doc } = writing();
  const other = ok(recordProgramTaskProgress(data, { ...base(data), taskId: id('전화하기'), date: YESTERDAY, percent: 20 })).data;
  const before = records(other), raw = doc(other);
  const { state, proof } = check(other, [id('보고서 쓰기'), id('장보기'), id('전화하기')]);
  assert.equal(Object.keys(proof.tasks).length, 3);
  const back = ok(undo(state, proof)).data;
  assert.equal(records(back), before);
  assert.equal(doc(back), raw);
});

test('the 진행률 chips saved twice: [되돌리기] goes back to before the first save', () => {
  const { data, id } = writing();
  const start = ok(recordProgramTaskProgress(data, { ...base(data), taskId: id('장보기'), date: YESTERDAY, percent: 30 })).data;
  const before = records(start);
  const first = ok(recordProgramTaskProgress(start, { ...base(start), taskId: id('장보기'), date: TODAY, percent: 50 })).data;
  const second = ok(recordProgramTaskProgress(first, { ...base(first), taskId: id('장보기'), date: TODAY, percent: 70 })).data;
  const proof = programSameTaskProofThen(programSameTaskProof(space(start).text, space(first).text, [id('장보기')], TODAY),
    programSameTaskProof(space(first).text, space(second).text, [id('장보기')], TODAY))!;
  assert.equal(proof.tasks[id('장보기')].before.percent, null);
  assert.equal(proof.tasks[id('장보기')].after.percent, 70);
  assert.equal(records(ok(undo(second, proof)).data), before);
  // Another day or other lines: no proof (the notice then records its old value, as before).
  const later = programSameTaskProof(space(first).text, space(second).text, [id('장보기')], YESTERDAY);
  assert.equal(programSameTaskProofThen(programSameTaskProof(space(start).text, space(first).text, [id('장보기')], TODAY), later), null);
});

test('changed since the check (its line or its record): refused, nothing changes', () => {
  const { data, id, doc } = writing();
  const { state, proof } = check(data, [id('보고서 쓰기')]);
  const edited = programClone(state);
  space(edited).text = M.editText(space(edited).text, space(edited).text.documents.find(row => M.raw(row) === doc(state))!.id, doc(state).replace('보고서 쓰기', '보고서 고쳐 쓰기'));
  const refused = undo(edited, proof);
  assert(!refused.ok && refused.reason === 'conflict');
  const rerecorded = ok(recordProgramTaskProgress(state, { ...base(state), taskId: id('보고서 쓰기'), date: TODAY, percent: 80 })).data;
  const again = undo(rerecorded, proof);
  assert(!again.ok && again.reason === 'conflict');
});

test('the screen: the list check, its chips and the progress line box keep the proof; 다시 확인할 일 too', () => {
  const source = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramSpace.tsx', import.meta.url), 'utf8').replace(/\r/g, '');
  assert(source.includes('type CheckNotice = ProgramCheckNotice & { actorId: string; proof?: ProgramSameTaskProof | null };'));
  assert(source.includes("proof = programSameTaskProof(current.spaces[actorId].text, next.data.spaces[actorId].text, [task.id], today); }"));
  assert(source.includes('checkSaved(task.id, task.title, value, after, proof)'));
  assert(source.includes('const exact = undo && notice.proof ? notice.proof : null;'));
  assert(source.includes('const next = exact ? undoProgramSameTasks(current, { actorId, requestId: programId(\'request\'), expectedSpace: current.spaces[actorId], proof: exact })'));
  assert(source.includes('proof: programSameTaskProofThen(shown.proof, stepProof) });'));
  // The progress line's box is the list's check (checkTaskFromList).
  assert(source.includes('if (task) void checkTaskFromList(task);'));
  const recheck = source.slice(source.indexOf('function checkRecheck('), source.indexOf('function recheckTomorrow('));
  assert(recheck.includes('exact ? undoProgramSameTasks(current, {') && recheck.includes('proof = programSameTaskProof(current.spaces[actorId].text, next.data.spaces[actorId].text, [row.taskId], today)'));
  const same = readFileSync(new URL('./same-task-undo.ts', import.meta.url), 'utf8');
  assert(same.includes('for (const doc of [...text.documents, ...text.flows]) {'), 'a Flow document\'s line too');
});
