import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { programClone, type ProgramData, type ProgramTransition } from './contract';
import { createProgramData } from './program-data';
import { createProgramDocument, recordProgramTaskProgress } from './private-space';
import { programTaskHasEveningRecord } from './flow-run-progress';
import { textWorkspaceModel as M } from './text-workspace';

// W-CARRY-16 (총괄 11/12): from 18:00, '오늘 남은 일' shows [내일] only on a task without a record — progress [n%], a progress
// record, or a checked subtask. A task with one shows '내일 아침 이어 쓰기' instead (it is continued the next morning).
let request = 0;
const ok = <T,>(result: ProgramTransition<T>) => { assert(result.ok, result.ok ? '' : result.reason); return result; };
const space = (data: ProgramData) => data.spaces[data.activeActorId];
const base = (data: ProgramData) => ({ actorId: data.activeActorId, requestId: `c16-${++request}`, expectedSpace: space(data) });

test('a record is [n%], a progress record above 0 or a checked subtask; a memo alone, an open subtask or nothing is none', () => {
  let data = createProgramData();
  const made = ok(createProgramDocument(data, { ...base(data), title: '저녁 글' })); data = programClone(made.data);
  const raw = '[2026-11-12]\n- [ ] 그냥\n- [40%] 반쯤\n- [ ] 기록만\n- [ ] 하위\n  - [x] 하나\n  - [ ] 둘\n- [ ] 메모만\n  - 메모: 생각\n- [ ] 하위 열림\n  - [ ] 셋';
  const edit = M.editTextResult(space(data).text, made.result, raw, { folderText: true });
  assert.equal(edit.reason, null); space(data).text = edit.state;
  const id = (title: string) => M.tasks(space(data).text).find(task => task.title === title)!.id;
  data = ok(recordProgramTaskProgress(data, { ...base(data), taskId: id('기록만'), date: '2026-11-11', percent: 30 })).data;
  const has = (title: string) => programTaskHasEveningRecord(space(data).text, M.tasks(space(data).text).find(task => task.title === title)!);
  assert.deepEqual(['그냥', '반쯤', '기록만', '하위', '메모만', '하위 열림'].map(has), [false, true, true, true, false, false]);
});

test('the day close: [내일] only without a record; with one, \'내일 아침 이어 쓰기\' said in its place (no button, no long press)', () => {
  const source = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramSpace.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const close = source.slice(source.indexOf('{closing() && item.kind === \'row\' && value < 100 && !moving && (readProgramRepeatMarker(task.title)'), source.indexOf('<button aria-label={`${task.title} 작업`}'));
  assert(close.includes(': !programTaskRepeatMember(space, task.id) && (programTaskHasEveningRecord(space.text, task)'));
  assert(close.includes('? <span className={styles.closeNote} data-close-action="continue">내일 아침 이어 쓰기</span>'));
  assert(close.indexOf('data-close-action="continue"') < close.indexOf('data-close-action="tomorrow"'), '[내일] is the other branch');
  assert(close.includes('data-close-action="skip"'), 'a repeat round keeps [건너뛰기]');
  const css = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramSpace.module.css', import.meta.url), 'utf8');
  assert(css.includes('.closeNote { flex: none; align-self: center; max-width: 96px;'));
});
