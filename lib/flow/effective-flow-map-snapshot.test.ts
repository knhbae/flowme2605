import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildEffectiveFlowMapPersistenceSelection,
  buildEffectiveFlowMapSnapshot,
  reviseEffectiveFlowMapSnapshot,
} from './effective-flow-map-snapshot';
import { buildSourceBackedFlowMapPublishPackage } from './source-backed-my-flow';

function getSaveAllPackage() {
  const publishPackage = buildSourceBackedFlowMapPublishPackage('middle-school-math-1');
  assert.ok(publishPackage);
  assert.equal(publishPackage.public.saveMode, 'save_all');
  return publishPackage;
}

test('requested Item order and session personalizations materialize without mutating the source baseline', () => {
  const publishPackage = getSaveAllPackage();
  const sourceBefore = JSON.stringify(publishPackage);
  const base = buildEffectiveFlowMapSnapshot({
    publishPackage,
    executionState: 'executable',
  });
  const identityBefore = structuredClone(base.identity);
  const canonicalRowsBefore = structuredClone(base.canonicalRows);
  const requested = [
    base.itemIds.canonical[2]!,
    base.itemIds.canonical[0]!,
    base.itemIds.canonical[1]!,
  ];
  const titleItem = requested[0];
  const detailItem = requested[2];
  const titleBaseline = base.canonicalRows.find((row) => row.itemId === titleItem)!;

  const revised = reviseEffectiveFlowMapSnapshot(base, {
    effectiveTitle: '내 중학 수학 계획',
    selectedItemIds: requested,
    itemPersonalizations: {
      [titleItem]: {
        title: '내 순서로 소인수분해 복습',
        detail: '오답 두 문제를 다시 푼다.',
        date: '2026-08-24',
      },
      [detailItem]: { detail: '개념 노트를 먼저 확인한다.' },
    },
  });

  assert.deepEqual(revised.itemIds.requested, requested);
  assert.deepEqual(revised.itemIds.effective, requested);
  assert.deepEqual(revised.rows.map((row) => row.itemId), requested);
  assert.equal(revised.rows[0]?.title, '내 순서로 소인수분해 복습');
  assert.equal(revised.rows[0]?.memo, '오답 두 문제를 다시 푼다.');
  assert.equal(revised.rows[0]?.date, '2026-08-24');
  assert.equal(
    revised.canonicalRows.find((row) => row.itemId === titleItem)?.title,
    titleBaseline.title,
  );
  assert.equal(
    revised.canonicalRows.find((row) => row.itemId === titleItem)?.date,
    undefined,
  );
  assert.deepEqual(revised.identity, identityBefore);
  assert.deepEqual(revised.canonicalRows, canonicalRowsBefore);
  assert.equal(JSON.stringify(publishPackage), sourceBefore);
  assert.notEqual(revised.snapshotHash, base.snapshotHash);

  const persistence = buildEffectiveFlowMapPersistenceSelection(revised);
  const requestedRows = requested.map(
    (itemId) => base.canonicalRows.find((row) => row.itemId === itemId)!,
  );
  const flowSlug = requestedRows[0]!.flowSlug;
  assert.deepEqual(
    persistence.includedStepIdsByFlow[flowSlug],
    requestedRows.map((row) => row.stepId),
  );
  assert.deepEqual(persistence.selectedItemIds, requested);
  assert.deepEqual(
    persistence.stepOverridesByFlow[flowSlug]?.[requestedRows[0]!.stepId],
    {
      title: '내 순서로 소인수분해 복습',
      userMemo: '오답 두 문제를 다시 푼다.',
      schedule: { mode: 'fixed_date', date: '2026-08-24' },
    },
  );
  assert.deepEqual(
    persistence.stepOverridesByFlow[flowSlug]?.[requestedRows[2]!.stepId],
    { userMemo: '개념 노트를 먼저 확인한다.' },
  );
  assert.deepEqual(
    persistence.personalCopy.stepOverridesByFlow,
    persistence.stepOverridesByFlow,
  );
  assert.equal(persistence.personalized, true);
});

test('order-only changes remain personalized and keep each Flow array in requested order', () => {
  const publishPackage = getSaveAllPackage();
  const base = buildEffectiveFlowMapSnapshot({
    publishPackage,
    executionState: 'executable',
  });
  const requested = [...base.itemIds.canonical].reverse();
  const revised = reviseEffectiveFlowMapSnapshot(base, {
    selectedItemIds: [...requested, requested[0]!],
  });
  const persistence = buildEffectiveFlowMapPersistenceSelection(revised);
  const flowSlug = base.canonicalRows[0]!.flowSlug;

  assert.deepEqual(revised.itemIds.effective, requested);
  assert.deepEqual(
    persistence.includedStepIdsByFlow[flowSlug],
    requested.map((itemId) => base.canonicalRows.find((row) => row.itemId === itemId)!.stepId),
  );
  assert.deepEqual(persistence.stepOverridesByFlow, {});
  assert.equal(persistence.personalCopy.stepOverridesByFlow, undefined);
  assert.equal(persistence.personalized, true);
});

test('an excluded Item keeps its private value override outside the inclusion owner', () => {
  const publishPackage = getSaveAllPackage();
  const base = buildEffectiveFlowMapSnapshot({
    publishPackage,
    executionState: 'executable',
  });
  const excludedItemId = base.itemIds.canonical.at(-1)!;
  const excludedRow = base.canonicalRows.find((row) => row.itemId === excludedItemId)!;
  const revised = reviseEffectiveFlowMapSnapshot(base, {
    selectedItemIds: base.itemIds.canonical.slice(0, -1),
    itemPersonalizations: {
      [excludedItemId]: { title: '나중에 다시 볼 단원', detail: '보충 학습 뒤 다시 포함' },
    },
  });

  const persistence = buildEffectiveFlowMapPersistenceSelection(revised);
  assert.ok(revised.itemIds.excluded.includes(excludedItemId));
  assert.deepEqual(
    persistence.stepOverridesByFlow[excludedRow.flowSlug]?.[excludedRow.stepId],
    { title: '나중에 다시 볼 단원', userMemo: '보충 학습 뒤 다시 포함' },
  );
  assert.deepEqual(
    persistence.personalCopy.stepOverridesByFlow,
    persistence.stepOverridesByFlow,
  );
});

test('Item personalization patches can be cleared and reject unknown IDs or invalid dates', () => {
  const publishPackage = getSaveAllPackage();
  const base = buildEffectiveFlowMapSnapshot({
    publishPackage,
    executionState: 'executable',
  });
  const itemId = base.itemIds.canonical[0]!;
  const baselineTitle = base.canonicalRows[0]!.title;
  const personalized = reviseEffectiveFlowMapSnapshot(base, {
    itemPersonalizations: {
      [itemId]: { title: '개인 제목', detail: '개인 메모', date: '2026-08-25' },
    },
  });
  const cleared = reviseEffectiveFlowMapSnapshot(personalized, {
    itemPersonalizations: { [itemId]: null },
  });

  assert.deepEqual(cleared.itemPersonalizations, {});
  assert.equal(cleared.rows[0]?.title, baselineTitle);
  assert.equal(cleared.rows[0]?.date, undefined);
  assert.throws(
    () => reviseEffectiveFlowMapSnapshot(base, {
      itemPersonalizations: { 'unknown::step': { title: '알 수 없음' } },
    }),
    /Unknown Flow Map item ID/u,
  );
  assert.throws(
    () => reviseEffectiveFlowMapSnapshot(base, {
      itemPersonalizations: { [itemId]: { date: '2026-02-30' } },
    }),
    /must be YYYY-MM-DD/u,
  );
  assert.equal(base.rows[0]?.title, baselineTitle);
  assert.deepEqual(base.itemPersonalizations, {});
});
