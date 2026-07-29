import assert from 'node:assert/strict';
import test from 'node:test';

import { buildFlowExperienceProjection } from './flow-experience-projection';
import { seedBundles } from './seed-flows';
import { sourceBackedMyFlowBundles } from './source-backed-my-flow';
import type { FlowBundle } from './types';

function bySlug(slug: string): FlowBundle {
  const bundle = [...seedBundles, ...sourceBackedMyFlowBundles].find((entry) => entry.flow.slug === slug);
  assert.ok(bundle, `missing fixture ${slug}`);
  return bundle;
}

test('timeline projection uses one ordered row set for outline and artifact shapes', () => {
  const bundle = bySlug('moving-d30-basic');
  const sourceSnapshot = JSON.stringify(bundle);
  const projection = buildFlowExperienceProjection(bundle, { anchor: '2030-08-15' });

  assert.equal(projection.primaryShape, 'calendar');
  assert.deepEqual(projection.secondaryShapes, ['checklist']);
  assert.equal(projection.outlineRows.length, 24);
  assert.equal(projection.shapes.calendar.count, 24);
  assert.equal(projection.shapes.checklist.count, 24);
  assert.equal(projection.shapes.memo.count, 24);
  assert.equal(projection.sourceMutationCount, 0);
  assert.equal(JSON.stringify(bundle), sourceSnapshot);
});

test('vehicle inspection keeps ten undated items in its natural checklist result', () => {
  const bundle = bySlug('vehicle-inspection-prep');
  const sourceSnapshot = JSON.stringify(bundle);
  const projection = buildFlowExperienceProjection(bundle);

  assert.equal(projection.primaryShape, 'checklist');
  assert.equal(projection.outlineRows.length, 10);
  assert.equal(projection.shapes.checklist.count, 10);
  assert.equal(projection.shapes.calendar.count, 0);
  assert.equal(projection.outlineRows.every((row) => row.schedule.state === 'unscheduled'), true);
  assert.equal(JSON.stringify(bundle), sourceSnapshot);
});

test('personal value and order overrides are reflected without changing stable identity', () => {
  const bundle = bySlug('moving-d30-basic');
  const [first, second] = bundle.items;
  const projection = buildFlowExperienceProjection(bundle, {
    anchor: '2030-08-15',
    orderOverride: [second.id, first.id],
    itemOverrides: {
      [first.id]: { title: '내 이사 방식 확정', date: '2030-08-01', memo: '가족과 확인' },
    },
  });

  assert.equal(projection.outlineRows[0].id, second.id);
  const edited = projection.outlineRows.find((row) => row.id === first.id);
  assert.equal(edited?.title, '내 이사 방식 확정');
  assert.equal(edited?.memo, '가족과 확인');
  assert.equal(edited?.schedule.date, '2030-08-01');
  assert.equal(edited?.sourceItemId, first.id);
});

test('excluded items leave every visible destination without deleting the source item', () => {
  const bundle = bySlug('vehicle-inspection-prep');
  const excludedId = bundle.items[0].id;
  const projection = buildFlowExperienceProjection(bundle, {
    anchor: '2030-08-15',
    excludedItemIds: [excludedId],
  });

  assert.equal(projection.excludedRows.length, 1);
  assert.equal(projection.excludedRows[0].id, excludedId);
  for (const shape of Object.values(projection.shapes)) {
    assert.equal(shape.rows.some((row) => row.id === excludedId), false);
  }
  assert.equal(bundle.items.some((item) => item.id === excludedId), true);
});

test('resource and warning roles stay visible but are not completion or calendar rows', () => {
  const base = bySlug('moving-d30-basic');
  const fixture: FlowBundle = {
    ...base,
    flow: { ...base.flow, id: 'role-fixture', slug: 'role-fixture' },
    sections: [{ id: 'role-section', flow_id: 'role-fixture', title: '자료와 주의', order: 1 }],
    items: [
      { id: 'action', flow_id: 'role-fixture', section_id: 'role-section', title: '실행하기', type: 'calendar', day_offset: 0, order: 1, role: 'action' },
      { id: 'resource', flow_id: 'role-fixture', section_id: 'role-section', title: '공식 안내', type: 'todo', order: 2, role: 'resource' },
      { id: 'warning', flow_id: 'role-fixture', section_id: 'role-section', title: '중단 기준', type: 'todo', order: 3, role: 'warning' },
    ],
    itemDetails: [
      { item_id: 'resource', links: [{ label: '원문', url: 'https://example.com', type: 'official' }] },
      { item_id: 'warning', caution: '통증이 있으면 중단합니다.' },
    ],
  };
  const projection = buildFlowExperienceProjection(fixture, { anchor: '2030-08-15' });

  assert.equal(projection.outlineRows.length, 3);
  assert.equal(projection.outlineRows.find((row) => row.id === 'resource')?.completable, false);
  assert.equal(projection.outlineRows.find((row) => row.id === 'warning')?.completable, false);
  assert.deepEqual(projection.shapes.calendar.rows.map((row) => row.id), ['action']);
  assert.deepEqual(projection.shapes.checklist.rows.map((row) => row.id), ['action']);
  assert.deepEqual(projection.shapes.memo.rows.map((row) => row.id), ['action', 'resource', 'warning']);
});

test('routine projection selects Flow execution and keeps completion outside membership', () => {
  const bundle = bySlug('curated-allblanc-morning-workout');
  const firstId = bundle.items[0].id;
  const pending = buildFlowExperienceProjection(bundle, { anchor: '2030-08-15' });
  const completed = buildFlowExperienceProjection(bundle, { anchor: '2030-08-15', completedItemIds: [firstId] });

  assert.equal(pending.primaryShape, 'flow_execution');
  assert.equal(completed.outlineRows.length, pending.outlineRows.length);
  assert.equal(completed.outlineRows[0].completed, true);
  assert.equal(completed.outlineRows[0].id, pending.outlineRows[0].id);
});

test('explicit content-native destinations win over legacy visual surface fallbacks', () => {
  const course = buildFlowExperienceProjection(bySlug('source-backed-middle-school-math-1'));
  const safetyChecklist = buildFlowExperienceProjection(bySlug('overseas-safety-register'));

  assert.equal(course.primaryShape, 'sheet');
  assert.deepEqual(course.secondaryShapes, ['checklist']);
  assert.equal(course.shapes.sheet.count, 8);
  assert.equal(safetyChecklist.primaryShape, 'checklist');
  assert.deepEqual(safetyChecklist.secondaryShapes, ['memo']);
  assert.equal(safetyChecklist.shapes.checklist.count, 4);
  assert.equal(safetyChecklist.shapes.memo.count, 4);
});

test('five content-native shapes are backed by real representative Flow rows', () => {
  const representatives = [
    ['curated-allblanc-morning-workout', 'flow_execution', '2030-08-15'],
    ['moving-d30-basic', 'calendar', '2030-08-15'],
    ['used-car-buying-check', 'checklist', undefined],
    ['source-backed-middle-school-math-1', 'sheet', undefined],
    ['overseas-safety-register', 'checklist', undefined],
  ] as const;

  for (const [slug, expectedShape, anchor] of representatives) {
    const bundle = bySlug(slug);
    const projection = buildFlowExperienceProjection(bundle, anchor ? { anchor } : {});
    assert.equal(projection.primaryShape, expectedShape, slug);
    assert.ok(projection.shapes[expectedShape].count > 0, `${slug} must project actual rows`);
    assert.ok(projection.secondaryShapes.length <= 2, `${slug} secondary action budget`);
    assert.equal(
      projection.shapes[expectedShape].rows.every((row) => bundle.items.some((item) => item.id === row.sourceItemId)),
      true,
      `${slug} rows keep source identity`,
    );
  }
});

test('unknown order IDs and invalid dates do not remove valid items', () => {
  const bundle = bySlug('moving-d30-basic');
  const firstId = bundle.items[0].id;
  const projection = buildFlowExperienceProjection(bundle, {
    anchor: 'invalid',
    orderOverride: ['unknown', firstId, firstId],
    itemOverrides: { [firstId]: { date: '2030-99-99' } },
  });

  assert.equal(projection.outlineRows.length, bundle.items.length);
  assert.equal(projection.outlineRows.find((row) => row.id === firstId)?.schedule.state, 'unscheduled');
  assert.equal(projection.shapes.calendar.count, 0);
});
