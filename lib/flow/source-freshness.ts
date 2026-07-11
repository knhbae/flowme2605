import { normalizeExecutionModel } from './execution-model';
import type { FlowBundle } from './types';

const DAY_IN_MS = 86_400_000;
const SOURCE_REVIEW_DUE_DAYS = 90;
const SOURCE_STALE_DAYS = 180;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SEOUL_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

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

function toSeoulDateTimestamp(date: Date) {
  const parts = Object.fromEntries(
    SEOUL_DATE_FORMATTER.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
}

function parseCalendarDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  return new Date(timestamp).toISOString().slice(0, 10) === value ? timestamp : null;
}

function parseSourceCheckedAt(value: string) {
  const calendarDate = value.slice(0, 10);
  if (!ISO_DATE_PATTERN.test(calendarDate) || parseCalendarDate(calendarDate) === null) {
    return null;
  }
  if (value === calendarDate) {
    return parseCalendarDate(calendarDate);
  }
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? toSeoulDateTimestamp(new Date(timestamp)) : null;
}

function hasValidSourceUrl(value?: string) {
  if (!value) {
    return false;
  }
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

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
    hasValidSourceUrl(bundle.flow.source_url) ? null : 'source_url',
    bundle.flow.source_checked_at ? null : 'source_checked_at',
    bundle.flow.source_precision === 'exact' || bundle.flow.source_precision === 'broad'
      ? null
      : 'source_precision',
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

  const checkedTime = parseSourceCheckedAt(bundle.flow.source_checked_at as string);
  if (checkedTime === null) {
    return {
      slug: bundle.flow.slug,
      title: bundle.flow.title,
      exposureStatus,
      bucket: 'missing_metadata',
      checkedAt: bundle.flow.source_checked_at,
      missingFields: ['source_checked_at'],
    };
  }

  const ageDays = Math.floor((toSeoulDateTimestamp(asOf) - checkedTime) / DAY_IN_MS);
  if (ageDays < 0) {
    return {
      slug: bundle.flow.slug,
      title: bundle.flow.title,
      exposureStatus,
      bucket: 'missing_metadata',
      checkedAt: bundle.flow.source_checked_at,
      missingFields: ['source_checked_at_future'],
    };
  }
  const bucket =
    ageDays > SOURCE_STALE_DAYS
      ? 'stale'
      : ageDays > SOURCE_REVIEW_DUE_DAYS
        ? 'review_due'
        : 'current';

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
