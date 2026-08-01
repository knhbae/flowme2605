import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isValidPublicAnchorDate,
  normalizePublicDateIntentMode,
  resolvePublicDateIntent,
  shouldPersistPublicDateIntent,
} from './public-date-intent';

test('public date intent keeps example dates preview-only', () => {
  const resolution = resolvePublicDateIntent({
    anchorType: 'target_date',
    mode: 'example',
    customAnchor: '',
    exampleAnchor: '2026-08-19',
  });

  assert.deepEqual(resolution, {
    mode: 'example',
    persistedMode: 'undated',
    previewAnchor: '2026-08-19',
    previewScheduleState: 'provisional',
    primaryAction: {
      kind: 'focus_date',
      canCommit: false,
    },
    allowExplicitUndatedSave: true,
    canSave: false,
    calendarEligible: false,
    previewOnly: true,
  });
  assert.equal(shouldPersistPublicDateIntent('example'), false);
});

test('public date intent keeps a malformed example provisional without inventing a date', () => {
  const resolution = resolvePublicDateIntent({
    anchorType: 'target_date',
    mode: 'example',
    customAnchor: '',
    exampleAnchor: '2026-02-30',
  });

  assert.equal(resolution.previewAnchor, '');
  assert.equal(resolution.previewScheduleState, 'provisional');
  assert.deepEqual(resolution.primaryAction, {
    kind: 'focus_date',
    canCommit: false,
  });
  assert.equal(resolution.allowExplicitUndatedSave, true);
  assert.equal(resolution.canSave, false);
  assert.equal(resolution.savedAnchor, undefined);
});

test('public date intent persists only valid custom dates', () => {
  assert.deepEqual(
    resolvePublicDateIntent({
      anchorType: 'target_date',
      mode: 'custom',
      customAnchor: '2026-08-20',
      exampleAnchor: '2026-08-19',
    }),
    {
      mode: 'custom',
      persistedMode: 'custom',
      previewAnchor: '2026-08-20',
      savedAnchor: '2026-08-20',
      previewScheduleState: 'committed',
      primaryAction: {
        kind: 'save_custom',
        canCommit: true,
        persistedMode: 'custom',
      },
      allowExplicitUndatedSave: true,
      canSave: true,
      calendarEligible: true,
      previewOnly: false,
    },
  );

  const blank = resolvePublicDateIntent({
    anchorType: 'target_date',
    mode: 'custom',
    customAnchor: '',
    exampleAnchor: '2026-08-19',
  });
  assert.equal(blank.canSave, false);
  assert.equal(blank.savedAnchor, undefined);
  assert.equal(blank.calendarEligible, false);
  assert.equal(blank.previewScheduleState, 'missing');
  assert.deepEqual(blank.primaryAction, {
    kind: 'focus_date',
    canCommit: false,
  });
  assert.equal(blank.allowExplicitUndatedSave, true);

  const malformed = resolvePublicDateIntent({
    anchorType: 'target_date',
    mode: 'custom',
    customAnchor: '2026-02-30',
    exampleAnchor: '2026-08-19',
  });
  assert.equal(malformed.previewScheduleState, 'missing');
  assert.equal(malformed.canSave, false);
  assert.equal(malformed.savedAnchor, undefined);
  assert.deepEqual(malformed.primaryAction, {
    kind: 'focus_date',
    canCommit: false,
  });
});

test('public date intent keeps undated and no-anchor saves out of Calendar', () => {
  const undated = resolvePublicDateIntent({
    anchorType: 'target_date',
    mode: 'undated',
    customAnchor: '2026-08-20',
    exampleAnchor: '2026-08-19',
  });
  const noAnchor = resolvePublicDateIntent({
    anchorType: 'none',
    mode: 'custom',
    customAnchor: '2026-08-20',
    exampleAnchor: '2026-08-19',
  });

  for (const resolution of [undated, noAnchor]) {
    assert.equal(resolution.persistedMode, 'undated');
    assert.equal(resolution.previewAnchor, '');
    assert.equal(resolution.savedAnchor, undefined);
    assert.equal(resolution.calendarEligible, false);
    assert.equal(resolution.canSave, true);
  }

  assert.equal(undated.previewScheduleState, 'undated');
  assert.deepEqual(undated.primaryAction, {
    kind: 'save_undated',
    canCommit: true,
    persistedMode: 'undated',
  });
  assert.equal(undated.allowExplicitUndatedSave, false);

  assert.equal(noAnchor.mode, 'undated');
  assert.equal(noAnchor.previewScheduleState, 'not_applicable');
  assert.deepEqual(noAnchor.primaryAction, {
    kind: 'save_undated',
    canCommit: true,
    persistedMode: 'undated',
  });
  assert.equal(noAnchor.allowExplicitUndatedSave, false);
});

test('public date intent migrates legacy undecided mode and rejects malformed dates', () => {
  assert.equal(normalizePublicDateIntentMode('undecided'), 'undated');
  assert.equal(normalizePublicDateIntentMode('undated'), 'undated');
  assert.equal(normalizePublicDateIntentMode('unknown'), 'example');
  assert.equal(isValidPublicAnchorDate('2026-02-29'), false);
  assert.equal(isValidPublicAnchorDate('2028-02-29'), true);
  assert.equal(isValidPublicAnchorDate('2026-2-09'), false);
});

test('only persisted public date intent modes are storage eligible', () => {
  assert.equal(shouldPersistPublicDateIntent('custom'), true);
  assert.equal(shouldPersistPublicDateIntent('undated'), true);
  assert.equal(shouldPersistPublicDateIntent('example'), false);
});
