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
  listEligible?: boolean;
  excluded?: boolean;
  tombstoned?: boolean;
  status?: FlowExportScopeItemStatus;
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

  return {
    scope: options.scope,
    requestedCount: requestedItems.length,
    includedCount: listItems.length,
    selectedKeys: visibleItems.map((item) => item.key),
    items: visibleItems,
    itemsByDestination,
    countByDestination: {
      calendar: calendarItems.length,
      checklist: listItems.length,
      sheet: listItems.length,
      memo: listItems.length,
    },
    filenameByDestination,
    excludedCount: requestedItems.filter((item) => item.excluded).length,
    tombstonedCount: requestedItems.filter((item) => item.tombstoned).length,
    duplicateKeyCount: normalized.duplicateKeyCount,
    canExport: listItems.length > 0,
  };
}
