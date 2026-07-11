import { normalizeExecutionModel } from './execution-model';
import type { FlowBundle } from './types';

const DAY_IN_MS = 86_400_000;

export type FlowSourceFreshnessBucket =
  | 'current'
  | 'review_due'
  | 'stale'
  | 'missing_metadata'
  | 'preview_or_hidden';

export type FlowSourceFreshnessClassification = {
  slug: string;
  title: string;
  exposureStatus: ReturnType<typeof normalizeExecutionModel>['exposureStatus'];
  bucket: FlowSourceFreshnessBucket;
  checkedAt?: string;
  ageDays?: number;
  missingFields: string[];
};

export function classifyFlowSourceFreshness(
  bundle: FlowBundle,
  asOf = new Date(),
): FlowSourceFreshnessClassification {
  const exposureStatus = normalizeExecutionModel(bundle).exposureStatus;
  if (exposureStatus === 'catalog_preview' || exposureStatus === 'hidden') {
    return {
      slug: bundle.flow.slug,
      title: bundle.flow.title,
      exposureStatus,
      bucket: 'preview_or_hidden',
      checkedAt: bundle.flow.source_checked_at,
      missingFields: [],
    };
  }

  const missingFields = [
    bundle.flow.source_url ? null : 'source_url',
    bundle.flow.source_checked_at ? null : 'source_checked_at',
    bundle.flow.source_precision ? null : 'source_precision',
  ].filter((field): field is string => Boolean(field));
  if (missingFields.length > 0) {
    return {
      slug: bundle.flow.slug,
      title: bundle.flow.title,
      exposureStatus,
      bucket: 'missing_metadata',
      checkedAt: bundle.flow.source_checked_at,
      missingFields,
    };
  }

  const checkedTime = Date.parse(bundle.flow.source_checked_at as string);
  if (!Number.isFinite(checkedTime)) {
    return {
      slug: bundle.flow.slug,
      title: bundle.flow.title,
      exposureStatus,
      bucket: 'missing_metadata',
      checkedAt: bundle.flow.source_checked_at,
      missingFields: ['source_checked_at'],
    };
  }

  const ageDays = Math.max(0, Math.floor((asOf.getTime() - checkedTime) / DAY_IN_MS));
  const bucket = ageDays > 180 ? 'stale' : ageDays > 90 ? 'review_due' : 'current';

  return {
    slug: bundle.flow.slug,
    title: bundle.flow.title,
    exposureStatus,
    bucket,
    checkedAt: bundle.flow.source_checked_at,
    ageDays,
    missingFields: [],
  };
}

export function summarizeFlowSourceFreshness(bundles: FlowBundle[], asOf = new Date()) {
  const classifications = bundles
    .filter((bundle) => bundle.flow.status === 'published')
    .map((bundle) => classifyFlowSourceFreshness(bundle, asOf));
  const count = (bucket: FlowSourceFreshnessBucket) =>
    classifications.filter((classification) => classification.bucket === bucket).length;

  return {
    asOf: asOf.toISOString(),
    publishedCount: classifications.length,
    normalUserRouteCount: classifications.filter(
      (classification) => classification.bucket !== 'preview_or_hidden',
    ).length,
    previewOrHiddenCount: count('preview_or_hidden'),
    currentCount: count('current'),
    reviewDueCount: count('review_due'),
    staleCount: count('stale'),
    missingMetadataCount: count('missing_metadata'),
    attention: classifications.filter((classification) =>
      ['review_due', 'stale', 'missing_metadata'].includes(classification.bucket),
    ),
  };
}
