import type { MyFlowExecutionShape } from './my-flow-shape-aware-workspace';

export type MyFlowCrossFlowTodoGroupId =
  | 'today'
  | 'upcoming'
  | 'undated'
  | 'completed';

export type MyFlowCrossFlowTodoCandidate<Row = unknown> = {
  key: string;
  stableItemId: string;
  flowSlug: string;
  flowTitle: string;
  title: string;
  shape: MyFlowExecutionShape;
  executionLevel: 'item' | 'occurrence' | 'series' | 'resource';
  current: boolean;
  completed: boolean;
  date?: string;
  order: number;
  row: Row;
};

export type MyFlowCrossFlowTodoEntry<Row = unknown> =
  MyFlowCrossFlowTodoCandidate<Row> & {
    groupId: MyFlowCrossFlowTodoGroupId;
  };

export type MyFlowCrossFlowTodoGroup<Row = unknown> = {
  id: MyFlowCrossFlowTodoGroupId;
  label: string;
  rows: MyFlowCrossFlowTodoEntry<Row>[];
};

export type MyFlowCrossFlowTodoProjection<Row = unknown> = {
  groups: MyFlowCrossFlowTodoGroup<Row>[];
  rows: MyFlowCrossFlowTodoEntry<Row>[];
  excludedCount: number;
};

export type MyFlowCrossFlowTodoDateGroupId =
  | `date:${string}`
  | 'undated'
  | 'completed';

export type MyFlowCrossFlowTodoDateGroup<Row = unknown> = {
  id: MyFlowCrossFlowTodoDateGroupId;
  date?: string;
  state: 'past' | 'today' | 'future' | 'undated' | 'completed';
  rows: MyFlowCrossFlowTodoEntry<Row>[];
};

export function resolveMyFlowCrossFlowTodoShape(input: {
  baseShape: MyFlowExecutionShape;
  personalDraft: boolean;
  hasDatedRows: boolean;
}): MyFlowExecutionShape {
  if (!input.personalDraft) return input.baseShape;
  return input.hasDatedRows ? 'dated' : 'checklist';
}

export function resolveMyFlowCrossFlowExecutionLevel(input: {
  personalDraft: boolean;
  itemTypes: Array<string | undefined>;
  occurrence: boolean;
  series: boolean;
}): MyFlowCrossFlowTodoCandidate['executionLevel'] {
  const resourceLike = input.itemTypes.some(
    (type) => type === 'memo_evidence' || type === 'reference_caution',
  );
  if (!input.personalDraft && resourceLike) return 'resource';
  if (input.occurrence) return 'occurrence';
  if (input.series) return 'series';
  return 'item';
}

const groupOrder: MyFlowCrossFlowTodoGroupId[] = [
  'today',
  'upcoming',
  'undated',
  'completed',
];

const groupLabels: Record<MyFlowCrossFlowTodoGroupId, string> = {
  today: '오늘',
  upcoming: '예정',
  undated: '날짜 없음',
  completed: '완료',
};

function isEligibleCandidate<Row>(
  candidate: MyFlowCrossFlowTodoCandidate<Row>,
): boolean {
  if (candidate.shape === 'memo') return false;
  if (candidate.executionLevel === 'resource' || candidate.executionLevel === 'series') {
    return false;
  }
  if (candidate.shape === 'routine') {
    return candidate.executionLevel === 'occurrence' && candidate.current;
  }
  if (candidate.shape === 'sheet') return candidate.current;
  return candidate.executionLevel === 'item';
}

function getGroupId<Row>(
  candidate: MyFlowCrossFlowTodoCandidate<Row>,
  today: string,
): MyFlowCrossFlowTodoGroupId {
  if (candidate.completed) return 'completed';
  if (!candidate.date) return 'undated';
  return candidate.date <= today ? 'today' : 'upcoming';
}

function compareEntries<Row>(
  left: MyFlowCrossFlowTodoEntry<Row>,
  right: MyFlowCrossFlowTodoEntry<Row>,
): number {
  if (left.groupId === 'undated' || left.groupId === 'completed') {
    return (
      left.flowTitle.localeCompare(right.flowTitle, 'ko') ||
      left.order - right.order ||
      left.key.localeCompare(right.key)
    );
  }
  return (
    (left.date ?? '').localeCompare(right.date ?? '') ||
    left.order - right.order ||
    left.flowTitle.localeCompare(right.flowTitle, 'ko') ||
    left.key.localeCompare(right.key)
  );
}

export function buildMyFlowCrossFlowTodoProjection<Row>(input: {
  today: string;
  candidates: MyFlowCrossFlowTodoCandidate<Row>[];
}): MyFlowCrossFlowTodoProjection<Row> {
  const seenKeys = new Set<string>();
  const eligible = input.candidates.flatMap((candidate) => {
    if (!isEligibleCandidate(candidate) || seenKeys.has(candidate.key)) return [];
    seenKeys.add(candidate.key);
    return [{
      ...candidate,
      groupId: getGroupId(candidate, input.today),
    } satisfies MyFlowCrossFlowTodoEntry<Row>];
  });
  const rows = [...eligible].sort((left, right) => {
    const groupDelta = groupOrder.indexOf(left.groupId) - groupOrder.indexOf(right.groupId);
    return groupDelta || compareEntries(left, right);
  });
  const groups = groupOrder.flatMap((id) => {
    const groupRows = rows.filter((row) => row.groupId === id);
    return groupRows.length > 0
      ? [{ id, label: groupLabels[id], rows: groupRows }]
      : [];
  });

  return {
    groups,
    rows,
    excludedCount: input.candidates.length - eligible.length,
  };
}

export function buildMyFlowCrossFlowTodoDateGroups<Row>(input: {
  today: string;
  rows: MyFlowCrossFlowTodoEntry<Row>[];
}): MyFlowCrossFlowTodoDateGroup<Row>[] {
  const groups = new Map<
    MyFlowCrossFlowTodoDateGroupId,
    MyFlowCrossFlowTodoDateGroup<Row>
  >();

  input.rows.forEach((row) => {
    const id: MyFlowCrossFlowTodoDateGroupId = row.completed
      ? 'completed'
      : row.date
        ? `date:${row.date}`
        : 'undated';
    const existing = groups.get(id);
    if (existing) {
      existing.rows.push(row);
      return;
    }

    groups.set(id, {
      id,
      ...(row.completed || !row.date ? {} : { date: row.date }),
      state: row.completed
        ? 'completed'
        : !row.date
          ? 'undated'
          : row.date < input.today
            ? 'past'
            : row.date === input.today
              ? 'today'
              : 'future',
      rows: [row],
    });
  });

  return Array.from(groups.values());
}
