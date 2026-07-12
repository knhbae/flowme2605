import type { Flow, FlowBundle, FlowItem, FlowItemDetail, FlowItemLinkType, RiskLevel, SourceType } from './types';
import type { SourceBackedFlowMapQualityDecision, SourceBackedMyFlowMap } from './source-backed-my-flow';

const now = '2026-06-30T00:00:00.000Z';
const reviewedNow = '2026-07-12T00:00:00.000Z';

const funmomSourceUrl = 'https://funmom.tistory.com/';
const opicSourceUrl =
  'https://mansour.tistory.com/entry/%EC%98%A4%ED%94%BD-%EB%AA%A8%EC%9D%98%EA%B3%A0%EC%82%AC-%EA%B3%B5%EB%B6%80-%EB%B0%A9%EB%B2%95';
const opicYoutubeSourceUrl = 'https://www.youtube.com/playlist?list=PLq3xvPExCrK_-1NmAkyHjr3mNbimxo2ic';
const babyFoodSourceUrl = 'https://blog.naver.com/01695258757/222768860919';
const readingSourceUrl = 'https://blog.naver.com/naristyle87/222978131890';
const newCarSourceUrl = 'https://web.getcha.kr/blog/complete-guide-new-car-purchase-procedure-for-beginners';
const newCarRegistrationSourceUrl =
  'https://www.easylaw.go.kr/CSP/CnpClsMain.laf?ccfNo=1&cciNo=2&cnpClsNo=1&csmSeq=675&popMenu=ov';
const newCarInsuranceSourceUrl =
  'https://www.easylaw.go.kr/CSP/CnpClsMain.laf?ccfNo=1&cciNo=1&cnpClsNo=3&csmSeq=675';
const vaccinationSourceUrl = 'https://khms.or.kr/healthy_life/prevention/vaccination_child';
const movingSourceUrl =
  'https://www.ajd.co.kr/contents/basic-tip/detail/%EC%9D%B4%EC%82%AC_%EC%A4%80%EB%B9%84_%EC%B2%B4%ED%81%AC%EB%A6%AC%EC%8A%A4%ED%8A%B8_2024_%EC%99%84%EB%B2%BD%EC%A0%95%EB%A6%AC!-23363';
const weddingNaverSourceUrl = 'https://blog.naver.com/wilklove/223518896995';
const weddingGongysdSourceUrl = 'https://gongysd.com/wedding-notion/?bmode=view&idx=167989966';
const allblancSourceUrl = 'https://youtube.com/@allblanctv';
const allblancMorningWorkoutUrl = 'https://www.youtube.com/watch?v=fLLScgWQcHc';
const allblancNoJumpWorkoutUrl = 'https://www.youtube.com/watch?v=2dail5Imi04';
const allblancLowerBodyWorkoutUrl = 'https://www.youtube.com/watch?v=UEPkHmW_2FU';
const physicalActivitySafetySourceUrl =
  'https://www.cdc.gov/healthy-weight-growth/physical-activity/getting-started.html';

function newCarSourceTrace(
  stepId: string,
  sourceUrl = newCarSourceUrl,
  sourceLabel = 'Getcha new car purchase guide',
): string {
  return `${sourceLabel} ${sourceUrl} - source purchase step: ${stepId}`;
}

function movingSourceTrace(stepId: string): string {
  return `AJD moving checklist article ${movingSourceUrl} - curated D-30 moving step: ${stepId}`;
}

function opicSourceTrace(rowGroup: 'workbook two-week' | 'workbook one-month', stepId: string, rowLabel: string): string {
  return `Mansour OPIC mock course article ${opicSourceUrl} - ${rowGroup} row: ${stepId} ${rowLabel}`;
}

function weddingNaverSourceTrace(stepId: string, rowLabel: string): string {
  return `Naver wedding timeline article ${weddingNaverSourceUrl} - timeline period row: ${stepId} ${rowLabel}`;
}

function weddingGongysdSourceTrace(stepId: string, rowLabel: string): string {
  return `Gongysd wedding checklist article ${weddingGongysdSourceUrl} - A-to-Z category row: ${stepId} ${rowLabel}`;
}

function allblancSourceTrace(videoUrl: string, stepId: string, rowLabel: string): string {
  return `Allblanc exact video source ${videoUrl} - video row: ${stepId} ${rowLabel}`;
}

function childVaccinationSourceTrace(stepId: string, rowLabel: string): string {
  return `KHMS child vaccination official schedule ${vaccinationSourceUrl} - schedule row: ${stepId} ${rowLabel}`;
}

function funmomSourceTrace(stepId: string, categoryLabel: string): string {
  return `Funmom category collection ${funmomSourceUrl} - FlowMe draft row: ${stepId}; homepage category: ${categoryLabel}; exact printable article not imported`;
}

type CuratedFlowSeed = Omit<Flow, 'created_at' | 'updated_at' | 'status' | 'content_type'> &
  Partial<Pick<Flow, 'status' | 'content_type' | 'created_at' | 'updated_at'>>;

type CuratedStep = {
  id: string;
  sectionId: string;
  title: string;
  description: string;
  order: number;
  type?: FlowItem['type'];
  dayOffset?: number;
  dateWindow?: FlowItem['date_window'];
  repeatRule?: string;
  sourceType?: SourceType;
  riskLevel?: RiskLevel;
  sourceUrl?: string;
  sourceLabel?: string;
  additionalLinks?: NonNullable<FlowItemDetail['links']>;
  linkType?: FlowItemLinkType;
  why: string;
  how: string[];
  doneWhen: string;
  caution?: string;
  sourceTrace?: string;
};

function lines(items: string[]): string {
  return items.map((item) => `- ${item}`).join('\n');
}

function bundle(flow: CuratedFlowSeed, sections: FlowBundle['sections'], steps: CuratedStep[]): FlowBundle {
  const sourceUrl = flow.source_url;
  return {
    flow: {
      ...flow,
      status: flow.status ?? 'published',
      content_type: flow.content_type ?? 'default',
      created_at: flow.created_at ?? now,
      updated_at: flow.updated_at ?? now,
    },
    sections,
    items: steps.map((step) => {
      const item: FlowItem = {
        id: step.id,
        flow_id: flow.id,
        section_id: step.sectionId,
        title: step.title,
        description: step.description,
        type: step.type ?? (step.dayOffset !== undefined || step.repeatRule ? 'calendar' : 'todo'),
        order: step.order,
        ...(step.dayOffset !== undefined ? { day_offset: step.dayOffset, duration_days: 1 } : {}),
        ...(step.dateWindow ? { date_window: step.dateWindow } : {}),
        ...(step.repeatRule ? { repeat_rule: step.repeatRule } : {}),
        ...(step.sourceType ? { source_type: step.sourceType } : {}),
        ...(step.riskLevel ? { risk_level: step.riskLevel } : {}),
      };
      return item;
    }),
    itemDetails: steps.map((step) => {
      const why = [step.why, step.sourceTrace ? `sourceTrace: ${step.sourceTrace}` : ''].filter(Boolean).join('\n');
      const detail: FlowItemDetail = {
        item_id: step.id,
        why,
        how: lines(step.how),
        completion_criteria: step.doneWhen,
        ...(step.caution ? { caution: step.caution } : {}),
        links: [
          {
            label: step.sourceLabel ?? '원문 열기',
            url: step.sourceUrl ?? sourceUrl ?? '',
            type: step.linkType ?? (step.sourceType === 'official' ? 'official' : step.sourceType === 'creator_experience' ? 'creator' : 'reference'),
          },
          ...(step.additionalLinks ?? []),
        ],
      };
      return detail;
    }),
  };
}

function section(flowId: string, id: string, title: string, order: number): FlowBundle['sections'][number] {
  return { id, flow_id: flowId, title, order };
}

function tagMap(mapId: string, ...tags: string[]): string[] {
  return ['source-backed', `flow-map:${mapId}`, ...tags];
}

export const curatedSourceBackedFlowMapQualityDecisions: Record<string, SourceBackedFlowMapQualityDecision> = {
  'curated-funmom-learning-park': {
    mapId: 'curated-funmom-learning-park',
    status: 'park',
    homepageEligible: false,
    directRouteEnabled: true,
    publicExecutionEnabled: false,
    executionHoldReason: 'source_rows',
    productScore: 4.5,
    reason: 'The current site exposes broad worksheet categories, but the weekly schedule and difficulty choices are not source-defined and exact printable article rows are not imported.',
    nextAction: 'Keep the source accessible as a review hold and import exact printable article URLs, audience or difficulty, and reuse rights before enabling execution.',
  },
  'curated-opic-mock-course': {
    mapId: 'curated-opic-mock-course',
    status: 'candidate',
    homepageEligible: false,
    directRouteEnabled: true,
    productScore: 6.8,
    reason: 'The article workbook has a usable 2-week and 1-month plan; the Flow must expose planned days and video mapping instead of asking the user to plan.',
    nextAction: 'Use the 2-week plan as the executable path and keep the 1-month plan as a slower repeat option.',
  },
  'curated-baby-food-meal-log': {
    mapId: 'curated-baby-food-meal-log',
    status: 'revise',
    homepageEligible: false,
    directRouteEnabled: false,
    productScore: 5.4,
    reason:
      'The source file columns are useful for a record sheet, but the actual PDF/HWP rows are not fully seeded yet and the source-traced baby-food-map already owns the same source URL.',
    nextAction:
      'Keep this map directly publishable for review, but hold URL lookup until its sourceTrace rows are completed or it is merged into baby-food-map.',
  },
  'curated-reading-routine-log': {
    mapId: 'curated-reading-routine-log',
    status: 'candidate',
    homepageEligible: false,
    directRouteEnabled: true,
    productScore: 5.6,
    reason: 'The source is a record habit, so FLOW must provide a monthly reading schedule plus record rows rather than a loose log.',
    nextAction: 'Keep as a 4-week reading plan and review whether the user can follow it without deciding the cadence.',
  },
  'curated-new-car-purchase-guide': {
    mapId: 'curated-new-car-purchase-guide',
    status: 'candidate',
    homepageEligible: false,
    directRouteEnabled: true,
    publicExecutionEnabled: true,
    productScore: 7.2,
    reason:
      'The private guide supports the purchase sequence, while current EasyLaw registration and compulsory-insurance pages now support the two legal or administrative rows.',
    nextAction:
      'Keep fixed prices, ratios, deadlines, product recommendations, and universal document claims out; recheck the official registration and insurance links before their review window expires.',
  },
  'curated-child-vaccination-schedule': {
    mapId: 'curated-child-vaccination-schedule',
    status: 'revise',
    homepageEligible: false,
    directRouteEnabled: true,
    publicExecutionEnabled: false,
    productScore: 6,
    reason: 'The official schedule rows are useful, but medical-sensitive copy and current official-row parity need review.',
    nextAction: 'Use only official row labels, birth-date offsets, and clinic-confirmation memo fields.',
  },
  'curated-ajd-moving-d30': {
    mapId: 'curated-ajd-moving-d30',
    status: 'candidate',
    homepageEligible: false,
    directRouteEnabled: true,
    publicCatalogEligible: false,
    productScore: 8,
    reason: 'The source has a strong D-day checklist and overlaps the existing representative moving baseline.',
    nextAction: 'Keep direct URL lookup and saved copies, but hide this duplicate from general discovery while moving-d30 remains the representative card.',
  },
  'curated-wedding-checklist-family': {
    mapId: 'curated-wedding-checklist-family',
    status: 'candidate',
    homepageEligible: false,
    directRouteEnabled: true,
    productScore: 6.6,
    reason: 'Two source versions are useful, but they must remain separate child Flows rather than one blended checklist.',
    nextAction: 'Add a version-selection save path before representative exposure.',
  },
  'curated-allblanc-workout-park': {
    mapId: 'curated-allblanc-workout-park',
    status: 'candidate',
    homepageEligible: false,
    directRouteEnabled: true,
    publicExecutionEnabled: true,
    productScore: 6.8,
    reason:
      'The three exact videos remain playable, but they were published in 2020, 2021, and 2023. Public execution keeps the morning and no-jump video identities with user-selected schedules; the high-intensity lower-body video remains outside the public child list.',
    nextAction:
      'Show publication age separately from the latest URL check, keep weekday choices as personal calendar settings, and require a clearer intensity-fit step before reconsidering the lower-body video.',
  },
};

export const curatedSourceBackedMyFlowMaps: SourceBackedMyFlowMap[] = [
  {
    id: 'curated-funmom-learning-park',
    userLabel: '펀맘 학습자료',
    title: '펀맘 주간 출력 루틴',
    version: '2026-07-12.hold.1',
    updatedAt: reviewedNow,
    updatePolicy: 'review_before_apply',
    summary: '현재 사이트는 학습자료 카테고리 모음입니다. 개별 활동지 URL과 나이·난이도를 확인하기 전까지 새 일정 저장을 보류합니다.',
    sourceTitle: '펀맘',
    sourceUrl: funmomSourceUrl,
    artifacts: ['개별 활동지 원문 선택', '나이·난이도 확인'],
    flowSlugs: ['curated-funmom-weekly-print-picker'],
  },
  {
    id: 'curated-opic-mock-course',
    userLabel: '오픽 모의고사',
    title: '오픽 모의고사 2주/1달 계획표',
    version: '2026-06-30.3',
    updatedAt: now,
    updatePolicy: 'review_before_apply',
    summary: '원문 XLSX의 2주 계획표와 1달 반복 구조를 시작일 기준 일정으로 옮기고, 오픽만수르 모의고사 재생목록을 회차별 링크 메모로 붙입니다.',
    sourceTitle: '오픽 모의고사 공부 방법',
    sourceUrl: opicSourceUrl,
    artifacts: ['2주 모의고사 캘린더', '1달 반복 계획표', '회차별 영상 링크 메모'],
    categoryLabel: '어학 학습',
    setupInput: {
      label: '시작일',
      hint: '모의고사 1회차를 시작할 날짜입니다.',
      defaultValue: '2026-07-01',
    },
    flowSlugs: ['curated-opic-single-mock-review', 'curated-opic-course-row-import'],
  },
  {
    id: 'curated-baby-food-meal-log',
    userLabel: '이유식 식단 기록',
    title: '이유식 식단표 기록',
    version: '2026-06-30.2',
    updatedAt: now,
    updatePolicy: 'review_before_apply',
    summary: '다운로드 식단표의 D+n 항목을 오늘 먹인 기록, 알레르기 O/X, 먹은 양으로만 옮깁니다.',
    sourceTitle: 'Naver 이유식 식단표',
    sourceUrl: babyFoodSourceUrl,
    artifacts: ['식단표 기록', 'NEW 재료 메모', '큐브 재고표'],
    setupInput: {
      label: '시작일',
      hint: '선택한 식단표의 첫날을 이 날짜에 맞춥니다.',
      defaultValue: '2026-07-01',
    },
    flowSlugs: ['curated-baby-food-daily-meal-row', 'curated-baby-food-cube-stock'],
  },
  {
    id: 'curated-reading-routine-log',
    userLabel: '독서 기록',
    title: '월 4권 독서 기록 루틴',
    version: '2026-06-30.3',
    updatedAt: now,
    updatePolicy: 'auto_patch_when_safe',
    summary: '월초에 책 4권을 정하고 매주 한 권씩 읽기, 중간 메모, 완료 기록, 월말 합계를 따라가게 만든 독서 기록 루틴입니다.',
    sourceTitle: '독서 기록 Naver blog',
    sourceUrl: readingSourceUrl,
    artifacts: ['4주 독서 캘린더', '책별 기록표', '월말 권수 합계'],
    categoryLabel: '독서 루틴',
    flowSlugs: ['curated-reading-monthly-log'],
  },
  {
    id: 'curated-new-car-purchase-guide',
    userLabel: '신차 구매',
    title: '신차 구매 7단계 체크리스트',
    version: '2026-07-12.1',
    updatedAt: reviewedNow,
    updatePolicy: 'review_before_apply',
    summary: '구매 순서는 참고 가이드로 정리하고, 등록과 의무보험은 현재 공식 안내를 따로 확인합니다.',
    sourceTitle: 'Getcha 신차 구매 절차 참고 가이드',
    sourceUrl: newCarSourceUrl,
    artifacts: ['구매 절차 체크리스트', '견적 비교 메모', '출고/등록 확인 메모'],
    categoryLabel: '구매 준비',
    flowSlugs: ['curated-new-car-basic'],
  },
  {
    id: 'curated-child-vaccination-schedule',
    userLabel: '영유아 예방접종',
    title: '아이 예방접종 일정표',
    version: '2026-06-30.2',
    updatedAt: now,
    updatePolicy: 'review_before_apply',
    summary: '아이 생년월일 기준으로 공식 예방접종 항목을 확인 일정으로 저장하고, 가능 여부는 병원/공식 채널에서 확인합니다.',
    sourceTitle: 'KHMS 영유아 예방접종',
    sourceUrl: vaccinationSourceUrl,
    artifacts: ['생년월일 기준 접종 일정', '공식 항목 메모', '병원 확인 상태'],
    categoryLabel: '아이 건강 일정',
    setupInput: {
      label: '아이 생년월일',
      hint: '생년월일을 기준으로 월령별 공식표 확인 일정을 만듭니다.',
      defaultValue: '2026-01-15',
    },
    flowSlugs: ['curated-child-vaccination-first-year', 'curated-child-vaccination-booster-school-age'],
  },
  {
    id: 'curated-ajd-moving-d30',
    userLabel: '이사 D-30',
    title: '이사 D-30 체크리스트',
    version: '2026-06-30.2',
    updatedAt: now,
    updatePolicy: 'auto_patch_when_safe',
    summary: '이사일 하나로 D-30, D-10, D-3, D-1, D-Day 확인 항목을 날짜별 체크로 저장합니다.',
    sourceTitle: 'AJD 이사 준비 체크리스트',
    sourceUrl: movingSourceUrl,
    artifacts: ['D-day 캘린더', '이사 체크리스트', '업체/정산 메모'],
    categoryLabel: '이사 준비',
    setupInput: {
      label: '이사일',
      hint: '이사일을 기준으로 D-30부터 D-Day까지 배치합니다.',
      defaultValue: '2026-07-31',
    },
    flowSlugs: ['curated-ajd-moving-d30'],
  },
  {
    id: 'curated-wedding-checklist-family',
    userLabel: '결혼 준비',
    title: '결혼 준비 체크리스트 2종',
    version: '2026-06-30.2',
    updatedAt: now,
    updatePolicy: 'review_before_apply',
    summary: 'Naver 1년 타임라인과 Gongysd A-to-Z 체크리스트를 한 Flow로 섞지 않고, 원문별 버전으로 나눠 저장합니다.',
    sourceTitle: '결혼 체크리스트 원문 2종',
    sourceUrl: weddingNaverSourceUrl,
    artifacts: ['결혼식 D-month 일정', 'A-to-Z 준비표', '업체/보류 메모'],
    categoryLabel: '결혼 준비',
    setupInput: {
      label: '결혼식 날짜',
      hint: '타임라인 버전은 결혼식 날짜 기준으로 계산합니다.',
      defaultValue: '2027-05-01',
    },
    flowSlugs: ['curated-wedding-naver-timeline', 'curated-wedding-gongysd-atoz'],
  },
  {
    id: 'curated-allblanc-workout-park',
    userLabel: 'Allblanc 홈트',
    title: 'Allblanc 영상별 홈트 루틴',
    version: '2026-07-12.4',
    updatedAt: reviewedNow,
    updatePolicy: 'review_before_apply',
    summary: '영상 1개를 루틴 1개로 연결합니다. 게시 시점과 현재 재생 여부를 따로 확인하고, 반복 요일은 원문 처방이 아니라 사용자가 고르는 캘린더 설정으로 둡니다.',
    sourceTitle: 'Allblanc TV YouTube 채널',
    sourceUrl: allblancSourceUrl,
    artifacts: ['영상별 반복 일정', '영상 URL과 운동 요약', '완료/중단 상태'],
    categoryLabel: '운동 루틴',
    setupInput: {
      label: '시작일',
      hint: '선택한 영상을 처음 열 날입니다. 반복 요일은 저장 전에 직접 바꿉니다.',
      defaultValue: '2026-07-01',
    },
    publicSaveMode: 'choose_child',
    flowSlugs: ['curated-allblanc-morning-workout', 'curated-allblanc-no-jump-cardio'],
  },
];

const funmomFlowId = 'flow-curated-funmom-weekly-print-picker';
const opicReviewFlowId = 'flow-curated-opic-single-mock-review';
const opicCourseFlowId = 'flow-curated-opic-course-row-import';
const babyFoodDailyFlowId = 'flow-curated-baby-food-daily-meal-row';
const babyFoodCubeFlowId = 'flow-curated-baby-food-cube-stock';
const readingFlowId = 'flow-curated-reading-monthly-log';
const newCarFlowId = 'flow-curated-new-car-basic';
const vaccinationFirstYearFlowId = 'flow-curated-child-vaccination-first-year';
const vaccinationBoosterFlowId = 'flow-curated-child-vaccination-booster-school-age';
const movingFlowId = 'flow-curated-ajd-moving-d30';
const weddingNaverFlowId = 'flow-curated-wedding-naver-timeline';
const weddingGongysdFlowId = 'flow-curated-wedding-gongysd-atoz';
const allblancMorningFlowId = 'flow-curated-allblanc-morning-workout';
const allblancNoJumpFlowId = 'flow-curated-allblanc-no-jump-cardio';
const allblancLowerBodyFlowId = 'flow-curated-allblanc-lower-body';

export const curatedSourceBackedMyFlowBundles: FlowBundle[] = [
  bundle(
    {
      id: funmomFlowId,
      slug: 'curated-funmom-weekly-print-picker',
      title: '펀맘 월~토 출력 루틴',
      description: '펀맘 카테고리를 바탕으로 FlowMe가 만든 검토용 주간 구성입니다. 개별 활동지 원문을 고르기 전에는 실행하지 않습니다.',
      category: '육아/학습자료',
      structure_type: 'routine',
      anchor_type: 'start_date',
      source_title: '펀맘',
      source_url: funmomSourceUrl,
      source_status: 'real',
      source_precision: 'broad',
      source_checked_at: '2026-07-12',
      primary_destination: 'calendar',
      risk_level: 'low',
      setup_anchor_label: '이번 주 시작일',
      setup_anchor_hint: '월요일 또는 이번 주 첫 학습일을 넣습니다.',
      tags: tagMap('curated-funmom-learning-park', 'park', 'source-import-required', 'weekly-print-routine'),
    },
    [section(funmomFlowId, 'funmom-week', '요일별 출력 루틴', 0)],
    [
      ['funmom-mon-coloring', '월: 색칠공부 한 장 출력', '색칠공부 카테고리에서 아이가 10분 안에 끝낼 자료 한 장을 고릅니다.', 0, ['색칠공부 카테고리 열기', '나이/수준이 맞는 자료 1개 출력', '끝낸 뒤 쉬웠는지/어려웠는지 한 줄 메모']],
      ['funmom-tue-hangul', '화: 한글 글자/낱말 한 장 출력', '한글공부 카테고리에서 지금 익히는 글자나 낱말 자료 한 장을 고릅니다.', 1, ['한글공부 카테고리 열기', '최근 익히는 글자/낱말 자료 1개 출력', '헷갈린 글자 1개만 메모']],
      ['funmom-wed-math', '수: 수학 수/연산 한 장 출력', '수학공부 카테고리에서 수 세기나 쉬운 연산 자료 한 장을 고릅니다.', 2, ['수학공부 카테고리 열기', '수/연산 자료 1개 출력', '오답이 많으면 다음 주에 같은 난이도로 표시']],
      ['funmom-thu-english', '목: 영어 알파벳/단어 한 장 출력', '영어공부 카테고리에서 알파벳이나 단어 자료 한 장을 고릅니다.', 3, ['영어공부 카테고리 열기', '알파벳/단어 자료 1개 출력', '읽은 단어 1개와 어려운 단어 1개 메모']],
      ['funmom-fri-maze', '금: 미로찾기나 선긋기 한 장 출력', '미로찾기 카테고리에서 집중 놀이 자료 한 장을 고릅니다.', 4, ['미로찾기 카테고리 열기', '미로/선긋기 자료 1개 출력', '혼자 끝냈는지 도움을 받았는지 표시']],
      ['funmom-sat-review', '토: 이번 주 잘 맞은 자료 저장', '이번 주 출력물 중 아이가 잘 따라간 자료만 다음 주 후보로 남깁니다.', 5, ['완료한 출력물 훑어보기', '잘 맞은 자료 URL 1~2개 저장', '다음 주 난이도: 쉬움/유지/올림 중 하나 표시']],
    ].map(([id, title, description, dayOffset, how], order): CuratedStep => ({
      id: String(id),
      sectionId: 'funmom-week',
      title: String(title),
      description: String(description),
      order,
      type: 'calendar' as const,
      dayOffset: Number(dayOffset),
      sourceType: 'reference' as const,
      riskLevel: 'low' as const,
      why: '요일 배치는 원문 일정이 아니라 FlowMe의 검토용 구성입니다. 실행 전 개별 활동지 원문과 난이도 확인이 필요합니다.',
      how: Array.isArray(how) ? how.map(String) : [String(how)],
      doneWhen: `${String(title)} 활동과 반응 메모가 끝났습니다.`,
      sourceUrl: funmomSourceUrl,
      sourceTrace: funmomSourceTrace(String(id), String(title).replace(/^[월화수목금토]:\s*/, '')),
    })),
  ),
  bundle(
    {
      id: opicReviewFlowId,
      slug: 'curated-opic-single-mock-review',
      title: '오픽 모의고사 2주 계획표',
      description: '원문 XLSX의 2주 코스를 시작일 기준 14일 일정으로 저장합니다.',
      category: '공부/오픽',
      structure_type: 'timeline',
      anchor_type: 'start_date',
      source_title: '오픽 모의고사 공부 방법',
      source_url: opicSourceUrl,
      source_status: 'real',
      source_precision: 'exact',
      source_checked_at: '2026-06-29',
      primary_destination: 'calendar',
      risk_level: 'low',
      setup_anchor_label: '시작일',
      setup_anchor_hint: '2주 코스의 1일차입니다.',
      tags: tagMap('curated-opic-mock-course', 'study', 'mock-test', 'xlsx-two-week'),
    },
    [section(opicReviewFlowId, 'opic-two-week', '2주 계획표', 0)],
    [
      ['opic-2w-d01', '1일차: 1회차 연습', 0, '1회차', ['모의고사 재생목록에서 1회차 영상 열기', '한 회차를 끊지 말고 말하기', '오픽현타 & 보완 칸에 막힌 표현 1개 적기']],
      ['opic-2w-d02', '2일차: 2회차 연습', 1, '2회차', ['모의고사 재생목록에서 2회차 영상 열기', '한 회차를 끊지 말고 말하기', '2회차 복습 칸에 다시 말할 표현 1개 적기']],
      ['opic-2w-d03', '3일차: 3회차 연습', 2, '3회차', ['모의고사 재생목록에서 3회차 영상 열기', '한 회차를 끊지 말고 말하기', '오픽현타 & 보완 칸에 막힌 표현 1개 적기']],
      ['opic-2w-d04', '4일차: 4회차 연습', 3, '4회차', ['모의고사 재생목록에서 4회차 영상 열기', '한 회차를 끊지 말고 말하기', '4회차 복습 칸에 다시 말할 표현 1개 적기']],
      ['opic-2w-d05', '5일차: 5회차 연습', 4, '5회차', ['모의고사 재생목록에서 5회차 영상 열기', '한 회차를 끊지 말고 말하기', '오픽현타 & 보완 칸에 막힌 표현 1개 적기']],
      ['opic-2w-d06', '6일차: 1~5회차 정리', 5, '1~5회차', ['1~5회차 오픽현타 칸 훑기', '반복해서 막힌 주제 2개 표시', '보완 표현을 한 줄 답변으로 다시 말하기']],
      ['opic-2w-d07', '7일차: 휴식', 6, '휴식', ['새 회차를 추가하지 않기', '지난 6일 보완 표현만 5분 읽기', '다음 주 시작 여부만 체크']],
      ['opic-2w-d08', '8일차: 6회차 연습', 7, '6회차', ['모의고사 재생목록에서 6회차 영상 열기', '한 회차를 끊지 말고 말하기', '6회차 복습 칸에 다시 말할 표현 1개 적기']],
      ['opic-2w-d09', '9일차: 7회차 연습', 8, '7회차', ['모의고사 재생목록에서 7회차 영상 열기', '한 회차를 끊지 말고 말하기', '오픽현타 & 보완 칸에 막힌 표현 1개 적기']],
      ['opic-2w-d10', '10일차: 8회차 연습', 9, '8회차', ['모의고사 재생목록에서 8회차 영상 열기', '한 회차를 끊지 말고 말하기', '8회차 복습 칸에 다시 말할 표현 1개 적기']],
      ['opic-2w-d11', '11일차: 9회차 연습', 10, '9회차', ['모의고사 재생목록에서 9회차 영상 열기', '한 회차를 끊지 말고 말하기', '오픽현타 & 보완 칸에 막힌 표현 1개 적기']],
      ['opic-2w-d12', '12일차: 10회차 연습', 11, '10회차', ['모의고사 재생목록에서 10회차 영상 열기', '한 회차를 끊지 말고 말하기', '10회차 복습 칸에 다시 말할 표현 1개 적기']],
      ['opic-2w-d13', '13일차: 6~10회차 정리', 12, '6~10회차', ['6~10회차 오픽현타 칸 훑기', '반복해서 막힌 주제 2개 표시', '최종 보완 표현 3개를 다시 말하기']],
      ['opic-2w-d14', '14일차: 휴식', 13, '휴식', ['새 회차를 추가하지 않기', '2주간 보완 표현만 읽기', '시험 전 다시 볼 회차 1개 표시']],
    ].map(([id, title, dayOffset, roundLabel, how], order) => ({
      id: String(id),
      sectionId: 'opic-two-week',
      title: String(title),
      description: `원문 2주 계획표의 ${String(roundLabel)} 행을 실행 일정으로 옮깁니다.`,
      type: 'calendar' as const,
      dayOffset: Number(dayOffset),
      order,
      sourceType: 'creator_experience' as const,
      riskLevel: 'low' as const,
      why: '원문 XLSX는 사용자가 날짜별 계획을 다시 세우지 않도록 회차, 보완, 복습을 이미 배치합니다.',
      how: how as string[],
      doneWhen: `${String(title)}의 영상 실행과 보완 메모가 끝났습니다.`,
      sourceUrl: opicYoutubeSourceUrl,
      sourceTrace: opicSourceTrace('workbook two-week', String(id), String(roundLabel)),
    })),
  ),
  bundle(
    {
      id: opicCourseFlowId,
      slug: 'curated-opic-course-row-import',
      title: '오픽 모의고사 1달 반복 계획',
      description: '원문 XLSX의 1달 코스를 10회차 3회 반복 구조로 저장합니다.',
      category: '공부/오픽',
      structure_type: 'timeline',
      anchor_type: 'start_date',
      source_title: '오픽 모의고사 공부 방법 XLSX',
      source_url: opicSourceUrl,
      source_status: 'real',
      source_precision: 'exact',
      source_checked_at: '2026-06-29',
      primary_destination: 'hybrid',
      risk_level: 'low',
      setup_anchor_label: '시작일',
      setup_anchor_hint: '1달 코스의 1주차 시작일입니다.',
      tags: tagMap('curated-opic-mock-course', 'study', 'xlsx-one-month'),
    },
    [section(opicCourseFlowId, 'opic-one-month', '1달 반복 계획', 0)],
    [
      ['opic-1m-w1', '1주차: 1~2회차를 3번씩 반복', 0, ['1회차 연습/복습/복습', '2회차 연습/복습/복습', '일요일 휴식']],
      ['opic-1m-w2', '2주차: 3~4회차를 3번씩 반복', 7, ['3회차 연습/복습/복습', '4회차 연습/복습/복습', '일요일 휴식']],
      ['opic-1m-w3', '3주차: 5~6회차를 3번씩 반복', 14, ['5회차 연습/복습/복습', '6회차 연습/복습/복습', '일요일 휴식']],
      ['opic-1m-w4', '4주차: 7~8회차를 3번씩 반복', 21, ['7회차 연습/복습/복습', '8회차 연습/복습/복습', '일요일 휴식']],
      ['opic-1m-w5', '마무리: 9~10회차를 3번씩 반복', 28, ['9회차 연습/복습/복습', '10회차 연습/복습/복습', '시험 전 다시 볼 회차 표시']],
    ].map(([id, title, dayOffset, how], order) => ({
      id: String(id),
      sectionId: 'opic-one-month',
      title: String(title),
      description: '원문 1달 계획표의 주차 반복 구조를 캘린더와 체크 메모로 옮깁니다.',
      order,
      type: 'calendar' as const,
      dayOffset: Number(dayOffset),
      sourceType: 'creator_experience' as const,
      riskLevel: 'low' as const,
      why: '1달 코스는 10회차를 3회 반복하므로 사용자가 매일 회차를 다시 배치하지 않게 주차별 묶음으로 저장합니다.',
      how: how as string[],
      doneWhen: `${String(title)} 범위의 반복 회차와 휴식이 표시되었습니다.`,
      sourceUrl: opicYoutubeSourceUrl,
      sourceTrace: opicSourceTrace('workbook one-month', String(id), String(title)),
    })),
  ),
  bundle(
    {
      id: babyFoodDailyFlowId,
      slug: 'curated-baby-food-daily-meal-row',
      title: '오늘 이유식 식단 기록',
      description: '식단표의 오늘 항목을 먹은 양, 알레르기 O/X, 보류 메모로만 기록합니다.',
      category: '육아/이유식',
      structure_type: 'phase',
      anchor_type: 'start_date',
      source_title: 'Naver 이유식 식단표',
      source_url: babyFoodSourceUrl,
      source_status: 'needs_review',
      source_precision: 'exact',
      source_checked_at: '2026-06-29',
      primary_destination: 'sheet',
      risk_level: 'medical_sensitive',
      setup_anchor_label: '식단표 시작일',
      setup_anchor_hint: '선택한 식단표의 첫날입니다.',
      warning: '이 Flow는 제작자 식단표를 기록표로 옮깁니다. 알레르기, 분량, 시작 시기는 의료진 또는 공식 정보를 확인하세요.',
      tags: tagMap('curated-baby-food-meal-log', 'meal-log', 'sensitive'),
    },
    [section(babyFoodDailyFlowId, 'baby-food-row', '식단표 기록', 0)],
    [
      {
        id: 'baby-food-today-row',
        sectionId: 'baby-food-row',
        title: '오늘 식단표 기록',
        description: '원문 식단표의 D+n 항목을 열고 먹은 양과 알레르기 O/X만 기록합니다.',
        order: 0,
        type: 'calendar',
        dayOffset: 0,
        sourceType: 'creator_experience',
        riskLevel: 'medical_sensitive',
        why: '원문 파일의 가치는 식단표 항목과 기록 칸입니다. FlowMe가 새 식단이나 분량을 만들면 안 됩니다.',
        how: ['원문 식단표의 오늘 D+n 항목 확인', '먹은 양 기록', '알레르기 O/X와 문의 필요 여부 기록'],
        doneWhen: '오늘 식단의 먹은 양과 알레르기 O/X가 기록되었습니다.',
        caution: '증상 판단이나 재료 지속 여부는 FlowMe가 결정하지 않습니다.',
        sourceUrl: babyFoodSourceUrl,
      },
    ],
  ),
  bundle(
    {
      id: babyFoodCubeFlowId,
      slug: 'curated-baby-food-cube-stock',
      title: '이유식 큐브 재고 기록',
      description: '원문 파일의 큐브 재고표를 재료명, 남은 수량, 만든 날짜 메모로 보존합니다.',
      category: '육아/이유식',
      structure_type: 'checklist',
      anchor_type: 'none',
      source_title: 'Naver 이유식 식단표',
      source_url: babyFoodSourceUrl,
      source_status: 'needs_review',
      source_precision: 'exact',
      source_checked_at: '2026-06-29',
      primary_destination: 'sheet',
      risk_level: 'medical_sensitive',
      warning: '재고 관리는 편의 기록입니다. 보관 기간과 섭취 가능 여부는 공식/전문가 안내를 확인하세요.',
      tags: tagMap('curated-baby-food-meal-log', 'stock-sheet', 'sensitive'),
    },
    [section(babyFoodCubeFlowId, 'cube-stock', '큐브 재고', 0)],
    [
      {
        id: 'baby-food-cube-stock-row',
        sectionId: 'cube-stock',
        title: '큐브 재고 기록',
        description: '큐브 재고표에 재료명, 남은 수량, 만든 날짜만 기록합니다.',
        order: 0,
        sourceType: 'creator_experience',
        riskLevel: 'medical_sensitive',
        why: '큐브 재고표는 식단 추천이 아니라 보관 현황을 잊지 않기 위한 sheet artifact입니다.',
        how: ['재료명 적기', '남은 수량 또는 칸 수 적기', '만든 날짜와 보류 메모만 남기기'],
        doneWhen: '큐브 재고가 업데이트되었습니다.',
        caution: '보관 가능 기간이나 섭취 판단은 FlowMe가 하지 않습니다.',
        sourceUrl: babyFoodSourceUrl,
      },
    ],
  ),
  bundle(
    {
      id: readingFlowId,
      slug: 'curated-reading-monthly-log',
      title: '월 4권 독서 기록 루틴',
      description: '월초 책 4권을 정하고 매주 한 권씩 읽기, 중간 메모, 완료 기록, 월말 합계를 진행합니다.',
      category: '독서/기록',
      structure_type: 'timeline',
      anchor_type: 'start_date',
      source_title: '독서 기록 Naver blog',
      source_url: readingSourceUrl,
      source_status: 'real',
      source_precision: 'exact',
      source_checked_at: '2026-06-29',
      primary_destination: 'hybrid',
      risk_level: 'low',
      setup_anchor_label: '이번 달 시작일',
      setup_anchor_hint: '월초 또는 독서 루틴을 시작할 날짜입니다.',
      tags: tagMap('curated-reading-routine-log', 'reading-log', 'monthly-plan'),
    },
    [section(readingFlowId, 'reading-month', '월간 독서 루틴', 0)],
    [
      ['reading-month-pick-four', '1일차: 이번 달 책 4권 고르기', 0, ['읽을 책 4권 제목 적기', '종이책/전자책/도서관 위치 표시', '1주차에 읽을 책 1권만 체크']],
      ['reading-week1-start', '1주차 시작: 1권 읽기 시작', 1, ['첫 책 30분 읽기', '읽은 페이지 또는 챕터 표시', '읽기 어려우면 교체 후보 표시']],
      ['reading-week1-note', '1주차 중간: 기억할 문장 남기기', 3, ['기억할 문장 1개 적기', '왜 남겼는지 한 줄 메모', '끝낼 날짜 유지/변경 표시']],
      ['reading-week1-finish', '1주차 마감: 1권 기록 완료', 6, ['책 제목과 완료일 적기', '한 줄 감상 적기', '다음 책으로 넘어가기']],
      ['reading-week2-finish', '2주차: 2권 기록 완료', 13, ['두 번째 책 완료일 적기', '한 줄 감상 적기', '못 끝냈으면 다음 주로 넘김 표시']],
      ['reading-week3-finish', '3주차: 3권 기록 완료', 20, ['세 번째 책 완료일 적기', '한 줄 감상 적기', '다음 달에 이어 읽을 책 표시']],
      ['reading-week4-finish', '4주차: 4권 기록 완료', 27, ['네 번째 책 완료일 적기', '한 줄 감상 적기', '이번 달 가장 좋았던 책 1권 표시']],
      ['reading-monthly-count', '월말: 완료 권수 합계', 29, ['완료한 책 권수 세기', '다음 달로 넘길 책 표시', '다음 달 후보 1권만 미리 적기']],
    ].map(([id, title, dayOffset, how], order) => ({
      id: String(id),
      sectionId: 'reading-month',
      title: String(title),
      description: '독서 기록을 매주 한 권씩 진행하도록 캘린더와 기록표에 옮깁니다.',
      order,
      type: 'calendar' as const,
      dayOffset: Number(dayOffset),
      sourceType: 'creator_experience' as const,
      riskLevel: 'low' as const,
      why: '기록만 남기면 사용자가 루틴을 직접 설계해야 하므로 월간 실행 cadence를 먼저 둡니다.',
      how: how as string[],
      doneWhen: `${String(title)} 기록이 남았습니다.`,
      sourceUrl: readingSourceUrl,
      sourceTrace: `Naver reading log article ${readingSourceUrl} - monthly four-book reading record step: ${String(title)}`,
    })),
  ),
  bundle(
    {
      id: newCarFlowId,
      slug: 'curated-new-car-basic',
      title: '신차 구매 기본형',
      description: '신차 구매 절차를 7단계 체크리스트와 견적 메모로 저장합니다.',
      category: '차량/구매',
      structure_type: 'checklist',
      anchor_type: 'none',
      source_title: 'Getcha 신차 구매 절차 참고 가이드',
      source_url: newCarSourceUrl,
      source_status: 'real',
      source_precision: 'exact',
      source_checked_at: '2026-07-12',
      primary_destination: 'internal_check',
      risk_level: 'financial_sensitive',
      warning:
        '구매 방식, 가격, 보험 보장을 추천하지 않습니다. 계약 조건은 판매자와 계약서로, 등록과 의무보험은 현재 공식 안내와 실제 접수 조건으로 다시 확인하세요.',
      updated_at: reviewedNow,
      tags: tagMap('curated-new-car-purchase-guide', 'car', 'purchase-checklist'),
    },
    [section(newCarFlowId, 'new-car-steps', '구매 절차', 0)],
    [
      ['new-car-budget-model', '예산과 차량 선택', '예산 범위와 후보 차량을 적습니다.', ['예산 범위', '후보 차량', '필수 조건'], '예산과 후보 차량이 기록되었습니다.'],
      ['new-car-purchase-method', '구매 방식 비교 메모', '현금, 할부, 리스, 장기렌트의 실제 제안 조건을 나란히 적습니다.', ['비교할 방식', '각 제안의 총비용과 조건', '확인할 내용'], '비교할 방식과 확인할 조건을 적었습니다.'],
      ['new-car-quotes-negotiation', '견적과 협상 메모', '받은 견적을 비교표로 기록합니다.', ['딜러/채널', '견적 링크 또는 메모', '포함 조건', '추가 문의'], '비교할 견적이 기록되었습니다.'],
      ['new-car-contract', '계약 확인', '계약 전 확인할 자료와 남은 문의를 기록합니다.', ['계약서 확인', '계약금 여부', '남은 문의'], '계약 관련 확인 상태가 기록되었습니다.'],
      ['new-car-delivery-inspection', '출고와 검수', '출고 일정과 검수 확인 상태를 남깁니다.', ['출고 예정일', '검수 확인', '인수 보류 여부'], '출고/검수 상태가 기록되었습니다.'],
      ['new-car-registration', '신규등록 확인', '등록 주체와 실제 접수 조건을 공식 안내에서 확인하고 진행 상태를 기록합니다.', ['등록 주체와 진행 여부', '필요 서류 공식 안내 확인', '등록 완료 확인'], '공식 안내를 확인하고 등록 진행 상태를 기록했습니다.'],
      ['new-car-insurance', '의무보험 확인', '의무보험 가입 여부와 보장 시작일을 공식 안내와 실제 가입 조건으로 확인합니다.', ['의무보험 가입 여부', '보장 시작일', '가입 조건 확인 메모'], '의무보험 가입 상태와 시작일을 확인했습니다.'],
    ].map(([id, title, description, how, doneWhen], order) => ({
      id: String(id),
      sectionId: 'new-car-steps',
      title: String(title),
      description: String(description),
      order,
      sourceType:
        id === 'new-car-registration' || id === 'new-car-insurance' ? ('official' as const) : ('reference' as const),
      riskLevel: 'financial_sensitive' as const,
      sourceUrl:
        id === 'new-car-registration'
          ? newCarRegistrationSourceUrl
          : id === 'new-car-insurance'
            ? newCarInsuranceSourceUrl
            : newCarSourceUrl,
      sourceLabel:
        id === 'new-car-registration'
          ? '공식 신규등록 안내'
          : id === 'new-car-insurance'
            ? '공식 의무보험 안내'
            : '구매 절차 참고 원문',
      linkType:
        id === 'new-car-registration' || id === 'new-car-insurance' ? ('official' as const) : ('reference' as const),
      why:
        id === 'new-car-registration'
          ? '신규등록 여부와 구비서류는 현재 생활법령 안내를 기준으로 확인하고 진행 상태만 남깁니다.'
          : id === 'new-car-insurance'
            ? '자동차 보유자의 의무보험 가입 여부는 현재 생활법령 안내와 실제 가입 조건으로 확인합니다.'
            : 'Getcha 원문은 신차 구매 순서를 참고하는 자료이며 FlowMe는 비교할 조건과 확인 상태만 남깁니다.',
      how: how as string[],
      doneWhen: String(doneWhen),
      caution: '고정 비율, 금액, 기한을 일반화하거나 상품·가격·법적·재무 판단을 대신하지 않습니다.',
      sourceTrace:
        id === 'new-car-registration'
          ? newCarSourceTrace(String(id), newCarRegistrationSourceUrl, 'EasyLaw official new vehicle registration guidance')
          : id === 'new-car-insurance'
            ? newCarSourceTrace(String(id), newCarInsuranceSourceUrl, 'EasyLaw official compulsory automobile insurance guidance')
            : newCarSourceTrace(String(id)),
    })),
  ),
  bundle(
    {
      id: vaccinationFirstYearFlowId,
      slug: 'curated-child-vaccination-first-year',
      title: '출생~12개월 예방접종 확인',
      description: '공식 예방접종표의 출생~12개월 항목을 아이 생년월일 기준 확인 일정으로 저장합니다.',
      category: '육아/건강',
      structure_type: 'timeline',
      anchor_type: 'baby_birth_date',
      source_title: 'KHMS 영유아 예방접종',
      source_url: vaccinationSourceUrl,
      source_status: 'real',
      source_precision: 'exact',
      source_checked_at: '2026-06-29',
      primary_destination: 'calendar',
      risk_level: 'medical_sensitive',
      setup_anchor_label: '아이 생년월일',
      setup_anchor_hint: '생년월일 기준 월령별 공식표 항목을 계산합니다.',
      warning: '접종 가능 여부, 금기, 지연 접종 일정은 의료기관과 공식 채널에서 확인하세요.',
      tags: tagMap('curated-child-vaccination-schedule', 'vaccination', 'official', 'sensitive'),
    },
    [section(vaccinationFirstYearFlowId, 'vaccination-first-year', '첫해 공식표', 0)],
    [
      ['vaccination-birth-4w', '출생~4주 접종 확인', 0, undefined, ['B형간염 1차', 'BCG 1회', '병원/보건소 확인']],
      ['vaccination-1m', '1개월 접종 확인', 30, undefined, ['B형간염 2차', '병원/보건소 확인']],
      ['vaccination-2m', '2개월 접종 확인', 61, undefined, ['DTaP 1차', 'IPV 1차', 'Hib 1차', 'PCV 1차', 'RV 1차']],
      ['vaccination-4m', '4개월 접종 확인', 122, undefined, ['DTaP 2차', 'IPV 2차', 'Hib 2차', 'PCV 2차', 'RV 2차']],
      ['vaccination-6m', '6개월 접종 확인', 183, undefined, ['B형간염 3차', 'DTaP 3차', 'IPV 3차', 'Hib 3차', 'PCV 3차', 'RV 3차']],
      ['vaccination-12m', '12~15개월 접종 확인', 365, { label: '12~15개월', start_day_offset: 365, end_day_offset: 456 }, ['MMR 1차', '수두 1차', 'HepA 1차', 'Hib/PCV 추가', '일본뇌염 일정 확인']],
    ].map(([id, title, dayOffset, dateWindow, how], order) => ({
      id: String(id),
      sectionId: 'vaccination-first-year',
      title: String(title),
      description: '공식 예방접종표의 해당 월령 항목을 열고 병원/보건소 확인 상태만 남깁니다.',
      order,
      type: 'calendar' as const,
      dayOffset: Number(dayOffset),
      dateWindow: dateWindow as FlowItem['date_window'],
      sourceType: 'official' as const,
      riskLevel: 'medical_sensitive' as const,
      why: '의료 판단 없이 공식표의 월령 항목을 확인 일정으로 옮깁니다.',
      how: how as string[],
      doneWhen: `${String(title)} 확인 상태가 기록되었습니다.`,
      caution: '접종 가능 여부와 지연 접종은 의료기관에서 확인합니다.',
      sourceUrl: vaccinationSourceUrl,
      sourceTrace: childVaccinationSourceTrace(String(id), String(title)),
      linkType: 'official' as const,
    })),
  ),
  bundle(
    {
      id: vaccinationBoosterFlowId,
      slug: 'curated-child-vaccination-booster-school-age',
      title: '추가접종과 학령기 일정',
      description: '공식 예방접종표의 추가접종과 학령기 항목을 확인 일정으로 저장합니다.',
      category: '육아/건강',
      structure_type: 'timeline',
      anchor_type: 'baby_birth_date',
      source_title: 'KHMS 영유아 예방접종',
      source_url: vaccinationSourceUrl,
      source_status: 'real',
      source_precision: 'exact',
      source_checked_at: '2026-06-29',
      primary_destination: 'calendar',
      risk_level: 'medical_sensitive',
      setup_anchor_label: '아이 생년월일',
      setup_anchor_hint: '생년월일 기준 월령/연령별 공식표 항목을 계산합니다.',
      warning: '접종 가능 여부, 금기, 지연 접종 일정은 의료기관과 공식 채널에서 확인하세요.',
      tags: tagMap('curated-child-vaccination-schedule', 'vaccination', 'official', 'sensitive'),
    },
    [section(vaccinationBoosterFlowId, 'vaccination-booster', '추가접종 공식표', 0)],
    [
      ['vaccination-15-18m', '15~18개월 추가접종 확인', 456, { label: '15~18개월', start_day_offset: 456, end_day_offset: 548 }, ['DTaP 4차', 'Hib 추가', 'PCV 추가']],
      ['vaccination-24-35m', '24~35개월 추가접종 확인', 730, { label: '24~35개월', start_day_offset: 730, end_day_offset: 1065 }, ['일본뇌염 추가 일정 확인', '병원/보건소 확인']],
      ['vaccination-4-6y', '4~6세 추가접종 확인', 1460, { label: '4~6세', start_day_offset: 1460, end_day_offset: 2190 }, ['DTaP 5차', 'IPV 4차', 'MMR 2차', '일본뇌염 추가']],
      ['vaccination-11-12y', '11~12세 접종 확인', 4015, { label: '11~12세', start_day_offset: 4015, end_day_offset: 4745 }, ['Tdap/Td', 'HPV 대상 여부 확인', '일본뇌염 추가']],
    ].map(([id, title, dayOffset, dateWindow, how], order) => ({
      id: String(id),
      sectionId: 'vaccination-booster',
      title: String(title),
      description: '공식 예방접종표의 해당 월령/연령 항목을 열고 확인 상태만 남깁니다.',
      order,
      type: 'calendar' as const,
      dayOffset: Number(dayOffset),
      dateWindow: dateWindow as FlowItem['date_window'],
      sourceType: 'official' as const,
      riskLevel: 'medical_sensitive' as const,
      why: '추가접종 항목은 긴 기간 범위가 있으므로 한 개 일정과 공식 기간 메모로만 저장합니다.',
      how: how as string[],
      doneWhen: `${String(title)} 확인 상태가 기록되었습니다.`,
      caution: '접종 가능 여부와 지연 접종은 의료기관에서 확인합니다.',
      sourceUrl: vaccinationSourceUrl,
      sourceTrace: childVaccinationSourceTrace(String(id), String(title)),
      linkType: 'official' as const,
    })),
  ),
  bundle(
    {
      id: movingFlowId,
      slug: 'curated-ajd-moving-d30',
      title: '이사 D-30 준비',
      description: 'AJD 원문 체크리스트를 이사일 기준 D-30부터 D-Day까지 다섯 개 확인 일정으로 저장합니다.',
      category: '이사',
      structure_type: 'timeline',
      anchor_type: 'end_date',
      source_title: 'AJD 이사 준비 체크리스트',
      source_url: movingSourceUrl,
      source_status: 'real',
      source_precision: 'exact',
      source_checked_at: '2026-06-29',
      primary_destination: 'hybrid',
      risk_level: 'medium',
      setup_anchor_label: '이사일',
      setup_anchor_hint: '이사일 기준으로 D-day 일정을 계산합니다.',
      tags: tagMap('curated-ajd-moving-d30', 'moving', 'd-day'),
    },
    [
      section(movingFlowId, 'moving-d30', 'D-30', 0),
      section(movingFlowId, 'moving-d10', 'D-10', 1),
      section(movingFlowId, 'moving-d3', 'D-3', 2),
      section(movingFlowId, 'moving-d1', 'D-1', 3),
      section(movingFlowId, 'moving-dday', 'D-Day', 4),
    ],
    [
      ['moving-d30-method-quotes', 'moving-d30', 'D-30: 이사 방식과 견적 예약', -30, ['이사 방식 확인', '견적 후보 메모', '업체 연락처 메모']],
      ['moving-d10-address-admin', 'moving-d10', 'D-10: 주소 변경과 예약 상태 확인', -10, ['주소 변경 대상 확인', '자동이체 확인', '이사 예약 상태 확인']],
      ['moving-d3-equipment-docs', 'moving-d3', 'D-3: 장비와 서류 확인', -3, ['장비/준비물 확인', '필요 서류 확인', '문의 필요한 항목 표시']],
      ['moving-d1-final-check', 'moving-d1', 'D-1: 최종 점검', -1, ['짐/귀중품 확인', '요금/폐기물 확인', '이사 당일 연락처 확인']],
      ['moving-dday-settlement', 'moving-dday', 'D-Day: 정산과 전입 관련 확인', 0, ['정산 확인', '전입 관련 확인', '현장 보류 사항 메모']],
    ].map(([id, sectionId, title, dayOffset, how], order) => ({
      id: String(id),
      sectionId: String(sectionId),
      title: String(title),
      description: '원문 D-day 체크리스트의 해당 구간을 확인합니다.',
      order,
      type: 'calendar' as const,
      dayOffset: Number(dayOffset),
      sourceType: 'reference' as const,
      riskLevel: 'medium' as const,
      why: '이사 체크리스트는 날짜 기준으로 놓치기 쉬운 생활/행정 항목을 나누는 것이 자연스럽습니다.',
      how: how as string[],
      doneWhen: `${String(title)} 상태가 기록되었습니다.`,
      sourceUrl: movingSourceUrl,
      sourceTrace: movingSourceTrace(String(id)),
    })),
  ),
  bundle(
    {
      id: weddingNaverFlowId,
      slug: 'curated-wedding-naver-timeline',
      title: '결혼 준비 1년 타임라인',
      description: 'Naver 원문 타임라인을 결혼식 날짜 기준 D-month 일정으로 저장합니다.',
      category: '결혼',
      structure_type: 'timeline',
      anchor_type: 'end_date',
      source_title: 'Naver 결혼 준비 타임라인',
      source_url: weddingNaverSourceUrl,
      source_status: 'real',
      source_precision: 'exact',
      source_checked_at: '2026-06-29',
      primary_destination: 'hybrid',
      risk_level: 'medium',
      setup_anchor_label: '결혼식 날짜',
      setup_anchor_hint: '결혼식 날짜 기준으로 D-month 일정을 계산합니다.',
      tags: tagMap('curated-wedding-checklist-family', 'wedding', 'timeline'),
    },
    [section(weddingNaverFlowId, 'wedding-naver-periods', '기간별 준비', 0)],
    [
      ['wedding-naver-d12', 'D-12개월: 예산과 웨딩홀 후보 정하기', -365, ['예산 범위 적기', '웨딩홀 후보 2~3곳 적기', '상견례/양가 일정 보류 여부 표시']],
      ['wedding-naver-d10', 'D-10개월: 스드메와 촬영 후보 잡기', -304, ['스튜디오/드레스/메이크업 후보 적기', '상담 또는 예약 메모', '비교가 필요한 항목 표시']],
      ['wedding-naver-d7', 'D-7개월: 신혼여행과 예물 후보 정리', -213, ['신혼여행 후보지 적기', '예물/예복 확인 메모', '결정 전 남은 문의 표시']],
      ['wedding-naver-d6', 'D-6개월: 촬영과 본식 준비 확정', -182, ['촬영 일정 확인', '본식 스냅/영상 후보 메모', '확정/보류 상태 표시']],
      ['wedding-naver-d3', 'D-3개월: 청첩장과 식순 준비', -91, ['청첩장 발송 대상 확인', '식순/사회자/축가 메모', '남은 문의 표시']],
      ['wedding-naver-d1', 'D-1개월: 최종 인원과 당일 동선 확인', -30, ['최종 인원 확인', '당일 동선/연락처 메모', '당일 문의 표시']],
    ].map(([id, title, dayOffset, how], order) => ({
      id: String(id),
      sectionId: 'wedding-naver-periods',
      title: String(title),
      description: '기간별 준비 대상을 정하고 업체/보류 메모를 남깁니다.',
      order,
      type: 'calendar' as const,
      dayOffset: Number(dayOffset),
      sourceType: 'creator_experience' as const,
      riskLevel: 'medium' as const,
      why: '결혼 준비 타임라인은 결혼식 날짜 기준의 준비 구간을 보존할 때 실행성이 생깁니다.',
      how: how as string[],
      doneWhen: `${String(title)} 메모가 남았습니다.`,
      sourceUrl: weddingNaverSourceUrl,
      sourceTrace: weddingNaverSourceTrace(String(id), String(title)),
    })),
  ),
  bundle(
    {
      id: weddingGongysdFlowId,
      slug: 'curated-wedding-gongysd-atoz',
      title: '결혼 준비 A-to-Z',
      description: 'Gongysd 원문 카테고리를 웨딩홀, 상견례, 플래너, 스드메 준비표로 저장합니다.',
      category: '결혼',
      structure_type: 'checklist',
      anchor_type: 'none',
      source_title: '공여사들 결혼 준비 체크리스트',
      source_url: weddingGongysdSourceUrl,
      source_status: 'real',
      source_precision: 'exact',
      source_checked_at: '2026-06-29',
      primary_destination: 'sheet',
      risk_level: 'medium',
      tags: tagMap('curated-wedding-checklist-family', 'wedding', 'atoz'),
    },
    [section(weddingGongysdFlowId, 'wedding-gongysd-categories', 'A-to-Z 카테고리', 0)],
    [
      ['wedding-gongysd-venue', '웨딩홀 확인', ['후보', '견적/예약 메모', '완료/보류 상태']],
      ['wedding-gongysd-family-meeting', '상견례 확인', ['일정 메모', '장소 메모', '완료/보류 상태']],
      ['wedding-gongysd-planner', '플래너 확인', ['후보', '상담 메모', '완료/보류 상태']],
      ['wedding-gongysd-studio-dress-makeup', '스드메 확인', ['스튜디오', '드레스', '메이크업', '완료/보류 상태']],
    ].map(([id, title, how], order) => ({
      id: String(id),
      sectionId: 'wedding-gongysd-categories',
      title: String(title),
      description: 'A-to-Z 체크리스트의 해당 카테고리를 준비표에 남깁니다.',
      order,
      sourceType: 'creator_experience' as const,
      riskLevel: 'medium' as const,
      why: 'Gongysd 원문은 카테고리형 체크리스트라 결혼식 날짜보다 준비표가 더 자연스럽습니다.',
      how: how as string[],
      doneWhen: `${String(title)} 상태가 기록되었습니다.`,
      sourceUrl: weddingGongysdSourceUrl,
      sourceTrace: weddingGongysdSourceTrace(String(id), String(title)),
    })),
  ),
  bundle(
    {
      id: allblancMorningFlowId,
      slug: 'curated-allblanc-morning-workout',
      title: 'Allblanc 아침 5분 홈트',
      description: 'Allblanc 아침 5분 운동 영상을 내가 고른 요일의 루틴으로 저장합니다.',
      category: '운동/홈트',
      structure_type: 'routine',
      anchor_type: 'start_date',
      source_title: 'Allblanc 매일 아침 5분 전신 운동 영상',
      source_url: allblancMorningWorkoutUrl,
      source_status: 'real',
      source_precision: 'exact',
      source_published_at: '2020-03-26',
      source_checked_at: '2026-07-12',
      conversion_note: '영상 제목과 실행 링크만 옮기고, 반복 요일은 개인 캘린더 설정으로 분리했습니다.',
      updated_at: reviewedNow,
      primary_destination: 'calendar',
      risk_level: 'medical_sensitive',
      setup_anchor_label: '시작일',
      setup_anchor_hint: '영상을 처음 열 날입니다. 체크된 요일은 원문 처방이 아니라 저장 예시이므로 직접 바꿉니다.',
      warning: '영상은 일반 운동 콘텐츠입니다. 평소 운동하지 않았거나 만성질환·장애가 있으면 알맞은 운동 종류와 양을 전문가에게 먼저 확인하세요. 통증, 어지러움, 호흡 문제가 생기면 중단하세요.',
      tags: tagMap('curated-allblanc-workout-park', 'workout', 'exact-video', 'schedule-user-choice'),
    },
    [section(allblancMorningFlowId, 'allblanc-morning', '반복 실행', 0)],
    [
      {
        id: 'allblanc-morning-run',
        sectionId: 'allblanc-morning',
        title: '아침 5분 전신 운동 영상 열기',
        description: '원본 영상을 열고 내 일정과 몸 상태에 맞을 때 실행 여부를 기록합니다.',
        order: 0,
        type: 'calendar',
        dayOffset: 0,
        repeatRule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
        sourceType: 'creator_experience',
        riskLevel: 'medical_sensitive',
        why: '영상 1개를 개인 캘린더에서 다시 여는 실행 단위로 사용합니다.',
        how: ['영상: 5 MIN HOME WORKOUT YOU CAN DO EVERY MORNING', `URL: ${allblancMorningWorkoutUrl}`, '요약: 아침 5분 전신 홈트'],
        doneWhen: '아침 5분 홈트 완료 또는 중단 상태가 기록되었습니다.',
        caution: '영상에 없는 칼로리·감량 효과·개인 운동 처방은 만들지 않으며, 반복 요일은 사용자가 정합니다. 게시일은 원문 정보에서 따로 확인할 수 있습니다.',
        sourceUrl: allblancMorningWorkoutUrl,
        sourceLabel: '원본 운동 영상',
        additionalLinks: [{ label: '운동 시작 전 공식 안내', url: physicalActivitySafetySourceUrl, type: 'official' }],
        sourceTrace: allblancSourceTrace(allblancMorningWorkoutUrl, 'allblanc-morning-run', '5 MIN HOME WORKOUT YOU CAN DO EVERY MORNING'),
        linkType: 'creator',
      },
    ],
  ),
  bundle(
    {
      id: allblancNoJumpFlowId,
      slug: 'curated-allblanc-no-jump-cardio',
      title: 'Allblanc 노점프 유산소',
      description: 'Allblanc 점프 없는 10분 전신 운동 영상을 내가 고른 요일의 루틴으로 저장합니다.',
      category: '운동/홈트',
      structure_type: 'routine',
      anchor_type: 'start_date',
      source_title: 'Allblanc 점프 없는 10분 전신 운동 영상',
      source_url: allblancNoJumpWorkoutUrl,
      source_status: 'real',
      source_precision: 'exact',
      source_published_at: '2021-06-23',
      source_checked_at: '2026-07-12',
      conversion_note: '영상의 점프 없는 전신 운동이라는 범위만 옮기고, 감량 문구와 반복 처방은 가져오지 않았습니다.',
      updated_at: reviewedNow,
      primary_destination: 'calendar',
      risk_level: 'medical_sensitive',
      setup_anchor_label: '시작일',
      setup_anchor_hint: '영상을 처음 열 날입니다. 체크된 요일은 원문 처방이 아니라 저장 예시이므로 직접 바꿉니다.',
      warning: '점프가 없다는 제목만으로 모든 사람에게 낮은 강도라는 뜻은 아닙니다. 평소 운동하지 않았거나 만성질환·장애가 있으면 알맞은 운동 종류와 양을 전문가에게 먼저 확인하고, 통증·어지러움·호흡 문제가 생기면 중단하세요.',
      tags: tagMap('curated-allblanc-workout-park', 'workout', 'exact-video', 'schedule-user-choice'),
    },
    [section(allblancNoJumpFlowId, 'allblanc-no-jump', '반복 실행', 0)],
    [
      {
        id: 'allblanc-no-jump-run',
        sectionId: 'allblanc-no-jump',
        title: '점프 없는 10분 전신 운동 영상 열기',
        description: '점프 동작이 없는 원본 영상을 열고 내 일정과 몸 상태에 맞을 때 실행 여부를 기록합니다.',
        order: 0,
        type: 'calendar',
        dayOffset: 1,
        repeatRule: 'FREQ=WEEKLY;BYDAY=TU,TH',
        sourceType: 'creator_experience',
        riskLevel: 'medical_sensitive',
        why: '정확한 영상 URL을 개인 캘린더에서 다시 여는 실행 단위로 사용합니다.',
        how: ['영상: NO JUMPING CARDIO WORKOUT', `URL: ${allblancNoJumpWorkoutUrl}`, '요약: 점프 동작이 없는 10분 전신 운동'],
        doneWhen: '노점프 유산소 완료 또는 중단 상태가 기록되었습니다.',
        caution: '제목의 감량 홍보 문구를 실행 효과로 보장하지 않으며, 반복 요일은 사용자가 정합니다. 게시일은 원문 정보에서 따로 확인할 수 있습니다.',
        sourceUrl: allblancNoJumpWorkoutUrl,
        sourceLabel: '원본 운동 영상',
        additionalLinks: [{ label: '운동 시작 전 공식 안내', url: physicalActivitySafetySourceUrl, type: 'official' }],
        sourceTrace: allblancSourceTrace(allblancNoJumpWorkoutUrl, 'allblanc-no-jump-run', 'NO JUMPING CARDIO WORKOUT'),
        linkType: 'creator',
      },
    ],
  ),
  bundle(
    {
      id: allblancLowerBodyFlowId,
      slug: 'curated-allblanc-lower-body',
      title: 'Allblanc 고강도 하체 홈트',
      description: 'Allblanc 10분 고강도 하체 운동 영상을 내가 고른 요일의 루틴으로 저장합니다.',
      category: '운동/홈트',
      structure_type: 'routine',
      anchor_type: 'start_date',
      source_title: 'Allblanc 10분 고강도 하체 운동 영상',
      source_url: allblancLowerBodyWorkoutUrl,
      source_status: 'real',
      source_precision: 'exact',
      source_published_at: '2023-02-21',
      source_checked_at: '2026-07-12',
      conversion_note: '영상이 고강도임을 숨기지 않고, 동작 링크와 개인 반복 일정만 옮겼습니다.',
      updated_at: reviewedNow,
      primary_destination: 'calendar',
      risk_level: 'medical_sensitive',
      setup_anchor_label: '시작일',
      setup_anchor_hint: '영상을 처음 열 날입니다. 체크된 요일은 원문 처방이 아니라 저장 예시이므로 직접 바꿉니다.',
      warning: '원문이 고강도 하체 운동으로 표시된 영상입니다. 평소 운동하지 않았거나 만성질환·장애가 있거나 고강도 운동이 걱정되면 시작 전 전문가에게 알맞은 운동 종류와 양을 확인하세요. 통증·어지러움·호흡 문제가 생기면 중단하세요.',
      tags: tagMap('curated-allblanc-workout-park', 'workout', 'exact-video', 'schedule-user-choice', 'high-intensity'),
    },
    [section(allblancLowerBodyFlowId, 'allblanc-lower-body', '반복 실행', 0)],
    [
      {
        id: 'allblanc-lower-body-run',
        sectionId: 'allblanc-lower-body',
        title: '10분 고강도 하체 운동 영상 열기',
        description: '고강도 하체 운동 원본을 열고 내 일정과 몸 상태에 맞을 때 실행 여부를 기록합니다.',
        order: 0,
        type: 'calendar',
        dayOffset: 5,
        repeatRule: 'FREQ=WEEKLY;BYDAY=SA',
        sourceType: 'creator_experience',
        riskLevel: 'medical_sensitive',
        why: '정확한 영상 URL과 강도 정보를 확인한 뒤 개인 캘린더에서 다시 여는 실행 단위로 사용합니다.',
        how: ['영상: 10 MIN LEGENDARY LOWER BODY WORKOUT', `URL: ${allblancLowerBodyWorkoutUrl}`, '요약: 10분 고강도 하체 운동'],
        doneWhen: '하체 홈트 완료 또는 중단 상태가 기록되었습니다.',
        caution: '고강도 영상의 개인 적합성이나 효과를 보장하지 않으며, 반복 요일은 사용자가 정합니다. 게시일은 원문 정보에서 따로 확인할 수 있습니다.',
        sourceUrl: allblancLowerBodyWorkoutUrl,
        sourceLabel: '원본 운동 영상',
        additionalLinks: [{ label: '운동 시작 전 공식 안내', url: physicalActivitySafetySourceUrl, type: 'official' }],
        sourceTrace: allblancSourceTrace(allblancLowerBodyWorkoutUrl, 'allblanc-lower-body-run', 'Allblanc lower body workout'),
        linkType: 'creator',
      },
    ],
  ),
];
