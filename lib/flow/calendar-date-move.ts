import { isValidCalendarTrayDate } from './calendar-unscheduled-tray';

export type CalendarDateMoveItemKind = 'task' | 'occurrence';

export type CalendarDateMoveItem = {
  key: string;
  flowSlug: string;
  flowTitle: string;
  title: string;
  sourceDate: string;
  kind: CalendarDateMoveItemKind;
  completed: boolean;
};

export type CalendarDateMovePreview = {
  canApply: boolean;
  selectedItems: CalendarDateMoveItem[];
  selectedCount: number;
  affectedFlowCount: number;
  occurrenceCount: number;
  ordinaryItemCount: number;
  completedItemCount: number;
  sourceDate?: string;
  targetDate?: string;
  blockedReason?:
    | 'selection_required'
    | 'single_source_date_required'
    | 'valid_target_date_required'
    | 'target_date_unchanged';
  isAtomic: true;
};

export function buildCalendarDateMovePreview(options: {
  items: CalendarDateMoveItem[];
  selectedKeys: string[];
  targetDate: string;
}): CalendarDateMovePreview {
  const selectedKeySet = new Set(options.selectedKeys);
  const selectedItems = options.items.filter((item) => selectedKeySet.has(item.key));
  const sourceDates = Array.from(new Set(selectedItems.map((item) => item.sourceDate)));
  const base = {
    selectedItems,
    selectedCount: selectedItems.length,
    affectedFlowCount: new Set(selectedItems.map((item) => item.flowSlug)).size,
    occurrenceCount: selectedItems.filter((item) => item.kind === 'occurrence').length,
    ordinaryItemCount: selectedItems.filter((item) => item.kind === 'task').length,
    completedItemCount: selectedItems.filter((item) => item.completed).length,
    ...(sourceDates.length === 1 ? { sourceDate: sourceDates[0] } : {}),
    isAtomic: true as const,
  };

  if (selectedItems.length === 0) {
    return { ...base, canApply: false, blockedReason: 'selection_required' };
  }
  if (sourceDates.length !== 1 || !isValidCalendarTrayDate(sourceDates[0])) {
    return { ...base, canApply: false, blockedReason: 'single_source_date_required' };
  }
  if (!isValidCalendarTrayDate(options.targetDate)) {
    return { ...base, canApply: false, blockedReason: 'valid_target_date_required' };
  }
  if (options.targetDate === sourceDates[0]) {
    return {
      ...base,
      canApply: false,
      targetDate: options.targetDate,
      blockedReason: 'target_date_unchanged',
    };
  }
  return {
    ...base,
    canApply: true,
    targetDate: options.targetDate,
  };
}
