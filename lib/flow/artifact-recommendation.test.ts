import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildArtifactPreflightVM,
  buildArtifactExportRecommendationVM,
  buildArtifactRecommendationVM,
  getPreferredArtifactExportDestination,
} from './artifact-recommendation';
import { buildFlowExportScopePlan } from './export-scope';
import { buildFlowExperienceProjection } from './flow-experience-projection';
import { seedBundles } from './seed-flows';
import { sourceBackedMyFlowBundles } from './source-backed-my-flow';

function bySlug(slug: string) {
  const bundle = [...seedBundles, ...sourceBackedMyFlowBundles].find((entry) => entry.flow.slug === slug);
  assert.ok(bundle, `missing fixture ${slug}`);
  return bundle;
}

test('five representative shapes expose one primary and at most two secondary recommendations', () => {
  const representatives = [
    ['curated-allblanc-morning-workout', 'flow_execution', '2030-08-15'],
    ['moving-d30-basic', 'calendar', '2030-08-15'],
    ['used-car-buying-check', 'checklist', undefined],
    ['source-backed-middle-school-math-1', 'sheet', undefined],
    ['overseas-safety-register', 'checklist', undefined],
  ] as const;

  for (const [slug, expectedShape, anchor] of representatives) {
    const bundle = bySlug(slug);
    const sourceBefore = JSON.stringify(bundle);
    const projection = buildFlowExperienceProjection(bundle, anchor ? { anchor } : {});
    const recommendation = buildArtifactRecommendationVM(projection);
    assert.equal(recommendation.primary?.shape, expectedShape, slug);
    assert.ok(recommendation.primary?.reason, slug);
    assert.ok(recommendation.visible.length <= 3, slug);
    assert.ok(recommendation.secondary.length <= 2, slug);
    assert.equal(JSON.stringify(bundle), sourceBefore, `${slug} source mutation`);
  }
});

test('export recommendation derives count, scope, and loss from the export plan', () => {
  const plan = buildFlowExportScopePlan({
    scope: 'flow',
    flowTitle: '이사 준비',
    items: [
      { key: 'dated-a', title: '예약', calendarEligible: true },
      { key: 'dated-b', title: '확인', calendarEligible: true },
      { key: 'undated', title: '메모', calendarEligible: false },
    ],
  });
  const recommendation = buildArtifactExportRecommendationVM({
    plan,
    destinations: ['calendar', 'checklist', 'sheet', 'memo'],
    preferredDestination: 'calendar',
  });

  assert.equal(recommendation.primary?.destination, 'calendar');
  assert.equal(recommendation.primary?.count, plan.countByDestination.calendar);
  assert.match(recommendation.primary?.actionLabel ?? '', /Flow 전체.*2개 받기/u);
  assert.match(recommendation.primary?.lossSummary ?? '', /날짜 없는 1개/u);
  assert.equal(recommendation.secondary.length, 2);
  assert.equal(recommendation.additional.length, 1);
  assert.equal(recommendation.visible.length, 3);
});

test('selected and current item action labels keep their scope', () => {
  const items = [
    { key: 'a', title: 'A', calendarEligible: false },
    { key: 'b', title: 'B', calendarEligible: false },
  ];
  const selected = buildFlowExportScopePlan({
    scope: 'selected', items, selectedKeys: ['a', 'b'], flowTitle: '선택',
  });
  const current = buildFlowExportScopePlan({
    scope: 'item', items, currentItemKey: 'a', flowTitle: '현재',
  });
  const selectedVm = buildArtifactExportRecommendationVM({ plan: selected, destinations: ['checklist'] });
  const currentVm = buildArtifactExportRecommendationVM({ plan: current, destinations: ['memo'] });
  assert.match(selectedVm.primary?.actionLabel ?? '', /^선택한 2개/u);
  assert.match(currentVm.primary?.actionLabel ?? '', /^현재 항목/u);
});

test('bundle preference reuses the canonical artifact contract', () => {
  assert.equal(getPreferredArtifactExportDestination(bySlug('moving-d30-basic')), 'calendar');
  assert.equal(getPreferredArtifactExportDestination(bySlug('used-car-buying-check')), 'checklist');
  assert.equal(getPreferredArtifactExportDestination(bySlug('source-backed-middle-school-math-1')), 'sheet');
  assert.equal(getPreferredArtifactExportDestination(bySlug('overseas-safety-register')), 'checklist');
});

test('public artifact preflight derives destinations from the same visible shape plan', () => {
  const fixtures = [
    ['moving-d30-basic', '2030-08-15', ['calendar', 'checklist']],
    ['vehicle-inspection-prep', undefined, ['checklist']],
    ['source-backed-middle-school-math-1', undefined, ['sheet', 'checklist']],
    ['overseas-safety-register', undefined, ['checklist', 'memo']],
  ] as const;

  for (const [slug, anchor, expectedDestinations] of fixtures) {
    const bundle = bySlug(slug);
    const projection = buildFlowExperienceProjection(bundle, anchor ? { anchor } : {});
    const preflight = buildArtifactPreflightVM({
      projection,
      preferredDestination: getPreferredArtifactExportDestination(bundle),
    });
    assert.deepEqual(preflight.destinations, expectedDestinations, slug);
    assert.equal(preflight.primary?.count, projection.shapes[projection.primaryShape].count, slug);
    assert.ok(preflight.summary.includes(preflight.primary?.label ?? ''), slug);
  }
});

test('routine preflight distinguishes provisional and committed Calendar occurrences', () => {
  const bundle = bySlug('curated-allblanc-morning-workout');
  const projection = buildFlowExperienceProjection(bundle, { anchor: '2030-08-15' });
  const provisional = buildArtifactPreflightVM({
    projection,
    preferredDestination: 'calendar',
    scheduleState: 'provisional',
    scheduledEventCount: 8,
  });
  const committed = buildArtifactPreflightVM({
    projection,
    preferredDestination: 'calendar',
    scheduleState: 'committed',
    scheduledEventCount: 8,
  });

  assert.equal(provisional.primary?.shape, 'flow_execution');
  assert.deepEqual(provisional.destinations, ['checklist', 'calendar', 'memo']);
  assert.match(provisional.summary, /날짜를 정하면 캘린더 8개/u);
  assert.match(committed.summary, /캘린더 8개/u);
  assert.doesNotMatch(committed.summary, /날짜를 정하면/u);
});
