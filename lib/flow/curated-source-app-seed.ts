import curatedSourceAppSeedJson from '../../docs/content-audit/2026-07-01-curated-source-app-seed-v1.json';
import type {
  AnchorType,
  FlowBundle,
  FlowItem,
  FlowItemDetail,
  FlowItemLinkType,
  PrimaryDestination,
  RiskLevel,
  SourceType,
  StructureType,
} from './types';
import type {
  SourceBackedFlowMapQualityDecision,
  SourceBackedMyFlowMap,
} from './source-backed-my-flow';
import { CURATED_SOURCE_APP_SEED_TAG } from './curated-source-app-seed-meta';

type SeedSetupField = {
  key: string;
  label: string;
  type: string;
  required: boolean;
  scope: string;
};

type SeedStepItem = {
  itemId: string;
  itemTitle: string;
  detail?: string;
  sourceRowIds?: string[];
  sourceTrace?: string;
};

type SeedStep = {
  stepId: string;
  stepTitle: string;
  order: number;
  itemTitle: string;
  items: SeedStepItem[];
  memo?: string;
  detail?: string;
  sourceUrl?: string;
  sourceTrace?: string;
  sourceRows?: unknown[];
  exportHints?: {
    calendarTitle?: string;
    checklistTitle?: string;
    sheetRowLabel?: string;
    memoShouldIncludeSource?: boolean;
  };
};

type SeedFlow = {
  flowId: string;
  slug: string;
  title: string;
  pattern: string;
  order: number;
  recommended?: boolean;
  defaultDestination: string;
  sourceTrace?: string;
  setupFields?: SeedSetupField[];
  executionFields?: unknown[];
  steps: SeedStep[];
  counts: {
    steps: number;
    items: number;
  };
};

type SeedBundle = {
  bundleId: string;
  sourceNo: number;
  title: string;
  category: string;
  categoryLabel: string;
  categoryPattern: string;
  appPattern: string;
  status: 'ready_draft' | 'partial_draft' | 'source_import_required';
  userFacingStatus: string;
  appExposure: string;
  sourceUrls: string[];
  recommendedFlowId: string;
  setupFields: SeedSetupField[];
  executionFields?: unknown[];
  sourceRows?: unknown[];
  flows: SeedFlow[];
  counts: {
    flows: number;
    steps: number;
    items: number;
    sourceRows: number;
  };
};

type CuratedSourceAppSeed = {
  schemaVersion: string;
  generatedAt: string;
  contentBundles: SeedBundle[];
  totals: {
    bundles: number;
    flows: number;
    steps: number;
    items: number;
  };
};

type StepTiming = Pick<FlowItem, 'day_offset' | 'duration_days' | 'date_window'>;

const curatedSourceAppSeed = curatedSourceAppSeedJson as unknown as CuratedSourceAppSeed;
const generatedAt = curatedSourceAppSeed.generatedAt || '2026-07-01T00:00:00.000Z';
const duplicateCanonicalUrlLookupHoldMapIds = new Set([
  'funmom-study-routine-map',
  'opic-plan-map',
  'reading-routine-map',
  'new-car-map',
  'homefit-map',
  'moving-map',
  'vaccination-map',
  'wedding-map',
]);
const duplicateCanonicalUrlLookupHoldNotes: Record<string, { reason: string; nextAction: string }> = {
  'funmom-study-routine-map': {
    reason: 'Source import required map shares a broad canonical URL with a more specific curated source-backed map.',
    nextAction:
      'Keep the canonical review record and creator workspace, but remove the parked map from the public catalog and direct public route until it is merged or re-sourced.',
  },
  'opic-plan-map': {
    reason:
      'Legacy curated source app seed shares the same canonical source URL and execution shape with the stronger curated-opic-mock-course map.',
    nextAction:
      'Keep the canonical review record and creator workspace, but let curated-opic-mock-course own the public catalog and direct public route.',
  },
  'reading-routine-map': {
    reason:
      'Legacy reading routine app seed shares the same Naver source URL with the stronger curated-reading-routine-log monthly execution structure.',
    nextAction:
      'Keep the canonical review record and creator workspace, but let curated-reading-routine-log own the public catalog and direct public route while sourceTrace cleanup remains separate.',
  },
  'new-car-map': {
    reason:
      'Legacy curated source app seed shares the same Getcha source URL and 7-step purchase shape with the stronger curated-new-car-purchase-guide map.',
    nextAction:
      'Keep the canonical review record and creator workspace, but let curated-new-car-purchase-guide own the public catalog and direct public route.',
  },
  'homefit-map': {
    reason:
      'Legacy Allblanc channel map shares a broad YouTube channel URL with the stronger curated-allblanc-workout-park exact-video map.',
    nextAction:
      'Keep the canonical review record and creator workspace, but let curated-allblanc-workout-park own the public catalog and direct public route.',
  },
  'moving-map': {
    reason:
      'Legacy moving app seed shares the same AJD source URL and D-day moving checklist job with the stronger curated-ajd-moving-d30 map.',
    nextAction:
      'Keep the canonical review record and creator workspace, but let curated-ajd-moving-d30 own the public catalog and direct public route.',
  },
  'vaccination-map': {
    reason:
      'Legacy vaccination app seed shares the same official KHMS source URL and medical-sensitive baby vaccination schedule job with the stronger curated-child-vaccination-schedule map.',
    nextAction:
      'Keep the canonical review record and creator workspace, but let curated-child-vaccination-schedule own the public catalog and direct public route with review-before-apply handling.',
  },
  'wedding-map': {
    reason:
      'Legacy wedding app seed shares the same Naver source URL with the stronger curated-wedding-checklist-family map and its separated timeline/checklist child Flows.',
    nextAction:
      'Keep the canonical review record and creator workspace, but let curated-wedding-checklist-family own the public catalog and direct public route while sourceTrace cleanup remains separate.',
  },
};

function findPrimaryDateSetup(fields: SeedSetupField[] = []): SeedSetupField | undefined {
  return fields.find((field) => field.type === 'date');
}

function getAnchorType(fields: SeedSetupField[] = []): AnchorType {
  const key = findPrimaryDateSetup(fields)?.key;
  if (!key) return 'none';
  if (key === 'childBirthDate') return 'baby_birth_date';
  if (key === 'movingDate' || key === 'weddingDate' || key === 'targetPurchaseDate' || key === 'targetFinishDate') {
    return 'end_date';
  }
  return 'start_date';
}

function getPrimaryDestination(destination: string): PrimaryDestination {
  if (destination.includes('calendar') && destination.includes('checklist')) return 'hybrid';
  if (destination.includes('calendar')) return 'calendar';
  if (destination.includes('sheet')) return 'sheet';
  if (destination.includes('memo') && destination.includes('checklist')) return 'sheet';
  if (destination.includes('memo')) return 'memo';
  if (destination.includes('checklist')) return 'internal_check';
  return 'internal_check';
}

function getStructureType(flow: SeedFlow): StructureType {
  const pattern = `${flow.pattern} ${flow.defaultDestination}`.toLowerCase();
  if (pattern.includes('timeline') || pattern.includes('schedule')) return 'timeline';
  if (pattern.includes('routine') || flow.defaultDestination.startsWith('routine')) return 'routine';
  if (pattern.includes('checklist')) return 'checklist';
  return 'phase';
}

function getRiskLevel(bundle: SeedBundle): RiskLevel {
  if (bundle.bundleId === 'vaccination-map' || bundle.bundleId === 'baby-food-map' || bundle.bundleId === 'homefit-map') {
    return 'medical_sensitive';
  }
  if (bundle.bundleId === 'new-car-map' || bundle.bundleId === 'wedding-map') return 'financial_sensitive';
  if (bundle.bundleId === 'moving-map') return 'medium';
  return 'low';
}

function getSourceType(bundle: SeedBundle, url?: string): SourceType {
  const value = `${bundle.categoryPattern} ${url ?? bundle.sourceUrls.join(' ')}`.toLowerCase();
  if (value.includes('official') || value.includes('kdca') || value.includes('nip.kdca') || value.includes('khms')) return 'official';
  if (value.includes('youtube') || value.includes('tistory') || value.includes('naver')) return 'creator_experience';
  return 'reference';
}

function getLinkType(sourceType: SourceType): FlowItemLinkType {
  if (sourceType === 'official') return 'official';
  if (sourceType === 'creator_experience') return 'creator';
  return 'reference';
}

function getSourceStatus(status: SeedBundle['status']) {
  return status === 'ready_draft' ? 'real' : 'preview';
}

function getQualityStatus(status: SeedBundle['status']): SourceBackedFlowMapQualityDecision['status'] {
  if (status === 'ready_draft') return 'candidate';
  if (status === 'partial_draft') return 'revise';
  return 'park';
}

function getQualityScore(status: SeedBundle['status']): number {
  if (status === 'ready_draft') return 6;
  if (status === 'partial_draft') return 4;
  return 3;
}

function getArtifacts(bundle: SeedBundle): string[] {
  const destinations = bundle.flows.map((flow) => flow.defaultDestination).join(' ');
  return [
    destinations.includes('calendar') || destinations.includes('routine') ? '캘린더 일정' : undefined,
    '체크리스트',
    '시트 백업',
  ].filter((item): item is string => Boolean(item));
}

function getSetupInput(bundle: SeedBundle): SourceBackedMyFlowMap['setupInput'] {
  const setup = findPrimaryDateSetup(bundle.setupFields);
  if (!setup) return undefined;
  return {
    label: setup.label,
    hint: `${setup.label} 기준으로 원문 항목을 날짜나 반복 흐름에 맞춰 저장합니다.`,
  };
}

function buildMapSummary(bundle: SeedBundle): string {
  const flowLabel = `${bundle.counts.flows}개 묶음`;
  const itemLabel = `${bundle.counts.steps}개 할 일`;
  return `${bundle.userFacingStatus}. ${bundle.categoryLabel} 원문을 ${flowLabel}, ${itemLabel}로 옮겨 저장하고 실행할 수 있습니다.`;
}

function sourceTitle(bundle: SeedBundle): string {
  return bundle.sourceUrls.length > 1 ? `${bundle.title} 원문 ${bundle.sourceUrls.length}개` : `${bundle.title} 원문`;
}

function parseDPlusRange(title: string): { start: number; end: number } | undefined {
  const range = title.match(/D\+(\d+)\s*~\s*(?:D\+)?(\d+)/i);
  if (!range) return undefined;
  const start = Number(range[1]);
  const end = Number(range[2]);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return undefined;
  return { start, end };
}

function parseStepTiming(step: SeedStep, order: number, anchorType: AnchorType, structureType: StructureType): StepTiming {
  const title = step.stepTitle.trim();
  const range = parseDPlusRange(title);
  if (range) {
    const startOffset = anchorType === 'baby_birth_date' ? range.start : Math.max(0, range.start - 1);
    const endOffset = anchorType === 'baby_birth_date' ? range.end : Math.max(0, range.end - 1);
    return {
      day_offset: startOffset,
      duration_days: Math.max(1, endOffset - startOffset + 1),
      date_window: {
        label: title,
        start_day_offset: startOffset,
        end_day_offset: endOffset,
      },
    };
  }

  if (anchorType === 'end_date') {
    const dMinus = title.match(/D-(\d+)/i);
    if (dMinus) return { day_offset: -Number(dMinus[1]), duration_days: 1 };
    if (/D-?Day|당일/.test(title)) return { day_offset: 0, duration_days: 1 };
    const monthBefore = title.match(/(\d+)\s*개월\s*전/);
    if (monthBefore) return { day_offset: -Number(monthBefore[1]) * 30, duration_days: 1 };
    const weekBefore = title.match(/(\d+)\s*주\s*전/);
    if (weekBefore) return { day_offset: -Number(weekBefore[1]) * 7, duration_days: 1 };
  }

  if (anchorType === 'baby_birth_date') {
    if (/출생/.test(title)) return { day_offset: 0, duration_days: 1 };
    const month = title.match(/(\d+)\s*개월/);
    if (month) return { day_offset: Number(month[1]) * 30, duration_days: 1 };
    const year = title.match(/(\d+)\s*세/);
    if (year) return { day_offset: Number(year[1]) * 365, duration_days: 1 };
  }

  if (anchorType === 'start_date') {
    const day = title.match(/^Day\s*(\d+)/i);
    if (day) return { day_offset: Math.max(0, Number(day[1]) - 1), duration_days: 1 };
    const dPlus = title.match(/D\+(\d+)/i);
    if (dPlus) return { day_offset: Math.max(0, Number(dPlus[1]) - 1), duration_days: 1 };
    const week = title.match(/^(\d+)\s*주차/);
    if (week) return { day_offset: Math.max(0, Number(week[1]) - 1) * 7, duration_days: 7 };
    if (structureType === 'timeline' || structureType === 'routine') return { day_offset: order, duration_days: 1 };
  }

  return {};
}

function buildStepDescription(step: SeedStep): string {
  return [
    `원문 항목: ${step.stepTitle}`,
    step.memo,
    step.detail,
    step.sourceTrace ? `원문 근거: ${step.sourceTrace}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function buildCompletionCriteria(step: SeedStep): string {
  if (step.items.length > 1) return `${step.items.length}개 체크 항목을 확인했습니다.`;
  return `${step.itemTitle} 완료`;
}

function buildStepDetail(bundle: SeedBundle, step: SeedStep): FlowItemDetail {
  const sourceType = getSourceType(bundle, step.sourceUrl);
  return {
    item_id: step.stepId,
    why: buildStepDescription(step),
    how: step.items.map((item) => item.itemTitle).join('\n'),
    completion_criteria: buildCompletionCriteria(step),
    ...(getRiskLevel(bundle) === 'medical_sensitive'
      ? { caution: '건강·영유아 관련 내용은 보호자가 상태를 확인하고 공식 정보나 전문가 안내를 우선합니다.' }
      : {}),
    links: step.sourceUrl
      ? [
          {
            label: step.stepTitle ? `${step.stepTitle} 원문` : '원문',
            url: step.sourceUrl,
            type: getLinkType(sourceType),
          },
        ]
      : undefined,
  };
}

function buildFlowItem(bundle: SeedBundle, flow: SeedFlow, step: SeedStep, order: number): FlowItem {
  const anchorType = getAnchorType(flow.setupFields ?? bundle.setupFields);
  const structureType = getStructureType(flow);
  const primaryDestination = getPrimaryDestination(flow.defaultDestination);
  const timing = parseStepTiming(step, order, anchorType, structureType);
  const sourceType = getSourceType(bundle, step.sourceUrl);
  const hasCalendarTiming = timing.day_offset !== undefined && primaryDestination !== 'internal_check' && primaryDestination !== 'memo' && primaryDestination !== 'sheet';
  return {
    id: step.stepId,
    flow_id: `flow-curated-source-app-${flow.flowId}`,
    section_id: `${flow.flowId}-source-steps`,
    title: step.exportHints?.calendarTitle ?? step.itemTitle,
    description: buildStepDescription(step),
    type: hasCalendarTiming ? 'calendar' : 'todo',
    ...timing,
    source_type: sourceType,
    risk_level: getRiskLevel(bundle),
    order,
  };
}

function buildFlowBundle(bundle: SeedBundle, flow: SeedFlow): FlowBundle {
  const setupFields = flow.setupFields?.length ? flow.setupFields : bundle.setupFields;
  const setupInput = findPrimaryDateSetup(setupFields);
  const anchorType = getAnchorType(setupFields);
  const structureType = getStructureType(flow);
  const primaryDestination = getPrimaryDestination(flow.defaultDestination);
  const riskLevel = getRiskLevel(bundle);
  const sectionId = `${flow.flowId}-source-steps`;
  const firstStepSourceUrl = flow.steps.find((step) => step.sourceUrl)?.sourceUrl;
  const flowSourceUrl = firstStepSourceUrl ?? bundle.sourceUrls[0];
  const sourceType = getSourceType(bundle, flowSourceUrl);
  const hasWeekdaySetup = setupFields.some((field) => field.key === 'targetWeekdays');

  return {
    flow: {
      id: `flow-curated-source-app-${flow.flowId}`,
      slug: flow.slug,
      title: flow.title,
      description: `${bundle.title} 원문에서 ${flow.steps.length}개 할 일을 옮겨 저장한 콘텐츠입니다.`,
      category: bundle.categoryLabel,
      structure_type: structureType,
      anchor_type: anchorType,
      status: 'published',
      source_title: sourceTitle(bundle),
      source_url: flowSourceUrl,
      source_status: getSourceStatus(bundle.status),
      source_precision: flowSourceUrl ? 'exact' : 'broad',
      primary_destination: primaryDestination,
      setup_anchor_label: setupInput?.label,
      setup_anchor_hint: setupInput ? `${setupInput.label} 기준으로 원문 항목을 배치합니다.` : undefined,
      source_checked_at: generatedAt,
      conversion_note: '원문 구조를 할 일과 체크 항목으로 옮겼습니다.',
      risk_level: riskLevel,
      warning:
        riskLevel === 'medical_sensitive'
          ? '건강·영유아 관련 내용은 관찰 메모용이며, 공식 정보나 전문가 안내를 우선합니다.'
          : undefined,
      created_at: generatedAt,
      updated_at: generatedAt,
      tags: [
        'source-backed',
        CURATED_SOURCE_APP_SEED_TAG,
        `flow-map:${bundle.bundleId}`,
        `recommended-flow:${bundle.recommendedFlowId}`,
        sourceType === 'official' ? 'official' : 'source',
      ],
    },
    sections: [
      {
        id: sectionId,
        flow_id: `flow-curated-source-app-${flow.flowId}`,
        title: '원문 항목',
        order: 0,
      },
    ],
    items: flow.steps.map((step, order) => buildFlowItem(bundle, flow, step, order)),
    itemDetails: flow.steps.map((step) => buildStepDetail(bundle, step)),
    repeatRules: hasWeekdaySetup && structureType === 'routine' ? ['월/수/금'] : undefined,
  };
}

export const curatedSourceAppSeedFlowMapQualityDecisions: Record<string, SourceBackedFlowMapQualityDecision> =
  Object.fromEntries(
    curatedSourceAppSeed.contentBundles.map((bundle) => [
      bundle.bundleId,
      {
        mapId: bundle.bundleId,
        status: getQualityStatus(bundle.status),
        homepageEligible: false,
        directRouteEnabled: !duplicateCanonicalUrlLookupHoldMapIds.has(bundle.bundleId),
        productScore: getQualityScore(bundle.status),
        reason: duplicateCanonicalUrlLookupHoldNotes[bundle.bundleId]
          ? duplicateCanonicalUrlLookupHoldNotes[bundle.bundleId].reason
          : `${bundle.userFacingStatus} 상태의 curated source app seed입니다.`,
        nextAction: duplicateCanonicalUrlLookupHoldNotes[bundle.bundleId]
          ? duplicateCanonicalUrlLookupHoldNotes[bundle.bundleId].nextAction
          : '사용자 화면에서는 상태 문구와 원문 링크를 유지하고, 앱 실행 경로로만 노출합니다.',
      } satisfies SourceBackedFlowMapQualityDecision,
    ]),
  );

export const curatedSourceAppSeedFlowMaps: SourceBackedMyFlowMap[] = curatedSourceAppSeed.contentBundles.map((bundle) => ({
  id: bundle.bundleId,
  userLabel: bundle.title,
  title: bundle.title,
  version: '2026-07-01.1',
  updatedAt: generatedAt,
  updatePolicy: bundle.status === 'ready_draft' ? 'auto_patch_when_safe' : 'review_before_apply',
  summary: buildMapSummary(bundle),
  sourceTitle: sourceTitle(bundle),
  sourceUrl: bundle.sourceUrls[0],
  artifacts: getArtifacts(bundle),
  setupInput: getSetupInput(bundle),
  flowSlugs: bundle.flows.map((flow) => flow.slug),
  categoryLabel: bundle.categoryLabel,
  userFacingStatus: bundle.userFacingStatus,
  recommendedFlowSlug: bundle.recommendedFlowId,
  counts: bundle.counts,
  sourceUrlCount: bundle.sourceUrls.length,
}));

export const curatedSourceAppSeedFlowBundles: FlowBundle[] = curatedSourceAppSeed.contentBundles.flatMap((bundle) =>
  bundle.flows.map((flow) => buildFlowBundle(bundle, flow)),
);

export function getCuratedSourceAppSeedMapIds(): string[] {
  return curatedSourceAppSeed.contentBundles.map((bundle) => bundle.bundleId);
}
