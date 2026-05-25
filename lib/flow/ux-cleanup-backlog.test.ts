import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getUxCleanupBacklogGroup,
  summarizeUxCleanupBacklog,
} from './ux-cleanup-backlog';
import { seedBundles } from './seed-flows';

test('UX cleanup backlog organizes unresolved content and UX areas before rewrites', () => {
  const summary = summarizeUxCleanupBacklog(seedBundles);

  assert.equal(summary.totalGroupCount, 9);
  assert.equal(summary.totalRouteCount, 36);
  assert.equal(summary.validatedCount, 0);
  assert.equal(summary.priorityCounts.P1, 3);
  assert.equal(summary.priorityCounts.P2, 5);
  assert.equal(summary.priorityCounts.P3, 1);
  assert.deepEqual(summary.firstBatchGroupIds, [
    'exact_workout_video_execution_detail',
    'health_observation_guardrail',
    'vehicle_purchase_evidence_first',
  ]);
  assert.ok(summary.groups.every((group) => group.statusAfterCleanup.includes('not validated')));
});

test('UX cleanup backlog records concrete category decisions and route examples', () => {
  const workout = getUxCleanupBacklogGroup('exact_workout_video_execution_detail');
  const health = getUxCleanupBacklogGroup('health_observation_guardrail');
  const study = getUxCleanupBacklogGroup('study_source_row_eligibility');
  const hidden = getUxCleanupBacklogGroup('hidden_or_hold_source_gap');

  assert.ok(workout);
  assert.equal(workout.primaryDestination, 'calendar');
  assert.equal(workout.routeSlugs.length, 12);
  assert.ok(workout.routeSlugs.includes('real-thankyou-bubu-home-workout-starter'));
  assert.ok(workout.requiredMinimum.includes('original video link'));
  assert.ok(workout.requiredMinimum.includes('detailed execution guide'));
  assert.ok(workout.nextBatch.includes('ThankyouBUBU'));

  assert.ok(health);
  assert.equal(health.priority, 'P1');
  assert.ok(health.requiredMinimum.includes('stop/consult condition'));
  assert.ok(health.routeSlugs.includes('diet-habit-2week'));
  assert.match(health.nextBatch, /sheet-first|observation-sheet|관찰표/);

  assert.ok(study);
  assert.equal(study.cleanupDecision, 'merge_or_rewrite_before_featured');
  assert.ok(study.requiredMinimum.includes('source-derived rows'));
  assert.ok(study.requiredMinimum.includes('canonical route decision'));
  assert.ok(study.routeSlugs.includes('real-sinagong-computer-d30-study'));
  assert.match(study.unresolvedGap, /computer-skills-d30-study/);
  assert.match(study.nextBatch, /merge|병합|canonical|대표/);

  assert.ok(hidden);
  assert.equal(hidden.cleanupDecision, 'hide_or_hold');
  assert.ok(hidden.routeSlugs.includes('real-fitvely-weekly-body-check'));
  assert.ok(hidden.nextBatch.includes('Do not rewrite'));
});
