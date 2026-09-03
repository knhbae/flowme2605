import type {
  PersonalWorkspacePocReadModel,
  PersonalWorkspacePocState,
  PersonalWorkspacePocTimelineOrder,
} from './personal-workspace-poc-contract';
import { toPersonalWorkspacePocQuickItemRef } from './personal-workspace-poc-contract';
import {
  applyPersonalWorkspacePocTimelineOrder,
  getPersonalWorkspacePocEffectiveDate,
  getPersonalWorkspacePocFolderId,
  isPersonalWorkspacePocCompleted,
  isPersonalWorkspacePocDate,
  isPersonalWorkspacePocMemberInactive,
} from './personal-workspace-poc-state';

export type PersonalWorkspacePocView = 'today' | 'week' | 'month' | 'undated';

export type PersonalWorkspacePocTask = Readonly<{
  ref: string;
  kind: 'flow_item' | 'quick_item';
  title: string;
  description?: string;
  memo?: string;
  sourceTimingLabel?: string;
  flowRef?: string;
  flowTitle?: string;
  folderId?: string;
  date?: string;
  time?: string;
  completed: boolean;
  timelinePolicy: 'auto' | 'included' | 'excluded';
  sourceOrder: number;
}>;

export type PersonalWorkspacePocTaskGroup = Readonly<{
  context: PersonalWorkspacePocTimelineOrder['context'];
  contextKey: string;
  label: string;
  tasks: readonly PersonalWorkspacePocTask[];
  manualOrder: boolean;
}>;

function addPlainDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return [
    String(next.getUTCFullYear()).padStart(4, '0'),
    String(next.getUTCMonth() + 1).padStart(2, '0'),
    String(next.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function startOfWeek(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return addPlainDays(date, -(weekday === 0 ? 6 : weekday - 1));
}

function defaultTaskOrder(tasks: readonly PersonalWorkspacePocTask[]): PersonalWorkspacePocTask[] {
  return [...tasks].sort((left, right) => {
    if (left.time && !right.time) return -1;
    if (!left.time && right.time) return 1;
    if (left.time && right.time && left.time !== right.time) return left.time.localeCompare(right.time);
    if (left.sourceOrder !== right.sourceOrder) return left.sourceOrder - right.sourceOrder;
    return left.title.localeCompare(right.title, 'ko');
  });
}

function formatDateLabel(date: string, today: string): string {
  if (date === today) return '오늘';
  const [year, month, day] = date.split('-').map(Number);
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][
    new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  ];
  return `${month}월 ${day}일 ${weekday}요일`;
}

export function buildPersonalWorkspacePocTasks(
  model: PersonalWorkspacePocReadModel,
  state: PersonalWorkspacePocState,
): PersonalWorkspacePocTask[] {
  const tasks: PersonalWorkspacePocTask[] = [];
  model.flows.forEach((flow) => {
    if (isPersonalWorkspacePocMemberInactive(state, flow.ref)) return;
    const folderId = getPersonalWorkspacePocFolderId(state, flow.ref);
    flow.items.forEach((item) => {
      const placement = state.placements[item.ref];
      tasks.push({
        ref: item.ref,
        kind: 'flow_item',
        title: item.title,
        ...(item.description ? { description: item.description } : {}),
        ...(item.sourceTimingLabel ? { sourceTimingLabel: item.sourceTimingLabel } : {}),
        flowRef: flow.ref,
        flowTitle: flow.title,
        ...(folderId ? { folderId } : {}),
        ...(getPersonalWorkspacePocEffectiveDate(state, item.ref, item.sourceDate)
          ? { date: getPersonalWorkspacePocEffectiveDate(state, item.ref, item.sourceDate) }
          : {}),
        ...(placement?.time ? { time: placement.time } : {}),
        completed: isPersonalWorkspacePocCompleted(state, item.ref),
        timelinePolicy: placement?.timelinePolicy ?? 'auto',
        sourceOrder: item.sourceOrder,
      });
    });
  });
  state.quickItems.forEach((item, index) => {
    const ref = toPersonalWorkspacePocQuickItemRef(item.quickItemId);
    if (isPersonalWorkspacePocMemberInactive(state, ref)) return;
    const placement = state.placements[ref];
    const folderId = getPersonalWorkspacePocFolderId(state, ref);
    tasks.push({
      ref,
      kind: 'quick_item',
      title: item.title,
      ...(item.memo ? { memo: item.memo } : {}),
      ...(folderId ? { folderId } : {}),
      ...(getPersonalWorkspacePocEffectiveDate(state, ref)
        ? { date: getPersonalWorkspacePocEffectiveDate(state, ref) }
        : {}),
      ...(placement?.time ? { time: placement.time } : {}),
      completed: item.status === 'completed',
      timelinePolicy: placement?.timelinePolicy ?? 'auto',
      sourceOrder: 100_000 + index,
    });
  });
  return tasks;
}

export function buildPersonalWorkspacePocTaskGroups(
  tasks: readonly PersonalWorkspacePocTask[],
  state: PersonalWorkspacePocState,
  view: PersonalWorkspacePocView,
  today: string,
): PersonalWorkspacePocTaskGroup[] {
  if (!isPersonalWorkspacePocDate(today)) return [];
  const visible = tasks.filter((task) => task.timelinePolicy !== 'excluded');
  const groups = new Map<string, PersonalWorkspacePocTask[]>();
  const weekStart = startOfWeek(today);
  const weekEnd = addPlainDays(weekStart, 6);
  const monthPrefix = today.slice(0, 7);

  visible.forEach((task) => {
    let key: string | undefined;
    if (view === 'undated') {
      if (!task.date) key = 'undated:undated';
    } else if (view === 'today') {
      if (task.date === today) key = `date:${today}`;
      else if (task.date && task.date < today && !task.completed) key = `overdue:${today}`;
    } else if (view === 'week') {
      if (task.date && task.date >= weekStart && task.date <= weekEnd) key = `date:${task.date}`;
    } else if (task.date?.startsWith(monthPrefix)) {
      key = `date:${task.date}`;
    }
    if (!key) return;
    const existing = groups.get(key);
    if (existing) existing.push(task);
    else groups.set(key, [task]);
  });

  return [...groups.entries()]
    .sort(([left], [right]) => {
      if (left.startsWith('overdue:')) return -1;
      if (right.startsWith('overdue:')) return 1;
      return left.localeCompare(right);
    })
    .map(([key, rows]) => {
      const [context, contextKey] = key.split(':') as [
        PersonalWorkspacePocTimelineOrder['context'],
        string,
      ];
      const defaults = defaultTaskOrder(rows);
      const orderedRefs = applyPersonalWorkspacePocTimelineOrder(
        state,
        context,
        contextKey,
        defaults.map((task) => task.ref),
      );
      const byRef = new Map(rows.map((task) => [task.ref, task]));
      return {
        context,
        contextKey,
        label: context === 'overdue'
          ? '지난 미완료'
          : context === 'undated'
            ? '날짜 미정'
            : formatDateLabel(contextKey, today),
        tasks: orderedRefs.flatMap((ref) => {
          const task = byRef.get(ref);
          return task ? [task] : [];
        }),
        manualOrder: state.timelineOrders.some(
          (order) => order.context === context && order.contextKey === contextKey,
        ),
      };
    });
}

export function getPersonalWorkspacePocFolderPath(
  state: PersonalWorkspacePocState,
  folderId?: string,
): string {
  if (!folderId) return '미분류';
  const folder = state.folders.find((candidate) => candidate.folderId === folderId);
  if (!folder) return '미분류';
  const parent = folder.parentFolderId
    ? state.folders.find((candidate) => candidate.folderId === folder.parentFolderId)
    : undefined;
  return parent ? `${parent.title} / ${folder.title}` : folder.title;
}
