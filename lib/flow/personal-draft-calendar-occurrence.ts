import {
  buildPersonalDraftOccurrenceProjection,
  type PersonalStructuralOccurrenceExecutionRecord,
  type PersonalStructuralOccurrenceExecutionState,
} from './personal-structural-occurrence';
import type {
  PersonalStructuralItemOwnership,
  PersonalStructuralSchedule,
} from './personal-structural-overlay';
import type { PersonalStructuralRepeat } from './personal-structural-recurrence';
import type { PersonalStructuralScheduleProjection } from './personal-structural-schedule';

export type PersonalDraftCalendarOccurrenceRow = {
  id: string;
  date?: string;
  structuralOwnership?: PersonalStructuralItemOwnership;
  structuralProjectionOrderRank?: number;
  structuralProjectionStableId?: string;
  structuralSchedule?: PersonalStructuralSchedule;
  structuralScheduleProjection?: PersonalStructuralScheduleProjection;
  structuralRepeat?: PersonalStructuralRepeat;
  structuralOccurrenceId?: string;
  structuralOccurrenceSeriesId?: string;
  structuralOccurrenceRevisionId?: string;
  structuralOccurrenceOriginalDate?: string;
  structuralOccurrenceExecutionState?: PersonalStructuralOccurrenceExecutionState;
};

export function expandPersonalDraftCalendarOccurrenceRows<
  TRow extends PersonalDraftCalendarOccurrenceRow,
>(options: {
  personalDraftEligible: boolean;
  identityNamespace: string;
  rows: TRow[];
  range: { start: string; end: string };
  executionRecords?: PersonalStructuralOccurrenceExecutionRecord[];
}): TRow[] {
  if (!options.personalDraftEligible) return options.rows;

  return options.rows.flatMap((row) => {
    const schedule = row.structuralSchedule;
    if (
      row.structuralOwnership !== 'user_created' ||
      schedule?.mode !== 'fixed_date' ||
      !schedule.repeat
    ) {
      return [row];
    }

    const projection = buildPersonalDraftOccurrenceProjection({
      personalDraftEligible: true,
      ownership: 'user_created',
      identityNamespace: options.identityNamespace,
      itemId: row.structuralProjectionStableId ?? row.id,
      schedule,
      range: options.range,
      personalOrderRank: row.structuralProjectionOrderRank,
      executionRecords: options.executionRecords,
    });
    if (!projection) return [row];

    return projection.projectedOccurrences.map((occurrence) => ({
      ...row,
      date: occurrence.localDate,
      structuralScheduleProjection: occurrence.scheduleProjection,
      structuralOccurrenceId: occurrence.occurrenceId,
      structuralOccurrenceSeriesId: occurrence.seriesId,
      structuralOccurrenceRevisionId: occurrence.revisionId,
      structuralOccurrenceOriginalDate: occurrence.originalDate,
      structuralOccurrenceExecutionState: occurrence.executionState,
    }));
  });
}
