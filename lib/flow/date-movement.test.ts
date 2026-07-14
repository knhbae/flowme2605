import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyDateMovementPlan,
  planDateMovement,
  undoDateMovementPlan,
} from './date-movement';
import {
  buildDateMovementBaseState,
  buildDateMovementRecurringFixture,
  DATE_MOVEMENT_FIXTURE_TIMESTAMP,
} from './date-movement.fixtures';

test('anchor movement recalculates linked dates, keeps fixed dates, and is reversible', () => {
  const state = buildDateMovementBaseState();
  const plan = planDateMovement(state, {
    scope: 'anchor',
    operation: 'set_date',
    targetDate: '2026-04-01',
    updatedAt: DATE_MOVEMENT_FIXTURE_TIMESTAMP,
  });

  assert.equal(plan.canApply, true);
  assert.equal(plan.preview.counts.linkedRecalculatedCount, 1);
  assert.equal(plan.preview.counts.fixedKeptCount, 1);
  assert.equal(plan.preview.counts.unscheduledKeptCount, 1);
  assert.equal(plan.changes[0].beforeDate, '2026-03-04');
  assert.equal(plan.changes[0].afterDate, '2026-03-22');

  const applied = applyDateMovementPlan(state, plan);
  assert.equal(applied.anchorDate, '2026-04-01');
  assert.equal(applied.items[1].schedule?.mode, 'fixed_date');
  if (applied.items[1].schedule?.mode === 'fixed_date') {
    assert.equal(applied.items[1].schedule.date, '2026-03-08');
  }
  assert.deepEqual(undoDateMovementPlan(applied, plan), state);
});

test('selected target-date movement is atomic and converts linked and unscheduled items to fixed', () => {
  const state = buildDateMovementBaseState();
  const plan = planDateMovement(state, {
    scope: 'selected',
    operation: 'set_date',
    itemIds: ['linked-item', 'fixed-item', 'unscheduled-item', 'missing-item'],
    targetDate: '2026-04-05',
    updatedAt: DATE_MOVEMENT_FIXTURE_TIMESTAMP,
  });

  assert.equal(plan.canApply, true);
  assert.equal(plan.preview.isAtomic, true);
  assert.equal(plan.preview.counts.selectedCount, 3);
  assert.equal(plan.preview.counts.doneStateCount, 1);
  assert.equal(plan.preview.counts.skippedStateCount, 1);
  assert.ok(plan.warnings.includes('unknown_item_ignored:missing-item'));
  assert.ok(plan.nextState.items.every((item) => item.dateOwnership === 'fixed'));
  assert.ok(
    plan.nextState.items.every(
      (item) => item.schedule?.mode === 'fixed_date' && item.schedule.date === '2026-04-05',
    ),
  );
  assert.equal(plan.nextState.items[1].executionState, 'done');
  assert.equal(plan.nextState.items[2].executionState, 'skipped');
});

test('date removal keeps list exports eligible and removes Calendar and ICS eligibility', () => {
  const state = buildDateMovementBaseState();
  const plan = planDateMovement(state, {
    scope: 'single',
    operation: 'remove_date',
    itemIds: ['fixed-item'],
    updatedAt: DATE_MOVEMENT_FIXTURE_TIMESTAMP,
  });

  assert.equal(plan.canApply, true);
  assert.equal(plan.changes[0].afterOwnership, 'unscheduled');
  assert.equal(plan.changes[0].projectionEligibilityAfter.calendar, false);
  assert.equal(plan.changes[0].projectionEligibilityAfter.calendarIcs, false);
  assert.equal(plan.changes[0].projectionEligibilityAfter.checklist, true);
  assert.equal(plan.changes[0].projectionEligibilityAfter.sheet, true);
  assert.equal(plan.changes[0].projectionEligibilityAfter.memo, true);
});

test('plain-date shifting preserves local wall-clock time, duration, timezone, and execution state', () => {
  const state = buildDateMovementBaseState();
  const plan = planDateMovement(state, {
    scope: 'single',
    operation: 'shift_days',
    itemIds: ['fixed-item'],
    deltaDays: 2,
    updatedAt: DATE_MOVEMENT_FIXTURE_TIMESTAMP,
  });

  assert.equal(plan.canApply, true);
  const schedule = plan.nextState.items[1].schedule;
  assert.equal(schedule?.mode, 'fixed_date');
  if (schedule?.mode !== 'fixed_date') assert.fail('fixed schedule expected');
  assert.equal(schedule.date, '2026-03-10');
  assert.equal(schedule.time, '09:00');
  assert.equal(schedule.durationMinutes, 45);
  assert.equal(schedule.timeZone, 'America/New_York');
  assert.equal(plan.nextState.items[1].executionState, 'done');
});

test('selected delta movement blocks when any selected item is unscheduled', () => {
  const state = buildDateMovementBaseState();
  const plan = planDateMovement(state, {
    scope: 'selected',
    operation: 'shift_days',
    itemIds: ['fixed-item', 'unscheduled-item'],
    deltaDays: 3,
    updatedAt: DATE_MOVEMENT_FIXTURE_TIMESTAMP,
  });

  assert.equal(plan.canApply, false);
  assert.equal(plan.blockedReason, 'shift_requires_every_selected_item_to_have_a_date');
  assert.deepEqual(plan.nextState, state);
});

test('one recurring occurrence moves with stable occurrence identity and preserved completion state', () => {
  const { state, occurrence } = buildDateMovementRecurringFixture();
  occurrence.executionState = 'done';
  const plan = planDateMovement(state, {
    scope: 'occurrence',
    operation: 'set_date',
    targetDate: '2026-07-14',
    occurrence,
    updatedAt: DATE_MOVEMENT_FIXTURE_TIMESTAMP,
  });

  assert.equal(plan.canApply, true);
  assert.equal(plan.preview.counts.occurrenceChangedCount, 1);
  assert.equal(plan.preview.counts.doneStateCount, 1);
  assert.equal(plan.changes[0].occurrenceId, occurrence.occurrenceId);
  assert.equal(plan.changes[0].revisionIdAfter, occurrence.revisionId);
  assert.equal(plan.changes[0].executionState, 'done');
  const repeat = plan.nextState.items[0].schedule?.mode === 'fixed_date'
    ? plan.nextState.items[0].schedule.repeat
    : undefined;
  assert.ok(repeat && 'occurrenceOverrides' in repeat);
  if (!repeat || !('occurrenceOverrides' in repeat)) assert.fail('series expected');
  assert.equal(repeat.occurrenceOverrides[0].occurrenceId, occurrence.occurrenceId);
  assert.equal(repeat.occurrenceOverrides[0].schedule?.date, '2026-07-14');
});

test('future series movement creates a revision and keeps prior execution records untouched', () => {
  const { state, occurrence } = buildDateMovementRecurringFixture();
  const plan = planDateMovement(state, {
    scope: 'future_series',
    operation: 'shift_days',
    deltaDays: 2,
    occurrence,
    updatedAt: '2026-07-14T05:00:00.000Z',
  });

  assert.equal(plan.canApply, true);
  assert.equal(plan.preview.counts.seriesRevisionCount, 1);
  const repeat = plan.nextState.items[0].schedule?.mode === 'fixed_date'
    ? plan.nextState.items[0].schedule.repeat
    : undefined;
  assert.ok(repeat && 'revisions' in repeat);
  if (!repeat || !('revisions' in repeat)) assert.fail('series expected');
  assert.equal(repeat.revisions.length, 2);
  assert.equal(repeat.revisions[1].effectiveFrom, '2026-07-15');
  assert.equal(repeat.occurrenceOverrides.length, 1);
  assert.equal(repeat.occurrenceOverrides[0].mode, 'exclude');
  assert.match(repeat.occurrenceOverrides[0].occurrenceId, /2026-07-13T09:30$/);
  assert.deepEqual(plan.nextState.occurrenceExecutionRecords, []);
});

test('future-series movement to an earlier date blocks until a separate cutover contract exists', () => {
  const { state, occurrence } = buildDateMovementRecurringFixture();
  const plan = planDateMovement(state, {
    scope: 'future_series',
    operation: 'shift_days',
    deltaDays: -2,
    occurrence,
    updatedAt: '2026-07-14T05:00:00.000Z',
  });

  assert.equal(plan.canApply, false);
  assert.equal(
    plan.blockedReason,
    'backward_series_shift_requires_explicit_cutover_policy',
  );
});

test('series cutover from a done occurrence is blocked instead of losing history', () => {
  const { state, occurrence } = buildDateMovementRecurringFixture();
  occurrence.executionState = 'done';
  state.occurrenceExecutionRecords = [
    {
      occurrenceId: occurrence.occurrenceId,
      seriesId: occurrence.seriesId,
      revisionId: occurrence.revisionId,
      state: 'done',
      updatedAt: DATE_MOVEMENT_FIXTURE_TIMESTAMP,
      completedAt: DATE_MOVEMENT_FIXTURE_TIMESTAMP,
      history: [
        {
          from: 'pending',
          to: 'done',
          at: DATE_MOVEMENT_FIXTURE_TIMESTAMP,
        },
      ],
    },
  ];
  const plan = planDateMovement(state, {
    scope: 'future_series',
    operation: 'shift_days',
    deltaDays: 2,
    occurrence,
    updatedAt: '2026-07-14T05:00:00.000Z',
  });

  assert.equal(plan.canApply, false);
  assert.equal(
    plan.blockedReason,
    'series_cutover_requires_pending_or_reopened_occurrence',
  );
  assert.deepEqual(plan.nextState.occurrenceExecutionRecords, state.occurrenceExecutionRecords);
});

test('whole-series movement without execution history keeps stable series and revision identity', () => {
  const { state, occurrence } = buildDateMovementRecurringFixture();
  const beforeSchedule = state.items[0].schedule;
  const beforeSeries = beforeSchedule?.mode === 'fixed_date' && beforeSchedule.repeat && 'seriesId' in beforeSchedule.repeat
    ? beforeSchedule.repeat
    : undefined;
  assert.ok(beforeSeries);
  const plan = planDateMovement(state, {
    scope: 'whole_series',
    operation: 'set_date',
    targetDate: '2026-07-20',
    occurrence,
    updatedAt: '2026-07-14T06:00:00.000Z',
  });

  assert.equal(plan.canApply, true);
  const afterSchedule = plan.nextState.items[0].schedule;
  const afterSeries = afterSchedule?.mode === 'fixed_date' && afterSchedule.repeat && 'seriesId' in afterSchedule.repeat
    ? afterSchedule.repeat
    : undefined;
  assert.ok(afterSeries);
  assert.equal(afterSchedule?.mode === 'fixed_date' ? afterSchedule.date : undefined, '2026-07-20');
  assert.equal(afterSeries?.seriesId, beforeSeries?.seriesId);
  assert.equal(afterSeries?.revisions[0].revisionId, beforeSeries?.revisions[0].revisionId);
});

test('direct movement of recurring items is blocked until an occurrence or series scope is chosen', () => {
  const { state } = buildDateMovementRecurringFixture();
  const plan = planDateMovement(state, {
    scope: 'single',
    operation: 'set_date',
    itemIds: ['recurring-item'],
    targetDate: '2026-07-20',
    updatedAt: DATE_MOVEMENT_FIXTURE_TIMESTAMP,
  });

  assert.equal(plan.canApply, false);
  assert.equal(
    plan.blockedReason,
    'recurring_item_requires_occurrence_or_series_scope',
  );
});

test('apply rejects stale state and undo rejects a mismatched result', () => {
  const state = buildDateMovementBaseState();
  const plan = planDateMovement(state, {
    scope: 'single',
    operation: 'set_date',
    itemIds: ['fixed-item'],
    targetDate: '2026-04-05',
    updatedAt: DATE_MOVEMENT_FIXTURE_TIMESTAMP,
  });
  const stale = buildDateMovementBaseState();
  stale.items[1].title = 'Changed elsewhere';
  assert.throws(() => applyDateMovementPlan(stale, plan), /stale/);
  assert.throws(() => undoDateMovementPlan(state, plan), /does not match/);
});
