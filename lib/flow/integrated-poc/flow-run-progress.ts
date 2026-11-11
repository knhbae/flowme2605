import type { ProgramData, ProgramPrivateSpace } from './contract';
import { programDaysBetween } from './date-label';
import { programShiftDate } from './execution';
import { programTaskRepeatMember } from './task-date-move';
import { textWorkspaceModel as M, type TextTask } from './text-workspace';

/** F12 1차 (PRD §20, W-FLOW-02·04·05·07, 11/11): the 오늘 tab's progress lines, one per running Flow execution — a public
 *  Flow's copy I took, or a personal Flow's standalone execution (its repeat rounds are not Flows here, W-FLOW-11). Read
 *  in memory from my own space at each render (W-FLOW-06, 1차: nothing is stored). A view only (W-FLOW-17): its check
 *  is the 오늘 list's own check on the same line. */
export type ProgramFlowRunStep = { taskId: string; title: string; date: string | null; done: boolean };
export type ProgramFlowRunWait = { taskId: string; title: string; parentId: string; date: string | null;
  /** Whole days since the parent was checked (its 100% record); null when it was checked by typing [x] (no record). */
  days: number | null };
export type ProgramFlowRun = {
  key: string; kind: 'copy' | 'personal';
  /** The execution's document (the copy's, or the personal execution's). */
  documentId: string;
  /** F12 2차 (W-FLOW-01·04, 기획 11/11 21:31): the Flow's name and the run's name, which is the run document's title
   *  (nothing else stores it); title is both, as the line shows them ('월간 발표 12월'). */
  title: string; flow: string; run: string | null;
  done: number; total: number;
  /** W-FLOW-02 1차: read from the steps' day offsets — all ≤ 0 and one < 0 is the last day; anything else the first. */
  basis: 'last' | 'first';
  anchor: string | null;
  /** 'D-12', 'D-day', 'D+4' (the last day), '3일째' (the first day is 1일째), '시작 전', 'D-?' (no date). */
  mark: string;
  steps: ProgramFlowRunStep[];
  /** The first step not checked. */
  next: ProgramFlowRunStep | null;
  /** W-FLOW-07: a checked step whose subcheck is still open (the earliest such step); shown in place of 다음. */
  wait: ProgramFlowRunWait | null;
};

/** F12 2차 (W-FLOW-01): the run's name read from its document's title — none when the title is the Flow's name; what
 *  follows the Flow's name when the title starts with it ('월간 발표 · 12월' → '12월'); else the whole title. */
export function programRunName(flow: string, title: string): string | null {
  const name = title.trim(), base = flow.trim();
  if (!name || name === base) return null;
  if (base && name.startsWith(base)) return name.slice(base.length).replace(/^[\s·:\-–—]+/, '').trim() || null;
  return name;
}
/** F12 2차 (목업 C2·E1): the run name a new run gets when its field is left as it was — the month of its 기준일
 *  ('12월'; for a last-day Flow the month of its last day, as C2 fills it). */
export function programDefaultRunName(anchorDate: string): string {
  const month = Number(anchorDate.slice(5, 7));
  return Number.isInteger(month) && month >= 1 && month <= 12 ? `${month}월` : '';
}
/** W-FLOW-02: the basis of a run from its steps' day offsets (undated steps have none). */
export function programFlowRunBasis(offsets: readonly (number | null)[]): 'last' | 'first' {
  const days = offsets.filter((day): day is number => day !== null);
  return days.length > 0 && days.every(day => day <= 0) && days.some(day => day < 0) ? 'last' : 'first';
}
export function programFlowRunMark(basis: 'last' | 'first', anchor: string | null, today: string): string {
  if (!anchor) return 'D-?';
  const days = programDaysBetween(today, anchor);
  if (basis === 'last') return days > 0 ? `D-${days}` : days === 0 ? 'D-day' : `D+${-days}`;
  return days > 0 ? '시작 전' : `${1 - days}일째`;
}

type Source = { key: string; kind: 'copy' | 'personal'; documentId: string; flow: string; run: string | null; anchor: string | null; offsets: (number | null)[]; taskIds: string[] };
function sources(data: ProgramData, space: ProgramPrivateSpace): Source[] {
  const live = (documentId: string) => !space.documentTrash?.[documentId] && !space.archivedDocumentIds.includes(documentId);
  const out: Source[] = [];
  for (const copy of space.copies) {
    const doc = M.getDocument(space.text, copy.documentId);
    if (!doc || !live(copy.documentId)) continue;
    const version = data.public.versions.find(entry => entry.id === copy.baseVersionId);
    const ids = copy.includedItemIds.filter(id => copy.itemOverrides[id]?.included !== false && !copy.recurrence?.itemIds.includes(id) && copy.itemLines[id]);
    const flow = version?.title.trim() || doc.title || 'Flow';
    out.push({ key: `copy:${copy.id}`, kind: 'copy', documentId: copy.documentId, flow, run: programRunName(flow, doc.title), anchor: copy.anchor,
      offsets: ids.map(id => { const schedule = version?.items.find(item => item.id === id)?.schedule; return schedule && schedule.kind === 'relative' ? schedule.days : null; }),
      taskIds: ids.map(id => copy.itemLines[id]) });
  }
  const authoring = space.personalAuthoring;
  for (const execution of authoring?.executions ?? []) {
    const doc = M.getDocument(space.text, execution.executionDocumentId);
    if (!doc || !live(execution.executionDocumentId)) continue;
    const version = authoring!.flows.find(flow => flow.flowId === execution.flowId)?.versions.find(entry => entry.id === execution.versionId);
    // Steps: the version's top task references (its subchecks are the steps' own), in the version's order.
    const refs = (version?.taskRefs ?? []).filter(ref => ref.parentTaskId === null && execution.taskIds[ref.taskId]);
    const flow = M.getDocument(space.text, execution.flowId)?.title.trim() || doc.title.split(' · ')[0] || 'Flow';
    out.push({ key: `personal:${execution.id}`, kind: 'personal', documentId: execution.executionDocumentId, flow, run: programRunName(flow, doc.title), anchor: execution.anchorDate,
      offsets: refs.map(ref => ref.date.kind === 'relative' ? ref.date.offsetDays : null), taskIds: refs.map(ref => execution.taskIds[ref.taskId]) });
  }
  return out;
}

/** The runs still going (a step open, or a checked step waiting on its subcheck), in the order the line shows them:
 *  by the next step's date (today first), then the waiting ones, then those whose next step has no date. */
export function programFlowRuns(data: ProgramData, actorId: string, today: string, tasks?: readonly TextTask[]): ProgramFlowRun[] {
  const space = data.spaces[actorId];
  if (!space) return [];
  const byId = new Map((tasks ?? M.tasks(space.text)).map(task => [task.id, task] as const));
  const runs: ProgramFlowRun[] = [];
  for (const source of sources(data, space)) {
    const steps: ProgramFlowRunStep[] = source.taskIds.flatMap(id => { const task = byId.get(id); return task && task.isCanonical ? [{ taskId: id, title: task.title, date: task.date, done: task.done }] : []; });
    if (!steps.length) continue;
    const doc = M.getDocument(space.text, source.documentId)!;
    const items = M.parseDocumentCached(doc, space.text).items, itemById = new Map(items.map(item => [item.id, item] as const));
    let wait: ProgramFlowRunWait | null = null;
    for (const step of steps) {
      if (!step.done) continue;
      const open = items.find(item => item.parentItemId === step.taskId && !item.isCanonical && !item.done && item.title);
      if (!open) continue;
      const record = M.latestProgress(space.text, step.taskId);
      wait = { taskId: open.id, title: open.title, parentId: step.taskId, date: itemById.get(open.id)?.date ?? null,
        days: record && record.percent === 100 && record.date ? Math.max(0, programDaysBetween(record.date, today)) : null };
      break;
    }
    const next = steps.find(step => !step.done) ?? null;
    if (!next && !wait) continue;
    const basis = programFlowRunBasis(source.offsets);
    runs.push({ key: source.key, kind: source.kind, documentId: source.documentId, title: source.run ? `${source.flow} ${source.run}` : source.flow, flow: source.flow, run: source.run, done: steps.filter(step => step.done).length, total: steps.length,
      basis, anchor: source.anchor, mark: programFlowRunMark(basis, source.anchor, today), steps, next, wait });
  }
  const group = (run: ProgramFlowRun) => run.wait ? 1 : run.next?.date ? 0 : 2;
  return runs.sort((a, b) => group(a) - group(b) || (a.next?.date ?? '').localeCompare(b.next?.date ?? '') || a.title.localeCompare(b.title, 'ko'));
}

/** W-FLOW-04: how many lines show before 'Flow n개 더' (phone 3, tablet 5). */
export const PROGRAM_FLOW_RUN_SHOWN = Object.freeze({ phone: 3, tablet: 5 });
/** W-FLOW-08: the hour (assumed, 18:00) the day close gathers today's open tasks. */
export const PROGRAM_DAY_CLOSE_HOUR = 18;

/** W-FLOW-07·08: subchecks waiting to be looked at again — the parent checked, the subcheck open, its date (its own, else
 *  the parent's) today or before — in my documents and my Flows, in document order. */
export type ProgramRecheck = { taskId: string; title: string; parentId: string; parentTitle: string; docId: string; docTitle: string; date: string; days: number | null };
export function programRechecks(space: ProgramPrivateSpace, today: string): ProgramRecheck[] {
  const live = (documentId: string) => !space.documentTrash?.[documentId] && !space.archivedDocumentIds.includes(documentId);
  const out: ProgramRecheck[] = [];
  for (const doc of [...space.text.documents, ...space.text.flows]) {
    if (!live(doc.id)) continue;
    const items = M.parseDocumentCached(doc, space.text).items, byId = new Map(items.map(item => [item.id, item] as const));
    for (const item of items) {
      const parent = item.parentItemId ? byId.get(item.parentItemId) : undefined;
      if (item.isCanonical || item.done || !item.title || !parent?.done || !item.date || item.date > today) continue;
      const record = M.latestProgress(space.text, parent.id);
      out.push({ taskId: item.id, title: item.title, parentId: parent.id, parentTitle: parent.title, docId: doc.id, docTitle: doc.title, date: item.date,
        days: record && record.percent === 100 && record.date ? Math.max(0, programDaysBetween(record.date, today)) : null });
    }
  }
  return out;
}

/** W-FLOW-08·11: today's open tasks for the day close, each with its action: [건너뛰기] for a repeat round, else [내일]. */
export type ProgramDayCloseRow = { task: TextTask; action: 'tomorrow' | 'skip'; run: ProgramFlowRun | null };
export function programDayCloseRows(space: ProgramPrivateSpace, today: string, openToday: readonly TextTask[], runs: readonly ProgramFlowRun[]): ProgramDayCloseRow[] {
  const runOf = new Map(runs.flatMap(run => run.steps.map(step => [step.taskId, run] as const)));
  return openToday.filter(task => !task.done).map(task => ({ task, action: programTaskRepeatMember(space, task.id) ? 'skip' as const : 'tomorrow' as const, run: runOf.get(task.id) ?? null }));
}

/** W-FLOW-09·10: what moving one step of a run to `date` does to the steps after it.
 *  - 'overlap' (겹칠 때만, the default): each later open step dated before the step it follows goes to that step's date.
 *  - 'keep-gaps' (간격 지키며): every later open step moves by the same number of days.
 *  - 'none' (그대로): only the step moves.
 *  For a last-day run nothing may land after its anchor: such a plan is refused (blocked), never cut short.
 *  ask: the step lands after the next open step's date (only then is the person asked, once per run). */
export type ProgramDeferMode = 'overlap' | 'keep-gaps' | 'none';
export type ProgramDeferPlan = { moves: { taskId: string; title: string; from: string | null; to: string }[]; ask: boolean; blocked: { taskId: string; title: string } | null };
export function programDeferPlan(run: ProgramFlowRun, taskId: string, date: string, mode: ProgramDeferMode): ProgramDeferPlan {
  const index = run.steps.findIndex(step => step.taskId === taskId);
  const step = run.steps[index];
  if (!step) return { moves: [], ask: false, blocked: null };
  const later = run.steps.slice(index + 1).filter(entry => !entry.done && entry.date);
  const ask = !!later[0] && later[0].date! < date;
  const moves: ProgramDeferPlan['moves'] = [{ taskId: step.taskId, title: step.title, from: step.date, to: date }];
  if (mode === 'overlap') {
    let floor = date;
    for (const entry of later) { if (entry.date! < floor) moves.push({ taskId: entry.taskId, title: entry.title, from: entry.date, to: floor }); else floor = entry.date!; }
  } else if (mode === 'keep-gaps' && step.date) {
    const shift = programDaysBetween(step.date, date);
    if (shift > 0) for (const entry of later) moves.push({ taskId: entry.taskId, title: entry.title, from: entry.date, to: programShiftDate(entry.date!, shift) });
  }
  const over = run.basis === 'last' && run.anchor ? moves.find(move => move.to > run.anchor!) : undefined;
  return { moves, ask, blocked: over ? { taskId: over.taskId, title: over.title } : null };
}

/** W-FLOW-09 1차: the choice made once per run is remembered on this device only (another device asks again). */
export const PROGRAM_DEFER_CHOICE_KEY = 'flowme-flow-defer-choice:v1';
export function readProgramDeferChoice(runKey: string, storage?: Pick<Storage, 'getItem'> | null): ProgramDeferMode | null {
  try {
    const store = storage === undefined ? (typeof localStorage === 'undefined' ? null : localStorage) : storage;
    const value = JSON.parse(store?.getItem(PROGRAM_DEFER_CHOICE_KEY) ?? '{}')?.[runKey];
    return value === 'overlap' || value === 'keep-gaps' || value === 'none' ? value : null;
  } catch { return null; }
}
export function writeProgramDeferChoice(runKey: string, mode: ProgramDeferMode, storage?: Pick<Storage, 'getItem' | 'setItem'> | null): void {
  try {
    const store = storage === undefined ? (typeof localStorage === 'undefined' ? null : localStorage) : storage;
    if (!store) return;
    const all = JSON.parse(store.getItem(PROGRAM_DEFER_CHOICE_KEY) ?? '{}');
    store.setItem(PROGRAM_DEFER_CHOICE_KEY, JSON.stringify({ ...(all && typeof all === 'object' ? all : {}), [runKey]: mode }));
  } catch { /* this visit only */ }
}
