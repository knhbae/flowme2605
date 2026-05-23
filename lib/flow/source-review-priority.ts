import type { FlowBundle, SourceType } from './types';

export type SourceReviewPriority =
  | 'audit_now'
  | 'source_replacement'
  | 'risk_review'
  | 'content_backlog';

export const SOURCE_REVIEW_PRIORITY_LABELS: Record<SourceReviewPriority, string> = {
  audit_now: '바로 audit',
  source_replacement: '원본 교체',
  risk_review: '리스크 검토',
  content_backlog: '콘텐츠 보강',
};

export type SourceReviewPriorityItem = {
  slug: string;
  title: string;
  priority: SourceReviewPriority;
  label: string;
  score: number;
  reason: string;
  nextAction: string;
};

export type SourceReviewPrioritySummary = {
  totalCount: number;
  priorityCounts: Record<SourceReviewPriority, number>;
  items: SourceReviewPriorityItem[];
};

const emptyPriorityCounts: Record<SourceReviewPriority, number> = {
  audit_now: 0,
  source_replacement: 0,
  risk_review: 0,
  content_backlog: 0,
};

function isNeedsReview(bundle: FlowBundle): boolean {
  return bundle.flow.source_status === 'needs_review';
}

function isSensitive(bundle: FlowBundle): boolean {
  return bundle.flow.risk_level === 'medical_sensitive' || bundle.flow.risk_level === 'financial_sensitive';
}

function sourceTypes(bundle: FlowBundle): SourceType[] {
  const itemTypes = bundle.items.map((item) => item.source_type).filter((value): value is SourceType => Boolean(value));
  const detailTypes: SourceType[] = (bundle.itemDetails ?? [])
    .flatMap((detail) => detail.links ?? [])
    .map((link) => (link.type === 'official' ? 'official' : link.type === 'creator' ? 'creator_experience' : 'reference'));
  return [...itemTypes, ...detailTypes];
}

function hasOfficialOrReferenceSource(bundle: FlowBundle): boolean {
  return sourceTypes(bundle).some((sourceType) => sourceType === 'official' || sourceType === 'reference');
}

function detailCoverage(bundle: FlowBundle): number {
  if (bundle.items.length === 0) return 0;
  const detailIds = new Set((bundle.itemDetails ?? []).map((detail) => detail.item_id));
  return detailIds.size / bundle.items.length;
}

function scoreNeedsReview(bundle: FlowBundle): number {
  let score = 0;
  if (bundle.flow.source_url) score += 15;
  if (bundle.flow.source_precision === 'exact') score += 25;
  if (hasOfficialOrReferenceSource(bundle)) score += 20;
  if (detailCoverage(bundle) >= 0.8) score += 15;
  else if (detailCoverage(bundle) > 0) score += 5;
  if (bundle.flow.primary_destination && bundle.flow.primary_destination !== 'internal_check') score += 10;
  if (!isSensitive(bundle)) score += 15;
  else if (bundle.flow.warning || bundle.warnings?.length) score += 5;
  return Math.max(0, Math.min(100, score));
}

function priorityFor(bundle: FlowBundle, score: number): SourceReviewPriority {
  if (bundle.flow.source_precision === 'broad') return 'source_replacement';
  if (isSensitive(bundle)) return 'risk_review';
  if (score >= 70) return 'audit_now';
  return 'content_backlog';
}

function reasonFor(bundle: FlowBundle, priority: SourceReviewPriority): string {
  if (priority === 'source_replacement') {
    return 'broad source라 대표 승격 전에 정확한 원본을 먼저 찾아야 합니다.';
  }
  if (priority === 'risk_review') {
    return '민감 영역이 포함되어 콘텐츠/주의/공식 기준을 먼저 검토해야 합니다.';
  }
  if (priority === 'audit_now') {
    return 'exact source와 실행 구조가 있어 수동 source-fit audit을 바로 진행할 수 있습니다.';
  }
  return '원본 URL은 있으나 항목 상세나 실행 산출물 보강 후 audit하는 편이 낫습니다.';
}

function nextActionFor(priority: SourceReviewPriority): string {
  if (priority === 'source_replacement') return '정확한 원본 URL을 지정한 뒤 자연 산출물 audit을 다시 작성합니다.';
  if (priority === 'risk_review') return '공식 정보, 민감 고지, 사용자 입력/출력 범위를 먼저 수동 검토합니다.';
  if (priority === 'audit_now') return '수동 source-fit audit을 작성하고 통과 시 real-source 또는 대표 후보로 승격합니다.';
  return 'why/how/completion, 외부 산출물 preview, export 기준을 보강합니다.';
}

export function reviewSourceNeedsReviewPriority(bundle: FlowBundle): SourceReviewPriorityItem | undefined {
  if (!isNeedsReview(bundle)) return undefined;
  const score = scoreNeedsReview(bundle);
  const priority = priorityFor(bundle, score);
  return {
    slug: bundle.flow.slug,
    title: bundle.flow.title,
    priority,
    label: SOURCE_REVIEW_PRIORITY_LABELS[priority],
    score,
    reason: reasonFor(bundle, priority),
    nextAction: nextActionFor(priority),
  };
}

export function summarizeSourceNeedsReviewPriority(bundles: FlowBundle[]): SourceReviewPrioritySummary {
  const items = bundles
    .map(reviewSourceNeedsReviewPriority)
    .filter((item): item is SourceReviewPriorityItem => Boolean(item))
    .sort((left, right) => right.score - left.score || left.slug.localeCompare(right.slug));
  const priorityCounts = { ...emptyPriorityCounts };

  for (const item of items) {
    priorityCounts[item.priority] += 1;
  }

  return {
    totalCount: items.length,
    priorityCounts,
    items,
  };
}
