import type { ProgramData, ProgramParticipationDraft, ProgramPost, ProgramPrivateSpace } from './contract';
import { programShiftDate } from './execution';
import { programLiveCopy } from './program-discovery-display';
import { readProgramRepeatMarker } from './repeat-line';
import { programRepeatDays } from './repeat-log';
import { newProgramReviewDraft } from './review-return';
import { textWorkspaceModel as M, type TextTask, type TextWorkspaceState } from './text-workspace';

/** 실행 고리 1안 (11/6): what I did of a Flow I took, read from my own space only. Nothing is asked of the server
 *  and nothing is written: a copy's tasks are its item lines (their checks; a [50%] is not finished), and its repeat
 *  lines are my open repeat lines whose memo starts with ‘{the Flow's title}’에서 (what an official repeat Flow's
 *  import writes), with the days each was finished. A memo changed or taken away leaves its line out. */
export type ProgramFlowProgress = {
  tasks: number; done: number;
  /** Open repeat lines; those finished on any day; days finished this week (Monday to Sunday). */
  repeats: number; started: number; week: number;
  /** Every task checked, or with no task every repeat line finished once. */
  finished: boolean;
};
/** A Flow of someone else's I just finished, with the version my copy has. */
export type ProgramFlowFinish = { flowId: string; versionId: string; title: string };

const tasksByState = new WeakMap<TextWorkspaceState, Map<string, TextTask>>();
function tasksOf(text: TextWorkspaceState): Map<string, TextTask> {
  let found = tasksByState.get(text);
  if (!found) {
    found = new Map();
    for (const task of M.tasks(text)) if (task.isCanonical || !found.has(task.id)) found.set(task.id, task);
    tasksByState.set(text, found);
  }
  return found;
}
export function programWeekStart(today: string): string {
  const day = new Date(`${today}T12:00:00Z`).getUTCDay();
  return programShiftDate(today, -((day + 6) % 7));
}

type FlowLines = { ordinary: TextTask[]; repeats: TextTask[] };
function flowLines(data: ProgramData, actorId: string, flowId: string): FlowLines | null {
  const space: ProgramPrivateSpace | undefined = data.spaces[actorId], copy = programLiveCopy(space, flowId);
  if (!space || !copy) return null;
  const tasks = tasksOf(space.text);
  const ordinary = copy.includedItemIds.filter(id => copy.itemOverrides[id]?.included !== false && !copy.recurrence?.itemIds.includes(id))
    .flatMap(id => { const task = tasks.get(copy.itemLines[id]); return task ? [task] : []; });
  const titles = [...new Set(data.public.versions.filter(version => version.flowId === flowId).map(version => `‘${version.title.trim()}’에서`))];
  const copied = new Set(space.copies.flatMap(row => Object.values(row.itemLines)));
  const repeats = [...tasks.values()].filter(task => !task.done && !copied.has(task.id) && !space.documentTrash?.[task.docId]
    && !space.archivedDocumentIds.includes(task.docId) && readProgramRepeatMarker(task.title)
    && task.note.split('\n').some(line => titles.some(title => line.startsWith(title))));
  return { ordinary, repeats };
}
function progressOf(space: ProgramPrivateSpace, lines: FlowLines, today: string, done: (task: TextTask) => boolean): ProgramFlowProgress {
  const from = programWeekStart(today), to = programShiftDate(from, 6), days = lines.repeats.map(task => programRepeatDays(space, task.id));
  const finished = lines.ordinary.filter(done).length, started = days.filter(list => list.length > 0).length;
  return { tasks: lines.ordinary.length, done: finished, repeats: lines.repeats.length, started,
    week: days.reduce((sum, list) => sum + list.filter(day => day >= from && day <= to).length, 0),
    finished: lines.ordinary.length ? finished === lines.ordinary.length : lines.repeats.length > 0 && started === lines.repeats.length };
}
export function programFlowProgress(data: ProgramData, actorId: string, flowId: string, today: string): ProgramFlowProgress | null {
  const lines = flowLines(data, actorId, flowId);
  return lines && progressOf(data.spaces[actorId], lines, today, task => task.done);
}

/** The Flows a save of mine has just finished: unfinished before it, finished after, by a check (a task checked, or
 *  a repeat line finished for the first time), not by a line taken away. A Flow taken back (archived) or my own is
 *  never asked about. */
export function programFlowsJustFinished(before: ProgramData, after: ProgramData, actorId: string, today: string): ProgramFlowFinish[] {
  const space = after.spaces[actorId], prior = before.spaces[actorId];
  if (!space?.copies.length || !prior?.copies.length) return [];
  // Most saves are typing: without an item line of a copy changed or a repeat day added, nothing can have finished,
  // and the tasks are not read. Otherwise they are read once, after the save (a read is about 34 ms for 2,700 lines);
  // before it, the same lines are judged by their text then ([x]) and the repeat days then.
  const texts = (owner: ProgramPrivateSpace) => new Map([...owner.text.documents, ...owner.text.flows].flatMap(doc => doc.lines.map(line => [line.id, line.text] as const)));
  const was = texts(prior), now = texts(space);
  if (JSON.stringify(prior.recurrenceExecution?.lines ?? {}) === JSON.stringify(space.recurrenceExecution?.lines ?? {})
    && space.copies.every(copy => Object.values(copy.itemLines).every(id => was.get(id) === now.get(id)))) return [];
  return [...new Set(space.copies.map(copy => copy.flowId))].flatMap(flowId => {
    const flow = after.public.flows.find(row => row.id === flowId), copy = programLiveCopy(space, flowId), lines = flowLines(after, actorId, flowId);
    if (!flow || flow.archived || flow.ownerId === actorId || !copy || !lines || !programLiveCopy(prior, flowId)) return [];
    const then = progressOf(prior, lines, today, task => /^ *- \[[xX]\]/.test(was.get(task.id) ?? '')), current = progressOf(space, lines, today, task => task.done);
    if (then.finished || !current.finished || (current.tasks ? current.done <= then.done : current.started <= then.started)) return [];
    const version = after.public.versions.find(row => row.id === copy.baseVersionId && row.flowId === flowId);
    return version ? [{ flowId, versionId: version.id, title: version.title }] : [];
  });
}

export const PROGRAM_TRIED_ASK = '이 Flow를 다 했어요. 작성자에게 ‘해 봤어요’를 남길까요?';
export const PROGRAM_TRIED_NOTE = '이름과 함께 공개되는 글입니다. 한 줄만 써도 됩니다.';
/** [남기기]: the review draft, its Flow and my copy's version chosen, titled; the body is left to write. */
export function programTriedDraft(finish: ProgramFlowFinish): ProgramParticipationDraft {
  return { ...newProgramReviewDraft(), flowId: finish.flowId, versionId: finish.versionId, title: `해 봤어요 · ${finish.title.trim()}`.slice(0, 240) };
}
export function programFlowProgressText(progress: ProgramFlowProgress): string | null {
  const parts = [progress.tasks ? `할 일 ${progress.tasks}개 중 ${progress.done}개 끝` : '',
    progress.repeats ? `반복 ${progress.repeats}줄, 이번 주 ${progress.week}번 체크` : ''].filter(Boolean);
  return parts.length ? `내 진행: ${parts.join(' · ')}` : null;
}

/** The author's side: experience posts others left on my Flows, newest first, and how many each Flow has. */
export function programFlowReviews(data: ProgramData, actorId: string): { posts: ProgramPost[]; byFlow: Record<string, number> } {
  const mine = new Set(data.public.flows.filter(flow => flow.ownerId === actorId).map(flow => flow.id));
  const posts = data.public.posts.filter(post => !post.deleted && post.kind === 'experience' && post.authorId !== actorId && !!post.flowId && mine.has(post.flowId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const byFlow: Record<string, number> = {};
  for (const post of posts) byFlow[post.flowId!] = (byFlow[post.flowId!] ?? 0) + 1;
  return { posts, byFlow };
}
