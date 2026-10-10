import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getRepresentativeFlowSlugs,
  normalizeExecutionModel,
} from './execution-model';
import { getPreviewFlowBundles } from './creator-channel-preview';
import { seedBundles } from './seed-flows';
import { isPublicFlowSourceOnHold } from './public-source-review-policy';
import { getSourceFitAudit } from './source-fit';

function bySlug(slug: string) {
  const bundle = seedBundles.find((item) => item.flow.slug === slug);
  assert.ok(bundle, slug);
  return bundle;
}

test('held historical P0 plans remain readable but do not enter NEW representative landing', () => {
  const historical = [
    'moving-d30-basic',
    'used-car-buying-check',
    'wedding-d180-basic',
    'english-study-30day-routine',
  ];
  assert.deepEqual(getRepresentativeFlowSlugs(), []);

  for (const slug of historical) {
    const bundle = bySlug(slug), before = JSON.stringify(bundle);
    assert.equal(isPublicFlowSourceOnHold(slug), true, slug);
    assert.equal(normalizeExecutionModel(bundle).exposureStatus, 'catalog_preview', slug);
    assert.equal(JSON.stringify(bundle), before, 'existing source and execution shape are unchanged');
    assert.ok(bundle.items.length > 0, 'historical source is retained, not deleted');
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
    assert.equal(isPublicFlowSourceOnHold(slug), true, slug);
    assert.equal(model.exposureStatus, 'catalog_preview', slug);
    assert.equal(getSourceFitAudit(slug)?.decision, 'reshape_before_featured', slug);
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
