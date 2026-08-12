import type {
  AnchorType,
  FlowBundle,
  FlowItem,
  FlowItemDetail,
  FlowSection,
  PrimaryDestination,
  RiskLevel,
  SourceType,
  StructureType,
} from './types';
import {
  additionalSourceBackedMyFlowBundles,
  additionalSourceBackedMyFlowMaps,
} from './source-backed-expansion-260625';
import {
  curatedSourceBackedFlowMapQualityDecisions,
  curatedSourceBackedMyFlowBundles,
  curatedSourceBackedMyFlowMaps,
} from './source-backed-curated-260630';
import {
  curatedSourceAppSeedFlowBundles,
  curatedSourceAppSeedFlowMapQualityDecisions,
  curatedSourceAppSeedFlowMaps,
} from './curated-source-app-seed';
import { isRuntimeExcludedBundle } from './runtime-content-policy';

export type SourceBackedStepDestination = 'calendar' | 'todo' | 'checklist' | 'sheet' | 'memo' | 'progress';
export type SourceBackedFlowMapCreatorEditableField =
  | 'step_title'
  | 'step_destination'
  | 'source_url'
  | 'item_fallback'
  | 'creator_note';

export type SourceBackedMyFlowRow = {
  stepId: string;
  flowId: string;
  mapId?: string;
  title: string;
  destination: SourceBackedStepDestination;
  sourceTitle?: string;
  sourceUrl?: string;
  sourceType?: SourceType;
  riskLevel?: RiskLevel;
  calendar: {
    mode: 'absolute' | 'anchor_offset' | 'routine' | 'none';
    anchorType?: AnchorType;
    dayOffset?: number;
    allDay?: boolean;
    repeatRule?: string;
    window?: {
      label: string;
      startDayOffset: number;
      endDayOffset: number;
    };
  };
  textFallback: {
    title: string;
    description: string;
    items?: string[];
    memoHint?: string;
    url?: string;
    doneWhen?: string;
  };
};

export type ProgressStepNeedAssessment = {
  decision: 'not_needed_yet' | 'needs_first_class_type';
  reason: string;
  evidence: string[];
};

export type SourceBackedFlowMapUpdatePolicy = 'auto_patch_when_safe' | 'review_before_apply';
export type SourceBackedFlowMapCandidateStatus = 'representative' | 'candidate' | 'revise' | 'park' | 'reject';

export type SourceBackedFlowMapQualityDecision = {
  mapId: string;
  status: SourceBackedFlowMapCandidateStatus;
  homepageEligible: boolean;
  directRouteEnabled: boolean;
  publicExecutionEnabled?: boolean;
  executionHoldReason?: 'official_freshness' | 'source_rows' | 'medical_source_fit';
  publicCatalogEligible?: boolean;
  productScore: number;
  reason: string;
  nextAction: string;
};

export type SourceBackedMyFlowMap = {
  id: string;
  userLabel: string;
  title: string;
  version: string;
  updatedAt: string;
  updatePolicy: SourceBackedFlowMapUpdatePolicy;
  summary: string;
  sourceTitle: string;
  sourceUrl: string;
  reviewUrl?: string;
  artifacts: string[];
  setupInput?: {
    label: string;
    hint: string;
    defaultValue?: string;
  };
  publicSaveMode?: 'save_all' | 'choose_child';
  publicChoiceCopy?: {
    resultPromise: string;
    heading: string;
    body: string;
    inputLabel: string;
    childCtaLabel: string;
  };
  flowSlugs: string[];
  categoryLabel?: string;
  userFacingStatus?: string;
  recommendedFlowSlug?: string;
  counts?: {
    flows: number;
    steps: number;
    items: number;
    sourceRows?: number;
  };
  sourceUrlCount?: number;
};

export type SourceBackedFlowMapSavedSnapshot = {
  mapId: string;
  title: string;
  version: string;
  savedAt: string;
  anchor?: string;
  flowSlugs: string[];
  stepCountsByFlow: Record<string, number>;
  riskLevelsByFlow: Record<string, RiskLevel | undefined>;
  sourceCheckedAtByFlow: Record<string, string | undefined>;
  personalCopy?: SourceBackedFlowMapPersonalCopy;
};

export type SourceBackedFlowMapPersonalCopy = {
  source: 'url_first_custom_start' | 'version_review' | 'personal_edit';
  originalTitle?: string;
  includedStepIdsByFlow: Record<string, string[]>;
  excludedStepIdsByFlow: Record<string, string[]>;
  stepOverridesByFlow?: Record<string, Record<string, SourceBackedFlowMapPersonalCopyStepOverride>>;
  retainedStepsByFlow?: Record<string, Record<string, SourceBackedFlowMapStepBinding>>;
};

export type SourceBackedFlowMapPersonalCopyStepOverride = {
  title?: string;
  schedule?: {
    mode: 'fixed_date';
    date: string;
  };
  userMemo?: string;
};

export type SourceBackedFlowMapStepBinding = {
  stepId: string;
  title: string;
  destination: SourceBackedStepDestination;
  calendar: SourceBackedMyFlowRow['calendar'];
  textFallback: SourceBackedMyFlowRow['textFallback'];
  sourceUrl?: string;
  sourceType?: SourceType;
  riskLevel?: RiskLevel;
};

export type SourceBackedFlowMapChildBinding = {
  slug: string;
  flowId: string;
  title: string;
  category: string;
  structureType: StructureType;
  anchorType: AnchorType;
  primaryDestination: PrimaryDestination;
  riskLevel?: RiskLevel;
  sourceTitle?: string;
  sourceUrl?: string;
  sourceCheckedAt?: string;
  stepCount: number;
  itemFallbackCount: number;
  stepIds: string[];
  steps: SourceBackedFlowMapStepBinding[];
};

export type SourceBackedFlowMapPersistenceRecord = {
  schemaVersion: 1;
  recordType: 'saved_source_backed_flow_map';
  bridgeStorageKey: string;
  map: {
    id: string;
    title: string;
    userLabel: string;
    version: string;
    updatedAt: string;
    updatePolicy: SourceBackedFlowMapUpdatePolicy;
    sourceTitle: string;
    sourceUrl: string;
  };
  saved: {
    savedAt: string;
    sourceSurface: 'public_save';
    anchor?: string;
  };
  readiness: {
    content: 'ready_for_my_flow' | 'needs_creator_review';
    update: SourceBackedFlowMapUpdateAssessment['status'];
    reasons: string[];
  };
  childFlows: SourceBackedFlowMapChildBinding[];
  updateAssessment: SourceBackedFlowMapUpdateAssessment;
  personalCopy?: SourceBackedFlowMapPersonalCopy;
};

export type SourceBackedFlowMapPersonalCopyAdjustment = {
  snapshot: SourceBackedFlowMapSavedSnapshot;
  persistenceRecord: SourceBackedFlowMapPersistenceRecord;
};

export type SourceBackedFlowMapAnchorAdjustment = {
  snapshot: SourceBackedFlowMapSavedSnapshot;
  persistenceRecord: SourceBackedFlowMapPersistenceRecord;
};

export type SourceBackedFlowMapUpdateAssessment = {
  status: 'up_to_date' | 'map_missing' | 'minor_update_available' | 'review_before_apply';
  userAction: 'none' | 'reconnect_source' | 'review_changes';
  canApplyAutomatically: boolean;
  savedVersion: string;
  currentVersion?: string;
  reasons: string[];
  affectedFlows: string[];
};

export type SourceBackedFlowMapPublishPackage = {
  map: SourceBackedMyFlowMap;
  creator: {
    surface: 'creator_publish';
    sourceRows: {
      flowSlug: string;
      flowTitle: string;
      sectionTitle?: string;
      stepId: string;
      sourceRowTitle: string;
      sourceRowDescription: string;
      stepTitle: string;
      generatedStepTitle: string;
      destination: SourceBackedStepDestination;
      scheduleSummary: string;
      sourceType?: SourceType;
      riskLevel?: RiskLevel;
      sourceUrl?: string;
      itemCount: number;
      detailItems: string[];
      itemFallbackText: string;
      doneWhen?: string;
      memoHint?: string;
      reviewStatus: 'ready' | 'needs_source' | 'needs_items';
      reviewLabel: string;
      reviewNote: string;
    }[];
    publishChecks: string[];
    publishBlockers: string[];
    publicPreviewHref: string;
    draft: {
      storageKey: string;
      publishedVersion: string;
      draftVersion: string;
      editableFields: SourceBackedFlowMapCreatorEditableField[];
    };
  };
  public: {
    surface: 'public_save';
    title: string;
    summary: string;
    sourceTitle: string;
    sourceUrl: string;
    setupInputs: string[];
    setupInput?: SourceBackedMyFlowMap['setupInput'];
    saveMode: NonNullable<SourceBackedMyFlowMap['publicSaveMode']>;
    choiceCopy?: SourceBackedMyFlowMap['publicChoiceCopy'];
    primaryCta: { label: string; href: string };
    secondaryCtas: { label: string; href: string }[];
    artifacts: string[];
    categoryLabel?: string;
    userFacingStatus?: string;
    recommendedFlowSlug?: string;
    counts?: SourceBackedMyFlowMap['counts'];
    sourceUrlCount?: number;
    childFlows: {
      slug: string;
      title: string;
      destination: PrimaryDestination;
      steps: {
        id: string;
        title: string;
        stepTitle?: string;
        memo?: string;
        sourceUrl?: string;
        sourceTrace?: string;
        detailItemCount: number;
        detailItems: string[];
      }[];
    }[];
  };
  myFlow: {
    surface: 'my_flow_saved';
    demoHref: string;
    groupedAs: string;
    savedSlugs: string[];
    visibleTabs: string[];
  };
};

export type SourceBackedFlowMapDateAnchorCopy = {
  label: string;
  editLabel: string;
  help: string;
  itemOverrideLabel: string;
  distinction: string;
};

type SourceBackedFlowMapDateAnchorSource = SourceBackedMyFlowMap | SourceBackedFlowMapPublishPackage;

function sourceBackedDateAnchorText(source?: SourceBackedFlowMapDateAnchorSource): string {
  if (!source) return '';
  if ('public' in source) {
    return [
      source.public.title,
      source.public.summary,
      source.public.categoryLabel,
      source.public.setupInput?.label,
      source.public.setupInput?.hint,
      ...source.public.artifacts,
      ...source.public.childFlows.flatMap((flow) => [flow.title, ...flow.steps.map((step) => step.title)]),
    ]
      .filter(Boolean)
      .join(' ');
  }
  return [
    source.title,
    source.userLabel,
    source.summary,
    source.categoryLabel,
    source.setupInput?.label,
    source.setupInput?.hint,
    ...source.artifacts,
  ]
    .filter(Boolean)
    .join(' ');
}

function getExplicitSourceBackedDateAnchorLabel(source?: SourceBackedFlowMapDateAnchorSource): string | undefined {
  if (!source) return undefined;
  const label = 'public' in source ? source.public.setupInput?.label : source.setupInput?.label;
  const normalized = label?.trim();
  return normalized || undefined;
}

export function getSourceBackedFlowMapDateAnchorCopy(source?: SourceBackedFlowMapDateAnchorSource): SourceBackedFlowMapDateAnchorCopy {
  const explicitLabel = getExplicitSourceBackedDateAnchorLabel(source);
  const text = sourceBackedDateAnchorText(source);
  return buildDateAnchorCopy(explicitLabel ?? inferDateAnchorLabel(text));
}

function inferDateAnchorLabel(text: string): string {
  return /이사/u.test(text)
    ? '이사일'
    : /출국|여행/u.test(text)
      ? '출국일'
      : /결혼|예식/u.test(text)
        ? '예식일'
        : /시험|고사|수능|자격|검정/u.test(text)
          ? '시험일'
          : /마감|제출|신청|접수/u.test(text)
            ? '마감일'
            : /학습|공부|수학|진도|단원|교육/u.test(text)
              ? '학습 시작일'
              : /운동|러닝|챌린지|루틴|반복/u.test(text)
                ? '시작일'
                : '기준일';
}

function buildDateAnchorCopy(label: string): SourceBackedFlowMapDateAnchorCopy {
  const help = `${label}을 바꾸면 전체 일정 기준이 다시 맞춰집니다. 따로 바꾼 할 일 날짜는 그대로 유지됩니다.`;
  return {
    label,
    editLabel: `${label} 바꾸기`,
    help,
    itemOverrideLabel: '이 할 일 날짜',
    distinction: `${label}은 전체 일정 기준이고, 이 할 일 날짜는 해당 할 일만 바꿉니다.`,
  };
}

export function getFlowBundleDateAnchorCopy(bundle: FlowBundle): SourceBackedFlowMapDateAnchorCopy {
  const text = [
    bundle.flow.title,
    bundle.flow.description,
    bundle.flow.category,
    bundle.flow.source_title,
    ...bundle.sections.map((section) => section.title),
    ...bundle.items.slice(0, 8).map((item) => item.title),
  ]
    .filter(Boolean)
    .join(' ');
  return buildDateAnchorCopy(inferDateAnchorLabel(text));
}

export const SOURCE_BACKED_MANUAL_REGISTRATION_CHECKLIST = [
  'canonical URL: normalize the production lookup key before adding a Flow.',
  'original/source URL: preserve the exact pasted source URL separately from the canonical key.',
  'sourceTrace: every executable Step must keep the source row/section evidence, not just a generic source link.',
  'Step split: split only source-backed actions that a user can actually do, copy, or schedule.',
  'date/relative/repeat: record absolute dates, anchor offsets, date windows, and repeat rules explicitly.',
  'risk/sensitive/execution blocker: reject or hold unsafe, sensitive, one-off, or non-executable content.',
  'quality decision: directRouteEnabled keeps an approved direct route; publicExecutionEnabled=false holds new save, export, and URL hits.',
];

export type SourceBackedManualRegistrationIssueCode =
  | 'duplicate_canonical_source_url'
  | 'empty_registered_steps'
  | 'missing_source_trace'
  | 'missing_source_url';

export type SourceBackedManualRegistrationIssue = {
  code: SourceBackedManualRegistrationIssueCode;
  severity: 'error' | 'warning';
  message: string;
  mapIds: string[];
  flowSlugs?: string[];
  stepIds?: string[];
};

export type SourceBackedManualRegistrationReadinessReport = {
  checklist: string[];
  lookupableMapIds: string[];
  blockedMapIds: string[];
  issues: SourceBackedManualRegistrationIssue[];
};

export type SourceBackedManualRegistrationReadinessOptions = {
  maps?: SourceBackedMyFlowMap[];
  bundles?: FlowBundle[];
  decisions?: Record<string, SourceBackedFlowMapQualityDecision>;
};

export type UrlFirstLookupableSourceBackedFlowMapOptions = {
  maps?: SourceBackedMyFlowMap[];
  decisions?: Record<string, SourceBackedFlowMapQualityDecision>;
};

export const sourceBackedFlowMapQualityDecisions: Record<string, SourceBackedFlowMapQualityDecision> = {
  'moving-d30': {
    mapId: 'moving-d30',
    status: 'representative',
    homepageEligible: true,
    directRouteEnabled: true,
    productScore: 8.5,
    reason: 'Clear D-day life event with a strong save reason and a natural calendar/checklist artifact.',
    nextAction: 'Keep as the strongest practical baseline; only simplify copy or Step detail when needed.',
  },
  'middle-school-math-1': {
    mapId: 'middle-school-math-1',
    status: 'candidate',
    homepageEligible: true,
    directRouteEnabled: true,
    productScore: 7,
    reason: 'Flow Map hierarchy works, but the source is dry and scheduling behavior still needs product judgment.',
    nextAction: 'Keep as a structure candidate; improve source summary, source links, and optional scheduling later.',
  },
  'baby-health-schedule': {
    mapId: 'baby-health-schedule',
    status: 'revise',
    homepageEligible: false,
    directRouteEnabled: true,
    publicExecutionEnabled: false,
    productScore: 5,
    reason: 'Official schedule can be useful, but current Step actions are shallow and not representative yet.',
    nextAction: 'Rebuild from official schedule/table logic plus practical prep/source detail before homepage exposure.',
  },
  'postal-address-transfer': {
    mapId: 'postal-address-transfer',
    status: 'park',
    homepageEligible: false,
    directRouteEnabled: true,
    productScore: 4,
    reason: 'The current official page supports a next-day status check, but payment and service-start dates depend on business-day rules.',
    nextAction: 'Keep one verified next-day check as a direct-only utility and leave variable dates to the official service result.',
  },
  'smishing-response': {
    mapId: 'smishing-response',
    status: 'reject',
    homepageEligible: false,
    directRouteEnabled: true,
    productScore: 2,
    reason: 'One-off emergency response is better as a source link or memo than a Flow Map proof point.',
    nextAction: 'Do not promote unless a reusable official response checklist source changes the job.',
  },
  'year-end-tax-submit': {
    mapId: 'year-end-tax-submit',
    status: 'park',
    homepageEligible: false,
    directRouteEnabled: true,
    publicExecutionEnabled: false,
    executionHoldReason: 'official_freshness',
    productScore: 4,
    reason: 'The exact source is a 2025 video, while employer deadlines vary and the existing D-3/D-1 schedule is not an NTS deadline.',
    nextAction: 'Re-source against the current tax year and rebuild without inferred dates before enabling save or export.',
  },
  'aircon-filter-cleaning': {
    mapId: 'aircon-filter-cleaning',
    status: 'park',
    homepageEligible: false,
    directRouteEnabled: true,
    productScore: 3,
    reason: 'The current Samsung 1way guide supports the two-week-or-alert routine, but the job is narrow and overlaps maintenance patterns already tested.',
    nextAction: 'Keep as a direct-only utility, preserve the 1way model check, and do not present it as a universal air-conditioner routine.',
  },
  'picnic-food-safety': {
    mapId: 'picnic-food-safety',
    status: 'reject',
    homepageEligible: false,
    directRouteEnabled: true,
    productScore: 1,
    reason: 'Generic safety tips do not create a strong save or revisit reason.',
    nextAction: 'Do not promote unless tied to a concrete event-prep source with clear checklist ownership.',
  },
  ...curatedSourceBackedFlowMapQualityDecisions,
  ...curatedSourceAppSeedFlowMapQualityDecisions,
};

export function getSourceBackedFlowMapSnapshotStorageKey(mapId: string): string {
  return `flow:map:saved:${mapId}`;
}

export function getSourceBackedFlowMapPersistenceStorageKey(mapId: string): string {
  return `flow:map:persistence:${mapId}`;
}

const now = '2026-06-23T00:00:00.000Z';
const movingSourceUrl =
  'https://www.ajd.co.kr/contents/basic-tip/detail/이사_준비_체크리스트_완벽정리!_엑셀_Xls_PDF_노션_notion_첨부-23363';
const mathSourceUrl = 'https://mathbang.net/13';
const babyHealthCheckupSourceUrl = 'https://easylaw.go.kr/CSP/CnpClsMain.laf?ccfNo=1&cciNo=2&cnpClsNo=2&csmSeq=1138&popMenu=ov';
const babyHealthCheckupInfoUrl =
  'https://health.kdca.go.kr/healthinfo/biz/health/ntcnInfo/healthSourc/thtimtCntnts/thtimtCntntsView.do?thtimt_cntnts_sn=131&utm_medium=kdca&utm_source=kdca';
const babyVaccinationScheduleUrl = 'https://nip.kdca.go.kr/irhp/infm/goVcntInfo.do?menuCd=115&menuLv=1';
const babyVaccinationLookupUrl = 'https://nip.kdca.go.kr/irhp/mngm/goVcntMngm.do?menuCd=313&menuLv=3';

function movingSourceTrace(stepId: string): string {
  return `sourceTrace: AJD moving checklist article ${movingSourceUrl} - ${stepId}`;
}

function mathSourceTrace(stepId: string, orderLabel: string): string {
  return `sourceTrace: Mathbang middle-school math table of contents ${mathSourceUrl} - ${orderLabel} ${stepId}`;
}

function babyHealthCheckupSourceTrace(stepId: string, period: string): string {
  return `sourceTrace: EasyLaw infant health checkup official schedule ${babyHealthCheckupSourceUrl} - checkup row: ${stepId} ${period}`;
}

function babyVaccinationSourceTrace(stepId: string, period: string): string {
  return `sourceTrace: KDCA child vaccination official schedule ${babyVaccinationScheduleUrl} - vaccination row: ${stepId} ${period}`;
}

const movingDetails: Record<string, FlowItemDetail> = {
  'moving-method-quotes': {
    item_id: 'moving-method-quotes',
    why: ['짐 양과 예산에 맞는 이사 방식을 먼저 정해야 견적 비교가 가능합니다.', movingSourceTrace('moving-method-quotes')].join('\n'),
    how: ['이사 방식 1개를 정합니다.', '견적 후보 2-3곳을 열고 연락처를 메모합니다.', '포함 범위와 예상 비용을 짧게 남깁니다.'].map((item) => `- ${item}`).join('\n'),
    completion_criteria: '견적 후보 2-3곳과 연락처, 비용 범위가 메모됐습니다.',
    links: [{ label: 'AJD 이사 준비 체크리스트', url: movingSourceUrl, type: 'reference' }],
  },
  'moving-cleaning-waste': {
    item_id: 'moving-cleaning-waste',
    why: ['입주청소와 대형폐기물은 예약/수거일이 이사일과 충돌할 수 있습니다.', movingSourceTrace('moving-cleaning-waste')].join('\n'),
    how: ['입주청소가 필요하면 예약 가능일을 확인합니다.', '대형폐기물 신고 가능 품목과 수거일을 확인합니다.', '예약처와 신고 번호를 메모합니다.'].map((item) => `- ${item}`).join('\n'),
    completion_criteria: '예약일, 수거일, 신고 번호가 메모됐습니다.',
    links: [{ label: 'AJD 이사 준비 체크리스트', url: movingSourceUrl, type: 'reference' }],
  },
  'moving-address-admin': {
    item_id: 'moving-address-admin',
    why: ['주소 변경과 관리사무소 공유는 이사 당일 동선과 우편물 누락을 줄입니다.', movingSourceTrace('moving-address-admin')].join('\n'),
    how: ['관리사무소에 이사 시간과 차량 동선을 공유합니다.', '자주 쓰는 배송 계정 주소 변경 대상을 확인합니다.', '우편물 주소 변경이 필요한 곳을 메모합니다.'].map((item) => `- ${item}`).join('\n'),
    completion_criteria: '관리사무소 공유와 주소 변경 대상 메모가 끝났습니다.',
    links: [{ label: 'AJD 이사 준비 체크리스트', url: movingSourceUrl, type: 'reference' }],
  },
  'moving-meter-photos': {
    item_id: 'moving-meter-photos',
    why: ['계량기와 집 상태 사진은 정산과 하자 확인 때 다시 볼 근거가 됩니다.', movingSourceTrace('moving-meter-photos')].join('\n'),
    how: ['전기, 가스, 수도 계량기를 촬영합니다.', '현관, 욕실, 창문, 콘센트 주변 상태를 촬영합니다.', '사진 위치나 공유 여부만 짧게 메모합니다.'].map((item) => `- ${item}`).join('\n'),
    completion_criteria: '계량기와 주요 공간 사진 위치가 메모됐습니다.',
    links: [{ label: 'AJD 이사 준비 체크리스트', url: movingSourceUrl, type: 'reference' }],
  },
  'moving-move-day-admin': {
    item_id: 'moving-move-day-admin',
    why: ['이사 당일 처리해야 하는 행정/정산 항목은 놓치면 다시 확인해야 합니다.', movingSourceTrace('moving-move-day-admin')].join('\n'),
    how: ['잔금/정산 확인 내용을 메모합니다.', '전입신고와 확정일자 확인 필요 여부를 체크합니다.', '처리 결과나 다시 볼 링크만 남깁니다.'].map((item) => `- ${item}`).join('\n'),
    completion_criteria: '정산 메모와 행정 확인 결과가 남았습니다.',
    links: [
      { label: '정부24', url: 'https://www.gov.kr', type: 'official' },
      { label: '인터넷등기소', url: 'https://www.iros.go.kr', type: 'official' },
    ],
  },
};

const mathUnits = [
  {
    id: 'math-prime-factorization',
    orderLabel: '1.',
    title: '소인수분해',
    summary: '자연수의 성질과 약수, 배수 관계를 확인합니다.',
    concepts: [
      '거듭제곱',
      '소수와 합성수',
      '에라토스테네스의 체',
      '소인수분해',
      '소인수분해를 이용하여 약수 개수구하기',
      '최대공약수의 뜻과 최대공약수 구하는 방법',
      '최소공배수의 뜻과 최소공배수 구하는 방법',
      '최대공약수와 최소공배수의 관계',
    ],
  },
  {
    id: 'math-integers-rationals',
    orderLabel: '2.',
    title: '정수와 유리수',
    summary: '양수와 음수, 정수와 유리수의 사칙연산 흐름을 확인합니다.',
    concepts: [
      '양수와 음수, 정수',
      '절댓값과 수직선',
      '정수의 대소관계',
      '부등호의 사용',
      '정수의 덧셈, 교환·결합법칙',
      '정수의 뺄셈',
      '정수 덧셈·뺄셈 혼합계산',
      '정수의 곱셈, 교환·결합법칙',
      '정수 나눗셈과 혼합계산',
      '분배법칙',
      '유리수와 유리수의 분류',
      '유리수와 수직선, 대소관계',
      '유리수의 덧셈과 뺄셈',
      '유리수의 곱셈과 나눗셈',
    ],
  },
  {
    id: 'math-letter-expression',
    orderLabel: '3.',
    title: '문자와 식',
    summary: '문자를 포함한 식과 일차방정식 풀이 흐름을 확인합니다.',
    concepts: [
      '문자와 식, 문자를 포함하는 식',
      '곱셈기호와 나눗셈 기호의 생략',
      '대입, 식의 값',
      '항, 계수, 차수, 단항식과 다항식',
      '일차식의 곱셈과 나눗셈',
      '동류항, 일차식의 덧셈과 뺄셈',
      '방정식과 항등식',
      '등식의 성질과 방정식의 풀이',
      '일차방정식의 풀이',
      '복잡한 일차방정식의 풀이',
      '활용 1 - 숫자, 나이',
      '활용 2 - 거리, 속력, 시간, 농도',
    ],
  },
  {
    id: 'math-coordinate-graph',
    orderLabel: '4.',
    title: '좌표평면과 그래프',
    summary: '좌표평면, 그래프, 정비례와 반비례를 확인합니다.',
    concepts: ['순서쌍과 좌표평면', '그래프의 뜻과 표현', '정비례와 그래프', '반비례와 그래프'],
  },
  {
    id: 'math-basic-geometry',
    orderLabel: '5.',
    title: '기본도형',
    summary: '점, 선, 면의 위치 관계와 평행선, 작도, 합동을 확인합니다.',
    concepts: [
      '점, 선, 면, 직선, 반직선, 선분',
      '두 점 사이의 거리와 중점',
      '평각, 직각, 예각, 둔각',
      '맞꼭지각, 동위각, 엇각',
      '직교와 수직, 점과 직선 사이의 거리',
      '점, 직선, 평면의 위치 관계',
      '평면에서의 위치 관계',
      '공간에서의 위치 관계',
      '공간에서 두 평면의 위치 관계',
      '위치 관계 총정리',
      '평행선의 성질',
      '작도와 크기가 같은 각의 작도',
      '삼각형의 정의, 대변, 대각',
      '삼각형의 작도',
      '도형의 합동, 삼각형의 합동 조건',
    ],
  },
  {
    id: 'math-plane-figures',
    orderLabel: '6.',
    title: '평면도형의 성질',
    summary: '다각형과 원, 부채꼴의 성질과 넓이 흐름을 확인합니다.',
    concepts: [
      '다각형, 내각, 외각, 정다각형',
      '대각선의 개수 구하기 공식',
      '삼각형 내각과 외각의 성질',
      '다각형 내각과 외각의 합',
      '원과 부채꼴, 호, 현, 중심각',
      '원과 부채꼴의 넓이와 둘레',
    ],
  },
  {
    id: 'math-solid-figures',
    orderLabel: '7.',
    title: '입체도형의 성질',
    summary: '다면체와 회전체, 겉넓이와 부피 개념을 확인합니다.',
    concepts: [
      '다면체, 각뿔, 각기둥, 각뿔대',
      '정다면체의 뜻과 종류',
      '회전체와 원뿔대, 회전체의 성질',
      '각기둥과 원기둥의 겉넓이와 부피',
      '각뿔과 원뿔의 겉넓이와 부피',
      '구의 겉넓이와 부피',
    ],
  },
  {
    id: 'math-data-analysis',
    orderLabel: '8.',
    title: '자료의 정리와 해석',
    summary: '자료 정리, 대푯값, 도수분포와 그래프를 확인합니다.',
    concepts: [
      '대푯값, 평균, 중앙값, 최빈값',
      '줄기와 잎 그림',
      '도수분포표, 변량, 계급, 도수',
      '도수분포표 만드는 방법',
      '히스토그램',
      '도수분포다각형',
      '상대도수와 그 분포표',
      '상대도수의 그래프',
    ],
  },
] as const;

const mathDetails: Record<string, FlowItemDetail> = Object.fromEntries(
  mathUnits.map((unit) => [
    unit.id,
    {
      item_id: unit.id,
      why: [
        `원문 목차의 ${unit.orderLabel} ${unit.title} 단원입니다. 하위 개념 ${unit.concepts.length}개를 읽은 만큼 체크합니다.`,
        mathSourceTrace(unit.id, unit.orderLabel),
      ].join('\n'),
      how: unit.concepts.map((concept) => `- ${concept}`).join('\n'),
      completion_criteria: '이 단원의 하위 개념을 확인했고, 다시 볼 개념이 있으면 메모했습니다.',
      links: [{ label: 'Mathbang 중1 수학 목차에서 보기', url: mathSourceUrl, type: 'reference' }],
    } satisfies FlowItemDetail,
  ]),
);

const healthCheckupWindows = [
  { id: 'baby-checkup-01', sectionId: 'baby-health-general', title: '1차 건강검진', period: '생후 14~35일', dayOffset: 14, durationDays: 22, memoFocus: '문진표와 신체계측 방문 여부' },
  { id: 'baby-checkup-02', sectionId: 'baby-health-general', title: '2차 건강검진', period: '생후 4~6개월', dayOffset: 120, durationDays: 61, memoFocus: '문진표와 건강교육 확인' },
  { id: 'baby-checkup-03', sectionId: 'baby-health-general', title: '3차 건강검진', period: '생후 9~12개월', dayOffset: 270, durationDays: 91, memoFocus: '문진표와 발달선별검사 작성 여부' },
  { id: 'baby-checkup-04', sectionId: 'baby-health-general', title: '4차 건강검진', period: '생후 18~24개월', dayOffset: 540, durationDays: 181, memoFocus: '발달선별검사와 예약 상태' },
  { id: 'baby-checkup-05', sectionId: 'baby-health-general', title: '5차 건강검진', period: '생후 30~36개월', dayOffset: 900, durationDays: 181, memoFocus: '시력검사와 전자미디어 교육 확인' },
  { id: 'baby-checkup-06', sectionId: 'baby-health-general', title: '6차 건강검진', period: '생후 42~48개월', dayOffset: 1260, durationDays: 181, memoFocus: '귓속말 검사와 발달선별검사 확인' },
  { id: 'baby-checkup-07', sectionId: 'baby-health-general', title: '7차 건강검진', period: '생후 54~60개월', dayOffset: 1620, durationDays: 181, memoFocus: '개인위생 교육과 다음 확인 필요 여부' },
  { id: 'baby-checkup-08', sectionId: 'baby-health-general', title: '8차 건강검진', period: '생후 66~71개월', dayOffset: 1980, durationDays: 151, memoFocus: '취학 전 준비 교육과 결과 통보서 위치' },
  { id: 'baby-oral-checkup-01', sectionId: 'baby-health-oral', title: '1차 구강검진', period: '생후 18~29개월', dayOffset: 540, durationDays: 331, memoFocus: '구강문진표와 치과 예약 상태' },
  { id: 'baby-oral-checkup-02', sectionId: 'baby-health-oral', title: '2차 구강검진', period: '생후 30~41개월', dayOffset: 900, durationDays: 331, memoFocus: '구강문진표와 방문 결과' },
  { id: 'baby-oral-checkup-03', sectionId: 'baby-health-oral', title: '3차 구강검진', period: '생후 42~53개월', dayOffset: 1260, durationDays: 331, memoFocus: '구강문진표와 다시 볼 안내' },
  { id: 'baby-oral-checkup-04', sectionId: 'baby-health-oral', title: '4차 구강검진', period: '생후 54~65개월', dayOffset: 1620, durationDays: 331, memoFocus: '구강보건교육 확인과 결과 위치' },
] as const;

const vaccinationWindows = [
  { id: 'baby-vaccination-birth', title: '출생 직후 예방접종 일정 확인', period: '출생 직후~생후 4주', dayOffset: 0 },
  { id: 'baby-vaccination-2m', title: '생후 2개월 예방접종 일정 확인', period: '생후 2개월', dayOffset: 60 },
  { id: 'baby-vaccination-4m', title: '생후 4개월 예방접종 일정 확인', period: '생후 4개월', dayOffset: 120 },
  { id: 'baby-vaccination-6m', title: '생후 6개월 예방접종 일정 확인', period: '생후 6개월', dayOffset: 180 },
  { id: 'baby-vaccination-12m', title: '생후 12~15개월 예방접종 일정 확인', period: '생후 12~15개월', dayOffset: 365 },
  { id: 'baby-vaccination-18m', title: '생후 18개월 이후 추가 접종 확인', period: '생후 18개월 이후', dayOffset: 540 },
] as const;

const healthCheckupDetails: Record<string, FlowItemDetail> = Object.fromEntries(
  healthCheckupWindows.map((window) => [
    window.id,
    {
      item_id: window.id,
      why: [
        `${window.period}에 해당하는 ${window.title} 기간을 놓치지 않기 위한 공식 일정 항목입니다.`,
        babyHealthCheckupSourceTrace(window.id, window.period),
      ].join('\n'),
      how: [
        `${window.title} 대상 기간이 ${window.period}인지 공식 안내에서 확인합니다.`,
        `${window.memoFocus}만 짧게 남깁니다.`,
        '검진 결과 해석이나 의료 판단은 Flow에 쓰지 않고 결과지/의료기관 안내를 따릅니다.',
      ].map((item) => `- ${item}`).join('\n'),
      completion_criteria: '예약, 문진표 작성, 방문 여부 또는 결과지 위치가 메모됐습니다.',
      caution: 'FlowMe는 검진 결과를 해석하거나 진료 필요 여부를 판단하지 않습니다.',
      links: [
        { label: '영유아 건강검진 시기 안내', url: babyHealthCheckupSourceUrl, type: 'official' },
        { label: '질병관리청 영유아 건강검진 정보', url: babyHealthCheckupInfoUrl, type: 'official' },
      ],
    } satisfies FlowItemDetail,
  ]),
);

const vaccinationDetails: Record<string, FlowItemDetail> = Object.fromEntries(
  vaccinationWindows.map((window) => [
    window.id,
    {
      item_id: window.id,
      why: [
        `${window.period}에 아이 표준예방접종일을 공식 조회하기 위한 일정 항목입니다.`,
        babyVaccinationSourceTrace(window.id, window.period),
      ].join('\n'),
      how: [
        '예방접종도우미에서 아이 생년월일 기준 표준예방접종일을 확인합니다.',
        '접종기관, 예약 여부, 예진표 작성 여부만 메모합니다.',
        '지연접종이나 접종 가능 여부는 의료기관 또는 공식 안내에 따라 확인합니다.',
      ].map((item) => `- ${item}`).join('\n'),
      completion_criteria: '공식 조회 결과, 예약 또는 완료 여부가 메모됐습니다.',
      caution: '표준 일정과 실제 접종 가능 여부가 다를 수 있으므로 공식 조회와 의료기관 확인을 우선합니다.',
      links: [
        { label: '질병관리청 표준 예방접종 일정표', url: babyVaccinationScheduleUrl, type: 'official' },
        { label: '아이 예방접종 일정보기', url: babyVaccinationLookupUrl, type: 'tool' },
      ],
    } satisfies FlowItemDetail,
  ]),
);

export const sourceBackedMyFlowMaps: SourceBackedMyFlowMap[] = [
  {
    id: 'moving-d30',
    userLabel: '이사 D-30 지도',
    title: '원룸 이사 D-30 일정 지도',
    version: '2026-06-24.1',
    updatedAt: now,
    updatePolicy: 'auto_patch_when_safe',
    summary: '이사일 1개를 기준으로 원문 체크리스트의 실행 단서를 D-30, D-14, D-7, D-1, D-Day 일정으로 저장합니다. FlowMe에는 연락처, 예약번호, 다시 볼 링크만 짧게 남깁니다.',
    sourceTitle: 'AJD 이사 준비 체크리스트',
    sourceUrl: movingSourceUrl,
    artifacts: ['D-30 일정', '이사 전 체크', '연락처·예약번호 메모'],
    categoryLabel: '이사 준비',
    setupInput: {
      label: '이사일',
      hint: '이사일 1개를 넣으면 원문 체크리스트의 주요 실행 항목을 날짜별 할 일로 배치합니다.',
      defaultValue: '2026-07-22',
    },
    flowSlugs: ['source-backed-moving-d30'],
  },
  {
    id: 'middle-school-math-1',
    userLabel: '중1 수학 지도',
    title: '중1 수학 목차 진도표',
    version: '2026-06-24.1',
    updatedAt: now,
    updatePolicy: 'auto_patch_when_safe',
    summary: '원문 목차의 8개 단원과 하위 개념을 진도표로 저장합니다. 공부 코치가 아니라 읽은 개념과 다시 볼 개념만 남깁니다.',
    sourceTitle: 'Mathbang 중1 수학 목차',
    sourceUrl: mathSourceUrl,
    artifacts: ['8개 단원 진도표', '하위 개념 체크', '원문 링크'],
    categoryLabel: '학습 진도',
    flowSlugs: ['source-backed-middle-school-math-1'],
  },
  {
    id: 'baby-health-schedule',
    userLabel: '영유아 건강 일정',
    title: '영유아 검진·접종 일정 지도',
    version: '2026-06-23.1',
    updatedAt: now,
    updatePolicy: 'review_before_apply',
    summary: '아이 생년월일을 기준으로 공식 검진 시기와 예방접종 조회 시점을 내 Flow에 저장합니다. FlowMe에는 예약 상태와 결과 위치만 남깁니다.',
    sourceTitle: '공식 영유아 검진·예방접종 안내',
    sourceUrl: babyHealthCheckupSourceUrl,
    artifacts: ['검진 일정', '예방접종 조회 일정', '예약·문진표 메모'],
    categoryLabel: '아이 건강 일정',
    setupInput: {
      label: '아이 생년월일',
      hint: '생년월일 1개로 검진·접종 확인 시점을 배치합니다. 실제 가능 여부는 공식 조회와 의료기관 안내를 우선합니다.',
      defaultValue: '2026-01-15',
    },
    flowSlugs: [
      'source-backed-baby-health-checkups',
      'source-backed-baby-vaccination-schedule',
    ],
  },
  ...additionalSourceBackedMyFlowMaps,
  ...curatedSourceBackedMyFlowMaps,
  ...curatedSourceAppSeedFlowMaps,
];

export const sourceBackedMyFlowBundles: FlowBundle[] = [
  {
    flow: {
      id: 'flow-source-backed-moving-d30',
      slug: 'source-backed-moving-d30',
      title: '원룸 이사 D-30 준비',
      description: '이사일을 기준으로 원문 체크리스트의 실행 단서를 날짜별 Step으로 저장합니다.',
      category: '이사',
      structure_type: 'timeline',
      content_type: 'default',
      anchor_type: 'end_date',
      status: 'published',
      source_title: 'AJD 이사 준비 체크리스트',
      source_url: movingSourceUrl,
      source_status: 'real',
      source_precision: 'exact',
      source_checked_at: '2026-06-23',
      primary_destination: 'hybrid',
      risk_level: 'low',
      created_at: now,
      updated_at: now,
      tags: ['source-backed', 'flow-map:moving-d30', 'timeline', 'calendar'],
    },
    sections: [
      { id: 'moving-before', flow_id: 'flow-source-backed-moving-d30', title: '이사 전 준비', order: 0 },
      { id: 'moving-day', flow_id: 'flow-source-backed-moving-d30', title: '이사 당일', order: 1 },
    ],
    items: [
      {
        id: 'moving-method-quotes',
        flow_id: 'flow-source-backed-moving-d30',
        section_id: 'moving-before',
        title: '이사 방식과 견적 후보 정하기',
        description: '방식, 후보 업체, 비용 범위만 짧게 남깁니다.',
        type: 'calendar',
        day_offset: -30,
        duration_days: 1,
        source_type: 'creator_experience',
        order: 0,
      },
      {
        id: 'moving-cleaning-waste',
        flow_id: 'flow-source-backed-moving-d30',
        section_id: 'moving-before',
        title: '입주청소와 대형폐기물 일정 확인',
        description: '예약일과 수거일이 이사일과 겹치지 않는지 봅니다.',
        type: 'calendar',
        day_offset: -14,
        duration_days: 1,
        source_type: 'creator_experience',
        order: 1,
      },
      {
        id: 'moving-address-admin',
        flow_id: 'flow-source-backed-moving-d30',
        section_id: 'moving-before',
        title: '관리사무소 공유와 주소 변경 대상 확인',
        description: '이사 시간, 차량 동선, 주소 변경 대상을 메모합니다.',
        type: 'calendar',
        day_offset: -7,
        duration_days: 1,
        source_type: 'creator_experience',
        order: 2,
      },
      {
        id: 'moving-meter-photos',
        flow_id: 'flow-source-backed-moving-d30',
        section_id: 'moving-before',
        title: '계량기와 집 상태 사진 남기기',
        description: '정산과 하자 확인에 필요한 사진 위치만 남깁니다.',
        type: 'calendar',
        day_offset: -1,
        duration_days: 1,
        source_type: 'creator_experience',
        order: 3,
      },
      {
        id: 'moving-move-day-admin',
        flow_id: 'flow-source-backed-moving-d30',
        section_id: 'moving-day',
        title: '정산과 전입신고 확인',
        description: '당일 정산과 전입신고/확정일자 확인 결과만 남깁니다.',
        type: 'calendar',
        day_offset: 0,
        duration_days: 1,
        source_type: 'official',
        order: 4,
      },
    ],
    itemDetails: Object.values(movingDetails),
  },
  {
    flow: {
      id: 'flow-source-backed-middle-school-math-1',
      slug: 'source-backed-middle-school-math-1',
      title: '단원별 개념 진도',
      description: '원문 목차의 8개 단원을 진도 row로 저장하고, 각 단원의 하위 개념을 체크 항목으로 봅니다.',
      category: '교육/수학',
      structure_type: 'phase',
      content_type: 'default',
      anchor_type: 'none',
      status: 'published',
      source_title: 'Mathbang 중1 수학 목차',
      source_url: mathSourceUrl,
      source_status: 'real',
      source_precision: 'exact',
      source_checked_at: '2026-06-23',
      primary_destination: 'sheet',
      risk_level: 'low',
      created_at: now,
      updated_at: now,
      tags: ['source-backed', 'flow-map:middle-school-math-1', 'progress-flow'],
    },
    sections: [
      { id: 'math-table-of-contents', flow_id: 'flow-source-backed-middle-school-math-1', title: 'Mathbang 중1 목차', order: 0 },
    ],
    items: mathUnits.map((unit, order) => ({
      id: unit.id,
      flow_id: 'flow-source-backed-middle-school-math-1',
      section_id: 'math-table-of-contents',
      title: `${unit.orderLabel} ${unit.title}`,
      description: `${unit.summary} 하위 개념 ${unit.concepts.length}개를 진도 체크로 봅니다.`,
      type: 'todo' as const,
      source_type: 'reference' as const,
      order,
    })),
    itemDetails: Object.values(mathDetails),
  },
  {
    flow: {
      id: 'flow-source-backed-baby-health-checkups',
      slug: 'source-backed-baby-health-checkups',
      title: '영유아 건강검진 일정',
      description: '생후 14일부터 71개월까지 공식 건강검진과 구강검진 시기를 일정으로 저장합니다.',
      category: '육아/건강',
      structure_type: 'timeline',
      content_type: 'default',
      anchor_type: 'baby_birth_date',
      status: 'published',
      source_title: '영유아 건강검진 시기 안내',
      source_url: babyHealthCheckupSourceUrl,
      source_status: 'real',
      source_precision: 'exact',
      source_checked_at: '2026-06-23',
      primary_destination: 'hybrid',
      setup_anchor_label: '아이 생년월일',
      setup_anchor_hint: '아이 생년월일을 넣으면 생후 월령별 건강검진과 구강검진 확인 시점이 배치됩니다.',
      risk_level: 'medical_sensitive',
      created_at: now,
      updated_at: now,
      tags: ['source-backed', 'flow-map:baby-health-schedule', 'timeline', 'official'],
    },
    sections: [
      { id: 'baby-health-general', flow_id: 'flow-source-backed-baby-health-checkups', title: '건강검진', order: 0 },
      { id: 'baby-health-oral', flow_id: 'flow-source-backed-baby-health-checkups', title: '구강검진', order: 1 },
    ],
    items: healthCheckupWindows.map((window, order) => ({
      id: window.id,
      flow_id: 'flow-source-backed-baby-health-checkups',
      section_id: window.sectionId,
      title: `${window.title} · ${window.period}`,
      description: `${window.period} 기간의 ${window.title} 예약, 문진표, 방문 여부만 메모합니다.`,
      type: 'calendar' as const,
      day_offset: window.dayOffset,
      duration_days: 1,
      date_window: {
        label: window.period,
        start_day_offset: window.dayOffset,
        end_day_offset: window.dayOffset + window.durationDays - 1,
      },
      source_type: 'official' as const,
      risk_level: 'medical_sensitive' as const,
      order,
    })),
    itemDetails: Object.values(healthCheckupDetails),
  },
  {
    flow: {
      id: 'flow-source-backed-baby-vaccination-schedule',
      slug: 'source-backed-baby-vaccination-schedule',
      title: '아이 예방접종 일정 확인',
      description: '질병관리청 표준 일정과 아이 예방접종 일정보기 링크를 월령별 확인 Step으로 저장합니다.',
      category: '육아/건강',
      structure_type: 'timeline',
      content_type: 'default',
      anchor_type: 'baby_birth_date',
      status: 'published',
      source_title: '질병관리청 표준 예방접종 일정표',
      source_url: babyVaccinationScheduleUrl,
      source_status: 'real',
      source_precision: 'broad',
      source_checked_at: '2026-06-23',
      primary_destination: 'hybrid',
      setup_anchor_label: '아이 생년월일',
      setup_anchor_hint: '아이 생년월일을 넣으면 월령별 예방접종 조회 시점이 배치됩니다. 실제 일정은 예방접종도우미 조회를 우선합니다.',
      risk_level: 'medical_sensitive',
      created_at: now,
      updated_at: now,
      tags: ['source-backed', 'flow-map:baby-health-schedule', 'timeline', 'official'],
    },
    sections: [
      { id: 'baby-vaccination', flow_id: 'flow-source-backed-baby-vaccination-schedule', title: '예방접종 확인', order: 0 },
    ],
    items: vaccinationWindows.map((window, order) => ({
      id: window.id,
      flow_id: 'flow-source-backed-baby-vaccination-schedule',
      section_id: 'baby-vaccination',
      title: window.title,
      description: `${window.period} 기준으로 공식 표준예방접종일을 조회하고 예약 또는 완료 여부만 남깁니다.`,
      type: 'calendar' as const,
      day_offset: window.dayOffset,
      duration_days: 1,
      source_type: 'official' as const,
      risk_level: 'medical_sensitive' as const,
      order,
    })),
    itemDetails: Object.values(vaccinationDetails),
  },
  ...additionalSourceBackedMyFlowBundles,
  ...curatedSourceBackedMyFlowBundles,
  ...curatedSourceAppSeedFlowBundles,
];

export function mergeSourceBackedMyFlowBundles(bundles: FlowBundle[]): FlowBundle[] {
  const existingSlugs = new Set(bundles.map((bundle) => bundle.flow.slug));
  const additions = sourceBackedMyFlowBundles.filter(
    (bundle) => !existingSlugs.has(bundle.flow.slug) && !isRuntimeExcludedBundle(bundle),
  );
  return [...bundles, ...additions];
}

export function getSourceBackedMyFlowMapForBundle(bundle: FlowBundle): SourceBackedMyFlowMap | undefined {
  const mapId = getMapId(bundle);
  if (!mapId) return undefined;
  return sourceBackedMyFlowMaps.find((map) => map.id === mapId);
}

export function listSourceBackedFlowMapPublishPackages(): SourceBackedFlowMapPublishPackage[] {
  return sourceBackedMyFlowMaps
    .map((map) => buildSourceBackedFlowMapPublishPackage(map.id))
    .filter((item): item is SourceBackedFlowMapPublishPackage => Boolean(item));
}

export function getSourceBackedFlowMapQualityDecision(mapId: string): SourceBackedFlowMapQualityDecision {
  return sourceBackedFlowMapQualityDecisions[mapId] ?? {
    mapId,
    status: 'park',
    homepageEligible: false,
    directRouteEnabled: false,
    productScore: 0,
    reason: 'No quality decision has been recorded for this map.',
    nextAction: 'Review the source, user job, natural artifact, and source-to-Flow model before exposing it.',
  };
}

export function listSourceBackedFlowMapQualityDecisions(): SourceBackedFlowMapQualityDecision[] {
  return sourceBackedMyFlowMaps.map((map) => getSourceBackedFlowMapQualityDecision(map.id));
}

export function getSourceBackedHomepageFlowMaps(): SourceBackedMyFlowMap[] {
  return sourceBackedMyFlowMaps.filter((map) => getSourceBackedFlowMapQualityDecision(map.id).homepageEligible);
}

export function getCuratedSourceAppSeedFlowMaps(): SourceBackedMyFlowMap[] {
  return sourceBackedMyFlowMaps.filter((map) => Boolean(map.recommendedFlowSlug && map.userFacingStatus && map.counts));
}

function getSourceBackedQualityDecisionForRegistration(
  mapId: string,
  decisions?: Record<string, SourceBackedFlowMapQualityDecision>,
): SourceBackedFlowMapQualityDecision {
  return decisions?.[mapId] ?? getSourceBackedFlowMapQualityDecision(mapId);
}

export function isUrlFirstLookupableSourceBackedFlowMap(
  map: SourceBackedMyFlowMap,
  options: { decisions?: Record<string, SourceBackedFlowMapQualityDecision> } = {},
): boolean {
  return Boolean(map.sourceUrl?.trim()) && isSourceBackedFlowMapExecutable(map, options);
}

export function isSourceBackedFlowMapDirectRouteAccessible(
  map: SourceBackedMyFlowMap,
  options: { decisions?: Record<string, SourceBackedFlowMapQualityDecision> } = {},
): boolean {
  const decision = getSourceBackedQualityDecisionForRegistration(map.id, options.decisions);
  return decision.directRouteEnabled && decision.status !== 'reject';
}

export function isSourceBackedFlowMapExecutable(
  map: SourceBackedMyFlowMap,
  options: { decisions?: Record<string, SourceBackedFlowMapQualityDecision> } = {},
): boolean {
  const decision = getSourceBackedQualityDecisionForRegistration(map.id, options.decisions);
  return isSourceBackedFlowMapDirectRouteAccessible(map, options) && decision.publicExecutionEnabled !== false;
}

export function getUrlFirstLookupableSourceBackedFlowMaps(
  options: UrlFirstLookupableSourceBackedFlowMapOptions = {},
): SourceBackedMyFlowMap[] {
  const maps = options.maps ?? sourceBackedMyFlowMaps;
  return maps.filter((map) => isUrlFirstLookupableSourceBackedFlowMap(map, { decisions: options.decisions }));
}

export function isPublicCatalogSourceBackedFlowMap(map: SourceBackedMyFlowMap): boolean {
  const decision = getSourceBackedFlowMapQualityDecision(map.id);
  return (
    isUrlFirstLookupableSourceBackedFlowMap(map) &&
    (decision.status === 'representative' || decision.status === 'candidate') &&
    decision.publicCatalogEligible !== false &&
    decision.productScore >= 5
  );
}

export function getPublicCatalogSourceBackedFlowMaps(): SourceBackedMyFlowMap[] {
  return getUrlFirstLookupableSourceBackedFlowMaps().filter(isPublicCatalogSourceBackedFlowMap);
}

export function assessSourceBackedManualRegistrationReadiness(
  options: SourceBackedManualRegistrationReadinessOptions = {},
): SourceBackedManualRegistrationReadinessReport {
  const maps = options.maps ?? sourceBackedMyFlowMaps;
  const bundles = options.bundles ?? sourceBackedMyFlowBundles;
  const bundleBySlug = new Map(bundles.map((bundle) => [bundle.flow.slug, bundle]));
  const issues: SourceBackedManualRegistrationIssue[] = [];

  const lookupableMaps = getUrlFirstLookupableSourceBackedFlowMaps({
    maps,
    decisions: options.decisions,
  });
  const sourceUrlGroups = new Map<string, SourceBackedMyFlowMap[]>();

  for (const map of lookupableMaps) {
    const canonicalUrl = canonicalizeManualRegistrationSourceUrl(map.sourceUrl);
    const group = sourceUrlGroups.get(canonicalUrl) ?? [];
    group.push(map);
    sourceUrlGroups.set(canonicalUrl, group);
  }

  for (const duplicateMaps of sourceUrlGroups.values()) {
    if (duplicateMaps.length < 2) continue;
    issues.push({
      code: 'duplicate_canonical_source_url',
      severity: 'error',
      message: 'Multiple URL-first source-backed maps share the same canonical source URL.',
      mapIds: uniqueStrings(duplicateMaps.map((map) => map.id)),
    });
  }

  for (const map of maps) {
    const shouldBeExecutable = isSourceBackedFlowMapExecutable(map, { decisions: options.decisions });
    const childBundles = map.flowSlugs.map((slug) => bundleBySlug.get(slug)).filter((bundle): bundle is FlowBundle => Boolean(bundle));
    const childStepCount = childBundles.reduce((sum, bundle) => sum + bundle.items.length, 0);

    if (shouldBeExecutable && !map.sourceUrl?.trim()) {
      issues.push({
        code: 'missing_source_url',
        severity: 'error',
        message: 'directRouteEnabled source-backed maps need a sourceUrl before URL lookup can hit them.',
        mapIds: [map.id],
      });
    }

    if (shouldBeExecutable && childStepCount === 0) {
      issues.push({
        code: 'empty_registered_steps',
        severity: 'error',
        message: 'A source-backed Flow must contain at least one executable Step before registration.',
        mapIds: [map.id],
        flowSlugs: map.flowSlugs,
      });
    }

    const missingSourceTraceSteps = childBundles.flatMap((bundle) =>
      bundle.items.flatMap((item) => {
        const detail = getItemDetail(bundle, item.id);
        return hasManualRegistrationSourceTrace(detail) ? [] : [item.id];
      }),
    );

    if (shouldBeExecutable && missingSourceTraceSteps.length > 0) {
      issues.push({
        code: 'missing_source_trace',
        severity: 'error',
        message: 'Every executable Step needs sourceTrace evidence before source-backed registration.',
        mapIds: [map.id],
        flowSlugs: childBundles.map((bundle) => bundle.flow.slug),
        stepIds: missingSourceTraceSteps,
      });
    }
  }

  const blockedMapIds = uniqueStrings(issues.flatMap((issue) => issue.mapIds));

  return {
    checklist: [...SOURCE_BACKED_MANUAL_REGISTRATION_CHECKLIST],
    lookupableMapIds: lookupableMaps.map((map) => map.id),
    blockedMapIds,
    issues: collapseManualRegistrationIssues(issues),
  };
}

export function canonicalizeManualRegistrationSourceUrl(sourceUrl: string): string {
  const trimmed = sourceUrl.trim();
  if (!trimmed) return '';

  try {
    const url = new URL(trimmed);
    url.hash = '';
    url.hostname = url.hostname.toLowerCase();

    for (const key of [...url.searchParams.keys()]) {
      if (/^utm_/i.test(key) || ['fbclid', 'gclid'].includes(key.toLowerCase())) {
        url.searchParams.delete(key);
      }
    }

    const sortedParams = [...url.searchParams.entries()].sort(([left], [right]) => left.localeCompare(right));
    url.search = '';
    for (const [key, value] of sortedParams) {
      url.searchParams.append(key, value);
    }

    if (url.pathname.length > 1) {
      url.pathname = url.pathname.replace(/\/+$/, '');
    }

    return url.toString();
  } catch {
    return trimmed;
  }
}

function hasManualRegistrationSourceTrace(detail?: FlowItemDetail): boolean {
  const text = [detail?.why, detail?.how, detail?.caution].filter(Boolean).join('\n');
  return /(^|\n)\s*(sourceTrace|source trace|원문 근거)\s*[:：]/i.test(text);
}

function uniqueStrings(items: string[]): string[] {
  return [...new Set(items)];
}

function collapseManualRegistrationIssues(
  issues: SourceBackedManualRegistrationIssue[],
): SourceBackedManualRegistrationIssue[] {
  const grouped = new Map<SourceBackedManualRegistrationIssueCode, SourceBackedManualRegistrationIssue>();

  for (const issue of issues) {
    const current = grouped.get(issue.code);
    if (!current) {
      grouped.set(issue.code, normalizeManualRegistrationIssue(issue));
      continue;
    }

    grouped.set(issue.code, normalizeManualRegistrationIssue({
      code: current.code,
      severity: current.severity,
      message: current.message,
      mapIds: uniqueStrings([...current.mapIds, ...issue.mapIds]),
      flowSlugs: uniqueStrings([...(current.flowSlugs ?? []), ...(issue.flowSlugs ?? [])]),
      stepIds: uniqueStrings([...(current.stepIds ?? []), ...(issue.stepIds ?? [])]),
    }));
  }

  return [...grouped.values()];
}

function normalizeManualRegistrationIssue(
  issue: SourceBackedManualRegistrationIssue,
): SourceBackedManualRegistrationIssue {
  const normalized: SourceBackedManualRegistrationIssue = {
    code: issue.code,
    severity: issue.severity,
    message: issue.message,
    mapIds: uniqueStrings(issue.mapIds),
  };
  const flowSlugs = issue.flowSlugs ? uniqueStrings(issue.flowSlugs) : [];
  const stepIds = issue.stepIds ? uniqueStrings(issue.stepIds) : [];
  if (flowSlugs.length > 0) normalized.flowSlugs = flowSlugs;
  if (stepIds.length > 0) normalized.stepIds = stepIds;
  return normalized;
}

export function buildSourceBackedFlowMapSavedSnapshot(
  mapId: string,
  options: { savedAt?: string; anchor?: string } = {},
): SourceBackedFlowMapSavedSnapshot | undefined {
  const map = sourceBackedMyFlowMaps.find((entry) => entry.id === mapId);
  if (!map) return undefined;

  const childBundles = getMapChildBundles(map);
  const stepCountsByFlow = Object.fromEntries(childBundles.map((bundle) => [bundle.flow.slug, bundle.items.length]));
  const riskLevelsByFlow = Object.fromEntries(childBundles.map((bundle) => [bundle.flow.slug, bundle.flow.risk_level]));
  const sourceCheckedAtByFlow = Object.fromEntries(childBundles.map((bundle) => [bundle.flow.slug, bundle.flow.source_checked_at]));

  return {
    mapId: map.id,
    title: map.title,
    version: map.version,
    savedAt: options.savedAt ?? new Date().toISOString(),
    ...(options.anchor ? { anchor: options.anchor } : {}),
    flowSlugs: childBundles.map((bundle) => bundle.flow.slug),
    stepCountsByFlow,
    riskLevelsByFlow,
    sourceCheckedAtByFlow,
  };
}

function pickSourceBackedRecordValues<T>(record: Record<string, T>, keys: string[]): Record<string, T> {
  return Object.fromEntries(keys.flatMap((key) => (key in record ? [[key, record[key]]] : [])));
}

function pickSourceBackedPersonalCopyStepOverrides(
  personalCopy: SourceBackedFlowMapPersonalCopy,
  availableStepIdsByFlow: Record<string, string[]>,
): Record<string, Record<string, SourceBackedFlowMapPersonalCopyStepOverride>> | undefined {
  const sourceOverrides = personalCopy.stepOverridesByFlow;
  if (!sourceOverrides) return undefined;

  const entries = Object.entries(availableStepIdsByFlow).flatMap(([flowSlug, stepIds]) => {
    const overrides = sourceOverrides[flowSlug];
    if (!overrides) return [];
    const picked = Object.fromEntries(
      stepIds.flatMap((stepId) => {
        const override = overrides[stepId];
        return override ? [[stepId, override] as const] : [];
      }),
    );
    return Object.keys(picked).length > 0 ? [[flowSlug, picked] as const] : [];
  });

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function pickSourceBackedPersonalCopyRetainedSteps(
  personalCopy: SourceBackedFlowMapPersonalCopy,
  includedStepIdsByFlow: Record<string, string[]>,
): Record<string, Record<string, SourceBackedFlowMapStepBinding>> | undefined {
  const sourceRetainedSteps = personalCopy.retainedStepsByFlow;
  if (!sourceRetainedSteps) return undefined;

  const entries = Object.entries(includedStepIdsByFlow).flatMap(([flowSlug, stepIds]) => {
    const retainedSteps = sourceRetainedSteps[flowSlug];
    if (!retainedSteps) return [];
    const picked = Object.fromEntries(
      stepIds.flatMap((stepId) => {
        const retainedStep = retainedSteps[stepId];
        return retainedStep ? [[stepId, retainedStep] as const] : [];
      }),
    );
    return Object.keys(picked).length > 0 ? [[flowSlug, picked] as const] : [];
  });

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function projectSourceBackedSnapshotForPersonalCopy(
  snapshot: SourceBackedFlowMapSavedSnapshot,
  personalCopy?: SourceBackedFlowMapPersonalCopy,
  options: { title?: string } = {},
): SourceBackedFlowMapSavedSnapshot {
  if (!personalCopy) return options.title ? { ...snapshot, title: options.title } : snapshot;

  const publishPackage = buildSourceBackedFlowMapPublishPackage(snapshot.mapId);
  if (!publishPackage) {
    return {
      ...snapshot,
      title: options.title ?? snapshot.title,
      personalCopy,
    };
  }

  const selectedFlowSlugs: string[] = [];
  const stepCountsByFlow: Record<string, number> = {};
  const includedStepIdsByFlow: Record<string, string[]> = {};
  const excludedStepIdsByFlow: Record<string, string[]> = {};
  const availableStepIdsByFlow: Record<string, string[]> = {};

  publishPackage.public.childFlows.forEach((flow) => {
    const canonicalStepIds = flow.steps.map((step) => step.id);
    const retainedStepIds = Object.keys(personalCopy.retainedStepsByFlow?.[flow.slug] ?? {});
    const currentStepIds = Array.from(new Set([...canonicalStepIds, ...retainedStepIds]));
    const currentStepIdSet = new Set(currentStepIds);
    const includedStepIds = (personalCopy.includedStepIdsByFlow[flow.slug] ?? [])
      .filter((stepId) => currentStepIdSet.has(stepId));
    const excludedStepIds = currentStepIds.filter((stepId) => !includedStepIds.includes(stepId));
    // Item-value ownership is independent from inclusion for canonical
    // Steps. Retained Steps keep the prior contract: an override survives
    // only while that explicit retained binding is included. The allow-list
    // therefore preserves included and excluded canonical overrides without
    // promoting unknown IDs into retained content.
    availableStepIdsByFlow[flow.slug] = [
      ...canonicalStepIds,
      ...retainedStepIds.filter((stepId) => includedStepIds.includes(stepId)),
    ];

    if (includedStepIds.length === 0) return;
    selectedFlowSlugs.push(flow.slug);
    stepCountsByFlow[flow.slug] = includedStepIds.length;
    includedStepIdsByFlow[flow.slug] = includedStepIds;
    excludedStepIdsByFlow[flow.slug] = excludedStepIds;
  });
  const stepOverridesByFlow = pickSourceBackedPersonalCopyStepOverrides(personalCopy, availableStepIdsByFlow);
  const retainedStepsByFlow = pickSourceBackedPersonalCopyRetainedSteps(personalCopy, includedStepIdsByFlow);

  return {
    ...snapshot,
    title: options.title ?? snapshot.title,
    flowSlugs: selectedFlowSlugs,
    stepCountsByFlow,
    riskLevelsByFlow: pickSourceBackedRecordValues(snapshot.riskLevelsByFlow, selectedFlowSlugs),
    sourceCheckedAtByFlow: pickSourceBackedRecordValues(snapshot.sourceCheckedAtByFlow, selectedFlowSlugs),
    personalCopy: {
      source: personalCopy.source,
      ...(personalCopy.originalTitle ? { originalTitle: personalCopy.originalTitle } : {}),
      includedStepIdsByFlow,
      excludedStepIdsByFlow,
      ...(stepOverridesByFlow ? { stepOverridesByFlow } : {}),
      ...(retainedStepsByFlow ? { retainedStepsByFlow } : {}),
    },
  };
}

function projectSourceBackedPersistenceRecordForPersonalCopy(
  record: SourceBackedFlowMapPersistenceRecord,
  personalCopy?: SourceBackedFlowMapPersonalCopy,
  options: { title?: string } = {},
): SourceBackedFlowMapPersistenceRecord {
  if (!personalCopy) {
    return options.title
      ? {
          ...record,
          map: {
            ...record.map,
            title: options.title,
          },
        }
      : record;
  }

  const childFlows = record.childFlows
    .map((child) => {
      const includedStepIds = personalCopy.includedStepIdsByFlow[child.slug] ?? [];
      const retainedSteps = personalCopy.retainedStepsByFlow?.[child.slug] ?? {};
      const availableStepsById = new Map([
        ...child.steps.map((step) => [step.stepId, step] as const),
        ...Object.values(retainedSteps).map((step) => [step.stepId, step] as const),
      ]);
      const steps = Array.from(new Set(includedStepIds)).flatMap((stepId) => {
        const step = retainedSteps[stepId] ?? availableStepsById.get(stepId);
        return step ? [step] : [];
      });
      return {
        ...child,
        stepCount: steps.length,
        itemFallbackCount: steps.reduce((total, step) => total + (step.textFallback.items?.length ?? 0), 0),
        stepIds: steps.map((step) => step.stepId),
        steps,
      };
    })
    .filter((child) => child.steps.length > 0);

  return {
    ...record,
    map: {
      ...record.map,
      title: options.title ?? record.map.title,
    },
    childFlows,
    personalCopy,
  };
}

export function buildSourceBackedFlowMapSavedSnapshotUpdate(
  saved: SourceBackedFlowMapSavedSnapshot,
  options: { savedAt?: string; anchor?: string } = {},
): SourceBackedFlowMapSavedSnapshot | undefined {
  const current = buildSourceBackedFlowMapSavedSnapshot(saved.mapId, {
    savedAt: options.savedAt,
    anchor: options.anchor ?? saved.anchor,
  });
  if (!current) return undefined;

  return projectSourceBackedSnapshotForPersonalCopy(current, saved.personalCopy, {
    title: saved.personalCopy ? saved.title : current.title,
  });
}

export function buildSourceBackedFlowMapPersistenceRecord(
  mapId: string,
  options: { savedAt?: string; anchor?: string } = {},
): SourceBackedFlowMapPersistenceRecord | undefined {
  const map = sourceBackedMyFlowMaps.find((entry) => entry.id === mapId);
  if (!map) return undefined;

  const snapshot = buildSourceBackedFlowMapSavedSnapshot(mapId, options);
  if (!snapshot) return undefined;

  const publishPackage = buildSourceBackedFlowMapPublishPackage(mapId);
  const publishBlockers = publishPackage?.creator.publishBlockers ?? [];
  const updateAssessment = assessSourceBackedFlowMapUpdate(snapshot);
  const childFlows = getMapChildBundles(map).map((bundle) => {
    const rows = buildSourceBackedMyFlowRows(bundle);
    const steps = rows.map((row) => ({
      stepId: row.stepId,
      title: row.title,
      destination: row.destination,
      calendar: row.calendar,
      textFallback: row.textFallback,
      ...(row.sourceUrl ? { sourceUrl: row.sourceUrl } : {}),
      ...(row.sourceType ? { sourceType: row.sourceType } : {}),
      ...(row.riskLevel ? { riskLevel: row.riskLevel } : {}),
    } satisfies SourceBackedFlowMapStepBinding));

    return {
      slug: bundle.flow.slug,
      flowId: bundle.flow.id,
      title: bundle.flow.title,
      category: bundle.flow.category,
      structureType: bundle.flow.structure_type,
      anchorType: bundle.flow.anchor_type,
      primaryDestination: bundle.flow.primary_destination ?? 'internal_check',
      riskLevel: bundle.flow.risk_level,
      sourceTitle: bundle.flow.source_title,
      sourceUrl: bundle.flow.source_url,
      sourceCheckedAt: bundle.flow.source_checked_at,
      stepCount: bundle.items.length,
      itemFallbackCount: rows.reduce((total, row) => total + (row.textFallback.items?.length ?? 0), 0),
      stepIds: steps.map((step) => step.stepId),
      steps,
    } satisfies SourceBackedFlowMapChildBinding;
  });

  const readinessReasons = publishBlockers.length
    ? publishBlockers
    : ['공개 저장 후 My Flow에서 실행 가능한 source-backed Step 기록으로 사용할 수 있습니다.'];

  return {
    schemaVersion: 1,
    recordType: 'saved_source_backed_flow_map',
    bridgeStorageKey: getSourceBackedFlowMapSnapshotStorageKey(map.id),
    map: {
      id: map.id,
      title: map.title,
      userLabel: map.userLabel,
      version: map.version,
      updatedAt: map.updatedAt,
      updatePolicy: map.updatePolicy,
      sourceTitle: map.sourceTitle,
      sourceUrl: map.sourceUrl,
    },
    saved: {
      savedAt: snapshot.savedAt,
      sourceSurface: 'public_save',
      ...(snapshot.anchor ? { anchor: snapshot.anchor } : {}),
    },
    readiness: {
      content: publishBlockers.length ? 'needs_creator_review' : 'ready_for_my_flow',
      update: updateAssessment.status,
      reasons: readinessReasons,
    },
    childFlows,
    updateAssessment,
  };
}

export function buildSourceBackedFlowMapPersistenceRecordUpdate(
  saved: SourceBackedFlowMapSavedSnapshot,
  options: {
    savedAt?: string;
    anchor?: string;
    baselineRecord?: SourceBackedFlowMapPersistenceRecord;
  } = {},
): SourceBackedFlowMapPersistenceRecord | undefined {
  const record = options.baselineRecord ?? buildSourceBackedFlowMapPersistenceRecord(saved.mapId, {
    savedAt: options.savedAt,
    anchor: options.anchor ?? saved.anchor,
  });
  if (!record) return undefined;

  const projected = projectSourceBackedPersistenceRecordForPersonalCopy(record, saved.personalCopy, {
    title: saved.personalCopy ? saved.title : record.map.title,
  });
  const anchor = options.anchor ?? saved.anchor;
  return {
    ...projected,
    map: {
      ...projected.map,
      title: saved.personalCopy ? saved.title : projected.map.title,
    },
    saved: {
      ...projected.saved,
      savedAt: options.savedAt ?? saved.savedAt,
      ...(anchor ? { anchor } : {}),
    },
  };
}

export function buildSourceBackedFlowMapAnchorAdjustment(
  saved: SourceBackedFlowMapSavedSnapshot,
  options: {
    anchor: string;
    savedAt?: string;
    baselineRecord: SourceBackedFlowMapPersistenceRecord;
  },
): SourceBackedFlowMapAnchorAdjustment | undefined {
  const anchor = options.anchor.trim();
  const parsedAnchor = new Date(`${anchor}T00:00:00.000Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(anchor) ||
    Number.isNaN(parsedAnchor.getTime()) ||
    parsedAnchor.toISOString().slice(0, 10) !== anchor
  ) return undefined;

  const savedAt = options.savedAt ?? saved.savedAt;
  const snapshot: SourceBackedFlowMapSavedSnapshot = {
    ...saved,
    savedAt,
    anchor,
  };
  const persistenceRecord = buildSourceBackedFlowMapPersistenceRecordUpdate(snapshot, {
    savedAt,
    anchor,
    baselineRecord: options.baselineRecord,
  });
  if (!persistenceRecord) return undefined;

  return { snapshot, persistenceRecord };
}

export function initializeSourceBackedFlowMapPersonalCopy(
  saved: SourceBackedFlowMapSavedSnapshot,
  baselineRecord?: SourceBackedFlowMapPersistenceRecord,
): SourceBackedFlowMapSavedSnapshot | undefined {
  if (saved.personalCopy) return structuredClone(saved);
  const baseline = baselineRecord ?? buildSourceBackedFlowMapPersistenceRecord(saved.mapId, {
    savedAt: saved.savedAt,
    anchor: saved.anchor,
  });
  if (!baseline) return undefined;

  const savedFlowSlugs = new Set(saved.flowSlugs);
  const includedStepIdsByFlow = Object.fromEntries(
    baseline.childFlows
      .filter((flow) => savedFlowSlugs.has(flow.slug) && flow.stepIds.length > 0)
      .map((flow) => [flow.slug, Array.from(new Set(flow.stepIds))]),
  );
  if (Object.keys(includedStepIdsByFlow).length === 0) return undefined;

  return {
    ...structuredClone(saved),
    personalCopy: {
      source: 'personal_edit',
      originalTitle: saved.title,
      includedStepIdsByFlow,
      excludedStepIdsByFlow: Object.fromEntries(
        Object.keys(includedStepIdsByFlow).map((flowSlug) => [flowSlug, []]),
      ),
    },
  };
}

export function buildSourceBackedFlowMapPersonalCopyAdjustment(
  saved: SourceBackedFlowMapSavedSnapshot,
  options: {
    title?: string;
    anchor?: string;
    savedAt?: string;
    includedStepIdsByFlow: Record<string, string[]>;
    stepOverridesByFlow?: Record<string, Record<string, SourceBackedFlowMapPersonalCopyStepOverride>>;
    baselineRecord?: SourceBackedFlowMapPersistenceRecord;
  },
): SourceBackedFlowMapPersonalCopyAdjustment | undefined {
  if (!saved.personalCopy) return undefined;

  const hasAnchorOption = Object.prototype.hasOwnProperty.call(options, 'anchor');
  const nextTitle = options.title?.trim() || saved.title;
  const nextAnchor = hasAnchorOption ? options.anchor?.trim() : saved.anchor;
  const storedBaselineRecord = options.baselineRecord ?? buildSourceBackedFlowMapPersistenceRecord(saved.mapId, {
    savedAt: options.savedAt,
    anchor: nextAnchor,
  });
  if (!storedBaselineRecord) return undefined;
  const currentRecord = buildSourceBackedFlowMapPersistenceRecord(saved.mapId, {
    savedAt: options.savedAt,
    anchor: nextAnchor,
  });
  const baselineRecord = structuredClone(storedBaselineRecord);
  currentRecord?.childFlows.forEach((currentFlow) => {
    const baselineFlow = baselineRecord.childFlows.find((flow) => flow.slug === currentFlow.slug);
    if (!baselineFlow) return;
    const requestedIds = new Set(options.includedStepIdsByFlow[currentFlow.slug] ?? []);
    const baselineIds = new Set(baselineFlow.stepIds);
    currentFlow.steps.forEach((step) => {
      if (!requestedIds.has(step.stepId) || baselineIds.has(step.stepId)) return;
      baselineFlow.steps.push(structuredClone(step));
      baselineFlow.stepIds.push(step.stepId);
      baselineIds.add(step.stepId);
    });
    baselineFlow.stepCount = baselineFlow.steps.length;
    baselineFlow.itemFallbackCount = baselineFlow.steps.reduce(
      (total, step) => total + (step.textFallback.items?.length ?? 0),
      0,
    );
  });
  const getAvailableStepIds = (flow: SourceBackedFlowMapChildBinding): string[] => Array.from(new Set([
    ...flow.stepIds,
    ...(saved.personalCopy?.includedStepIdsByFlow[flow.slug] ?? []),
    ...(saved.personalCopy?.excludedStepIdsByFlow[flow.slug] ?? []),
    ...Object.keys(saved.personalCopy?.retainedStepsByFlow?.[flow.slug] ?? {}),
  ]));
  const includedStepIdsByFlow = Object.fromEntries(
    baselineRecord.childFlows.flatMap((flow) => {
      const availableStepIds = getAvailableStepIds(flow);
      const availableStepIdSet = new Set(availableStepIds);
      const includedIds = Array.from(new Set(
        options.includedStepIdsByFlow[flow.slug] ?? [],
      )).filter((stepId) => availableStepIdSet.has(stepId));
      return includedIds.length > 0 ? [[flow.slug, includedIds] as const] : [];
    }),
  );
  const excludedStepIdsByFlow = Object.fromEntries(
    baselineRecord.childFlows.flatMap((flow) => {
      const availableStepIds = getAvailableStepIds(flow);
      const includedIds = new Set(includedStepIdsByFlow[flow.slug] ?? []);
      return includedIds.size > 0
        ? [[flow.slug, availableStepIds.filter((stepId) => !includedIds.has(stepId))] as const]
        : [];
    }),
  );
  const draft: SourceBackedFlowMapSavedSnapshot = {
    ...saved,
    title: nextTitle,
    personalCopy: {
      ...saved.personalCopy,
      includedStepIdsByFlow,
      excludedStepIdsByFlow,
      ...(options.stepOverridesByFlow !== undefined
        ? { stepOverridesByFlow: options.stepOverridesByFlow }
        : saved.personalCopy.stepOverridesByFlow
          ? { stepOverridesByFlow: saved.personalCopy.stepOverridesByFlow }
          : {}),
    },
  };
  if (nextAnchor) {
    draft.anchor = nextAnchor;
  } else if (hasAnchorOption) {
    delete draft.anchor;
  }

  const savedAt = options.savedAt ?? saved.savedAt;
  const persistenceRecord = buildSourceBackedFlowMapPersistenceRecordUpdate(draft, {
    savedAt,
    ...(hasAnchorOption ? { anchor: nextAnchor } : {}),
    baselineRecord,
  });
  if (!persistenceRecord || persistenceRecord.childFlows.length === 0) return undefined;
  const flowSlugs = persistenceRecord.childFlows.map((flow) => flow.slug);
  const snapshot: SourceBackedFlowMapSavedSnapshot = {
    ...draft,
    savedAt,
    flowSlugs,
    stepCountsByFlow: Object.fromEntries(persistenceRecord.childFlows.map((flow) => [flow.slug, flow.stepCount])),
    riskLevelsByFlow: pickSourceBackedRecordValues(draft.riskLevelsByFlow, flowSlugs),
    sourceCheckedAtByFlow: pickSourceBackedRecordValues(draft.sourceCheckedAtByFlow, flowSlugs),
    ...(persistenceRecord.personalCopy ? { personalCopy: persistenceRecord.personalCopy } : {}),
  };

  return {
    snapshot,
    persistenceRecord,
  };
}

export function buildSourceBackedFlowMapReviewedVersion(
  saved: SourceBackedFlowMapSavedSnapshot,
  personalCopy: SourceBackedFlowMapPersonalCopy,
  options: { savedAt?: string; anchor?: string } = {},
): SourceBackedFlowMapPersonalCopyAdjustment | undefined {
  const current = buildSourceBackedFlowMapSavedSnapshot(saved.mapId, {
    savedAt: options.savedAt,
    anchor: options.anchor ?? saved.anchor,
  });
  if (!current) return undefined;
  const snapshot = projectSourceBackedSnapshotForPersonalCopy(current, personalCopy, {
    title: saved.title,
  });
  const persistenceRecord = buildSourceBackedFlowMapPersistenceRecordUpdate(snapshot, {
    savedAt: snapshot.savedAt,
    ...(snapshot.anchor ? { anchor: snapshot.anchor } : {}),
  });
  if (!persistenceRecord) return undefined;
  return { snapshot, persistenceRecord };
}

function retainedStepToItem(
  bundle: FlowBundle,
  step: SourceBackedFlowMapStepBinding,
  existing?: FlowItem,
): FlowItem {
  const item: FlowItem = {
    ...(existing ?? {
      id: step.stepId,
      flow_id: bundle.flow.id,
      type: step.calendar.mode === 'none' ? 'todo' : 'calendar',
      order: bundle.items.length + 1,
    }),
    id: step.stepId,
    flow_id: bundle.flow.id,
    title: step.title,
    description: step.textFallback.description,
    type: step.calendar.mode === 'none' ? 'todo' : 'calendar',
    source_type: step.sourceType,
    risk_level: step.riskLevel,
  };
  if (step.calendar.mode === 'anchor_offset' && typeof step.calendar.dayOffset === 'number') {
    item.day_offset = step.calendar.dayOffset;
  } else {
    delete item.day_offset;
  }
  if (step.calendar.window) {
    item.date_window = {
      label: step.calendar.window.label,
      start_day_offset: step.calendar.window.startDayOffset,
      end_day_offset: step.calendar.window.endDayOffset,
    };
  } else {
    delete item.date_window;
  }
  if (step.calendar.repeatRule) item.repeat_rule = step.calendar.repeatRule;
  else delete item.repeat_rule;
  return item;
}

function retainedStepToDetail(step: SourceBackedFlowMapStepBinding): FlowItemDetail {
  return {
    item_id: step.stepId,
    ...(step.textFallback.description ? { why: step.textFallback.description } : {}),
    ...(step.textFallback.items?.length ? { how: step.textFallback.items.join('\n') } : {}),
    ...(step.textFallback.doneWhen ? { completion_criteria: step.textFallback.doneWhen } : {}),
    ...(step.sourceUrl
      ? {
          links: [{
            label: '참고 원문',
            url: step.sourceUrl,
            type: step.sourceType === 'official' ? 'official' : step.sourceType === 'creator_experience' ? 'creator' : 'reference',
          }],
        }
      : {}),
  };
}

export function applySourceBackedPersonalCopyToBundle(
  bundle: FlowBundle,
  personalCopy?: SourceBackedFlowMapPersonalCopy,
): FlowBundle {
  const retainedSteps = personalCopy?.retainedStepsByFlow?.[bundle.flow.slug];
  if (!retainedSteps || Object.keys(retainedSteps).length === 0) return bundle;

  const retainedIds = new Set(Object.keys(retainedSteps));
  const existingIds = new Set(bundle.items.map((item) => item.id));
  const needsPersonalSection = Object.keys(retainedSteps).some((stepId) => !existingIds.has(stepId));
  const personalSectionId = `${bundle.flow.id}-personal-retained`;
  const sections: FlowSection[] = needsPersonalSection && !bundle.sections.some((section) => section.id === personalSectionId)
    ? [...bundle.sections, { id: personalSectionId, flow_id: bundle.flow.id, title: '내가 유지한 할 일', order: bundle.sections.length + 1 }]
    : bundle.sections;
  const items = [
    ...bundle.items.map((item) => retainedSteps[item.id] ? retainedStepToItem(bundle, retainedSteps[item.id], item) : item),
    ...Object.values(retainedSteps)
      .filter((step) => !existingIds.has(step.stepId))
      .map((step, index) => ({
        ...retainedStepToItem(bundle, step),
        section_id: personalSectionId,
        order: bundle.items.length + index + 1,
      })),
  ];
  const existingDetails = new Map((bundle.itemDetails ?? []).map((detail) => [detail.item_id, detail]));
  retainedIds.forEach((stepId) => existingDetails.set(stepId, retainedStepToDetail(retainedSteps[stepId])));

  return {
    ...bundle,
    sections,
    items,
    itemDetails: Array.from(existingDetails.values()),
  };
}

export function applySourceBackedPersistenceRecordToBundle(
  bundle: FlowBundle,
  record?: SourceBackedFlowMapPersistenceRecord,
  personalCopy?: SourceBackedFlowMapPersonalCopy,
): FlowBundle {
  const child = record?.childFlows.find((flow) => flow.slug === bundle.flow.slug);
  if (!child) return applySourceBackedPersonalCopyToBundle(bundle, personalCopy);

  const currentItemsById = new Map(bundle.items.map((item) => [item.id, item]));
  const excludedIds = new Set(personalCopy?.excludedStepIdsByFlow[bundle.flow.slug] ?? []);
  const savedIds = new Set(child.steps.map((step) => step.stepId));
  const personalSectionId = `${bundle.flow.id}-saved-version`;
  const needsSavedSection = child.steps.some((step) => !currentItemsById.has(step.stepId));
  const sections: FlowSection[] = needsSavedSection && !bundle.sections.some((section) => section.id === personalSectionId)
    ? [...bundle.sections, { id: personalSectionId, flow_id: bundle.flow.id, title: '저장한 내용', order: bundle.sections.length + 1 }]
    : bundle.sections;
  const items = [
    ...child.steps.map((step, index) => ({
      ...retainedStepToItem(bundle, step, currentItemsById.get(step.stepId)),
      ...(!currentItemsById.has(step.stepId) ? { section_id: personalSectionId } : {}),
      order: currentItemsById.get(step.stepId)?.order ?? index + 1,
    })),
    ...bundle.items.filter((item) => excludedIds.has(item.id) && !savedIds.has(item.id)),
  ];
  const detailsById = new Map((bundle.itemDetails ?? []).map((detail) => [detail.item_id, detail]));
  child.steps.forEach((step) => {
    const currentItem = currentItemsById.get(step.stepId);
    const matchesCurrentSource = currentItem?.title === step.title
      && (currentItem.description ?? '') === step.textFallback.description;
    if (!matchesCurrentSource || !detailsById.has(step.stepId)) {
      detailsById.set(step.stepId, retainedStepToDetail(step));
    }
  });
  const projected = {
    ...bundle,
    sections,
    items,
    itemDetails: Array.from(detailsById.values()).filter((detail) => items.some((item) => item.id === detail.item_id)),
  };
  return applySourceBackedPersonalCopyToBundle(projected, personalCopy);
}

export function assessSourceBackedFlowMapUpdate(saved: SourceBackedFlowMapSavedSnapshot): SourceBackedFlowMapUpdateAssessment {
  const currentBase = buildSourceBackedFlowMapSavedSnapshot(saved.mapId, {
    savedAt: saved.savedAt,
    ...(saved.anchor ? { anchor: saved.anchor } : {}),
  });
  if (!currentBase) {
    return {
      status: 'map_missing',
      userAction: 'reconnect_source',
      canApplyAutomatically: false,
      savedVersion: saved.version,
      reasons: ['현재 발행본을 찾을 수 없습니다.'],
      affectedFlows: saved.flowSlugs,
    };
  }
  const current = projectSourceBackedSnapshotForPersonalCopy(currentBase, saved.personalCopy, {
    title: saved.personalCopy ? saved.title : currentBase.title,
  });

  const affectedFlows = Array.from(new Set([...saved.flowSlugs, ...current.flowSlugs])).filter((slug) => {
    return (
      !saved.flowSlugs.includes(slug) ||
      !current.flowSlugs.includes(slug) ||
      saved.stepCountsByFlow[slug] !== current.stepCountsByFlow[slug] ||
      saved.sourceCheckedAtByFlow[slug] !== current.sourceCheckedAtByFlow[slug]
    );
  });

  const reasons: string[] = [];
  if (saved.version !== current.version) reasons.push(`버전 변경: ${saved.version} → ${current.version}`);
  if (!sameStringList(saved.flowSlugs, current.flowSlugs)) reasons.push('Flow 구성이 바뀌었습니다.');
  if (!sameRecordValues(saved.stepCountsByFlow, current.stepCountsByFlow)) reasons.push('Step 수가 바뀌었습니다.');
  if (!sameRecordValues(saved.sourceCheckedAtByFlow, current.sourceCheckedAtByFlow)) reasons.push('출처 확인일이 바뀌었습니다.');

  const contentChanged = reasons.length > 0;
  if (!contentChanged) {
    return {
      status: 'up_to_date',
      userAction: 'none',
      canApplyAutomatically: false,
      savedVersion: saved.version,
      currentVersion: current.version,
      reasons: [],
      affectedFlows: [],
    };
  }

  if (hasSensitiveSource(current)) reasons.push('공식/민감 일정은 자동 반영하지 않고 사용자가 변경 내용을 확인해야 합니다.');

  const needsReview =
    !sameStringList(saved.flowSlugs, current.flowSlugs) ||
    !sameRecordValues(saved.stepCountsByFlow, current.stepCountsByFlow) ||
    !sameRecordValues(saved.sourceCheckedAtByFlow, current.sourceCheckedAtByFlow) ||
    hasSensitiveSource(current);

  return {
    status: needsReview ? 'review_before_apply' : 'minor_update_available',
    userAction: 'review_changes',
    canApplyAutomatically: !needsReview,
    savedVersion: saved.version,
    currentVersion: current.version,
    reasons,
    affectedFlows,
  };
}

export function buildSourceBackedFlowMapPublishPackage(mapId: string): SourceBackedFlowMapPublishPackage | undefined {
  const map = sourceBackedMyFlowMaps.find((entry) => entry.id === mapId);
  if (!map) return undefined;

  const childBundles = getMapChildBundles(map);
  const missingFlowSlugs = map.flowSlugs.filter((slug) => !childBundles.some((bundle) => bundle.flow.slug === slug));
  const rowsBySlug = new Map(childBundles.map((bundle) => [bundle.flow.slug, buildSourceBackedMyFlowRows(bundle)]));
  const sourceRows = childBundles.flatMap((bundle) => {
    const sectionById = new Map(bundle.sections.map((section) => [section.id, section.title]));
    const rows = rowsBySlug.get(bundle.flow.slug) ?? [];
    return rows.map((row) => {
      const item = bundle.items.find((entry) => entry.id === row.stepId);
      const detailItems = row.textFallback.items ?? [];
      const reviewStatus: 'ready' | 'needs_source' | 'needs_items' = !row.sourceUrl
        ? 'needs_source'
        : detailItems.length === 0
          ? 'needs_items'
          : 'ready';
      return {
        flowSlug: bundle.flow.slug,
        flowTitle: bundle.flow.title,
        sectionTitle: item?.section_id ? sectionById.get(item.section_id) : undefined,
        stepId: row.stepId,
        sourceRowTitle: item?.title ?? row.title,
        sourceRowDescription: item?.description ?? row.textFallback.description,
        stepTitle: row.title,
        generatedStepTitle: row.title,
        destination: row.destination,
        scheduleSummary: describeCreatorRowSchedule(row),
        sourceType: row.sourceType,
        riskLevel: row.riskLevel,
        sourceUrl: row.sourceUrl,
        itemCount: detailItems.length,
        detailItems,
        itemFallbackText: detailItems.join('\n'),
        doneWhen: row.textFallback.doneWhen,
        memoHint: row.textFallback.memoHint,
        reviewStatus,
        reviewLabel:
          reviewStatus === 'ready' ? '준비됨' : reviewStatus === 'needs_source' ? '원문 링크 필요' : '하위 Item 확인',
        reviewNote:
          reviewStatus === 'ready'
            ? '원문 row가 Step과 Item으로 연결됨'
            : reviewStatus === 'needs_source'
              ? '이 Step은 발행 전 원문 근거 URL을 확인해야 함'
              : '외부 앱에 내려갈 Item 또는 fallback 문장을 확인해야 함',
      };
    });
  });
  const missingSourceRows = sourceRows.filter((row) => !row.sourceUrl).map((row) => row.stepTitle);
  const emptyChildFlows = childBundles.filter((bundle) => (rowsBySlug.get(bundle.flow.slug) ?? []).length === 0).map((bundle) => bundle.flow.title);
  const publishBlockers = [
    ...missingFlowSlugs.map((slug) => `연결된 Flow를 찾을 수 없음: ${slug}`),
    ...missingSourceRows.map((title) => `원문 링크가 없는 Step: ${title}`),
    ...emptyChildFlows.map((title) => `Step이 없는 Flow: ${title}`),
  ];

  return {
    map,
    creator: {
      surface: 'creator_publish',
      sourceRows,
      publishChecks: [
        `${map.sourceTitle} 원문 URL 확인`,
        `${sourceRows.length}개 Step이 원문 row에서 생성됨`,
        '사용자 화면은 저장 전 공개 화면과 내 Flow 실행 화면으로 분리',
      ],
      publishBlockers,
      publicPreviewHref: `/flow-maps/${map.id}`,
      draft: {
        storageKey: `flow:map:creator-draft:${map.id}`,
        publishedVersion: map.version,
        draftVersion: `${map.version}-draft`,
        editableFields: ['step_title', 'step_destination', 'source_url', 'item_fallback', 'creator_note'],
      },
    },
    public: {
      surface: 'public_save',
      title: map.title,
      summary: map.summary,
      sourceTitle: map.sourceTitle,
      sourceUrl: map.sourceUrl,
      setupInputs: map.setupInput ? [map.setupInput.label] : [],
      setupInput: map.setupInput,
      saveMode: map.publicSaveMode ?? 'save_all',
      choiceCopy: map.publicChoiceCopy,
      primaryCta: { label: '전체 저장하고 시작', href: '/my' },
      secondaryCtas: childBundles.map((bundle) => ({ label: `${bundle.flow.title}만 저장`, href: '/my' })),
      artifacts: map.artifacts,
      categoryLabel: map.categoryLabel,
      userFacingStatus: map.userFacingStatus,
      recommendedFlowSlug: map.recommendedFlowSlug,
      counts: map.counts,
      sourceUrlCount: map.sourceUrlCount,
      childFlows: childBundles.map((bundle) => ({
        slug: bundle.flow.slug,
        title: bundle.flow.title,
        destination: bundle.flow.primary_destination ?? 'internal_check',
        steps: bundle.items
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((item) => {
            const detail = getItemDetail(bundle, item.id);
            const detailItems = extractDetailItems(detail) ?? [];
            const seedMeta = extractSeedStepMeta(detail, item);
            return {
              id: item.id,
              title: item.title,
              ...seedMeta,
              detailItemCount: detailItems.length,
              detailItems,
            };
          }),
      })),
    },
    myFlow: {
      surface: 'my_flow_saved',
      demoHref: `/my?demo=source-backed&savedMap=${encodeURIComponent(map.id)}`,
      groupedAs: map.userLabel,
      savedSlugs: childBundles.map((bundle) => bundle.flow.slug),
      visibleTabs: ['오늘', '캘린더', 'Flow', '체크', '루틴'],
    },
  };
}

function describeCreatorRowSchedule(row: SourceBackedMyFlowRow): string {
  const calendar = row.calendar;
  if (calendar.mode === 'anchor_offset') {
    const offset = calendar.dayOffset ?? 0;
    const offsetLabel = offset === 0 ? 'D-Day' : offset > 0 ? `D+${offset}` : `D${offset}`;
    return calendar.window ? `${offsetLabel} / ${calendar.window.label}` : offsetLabel;
  }
  if (calendar.mode === 'routine') return calendar.repeatRule ? `repeat / ${calendar.repeatRule}` : 'repeat';
  if (calendar.window) return calendar.window.label;
  return 'no date';
}

function getMapChildBundles(map: SourceBackedMyFlowMap): FlowBundle[] {
  return map.flowSlugs
    .map((slug) => sourceBackedMyFlowBundles.find((bundle) => bundle.flow.slug === slug))
    .filter((bundle): bundle is FlowBundle => Boolean(bundle));
}

function sameStringList(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

function sameRecordValues(left: Record<string, unknown>, right: Record<string, unknown>): boolean {
  const keys = Array.from(new Set([...Object.keys(left), ...Object.keys(right)]));
  return keys.every((key) => left[key] === right[key]);
}

function hasSensitiveSource(snapshot: SourceBackedFlowMapSavedSnapshot): boolean {
  return Object.values(snapshot.riskLevelsByFlow).some((risk) => risk === 'medical_sensitive' || risk === 'financial_sensitive');
}

export function buildSourceBackedMyFlowRows(bundle: FlowBundle): SourceBackedMyFlowRow[] {
  const mapId = getMapId(bundle);

  return bundle.items
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((item) => {
      const detail = getItemDetail(bundle, item.id);
      const sourceUrl = detail?.links?.[0]?.url ?? bundle.flow.source_url;
      const includeMemoHint = !bundle.flow.tags?.includes('curated-source-app-seed');
      return {
        stepId: item.id,
        flowId: item.flow_id,
        mapId,
        title: item.title,
        destination: inferStepDestination(bundle, item),
        sourceTitle: bundle.flow.source_title,
        sourceUrl,
        sourceType: item.source_type,
        riskLevel: item.risk_level ?? bundle.flow.risk_level,
        calendar: buildCalendarBridge(bundle, item),
        textFallback: {
          title: item.title,
          description: item.description ?? detail?.why ?? bundle.flow.description ?? '',
          items: extractDetailItems(detail),
          ...(includeMemoHint ? { memoHint: getMemoHint(bundle, item) } : {}),
          url: sourceUrl,
          doneWhen: detail?.completion_criteria,
        },
      };
    });
}

export function assessProgressStepNeed(bundle: FlowBundle): ProgressStepNeedAssessment {
  const rows = buildSourceBackedMyFlowRows(bundle);
  const progressRows = rows.filter((row) => row.destination === 'progress');
  const progressContextIsPreserved =
    progressRows.length > 0 &&
    progressRows.every((row) => row.textFallback.items?.length && row.sourceUrl && row.calendar.mode === 'none');

  if (progressContextIsPreserved) {
    return {
      decision: 'not_needed_yet',
      reason:
        'Existing FlowItem rows plus the progress destination bridge preserve source rows, source links, memo hints, and text fallback without a first-class progress_step type.',
      evidence: [
        `${progressRows.length} progress rows derived from FlowItem`,
        'Item detail lines stay in textFallback.items',
        'No independent calendar row is invented for source-only progress rows',
      ],
    };
  }

  return {
    decision: 'needs_first_class_type',
    reason: 'Progress rows cannot currently preserve row state, source link, and fallback text without lossy mapping.',
    evidence: ['Missing progress destination rows or missing fallback/source detail'],
  };
}

function getMapId(bundle: FlowBundle): string | undefined {
  const tag = bundle.flow.tags?.find((entry) => entry.startsWith('flow-map:'));
  return tag?.slice('flow-map:'.length);
}

function getItemDetail(bundle: FlowBundle, itemId: string): FlowItemDetail | undefined {
  return bundle.itemDetails?.find((detail) => detail.item_id === itemId);
}

function inferStepDestination(bundle: FlowBundle, item: FlowItem): SourceBackedStepDestination {
  if (bundle.flow.tags?.includes('progress-flow')) return 'progress';
  if (item.type === 'calendar' || item.day_offset !== undefined || item.repeat_rule) return 'calendar';

  const destination = bundle.flow.primary_destination as PrimaryDestination | undefined;
  if (destination === 'sheet') return 'sheet';
  if (destination === 'memo') return 'memo';
  if (destination === 'internal_check') return 'checklist';
  return 'todo';
}

function buildCalendarBridge(bundle: FlowBundle, item: FlowItem): SourceBackedMyFlowRow['calendar'] {
  const window = item.date_window
    ? {
        label: item.date_window.label,
        startDayOffset: item.date_window.start_day_offset,
        endDayOffset: item.date_window.end_day_offset,
      }
    : undefined;
  if (item.repeat_rule) {
    return {
      mode: 'routine',
      anchorType: bundle.flow.anchor_type,
      allDay: true,
      repeatRule: item.repeat_rule,
      ...(window ? { window } : {}),
    };
  }
  if (item.day_offset !== undefined || item.type === 'calendar') {
    return {
      mode: 'anchor_offset',
      anchorType: bundle.flow.anchor_type,
      dayOffset: item.day_offset,
      allDay: true,
      ...(window ? { window } : {}),
    };
  }
  return window ? { mode: 'none', window } : { mode: 'none' };
}

function extractDetailItems(detail?: FlowItemDetail): string[] | undefined {
  if (!detail?.how) return undefined;
  const items = detail.how
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

function extractSeedStepMeta(
  detail: FlowItemDetail | undefined,
  item: FlowItem,
): {
  stepTitle?: string;
  memo?: string;
  sourceUrl?: string;
  sourceTrace?: string;
} {
  const sourceText = detail?.why ?? item.description ?? '';
  if (!sourceText) return {};

  const lines = sourceText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const stepTitle = lines.find((line) => line.startsWith('Step: '))?.slice('Step: '.length);
  const sourceTrace = lines.map(readSeedSourceTraceLine).find(Boolean);
  const memo = lines
    .filter((line) => !line.startsWith('Step: ') && !isSeedSourceTraceLine(line))
    .join('\n');
  const sourceUrl = detail?.links?.[0]?.url;

  return {
    ...(stepTitle ? { stepTitle } : {}),
    ...(memo ? { memo } : {}),
    ...(sourceUrl ? { sourceUrl } : {}),
    ...(sourceTrace ? { sourceTrace } : {}),
  };
}

function isSeedSourceTraceLine(line: string): boolean {
  return line.startsWith('원문 근거: ') || /^source\s*trace\s*[:：]\s*/i.test(line);
}

function readSeedSourceTraceLine(line: string): string | undefined {
  if (line.startsWith('원문 근거: ')) return line.slice('원문 근거: '.length).trim();
  const asciiMatch = line.match(/^source\s*trace\s*[:：]\s*(.+)$/i);
  return asciiMatch?.[1]?.trim();
}

function getMemoHint(bundle: FlowBundle, item: FlowItem): string {
  if (bundle.flow.tags?.includes('progress-flow')) return '다시 볼 개념만 짧게 남기기';
  if (item.day_offset !== undefined) return '연락처, 예약번호, 다시 볼 링크만 짧게 남기기';
  return '필요한 메모만 짧게 남기기';
}
