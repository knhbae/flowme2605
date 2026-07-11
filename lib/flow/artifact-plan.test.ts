import assert from 'node:assert/strict';
import test from 'node:test';
import { getArtifactPlan } from './artifact-plan';
import { seedBundles } from './seed-flows';

function bundle(slug: string) {
  const found = seedBundles.find((entry) => entry.flow.slug === slug);
  assert.ok(found, `missing seed bundle: ${slug}`);
  return found;
}

test('artifact plan maps moving timeline to list and month calendar first', () => {
  const plan = getArtifactPlan(bundle('moving-d30-basic'));

  assert.equal(plan.primarySurface, 'timeline_calendar');
  assert.deepEqual(
    plan.surfaces.slice(0, 2).map((surface) => surface.kind),
    ['execution_list', 'month_calendar'],
  );
  assert.ok(plan.exportTargets.includes('calendar'));
  assert.ok(plan.exportTargets.includes('sheet'));
});

test('artifact plan maps used-car checklist to checklist before any comparison', () => {
  const plan = getArtifactPlan(bundle('used-car-buying-check'));

  assert.equal(plan.primarySurface, 'checklist');
  assert.deepEqual(plan.surfaces.map((surface) => surface.kind), ['execution_list']);
  assert.ok(plan.exportTargets.includes('sheet'));
});

test('artifact plan maps water purifier filter cycle to a spreadsheet log first', () => {
  const plan = getArtifactPlan(bundle('water-purifier-filter-cycle'));

  assert.equal(plan.primarySurface, 'spreadsheet_log');
  assert.deepEqual(plan.surfaces.map((surface) => surface.kind), ['spreadsheet_preview', 'memo_card']);
  assert.equal(plan.surfaces[0].title, '필터 주기표');
  assert.equal(plan.surfaces[1].title, '관리 메모');
  assert.ok(!plan.surfaces.some((surface) => surface.title.includes('반복 리마인더')));
  assert.ok(plan.exportTargets.includes('sheet'));
});

test('artifact plan maps maintenance routines to management calendar surfaces', () => {
  for (const slug of ['washer-tub-clean-monthly', 'monstera-care-routine']) {
    const plan = getArtifactPlan(bundle(slug));

    assert.equal(plan.primarySurface, 'routine_calendar');
    assert.deepEqual(
      plan.surfaces.map((surface) => surface.title),
      ['관리 캘린더', '날짜 안 체크리스트', '관리 메모'],
      slug,
    );
    assert.ok(!plan.surfaces.some((surface) => surface.title.includes('회차')), slug);
    assert.ok(!plan.surfaces.some((surface) => surface.description.includes('컨디션')), slug);
  }
});

test('artifact plan maps baby food to menu calendar only', () => {
  const plan = getArtifactPlan(bundle('baby-food-menu-recipe'));

  assert.equal(plan.primarySurface, 'meal_reaction_log');
  assert.deepEqual(plan.surfaces.map((surface) => surface.kind), ['meal_calendar']);
  assert.ok(plan.exportTargets.includes('calendar'));
  assert.ok(plan.exportTargets.includes('sheet'));
});

test('artifact plan keeps promoted wedding timeline calendar before comparison', () => {
  const plan = getArtifactPlan(bundle('wedding-d180-basic'));

  assert.equal(plan.primarySurface, 'timeline_calendar');
  assert.deepEqual(
    plan.surfaces.slice(0, 2).map((surface) => surface.kind),
    ['execution_list', 'month_calendar'],
  );
  assert.ok(plan.exportTargets.includes('calendar'));
});

test('artifact plan maps promoted study program to routine calendar first', () => {
  const plan = getArtifactPlan(bundle('study-exam-d30-plan'));

  assert.equal(plan.primarySurface, 'routine_calendar');
  assert.equal(plan.surfaces[0].kind, 'routine_month');
  assert.ok(plan.exportTargets.includes('calendar'));
});

test('artifact plan keeps certification study timeline calendar before logs', () => {
  const plan = getArtifactPlan(bundle('real-sinagong-computer-d30-study'));

  assert.equal(plan.primarySurface, 'timeline_calendar');
  assert.deepEqual(
    plan.surfaces.slice(0, 2).map((surface) => surface.kind),
    ['execution_list', 'month_calendar'],
  );
  assert.ok(plan.exportTargets.includes('calendar'));
});

test('artifact plan maps exact workout video to routine calendar and condition memo', () => {
  const plan = getArtifactPlan(bundle('real-thankyou-bubu-video-full-body-no-jump'));

  assert.equal(plan.primarySurface, 'routine_calendar');
  assert.ok(plan.surfaces.some((surface) => surface.kind === 'routine_month'));
  assert.ok(plan.surfaces.some((surface) => surface.kind === 'memo_card'));
});

test('artifact plan maps diet tracking to spreadsheet-first log', () => {
  const plan = getArtifactPlan(bundle('real-fitvely-video-body-fat-6kg-method'));

  assert.equal(plan.primarySurface, 'spreadsheet_log');
  assert.equal(plan.surfaces[0].kind, 'spreadsheet_preview');
  assert.ok(plan.surfaces.some((surface) => surface.kind === 'routine_month'));
});

test('artifact plan maps workout programming videos to decision table before workout calendar', () => {
  const slugs = [
    'real-fitvely-video-bulk-up-method',
    'real-fitvely-video-workout-order',
    'real-fitvely-video-workout-split-science',
  ];

  for (const slug of slugs) {
    const plan = getArtifactPlan(bundle(slug));

    assert.equal(plan.primarySurface, 'decision_table', slug);
    assert.deepEqual(
      plan.surfaces.slice(0, 2).map((surface) => surface.kind),
      ['comparison_table', 'execution_list'],
      slug,
    );
    assert.ok(plan.exportTargets.includes('calendar'), slug);
    assert.ok(plan.exportTargets.includes('sheet'), slug);
  }
});

test('artifact plan keeps broad source routes out of representative promotion', () => {
  const plan = getArtifactPlan(bundle('real-fitvely-weekly-body-check'));

  assert.equal(plan.sourceHandling, 'catalog_review');
  assert.equal(plan.canBeRepresentative, false);
  assert.ok(plan.sourceAction.includes('exact'));
});

test('artifact plan maps creator sequential-stage flows to step progress surface', () => {
  const slugs = [
    'recipe-video-execute',
    'closet-organize-1day',
    'kitchen-reset-organize',
    'book-finish-one',
    'travel-packing-list',
    'blog-youtube-start',
  ];

  for (const slug of slugs) {
    const plan = getArtifactPlan(bundle(slug));
    assert.equal(plan.primarySurface, 'step_progress', slug);
    assert.equal(plan.surfaces[0].kind, 'execution_list', slug);
  }
});

test('artifact plan maps creator record-table flows to spreadsheet log surface', () => {
  const slugs = ['weekly-meal-plan', 'monthly-household-budget', 'skin-weekly-check'];

  for (const slug of slugs) {
    const plan = getArtifactPlan(bundle(slug));
    assert.equal(plan.primarySurface, 'spreadsheet_log', slug);
  }
});

test('artifact plan maps payday finance routine to a memo card surface', () => {
  const plan = getArtifactPlan(bundle('payday-finance-routine'));

  assert.equal(plan.primarySurface, 'memo_card');
  assert.deepEqual(plan.surfaces.map((surface) => surface.kind), ['memo_card', 'execution_list']);
});

test('artifact plan keeps creator flows on source-aligned structure surfaces', () => {
  for (const slug of ['reading-habit-30day', 'morning-skincare-routine', 'dog-walk-routine']) {
    assert.equal(getArtifactPlan(bundle(slug)).primarySurface, 'routine_calendar', slug);
  }
  for (const slug of ['new-hobby-30day', 'portfolio-4week']) {
    assert.equal(getArtifactPlan(bundle(slug)).primarySurface, 'timeline_calendar', slug);
  }
  assert.equal(getArtifactPlan(bundle('domestic-trip-d7')).primarySurface, 'checklist');
});

test('artifact plan maps veterinary consultation prep to a memo instead of a stale weekly tracker', () => {
  const plan = getArtifactPlan(bundle('pet-health-observation'));

  assert.equal(plan.primarySurface, 'memo_card');
  assert.deepEqual(plan.surfaces.map((surface) => surface.kind), ['memo_card', 'execution_list']);
});

test('artifact plan maps official document issue routes to memo cards first except passport', () => {
  const family = getArtifactPlan(bundle('family-certificate-issue'));
  const resident = getArtifactPlan(bundle('resident-register-copy-issue'));
  const passport = getArtifactPlan(bundle('passport-renewal-docs'));

  assert.equal(family.primarySurface, 'memo_card');
  assert.equal(resident.primarySurface, 'memo_card');
  assert.equal(passport.primarySurface, 'checklist');
  assert.deepEqual(family.surfaces.map((surface) => surface.kind), ['memo_card', 'execution_list']);
  assert.deepEqual(resident.surfaces.map((surface) => surface.kind), ['memo_card', 'execution_list']);
  assert.deepEqual(passport.surfaces.map((surface) => surface.kind), ['execution_list']);
  assert.ok(family.exportTargets.includes('memo'));
  assert.ok(resident.exportTargets.includes('memo'));
});

test('artifact plan maps MOFA travel safety to checklist without memo card', () => {
  const plan = getArtifactPlan(bundle('real-mofa-overseas-travel-prep'));

  assert.equal(plan.primarySurface, 'timeline_calendar');
  assert.deepEqual(plan.surfaces.map((surface) => surface.kind), ['execution_list', 'month_calendar']);
  assert.equal(plan.sourceHandling, 'reshape_before_featured');
});

test('artifact plan maps driver renewal reshaping to condition comparison first', () => {
  const plan = getArtifactPlan(bundle('driver-license-renewal-check'));

  assert.equal(plan.primarySurface, 'decision_table');
  assert.equal(plan.surfaces[0].kind, 'comparison_table');
  assert.equal(plan.sourceHandling, 'reshape_before_featured');
});

test('artifact plan maps source replacement and risk review reshaping to artifact-first surfaces', () => {
  assert.equal(getArtifactPlan(bundle('computer-skills-d30-study')).primarySurface, 'timeline_calendar');
  assert.equal(getArtifactPlan(bundle('diet-habit-2week')).primarySurface, 'routine_calendar');
  assert.equal(getArtifactPlan(bundle('diet-meal-exercise-log')).primarySurface, 'spreadsheet_log');
  assert.equal(getArtifactPlan(bundle('diet-reset-2week')).primarySurface, 'spreadsheet_log');
  assert.equal(getArtifactPlan(bundle('new-car-delivery-check')).primarySurface, 'checklist');
  assert.equal(getArtifactPlan(bundle('year-end-tax-docs')).primarySurface, 'memo_card');
  assert.equal(getArtifactPlan(bundle('business-registration-basic')).primarySurface, 'memo_card');
  assert.equal(getArtifactPlan(bundle('happy-birth-service-check')).primarySurface, 'memo_card');
  assert.equal(getArtifactPlan(bundle('industrial-accident-claim-docs')).primarySurface, 'memo_card');
  assert.equal(getArtifactPlan(bundle('vaccination-certificate-issue')).primarySurface, 'memo_card');
});

test('priority A redesign removes unsupported leading artifact surfaces', () => {
  const diet = getArtifactPlan(bundle('diet-habit-2week'));
  const newCar = getArtifactPlan(bundle('new-car-delivery-check'));

  assert.deepEqual(
    diet.surfaces.map((surface) => surface.kind),
    ['routine_month'],
  );
  assert.deepEqual(newCar.surfaces.map((surface) => surface.kind), ['execution_list']);
});

test('experiment checklist routes use compact artifact-first surfaces', () => {
  assert.deepEqual(getArtifactPlan(bundle('moving-d30-basic')).surfaces.map((surface) => surface.kind), ['execution_list', 'month_calendar']);
  assert.deepEqual(getArtifactPlan(bundle('vehicle-inspection-prep')).surfaces.map((surface) => surface.kind), ['execution_list', 'month_calendar']);
  assert.deepEqual(getArtifactPlan(bundle('real-thankyou-bubu-home-workout-starter')).surfaces.map((surface) => surface.kind), ['routine_month']);
  assert.deepEqual(getArtifactPlan(bundle('real-fitvely-diet-record-routine')).surfaces.map((surface) => surface.kind), ['routine_month']);
});
