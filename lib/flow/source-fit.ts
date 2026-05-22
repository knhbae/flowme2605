export type SourceFitDecision =
  | 'keep_representative'
  | 'reshape_before_featured'
  | 'catalog_preview_only'
  | 'hide_from_public_catalog';

export type SourcePrecisionForAudit = 'exact' | 'broad' | 'mismatch';

export type SourceFitScores = {
  actionDensity: number;
  temporalStructure: number;
  externalManagementNeed: number;
  completionClarity: number;
  personalizationNeed: number;
  returnValue: number;
  sourceSpecificityTrust: number;
  riskBoundaryClarity: number;
};

export type SourceFitAudit = {
  slug: string;
  checkedAt: string;
  sourceTitle: string;
  sourceUrl: string;
  sourcePrecision: SourcePrecisionForAudit;
  sourceUsefulness: string;
  idealReconstruction: string;
  userJourney: string[];
  currentGap: string;
  contentAction: string;
  uxAction: string;
  scores: SourceFitScores;
  score: number;
  decision: SourceFitDecision;
};

export const sourceFitDimensionMax: SourceFitScores = {
  actionDensity: 15,
  temporalStructure: 15,
  externalManagementNeed: 20,
  completionClarity: 15,
  personalizationNeed: 10,
  returnValue: 10,
  sourceSpecificityTrust: 10,
  riskBoundaryClarity: 5,
};

function clampScore(value: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(max, Math.round(value)));
}

export function scoreSourceFit(scores: SourceFitScores): number {
  return (Object.keys(sourceFitDimensionMax) as (keyof SourceFitScores)[]).reduce(
    (sum, key) => sum + clampScore(scores[key], sourceFitDimensionMax[key]),
    0,
  );
}

export function getSourceFitDecision(score: number): SourceFitDecision {
  if (score >= 80) return 'keep_representative';
  if (score >= 60) return 'reshape_before_featured';
  if (score >= 40) return 'catalog_preview_only';
  return 'hide_from_public_catalog';
}

function defineAudit(
  audit: Omit<SourceFitAudit, 'score' | 'decision'> & { decision?: SourceFitDecision },
): SourceFitAudit {
  const score = scoreSourceFit(audit.scores);
  return {
    ...audit,
    score,
    decision: audit.decision ?? getSourceFitDecision(score),
  };
}

export const sourceFitAudits: SourceFitAudit[] = [
  defineAudit({
    slug: 'moving-d30-basic',
    checkedAt: '2026-05-22',
    sourceTitle: '이사 준비 체크리스트 완벽정리! (엑셀 Xls, PDF, 노션 notion 첨부)',
    sourceUrl:
      'https://www.ajd.co.kr/contents/basic-tip/detail/이사_준비_체크리스트_완벽정리!_엑셀_Xls_PDF_노션_notion_첨부-23363',
    sourcePrecision: 'exact',
    sourceUsefulness: '원본 자체가 D-30, D-10, D-3, D-Day 표와 Excel/PDF/Notion 산출물을 제공해 FLOW화 필요가 매우 높다.',
    idealReconstruction: '이사일 입력 후 D-day 일정, 전체 체크리스트, 월별 달력, 메모, 스프레드시트 백업으로 재구성한다.',
    userJourney: [
      '블로그에서 이사 체크리스트를 본다.',
      'FLOW에서 이사일을 입력한다.',
      'D-day별 할 일을 전체 목록과 달력으로 확인한다.',
      '업체, 행정, 하자 메모를 남기고 엑셀/캘린더로 가져간다.',
    ],
    currentGap: '항목 대부분은 잘 잡혔지만 상세 설명이 일부 항목에만 있어 신뢰 밀도가 고르지 않다.',
    contentAction: '남은 핵심 항목에 why/how/completion을 순차 보강한다.',
    uxAction: '월별 달력과 전체 리스트를 첫 화면에서 더 강하게 노출한다.',
    scores: {
      actionDensity: 15,
      temporalStructure: 15,
      externalManagementNeed: 20,
      completionClarity: 15,
      personalizationNeed: 10,
      returnValue: 10,
      sourceSpecificityTrust: 10,
      riskBoundaryClarity: 5,
    },
  }),
  defineAudit({
    slug: 'wedding-d180-basic',
    checkedAt: '2026-05-22',
    sourceTitle: '오프린트미 결혼식 준비 체크리스트',
    sourceUrl: 'https://www.ohprint.me/blog/wedding-checklist',
    sourcePrecision: 'exact',
    sourceUsefulness: '결혼 준비는 장기간 일정, 업체 비교, 예산, 하객, 청첩장처럼 관리 대상이 많아 FLOW 적합성이 높다.',
    idealReconstruction: '예식일을 기준으로 D-day 일정, 업체/예산 비교표, 청첩장/하객 체크, 월별 달력으로 재구성한다.',
    userJourney: [
      '원본 체크리스트에서 결혼 준비 큰 그림을 본다.',
      'FLOW에서 예식일과 준비 범위를 입력한다.',
      '웨딩홀, 스드메, 청첩장, 본식 준비를 월별로 본다.',
      '업체 후보와 예산 메모를 비교표/엑셀로 관리한다.',
    ],
    currentGap: '현재 Flow는 일정은 있으나 업체/예산/하객 같은 decision 정보를 담는 표면이 부족하다.',
    contentAction: '항목을 일정형과 비교/결정형으로 분리하고 후보 비교 기준을 추가한다.',
    uxAction: '결혼 Flow에 월별 달력과 비교표를 함께 노출한다.',
    scores: {
      actionDensity: 14,
      temporalStructure: 15,
      externalManagementNeed: 20,
      completionClarity: 14,
      personalizationNeed: 10,
      returnValue: 10,
      sourceSpecificityTrust: 9,
      riskBoundaryClarity: 4,
    },
  }),
  defineAudit({
    slug: 'baby-food-menu-recipe',
    checkedAt: '2026-05-22',
    sourceTitle: '초기이유식 식단표 공유',
    sourceUrl: 'https://kimstar1021.tistory.com/63',
    sourcePrecision: 'exact',
    sourceUsefulness: '원본은 식단표, 날짜 입력 가능성, 재료 순서, 레시피, 알레르기 관찰을 포함해 FLOW화 가치가 높다.',
    idealReconstruction: '시작일 기준 식단 달력, 재료별 레시피, 반응 기록, 공식/주의 정보로 재구성한다.',
    userJourney: [
      '블로그 식단표와 레시피를 본다.',
      'FLOW에서 이유식 시작일을 입력한다.',
      '날짜별 메뉴와 새 재료를 확인한다.',
      '아기 반응을 기록하고 다음 재료를 조정한다.',
    ],
    currentGap: '식단표와 기록 기능은 맞지만 건강/영양 공식 안내 보강이 필요하다.',
    contentAction: '개인 경험 레시피와 공식/의료 주의 문구를 더 명확히 분리한다.',
    uxAction: '반응 기록과 다음 재료 확인을 달력과 함께 보여준다.',
    scores: {
      actionDensity: 14,
      temporalStructure: 15,
      externalManagementNeed: 20,
      completionClarity: 13,
      personalizationNeed: 10,
      returnValue: 10,
      sourceSpecificityTrust: 8,
      riskBoundaryClarity: 3,
    },
  }),
  defineAudit({
    slug: 'english-study-30day-routine',
    checkedAt: '2026-05-22',
    sourceTitle: '영어공부 혼자하기 — 직장인 30일 독학 루틴',
    sourceUrl: 'https://www.new1eng.com/blog/adult-english-30day-self-study',
    sourcePrecision: 'exact',
    sourceUsefulness: '원본은 30일 루틴, 주차별 목표, 매일 실행 시간, 자가 점검 기준이 있어 루틴 Flow에 잘 맞는다.',
    idealReconstruction: '시작일과 요일을 받아 4주 루틴, 일일 세션, 주차별 자가 점검, 월별 달력으로 재구성한다.',
    userJourney: [
      '영어 독학 루틴 글을 읽는다.',
      'FLOW에서 시작일과 학습 요일을 정한다.',
      '출퇴근/점심/저녁 학습 블록을 달력에서 본다.',
      '주차별 자기 점검과 다음 달 목표를 기록한다.',
    ],
    currentGap: '현재 구조는 적절하지만 루틴 회차와 월별 달력의 시각적 기대를 더 강화해야 한다.',
    contentAction: '주차별 점검 기준을 항목 상세와 export에 더 명확히 넣는다.',
    uxAction: '루틴 월간 캘린더와 반복 요일 설정을 첫 화면에서 노출한다.',
    scores: {
      actionDensity: 13,
      temporalStructure: 14,
      externalManagementNeed: 18,
      completionClarity: 14,
      personalizationNeed: 9,
      returnValue: 10,
      sourceSpecificityTrust: 9,
      riskBoundaryClarity: 4,
    },
  }),
  defineAudit({
    slug: 'used-car-buying-check',
    checkedAt: '2026-05-22',
    sourceTitle: '중고차 구매 체크리스트 완벽 가이드',
    sourceUrl: 'https://www.drive-insight.net/posts/used-car-buying-checklist-ko/',
    sourcePrecision: 'exact',
    sourceUsefulness: '원본은 구매 전 조사, 방문 준비, 현장 검사, 계약 전 확인이 단계화되어 있어 체크리스트와 비교표에 적합하다.',
    idealReconstruction: '차량 후보별 비교표, 현장 체크리스트, 증거 사진/메모, 계약 전 확인표로 재구성한다.',
    userJourney: [
      '중고차 구매 가이드를 읽고 후보 차량을 찾는다.',
      'FLOW에서 후보 차량을 추가한다.',
      '현장 방문 때 외부, 엔진, 주행, 서류 항목을 체크한다.',
      '후보별 점수와 메모를 엑셀로 내보내 결정한다.',
    ],
    currentGap: '체크리스트는 강하지만 후보별 비교와 증거 메모가 더 중심에 와야 한다.',
    contentAction: '차량 후보, 정비소 검수, 사고/서류 확인 항목을 비교 기준으로 구조화한다.',
    uxAction: 'decision Flow의 비교표와 체크리스트를 같은 화면에서 연결한다.',
    scores: {
      actionDensity: 15,
      temporalStructure: 8,
      externalManagementNeed: 18,
      completionClarity: 15,
      personalizationNeed: 10,
      returnValue: 9,
      sourceSpecificityTrust: 9,
      riskBoundaryClarity: 4,
    },
  }),
  defineAudit({
    slug: 'car-care-monthly-routine',
    checkedAt: '2026-05-22',
    sourceTitle: '타이어 공기압 TPMS·블랙박스 셀프정비 2026 완벽 체크리스트',
    sourceUrl: 'https://gnsl0879.tistory.com/717',
    sourcePrecision: 'exact',
    sourceUsefulness: '원본은 반복 점검 주기, 장비, 난이도, 계절별 관리가 있어 차량 관리 루틴으로 바꾸기 좋다.',
    idealReconstruction: '월 1회/계절별 점검 캘린더, 도구 목록, 정상/주의 신호, 정비소 방문 트리거로 재구성한다.',
    userJourney: [
      '셀프정비 글을 읽고 점검 항목을 추린다.',
      'FLOW에서 관리 시작일과 월간 반복일을 정한다.',
      '월별 달력에서 타이어, 와이퍼, 필터, 배터리 점검일을 본다.',
      '이상 신호는 정비소 방문 메모로 남긴다.',
    ],
    currentGap: 'DIY 절약 주장과 사용자가 직접 해도 되는 범위가 섞일 위험이 있다.',
    contentAction: '점검, 교체, 정비소 상담 트리거를 분리한다.',
    uxAction: '루틴 달력에 주기와 주의 항목을 함께 표시한다.',
    scores: {
      actionDensity: 14,
      temporalStructure: 10,
      externalManagementNeed: 18,
      completionClarity: 12,
      personalizationNeed: 8,
      returnValue: 8,
      sourceSpecificityTrust: 6,
      riskBoundaryClarity: 3,
    },
  }),
  defineAudit({
    slug: 'home-workout-20min',
    checkedAt: '2026-05-22',
    sourceTitle: 'ThankyouBUBU 홈트 루틴 콘텐츠 참고',
    sourceUrl: 'https://www.youtube.com/@ThankyouBUBU',
    sourcePrecision: 'broad',
    sourceUsefulness: '홈트 루틴은 캘린더 반복과 체크가 필요하지만 현재 source는 채널 페이지라 정확한 운동 세션과 1:1로 매칭되지 않는다.',
    idealReconstruction: '정확한 운동 영상 URL을 기준으로 시작일, 반복 요일, 세션 체크, 몸 상태 기록으로 재구성한다.',
    userJourney: [
      '홈트 영상을 본다.',
      'FLOW에서 시작일과 운동 요일을 정한다.',
      '월간 달력에서 운동일을 보고 알림/캘린더에 넣는다.',
      '운동 후 완료와 통증/어지러움 여부를 기록한다.',
    ],
    currentGap: '루틴 자체는 유효하지만 원본이 exact video가 아니어서 진입 맥락 확인이 약하다.',
    contentAction: '대표 Flow는 exact video 또는 playlist source로 교체한다.',
    uxAction: '요일 선택과 월간 루틴 미리보기를 첫 화면에서 강화한다.',
    scores: {
      actionDensity: 12,
      temporalStructure: 12,
      externalManagementNeed: 17,
      completionClarity: 12,
      personalizationNeed: 8,
      returnValue: 8,
      sourceSpecificityTrust: 4,
      riskBoundaryClarity: 3,
    },
  }),
  defineAudit({
    slug: 'overseas-travel-d14',
    checkedAt: '2026-05-22',
    sourceTitle: '외교부·여권안내·공항 반입 규정 참고',
    sourceUrl: 'https://passport.go.kr/home/kor/contents.do?menuPos=48',
    sourcePrecision: 'broad',
    sourceUsefulness: '출국 준비는 D-day 일정과 체크리스트 가치가 크지만 현재 대표 URL은 여권 범위만 직접 커버한다.',
    idealReconstruction: '여권, 비자/입국 조건, 여행경보, 보험, 공항 보안, 짐 목록을 복수 공식 출처로 재구성한다.',
    userJourney: [
      '여행 준비 글이나 공식 안내를 본다.',
      'FLOW에서 출국일을 입력한다.',
      'D-14, D-7, D-3, D-1, D-Day 체크를 달력으로 본다.',
      '캘린더와 메모로 가져가고 공식 링크를 다시 확인한다.',
    ],
    currentGap: 'Flow 범위가 단일 여권 URL보다 넓어 source card가 신뢰 범위를 충분히 설명하지 못한다.',
    contentAction: '복수 공식 source card와 항목별 공식 링크를 추가한다.',
    uxAction: '출처별 적용 범위를 카드에서 분리 표시한다.',
    scores: {
      actionDensity: 12,
      temporalStructure: 14,
      externalManagementNeed: 18,
      completionClarity: 11,
      personalizationNeed: 8,
      returnValue: 7,
      sourceSpecificityTrust: 3,
      riskBoundaryClarity: 3,
    },
  }),
  defineAudit({
    slug: 'running-5k-4week',
    checkedAt: '2026-05-22',
    sourceTitle: '런데이',
    sourceUrl: 'https://www.runday.co.kr/',
    sourcePrecision: 'broad',
    sourceUsefulness: '초보 러닝 프로그램은 반복 세션과 회복 규칙이 있어 FLOW 가치가 높지만 현재 source는 홈페이지라 4주 5km 계획의 직접 근거가 약하다.',
    idealReconstruction: '정확한 4주 프로그램 source를 기준으로 주차별 세션, 휴식일, missed-session rule, 월간 캘린더로 재구성한다.',
    userJourney: [
      '초보 러닝 프로그램을 본다.',
      'FLOW에서 시작일과 달리는 요일을 정한다.',
      '월간 달력에서 세션과 휴식일을 본다.',
      '놓친 날은 다음 세션부터 재개한다.',
    ],
    currentGap: '실행 UX는 맞지만 source precision이 낮아 대표 Flow로는 근거가 약하다.',
    contentAction: 'exact 4-week training source 또는 FLOW-created sample 표시를 선택한다.',
    uxAction: '프로그램 세션, 휴식, missed-session rule을 달력 위에 명확히 보여준다.',
    scores: {
      actionDensity: 12,
      temporalStructure: 12,
      externalManagementNeed: 17,
      completionClarity: 11,
      personalizationNeed: 8,
      returnValue: 9,
      sourceSpecificityTrust: 3,
      riskBoundaryClarity: 3,
    },
  }),
  defineAudit({
    slug: 'study-exam-d30-plan',
    checkedAt: '2026-05-22',
    sourceTitle: '집에서 영어 공부 효과를 높이는 10가지 팁',
    sourceUrl: 'https://englishfact.com/ko/10-tips-to-enhance-english-study-at-home/',
    sourcePrecision: 'mismatch',
    sourceUsefulness: '원본은 영어 학습 팁과 루틴 조언은 담고 있지만 시험 D-30 계획의 직접 출처가 아니다.',
    idealReconstruction: '시험 Flow라면 시험일, 범위, 챕터, 기출 회독, 모의고사, 준비물로 재구성해야 한다.',
    userJourney: [
      '시험 준비 글이나 강의 계획을 본다.',
      'FLOW에서 시험일과 과목/챕터를 입력한다.',
      'D-30부터 주차별 학습과 모의고사를 달력에 배치한다.',
      '오답과 복습을 체크하고 시험 전 준비물을 확인한다.',
    ],
    currentGap: '제목, Flow 구조, 원본 source가 서로 맞지 않는다.',
    contentAction: '시험 D-30 source로 교체하거나 영어 루틴 Flow로 이름과 구조를 바꾼다.',
    uxAction: '공개 대표 노출 전에 source/title mismatch 경고를 Flow Lab에서 표시한다.',
    scores: {
      actionDensity: 8,
      temporalStructure: 8,
      externalManagementNeed: 14,
      completionClarity: 8,
      personalizationNeed: 7,
      returnValue: 7,
      sourceSpecificityTrust: 2,
      riskBoundaryClarity: 3,
    },
  }),
];

export function getSourceFitAudit(slug: string): SourceFitAudit | undefined {
  return sourceFitAudits.find((audit) => audit.slug === slug);
}

export function getSourceFitSummary() {
  const decisionCounts = sourceFitAudits.reduce(
    (counts, audit) => ({
      ...counts,
      [audit.decision]: counts[audit.decision] + 1,
    }),
    {
      keep_representative: 0,
      reshape_before_featured: 0,
      catalog_preview_only: 0,
      hide_from_public_catalog: 0,
    } satisfies Record<SourceFitDecision, number>,
  );

  return {
    auditedCount: sourceFitAudits.length,
    averageScore: Math.round(
      sourceFitAudits.reduce((sum, audit) => sum + audit.score, 0) / Math.max(sourceFitAudits.length, 1),
    ),
    decisionCounts,
  };
}

