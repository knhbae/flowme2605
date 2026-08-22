import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getRepresentativeFlowSlugs,
  normalizeExecutionModel,
} from './execution-model';
import { getPreviewFlowBundles } from './creator-channel-preview';
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
    'wedding-d180-basic',
    'english-study-30day-routine',
  ]);

  for (const slug of getRepresentativeFlowSlugs()) {
    assert.equal(normalizeExecutionModel(bySlug(slug)).exposureStatus, 'representative', slug);
  }
  assert.equal(normalizeExecutionModel(bySlug('baby-food-menu-recipe')).exposureStatus, 'catalog_preview');
});

test('source-fit audit decisions gate public exposure without removing direct access', () => {
  assert.equal(normalizeExecutionModel(bySlug('study-exam-d30-plan')).exposureStatus, 'catalog_preview');

  for (const slug of [
    'running-5k-4week',
    'overseas-travel-d14',
    'home-workout-20min',
    'car-care-monthly-routine',
  ]) {
    const model = normalizeExecutionModel(bySlug(slug));
    assert.equal(model.exposureStatus, 'source_review', slug);
    assert.ok(model.migrationGaps.includes('source_fit_reshape_needed'), slug);
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

  assert.equal(normalizeExecutionModel(bySlug('used-car-buying-check')).uxType, 'checklist');
  assert.ok(!normalizeExecutionModel(bySlug('used-car-buying-check')).views.includes('comparison_table'));
  assert.ok(!normalizeExecutionModel(bySlug('used-car-buying-check')).views.includes('month_calendar'));

  assert.equal(normalizeExecutionModel(bySlug('running-5k-4week')).uxType, 'program');
  assert.ok(normalizeExecutionModel(bySlug('running-5k-4week')).views.includes('routine_sessions'));
  assert.ok(normalizeExecutionModel(bySlug('running-5k-4week')).views.includes('month_calendar'));

  assert.equal(normalizeExecutionModel(bySlug('baby-food-menu-recipe')).uxType, 'meal_plan');
  assert.ok(normalizeExecutionModel(bySlug('baby-food-menu-recipe')).views.includes('agenda'));

  assert.equal(normalizeExecutionModel(bySlug('wedding-d180-basic')).uxType, 'decision');
  assert.ok(normalizeExecutionModel(bySlug('wedding-d180-basic')).views.includes('comparison_table'));
  assert.ok(normalizeExecutionModel(bySlug('wedding-d180-basic')).views.includes('month_calendar'));

  assert.equal(normalizeExecutionModel(bySlug('study-exam-d30-plan')).uxType, 'program');
  assert.ok(normalizeExecutionModel(bySlug('study-exam-d30-plan')).views.includes('routine_sessions'));
  assert.ok(normalizeExecutionModel(bySlug('study-exam-d30-plan')).views.includes('month_calendar'));

  for (const slug of ['home-workout-20min', 'english-study-30day-routine', 'car-care-monthly-routine']) {
    const model = normalizeExecutionModel(bySlug(slug));
    assert.equal(model.uxType, 'routine', slug);
    assert.ok(model.views.includes('routine_sessions'), slug);
    assert.ok(model.views.includes('month_calendar'), slug);
  }
});

test('preview and exact-video flows do not pollute representative landing set', () => {
  const preview = getPreviewFlowBundles()[0];
  assert.ok(preview);
  assert.equal(normalizeExecutionModel(preview).exposureStatus, 'catalog_preview');

  const exact = bySlug('real-thankyou-bubu-video-daily-stretch-9min');
  const model = normalizeExecutionModel(exact);
  assert.equal(model.uxType, 'mini_flow');
  assert.equal(model.exposureStatus, 'source_review');
  assert.deepEqual(model.views, ['list', 'export_preview']);
});

test('exact-video source observations remain undated checklists with no calendar export', () => {
  for (const slug of [
    'real-fitvely-video-body-fat-6kg-method',
    'real-fitvely-video-carb-reason',
    'real-fitvely-video-three-week-check',
    'real-fitvely-video-post-workout-nutrition',
    'real-fitvely-video-carb-amount-shorts',
    'real-fitvely-video-after-work-nutrition',
    'real-fitvely-video-weight-class-method',
  ]) {
    const model = normalizeExecutionModel(bySlug(slug));

    assert.equal(model.uxType, 'checklist', slug);
    assert.deepEqual(model.views, ['list', 'export_preview'], slug);
    assert.deepEqual(model.exportTargets, ['memo', 'sheet', 'todo'], slug);
    assert.ok(!model.exportTargets.includes('calendar'), slug);
  }
});
