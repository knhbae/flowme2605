import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FLOW_LIFECYCLE_BUCKET_LABELS,
  classifyFlowLifecycle,
  summarizeFlowLifecycle,
} from './content-lifecycle';
import { seedBundles } from './seed-flows';
import { getSourceFitAudit } from './source-fit';

function bundleBySlug(slug: string) {
  const bundle = seedBundles.find((entry) => entry.flow.slug === slug);
  assert.ok(bundle, `missing bundle: ${slug}`);
  return bundle;
}

test('lifecycle classification assigns keep and fix buckets to audited source-fit flows', () => {
  const moving = classifyFlowLifecycle(bundleBySlug('moving-d30-basic'));
  const study = classifyFlowLifecycle(bundleBySlug('study-exam-d30-plan'));

  assert.equal(moving.bucket, 'keep');
  assert.equal(moving.publicAction, '대표 노출 유지');
  assert.equal(study.bucket, 'fix');
  assert.ok(study.reason.includes('source-fit'));
  assert.ok(study.nextAction.length > 0);
});

test('lifecycle classification keeps derived real-source flows in fix until manually promoted', () => {
  const aircon = classifyFlowLifecycle(bundleBySlug('real-samsung-aircon-seasonal-care'));
  const studyWorkbench = classifyFlowLifecycle(bundleBySlug('real-sinagong-computer-d30-study'));

  assert.equal(aircon.bucket, 'fix');
  assert.equal(aircon.auditDecision, 'promote_to_manual_source_fit');
  assert.ok(aircon.nextAction.includes('수동'));
  assert.equal(studyWorkbench.bucket, 'fix');
  assert.equal(studyWorkbench.auditDecision, 'reshape_content_or_ux');
});

test('lifecycle classification separates generated previews and source-backed legacy fixes', () => {
  const preview = seedBundles.find((entry) => entry.flow.source_status === 'preview');
  assert.ok(preview);

  const sourceBackedLegacy = seedBundles.find(
    (entry) => entry.flow.slug === 'samsung-aircon-seasonal-check' && !getSourceFitAudit(entry.flow.slug),
  );
  assert.ok(sourceBackedLegacy);

  const previewReview = classifyFlowLifecycle(preview);
  const legacyReview = classifyFlowLifecycle(sourceBackedLegacy);

  assert.equal(previewReview.bucket, 'preview_only');
  assert.equal(previewReview.publicAction, '채널/카탈로그 미리보기만 유지');
  assert.equal(legacyReview.bucket, 'fix');
  assert.ok(legacyReview.reason.includes('원본 URL'));
  assert.ok(legacyReview.nextAction.includes('source-fit audit'));
});

test('lifecycle summary covers every seed bundle exactly once', () => {
  const summary = summarizeFlowLifecycle(seedBundles);
  const countSum = Object.values(summary.bucketCounts).reduce((sum, count) => sum + count, 0);

  assert.equal(summary.totalCount, seedBundles.length);
  assert.equal(countSum, seedBundles.length);
  assert.ok(summary.bucketCounts.keep >= 5);
  assert.ok(summary.bucketCounts.fix >= 40);
  assert.ok(summary.bucketCounts.preview_only >= 400);
  assert.equal(summary.bucketCounts.hide, 0);
  assert.equal(summary.bucketCounts.remove_candidate, 0);
  assert.equal(summary.hideSlugs.length, 0);
  assert.equal(summary.keepSlugs.length, summary.bucketCounts.keep);
  assert.equal(summary.removeCandidateSlugs.length, summary.bucketCounts.remove_candidate);
});

test('lifecycle labels stay user-facing and Korean', () => {
  assert.equal(FLOW_LIFECYCLE_BUCKET_LABELS.keep, '대표 유지');
  assert.equal(FLOW_LIFECYCLE_BUCKET_LABELS.fix, '보강 필요');
  assert.equal(FLOW_LIFECYCLE_BUCKET_LABELS.preview_only, '미리보기 전용');
  assert.equal(FLOW_LIFECYCLE_BUCKET_LABELS.hide, '공개 숨김');
  assert.equal(FLOW_LIFECYCLE_BUCKET_LABELS.remove_candidate, '삭제 후보');
});
