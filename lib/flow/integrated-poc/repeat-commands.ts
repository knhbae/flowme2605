import { programClone, type ProgramData, type ProgramPrivateSpace, type ProgramTransition } from './contract';
import { programDate } from './program-data';
import { transitionProgramPrivateSpace, type ProgramPrivateMutationBase } from './private-space';
import { programTaskDateState, programTaskSeriesMember } from './task-date-move';
import { textWorkspaceModel as M, type TextTask, type TextWorkspaceState } from './text-workspace';
import { calculatePersonalRounds, type PersonalRepeatRule } from './personal-authoring';
import { programRepeatFirstDate, programRepeatFixed, programRepeatNextDate, readProgramRepeatMarker, type ProgramRepeatMarker } from './repeat-line';
import { addProgramRepeatDay, programRepeatDays, removeProgramRepeatDay } from './repeat-log';

/** Why a marker stays plain text (SPEC 1, 막는 경우); null when the line is a repeat line. */
export type ProgramRepeatBlock = 'children' | 'series' | 'reference' | 'done' | 'numeric';
export const PROGRAM_REPEAT_BLOCK_TEXT: Record<ProgramRepeatBlock, string> = {
  children: '하위 할 일이 있는 줄은 반복 줄로 만들 수 없습니다. 묶음 반복은 [반복] › 반복·Flow 만들기를 쓰세요',
  series: '이 할 일은 이미 Flow 반복에 들어 있습니다',
  reference: '내 문서의 원래 할 일에만 반복을 걸 수 있습니다',
  done: '끝낸 할 일에는 반복을 걸 수 없습니다. 먼저 체크를 풀어 주세요',
  numeric: '진행률 칸에는 반복을 걸 수 없습니다',
};
export type ProgramRepeatLine = { task: TextTask; marker: ProgramRepeatMarker; block: ProgramRepeatBlock | null };

type RepeatSpace = Pick<ProgramPrivateSpace, 'text' | 'copies' | 'personalAuthoring' | 'savedBindings' | 'legacySnapshot'>;
/** A task whose title ends in a repeat marker, and whether it may repeat. A [x] line keeps its marker as 반복 멈춤. */
export function programRepeatLine(space: RepeatSpace, taskId: string, tasks: readonly TextTask[] = M.tasks(space.text)): ProgramRepeatLine | null {
  const task = tasks.find(item => item.id === taskId);
  const marker = task && readProgramRepeatMarker(task.title);
  if (!task || !marker) return null;
  const block: ProgramRepeatBlock | null = space.copies.some(copy => Object.values(copy.itemLines).includes(taskId)) ? 'reference'
    : programTaskSeriesMember(space as ProgramPrivateSpace, taskId) ? 'series'
    : task.subchecks.length || tasks.some(item => item.parentTaskId === taskId) ? 'children'
    : task.inputPercent !== undefined ? 'numeric'
    : task.done ? 'done' : null;
  return { task, marker, block };
}
/** The text-only part of the same judgement, for the editor's own workspace (no copies or repeats there yet). */
export function programRepeatLineInText(text: TextWorkspaceState, taskId: string): ProgramRepeatLine | null {
  return programRepeatLine({ text, copies: [], savedBindings: [], legacySnapshot: null }, taskId);
}

/** SPEC 1, 첫 회차: repeat lines without a "- 날짜:" property get one, once, so later checks only change its text and two
 *  devices never add two different date lines. The line under the cursor waits (its marker is still being written). */
export function settleProgramRepeatLines(space: RepeatSpace, docId: string, today: string, cursorLineId: string | null) {
  let text = space.text;
  const settled: { taskId: string; title: string; date: string; fixed: boolean }[] = [], blocked: { taskId: string; block: ProgramRepeatBlock }[] = [];
  const tasks = M.tasks(text), doc = M.getDocument(text, docId);
  if (!doc || !programDate(today)) return { text, settled, blocked };
  for (const task of tasks) {
    if (task.docId !== docId || task.id === cursorLineId) continue;
    const line = programRepeatLine(space, task.id, tasks);
    if (!line) continue;
    if (line.block) { if (line.block !== 'done') blocked.push({ taskId: task.id, block: line.block }); continue; }
    if (task.explicitDate) continue;
    const date = task.date ?? programRepeatFirstDate(line.marker.rule, today);
    const next = M.updateTask(text, task.id, { date });
    if (next === text) continue;
    text = next; settled.push({ taskId: task.id, title: task.title, date, fixed: programRepeatFixed(line.marker.rule) || task.date !== null });
  }
  return { text, settled, blocked };
}

/** A short token of what a check left (the line, its date, its days), so 되돌리기 only runs on exactly that. */
export function programRepeatState(space: RepeatSpace & Pick<ProgramPrivateSpace, 'recurrenceExecution'>, taskId: string): string | null {
  const state = programTaskDateState(space as ProgramPrivateSpace, taskId);
  return state === null ? null : `${state}:${programRepeatDays(space, taskId).join(',')}`;
}
export type ProgramRepeatCheck = { taskId: string; before: string | null; after: string; day: string; inserted: boolean; state: string };

/** SPEC 2: finishing a round. The box stays empty, the "- 날짜:" property moves to the next round and the day is kept
 *  in the log; progressRecords are untouched. `expected` is the round as the screen showed it: a round already moved
 *  elsewhere with today's day kept changes nothing (two tabs, one day), any other change is a conflict. */
export function completeProgramRepeat(data: ProgramData, input: ProgramPrivateMutationBase & { taskId: string; today: string; expected: string | null }): ProgramTransition<string> {
  return transitionProgramPrivateSpace(data, input, 'private-task-repeat', { taskId: input.taskId, today: input.today, expected: input.expected }, space => {
    const line = programRepeatLine(space, input.taskId);
    if (!programDate(input.today) || input.expected !== null && !programDate(input.expected)) return { result: input.taskId, reason: 'invalid' };
    if (!line) return { result: input.taskId, reason: 'missing' };
    if (line.block) return { result: input.taskId, reason: 'unresolved' };
    const before = line.task.date;
    if (before !== input.expected) {
      return programRepeatDays(space, input.taskId).includes(input.today)
        ? { result: JSON.stringify({ taskId: input.taskId, before: input.expected, after: before, day: input.today, inserted: false, state: programRepeatState(space, input.taskId) }) }
        : { result: input.taskId, reason: 'conflict' };
    }
    const after = programRepeatNextDate(line.marker.rule, before, input.today);
    const text = after ? M.updateTask(space.text, input.taskId, { date: after }) : space.text;
    if (!after || text === space.text) return { result: input.taskId, reason: 'invalid' };
    space.text = text;
    const added = addProgramRepeatDay(space, input.taskId, input.today);
    if (added.limit) return { result: input.taskId, reason: 'limit' };
    const check: ProgramRepeatCheck = { taskId: input.taskId, before, after, day: input.today, inserted: added.inserted, state: programRepeatState(space, input.taskId)! };
    return { result: JSON.stringify(check) };
  });
}
export function readProgramRepeatCheck(result: string): ProgramRepeatCheck | null {
  try { const value = JSON.parse(result); return value && typeof value.taskId === 'string' && typeof value.after === 'string' ? value : null; } catch { return null; }
}

/** SPEC 3: one 되돌리기 for the whole check (date and the day it added), only while the line is as the check left it. */
export function undoProgramRepeat(data: ProgramData, input: ProgramPrivateMutationBase & { check: ProgramRepeatCheck }): ProgramTransition<string> {
  const { check } = input;
  return transitionProgramPrivateSpace(data, input, 'private-task-repeat-undo', check, space => {
    if (programRepeatState(space, check.taskId) !== check.state || !programRepeatLine(space, check.taskId)) return { result: check.taskId, reason: 'conflict' };
    if (check.before !== check.after) {
      const text = M.updateTask(space.text, check.taskId, { date: check.before });
      if (text === space.text) return { result: check.taskId, reason: 'invalid' };
      space.text = text;
    }
    if (check.inserted && !removeProgramRepeatDay(space, check.taskId, check.day)) return { result: check.taskId, reason: 'conflict' };
    return { result: check.taskId };
  });
}
export const PROGRAM_REPEAT_UNDO_REFUSED = '다른 곳에서 이 반복을 바꿔서 되돌릴 수 없습니다. 날짜는 줄 메뉴에서 고칠 수 있습니다';

/** SPEC 6: the old one-task repeat ('내 반복' with a task source) as a repeat line, by the person's own press. */
export function programLegacyRepeatWords(rule: PersonalRepeatRule): string {
  if (rule.kind === 'daily') return '매일';
  const names = ['일', '월', '화', '수', '목', '금', '토'];
  return `매주 ${[1, 2, 3, 4, 5, 6, 0].filter(day => rule.weekdays.includes(day)).map(day => names[day]).join(' ')}`;
}
export function programLegacyRepeatSeries(space: ProgramPrivateSpace) {
  return (space.personalAuthoring?.series ?? []).filter(series => !series.stopped && series.source.kind === 'task');
}
export const PROGRAM_LEGACY_REPEAT_CARD = '예전 방식 반복 1개가 있습니다. 새 반복 줄로 바꾸면 오늘에 저절로 나타나고 횟수 제한이 없어집니다.';
export const PROGRAM_LEGACY_REPEAT_REFUSED = '이 반복은 새 방식으로 바꿀 수 없습니다. 예전 반복은 그대로 둡니다';
export const PROGRAM_LEGACY_REPEAT_DONE = '반복을 새 방식으로 바꿨습니다. 지난 회차 문서는 그대로 두었습니다. 예전의 횟수·종료일은 없어졌습니다. 그만하려면 줄 끝 표시를 지우세요.';
export function convertProgramLegacyRepeat(data: ProgramData, input: ProgramPrivateMutationBase & { seriesId: string; today: string }): ProgramTransition<string> {
  return transitionProgramPrivateSpace(data, input, 'private-legacy-repeat', { seriesId: input.seriesId, today: input.today }, space => {
    const owner = space.personalAuthoring, series = owner?.series.find(item => item.id === input.seriesId);
    if (!owner || !series || series.stopped || series.source.kind !== 'task' || !programDate(input.today)) return { result: input.seriesId, reason: 'missing' };
    const taskId = series.source.taskId, task = M.tasks(space.text).find(item => item.id === taskId);
    const rule = series.ruleVersions.find(version => version.id === series.currentRuleVersionId)?.rule;
    if (!task || !rule || readProgramRepeatMarker(task.title)) return { result: input.seriesId, reason: 'unresolved' };
    const words = programLegacyRepeatWords(rule), title = `${task.title} @${words}`;
    // The series' own source keeps belonging to it until it stops, so the line is judged as if it already had.
    series.stopped = true;
    let text = M.updateTask(space.text, taskId, { title });
    const line = programRepeatLine({ ...space, text }, taskId);
    if (text === space.text || !line || line.block) return { result: input.seriesId, reason: 'unresolved' };
    const pending = calculatePersonalRounds(series.source.version, { rule, materialized: series.rounds, targetKind: 'task' });
    const date = (pending.ok ? pending.value.rounds.map(round => round.anchorDate).find(day => day >= input.today) : undefined)
      ?? programRepeatFirstDate(line.marker.rule, input.today);
    text = M.updateTask(text, taskId, { date });
    space.text = text; space.personalAuthoring = programClone(owner);
    return { result: taskId };
  });
}
