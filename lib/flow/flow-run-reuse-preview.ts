import type { FlowRunFixedDatePolicy } from './flow-run-reuse';

export type FlowRunReusePreviewRow = {
  id: string;
  date?: string | null;
};

export type FlowRunReusePreviewInput = {
  requiresAnchor: boolean;
  currentAnchor?: string;
  nextAnchor?: string;
  currentRows: FlowRunReusePreviewRow[];
  nextRows: FlowRunReusePreviewRow[];
  fixedDateOverrideCount: number;
  fixedDatePolicy?: FlowRunFixedDatePolicy | '';
};

export type FlowRunReusePreview = {
  ready: boolean;
  currentAnchor?: string;
  nextAnchor?: string;
  currentRange?: { start: string; end: string };
  nextRange?: { start: string; end: string };
  linkedDateChangeCount: number;
  nextDatedItemCount: number;
  nextUndatedItemCount: number;
  fixedDateOutcome: 'not_needed' | 'awaiting_choice' | 'kept' | 'reset';
  retainedFixedDateOverrideCount: number;
  resetFixedDateOverrideCount: number;
  createsIndependentRun: true;
  preservesPreviousRun: true;
  resetsCompletion: true;
};

function normalizeDate(value?: string | null): string | undefined {
  const normalized = value?.trim();
  return normalized && /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : undefined;
}

function normalizeRows(rows: FlowRunReusePreviewRow[]): Map<string, string | undefined> {
  const normalized = new Map<string, string | undefined>();
  for (const row of rows) {
    const id = row.id.trim();
    if (!id || normalized.has(id)) continue;
    normalized.set(id, normalizeDate(row.date));
  }
  return normalized;
}

function getDateRange(rows: Map<string, string | undefined>): { start: string; end: string } | undefined {
  const dates = Array.from(rows.values()).filter((date): date is string => Boolean(date)).sort();
  if (dates.length === 0) return undefined;
  return { start: dates[0], end: dates[dates.length - 1] };
}

export function buildFlowRunReusePreview(input: FlowRunReusePreviewInput): FlowRunReusePreview {
  const currentRows = normalizeRows(input.currentRows);
  const nextRows = normalizeRows(input.nextRows);
  const currentAnchor = normalizeDate(input.currentAnchor);
  const nextAnchor = normalizeDate(input.nextAnchor);
  const fixedDateOverrideCount = Math.max(0, Math.floor(input.fixedDateOverrideCount));
  const fixedDateOutcome: FlowRunReusePreview['fixedDateOutcome'] = fixedDateOverrideCount === 0
    ? 'not_needed'
    : input.fixedDatePolicy === 'keep_fixed_dates'
      ? 'kept'
      : input.fixedDatePolicy === 'reset_to_anchor'
        ? 'reset'
        : 'awaiting_choice';
  const rowIds = new Set([...currentRows.keys(), ...nextRows.keys()]);
  const linkedDateChangeCount = Array.from(rowIds).filter(
    (id) => currentRows.get(id) !== nextRows.get(id),
  ).length;
  const nextDatedItemCount = Array.from(nextRows.values()).filter(Boolean).length;

  return {
    ready: !input.requiresAnchor || Boolean(nextAnchor),
    ...(currentAnchor ? { currentAnchor } : {}),
    ...(nextAnchor ? { nextAnchor } : {}),
    ...(getDateRange(currentRows) ? { currentRange: getDateRange(currentRows) } : {}),
    ...(getDateRange(nextRows) ? { nextRange: getDateRange(nextRows) } : {}),
    linkedDateChangeCount,
    nextDatedItemCount,
    nextUndatedItemCount: Math.max(0, nextRows.size - nextDatedItemCount),
    fixedDateOutcome,
    retainedFixedDateOverrideCount: fixedDateOutcome === 'kept' ? fixedDateOverrideCount : 0,
    resetFixedDateOverrideCount: fixedDateOutcome === 'reset' ? fixedDateOverrideCount : 0,
    createsIndependentRun: true,
    preservesPreviousRun: true,
    resetsCompletion: true,
  };
}
