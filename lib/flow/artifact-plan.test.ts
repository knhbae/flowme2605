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

test('artifact plan maps used-car checklist to comparison before checklist', () => {
  const plan = getArtifactPlan(bundle('used-car-buying-check'));

  assert.equal(plan.primarySurface, 'decision_table');
  assert.deepEqual(
    plan.surfaces.slice(0, 2).map((surface) => surface.kind),
    ['comparison_table', 'execution_list'],
  );
  assert.ok(plan.exportTargets.includes('sheet'));
});

test('artifact plan maps baby food to meal calendar and reaction log first', () => {
  const plan = getArtifactPlan(bundle('baby-food-menu-recipe'));

  assert.equal(plan.primarySurface, 'meal_reaction_log');
  assert.deepEqual(
    plan.surfaces.slice(0, 2).map((surface) => surface.kind),
    ['meal_calendar', 'reaction_log'],
  );
  assert.ok(plan.exportTargets.includes('calendar'));
  assert.ok(plan.exportTargets.includes('sheet'));
});

test('artifact plan preserves promoted hybrid wedding comparison first', () => {
  const plan = getArtifactPlan(bundle('wedding-d180-basic'));

  assert.equal(plan.primarySurface, 'decision_table');
  assert.equal(plan.surfaces[0].kind, 'comparison_table');
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

test('artifact plan keeps broad source routes out of representative promotion', () => {
  const plan = getArtifactPlan(bundle('real-fitvely-diet-record-routine'));

  assert.equal(plan.sourceHandling, 'catalog_review');
  assert.equal(plan.canBeRepresentative, false);
  assert.ok(plan.sourceAction.includes('exact'));
});

test('artifact plan maps official document issue routes to memo cards first', () => {
  const family = getArtifactPlan(bundle('family-certificate-issue'));
  const resident = getArtifactPlan(bundle('resident-register-copy-issue'));
  const passport = getArtifactPlan(bundle('passport-renewal-docs'));

  assert.equal(family.primarySurface, 'memo_card');
  assert.equal(resident.primarySurface, 'memo_card');
  assert.equal(passport.primarySurface, 'memo_card');
  assert.deepEqual(family.surfaces.map((surface) => surface.kind), ['memo_card', 'execution_list']);
  assert.deepEqual(resident.surfaces.map((surface) => surface.kind), ['memo_card', 'execution_list']);
  assert.deepEqual(passport.surfaces.map((surface) => surface.kind), ['memo_card', 'execution_list']);
  assert.ok(family.exportTargets.includes('memo'));
  assert.ok(resident.exportTargets.includes('memo'));
  assert.ok(passport.exportTargets.includes('memo'));
});

test('artifact plan maps driver renewal reshaping to condition comparison first', () => {
  const plan = getArtifactPlan(bundle('driver-license-renewal-check'));

  assert.equal(plan.primarySurface, 'decision_table');
  assert.equal(plan.surfaces[0].kind, 'comparison_table');
  assert.equal(plan.sourceHandling, 'reshape_before_featured');
});

test('artifact plan maps source replacement and risk review reshaping to artifact-first surfaces', () => {
  assert.equal(getArtifactPlan(bundle('computer-skills-d30-study')).primarySurface, 'timeline_calendar');
  assert.equal(getArtifactPlan(bundle('diet-habit-2week')).primarySurface, 'spreadsheet_log');
  assert.equal(getArtifactPlan(bundle('diet-meal-exercise-log')).primarySurface, 'spreadsheet_log');
  assert.equal(getArtifactPlan(bundle('diet-reset-2week')).primarySurface, 'spreadsheet_log');
  assert.equal(getArtifactPlan(bundle('new-car-delivery-check')).primarySurface, 'decision_table');
  assert.equal(getArtifactPlan(bundle('year-end-tax-docs')).primarySurface, 'memo_card');
  assert.equal(getArtifactPlan(bundle('business-registration-basic')).primarySurface, 'memo_card');
  assert.equal(getArtifactPlan(bundle('happy-birth-service-check')).primarySurface, 'memo_card');
  assert.equal(getArtifactPlan(bundle('industrial-accident-claim-docs')).primarySurface, 'memo_card');
  assert.equal(getArtifactPlan(bundle('vaccination-certificate-issue')).primarySurface, 'memo_card');
});
