import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getFlowItemUserNote,
  isFlowItemOmittedFromActiveProjection,
  isFlowItemPersonallyExcluded,
  isLegacyPersonalExclusionState,
  setFlowItemPersonalExclusion,
} from './flow-item-state';

test('P33-EXCLUSION-NOTE-SEPARATION preserves a personal note across exclude and restore', () => {
  const excluded = setFlowItemPersonalExclusion(
    { note: '관리실 예약번호 1234', personalOrder: 2 },
    true,
  );

  assert.deepEqual(excluded, {
    note: '관리실 예약번호 1234',
    personalOrder: 2,
    personalExcluded: true,
  });
  assert.equal(isFlowItemPersonallyExcluded(excluded), true);
  assert.equal(getFlowItemUserNote(excluded), '관리실 예약번호 1234');

  const restored = setFlowItemPersonalExclusion(excluded, false);
  assert.deepEqual(restored, {
    note: '관리실 예약번호 1234',
    personalOrder: 2,
  });
});

test('P33-LEGACY-SENTINEL-SAFE-READ treats the old sentinel as exclusion without exporting it as a note', () => {
  const legacy = { skipped: true, note: 'excluded_on_start' };

  assert.equal(isLegacyPersonalExclusionState(legacy), true);
  assert.equal(isFlowItemPersonallyExcluded(legacy), true);
  assert.equal(getFlowItemUserNote(legacy), undefined);
  assert.deepEqual(setFlowItemPersonalExclusion(legacy, true), { personalExcluded: true });
  assert.equal(setFlowItemPersonalExclusion(legacy, false), undefined);
});

test('execution skip remains distinct from personal exclusion', () => {
  const skipped = { skipped: true, note: '이번 회차만 쉬었음' };

  assert.equal(isFlowItemPersonallyExcluded(skipped), false);
  assert.equal(isFlowItemOmittedFromActiveProjection(skipped), true);
  assert.deepEqual(setFlowItemPersonalExclusion(skipped, true), {
    skipped: true,
    note: '이번 회차만 쉬었음',
    personalExcluded: true,
  });
  assert.deepEqual(
    setFlowItemPersonalExclusion(
      { skipped: true, note: '이번 회차만 쉬었음', personalExcluded: true },
      false,
    ),
    skipped,
  );
});
