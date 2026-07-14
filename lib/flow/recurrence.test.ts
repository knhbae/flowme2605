import assert from 'node:assert/strict';
import test from 'node:test';
import { expandRoutineOccurrences, getRoutineWeekdayLabels } from './recurrence';
import {
  expandSavedRoutineOccurrenceRows,
  resolveSavedRoutineRecurrence,
} from './saved-routine-occurrence';
import { transitionPersonalStructuralOccurrenceExecution } from './personal-structural-occurrence';

test('weekly routine expands selected weekdays across the preview window', () => {
  const occurrences = expandRoutineOccurrences({
    startDate: '2026-06-01',
    repeatLabel: '주 3회',
    weekdays: ['월', '수', '금'],
    weeks: 2,
  });

  assert.deepEqual(occurrences.map((item) => item.date), [
    '2026-06-01',
    '2026-06-03',
    '2026-06-05',
    '2026-06-08',
    '2026-06-10',
    '2026-06-12',
  ]);
});

test('daily routine expands every day', () => {
  const occurrences = expandRoutineOccurrences({
    startDate: '2026-06-01',
    repeatLabel: '매일 30분',
    weekdays: ['월', '수', '금'],
    weeks: 1,
  });

  assert.equal(occurrences.length, 7);
  assert.equal(occurrences[6].date, '2026-06-07');
});

test('weekday label helper falls back to sensible defaults', () => {
  assert.deepEqual(getRoutineWeekdayLabels('주 3회', []), ['월', '수', '금']);
  assert.deepEqual(getRoutineWeekdayLabels('매일', []), ['월', '화', '수', '목', '금', '토', '일']);
  assert.deepEqual(getRoutineWeekdayLabels('월 1회', []), ['월']);
});

test('saved source routine expands the selected four-week cadence into stable occurrences', () => {
  const rows = [{
    id: 'allblanc-morning-run',
    date: '2026-07-15',
    title: '아침 5분 전신 운동 영상 열기',
  }];
  const expanded = expandSavedRoutineOccurrenceRows({
    identityNamespace: 'curated-allblanc-morning-workout',
    rows,
    definitions: {
      'allblanc-morning-run': {
        itemId: 'allblanc-morning-run',
        startDate: '2026-07-15',
        sourceRepeatRule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
        selectedWeekdays: ['월', '수', '금'],
        projectionWeeks: 4,
      },
    },
    range: { start: '2026-07-15', end: '2026-09-15' },
  });

  assert.equal(expanded.length, 12);
  assert.deepEqual(expanded.slice(0, 3).map((row) => row.date), [
    '2026-07-15',
    '2026-07-17',
    '2026-07-20',
  ]);
  assert.equal(new Set(expanded.map((row) => row.structuralOccurrenceId)).size, 12);
  assert.ok(expanded.every((row) => row.structuralOccurrenceOrigin === 'saved_routine'));
  assert.deepEqual(rows, [{
    id: 'allblanc-morning-run',
    date: '2026-07-15',
    title: '아침 5분 전신 운동 영상 열기',
  }]);
});

test('saved routine selected weekdays override the published example without changing series identity', () => {
  const first = resolveSavedRoutineRecurrence({
    itemId: 'workout',
    startDate: '2026-07-15',
    sourceRepeatRule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
    selectedWeekdays: ['월', '목', '금'],
  }, 'saved-flow');
  const second = resolveSavedRoutineRecurrence({
    itemId: 'workout',
    startDate: '2026-07-15',
    sourceRepeatRule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
    selectedWeekdays: ['월', '목', '금'],
  }, 'saved-flow');

  assert.deepEqual(first.series?.revisions[0].rule.weekdays, ['MO', 'TH', 'FR']);
  assert.equal(first.series?.seriesId, second.series?.seriesId);
  assert.equal(first.series?.revisions[0].revisionId, second.series?.revisions[0].revisionId);
});

test('saved routine completion and date movement affect one occurrence without changing sibling membership', () => {
  const definition = {
    itemId: 'routine-item',
    startDate: '2026-07-15',
    sourceRepeatRule: 'FREQ=DAILY;COUNT=3',
  };
  const pending = expandSavedRoutineOccurrenceRows({
    identityNamespace: 'saved-routine-flow',
    rows: [{ id: 'routine-item', date: '2026-07-15' }],
    definitions: { 'routine-item': definition },
    range: { start: '2026-07-15', end: '2026-07-20' },
  });
  const first = pending[0];
  const completed = transitionPersonalStructuralOccurrenceExecution({
    occurrenceId: first.structuralOccurrenceId as string,
    seriesId: first.structuralOccurrenceSeriesId as string,
    revisionId: first.structuralOccurrenceRevisionId as string,
    nextState: 'done',
    at: '2026-07-15T01:00:00.000Z',
  });
  const projected = expandSavedRoutineOccurrenceRows({
    identityNamespace: 'saved-routine-flow',
    rows: [{ id: 'routine-item', date: '2026-07-15' }],
    definitions: { 'routine-item': definition },
    range: { start: '2026-07-15', end: '2026-07-20' },
    executionRecords: [completed],
    resolveOccurrenceDate: ({ originalDate }) => ({
      date: originalDate === '2026-07-16' ? '2026-07-19' : originalDate,
      overrideKey: `routine-item:${originalDate}`,
    }),
  });

  assert.equal(projected.length, 3);
  assert.equal(projected[0].structuralOccurrenceExecutionState, 'done');
  assert.ok(projected.slice(1).every((row) => row.structuralOccurrenceExecutionState === 'pending'));
  assert.equal(projected[1].date, '2026-07-19');
  assert.equal(projected[1].structuralOccurrenceId, pending[1].structuralOccurrenceId);
  assert.equal(projected[1].structuralOccurrenceDateOverrideKey, 'routine-item:2026-07-16');
});
