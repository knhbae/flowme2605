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
    canSave: true,
    calendarEligible: false,
    previewOnly: true,
  });
  assert.equal(shouldPersistPublicDateIntent('example'), false);
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
});

test('public date intent keeps undated and no-anchor saves out of Calendar', () => {
  for (const resolution of [
    resolvePublicDateIntent({
      anchorType: 'target_date',
      mode: 'undated',
      customAnchor: '2026-08-20',
      exampleAnchor: '2026-08-19',
    }),
    resolvePublicDateIntent({
      anchorType: 'none',
      mode: 'custom',
      customAnchor: '2026-08-20',
      exampleAnchor: '2026-08-19',
    }),
  ]) {
    assert.equal(resolution.persistedMode, 'undated');
    assert.equal(resolution.previewAnchor, '');
    assert.equal(resolution.savedAnchor, undefined);
    assert.equal(resolution.calendarEligible, false);
    assert.equal(resolution.canSave, true);
  }
});

test('public date intent migrates legacy undecided mode and rejects malformed dates', () => {
  assert.equal(normalizePublicDateIntentMode('undecided'), 'undated');
  assert.equal(normalizePublicDateIntentMode('undated'), 'undated');
  assert.equal(normalizePublicDateIntentMode('unknown'), 'example');
  assert.equal(isValidPublicAnchorDate('2026-02-29'), false);
  assert.equal(isValidPublicAnchorDate('2028-02-29'), true);
  assert.equal(isValidPublicAnchorDate('2026-2-09'), false);
});
