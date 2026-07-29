export type MyFlowExecutionShape =
  | 'dated'
  | 'checklist'
  | 'routine'
  | 'sheet'
  | 'memo';

export type MyFlowExecutionUnitKind =
  | 'nearest_date_group'
  | 'next_items'
  | 'current_occurrence'
  | 'current_and_next_row'
  | 'none';

export type MyFlowShapeAwareWorkspaceModel = {
  shape: MyFlowExecutionShape;
  executionUnitKind: MyFlowExecutionUnitKind;
  executionLabel: string;
  executionVisible: boolean;
  wholePlanLabel: string;
  historyVisible: boolean;
  semanticOrder: Array<'execution' | 'plan' | 'history'>;
};

export type MyFlowShapeAwareWorkspaceInput = {
  structureType: string;
  primaryDestination: string;
  hasDatedRows: boolean;
  historyEventCount?: number;
};

export type MyFlowCompletionOwnershipRow = {
  itemId: string;
  date?: string;
  occurrenceId?: string;
};

export type MyFlowSingleCompletionOwnerPlan = {
  executionOwnerKeys: string[];
  wholePlanContextKeys: string[];
  currentPositionCount: number;
};

export function getMyFlowCompletionOwnershipKey(
  row: MyFlowCompletionOwnershipRow,
): string {
  return row.occurrenceId
    ? `occurrence:${row.occurrenceId}`
    : `item:${row.itemId}:${row.date ?? 'undated'}`;
}

export function buildMyFlowSingleCompletionOwnerPlan(options: {
  wholePlanRows: MyFlowCompletionOwnershipRow[];
  executionRows: MyFlowCompletionOwnershipRow[];
}): MyFlowSingleCompletionOwnerPlan {
  const wholePlanKeys = options.wholePlanRows.map(getMyFlowCompletionOwnershipKey);
  const wholePlanKeySet = new Set(wholePlanKeys);
  const executionOwnerKeys = Array.from(new Set(
    options.executionRows
      .map(getMyFlowCompletionOwnershipKey)
      .filter((key) => wholePlanKeySet.has(key)),
  ));
  const executionOwnerKeySet = new Set(executionOwnerKeys);
  return {
    executionOwnerKeys,
    wholePlanContextKeys: wholePlanKeys.filter((key) => !executionOwnerKeySet.has(key)),
    currentPositionCount: executionOwnerKeys.length,
  };
}

export function shouldOfferMyFlowCompletionUndo(options: {
  completed: boolean;
  calendarSurface: boolean;
  recurringOccurrence: boolean;
  remainsVisibleInFocusedPlan: boolean;
}): boolean {
  if (!options.completed || options.calendarSurface) return false;
  if (options.recurringOccurrence) return true;
  return !options.remainsVisibleInFocusedPlan;
}

function resolveExecutionShape(
  input: MyFlowShapeAwareWorkspaceInput,
): MyFlowExecutionShape {
  if (input.structureType === 'routine') return 'routine';
  if (input.primaryDestination === 'memo') return 'memo';
  if (input.primaryDestination === 'sheet') return 'sheet';
  if (input.hasDatedRows || input.primaryDestination === 'calendar') return 'dated';
  return 'checklist';
}

export function buildMyFlowShapeAwareWorkspaceModel(
  input: MyFlowShapeAwareWorkspaceInput,
): MyFlowShapeAwareWorkspaceModel {
  const shape = resolveExecutionShape(input);
  const historyVisible = (input.historyEventCount ?? 0) > 0;
  const execution = shape === 'dated'
    ? { kind: 'nearest_date_group' as const, label: '다음 날짜 묶음' }
    : shape === 'checklist'
      ? { kind: 'next_items' as const, label: '이어서 할 일' }
      : shape === 'routine'
        ? { kind: 'current_occurrence' as const, label: '이번 회차' }
        : shape === 'sheet'
          ? { kind: 'current_and_next_row' as const, label: '이어서 기록할 행' }
          : { kind: 'none' as const, label: '' };

  return {
    shape,
    executionUnitKind: execution.kind,
    executionLabel: execution.label,
    executionVisible: execution.kind !== 'none',
    wholePlanLabel: shape === 'memo' ? '전체 내용' : '전체 계획',
    historyVisible,
    semanticOrder: [
      ...(execution.kind === 'none' ? [] : ['execution' as const]),
      'plan',
      ...(historyVisible ? ['history' as const] : []),
    ],
  };
}
