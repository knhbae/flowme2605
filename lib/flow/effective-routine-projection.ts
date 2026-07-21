import type { FlowBundle } from './types';
import {
  expandSavedRoutineOccurrenceRows,
  resolveSavedRoutineRecurrence,
  type SavedRoutineOccurrenceDateResolution,
  type SavedRoutineOccurrenceRow,
  type SavedRoutineRecurrenceDefinition,
} from './saved-routine-occurrence';
import type { PersonalStructuralOccurrenceExecutionRecord } from './personal-structural-occurrence';
import type { PersonalStructuralRecurrenceSeries } from './personal-structural-recurrence';

export type EffectiveRoutineProjectionResult<TRow extends SavedRoutineOccurrenceRow> = {
  connected: boolean;
  rows: TRow[];
  carrierItemIds: string[];
  repeatRuleByItemId: Record<string, string>;
  seriesByItemId: Record<string, PersonalStructuralRecurrenceSeries>;
  semanticOccurrenceCount: number;
  warnings: string[];
};

function isPlainDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return (
    date.getUTCFullYear() === Number(match[1]) &&
    date.getUTCMonth() === Number(match[2]) - 1 &&
    date.getUTCDate() === Number(match[3])
  );
}

function addPlainDateDays(value: string, days: number): string | undefined {
  if (!isPlainDate(value) || !Number.isInteger(days)) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return [
    String(date.getUTCFullYear()).padStart(4, '0'),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function getRoutineEndDate(bundle: FlowBundle, startDate: string): string | undefined {
  const durationDays = bundle.flow.routine_duration_days;
  return durationDays && durationDays > 0
    ? addPlainDateDays(startDate, durationDays - 1)
    : undefined;
}

function getSourceItemRepeatRule(bundle: FlowBundle, itemId: string): string | undefined {
  return bundle.items.find((item) => item.id === itemId)?.repeat_rule?.trim() || undefined;
}

function getFirstResolvableGlobalRule(options: {
  bundle: FlowBundle;
  identityNamespace: string;
  itemId: string;
  startDate: string;
  selectedWeekdays?: string[];
  endDate?: string;
  occurrenceCount?: number;
  time?: string;
  durationMinutes?: number;
}): { rule: string; series: PersonalStructuralRecurrenceSeries; warnings: string[] } | undefined {
  for (const rule of options.bundle.repeatRules ?? []) {
    const resolution = resolveSavedRoutineRecurrence({
      itemId: options.itemId,
      startDate: options.startDate,
      sourceRepeatRule: rule,
      selectedWeekdays: options.selectedWeekdays,
      endDate: options.endDate,
      occurrenceCount: options.occurrenceCount,
      time: options.time,
      durationMinutes: options.durationMinutes,
    }, options.identityNamespace);
    if (resolution.series) return { rule, series: resolution.series, warnings: resolution.warnings };
  }
  return undefined;
}

export function buildEffectiveRoutineProjection<TRow extends SavedRoutineOccurrenceRow>(options: {
  bundle: FlowBundle;
  identityNamespace?: string;
  rows: TRow[];
  startDate: string;
  selectedWeekdays?: string[];
  endDate?: string;
  occurrenceCount?: number;
  seriesEndMode?: 'source' | 'none' | 'until' | 'count';
  time?: string;
  durationMinutes?: number;
  range: { start: string; end: string };
  executionRecords?: PersonalStructuralOccurrenceExecutionRecord[];
  resolveOccurrenceDate?: (input: {
    itemId: string;
    originalDate: string;
  }) => SavedRoutineOccurrenceDateResolution;
}): EffectiveRoutineProjectionResult<TRow> {
  const identityNamespace = options.identityNamespace?.trim() || options.bundle.flow.slug;
  const unchanged = (warnings: string[] = []): EffectiveRoutineProjectionResult<TRow> => ({
    connected: false,
    rows: options.rows,
    carrierItemIds: [],
    repeatRuleByItemId: {},
    seriesByItemId: {},
    semanticOccurrenceCount: 0,
    warnings,
  });

  if (
    options.bundle.flow.structure_type !== 'routine' ||
    !identityNamespace ||
    !isPlainDate(options.startDate) ||
    options.rows.length === 0
  ) {
    return unchanged();
  }

  const seriesEndMode = options.seriesEndMode
    ?? (options.endDate ? 'until' : options.occurrenceCount ? 'count' : 'source');
  const endDate = seriesEndMode === 'until' && isPlainDate(options.endDate)
    ? options.endDate
    : seriesEndMode === 'source'
      ? getRoutineEndDate(options.bundle, options.startDate)
      : undefined;
  const occurrenceCount = seriesEndMode === 'count' ? options.occurrenceCount : undefined;
  const definitions: Record<string, SavedRoutineRecurrenceDefinition | undefined> = {};
  const repeatRuleByItemId: Record<string, string> = {};
  const seriesByItemId: Record<string, PersonalStructuralRecurrenceSeries> = {};
  const warnings: string[] = [];

  for (const row of options.rows) {
    const sourceRepeatRule = getSourceItemRepeatRule(options.bundle, row.id);
    if (!sourceRepeatRule) continue;
    const definition: SavedRoutineRecurrenceDefinition = {
      itemId: row.id,
      startDate: row.date && isPlainDate(row.date) ? row.date : options.startDate,
      sourceRepeatRule,
      selectedWeekdays: options.selectedWeekdays,
      endDate,
      occurrenceCount,
      time: options.time,
      durationMinutes: options.durationMinutes,
    };
    const resolution = resolveSavedRoutineRecurrence(definition, identityNamespace);
    warnings.push(...resolution.warnings.map((warning) => `${row.id}:${warning}`));
    if (!resolution.series) continue;
    definitions[row.id] = definition;
    repeatRuleByItemId[row.id] = sourceRepeatRule;
    seriesByItemId[row.id] = resolution.series;
  }

  if (Object.keys(definitions).length === 0) {
    const carrier = options.rows[0];
    const global = getFirstResolvableGlobalRule({
      bundle: options.bundle,
      identityNamespace,
      itemId: carrier.id,
      startDate: carrier.date && isPlainDate(carrier.date) ? carrier.date : options.startDate,
      selectedWeekdays: options.selectedWeekdays,
      endDate,
      occurrenceCount,
      time: options.time,
      durationMinutes: options.durationMinutes,
    });
    if (!global) {
      const attemptedWarnings = (options.bundle.repeatRules ?? []).flatMap((rule) =>
        resolveSavedRoutineRecurrence({
          itemId: carrier.id,
          startDate: options.startDate,
          sourceRepeatRule: rule,
          selectedWeekdays: options.selectedWeekdays,
          endDate,
          occurrenceCount,
          time: options.time,
          durationMinutes: options.durationMinutes,
        }, identityNamespace).warnings,
      );
      return unchanged(Array.from(new Set(attemptedWarnings)));
    }
    definitions[carrier.id] = {
      itemId: carrier.id,
      startDate: carrier.date && isPlainDate(carrier.date) ? carrier.date : options.startDate,
      sourceRepeatRule: global.rule,
      selectedWeekdays: options.selectedWeekdays,
      endDate,
      occurrenceCount,
      time: options.time,
      durationMinutes: options.durationMinutes,
    };
    repeatRuleByItemId[carrier.id] = global.rule;
    seriesByItemId[carrier.id] = global.series;
    warnings.push(...global.warnings.map((warning) => `${carrier.id}:${warning}`));
  }

  const carrierItemIds = Object.keys(definitions);
  const carrierRows = options.rows.filter((row) => carrierItemIds.includes(row.id));
  const rows = expandSavedRoutineOccurrenceRows({
    identityNamespace,
    rows: carrierRows,
    definitions,
    range: options.range,
    executionRecords: options.executionRecords,
    resolveOccurrenceDate: options.resolveOccurrenceDate,
  });
  const occurrenceRows = rows.filter((row) => Boolean(row.structuralOccurrenceId));

  return {
    connected: occurrenceRows.length > 0,
    rows,
    carrierItemIds,
    repeatRuleByItemId,
    seriesByItemId,
    semanticOccurrenceCount: new Set(occurrenceRows.map((row) => row.structuralOccurrenceId)).size,
    warnings: Array.from(new Set(warnings)),
  };
}
