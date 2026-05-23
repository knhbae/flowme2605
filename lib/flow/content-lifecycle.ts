import {
  reviewContentInventory,
  type ContentInventoryDecision,
  type ContentInventoryLevel,
  type ContentInventoryPublicHandling,
} from './content-inventory';
import {
  getNaturalArtifactAudit,
  type NaturalArtifactAuditDecision,
} from './natural-artifact-audit';
import type { FlowBundle, SourcePrecision } from './types';

export type FlowLifecycleBucket =
  | 'keep'
  | 'fix'
  | 'preview_only'
  | 'hide'
  | 'remove_candidate';

export const FLOW_LIFECYCLE_BUCKET_LABELS: Record<FlowLifecycleBucket, string> = {
  keep: '대표 유지',
  fix: '보강 필요',
  preview_only: '미리보기 전용',
  hide: '공개 숨김',
  remove_candidate: '삭제 후보',
};

export type FlowLifecycleClassification = {
  slug: string;
  title: string;
  bucket: FlowLifecycleBucket;
  label: string;
  score: number;
  reviewLevel: ContentInventoryLevel;
  inventoryDecision: ContentInventoryDecision;
  publicHandling: ContentInventoryPublicHandling;
  sourcePrecision: SourcePrecision | 'none';
  auditDecision?: ContentInventoryDecision | NaturalArtifactAuditDecision;
  reason: string;
  nextAction: string;
  publicAction: string;
};

export type FlowLifecycleSummary = {
  totalCount: number;
  bucketCounts: Record<FlowLifecycleBucket, number>;
  keepSlugs: string[];
  fixSlugs: string[];
  previewOnlySlugs: string[];
  hideSlugs: string[];
  removeCandidateSlugs: string[];
  classifications: FlowLifecycleClassification[];
};

const emptyBucketCounts: Record<FlowLifecycleBucket, number> = {
  keep: 0,
  fix: 0,
  preview_only: 0,
  hide: 0,
  remove_candidate: 0,
};

function publicActionFor(bucket: FlowLifecycleBucket): string {
  const actions: Record<FlowLifecycleBucket, string> = {
    keep: '대표 노출 유지',
    fix: '보강 후 재평가',
    preview_only: '채널/카탈로그 미리보기만 유지',
    hide: '공개 카탈로그 숨김',
    remove_candidate: '직접 URL 보존, 삭제/대체 검토',
  };
  return actions[bucket];
}

function classifyBucket(bundle: FlowBundle): FlowLifecycleClassification {
  const inventory = reviewContentInventory(bundle);
  const artifactAudit = getNaturalArtifactAudit(bundle.flow.slug);

  if (inventory.publicHandling === 'hidden' || artifactAudit?.decision === 'replace_or_hide_source') {
    return {
      slug: inventory.slug,
      title: inventory.title,
      bucket: 'hide',
      label: FLOW_LIFECYCLE_BUCKET_LABELS.hide,
      score: inventory.score,
      reviewLevel: inventory.level,
      inventoryDecision: inventory.decision,
      publicHandling: inventory.publicHandling,
      sourcePrecision: inventory.sourcePrecision,
      auditDecision: artifactAudit?.decision ?? inventory.decision,
      reason: artifactAudit
        ? `자연 산출물 audit에서 교체/숨김 후보로 판정했습니다: ${artifactAudit.currentContentGap}`
        : inventory.reason,
      nextAction: artifactAudit?.nextContentAction ?? inventory.nextAction,
      publicAction: publicActionFor('hide'),
    };
  }

  if (inventory.level === 'manual_source_fit' && inventory.decision === 'keep_representative') {
    return {
      slug: inventory.slug,
      title: inventory.title,
      bucket: 'keep',
      label: FLOW_LIFECYCLE_BUCKET_LABELS.keep,
      score: inventory.score,
      reviewLevel: inventory.level,
      inventoryDecision: inventory.decision,
      publicHandling: inventory.publicHandling,
      sourcePrecision: inventory.sourcePrecision,
      auditDecision: inventory.decision,
      reason: `source-fit audit에서 대표 유지로 판정했습니다. ${inventory.reason}`,
      nextAction: inventory.nextAction,
      publicAction: publicActionFor('keep'),
    };
  }

  if (inventory.level === 'generated_preview_candidate') {
    return {
      slug: inventory.slug,
      title: inventory.title,
      bucket: 'preview_only',
      label: FLOW_LIFECYCLE_BUCKET_LABELS.preview_only,
      score: inventory.score,
      reviewLevel: inventory.level,
      inventoryDecision: inventory.decision,
      publicHandling: inventory.publicHandling,
      sourcePrecision: inventory.sourcePrecision,
      auditDecision: inventory.decision,
      reason: inventory.reason,
      nextAction: inventory.nextAction,
      publicAction: publicActionFor('preview_only'),
    };
  }

  if (inventory.level === 'legacy_accessible') {
    if (bundle.flow.source_url) {
      return {
        slug: inventory.slug,
        title: inventory.title,
        bucket: 'fix',
        label: FLOW_LIFECYCLE_BUCKET_LABELS.fix,
        score: inventory.score,
        reviewLevel: inventory.level,
        inventoryDecision: inventory.decision,
        publicHandling: inventory.publicHandling,
        sourcePrecision: inventory.sourcePrecision,
        auditDecision: inventory.decision,
        reason: `${inventory.reason} 원본 URL은 있으나 source_status와 수동 audit이 없어 보강이 필요합니다.`,
        nextAction: 'source_status를 real로 승격하거나 수동 source-fit audit을 작성한 뒤 대표/카탈로그 정책을 다시 결정합니다.',
        publicAction: publicActionFor('fix'),
      };
    }

    return {
      slug: inventory.slug,
      title: inventory.title,
      bucket: 'remove_candidate',
      label: FLOW_LIFECYCLE_BUCKET_LABELS.remove_candidate,
      score: inventory.score,
      reviewLevel: inventory.level,
      inventoryDecision: inventory.decision,
      publicHandling: inventory.publicHandling,
      sourcePrecision: inventory.sourcePrecision,
      auditDecision: inventory.decision,
      reason: `${inventory.reason} 원본 검토 상태가 없습니다.`,
      nextAction: '삭제, 원본 교체, 또는 source-backed Flow로 재작성할지 결정합니다.',
      publicAction: publicActionFor('remove_candidate'),
    };
  }

  return {
    slug: inventory.slug,
    title: inventory.title,
    bucket: 'fix',
    label: FLOW_LIFECYCLE_BUCKET_LABELS.fix,
    score: inventory.score,
    reviewLevel: inventory.level,
    inventoryDecision: inventory.decision,
    publicHandling: inventory.publicHandling,
    sourcePrecision: inventory.sourcePrecision,
    auditDecision: artifactAudit?.decision ?? inventory.decision,
    reason: artifactAudit
      ? `자연 산출물 audit 기준 보강이 필요합니다. ${artifactAudit.currentContentGap}`
      : `source-fit 또는 real-source 1차 분류 기준 보강이 필요합니다. ${inventory.reason}`,
    nextAction: artifactAudit
      ? `수동 source-fit 승격 전에 처리: ${artifactAudit.nextContentAction} / ${artifactAudit.nextUxAction}`
      : inventory.nextAction,
    publicAction: publicActionFor('fix'),
  };
}

export function classifyFlowLifecycle(bundle: FlowBundle): FlowLifecycleClassification {
  return classifyBucket(bundle);
}

export function classifyFlowLifecycles(bundles: FlowBundle[]): FlowLifecycleClassification[] {
  return bundles.map(classifyFlowLifecycle);
}

export function summarizeFlowLifecycle(bundles: FlowBundle[]): FlowLifecycleSummary {
  const classifications = classifyFlowLifecycles(bundles);
  const bucketCounts = { ...emptyBucketCounts };

  for (const classification of classifications) {
    bucketCounts[classification.bucket] += 1;
  }

  return {
    totalCount: classifications.length,
    bucketCounts,
    keepSlugs: classifications.filter((item) => item.bucket === 'keep').map((item) => item.slug),
    fixSlugs: classifications.filter((item) => item.bucket === 'fix').map((item) => item.slug),
    previewOnlySlugs: classifications.filter((item) => item.bucket === 'preview_only').map((item) => item.slug),
    hideSlugs: classifications.filter((item) => item.bucket === 'hide').map((item) => item.slug),
    removeCandidateSlugs: classifications
      .filter((item) => item.bucket === 'remove_candidate')
      .map((item) => item.slug),
    classifications,
  };
}
