import { getSourceFitAudit, type SourceFitDecision } from './source-fit';
import type { FlowBundle, SourcePrecision, SourceType } from './types';

export type ContentInventoryLevel =
  | 'manual_source_fit'
  | 'derived_real_source'
  | 'source_needs_review'
  | 'generated_preview_candidate'
  | 'legacy_accessible';

export type ContentInventoryDecision = SourceFitDecision | 'preview_candidate' | 'legacy_accessible';

export type ContentInventoryPublicHandling =
  | 'representative_eligible'
  | 'source_review'
  | 'catalog_preview'
  | 'preview_candidate'
  | 'legacy_accessible'
  | 'hidden';

export type ContentInventoryReview = {
  slug: string;
  title: string;
  level: ContentInventoryLevel;
  decision: ContentInventoryDecision;
  score: number;
  sourcePrecision: SourcePrecision | 'none';
  publicHandling: ContentInventoryPublicHandling;
  reason: string;
  nextAction: string;
};

export type ContentInventorySummary = {
  totalCount: number;
  realSourceCount: number;
  previewSourceCount: number;
  legacyAccessibleCount: number;
  manualSourceFitCount: number;
  derivedRealSourceCount: number;
  sourceNeedsReviewCount: number;
  realSourceReviewedCount: number;
  sourceBackedReviewedCount: number;
  generatedPreviewCandidateCount: number;
  averageDerivedScore: number;
  levelCounts: Record<ContentInventoryLevel, number>;
  publicHandlingCounts: Record<ContentInventoryPublicHandling, number>;
};

const emptyLevelCounts: Record<ContentInventoryLevel, number> = {
  manual_source_fit: 0,
  derived_real_source: 0,
  source_needs_review: 0,
  generated_preview_candidate: 0,
  legacy_accessible: 0,
};

const emptyHandlingCounts: Record<ContentInventoryPublicHandling, number> = {
  representative_eligible: 0,
  source_review: 0,
  catalog_preview: 0,
  preview_candidate: 0,
  legacy_accessible: 0,
  hidden: 0,
};

function handlingFromSourceFit(decision: SourceFitDecision): ContentInventoryPublicHandling {
  if (decision === 'keep_representative') return 'representative_eligible';
  if (decision === 'reshape_before_featured') return 'source_review';
  if (decision === 'catalog_preview_only') return 'catalog_preview';
  return 'hidden';
}

function hasDetailedItems(bundle: FlowBundle): boolean {
  return Boolean(
    bundle.itemDetails?.some(
      (detail) => detail.why || detail.how || detail.completion_criteria || detail.links?.length,
    ),
  );
}

function hasExternalManagementNeed(bundle: FlowBundle): boolean {
  if (bundle.flow.primary_destination && bundle.flow.primary_destination !== 'internal_check') return true;
  if (bundle.flow.structure_type === 'timeline' || bundle.flow.structure_type === 'routine') return true;
  if (bundle.items.some((item) => item.day_offset !== undefined || item.repeat_rule)) return true;
  return Boolean(bundle.mealSlots?.length || bundle.repeatRules?.length);
}

function isSensitive(bundle: FlowBundle): boolean {
  const risk = bundle.flow.risk_level;
  return risk === 'medical_sensitive' || risk === 'financial_sensitive';
}

function sourceTypes(bundle: FlowBundle): SourceType[] {
  const itemSourceTypes = bundle.items.map((item) => item.source_type).filter((value): value is SourceType => Boolean(value));
  const detailLinkTypes: SourceType[] = (bundle.itemDetails ?? [])
    .flatMap((detail) => detail.links ?? [])
    .map((link) => (link.type === 'official' ? 'official' : 'reference'));

  return [...itemSourceTypes, ...detailLinkTypes];
}

function hasOfficialOrReferenceSource(bundle: FlowBundle): boolean {
  return sourceTypes(bundle).some((sourceType) => sourceType === 'official' || sourceType === 'reference');
}

function scoreDerivedReview(bundle: FlowBundle): number {
  let score = 0;
  if (bundle.flow.source_url) score += 20;
  if (bundle.flow.source_precision === 'exact') score += 20;
  if (hasOfficialOrReferenceSource(bundle)) score += 15;
  if (hasDetailedItems(bundle)) score += 15;
  if (hasExternalManagementNeed(bundle)) score += 15;
  if (!isSensitive(bundle) || Boolean(bundle.flow.warning || bundle.warnings?.length)) score += 15;
  return Math.max(0, Math.min(100, score));
}

function derivedHandling(bundle: FlowBundle, score: number): ContentInventoryPublicHandling {
  if (isSensitive(bundle)) return 'catalog_preview';
  if (bundle.flow.source_precision === 'exact' && score >= 70) return 'source_review';
  return 'catalog_preview';
}

function decisionFromDerivedHandling(handling: ContentInventoryPublicHandling): SourceFitDecision {
  if (handling === 'source_review') return 'reshape_before_featured';
  if (handling === 'hidden') return 'hide_from_public_catalog';
  return 'catalog_preview_only';
}

export function reviewContentInventory(bundle: FlowBundle): ContentInventoryReview {
  const audit = getSourceFitAudit(bundle.flow.slug);
  if (audit) {
    return {
      slug: bundle.flow.slug,
      title: bundle.flow.title,
      level: 'manual_source_fit',
      decision: audit.decision,
      score: audit.score,
      sourcePrecision: audit.sourcePrecision === 'mismatch' ? 'none' : audit.sourcePrecision,
      publicHandling: handlingFromSourceFit(audit.decision),
      reason: `수동 source-fit audit 완료: ${audit.sourceUsefulness}`,
      nextAction: audit.contentAction,
    };
  }

  if (bundle.flow.source_status === 'preview') {
    return {
      slug: bundle.flow.slug,
      title: bundle.flow.title,
      level: 'generated_preview_candidate',
      decision: 'preview_candidate',
      score: 0,
      sourcePrecision: 'none',
      publicHandling: 'preview_candidate',
      reason: '채널 확장 가능성을 보여주는 생성형 샘플 후보입니다.',
      nextAction: '실제 원본 URL을 지정하고 수동 source-fit audit을 진행합니다.',
    };
  }

  if (bundle.flow.source_status === 'real') {
    const score = scoreDerivedReview(bundle);
    const publicHandling = derivedHandling(bundle, score);
    return {
      slug: bundle.flow.slug,
      title: bundle.flow.title,
      level: 'derived_real_source',
      decision: decisionFromDerivedHandling(publicHandling),
      score,
      sourcePrecision: bundle.flow.source_precision ?? 'none',
      publicHandling,
      reason: isSensitive(bundle)
        ? '민감 영역이 포함된 실제 원본 Flow라 대표 노출 전 수동 검토가 필요합니다.'
        : '실제 원본 metadata 기반으로 1차 분류했습니다.',
      nextAction: '원본을 열어 사용자 여정, 간극, 콘텐츠/UX 보강안을 수동 audit으로 남깁니다.',
    };
  }

  if (bundle.flow.source_status === 'needs_review') {
    const score = scoreDerivedReview(bundle);
    const publicHandling = derivedHandling(bundle, score);
    return {
      slug: bundle.flow.slug,
      title: bundle.flow.title,
      level: 'source_needs_review',
      decision: decisionFromDerivedHandling(publicHandling),
      score,
      sourcePrecision: bundle.flow.source_precision ?? 'none',
      publicHandling,
      reason: '원본 URL과 실행 구조는 있으나 source-fit audit 전이라 보강 필요 상태입니다.',
      nextAction: '원본을 열어 사용자 여정, 간극, 콘텐츠/UX 보강안을 source-fit audit으로 남깁니다.',
    };
  }

  return {
    slug: bundle.flow.slug,
    title: bundle.flow.title,
    level: 'legacy_accessible',
    decision: 'legacy_accessible',
    score: 0,
    sourcePrecision: bundle.flow.source_precision ?? 'none',
    publicHandling: 'legacy_accessible',
    reason: '기존 데모 호환을 위해 직접 접근은 유지하지만 원본 검토 상태가 없습니다.',
    nextAction: '실제 source를 붙이거나 카탈로그에서 제외할지 결정합니다.',
  };
}

export function summarizeContentInventory(bundles: FlowBundle[]): ContentInventorySummary {
  const reviews = bundles.map(reviewContentInventory);
  const levelCounts = { ...emptyLevelCounts };
  const publicHandlingCounts = { ...emptyHandlingCounts };

  for (const review of reviews) {
    levelCounts[review.level] += 1;
    publicHandlingCounts[review.publicHandling] += 1;
  }

  const derivedReviews = reviews.filter((review) => review.level === 'derived_real_source');
  const realSourceReviewedCount = reviews.filter(
    (review, index) =>
      bundles[index]?.flow.source_status === 'real' &&
      (review.level === 'manual_source_fit' || review.level === 'derived_real_source'),
  ).length;
  const realSourceCount = bundles.filter((bundle) => bundle.flow.source_status === 'real').length;
  const previewSourceCount = bundles.filter((bundle) => bundle.flow.source_status === 'preview').length;

  return {
    totalCount: bundles.length,
    realSourceCount,
    previewSourceCount,
    legacyAccessibleCount: levelCounts.legacy_accessible,
    manualSourceFitCount: levelCounts.manual_source_fit,
    derivedRealSourceCount: levelCounts.derived_real_source,
    sourceNeedsReviewCount: levelCounts.source_needs_review,
    realSourceReviewedCount,
    sourceBackedReviewedCount:
      levelCounts.manual_source_fit + levelCounts.derived_real_source + levelCounts.source_needs_review,
    generatedPreviewCandidateCount: levelCounts.generated_preview_candidate,
    averageDerivedScore: Math.round(
      derivedReviews.reduce((sum, review) => sum + review.score, 0) / Math.max(derivedReviews.length, 1),
    ),
    levelCounts,
    publicHandlingCounts,
  };
}
