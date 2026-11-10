import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { programClone, type ProgramData } from './contract';
import { createProgramData } from './program-data';
import { completeProgramTask, createProgramDocument, recordProgramTaskProgress } from './private-space';
import { programSameTaskProof, undoProgramSameTasks } from './same-task-undo';
import { textWorkspaceModel as M } from './text-workspace';

// int8b (11/11, Codex int8 QA_NO_GO): QA-int8 0-6 (F7 chip pressed before the input is saved) and 0-8 (W-CARRY-10).
const TODAY = '2026-11-11';
function twoDocuments(todayRecord = false) {
  let data: ProgramData = createProgramData();
  const actor = data.activeActorId, ids: string[] = [];
  for (const [title, raw] of [['S', `[${TODAY}]\n- [ ] 할 일 둘\n- [ ] 다른 일`], ['T', `[${TODAY}]\n- [ ] 할 일 둘`]] as const) {
    const made = createProgramDocument(data, { actorId: actor, requestId: `i8b-${title}`, expectedSpace: data.spaces[actor], title });
    assert(made.ok); data = programClone(made.data);
    const text = M.editTextResult(data.spaces[actor].text, made.result, raw, { folderText: true });
    assert.equal(text.reason, null);
    data.spaces[actor] = { ...data.spaces[actor], text: text.state };
    ids.push(M.getDocument(text.state, made.result)!.lines[1].id);
  }
  // S's line has an older 40% record (kept by the check and by its undo); with todayRecord, one of today too.
  let text = M.recordProgress(data.spaces[actor].text, ids[0], '2026-11-09', 40);
  if (todayRecord) text = M.recordProgress(text, ids[1], TODAY, 30);
  data.spaces[actor] = { ...data.spaces[actor], text };
  return { data, actor, ids };
}
let request = 0;
function checkAll(data: ProgramData, actor: string, ids: string[]) {
  let state = data;
  for (const taskId of ids) {
    const step = completeProgramTask(state, { actorId: actor, requestId: `i8b-check-${++request}`, expectedSpace: state.spaces[actor], taskId, date: TODAY, done: true });
    assert(step.ok); state = step.data;
  }
  return state;
}

test('W-CARRY-10: one 되돌리기 after checking 같은 일 2줄 puts both lines and their records back exactly (no 0% record left)', () => {
  for (const todayRecord of [false, true]) {
    const { data, actor, ids } = twoDocuments(todayRecord), before = data.spaces[actor].text;
    const checked = checkAll(data, actor, ids);
    assert.deepEqual(ids.map(id => M.currentProgress(checked.spaces[actor].text, id)), [100, 100]);
    const proof = programSameTaskProof(before, checked.spaces[actor].text, ids, TODAY)!;
    assert(proof);
    const undone = undoProgramSameTasks(checked, { actorId: actor, requestId: `i8b-undo-${todayRecord}`, expectedSpace: checked.spaces[actor], proof });
    assert(undone.ok, undone.ok ? '' : undone.reason);
    assert.deepEqual(undone.data.spaces[actor].text, before, `${todayRecord ? 'a record of today gets its value back' : 'the records the check added go'}; the lines and the 40% record as before`);
    assert.deepEqual(M.progressHistory(undone.data.spaces[actor].text, ids[0]), [{ date: '2026-11-09', percent: 40 }]);
  }
});

test('W-CARRY-10: a line changed since the check is not undone (conflict); nothing changes', () => {
  const { data, actor, ids } = twoDocuments(), before = data.spaces[actor].text;
  const checked = checkAll(data, actor, ids), proof = programSameTaskProof(before, checked.spaces[actor].text, ids, TODAY)!;
  const later = recordProgramTaskProgress(checked, { actorId: actor, requestId: 'i8b-later', expectedSpace: checked.spaces[actor], taskId: ids[1], date: TODAY, percent: 50 });
  assert(later.ok);
  const undone = undoProgramSameTasks(later.data, { actorId: actor, requestId: 'i8b-undo-late', expectedSpace: later.data.spaces[actor], proof });
  assert(!undone.ok); assert.equal(undone.reason, 'conflict');
  assert.equal(undone.data, later.data);
});

test('int8b: 오늘\'s 같은 일 notice undoes by its proof; the F7 chip saves its own input first and reads the host after', () => {
  const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const space = read('../../../components/flow/integrated-poc/ProgramSpace.tsx');
  const same = space.slice(space.indexOf('async function checkSameTasks('), space.indexOf('const sameNoticeContent'));
  assert(same.includes('proof = programSameTaskProof(current.spaces[actorId].text, state.spaces[actorId].text, members.map(task => task.id), today);'));
  assert(same.includes('undoProgramSameTasks(current,') && !same.includes('recordProgramTaskProgress'), 'no 0% record for an undo');
  const editor = read('../../../components/flow/integrated-poc/ProgramTextEditor.tsx');
  const accept = editor.slice(editor.indexOf('async function acceptDateSuggestion('), editor.indexOf('function freshNoticeHolds('));
  assert(accept.includes('if (controller.getState().dirty || controller.getState().saving) {') && accept.includes('if (!await saveNow(false) || !usable()) return;'));
  assert(accept.includes('!programSame(propsRef.current.workspace, controller.getState().committed)'), 'the host shows the save before the move is judged');
  assert(accept.indexOf('await saveNow(false)') < accept.indexOf('applyDateChip(candidate.lineId, candidate.date)'));
  assert(editor.includes('run: whenComposed(() => { void acceptDateSuggestion(dateSuggestion); }) }],'));
});
