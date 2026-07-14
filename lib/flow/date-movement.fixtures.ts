import {
  buildPersonalStructuralOccurrenceId,
  createPersonalStructuralRecurrenceSeries,
} from './personal-structural-recurrence';
import type {
  DateMovementOccurrenceTarget,
  DateMovementState,
} from './date-movement';

export const DATE_MOVEMENT_FIXTURE_TIMESTAMP = '2026-07-14T04:00:00.000Z';

export function buildDateMovementBaseState(): DateMovementState {
  return {
    identityNamespace: 'date-movement-fixture',
    anchorDate: '2026-03-14',
    items: [
      {
        itemId: 'linked-item',
        title: 'Linked item',
        schedule: { mode: 'anchor_offset', dayOffset: -10 },
        dateOwnership: 'linked',
        effectiveDate: '2026-03-04',
        executionState: 'pending',
      },
      {
        itemId: 'fixed-item',
        title: 'Fixed item',
        schedule: {
          mode: 'fixed_date',
          date: '2026-03-08',
          time: '09:00',
          durationMinutes: 45,
          timeZone: 'America/New_York',
        },
        dateOwnership: 'fixed',
        effectiveDate: '2026-03-08',
        executionState: 'done',
      },
      {
        itemId: 'unscheduled-item',
        title: 'Unscheduled item',
        dateOwnership: 'unscheduled',
        executionState: 'skipped',
      },
    ],
  };
}

export function buildDateMovementRecurringFixture(): {
  state: DateMovementState;
  occurrence: DateMovementOccurrenceTarget;
} {
  const series = createPersonalStructuralRecurrenceSeries({
    identityNamespace: 'date-movement-fixture',
    itemId: 'recurring-item',
    effectiveFrom: '2026-07-13',
    rule: {
      frequency: 'weekly',
      interval: 1,
      weekdays: ['MO', 'WE', 'FR'],
      end: { mode: 'count', count: 12 },
    },
    scheduleTemplate: {
      time: '09:30',
      durationMinutes: 30,
      timeZone: 'Asia/Seoul',
    },
    updatedAt: DATE_MOVEMENT_FIXTURE_TIMESTAMP,
  });
  const firstRevision = series.revisions[0];
  const occurrenceId = buildPersonalStructuralOccurrenceId({
    revisionId: firstRevision.revisionId,
    scheduledDate: '2026-07-13',
    startTime: '09:30',
  });
  const occurrence: DateMovementOccurrenceTarget = {
    itemId: 'recurring-item',
    occurrenceId,
    seriesId: series.seriesId,
    revisionId: firstRevision.revisionId,
    originalDate: '2026-07-13',
    currentDate: '2026-07-13',
    executionState: 'pending',
    time: '09:30',
    durationMinutes: 30,
    timeZone: 'Asia/Seoul',
  };
  return {
    state: {
      identityNamespace: 'date-movement-fixture',
      items: [
        {
          itemId: 'recurring-item',
          title: 'Recurring item',
          schedule: {
            mode: 'fixed_date',
            date: '2026-07-13',
            time: '09:30',
            durationMinutes: 30,
            timeZone: 'Asia/Seoul',
            repeat: series,
          },
          dateOwnership: 'fixed',
          effectiveDate: '2026-07-13',
        },
      ],
      occurrenceExecutionRecords: [],
    },
    occurrence,
  };
}
