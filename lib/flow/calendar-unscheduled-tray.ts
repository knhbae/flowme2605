export type CalendarUnscheduledTrayOwnership = 'source' | 'user_created' | 'unknown';

export type CalendarUnscheduledTrayItem = {
  key: string;
  flowSlug: string;
  flowTitle: string;
  itemId: string;
  stableItemId: string;
  title: string;
  ownership: CalendarUnscheduledTrayOwnership;
};

export type CalendarUnscheduledSchedulePreview = {
  canApply: boolean;
  selectedItems: CalendarUnscheduledTrayItem[];
  selectedCount: number;
  affectedFlowCount: number;
  sourceItemCount: number;
  userCreatedItemCount: number;
  targetDate?: string;
  blockedReason?: 'selection_required' | 'valid_target_date_required';
  isAtomic: true;
};

const PLAIN_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidCalendarTrayDate(value: string): boolean {
  if (!PLAIN_DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export function buildCalendarUnscheduledSchedulePreview(options: {
  items: CalendarUnscheduledTrayItem[];
  selectedKeys: string[];
  targetDate: string;
}): CalendarUnscheduledSchedulePreview {
  const selectedKeySet = new Set(options.selectedKeys);
  const selectedItems = options.items.filter((item) => selectedKeySet.has(item.key));
  const base = {
    selectedItems,
    selectedCount: selectedItems.length,
    affectedFlowCount: new Set(selectedItems.map((item) => item.flowSlug)).size,
    sourceItemCount: selectedItems.filter((item) => item.ownership === 'source').length,
    userCreatedItemCount: selectedItems.filter((item) => item.ownership === 'user_created').length,
    isAtomic: true as const,
  };

  if (selectedItems.length === 0) {
    return {
      ...base,
      canApply: false,
      blockedReason: 'selection_required',
    };
  }
  if (!isValidCalendarTrayDate(options.targetDate)) {
    return {
      ...base,
      canApply: false,
      blockedReason: 'valid_target_date_required',
    };
  }
  return {
    ...base,
    canApply: true,
    targetDate: options.targetDate,
  };
}
