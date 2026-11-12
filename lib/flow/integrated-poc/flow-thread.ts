import type { ProgramPrivateSpace } from './contract';
import { programDate } from './program-data';
import { textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';
import { programIsWaitTitle } from './wait-title';

/** F6-B2 (11/9, 방향 B): the Flow 실 — a Flow's shape as dots on one line. A dot for each distinct day of its dated items,
 *  placed by the days between them (0 to 1); `done` dots from the start are filled (the line runs to the next one). */
export type ProgramFlowThreadShape = { points: number[]; done: number };

/** A date (YYYY-MM-DD) as a day number, so dates and relative days share one scale. */
export const programDayNumber = (date: string) => Math.round(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10))) / 86_400_000);

/** Distinct days, sorted, spaced 0..1 by their gaps; one day alone sits at 0; none, no dots. */
export function programThreadPoints(days: readonly number[]): number[] {
  const unique = [...new Set(days.filter(Number.isFinite))].sort((a, b) => a - b);
  if (unique.length < 2) return unique.length ? [0] : [];
  const first = unique[0], span = unique[unique.length - 1] - first;
  return unique.map(day => Math.round((day - first) / span * 1000) / 1000);
}

/** One Flow document of mine (an imported Flow's copy): its tasks' days as the dots, the leading days whose tasks are all
 *  done filled, and how many of its tasks are done of all (undated ones counted too). */
export function programDocumentThread(text: TextWorkspaceState, documentId: string): ProgramFlowThreadShape & { doneTasks: number; total: number } {
  // W-FLOW-07 · W-TXT-09: a '답 확인:' line is no step of the Flow (not in its n/m or its thread).
  const tasks = M.tasks(text).filter(task => task.docId === documentId && !programIsWaitTitle(task.title));
  const dated = tasks.flatMap(task => { const day = task.date ?? task.groupDate; return day && programDate(day) ? [{ day, done: task.done }] : []; });
  const days = [...new Set(dated.map(row => row.day))].sort();
  let done = 0;
  for (const day of days) { if (dated.filter(row => row.day === day).every(row => row.done)) done++; else break; }
  return { points: programThreadPoints(days.map(programDayNumber)), done, doneTasks: tasks.filter(task => task.done).length, total: tasks.length };
}

/** 하고 있는 Flow (나): the Flows I took that still have something open — a copy's document, not archived or in the trash,
 *  in the order taken; each with its name, thread and done/total. */
export function programDoingFlows(space: ProgramPrivateSpace) {
  return space.copies.filter(copy => !space.documentTrash?.[copy.documentId] && !space.archivedDocumentIds.includes(copy.documentId))
    .flatMap(copy => {
      const doc = space.text.flows.find(row => row.id === copy.documentId);
      if (!doc) return [];
      const thread = programDocumentThread(space.text, copy.documentId);
      return thread.total > thread.doneTasks ? [{ documentId: copy.documentId, title: doc.title, ...thread }] : [];
    });
}

/** F6-B2 FIX 3: where the dots go, in px: by their day positions, each at least `gap` from the one before (pushed on); the
 *  line grows up to `maxWidth` when that runs past it, and only past that are the dots drawn closer. Drawing only: the
 *  days themselves are not changed. */
export function programThreadLayout(points: readonly number[], width: number, maxWidth = Math.max(width, 72), gap = 10) {
  let w = width;
  for (let round = 0; round < 4; round++) {
    const xs: number[] = [];
    for (const at of points) xs.push(xs.length ? Math.max(at * w, xs[xs.length - 1] + gap) : at * w);
    const end = xs.length ? xs[xs.length - 1] : 0;
    if (end <= w + 0.01) return { width: w, xs };
    if (w >= maxWidth) return { width: w, xs: xs.map(x => Math.round(x * w / end * 10) / 10) };
    w = Math.min(maxWidth, Math.ceil(end));
  }
  return { width: w, xs: points.map(at => at * w) };
}