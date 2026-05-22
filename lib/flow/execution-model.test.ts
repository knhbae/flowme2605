import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getRepresentativeFlowSlugs,
  normalizeExecutionModel,
} from './execution-model';
import { seedBundles } from './seed-flows';

function bySlug(slug: string) {
  const bundle = seedBundles.find((item) => item.flow.slug === slug);
  assert.ok(bundle, slug);
  return bundle;
}

test('P0 representative flows are explicitly classified for landing and QA', () => {
  assert.deepEqual(getRepresentativeFlowSlugs(), [
    'moving-d30-basic',
    'used-car-buying-check',
    'running-5k-4week',
    'baby-food-menu-recipe',
    'overseas-travel-d14',
  ]);

  for (const slug of getRepresentativeFlowSlugs()) {
    assert.equal(normalizeExecutionModel(bySlug(slug)).exposureStatus, 'representative', slug);
  }
});

test('execution model maps representative flows to the correct UX views', () => {
  assert.equal(normalizeExecutionModel(bySlug('moving-d30-basic')).uxType, 'timeline');
  assert.deepEqual(normalizeExecutionModel(bySlug('moving-d30-basic')).views, [
    'list',
    'agenda',
    'month_calendar',
    'export_preview',
  ]);

  assert.equal(normalizeExecutionModel(bySlug('used-car-buying-check')).uxType, 'decision');
  assert.ok(normalizeExecutionModel(bySlug('used-car-buying-check')).views.includes('comparison_table'));
  assert.ok(!normalizeExecutionModel(bySlug('used-car-buying-check')).views.includes('month_calendar'));

  assert.equal(normalizeExecutionModel(bySlug('running-5k-4week')).uxType, 'program');
  assert.ok(normalizeExecutionModel(bySlug('running-5k-4week')).views.includes('routine_sessions'));
  assert.ok(normalizeExecutionModel(bySlug('running-5k-4week')).views.includes('month_calendar'));

  assert.equal(normalizeExecutionModel(bySlug('baby-food-menu-recipe')).uxType, 'meal_plan');
  assert.ok(normalizeExecutionModel(bySlug('baby-food-menu-recipe')).views.includes('agenda'));
});

test('preview and exact-video flows do not pollute representative landing set', () => {
  const preview = seedBundles.find((bundle) => bundle.flow.source_status === 'preview');
  assert.ok(preview);
  assert.equal(normalizeExecutionModel(preview).exposureStatus, 'catalog_preview');

  const exact = bySlug('real-thankyou-bubu-video-daily-stretch-9min');
  const model = normalizeExecutionModel(exact);
  assert.equal(model.uxType, 'mini_flow');
  assert.equal(model.exposureStatus, 'catalog_preview');
  assert.deepEqual(model.views, ['list', 'export_preview']);
});
