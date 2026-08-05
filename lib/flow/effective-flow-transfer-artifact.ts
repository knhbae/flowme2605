import type { EffectiveFlowProjectionManifest } from './effective-flow-contract';
import type { EffectiveFlowResult } from './effective-flow-snapshot';
import {
  buildPersonalStructuralListExportArtifactsFromRows,
  type PersonalStructuralListExportRow,
} from './personal-structural-list-export';

export type EffectiveFlowTransferArtifactPayload = Readonly<{
  effect: 'download' | 'clipboard';
  mediaType: string;
  extension: 'ics' | 'txt' | 'tsv';
  text: string;
  itemIds: readonly string[];
  itemCount: number;
  outputCount: number;
}>;

function countCalendarEvents(ics: string): number {
  return (ics.match(/BEGIN:VEVENT/g) ?? []).length;
}

function rowsForManifest(
  result: EffectiveFlowResult,
  manifest: EffectiveFlowProjectionManifest,
) {
  const eligible = new Set(manifest.eligibleItemIds);
  return result.rows.filter((row) => eligible.has(row.id));
}

function toListRow(
  row: EffectiveFlowResult['rows'][number],
  flowWarning?: string,
): PersonalStructuralListExportRow {
  return {
    itemId: row.id,
    title: row.title,
    ...(row.schedule.date ? { date: row.schedule.date } : {}),
    scheduleState: row.schedule.date ? 'all_day' : 'unscheduled',
    ...(row.description ? { description: row.description } : {}),
    ...(row.memo ? { memo: row.memo } : {}),
    ...(row.completionCriterion ? { completionCriteria: row.completionCriterion } : {}),
    ...(row.caution ? { itemWarning: row.caution } : {}),
    ...(flowWarning ? { flowWarning } : {}),
    ...(row.resources.length > 0
      ? { resources: row.resources.map((resource) => ({ label: resource.label, url: resource.url })) }
      : {}),
    status: row.completed ? 'done' : 'pending',
    personalOrderRank: row.orderRank,
  };
}

function resolveListRows(options: {
  result: EffectiveFlowResult;
  manifest: EffectiveFlowProjectionManifest;
  listRows?: readonly PersonalStructuralListExportRow[];
  flowWarning?: string;
}): PersonalStructuralListExportRow[] {
  if (!options.listRows) {
    return rowsForManifest(options.result, options.manifest).map((row) => (
      toListRow(row, options.flowWarning)
    ));
  }

  const expectedItemIds = options.manifest.eligibleItemIds;
  const rowByItemId = new Map<string, PersonalStructuralListExportRow>();
  options.listRows.forEach((row) => {
    if (rowByItemId.has(row.itemId)) {
      throw new Error(`Duplicate projected list row: ${row.itemId}`);
    }
    rowByItemId.set(row.itemId, row);
  });
  if (
    rowByItemId.size !== expectedItemIds.length ||
    expectedItemIds.some((itemId) => !rowByItemId.has(itemId))
  ) {
    throw new Error('Projected list rows must match the manifest eligible Item IDs.');
  }

  return expectedItemIds.map((itemId, manifestIndex) => {
    const row = rowByItemId.get(itemId)!;
    return {
      ...row,
      personalOrderRank: manifestIndex,
      ...(row.flowWarning || !options.flowWarning
        ? {}
        : { flowWarning: options.flowWarning }),
      resources: row.resources?.map((resource) => ({ ...resource })),
    };
  });
}

export function buildEffectiveFlowListTransferArtifact(options: {
  result: EffectiveFlowResult;
  manifest: EffectiveFlowProjectionManifest;
  flowTitle: string;
  /**
   * Consumer-resolved rows for fields outside the canonical snapshot row
   * shape, such as personal time, duration, and execution memo. Their Item
   * IDs must exactly match the manifest so the manifest remains authoritative.
   */
  listRows?: readonly PersonalStructuralListExportRow[];
  sourceLabel?: string;
  sourceUrl?: string;
  flowWarning?: string;
}): EffectiveFlowTransferArtifactPayload {
  if (options.manifest.destination === 'calendar') {
    throw new Error('Calendar artifacts require the exact ICS generator output.');
  }
  const rows = resolveListRows(options);
  const artifacts = buildPersonalStructuralListExportArtifactsFromRows({
    flowTitle: options.flowTitle,
    rows,
    sourceLabel: options.sourceLabel,
    sourceUrl: options.sourceUrl,
  });
  const destination = options.manifest.destination;
  const text = destination === 'sheet'
    ? artifacts.sheetTsv
    : destination === 'memo'
      ? artifacts.memoText
      : artifacts.checklistText;

  return Object.freeze({
    effect: 'clipboard' as const,
    mediaType: destination === 'sheet'
      ? 'text/tab-separated-values;charset=utf-8'
      : 'text/plain;charset=utf-8',
    extension: destination === 'sheet' ? 'tsv' as const : 'txt' as const,
    text,
    itemIds: Object.freeze([...options.manifest.eligibleItemIds]),
    itemCount: rows.length,
    outputCount: rows.length,
  });
}

export function buildEffectiveFlowCalendarTransferArtifact(options: {
  manifest: EffectiveFlowProjectionManifest;
  ics: string;
}): EffectiveFlowTransferArtifactPayload {
  if (options.manifest.destination !== 'calendar') {
    throw new Error('Only a Calendar manifest can own an ICS artifact.');
  }
  const itemIds = Object.freeze([...options.manifest.eligibleItemIds]);
  return Object.freeze({
    effect: 'download' as const,
    mediaType: 'text/calendar;charset=utf-8',
    extension: 'ics' as const,
    text: options.ics,
    itemIds,
    itemCount: itemIds.length,
    outputCount: countCalendarEvents(options.ics),
  });
}
