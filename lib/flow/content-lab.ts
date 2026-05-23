import { AnchorType, FlowBundle, StructureType } from './types';
import { getSourceFitSummary } from './source-fit';
import { summarizeContentInventory } from './content-inventory';
import { summarizeNaturalArtifactAuditCoverage } from './natural-artifact-audit';
import { summarizeFlowLifecycle } from './content-lifecycle';

export type ExternalTarget = 'calendar' | 'todo' | 'notion' | 'sheet';

export type SourceKind = 'video' | 'channel' | 'article' | 'official' | 'community';

export type CreatorSource = {
  flowSlug: string;
  creatorName: string;
  sourceTitle: string;
  sourceUrl: string;
  sourceKind: SourceKind;
};

export type FlowCandidate = {
  id: string;
  title: string;
  category: string;
  structure_type: StructureType;
  anchor_type: AnchorType;
  source_angle: string;
  sourceTitle: string;
  sourceUrl: string;
  externalTargets: ExternalTarget[];
  hasClearCompletion: boolean;
  repeatDemand: 'low' | 'medium' | 'high';
  risk: 'low' | 'medium' | 'sensitive';
};

export type PilotCreatorLab = {
  id: string;
  name: string;
  creatorUrl: string;
  thesis: string;
  managementQuestion: string;
  flowSlugs: string[];
  sources: CreatorSource[];
};

export type ExpansionCreatorLab = {
  id: string;
  name: string;
  creatorUrl: string;
  category: string;
  thesis: string;
  candidates: FlowCandidate[];
};

const pilotSources: Record<string, CreatorSource[]> = {
  'pilot-auto-life': [
    {
      flowSlug: 'used-car-buying-check',
      creatorName: '닥신TV',
      sourceTitle: '중고차 구매 체크 콘텐츠',
      sourceUrl: 'https://www.youtube.com/results?search_query=%EB%8B%A5%EC%8B%A0TV+%EC%A4%91%EA%B3%A0%EC%B0%A8+%EA%B5%AC%EB%A7%A4',
      sourceKind: 'channel',
    },
    {
      flowSlug: 'new-car-delivery-check',
      creatorName: '픽플러스',
      sourceTitle: '신차 인수와 차량 점검 콘텐츠',
      sourceUrl: 'https://www.youtube.com/results?search_query=%ED%94%BD%ED%94%8C%EB%9F%AC%EC%8A%A4+%EC%8B%A0%EC%B0%A8+%EC%9D%B8%EC%88%98+%EC%A0%90%EA%B2%80',
      sourceKind: 'channel',
    },
    {
      flowSlug: 'car-care-monthly-routine',
      creatorName: '카닥',
      sourceTitle: '차량 관리와 정비 가이드 콘텐츠',
      sourceUrl: 'https://www.cardoc.co.kr/',
      sourceKind: 'article',
    },
    {
      flowSlug: 'driver-license-renewal-check',
      creatorName: '도로교통공단 안전운전 통합민원',
      sourceTitle: '운전면허 갱신 공식 절차',
      sourceUrl: 'https://www.safedriving.or.kr/',
      sourceKind: 'official',
    },
  ],
  'pilot-health-routine': [
    {
      flowSlug: 'home-workout-20min',
      creatorName: 'ThankyouBUBU',
      sourceTitle: '층간소음 적은 홈트 루틴 콘텐츠',
      sourceUrl: 'https://www.youtube.com/@ThankyouBUBU',
      sourceKind: 'channel',
    },
    {
      flowSlug: 'running-5k-4week',
      creatorName: '런데이',
      sourceTitle: '초보 러닝 훈련 콘텐츠',
      sourceUrl: 'https://www.runday.co.kr/',
      sourceKind: 'article',
    },
    {
      flowSlug: 'diet-habit-2week',
      creatorName: '핏블리 FITVELY',
      sourceTitle: '다이어트와 운동 루틴 콘텐츠',
      sourceUrl: 'https://www.fitvely.com/',
      sourceKind: 'channel',
    },
    {
      flowSlug: 'national-health-checkup-d7',
      creatorName: '국민건강보험',
      sourceTitle: '국가건강검진 공식 안내',
      sourceUrl: 'https://www.nhis.or.kr/',
      sourceKind: 'official',
    },
  ],
  'pilot-study-admin': [
    {
      flowSlug: 'study-exam-d30-plan',
      creatorName: '다산에듀',
      sourceTitle: '전기기사 학습 커리큘럼 콘텐츠',
      sourceUrl: 'https://www.dasanelectric.com/',
      sourceKind: 'channel',
    },
    {
      flowSlug: 'english-study-30day-routine',
      creatorName: '라이브아카데미',
      sourceTitle: '영어 학습 루틴 콘텐츠',
      sourceUrl: 'https://www.youtube.com/results?search_query=%EB%9D%BC%EC%9D%B4%EB%B8%8C%EC%95%84%EC%B9%B4%EB%8D%B0%EB%AF%B8+%EC%98%81%EC%96%B4+%EB%A3%A8%ED%8B%B4',
      sourceKind: 'channel',
    },
    {
      flowSlug: 'passport-renewal-docs',
      creatorName: '외교부 여권안내',
      sourceTitle: '여권 재발급 공식 절차',
      sourceUrl: 'https://www.passport.go.kr/',
      sourceKind: 'official',
    },
    {
      flowSlug: 'year-end-tax-docs',
      creatorName: '국세청 홈택스',
      sourceTitle: '연말정산 공식 안내',
      sourceUrl: 'https://www.hometax.go.kr/',
      sourceKind: 'official',
    },
  ],
};

export const pilotCreatorLabs: PilotCreatorLab[] = [
  {
    id: 'pilot-auto-life',
    name: '자동차 생활 소스 그룹',
    creatorUrl: 'https://www.youtube.com/results?search_query=%EB%8B%A5%EC%8B%A0TV+%ED%94%BD%ED%94%8C%EB%9F%AC%EC%8A%A4+%EC%98%A4%ED%86%A0%EA%B8%B0%EC%96%B4',
    thesis: '구매, 인수, 정비, 면허처럼 자동차 생활의 반복 결정을 실행 루트로 묶을 수 있는지 검증한다.',
    managementQuestion: '차량 생애주기별 Flow를 한 제작자 포트폴리오처럼 관리할 수 있는가.',
    flowSlugs: [
      'used-car-buying-check',
      'new-car-delivery-check',
      'car-care-monthly-routine',
      'driver-license-renewal-check',
    ],
    sources: pilotSources['pilot-auto-life'],
  },
  {
    id: 'pilot-health-routine',
    name: '운동·다이어트 소스 그룹',
    creatorUrl: 'https://www.youtube.com/results?search_query=ThankyouBUBU+%ED%95%8F%EB%B8%94%EB%A6%AC+%EB%B9%85%EC%94%A8%EC%8A%A4',
    thesis: '운동과 식단 콘텐츠가 캘린더, 투두, 기록 시트로 옮겨져 반복 실행되는지 검증한다.',
    managementQuestion: '강도와 기간이 다른 루틴 Flow를 버전 상품처럼 관리할 수 있는가.',
    flowSlugs: [
      'home-workout-20min',
      'running-5k-4week',
      'diet-habit-2week',
      'national-health-checkup-d7',
    ],
    sources: pilotSources['pilot-health-routine'],
  },
  {
    id: 'pilot-study-admin',
    name: '시험·행정 소스 그룹',
    creatorUrl: 'https://www.youtube.com/results?search_query=%EB%8B%A4%EC%82%B0%EC%97%90%EB%93%80+%ED%9D%A5%EB%8B%AC%EC%8C%A4+%EC%8B%9C%EB%82%98%EA%B3%B5',
    thesis: '마감일, 발급 절차, 서류 준비 콘텐츠를 하나의 실행 패키지로 전환하는지 검증한다.',
    managementQuestion: '시험 준비 Flow와 생활 행정 Flow를 마감일 기준으로 관리할 수 있는가.',
    flowSlugs: [
      'study-exam-d30-plan',
      'english-study-30day-routine',
      'passport-renewal-docs',
      'year-end-tax-docs',
    ],
    sources: pilotSources['pilot-study-admin'],
  },
];

export const convertedPilotSlugs = [
  'samsung-aircon-seasonal-check',
  'samsung-washer-filter-cleaning',
  'vehicle-inspection-prep',
  'driver-license-renewal-check',
  'home-workout-20min',
  'running-5k-4week',
  'qnet-exam-application-prep',
  'computer-skills-d30-study',
  'diet-meal-exercise-log',
  'diet-reset-2week',
] as const;

const sourceProfiles = [
  {
    category: '가전관리',
    name: '삼성전자서비스',
    creatorUrl: 'https://www.samsungsvc.co.kr/',
    thesis: '제품별 청소, 필터, 점검 안내를 주기형 관리 Flow로 전환한다.',
  },
  {
    category: '자동차',
    name: '닥신TV',
    creatorUrl: 'https://www.youtube.com/results?search_query=%EB%8B%A5%EC%8B%A0TV+%EC%9E%90%EB%8F%99%EC%B0%A8',
    thesis: '구매 판단과 유지관리 체크리스트를 차량 생애주기 Flow로 묶는다.',
  },
  {
    category: '운동',
    name: 'ThankyouBUBU',
    creatorUrl: 'https://www.youtube.com/@ThankyouBUBU',
    thesis: '홈트 영상형 콘텐츠를 날짜, 반복, 완료 기준이 있는 루틴 Flow로 바꾼다.',
  },
  {
    category: '자격증/시험',
    name: '시나공',
    creatorUrl: 'https://www.sinagong.co.kr/',
    thesis: '교재와 강좌 기반 학습 순서를 시험일 역산형 Flow로 검증한다.',
  },
  {
    category: '다이어트',
    name: '핏블리 FITVELY',
    creatorUrl: 'https://www.fitvely.com/',
    thesis: '운동, 식단, 기록 습관을 2주에서 4주 단위 실행 Flow로 관리한다.',
  },
  {
    category: '생활행정',
    name: '정부24',
    creatorUrl: 'https://www.gov.kr/',
    thesis: '민원, 발급, 신고 절차를 누락 없는 서류 체크 Flow로 전환한다.',
  },
  {
    category: '육아',
    name: '임신육아종합포털 아이사랑',
    creatorUrl: 'https://www.childcare.go.kr/',
    thesis: '월령별 준비와 기관 신청 절차를 보호자 실행 Flow로 정리한다.',
  },
  {
    category: '반려동물',
    name: '설채현 수의사 콘텐츠',
    creatorUrl: 'https://www.youtube.com/results?search_query=%EC%84%A4%EC%B1%84%ED%98%84+%EB%B0%98%EB%A0%A4%EB%8F%99%EB%AC%BC',
    thesis: '행동교정, 건강관리, 방문 준비 콘텐츠를 체크리스트와 루틴으로 나눈다.',
  },
  {
    category: '이사/주거',
    name: '오늘의집',
    creatorUrl: 'https://ohou.se/',
    thesis: '이사 준비, 수납, 주거 관리 콘텐츠를 D-day와 반복 관리 Flow로 검증한다.',
  },
  {
    category: '여행',
    name: '여행에미치다',
    creatorUrl: 'https://www.instagram.com/travelholic_insta/',
    thesis: '여행 준비물, 예약, 현지 실행 콘텐츠를 출발일 기준 Flow로 전환한다.',
  },
];

const topicTemplates = [
  ['월간 점검 루틴', 'routine', 'start_date', '반복 점검과 기록을 만드는 콘텐츠'],
  ['D-30 준비 플랜', 'timeline', 'end_date', '마감일 기준으로 역산 가능한 콘텐츠'],
  ['초보자 시작 체크', 'checklist', 'none', '처음 시작할 때 필요한 항목을 정리한 콘텐츠'],
  ['4주 적응 루틴', 'routine', 'start_date', '반복 주기와 강도 조절이 있는 콘텐츠'],
  ['구매 전 확인표', 'checklist', 'none', '돈이 들어가기 전 비교와 확인이 필요한 콘텐츠'],
  ['방문 전 준비 Flow', 'timeline', 'end_date', '예약일 또는 방문일 기준으로 준비하는 콘텐츠'],
  ['문제 발생 대응 순서', 'checklist', 'none', '문제 발생 후 순서대로 처리해야 하는 콘텐츠'],
  ['계절 전환 관리', 'routine', 'start_date', '계절마다 반복되는 관리 콘텐츠'],
  ['서류/도구 준비표', 'checklist', 'none', '필요 물품과 제출물을 빠짐없이 모으는 콘텐츠'],
  ['D-Day 당일 체크', 'timeline', 'end_date', '당일 전후 확인이 중요한 콘텐츠'],
  ['기록 템플릿', 'routine', 'start_date', '일지와 측정값이 쌓이는 콘텐츠'],
  ['2주 리셋 플랜', 'routine', 'start_date', '짧은 기간에 습관을 교정하는 콘텐츠'],
  ['비용 비교 체크', 'checklist', 'none', '선택지와 비용을 비교하는 콘텐츠'],
  ['초급-중급 단계표', 'phase', 'start_date', '훈련이나 학습 단계가 나뉘는 콘텐츠'],
  ['주간 반복 캘린더', 'routine', 'start_date', '요일별 반복 실행이 필요한 콘텐츠'],
  ['실패 방지 체크', 'checklist', 'none', '실수와 누락을 줄이는 콘텐츠'],
  ['공식 정보 확인 루트', 'checklist', 'none', '공식 출처와 경험담 분리가 필요한 콘텐츠'],
  ['가족/동료 공유표', 'checklist', 'none', '여러 사람이 함께 확인해야 하는 콘텐츠'],
  ['30일 누적 루틴', 'routine', 'start_date', '성과가 누적되는 콘텐츠'],
  ['마감 후 정리 플랜', 'timeline', 'end_date', '마감 이후 후속 작업이 있는 콘텐츠'],
] as const;

function riskFor(category: string): FlowCandidate['risk'] {
  if (['다이어트', '육아', '생활행정'].includes(category)) return 'sensitive';
  if (['자동차', '자격증/시험', '여행'].includes(category)) return 'medium';
  return 'low';
}

function externalTargetsFor(structure: StructureType): ExternalTarget[] {
  if (structure === 'timeline') return ['calendar', 'todo', 'notion', 'sheet'];
  if (structure === 'routine') return ['calendar', 'todo', 'sheet', 'notion'];
  if (structure === 'phase') return ['todo', 'notion', 'sheet'];
  return ['todo', 'notion', 'sheet'];
}

export const expansionCreatorLabs: ExpansionCreatorLab[] = sourceProfiles.map((profile, creatorIndex) => ({
  id: `scale-${creatorIndex + 1}`,
  name: profile.name,
  creatorUrl: profile.creatorUrl,
  category: profile.category,
  thesis: profile.thesis,
  candidates: topicTemplates.map(([suffix, structure, anchor, sourceAngle], topicIndex) => ({
    id: `scale-${creatorIndex + 1}-flow-${topicIndex + 1}`,
    title: `${profile.category} ${suffix}`,
    category: profile.category,
    structure_type: structure as StructureType,
    anchor_type: anchor as AnchorType,
    source_angle: `${profile.name} 소스 기반: ${sourceAngle}`,
    sourceTitle: `${profile.name} - ${profile.category} ${suffix}`,
    sourceUrl: profile.creatorUrl,
    externalTargets: externalTargetsFor(structure as StructureType),
    hasClearCompletion: true,
    repeatDemand: topicIndex % 5 === 0 ? 'medium' : 'high',
    risk: riskFor(profile.category),
  })),
}));

export function scoreCandidate(candidate: FlowCandidate): number {
  let score = 0;
  score += candidate.hasClearCompletion ? 25 : 0;
  score += candidate.anchor_type !== 'none' ? 20 : 12;
  score += candidate.externalTargets.includes('calendar') ? 15 : 0;
  score += candidate.externalTargets.includes('todo') ? 15 : 0;
  score += candidate.externalTargets.includes('notion') || candidate.externalTargets.includes('sheet') ? 15 : 0;
  score += candidate.repeatDemand === 'high' ? 10 : candidate.repeatDemand === 'medium' ? 6 : 2;
  score -= candidate.risk === 'sensitive' ? 5 : 0;
  return Math.max(0, Math.min(100, score));
}

export function getContentLabSummary(bundles: FlowBundle[]) {
  const slugs = new Set(bundles.map((bundle) => bundle.flow.slug));
  const pilotSlugs = pilotCreatorLabs.flatMap((creator) => creator.flowSlugs);
  const convertedPilotSlugList = convertedPilotSlugs as readonly string[];
  const convertedPilotBundles = bundles.filter((bundle) => convertedPilotSlugList.includes(bundle.flow.slug));
  const expansionCandidates = expansionCreatorLabs.flatMap((creator) => creator.candidates);
  const previewGeneratedBundles = bundles.filter((bundle) => bundle.flow.id.startsWith('flow-preview-'));
  const realSourceBundles = bundles.filter((bundle) => bundle.flow.source_status === 'real');
  const sourceFitSummary = getSourceFitSummary();
  const inventorySummary = summarizeContentInventory(bundles);
  const naturalArtifactSummary = summarizeNaturalArtifactAuditCoverage(bundles);
  const lifecycleSummary = summarizeFlowLifecycle(bundles);

  return {
    pilotCreatorCount: pilotCreatorLabs.length,
    pilotFlowCount: pilotSlugs.length,
    missingPilotFlowSlugs: pilotSlugs.filter((slug) => !slugs.has(slug)),
    convertedPilotFlowCount: convertedPilotSlugs.length,
    missingConvertedPilotSlugs: convertedPilotSlugs.filter((slug) => !slugs.has(slug)),
    convertedPilotCategories: Array.from(new Set(convertedPilotBundles.map((bundle) => bundle.flow.category))).sort(),
    realSourceFlowCount: realSourceBundles.length,
    previewGeneratedFlowCount: previewGeneratedBundles.length,
    expansionCreatorCount: expansionCreatorLabs.length,
    expansionCandidateCount: expansionCandidates.length,
    structureCoverage: Array.from(new Set(expansionCandidates.map((candidate) => candidate.structure_type))).sort(),
    categoryCoverage: Array.from(new Set(expansionCandidates.map((candidate) => candidate.category))).sort(),
    averageCandidateScore:
      Math.round(
        expansionCandidates.reduce((sum, candidate) => sum + scoreCandidate(candidate), 0) /
          Math.max(expansionCandidates.length, 1),
      ),
    sourceFitAuditedCount: sourceFitSummary.auditedCount,
    sourceFitAverageScore: sourceFitSummary.averageScore,
    sourceFitDecisionCounts: sourceFitSummary.decisionCounts,
    inventoryTotalCount: inventorySummary.totalCount,
    realSourceInventoryReviewedCount: inventorySummary.realSourceReviewedCount,
    sourceBackedInventoryReviewedCount: inventorySummary.sourceBackedReviewedCount,
    manualSourceFitAuditedCount: inventorySummary.manualSourceFitCount,
    derivedRealSourceReviewedCount: inventorySummary.derivedRealSourceCount,
    previewCandidateFlowCount: inventorySummary.generatedPreviewCandidateCount,
    legacyAccessibleFlowCount: inventorySummary.legacyAccessibleCount,
    inventoryLevelCounts: inventorySummary.levelCounts,
    inventoryPublicHandlingCounts: inventorySummary.publicHandlingCounts,
    inventoryAverageDerivedScore: inventorySummary.averageDerivedScore,
    naturalArtifactRealSourceAuditedCount: naturalArtifactSummary.auditedRealSourceCount,
    naturalArtifactRealSourceRemainingCount: naturalArtifactSummary.remainingRealSourceCount,
    naturalArtifactCategoryCounts: naturalArtifactSummary.auditedCategoryCounts,
    naturalArtifactDecisionCounts: naturalArtifactSummary.decisionCounts,
    lifecycleTotalCount: lifecycleSummary.totalCount,
    lifecycleBucketCounts: lifecycleSummary.bucketCounts,
    lifecycleKeepSlugs: lifecycleSummary.keepSlugs,
    lifecycleFixSlugs: lifecycleSummary.fixSlugs,
    lifecyclePreviewOnlySlugs: lifecycleSummary.previewOnlySlugs,
    lifecycleHideSlugs: lifecycleSummary.hideSlugs,
    lifecycleRemoveCandidateSlugs: lifecycleSummary.removeCandidateSlugs,
  };
}
