export const FLOW_EXPORT_DESTINATIONS = [
  'calendar',
  'checklist',
  'sheet',
  'memo',
] as const;

export type FlowExportDestination = (typeof FLOW_EXPORT_DESTINATIONS)[number];

export type FlowExportScope = 'flow' | 'selected' | 'item';

export type FlowExportScopeItemStatus =
  | 'pending'
  | 'done'
  | 'reopened'
  | 'skipped'
  | 'held';

export type FlowExportScopeItem = {
  key: string;
  title: string;
  calendarEligible: boolean;
  calendarOutputCount?: number;
  listEligible?: boolean;
  recurrenceSeriesId?: string;
  calendarVisibleOccurrenceCount?: number;
  excluded?: boolean;
  tombstoned?: boolean;
  status?: FlowExportScopeItemStatus;
};

export type FlowExportScopeMetrics = {
  datedCount: number;
  undatedCount: number;
  recurringSeriesCount: number;
  visibleOccurrenceCount: number;
  omittedCountByDestination: Record<FlowExportDestination, number>;
};

export type FlowExportScopePlan = {
  scope: FlowExportScope;
  requestedCount: number;
  includedCount: number;
  selectedKeys: string[];
  items: FlowExportScopeItem[];
  itemsByDestination: Record<FlowExportDestination, FlowExportScopeItem[]>;
  countByDestination: Record<FlowExportDestination, number>;
  filenameByDestination: Record<FlowExportDestination, string>;
  excludedCount: number;
  tombstonedCount: number;
  duplicateKeyCount: number;
  canExport: boolean;
  metrics: FlowExportScopeMetrics;
};

export type FlowExportResultKind = 'download' | 'copy';

export type FlowExportResultReceipt = {
  scope: FlowExportScope;
  destination: FlowExportDestination;
  resultKind: FlowExportResultKind;
  status: 'success' | 'error' | 'partial';
  outputCount: number;
  omittedCount: number;
  filename?: string;
  message: string;
  transferRequestId?: string;
  snapshotKind?: 'effective_authoring' | 'effective_execution';
  snapshotVersion?: string;
  snapshotHash?: string;
  itemIds?: string[];
  itemCount?: number;
  artifactOutputCount?: number;
  oneWay?: boolean;
  outcome?: 'success' | 'artifact_failed' | 'partial_local';
  persistedAt?: string;
};

const DESTINATION_EXTENSIONS: Record<FlowExportDestination, string> = {
  calendar: 'ics',
  checklist: 'txt',
  sheet: 'tsv',
  memo: 'txt',
};

const DESTINATION_SUFFIXES: Record<FlowExportDestination, string> = {
  calendar: 'calendar',
  checklist: 'checklist',
  sheet: 'sheet',
  memo: 'memo',
};

function cleanKey(value: string): string {
  return value.trim();
}

function sanitizeFileBase(value: string): string {
  return value
    .normalize('NFKC')
    .trim()
    .replaceAll(/[^0-9A-Za-z\uAC00-\uD7A3]+/g, '-')
    .replaceAll(/^-+|-+$/g, '') || 'flow';
}

function normalizeItems(items: FlowExportScopeItem[]): {
  items: FlowExportScopeItem[];
  duplicateKeyCount: number;
} {
  const seen = new Set<string>();
  let duplicateKeyCount = 0;
  const normalized = items.flatMap((item) => {
    const key = cleanKey(item.key);
    if (!key || seen.has(key)) {
      if (key) duplicateKeyCount += 1;
      return [];
    }
    seen.add(key);
    return [{
      ...item,
      key,
      title: item.title.trim() || '할 일',
      listEligible: item.listEligible ?? true,
    }];
  });
  return { items: normalized, duplicateKeyCount };
}

function getRequestedItems(options: {
  scope: FlowExportScope;
  items: FlowExportScopeItem[];
  selectedKeys: string[];
  currentItemKey?: string;
}): FlowExportScopeItem[] {
  if (options.scope === 'flow') return options.items;
  const requestedKeys = new Set(
    (options.scope === 'item'
      ? [options.currentItemKey ?? '']
      : options.selectedKeys
    ).map(cleanKey).filter(Boolean),
  );
  return options.items.filter((item) => requestedKeys.has(item.key));
}

export function buildFlowExportScopePlan(options: {
  scope: FlowExportScope;
  items: FlowExportScopeItem[];
  selectedKeys?: string[];
  currentItemKey?: string;
  flowTitle: string;
}): FlowExportScopePlan {
  const normalized = normalizeItems(options.items);
  const requestedItems = getRequestedItems({
    scope: options.scope,
    items: normalized.items,
    selectedKeys: options.selectedKeys ?? [],
    currentItemKey: options.currentItemKey,
  });
  const visibleItems = requestedItems.filter((item) => !item.excluded && !item.tombstoned);
  const listItems = visibleItems.filter((item) => item.listEligible !== false);
  const calendarItems = visibleItems.filter((item) => item.calendarEligible);
  const calendarOutputCount = calendarItems.reduce(
    (count, item) => count + Math.max(0, Math.trunc(item.calendarOutputCount ?? 1)),
    0,
  );
  const itemsByDestination = {
    calendar: calendarItems,
    checklist: listItems,
    sheet: listItems,
    memo: listItems,
  } satisfies Record<FlowExportDestination, FlowExportScopeItem[]>;
  const fileBase = sanitizeFileBase(options.flowTitle);
  const scopeSuffix = options.scope === 'flow'
    ? 'all'
    : options.scope === 'selected'
      ? 'selected'
      : 'item';
  const filenameByDestination = Object.fromEntries(
    FLOW_EXPORT_DESTINATIONS.map((destination) => [
      destination,
      `${fileBase}-${scopeSuffix}-${DESTINATION_SUFFIXES[destination]}.${DESTINATION_EXTENSIONS[destination]}`,
    ]),
  ) as Record<FlowExportDestination, string>;
  const recurringSeriesItems = calendarItems.filter((item) => item.recurrenceSeriesId);
  const recurringSeriesCount = new Set(
    recurringSeriesItems.map((item) => item.recurrenceSeriesId),
  ).size;
  const visibleOccurrenceCountBySeries = new Map<string, number>();
  recurringSeriesItems.forEach((item) => {
    if (!item.recurrenceSeriesId) return;
    visibleOccurrenceCountBySeries.set(
      item.recurrenceSeriesId,
      Math.max(
        visibleOccurrenceCountBySeries.get(item.recurrenceSeriesId) ?? 0,
        item.calendarVisibleOccurrenceCount ?? 0,
      ),
    );
  });
  const omittedCountByDestination = Object.fromEntries(
    FLOW_EXPORT_DESTINATIONS.map((destination) => [
      destination,
      Math.max(0, requestedItems.length - itemsByDestination[destination].length),
    ]),
  ) as Record<FlowExportDestination, number>;

  return {
    scope: options.scope,
    requestedCount: requestedItems.length,
    includedCount: listItems.length,
    selectedKeys: visibleItems.map((item) => item.key),
    items: visibleItems,
    itemsByDestination,
    countByDestination: {
      calendar: calendarOutputCount,
      checklist: listItems.length,
      sheet: listItems.length,
      memo: listItems.length,
    },
    filenameByDestination,
    excludedCount: requestedItems.filter((item) => item.excluded).length,
    tombstonedCount: requestedItems.filter((item) => item.tombstoned).length,
    duplicateKeyCount: normalized.duplicateKeyCount,
    canExport: listItems.length > 0,
    metrics: {
      datedCount: calendarItems.length,
      undatedCount: listItems.filter((item) => !item.calendarEligible).length,
      recurringSeriesCount,
      visibleOccurrenceCount: Array.from(visibleOccurrenceCountBySeries.values())
        .reduce((count, value) => count + value, 0),
      omittedCountByDestination,
    },
  };
}

const DESTINATION_RESULT_LABELS: Record<FlowExportDestination, string> = {
  calendar: '캘린더 일정',
  checklist: '체크리스트 항목',
  sheet: '시트 행',
  memo: '메모 항목',
};

export function buildFlowExportResultReceipt(options: {
  plan: FlowExportScopePlan;
  destination: FlowExportDestination;
  resultKind: FlowExportResultKind;
  outputCount: number;
  status?: 'success' | 'error';
  filename?: string;
}): FlowExportResultReceipt {
  const status = options.status ?? 'success';
  const outputCount = Math.max(0, Math.trunc(options.outputCount));
  const omittedCount = options.plan.metrics.omittedCountByDestination[options.destination];
  const resultLabel = DESTINATION_RESULT_LABELS[options.destination];
  const targetLabel = options.resultKind === 'download' ? '파일로 만들었어요' : '복사했어요';
  const message = status === 'success'
    ? `${resultLabel} ${outputCount}개를 ${targetLabel}`
    : `${resultLabel}을 만들지 못했어요`;

  return {
    scope: options.plan.scope,
    destination: options.destination,
    resultKind: options.resultKind,
    status,
    outputCount,
    omittedCount,
    ...(options.filename ? { filename: options.filename } : {}),
    message,
  };
}
