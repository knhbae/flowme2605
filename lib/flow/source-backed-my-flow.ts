import type {
  AnchorType,
  FlowBundle,
  FlowItem,
  FlowItemDetail,
  PrimaryDestination,
  RiskLevel,
  SourceType,
} from './types';

export type SourceBackedStepDestination = 'calendar' | 'todo' | 'checklist' | 'sheet' | 'memo' | 'progress';

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
  artifacts: string[];
  setupInput?: {
    label: string;
    hint: string;
    defaultValue?: string;
  };
  flowSlugs: string[];
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
      stepTitle: string;
      destination: SourceBackedStepDestination;
      sourceUrl?: string;
      itemCount: number;
    }[];
    publishChecks: string[];
    publishBlockers: string[];
    publicPreviewHref: string;
  };
  public: {
    surface: 'public_save';
    title: string;
    summary: string;
    sourceTitle: string;
    sourceUrl: string;
    setupInputs: string[];
    setupInput?: SourceBackedMyFlowMap['setupInput'];
    primaryCta: { label: string; href: string };
    secondaryCtas: { label: string; href: string }[];
    artifacts: string[];
    childFlows: {
      slug: string;
      title: string;
      destination: PrimaryDestination;
      steps: { id: string; title: string; detailItemCount: number }[];
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

const now = '2026-06-23T00:00:00.000Z';
const movingSourceUrl =
  'https://www.ajd.co.kr/contents/basic-tip/detail/이사_준비_체크리스트_완벽정리!_엑셀_Xls_PDF_노션_notion_첨부-23363';
const mathSourceUrl = 'https://mathbang.net/13';
const babyHealthCheckupSourceUrl = 'https://easylaw.go.kr/CSP/CnpClsMain.laf?ccfNo=1&cciNo=2&cnpClsNo=2&csmSeq=1138&popMenu=ov';
const babyHealthCheckupInfoUrl =
  'https://health.kdca.go.kr/healthinfo/biz/health/ntcnInfo/healthSourc/thtimtCntnts/thtimtCntntsView.do?thtimt_cntnts_sn=131&utm_medium=kdca&utm_source=kdca';
const babyVaccinationScheduleUrl = 'https://nip.kdca.go.kr/irhp/infm/goVcntInfo.do?menuCd=115&menuLv=1';
const babyVaccinationLookupUrl = 'https://nip.kdca.go.kr/irhp/mngm/goVcntMngm.do?menuCd=313&menuLv=3';

const movingDetails: Record<string, FlowItemDetail> = {
  'moving-method-quotes': {
    item_id: 'moving-method-quotes',
    why: '짐 양과 예산에 맞는 이사 방식을 먼저 정해야 견적 비교가 가능합니다.',
    how: ['이사 방식 1개를 정합니다.', '견적 후보 2-3곳을 열고 연락처를 메모합니다.', '포함 범위와 예상 비용을 짧게 남깁니다.'].map((item) => `- ${item}`).join('\n'),
    completion_criteria: '견적 후보 2-3곳과 연락처, 비용 범위가 메모됐습니다.',
    links: [{ label: 'AJD 이사 준비 체크리스트', url: movingSourceUrl, type: 'reference' }],
  },
  'moving-cleaning-waste': {
    item_id: 'moving-cleaning-waste',
    why: '입주청소와 대형폐기물은 예약/수거일이 이사일과 충돌할 수 있습니다.',
    how: ['입주청소가 필요하면 예약 가능일을 확인합니다.', '대형폐기물 신고 가능 품목과 수거일을 확인합니다.', '예약처와 신고 번호를 메모합니다.'].map((item) => `- ${item}`).join('\n'),
    completion_criteria: '예약일, 수거일, 신고 번호가 메모됐습니다.',
    links: [{ label: 'AJD 이사 준비 체크리스트', url: movingSourceUrl, type: 'reference' }],
  },
  'moving-address-admin': {
    item_id: 'moving-address-admin',
    why: '주소 변경과 관리사무소 공유는 이사 당일 동선과 우편물 누락을 줄입니다.',
    how: ['관리사무소에 이사 시간과 차량 동선을 공유합니다.', '자주 쓰는 배송 계정 주소 변경 대상을 확인합니다.', '우편물 주소 변경이 필요한 곳을 메모합니다.'].map((item) => `- ${item}`).join('\n'),
    completion_criteria: '관리사무소 공유와 주소 변경 대상 메모가 끝났습니다.',
    links: [{ label: 'AJD 이사 준비 체크리스트', url: movingSourceUrl, type: 'reference' }],
  },
  'moving-meter-photos': {
    item_id: 'moving-meter-photos',
    why: '계량기와 집 상태 사진은 정산과 하자 확인 때 다시 볼 근거가 됩니다.',
    how: ['전기, 가스, 수도 계량기를 촬영합니다.', '현관, 욕실, 창문, 콘센트 주변 상태를 촬영합니다.', '사진 위치나 공유 여부만 짧게 메모합니다.'].map((item) => `- ${item}`).join('\n'),
    completion_criteria: '계량기와 주요 공간 사진 위치가 메모됐습니다.',
    links: [{ label: 'AJD 이사 준비 체크리스트', url: movingSourceUrl, type: 'reference' }],
  },
  'moving-move-day-admin': {
    item_id: 'moving-move-day-admin',
    why: '이사 당일 처리해야 하는 행정/정산 항목은 놓치면 다시 확인해야 합니다.',
    how: ['잔금/정산 확인 내용을 메모합니다.', '전입신고와 확정일자 확인 필요 여부를 체크합니다.', '처리 결과나 다시 볼 링크만 남깁니다.'].map((item) => `- ${item}`).join('\n'),
    completion_criteria: '정산 메모와 행정 확인 결과가 남았습니다.',
    links: [
      { label: '정부24', url: 'https://www.gov.kr', type: 'official' },
      { label: '인터넷등기소', url: 'https://www.iros.go.kr', type: 'official' },
    ],
  },
};

const mathDetailHow = ['원문 단원 링크에서 해당 소단원만 엽니다.', '오늘 본 범위나 문제 번호를 표시합니다.', '막힌 부분이나 오답 번호만 메모합니다.']
  .map((item) => `- ${item}`)
  .join('\n');

const mathDetails: Record<string, FlowItemDetail> = Object.fromEntries(
  [
    'math-prime-factorization',
    'math-integers-rationals',
    'math-equations',
    'math-functions',
    'math-coordinate-plane',
    'math-graph-proportion',
  ].map((id) => [
    id,
    {
      item_id: id,
      why: '중1 수학 목차의 단원 진행 위치를 잃지 않기 위한 진도 row입니다.',
      how: mathDetailHow,
      completion_criteria: '해당 단원에서 오늘 본 범위와 다시 볼 부분을 남겼습니다.',
      links: [{ label: 'Mathbang 중1 수학 목차', url: mathSourceUrl, type: 'reference' }],
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
      why: `${window.period}에 해당하는 ${window.title} 기간을 놓치지 않기 위한 공식 일정 row입니다.`,
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
      why: `${window.period}에 아이 표준예방접종일을 공식 조회하기 위한 일정 row입니다.`,
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
    id: 'middle-school-math-1',
    userLabel: '중1 수학 지도',
    title: '중1 수학 목차 진도 지도',
    version: '2026-06-23.1',
    updatedAt: now,
    updatePolicy: 'auto_patch_when_safe',
    summary: '원문 목차의 단원들을 진도표로 저장하고, 각 단원에서 막힌 부분만 짧게 남깁니다.',
    sourceTitle: 'Mathbang 중1 수학 목차',
    sourceUrl: mathSourceUrl,
    artifacts: ['단원별 진도표', '막힌 부분 메모', '원문 링크'],
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
      tags: ['source-backed', 'timeline', 'calendar'],
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
      title: '중1 수학 목차 진도',
      description: '원문 목차의 단원을 진도 row로 저장하고, 막힌 부분만 짧게 남깁니다.',
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
      { id: 'math-number', flow_id: 'flow-source-backed-middle-school-math-1', title: '수와 연산', order: 0 },
      { id: 'math-letter', flow_id: 'flow-source-backed-middle-school-math-1', title: '문자와 식', order: 1 },
      { id: 'math-graph', flow_id: 'flow-source-backed-middle-school-math-1', title: '좌표평면과 그래프', order: 2 },
    ],
    items: [
      {
        id: 'math-prime-factorization',
        flow_id: 'flow-source-backed-middle-school-math-1',
        section_id: 'math-number',
        title: '소인수분해',
        description: '목차에서 소인수분해 단원 진행 여부를 표시합니다.',
        type: 'todo',
        source_type: 'reference',
        order: 0,
      },
      {
        id: 'math-integers-rationals',
        flow_id: 'flow-source-backed-middle-school-math-1',
        section_id: 'math-number',
        title: '정수와 유리수',
        description: '정수와 유리수 단원에서 오늘 본 범위만 표시합니다.',
        type: 'todo',
        source_type: 'reference',
        order: 1,
      },
      {
        id: 'math-equations',
        flow_id: 'flow-source-backed-middle-school-math-1',
        section_id: 'math-letter',
        title: '일차방정식',
        description: '방정식 단원 진행과 다시 볼 문제를 남깁니다.',
        type: 'todo',
        source_type: 'reference',
        order: 2,
      },
      {
        id: 'math-functions',
        flow_id: 'flow-source-backed-middle-school-math-1',
        section_id: 'math-letter',
        title: '함수',
        description: '함수 단원 진행 여부를 표시합니다.',
        type: 'todo',
        source_type: 'reference',
        order: 3,
      },
      {
        id: 'math-coordinate-plane',
        flow_id: 'flow-source-backed-middle-school-math-1',
        section_id: 'math-graph',
        title: '좌표평면',
        description: '좌표평면 단원 진행 여부를 표시합니다.',
        type: 'todo',
        source_type: 'reference',
        order: 4,
      },
      {
        id: 'math-graph-proportion',
        flow_id: 'flow-source-backed-middle-school-math-1',
        section_id: 'math-graph',
        title: '그래프와 비례',
        description: '그래프와 비례 관계 단원 진행 여부를 표시합니다.',
        type: 'todo',
        source_type: 'reference',
        order: 5,
      },
    ],
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
];

export function mergeSourceBackedMyFlowBundles(bundles: FlowBundle[]): FlowBundle[] {
  const existingSlugs = new Set(bundles.map((bundle) => bundle.flow.slug));
  const additions = sourceBackedMyFlowBundles.filter((bundle) => !existingSlugs.has(bundle.flow.slug));
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

export function assessSourceBackedFlowMapUpdate(saved: SourceBackedFlowMapSavedSnapshot): SourceBackedFlowMapUpdateAssessment {
  const current = buildSourceBackedFlowMapSavedSnapshot(saved.mapId, {
    savedAt: saved.savedAt,
    ...(saved.anchor ? { anchor: saved.anchor } : {}),
  });
  if (!current) {
    return {
      status: 'map_missing',
      userAction: 'reconnect_source',
      canApplyAutomatically: false,
      savedVersion: saved.version,
      reasons: ['현재 발행본을 찾을 수 없습니다.'],
      affectedFlows: saved.flowSlugs,
    };
  }

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
  if (hasSensitiveSource(current)) reasons.push('공식/민감 일정은 자동 반영하지 않고 사용자가 변경 내용을 확인해야 합니다.');

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

  const needsReview =
    !sameStringList(saved.flowSlugs, current.flowSlugs) ||
    !sameRecordValues(saved.stepCountsByFlow, current.stepCountsByFlow) ||
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
      return {
        flowSlug: bundle.flow.slug,
        flowTitle: bundle.flow.title,
        sectionTitle: item?.section_id ? sectionById.get(item.section_id) : undefined,
        stepId: row.stepId,
        stepTitle: row.title,
        destination: row.destination,
        sourceUrl: row.sourceUrl,
        itemCount: row.textFallback.items?.length ?? 0,
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
    },
    public: {
      surface: 'public_save',
      title: map.title,
      summary: map.summary,
      sourceTitle: map.sourceTitle,
      sourceUrl: map.sourceUrl,
      setupInputs: map.setupInput ? [map.setupInput.label] : [],
      setupInput: map.setupInput,
      primaryCta: { label: '전체 지도 저장', href: '/my' },
      secondaryCtas: childBundles.map((bundle) => ({ label: `${bundle.flow.title}만 저장`, href: '/my' })),
      artifacts: map.artifacts,
      childFlows: childBundles.map((bundle) => ({
        slug: bundle.flow.slug,
        title: bundle.flow.title,
        destination: bundle.flow.primary_destination ?? 'internal_check',
        steps: bundle.items
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((item) => ({
            id: item.id,
            title: item.title,
            detailItemCount: extractDetailItems(getItemDetail(bundle, item.id))?.length ?? 0,
          })),
      })),
    },
    myFlow: {
      surface: 'my_flow_saved',
      demoHref: '/my?demo=source-backed',
      groupedAs: map.userLabel,
      savedSlugs: childBundles.map((bundle) => bundle.flow.slug),
      visibleTabs: ['오늘', '캘린더', 'Flow', '체크', '루틴'],
    },
  };
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
          memoHint: getMemoHint(bundle, item),
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

function getMemoHint(bundle: FlowBundle, item: FlowItem): string {
  if (bundle.flow.tags?.includes('progress-flow')) return '막힌 부분, 오답 번호, 다시 볼 범위만 짧게 남기기';
  if (item.day_offset !== undefined) return '연락처, 예약번호, 다시 볼 링크만 짧게 남기기';
  return '필요한 메모만 짧게 남기기';
}
