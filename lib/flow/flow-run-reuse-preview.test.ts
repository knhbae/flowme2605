import assert from 'node:assert/strict';
import test from 'node:test';
import { buildFlowRunReusePreview } from './flow-run-reuse-preview';

const currentRows = [
  { id: 'quote', date: '2026-07-11' },
  { id: 'utility', date: '2026-08-03' },
  { id: 'move', date: '2026-08-10' },
];
const nextRows = [
  { id: 'quote', date: '2026-09-21' },
  { id: 'utility', date: '2026-10-13' },
  { id: 'move', date: '2026-10-20' },
];

test('dated reuse previews an independent run and every anchor-linked date change', () => {
  assert.deepEqual(
    buildFlowRunReusePreview({
      requiresAnchor: true,
      currentAnchor: '2026-08-10',
      nextAnchor: '2026-10-20',
      currentRows,
      nextRows,
      fixedDateOverrideCount: 0,
    }),
    {
      ready: true,
      currentAnchor: '2026-08-10',
      nextAnchor: '2026-10-20',
      currentRange: { start: '2026-07-11', end: '2026-08-10' },
      nextRange: { start: '2026-09-21', end: '2026-10-20' },
      linkedDateChangeCount: 3,
      nextDatedItemCount: 3,
      nextUndatedItemCount: 0,
      fixedDateOutcome: 'not_needed',
      retainedFixedDateOverrideCount: 0,
      resetFixedDateOverrideCount: 0,
      createsIndependentRun: true,
      preservesPreviousRun: true,
      resetsCompletion: true,
    },
  );
});

test('fixed personal dates require an explicit keep or reset choice', () => {
  const awaiting = buildFlowRunReusePreview({
    requiresAnchor: true,
    currentAnchor: '2026-08-10',
    nextAnchor: '2026-10-20',
    currentRows,
    nextRows,
    fixedDateOverrideCount: 2,
  });
  assert.equal(awaiting.fixedDateOutcome, 'awaiting_choice');
  assert.equal(awaiting.retainedFixedDateOverrideCount, 0);
  assert.equal(awaiting.resetFixedDateOverrideCount, 0);

  const kept = buildFlowRunReusePreview({
    requiresAnchor: true,
    currentAnchor: '2026-08-10',
    nextAnchor: '2026-10-20',
    currentRows,
    nextRows,
    fixedDateOverrideCount: 2,
    fixedDatePolicy: 'keep_fixed_dates',
  });
  assert.equal(kept.fixedDateOutcome, 'kept');
  assert.equal(kept.retainedFixedDateOverrideCount, 2);

  const reset = buildFlowRunReusePreview({
    requiresAnchor: true,
    currentAnchor: '2026-08-10',
    nextAnchor: '2026-10-20',
    currentRows,
    nextRows,
    fixedDateOverrideCount: 2,
    fixedDatePolicy: 'reset_to_anchor',
  });
  assert.equal(reset.fixedDateOutcome, 'reset');
  assert.equal(reset.resetFixedDateOverrideCount, 2);
});

test('an invalid next anchor keeps the preview unready without dropping rows', () => {
  const preview = buildFlowRunReusePreview({
    requiresAnchor: true,
    currentAnchor: '2026-08-10',
    nextAnchor: '2026/10/20',
    currentRows,
    nextRows: [],
    fixedDateOverrideCount: 0,
  });
  assert.equal(preview.ready, false);
  assert.equal(preview.currentRange?.start, '2026-07-11');
  assert.equal(preview.nextDatedItemCount, 0);
});

test('date-free reuse preserves the item set while starting a clean run', () => {
  const rows = [
    { id: 'passport', date: null },
    { id: 'photo', date: null },
    { id: 'payment', date: null },
  ];
  const preview = buildFlowRunReusePreview({
    requiresAnchor: false,
    currentRows: rows,
    nextRows: rows,
    fixedDateOverrideCount: 0,
  });
  assert.equal(preview.ready, true);
  assert.equal(preview.linkedDateChangeCount, 0);
  assert.equal(preview.nextUndatedItemCount, 3);
  assert.equal(preview.preservesPreviousRun, true);
  assert.equal(preview.resetsCompletion, true);
});
