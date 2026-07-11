import { getFinalPromotionQaReview } from './final-promotion-qa';
import { realSourceNaturalArtifactAudits, type NaturalArtifactAuditDecision } from './natural-artifact-audit';

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

export type NaturalArtifactKind =
  | 'checklist'
  | 'monthly_calendar'
  | 'routine_calendar'
  | 'spreadsheet'
  | 'memo'
  | 'comparison_table'
  | 'todo_list';

export type NaturalArtifactSimulation = {
  kind: NaturalArtifactKind;
  artifactTitle: string;
  simulatedInputs: string[];
  expectedOutput: string[];
  currentFlowMatch: string;
  currentUxSupport: string;
  gap: string;
};

export type SourceFitAudit = {
  slug: string;
  checkedAt: string;
  sourceTitle: string;
  sourceUrl: string;
  sourcePrecision: SourcePrecisionForAudit;
  sourceUsefulness: string;
  idealReconstruction: string;
  naturalArtifacts: NaturalArtifactSimulation[];
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
  const promotionQa = getFinalPromotionQaReview(audit.slug);
  return {
    ...audit,
    uxAction: promotionQa ? `${audit.uxAction} ${promotionQa.uxEvidence}` : audit.uxAction,
    score,
    decision: promotionQa?.sourceFitDecision ?? audit.decision ?? getSourceFitDecision(score),
  };
}

const realSourceDecisionMap: Record<NaturalArtifactAuditDecision, SourceFitDecision> = {
  promote_to_manual_source_fit: 'keep_representative',
  reshape_content_or_ux: 'reshape_before_featured',
  keep_catalog_review: 'catalog_preview_only',
  replace_or_hide_source: 'catalog_preview_only',
};

const realSourceScoreProfiles: Record<SourceFitDecision, SourceFitScores> = {
  keep_representative: {
    actionDensity: 14,
    temporalStructure: 12,
    externalManagementNeed: 17,
    completionClarity: 13,
    personalizationNeed: 8,
    returnValue: 8,
    sourceSpecificityTrust: 9,
    riskBoundaryClarity: 4,
  },
  reshape_before_featured: {
    actionDensity: 12,
    temporalStructure: 10,
    externalManagementNeed: 16,
    completionClarity: 12,
    personalizationNeed: 8,
    returnValue: 7,
    sourceSpecificityTrust: 9,
    riskBoundaryClarity: 4,
  },
  catalog_preview_only: {
    actionDensity: 9,
    temporalStructure: 6,
    externalManagementNeed: 12,
    completionClarity: 9,
    personalizationNeed: 6,
    returnValue: 5,
    sourceSpecificityTrust: 5,
    riskBoundaryClarity: 3,
  },
  hide_from_public_catalog: {
    actionDensity: 4,
    temporalStructure: 3,
    externalManagementNeed: 6,
    completionClarity: 4,
    personalizationNeed: 3,
    returnValue: 2,
    sourceSpecificityTrust: 2,
    riskBoundaryClarity: 2,
  },
};

function inferRealSourcePrecision(sourceTitle: string, sourceUrl: string): SourcePrecisionForAudit {
  const broadMarkers = ['YouTube', '공식 사이트', '채널'];
  if (broadMarkers.some((marker) => sourceTitle.includes(marker))) return 'broad';
  if (/youtube\.com\/@/.test(sourceUrl)) return 'broad';
  return 'exact';
}

function buildRealSourceIdealReconstruction(
  naturalArtifacts: SourceFitAudit['naturalArtifacts'],
): string {
  return naturalArtifacts
    .map((artifact) => `${artifact.artifactTitle}: ${artifact.expectedOutput.join(', ')}`)
    .join(' / ');
}

const realSourceManualSourceFitAudits: SourceFitAudit[] = realSourceNaturalArtifactAudits.map((audit) => {
  const decision = realSourceDecisionMap[audit.decision];
  return defineAudit({
    slug: audit.slug,
    checkedAt: '2026-05-23',
    sourceTitle: audit.sourceTitle,
    sourceUrl: audit.sourceUrl,
    sourcePrecision: inferRealSourcePrecision(audit.sourceTitle, audit.sourceUrl),
    sourceUsefulness: audit.sourceEvidence.join(' '),
    idealReconstruction: buildRealSourceIdealReconstruction(audit.naturalArtifacts),
    naturalArtifacts: audit.naturalArtifacts,
    userJourney: [
      audit.userScenario,
      ...audit.naturalArtifacts.map((artifact) => `${artifact.artifactTitle} 산출물을 만든다.`),
      'FLOW에서 체크, 메모, 기록, export로 옮긴다.',
    ],
    currentGap: `${audit.currentContentGap} ${audit.currentUxGap}`,
    contentAction: audit.nextContentAction,
    uxAction: audit.nextUxAction,
    decision,
    scores: realSourceScoreProfiles[decision],
  });
});

export const sourceFitAudits: SourceFitAudit[] = [
  defineAudit({
    slug: 'moving-d30-basic',
    checkedAt: '2026-07-11',
    sourceTitle: '이사 준비 체크리스트 완벽정리! (엑셀 Xls, PDF, 노션 notion 첨부)',
    sourceUrl:
      'https://www.ajd.co.kr/contents/basic-tip/detail/이사_준비_체크리스트_완벽정리!_엑셀_Xls_PDF_노션_notion_첨부-23363',
    sourcePrecision: 'exact',
    sourceUsefulness: '원본 자체가 D-30, D-10, D-3, D-Day 표와 Excel/PDF/Notion 산출물을 제공해 FLOW화 필요가 매우 높다.',
    idealReconstruction: '이사일 입력 후 D-day 일정, 전체 체크리스트, 월별 달력, 메모, 스프레드시트 백업으로 재구성한다.',
    naturalArtifacts: [
      {
        kind: 'monthly_calendar',
        artifactTitle: '6월 이사 준비 월간 달력',
        simulatedInputs: ['이사일=2026-06-27', '이사유형=포장이사', '입주형태=전세', '가구규모=2인 가구'],
        expectedOutput: [
          '2026-05-28 D-30 이사 방식 정하기',
          '2026-06-17 D-10 공과금/주소 이전 준비',
          '2026-06-24 D-3 냉장고/귀중품/당일 동선 점검',
          '2026-06-27 D-Day 전입·하자·잔금 확인',
        ],
        currentFlowMatch: 'D-day 항목과 날짜 계산은 대체로 맞다.',
        currentUxSupport: '월별 캘린더 preview가 약해 사용자가 산출물을 먼저 상상하기 어렵다.',
        gap: '첫 화면에서 전체 리스트는 보이지만 월간 달력 산출물이 충분히 눈에 띄지 않는다.',
      },
      {
        kind: 'spreadsheet',
        artifactTitle: '이사 준비 엑셀 체크표',
        simulatedInputs: ['이사일=2026-06-27', '업체후보=A이사/B이사', '메모=엘리베이터 예약 필요'],
        expectedOutput: ['상태, 날짜, 섹션, 할 일, 완료 기준, 업체/행정 메모, 출처 열이 있는 표'],
        currentFlowMatch: '엑셀 내보내기와 메모 필드는 방향이 맞다.',
        currentUxSupport: '내보내기 결과 미리보기가 부족해 어떤 표가 나오는지 확인하기 어렵다.',
        gap: '사용자가 실제로 인쇄하거나 공유할 표의 컬럼 preview가 필요하다.',
      },
    ],
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
    checkedAt: '2026-07-11',
    sourceTitle: '오프린트미 결혼식 준비 체크리스트',
    sourceUrl: 'https://www.ohprint.me/blog/wedding-checklist',
    sourcePrecision: 'exact',
    sourceUsefulness: '결혼 준비는 장기간 일정, 업체 비교, 예산, 하객, 청첩장처럼 관리 대상이 많아 FLOW 적합성이 높다.',
    idealReconstruction: '예식일을 기준으로 D-day 일정, 업체/예산 비교표, 청첩장/하객 체크, 월별 달력으로 재구성한다.',
    naturalArtifacts: [
      {
        kind: 'monthly_calendar',
        artifactTitle: '예식 D-180 준비 달력',
        simulatedInputs: ['예식일=2026-11-21', '예상하객=250명', '예산=4,500만원', '지역=서울'],
        expectedOutput: [
          '2026-05-25 D-180 예식일/하객 규모 확정',
          '2026-07-24 D-120 웨딩홀 후보 비교',
          '2026-09-22 D-60 청첩장/발송 명단 정리',
          '2026-11-07 D-14 잔금/본식 준비물 확인',
        ],
        currentFlowMatch: '일정형 항목은 맞지만 예산과 후보 정보가 항목 안에 충분히 구조화되지 않았다.',
        currentUxSupport: '날짜 입력과 체크는 가능하지만 비교표/예산표를 바로 만들기는 어렵다.',
        gap: '결혼 Flow는 달력만으로 부족하고 후보 비교표와 예산 메모 산출물이 필요하다.',
      },
      {
        kind: 'comparison_table',
        artifactTitle: '웨딩홀 후보 비교표',
        simulatedInputs: ['후보A=강남 A홀 300명 4,200만원', '후보B=마포 B홀 220명 3,700만원', '우선순위=교통/식대/주차'],
        expectedOutput: ['후보, 수용인원, 식대, 대관료, 교통, 주차, 장단점, 결정상태 열이 있는 표'],
        currentFlowMatch: '웨딩홀 비교 항목은 있으나 후보별 행을 관리하는 구조는 없다.',
        currentUxSupport: '현재 UX는 체크리스트 중심이라 의사결정 표를 지원하지 못한다.',
        gap: 'decision Flow UI 또는 항목별 후보 비교 입력이 필요하다.',
      },
    ],
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
    sourceUsefulness: '원본은 날짜를 직접 입력하는 식단표, 3일 단위 재료 순서, 레시피, 알레르기 관찰 단서를 포함해 FLOW화 가치가 높다.',
    idealReconstruction: '시작일 기준 식단 달력, 재료별 레시피, 가벼운 반응 메모, 공식/주의 정보로 재구성한다.',
    naturalArtifacts: [
      {
        kind: 'monthly_calendar',
        artifactTitle: '초기 이유식 14일 식단 달력',
        simulatedInputs: ['시작일=2026-06-01', '아기월령=6개월', '첫재료=쌀미음', '알레르기주의=계란 보류'],
        expectedOutput: ['6/1 쌀미음', '6/4 애호박 추가', '6/7 감자 추가', '각 재료 2~3일 반응 관찰'],
        currentFlowMatch: '식단표와 재료 순서는 맞지만 원문에서 온 3일 단위와 2단계 식단 단서가 실행 화면에서 더 보여야 한다.',
        currentUxSupport: '식단 달력이 핵심 산출물이고 반응 기록은 보조 메모로 유지해야 한다.',
        gap: '건강 민감 영역이라 주의 문구는 분리하되, 첫 화면은 반응 입력보다 식단 달력과 레시피 확인이 우선이다.',
      },
      {
        kind: 'spreadsheet',
        artifactTitle: '재료 반응 메모',
        simulatedInputs: ['날짜=2026-06-04', '재료=애호박', '섭취량=2스푼', '반응=특이 없음'],
        expectedOutput: ['날짜, 재료, 섭취량, 피부/변/수면 반응, 보호자 메모, 확인 필요 여부 열'],
        currentFlowMatch: '메모/export 방향은 맞지만 기본 화면에서 별도 표처럼 강해지면 사용자가 무겁게 느낄 수 있다.',
        currentUxSupport: '캘린더와 레시피가 먼저 보이고, 이상 반응은 메모/주의로 남기는 편이 현재 제품 방향에 맞다.',
        gap: '의료 판단처럼 보이지 않도록 반응 기록을 보조 메모로 낮추고 공식/전문가 확인을 분리해야 한다.',
      },
    ],
    userJourney: [
      '블로그 식단표와 레시피를 본다.',
      'FLOW에서 이유식 시작일을 입력한다.',
      '날짜별 메뉴와 새 재료를 확인한다.',
      '아기 반응을 기록하고 다음 재료를 조정한다.',
    ],
    currentGap: '식단표 중심 방향은 맞지만 원문에서 온 3일 단위 식단표와 2단계 식단 흐름이 더 선명해야 한다.',
    contentAction: '개인 경험 레시피와 공식/의료 주의 문구를 분리하고, 원문 식단 순서를 캘린더 슬롯으로 보존한다.',
    uxAction: '시작일 기준 식단 달력과 레시피를 먼저 보여주고, 반응 기록은 보조 메모로 둔다.',
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
    checkedAt: '2026-07-11',
    sourceTitle: '영어공부 혼자하기 — 직장인 30일 독학 루틴',
    sourceUrl: 'https://www.new1eng.com/blog/adult-english-30day-self-study',
    sourcePrecision: 'exact',
    sourceUsefulness: '원본은 30일 루틴, 주차별 목표, 매일 실행 시간, 자가 점검 기준이 있어 루틴 Flow에 잘 맞는다.',
    idealReconstruction: '시작일과 요일을 받아 4주 루틴, 일일 세션, 주차별 자가 점검, 월별 달력으로 재구성한다.',
    naturalArtifacts: [
      {
        kind: 'routine_calendar',
        artifactTitle: '직장인 영어 30일 반복 학습 달력',
        simulatedInputs: ['시작일=2026-06-03', '학습요일=월/수/금', '가능시간=출근 전 07:30', '회당시간=30분'],
        expectedOutput: ['매주 월/수/금 07:30 영어 말하기 30분', '4주차 복습/녹음 점검', '빠진 날은 다음 가능 요일로 이월'],
        currentFlowMatch: '루틴 구조는 맞지만 반복 요일을 달력에서 즉시 확인하는 경험이 약하다.',
        currentUxSupport: '체크는 가능하나 월별 반복 미리보기와 missed-session rule이 부족하다.',
        gap: '루틴은 시작일뿐 아니라 요일/시간 입력 결과가 달력에 보여야 한다.',
      },
      {
        kind: 'memo',
        artifactTitle: '주차별 영어 자기 점검 메모',
        simulatedInputs: ['1주차목표=매일 5문장 말하기', '기록방식=녹음', '약점=단어가 바로 안 나옴'],
        expectedOutput: ['주차, 말한 문장 수, 녹음 링크/메모, 막힌 표현, 다음 주 목표'],
        currentFlowMatch: '주차 목표 항목은 있으나 자기 점검 메모 구조가 약하다.',
        currentUxSupport: '항목별 메모는 가능하지만 주차별 리뷰 산출물로 보이지 않는다.',
        gap: '루틴 로그/리뷰 뷰가 필요하다.',
      },
    ],
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
    checkedAt: '2026-07-11',
    sourceTitle: '자동차365 중고차 구매가이드',
    sourceUrl: 'https://www.car365.go.kr/ccpt/schdcar/trde/prchsGuide.do?_menuId=M630401000&moblYn=Y',
    sourcePrecision: 'exact',
    sourceUsefulness: '원본은 구매 전 조사, 방문 준비, 현장 검사, 계약 전 확인이 단계화되어 있어 체크리스트와 비교표에 적합하다.',
    idealReconstruction: '차량 후보별 비교표, 현장 체크리스트, 증거 사진/메모, 계약 전 확인표로 재구성한다.',
    naturalArtifacts: [
      {
        kind: 'comparison_table',
        artifactTitle: '중고차 후보 비교표',
        simulatedInputs: ['후보A=2020 아반떼 1,450만원 6만km', '후보B=2019 K3 1,250만원 8만km', '예산상한=1,600만원'],
        expectedOutput: ['후보, 가격, 주행거리, 사고이력, 성능점검, 보험이력, 수리예상, 총점, 메모 열'],
        currentFlowMatch: '체크리스트 항목은 맞지만 후보별 비교 행이 없다.',
        currentUxSupport: '현재 UX는 현장 점검에 치우쳐 비교표 작성 기대를 충분히 지원하지 않는다.',
        gap: '구매 결정형 Flow에는 비교표가 첫 화면 가까이에 있어야 한다.',
      },
      {
        kind: 'checklist',
        artifactTitle: '방문 당일 현장 점검표',
        simulatedInputs: ['방문일=2026-06-08', '차량=2020 아반떼', '점검중점=하부/누유/타이어/서류'],
        expectedOutput: ['외관, 실내, 시동, 주행, 하부, 성능점검기록부, 보험이력, 계약 전 확인 체크리스트'],
        currentFlowMatch: '현장 체크리스트는 현재 Flow와 잘 맞는다.',
        currentUxSupport: '메모와 스킵은 가능하지만 사진/서류 증거 메모가 더 분리되어야 한다.',
        gap: '사진/서류 메모와 후보 비교 결과가 export에 함께 들어가야 한다.',
      },
    ],
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
    checkedAt: '2026-07-11',
    sourceTitle: '타이어 공기압 TPMS·블랙박스 셀프정비 2026 완벽 체크리스트',
    sourceUrl: 'https://gnsl0879.tistory.com/717',
    sourcePrecision: 'exact',
    sourceUsefulness: '원본은 반복 점검 주기, 장비, 난이도, 계절별 관리가 있어 차량 관리 루틴으로 바꾸기 좋다.',
    idealReconstruction: '월 1회/계절별 점검 캘린더, 도구 목록, 정상/주의 신호, 정비소 방문 트리거로 재구성한다.',
    naturalArtifacts: [
      {
        kind: 'routine_calendar',
        artifactTitle: '월 1회 차량 점검 달력',
        simulatedInputs: ['시작일=2026-06-01', '반복=매월 첫째 토요일', '차량=2018 싼타페', '보유도구=공기압 게이지/세차도구'],
        expectedOutput: ['매월 첫째 토요일 타이어 공기압, 블랙박스, 와이퍼, 배터리 상태 점검'],
        currentFlowMatch: '월간 루틴 방향은 맞다.',
        currentUxSupport: '반복 규칙이 달력에 박히는 preview가 부족하다.',
        gap: '루틴 주기와 계절 항목이 월별 달력에 반영되어야 한다.',
      },
      {
        kind: 'memo',
        artifactTitle: '정비소 방문 트리거 메모',
        simulatedInputs: ['증상=타이어 편마모', '기준=공기압 반복 저하', '조치=정비소 예약'],
        expectedOutput: ['증상, 사용자가 확인할 범위, 직접 하지 말아야 할 범위, 정비소 방문 조건'],
        currentFlowMatch: '주의 항목은 있으나 DIY와 전문가 영역 구분이 약하다.',
        currentUxSupport: '경고/주의 UX가 루틴 카드 안에서 충분히 강조되지 않는다.',
        gap: '정비소 트리거는 체크리스트가 아니라 안전 경계 메모로 분리해야 한다.',
      },
    ],
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
    checkedAt: '2026-07-11',
    sourceTitle: 'ThankyouBUBU 홈트 루틴 콘텐츠 참고',
    sourceUrl: 'https://www.youtube.com/@ThankyouBUBU',
    sourcePrecision: 'broad',
    sourceUsefulness: '홈트 루틴은 캘린더 반복과 체크가 필요하지만 현재 source는 채널 페이지라 정확한 운동 세션과 1:1로 매칭되지 않는다.',
    idealReconstruction: '정확한 운동 영상 URL을 기준으로 시작일, 반복 요일, 세션 체크, 몸 상태 기록으로 재구성한다.',
    naturalArtifacts: [
      {
        kind: 'routine_calendar',
        artifactTitle: '20분 홈트 주간 반복 달력',
        simulatedInputs: ['시작일=2026-06-02', '운동요일=화/목/토', '운동시간=21:00', '목표=전신 20분'],
        expectedOutput: ['매주 화/목/토 21:00 전신 홈트 20분', '운동 후 난이도/통증/완료 체크'],
        currentFlowMatch: '루틴 방향은 맞지만 원본이 정확한 영상이 아니라 산출물 근거가 약하다.',
        currentUxSupport: '반복 달력 preview와 운동 후 기록 UX가 부족하다.',
        gap: 'exact video 기준으로 세션을 고정하고 요일/시간이 월간 달력에 보여야 한다.',
      },
      {
        kind: 'memo',
        artifactTitle: '운동 후 몸 상태 기록',
        simulatedInputs: ['세션=전신 20분', '난이도=보통', '통증=무릎 불편', '다음조정=점프 동작 제외'],
        expectedOutput: ['날짜, 세션, 완료 여부, 난이도, 통증 부위, 다음 회차 조정 메모'],
        currentFlowMatch: '메모는 가능하지만 운동 안전 기록으로 구조화되어 있지 않다.',
        currentUxSupport: '건강/운동 민감 신호가 일반 메모에 묻힌다.',
        gap: '운동 루틴에는 통증/컨디션 기록과 중단 안내가 필요하다.',
      },
    ],
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
    checkedAt: '2026-07-11',
    sourceTitle: '외교부·여권안내·공항 반입 규정 참고',
    sourceUrl: 'https://passport.go.kr/home/kor/contents.do?menuPos=48',
    sourcePrecision: 'broad',
    sourceUsefulness: '출국 준비는 D-day 일정과 체크리스트 가치가 크지만 현재 대표 URL은 여권 범위만 직접 커버한다.',
    idealReconstruction: '여권, 비자/입국 조건, 여행경보, 보험, 공항 보안, 짐 목록을 복수 공식 출처로 재구성한다.',
    naturalArtifacts: [
      {
        kind: 'monthly_calendar',
        artifactTitle: '해외여행 D-14 출국 준비 달력',
        simulatedInputs: ['출국일=2026-07-18', '국가=일본', '항공편=오전 9시', '여권만료일=2028-03-01'],
        expectedOutput: [
          '2026-07-04 D-14 여권/입국 조건 확인',
          '2026-07-11 D-7 보험/환전/로밍 준비',
          '2026-07-17 D-1 수하물/보안 규정 확인',
          '2026-07-18 D-Day 공항 도착 시간 확인',
        ],
        currentFlowMatch: 'D-day 준비 구조는 맞지만 source가 여권 중심이라 범위 신뢰가 약하다.',
        currentUxSupport: '달력/체크리스트는 가능하나 공식 출처별 확인 범위가 부족하다.',
        gap: '국가/항공사/공식 출처별 확인 링크가 항목별로 분리되어야 한다.',
      },
      {
        kind: 'memo',
        artifactTitle: '출국 전 공식 확인 메모',
        simulatedInputs: ['국가=일본', '확인항목=입국조건/항공보안/여행경보', '확인일=2026-07-16'],
        expectedOutput: ['확인 항목, 공식 링크, 확인일, 변동 가능성, 마지막 재확인 시점'],
        currentFlowMatch: '주의 문구는 있으나 공식 확인 메모 산출물은 약하다.',
        currentUxSupport: '출처 카드가 단일 URL이라 여러 공식 링크 관리가 어렵다.',
        gap: '여행 Flow는 복수 출처 카드와 마지막 확인일이 필요하다.',
      },
    ],
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
    checkedAt: '2026-07-11',
    sourceTitle: '런데이',
    sourceUrl: 'https://www.runday.co.kr/',
    sourcePrecision: 'broad',
    sourceUsefulness: '초보 러닝 프로그램은 반복 세션과 회복 규칙이 있어 FLOW 가치가 높지만 현재 source는 홈페이지라 4주 5km 계획의 직접 근거가 약하다.',
    idealReconstruction: '정확한 4주 프로그램 source를 기준으로 주차별 세션, 휴식일, missed-session rule, 월간 캘린더로 재구성한다.',
    naturalArtifacts: [
      {
        kind: 'routine_calendar',
        artifactTitle: '5km 4주 러닝 훈련 달력',
        simulatedInputs: ['시작일=2026-06-01', '훈련요일=월/수/토', '목표=4주 후 5km 완주', '현재수준=초보'],
        expectedOutput: ['1주차 걷기+조깅', '2주차 조깅 시간 증가', '3주차 연속주', '4주차 5km 시도와 휴식일'],
        currentFlowMatch: '프로그램 UX는 맞지만 정확한 source와 세션 근거가 약하다.',
        currentUxSupport: '월간 캘린더와 놓친 세션 처리 안내가 충분히 강하지 않다.',
        gap: '훈련 세션/휴식일/missed-session rule이 달력에 함께 보여야 한다.',
      },
      {
        kind: 'memo',
        artifactTitle: '러닝 컨디션 기록',
        simulatedInputs: ['세션=2주차 2회', '거리=2.5km', '통증=없음', '체감강도=7/10'],
        expectedOutput: ['날짜, 세션, 거리/시간, 체감강도, 통증 여부, 다음 세션 진행 여부'],
        currentFlowMatch: '체크는 가능하지만 훈련 로그가 산출물로 약하다.',
        currentUxSupport: '건강/운동 안전 기록과 회복 안내가 일반 체크리스트에 묻힌다.',
        gap: '운동 프로그램에는 완료 체크 외 컨디션 로그가 필요하다.',
      },
    ],
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
    naturalArtifacts: [
      {
        kind: 'monthly_calendar',
        artifactTitle: '자격증 시험 D-30 학습 달력',
        simulatedInputs: ['시험일=2026-06-30', '과목=컴퓨터활용능력 필기', '챕터=5개', '평일공부=2시간', '주말공부=4시간'],
        expectedOutput: ['D-30~D-21 개념 1회독', 'D-20~D-10 기출 풀이', 'D-9~D-3 오답 복습', 'D-2~D-Day 준비물/시험장 확인'],
        currentFlowMatch: '현재 제목은 시험 계획이지만 원본은 영어 루틴 조언이라 맞지 않는다.',
        currentUxSupport: '시험일 기반 UI가 있어도 챕터/과목 입력과 배분 로직이 부족하다.',
        gap: '출처를 교체하거나 영어 루틴 Flow로 이름과 구조를 바꿔야 한다.',
      },
      {
        kind: 'spreadsheet',
        artifactTitle: '챕터별 진도 관리표',
        simulatedInputs: ['챕터=1~5장', '기출회차=2023~2025 6회분', '약점=함수/차트'],
        expectedOutput: ['챕터, 목표일, 완료일, 기출 회차, 오답 수, 약점 메모, 재복습 예정일'],
        currentFlowMatch: '현재 Flow 항목은 일반 공부 계획에 가까워 실제 진도표와 차이가 크다.',
        currentUxSupport: '챕터 행과 기출 회차를 관리하는 UX가 없다.',
        gap: '시험형 Flow에는 챕터/회차 기반 표가 필요하다.',
      },
    ],
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
  defineAudit({
    slug: 'passport-renewal-docs',
    checkedAt: '2026-07-11',
    sourceTitle: '외교부 여권안내 – 유효기간 만료에 따른 재발급',
    sourceUrl: 'https://www.passport.go.kr/home/kor/contents.do?menuPos=7',
    sourcePrecision: 'exact',
    sourceUsefulness: '여권 재발급은 신청 가능 대상, 사진, 수수료, 수령 경로가 분명해 체크리스트와 증빙 메모로 재구성하기 좋다.',
    idealReconstruction: '여행 예정일 또는 신청 목표일을 기준으로 사진 준비, 온라인/방문 신청, 접수 상태, 수령 확인 메모로 재구성한다.',
    naturalArtifacts: [
      {
        kind: 'checklist',
        artifactTitle: '여권 재발급 신청 전 체크리스트',
        simulatedInputs: ['여행예정=2026-08-20', '여권만료=2026-07-10', '신청경로=정부24 온라인', '사진=2026-05 촬영'],
        expectedOutput: ['신청 가능 대상 확인', '사진 규격 확인', '수수료/수령 방법 확인', '접수 상태 캡처', '수령일과 보관 위치 메모'],
        currentFlowMatch: '현재 항목은 신청 전 확인과 신청 후 상태 확인을 포함한다.',
        currentUxSupport: '체크리스트는 맞지만 사진 규격, 접수번호, 수령 메모가 별도 산출물로 강하게 보이지 않는다.',
        gap: '여권 Flow는 신청 증빙/수령 정보 보관 카드가 필요하다.',
      },
    ],
    userJourney: [
      '여행 전 여권 유효기간을 확인한다.',
      '정부24 안내를 보고 온라인 신청 가능 여부와 사진을 준비한다.',
      'FLOW에서 신청 체크와 접수 상태를 기록한다.',
      '수령일, 접수번호, 보관 위치를 메모로 남긴다.',
    ],
    currentGap: '기본 체크리스트는 맞지만 신청 증빙과 수령 메모가 일반 항목에 묻힌다.',
    contentAction: '사진 규격, 접수번호, 수령일, 보관 위치 기준을 item detail과 export에 추가한다.',
    uxAction: '행정서류 Flow에 증빙/수령 메모 preview를 추가한다.',
    scores: {
      actionDensity: 13,
      temporalStructure: 8,
      externalManagementNeed: 16,
      completionClarity: 14,
      personalizationNeed: 8,
      returnValue: 8,
      sourceSpecificityTrust: 10,
      riskBoundaryClarity: 4,
    },
  }),
  defineAudit({
    slug: 'driver-license-renewal-check',
    checkedAt: '2026-05-23',
    sourceTitle: '한국도로교통공단 안전운전 통합민원 면허갱신 안내',
    sourceUrl: 'https://www.safedriving.or.kr/diGuide/selectDiGuide02.do',
    sourcePrecision: 'exact',
    sourceUsefulness: '공식 안내가 적성검사/갱신, 준비물, 사진, 수수료, 방문 장소를 제공해 실행 체크리스트 가치가 높다.',
    idealReconstruction: '면허 유형과 갱신 마감일을 입력받아 준비물과 신청 경로를 필터링하고 마감 일정표로 재구성한다.',
    naturalArtifacts: [
      {
        kind: 'comparison_table',
        artifactTitle: '면허 갱신/적성검사 조건표',
        simulatedInputs: ['면허=2종보통', '만료일=2026-08-31', '사진=필요', '수령=시험장 방문'],
        expectedOutput: ['유형, 준비물, 사진 매수, 수수료, 온라인 가능 여부, 방문 장소, 수령 조건'],
        currentFlowMatch: '준비물과 경로 확인 항목은 있으나 면허 유형별 분기가 없다.',
        currentUxSupport: '단일 체크리스트라 사용자가 자기 조건에 맞는 항목만 줄여 보기 어렵다.',
        gap: '면허 Flow는 조건 분기와 선택적 마감일 입력이 필요하다.',
      },
    ],
    userJourney: [
      '갱신 안내를 보고 본인이 갱신인지 적성검사인지 확인한다.',
      'FLOW에서 면허 유형과 만료일을 입력한다.',
      '사진, 신분증, 수수료, 건강검진 활용 여부를 체크한다.',
      '방문/온라인 신청 후 수령 상태를 기록한다.',
    ],
    currentGap: '공식 source는 좋지만 조건 분기와 마감일 UX가 부족해 대표 노출 전 보강이 필요하다.',
    contentAction: '면허 유형별 준비물과 신청 경로를 분리하고 조건 선택 기준을 추가한다.',
    uxAction: 'checklist Flow에 조건 필터와 optional deadline 입력을 추가한다.',
    decision: 'reshape_before_featured',
    scores: {
      actionDensity: 13,
      temporalStructure: 10,
      externalManagementNeed: 16,
      completionClarity: 12,
      personalizationNeed: 9,
      returnValue: 8,
      sourceSpecificityTrust: 10,
      riskBoundaryClarity: 4,
    },
  }),
  defineAudit({
    slug: 'pet-registration-basic',
    checkedAt: '2026-05-23',
    sourceTitle: '정부24 동물등록 신청·변경신고 안내',
    sourceUrl: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=15410000003&HighCtgCD=A09006',
    sourcePrecision: 'exact',
    sourceUsefulness: '동물등록은 등록 대상, 방식, 대행기관, 등록번호 보관이 명확해 체크리스트와 장기 메모 산출물에 잘 맞는다.',
    idealReconstruction: '등록 방식과 대행기관 후보를 정하고 방문 준비, 등록번호 보관, 변경신고 조건 메모로 재구성한다.',
    naturalArtifacts: [
      {
        kind: 'checklist',
        artifactTitle: '반려견 동물등록 준비표',
        simulatedInputs: ['동물=강아지', '월령=3개월', '등록방식=내장형', '기관=동물병원 방문'],
        expectedOutput: ['등록 대상 확인', '등록 방식 선택', '대행기관 확인', '소유자 정보 준비', '등록번호 보관'],
        currentFlowMatch: '현재 항목이 공식 절차와 잘 맞는다.',
        currentUxSupport: '체크리스트는 맞지만 대행기관 후보와 등록번호 보관 카드가 약하다.',
        gap: '등록 완료 후 장기 보관할 등록번호 메모가 별도 산출물로 보여야 한다.',
      },
    ],
    userJourney: [
      '입양 후 등록 대상 여부를 확인한다.',
      'FLOW에서 등록 방식과 대행기관을 정한다.',
      '방문 준비물과 소유자 정보를 체크한다.',
      '등록번호와 변경신고 조건을 보관한다.',
    ],
    currentGap: '등록 준비는 적합하지만 등록번호 보관과 변경신고 메모가 더 강조되어야 한다.',
    contentAction: '등록번호, 기관, 변경신고 조건을 완료 후 보관 정보로 추가한다.',
    uxAction: '등록형 checklist에 장기 보관 메모 preview를 추가한다.',
    scores: {
      actionDensity: 14,
      temporalStructure: 6,
      externalManagementNeed: 16,
      completionClarity: 14,
      personalizationNeed: 8,
      returnValue: 9,
      sourceSpecificityTrust: 10,
      riskBoundaryClarity: 5,
    },
  }),
  defineAudit({
    slug: 'family-certificate-issue',
    checkedAt: '2026-05-23',
    sourceTitle: '정부24 가족관계등록부 증명서 안내',
    sourceUrl: 'https://m.gov.kr/mw/AA020InfoCappView.do?CappBizCD=97400000004&HighCtgCD=A01008&tp_seq=01',
    sourcePrecision: 'exact',
    sourceUsefulness: '가족관계증명서는 제출처 요구 범위와 공개 범위 선택이 중요해 발급 전 의사결정 체크리스트 가치가 있다.',
    idealReconstruction: '제출처, 증명서 종류, 일반/상세/특정 범위, 주민등록번호 공개 범위를 먼저 정리한 뒤 발급 메모로 재구성한다.',
    naturalArtifacts: [
      {
        kind: 'memo',
        artifactTitle: '가족관계증명서 제출 요구사항 메모',
        simulatedInputs: ['제출처=은행', '종류=가족관계증명서', '범위=상세', '주민번호=뒷자리 비공개'],
        expectedOutput: ['제출처, 필요한 증명서 종류, 공개 범위, 발급 경로, 제출 파일/출력 위치'],
        currentFlowMatch: '발급 목적과 범위 확인 항목은 맞다.',
        currentUxSupport: '메모는 가능하지만 제출처 요구사항을 표준 필드로 받지 않는다.',
        gap: '서류 Flow는 제출처 요구사항을 먼저 입력받아야 한다.',
      },
    ],
    userJourney: [
      '제출처에서 필요한 증명서 조건을 확인한다.',
      'FLOW에서 증명서 종류와 공개 범위를 정한다.',
      '정부24 또는 전자가족관계등록시스템에서 발급한다.',
      '제출 전 표시 항목과 파일 위치를 확인한다.',
    ],
    currentGap: '제출처 요구사항과 공개 범위 선택이 항목 텍스트에만 있어 실수 방지 효과가 약하다.',
    contentAction: '제출처, 증명서 종류, 공개 범위, 제출 파일 위치를 구조화한다.',
    uxAction: '서류 발급 Flow에 제출처 요구사항 입력/메모 카드를 추가한다.',
    scores: {
      actionDensity: 12,
      temporalStructure: 4,
      externalManagementNeed: 14,
      completionClarity: 13,
      personalizationNeed: 8,
      returnValue: 8,
      sourceSpecificityTrust: 10,
      riskBoundaryClarity: 5,
    },
  }),
  defineAudit({
    slug: 'resident-register-copy-issue',
    checkedAt: '2026-05-23',
    sourceTitle: '정부24 주민등록표 등본·초본 발급 안내',
    sourceUrl: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=13100000015&HighCtgCD=A1004',
    sourcePrecision: 'exact',
    sourceUsefulness: '주민등록등본·초본은 표시 항목, 주소 변동, 주민등록번호 공개 범위 선택이 중요해 발급 전 체크 가치가 높다.',
    idealReconstruction: '제출처와 필요한 표시 항목을 입력받고 등본/초본 선택, 공개 범위, 발급 환경, 제출 파일 보관으로 재구성한다.',
    naturalArtifacts: [
      {
        kind: 'checklist',
        artifactTitle: '등본·초본 발급 전 표시 항목 확인표',
        simulatedInputs: ['제출처=회사', '서류=초본', '주소변동=전체', '주민번호=뒷자리 비공개'],
        expectedOutput: ['등본/초본 선택', '주소 변동 표시 여부', '세대원 표시 여부', '주민번호 공개 범위', '파일/출력 보관'],
        currentFlowMatch: '표시 항목 확인과 발급 경로는 현재 항목에 포함된다.',
        currentUxSupport: '개인정보 공개 범위를 사용자가 명확히 선택하고 보관하는 UX가 약하다.',
        gap: '개인정보 공개 범위와 제출처 요구사항을 별도 입력해야 한다.',
      },
    ],
    userJourney: [
      '제출처가 요구하는 등본/초본 조건을 확인한다.',
      'FLOW에서 표시 항목과 공개 범위를 정한다.',
      '정부24 또는 무인민원발급기에서 발급한다.',
      '제출 전 발급일과 공개 범위를 다시 확인한다.',
    ],
    currentGap: '개인정보 공개 범위와 표시 항목 선택이 실제 입력값으로 남지 않는다.',
    contentAction: '표시 항목, 공개 범위, 제출처 요구사항을 체크 가능한 필드로 보강한다.',
    uxAction: '행정서류 Flow에 privacy scope 확인 카드와 제출 전 preview를 추가한다.',
    scores: {
      actionDensity: 12,
      temporalStructure: 4,
      externalManagementNeed: 14,
      completionClarity: 13,
      personalizationNeed: 8,
      returnValue: 8,
      sourceSpecificityTrust: 10,
      riskBoundaryClarity: 5,
    },
  }),
  defineAudit({
    slug: 'qnet-exam-application-prep',
    checkedAt: '2026-05-23',
    sourceTitle: 'Q-Net 원서접수 안내',
    sourceUrl: 'https://q-net.or.kr/rcv001.do?gSite=Q&id=rcv00103&rcvPFlag=Y',
    sourcePrecision: 'exact',
    sourceUsefulness: 'Q-Net 원서접수는 접수 기간, 결제, 수험표, 신분증, 시험일 준비가 연결되어 일정+체크리스트 가치가 높다.',
    idealReconstruction: '시험일과 접수 마감일을 받아 접수, 결제, 수험표, 신분증, 시험장 준비를 다중 deadline Flow로 재구성한다.',
    naturalArtifacts: [
      {
        kind: 'monthly_calendar',
        artifactTitle: 'Q-Net 접수부터 시험당일 일정표',
        simulatedInputs: ['시험일=2026-07-12', '접수마감=2026-06-10 18:00', '종목=정보처리기사', '시험장=서울동부'],
        expectedOutput: ['접수 마감 전 확인', '결제/접수 상태 저장', '수험표 출력', '신분증/준비물 확인', '시험장 도착 시간 확인'],
        currentFlowMatch: '시험일 기준 준비 항목은 맞지만 접수마감 같은 보조 deadline이 없다.',
        currentUxSupport: '단일 날짜 anchor로는 접수/결제/수험표 같은 여러 마감을 표현하기 어렵다.',
        gap: '시험 Flow에는 시험일 외 접수 마감과 수험표 출력일을 입력할 수 있어야 한다.',
      },
    ],
    userJourney: [
      'Q-Net 접수 안내에서 접수 기간과 시험일을 확인한다.',
      'FLOW에 시험일과 접수 마감일을 입력한다.',
      '접수, 결제, 수험표, 신분증을 날짜별로 체크한다.',
      '시험 전날 준비물과 시험장 이동 계획을 확인한다.',
    ],
    currentGap: 'source는 좋지만 시험일 하나만으로는 접수 마감과 수험표 출력 같은 보조 일정이 부족하다.',
    contentAction: '접수마감, 결제완료, 수험표 출력, 시험당일 준비를 별도 deadline으로 보강한다.',
    uxAction: 'timeline Flow에 다중 deadline 입력과 공식 기준 대비표 export를 추가한다.',
    decision: 'reshape_before_featured',
    scores: {
      actionDensity: 13,
      temporalStructure: 12,
      externalManagementNeed: 18,
      completionClarity: 12,
      personalizationNeed: 8,
      returnValue: 8,
      sourceSpecificityTrust: 10,
      riskBoundaryClarity: 4,
    },
  }),
  defineAudit({
    slug: 'samsung-aircon-seasonal-check',
    checkedAt: '2026-05-23',
    sourceTitle: '삼성전자서비스 Samsung Care+ 에어컨 관리 안내',
    sourceUrl: 'https://www.samsungsvc.co.kr/info/carePlus',
    sourcePrecision: 'exact',
    sourceUsefulness: '공식 안내가 에어컨 세척 필요 신호, 신청 방법, 상담 연락처를 제공해 계절 전 점검 달력과 상담 메모로 전환하기 좋다.',
    idealReconstruction: '사용 시작일을 기준으로 모델/오염 확인, 상담, 예약, 세척 후 확인을 날짜와 메모로 재구성한다.',
    naturalArtifacts: [
      {
        kind: 'monthly_calendar',
        artifactTitle: '여름 전 에어컨 점검 달력',
        simulatedInputs: ['사용시작일=2026-06-15', '제품=스탠드형', '증상=냄새', '상담=1588-4190'],
        expectedOutput: ['필터/냄새 확인', '모델명과 설치 위치 기록', '상담/예약', '세척 후 냉방/누수 확인'],
        currentFlowMatch: '현재 Flow 항목이 공식 서비스 신청 흐름과 잘 맞는다.',
        currentUxSupport: '달력과 체크는 맞지만 상담 결과와 예약 후보 메모가 약하다.',
        gap: '서비스 예약형 Flow에는 상담 메모와 예약 후보 카드가 필요하다.',
      },
    ],
    userJourney: [
      '공식 Samsung Care+ 안내를 보고 세척 필요 신호를 확인한다.',
      'FLOW에서 사용 시작일을 입력한다.',
      '모델/오염/상담/예약/사후 확인을 날짜별로 체크한다.',
      '상담 번호와 예약 결과를 메모로 남긴다.',
    ],
    currentGap: '공식 source와 실행 구조는 강하지만 상담/예약 메모 preview가 더 필요하다.',
    contentAction: '모델명, 증상, 상담번호, 예약 가능일, 사후 확인 기준을 item detail에 추가한다.',
    uxAction: '서비스 예약형 Flow에 상담 메모와 예약 후보 preview를 추가한다.',
    scores: {
      actionDensity: 13,
      temporalStructure: 12,
      externalManagementNeed: 18,
      completionClarity: 13,
      personalizationNeed: 8,
      returnValue: 8,
      sourceSpecificityTrust: 10,
      riskBoundaryClarity: 4,
    },
  }),
  defineAudit({
    slug: 'samsung-washer-filter-cleaning',
    checkedAt: '2026-07-11',
    sourceTitle: '삼성전자서비스 미세플라스틱 저감장치 필터 청소 안내',
    sourceUrl: 'https://www.samsungsvc.co.kr/solution/1477182',
    sourcePrecision: 'exact',
    sourceUsefulness: '공식 안내가 필터 LED 신호, 전원 차단, 분리 방향, 물세척 금지, 재조립과 3초 리셋을 순서대로 설명해 상태 기반 체크리스트에 적합하다.',
    idealReconstruction: '고정 주기를 만들지 않고 필터 LED가 깜빡일 때 공식 순서대로 전원 차단, 분리, 마른 이물 제거, 재조립과 리셋을 확인한다.',
    naturalArtifacts: [
      {
        kind: 'checklist',
        artifactTitle: '필터 LED 점등 시 청소 체크리스트',
        simulatedInputs: ['청소 신호=필터 LED 깜빡임', '제품=미세플라스틱 저감장치', '주의=필터 물세척 금지'],
        expectedOutput: ['필터 LED 확인', '제품과 세탁기 전원 끄기', '필터 분리', '물세척 없이 이물 제거', '재조립', '필터 버튼 3초 리셋'],
        currentFlowMatch: '현재 Flow가 공식 페이지의 10개 순서와 물세척 금지 경계를 그대로 보존한다.',
        currentUxSupport: '상태 신호부터 리셋까지 한 체크리스트로 실행하고 완료 상태를 저장할 수 있다.',
        gap: '없음. 반복 날짜보다 제품의 필터 LED 신호를 시작 조건으로 유지한다.',
      },
    ],
    userJourney: [
      '필터 LED가 깜빡이는지 확인한다.',
      '제품과 연결된 세탁기의 전원을 끈다.',
      '공식 순서대로 필터를 분리해 물세척 없이 이물질을 제거한다.',
      '필터를 재조립하고 버튼을 3초간 눌러 리셋한다.',
    ],
    currentGap: '현재 bundle은 source-specific 상태 신호와 안전 경계를 보존한다.',
    contentAction: '고정 주기나 배수필터 절차를 섞지 않고 미세플라스틱 저감장치 공식 순서만 유지한다.',
    uxAction: '필터 LED 상태와 물세척 금지를 첫 실행 맥락으로 유지한다.',
    scores: {
      actionDensity: 14,
      temporalStructure: 14,
      externalManagementNeed: 18,
      completionClarity: 15,
      personalizationNeed: 7,
      returnValue: 9,
      sourceSpecificityTrust: 10,
      riskBoundaryClarity: 5,
    },
  }),
  defineAudit({
    slug: 'vehicle-inspection-prep',
    checkedAt: '2026-05-23',
    sourceTitle: 'TS한국교통안전공단 자동차검사 절차 안내',
    sourceUrl: 'https://main.kotsa.or.kr/portal/contents.do?menuCode=01010104',
    sourcePrecision: 'exact',
    sourceUsefulness: '공식 검사 절차가 검사 전 준비, 검사소 방문, 결과 후 후속 정비까지 이어져 일정표와 체크리스트 가치가 높다.',
    idealReconstruction: '검사일을 기준으로 예약/서류/자가점검, 검사소 방문, 결과표 보관, 후속 정비 메모로 재구성한다.',
    naturalArtifacts: [
      {
        kind: 'monthly_calendar',
        artifactTitle: '자동차검사 예약 전후 준비 달력',
        simulatedInputs: ['검사일=2026-06-18', '차량=아반떼 2021', '검사소=성산검사소', '예약=10:30'],
        expectedOutput: ['D-7 검사 기간과 예약 확인', 'D-3 등록증/등화/타이어 점검', 'D-Day 검사소 방문', 'D+1 결과표 보관과 정비 메모'],
        currentFlowMatch: '현재 Flow는 예약 전 준비와 검사 후 확인 방향이 맞다.',
        currentUxSupport: '검사소/예약 시간/결과표 메모가 일반 메모에만 들어간다.',
        gap: '자동차검사 Flow는 예약 카드와 검사 결과 후속 정비 메모가 필요하다.',
      },
    ],
    userJourney: [
      '검사 안내에서 절차와 준비 항목을 확인한다.',
      'FLOW에서 검사일과 검사소, 예약 시간을 입력한다.',
      '검사 전 서류와 차량 상태를 체크한다.',
      '검사 결과표와 후속 정비 메모를 보관한다.',
    ],
    currentGap: '공식 source와 일정 구조는 좋지만 예약 정보와 결과 후속 정비 메모가 분리되어 있지 않다.',
    contentAction: '검사 전 준비, 검사소 방문, 결과 후 정비를 섹션과 완료 기준으로 분리한다.',
    uxAction: 'vehicle timeline에 예약 정보 카드와 검사 결과 follow-up 메모를 추가한다.',
    scores: {
      actionDensity: 14,
      temporalStructure: 14,
      externalManagementNeed: 18,
      completionClarity: 13,
      personalizationNeed: 8,
      returnValue: 8,
      sourceSpecificityTrust: 10,
      riskBoundaryClarity: 4,
    },
  }),
  defineAudit({
    slug: 'computer-skills-d30-study',
    checkedAt: '2026-05-23',
    sourceTitle: '2026 한 권으로 끝내는 시나공 컴활 1급 필기+실기',
    sourceUrl: 'https://www.gilbut.co.kr/m/book/view?bookcode=BN004603',
    sourcePrecision: 'exact',
    sourceUsefulness: '필기와 실기를 한 권에 묶고 최신기출, 실기 유형, 온라인 채점 서비스를 제시해 D-30 역산 학습표와 오답 기록으로 바꾸기 적합하다.',
    idealReconstruction: '시험일, 급수, 남은 학습 가능 시간, 필기/실기 비중을 받아 주차별 범위, 기출 회독, 실기 파일 점검, 오답 재풀이 일정을 만든다.',
    naturalArtifacts: [
      {
        kind: 'monthly_calendar',
        artifactTitle: '컴활 1급 D-30 필기+실기 학습 달력',
        simulatedInputs: ['시험일=2026-07-18', '급수=1급', '평일학습=90분', '주말학습=3시간', '취약영역=액세스'],
        expectedOutput: ['D-30 필기 핵심요약 시작', 'D-21 필기 최신기출 풀이', 'D-14 실기 유형 반복', 'D-3 오답 재풀이와 저장 테스트'],
        currentFlowMatch: '시험일 기준 timeline과 필기/실기 분리는 맞지만 점수 기록과 재풀이 산출물이 약하다.',
        currentUxSupport: '캘린더와 체크는 가능하지만 mock score, 오답 유형, 실기 파일 점검 결과를 한눈에 보관하기 어렵다.',
        gap: '학습 Flow는 일정뿐 아니라 점수/오답/실기 환경 기록표가 함께 나와야 한다.',
      },
      {
        kind: 'spreadsheet',
        artifactTitle: '컴활 오답·모의점수 기록표',
        simulatedInputs: ['필기모의=62점', '실기엑셀=계산작업 취약', '실기액세스=조회/출력 취약'],
        expectedOutput: ['날짜, 회차, 과목, 점수, 오답유형, 재풀이일, 해결여부 열이 있는 sheet'],
        currentFlowMatch: '오답 정리 item은 있으나 export에서 시험 점수형 sheet로 강하게 드러나지 않는다.',
        currentUxSupport: '일반 메모로는 시험 전 반복 실수를 추적하기 어렵다.',
        gap: 'hybrid Flow의 sheet destination을 점수와 오답 중심으로 명확히 해야 한다.',
      },
    ],
    userJourney: ['교재 목차와 시험일을 확인한다.', 'FLOW에 시험일과 하루 학습 가능 시간을 입력한다.', '30일 학습 달력과 오답 기록표를 개인 시트로 옮긴다.', '모의점수와 취약 유형을 기록하며 남은 범위를 조정한다.'],
    currentGap: '현재 Flow는 D-30 학습 순서는 제공하지만 합격 판단에 필요한 점수/오답 산출물이 약하다.',
    contentAction: '필기/실기 범위, 최신기출, 실기 유형, 오답 재풀이를 item detail과 sheet 열로 보강한다.',
    uxAction: 'study timeline에서 calendar와 score sheet preview를 함께 보여준다.',
    decision: 'reshape_before_featured',
    scores: {
      actionDensity: 13,
      temporalStructure: 15,
      externalManagementNeed: 18,
      completionClarity: 12,
      personalizationNeed: 8,
      returnValue: 8,
      sourceSpecificityTrust: 10,
      riskBoundaryClarity: 5,
    },
  }),
  defineAudit({
    slug: 'diet-habit-2week',
    checkedAt: '2026-05-23',
    sourceTitle: '질병관리청 건강하게 체중 감량하기 안내',
    sourceUrl:
      'https://health.kdca.go.kr/healthinfo/biz/health/ntcnInfo/healthSourc/thtimtCntnts/thtimtCntntsView.do?thtimt_cntnts_sn=82',
    sourcePrecision: 'exact',
    sourceUsefulness: '급격한 감량보다 점진적 목표와 충분한 수면 같은 생활습관 원칙을 강조해, 한 가지 규칙만 좁혀 체크하는 안전 경계로 적합하다.',
    idealReconstruction: '체크 시작일을 받아 14일 동안 8시간 이상 자기만 매일 확인하는 수면 체크 캘린더와 짧은 메모로 만든다.',
    naturalArtifacts: [
      {
        kind: 'routine_calendar',
        artifactTitle: '14일 수면 체크 캘린더',
        simulatedInputs: ['체크 시작일=2026-06-01', '규칙=8시간 이상 자기', '기간=14일', '주의=수면 문제 반복 시 상담'],
        expectedOutput: ['14일 날짜, 8시간 이상 수면 여부, 잠든 시각, 다음 날 피로감만 남기는 캘린더/메모'],
        currentFlowMatch: '8시간 이상 자기 규칙은 맞지만 식사·운동 관찰표처럼 보이면 원문 대표성이 흐려진다.',
        currentUxSupport: 'routine calendar가 첫 화면에 와야 하며 spreadsheet-first 기록물은 부차적이어야 한다.',
        gap: '건강 민감 Flow는 여러 체중관리 행동을 대표하지 말고 14일 수면 체크와 전문가 상담 경계를 먼저 보여야 한다.',
      },
    ],
    userJourney: ['공식 체중관리 주의사항 중 수면 원칙을 확인한다.', 'FLOW에 체크 시작일을 입력한다.', '14일 동안 8시간 이상 잤는지만 매일 체크한다.', '수면 문제나 어지러움이 반복되면 체크보다 상담을 우선한다.'],
    currentGap: '현재 Flow가 여러 습관 관찰이나 체중감량 조언처럼 읽히지 않도록 범위를 더 좁혀야 한다.',
    contentAction: '공식 안내 중 충분한 수면 원칙 하나만 남기고, 감량 처방이나 치료가 아니라는 경계를 item detail에 분리한다.',
    uxAction: 'diet routine은 14일 routine calendar와 warning card를 checklist보다 앞에 둔다.',
    decision: 'reshape_before_featured',
    scores: {
      actionDensity: 12,
      temporalStructure: 14,
      externalManagementNeed: 18,
      completionClarity: 12,
      personalizationNeed: 8,
      returnValue: 8,
      sourceSpecificityTrust: 10,
      riskBoundaryClarity: 5,
    },
  }),
  defineAudit({
    slug: 'new-car-delivery-check',
    checkedAt: '2026-07-11',
    sourceTitle: '겟차 신차 검수 체크리스트 가이드',
    sourceUrl: 'https://web.getcha.kr/blog/new-car-inspection-checklist-complete-guide-2026',
    sourcePrecision: 'exact',
    sourceUsefulness: '출고 당일 인수 전 외관, 내장, 주행 성능, 하자 발견 시 대응을 다뤄 신차 인수 점검표와 사진 증빙 sheet에 직접 맞는다.',
    idealReconstruction: '차량 모델, 인수 장소, 계약 옵션, 동행자 여부를 받아 외관/실내/전장/서류/하자 대응 기록표를 만든다.',
    naturalArtifacts: [
      {
        kind: 'spreadsheet',
        artifactTitle: '신차 인수 전 검수·하자 기록표',
        simulatedInputs: ['인수일=2026-06-20', '차량=아반떼 하이브리드', '옵션=선루프/HUD', '장소=딜리버리센터'],
        expectedOutput: ['영역, 점검항목, 정상/하자, 사진파일명, 딜러 확인, 인수 보류 여부 열이 있는 sheet'],
        currentFlowMatch: '외관·기능 점검과 함께 사진 파일명, 딜러 확인, 인수 보류 사유가 한 현장 기록표에 분리되어 있다.',
        currentUxSupport: '모바일 체크리스트와 보류 메모를 같은 sheet export에 보존한다.',
        gap: '없음. FLOW가 인수 결정을 대신하지 않는 경계를 유지한다.',
      },
    ],
    userJourney: ['인수 전 체크리스트를 열고 계약 옵션을 확인한다.', 'FLOW에 차량 모델과 인수일을 입력한다.', '현장에서 외관/실내/기능을 체크하고 사진 파일명을 기록한다.', '하자가 있으면 인수 서명 전 딜러 확인 상태를 sheet로 남긴다.'],
    currentGap: '현재 Flow는 신차 exact article와 인수 전 증빙·보류 경계를 반영한다.',
    contentAction: '차량·모델별 차이를 확정하지 말고 현장 확인과 서면 기록 범위만 유지한다.',
    uxAction: '체크리스트보다 증거표와 인수 보류 메모가 약해지지 않게 유지한다.',
    decision: 'keep_representative',
    scores: {
      actionDensity: 14,
      temporalStructure: 8,
      externalManagementNeed: 18,
      completionClarity: 13,
      personalizationNeed: 9,
      returnValue: 9,
      sourceSpecificityTrust: 9,
      riskBoundaryClarity: 4,
    },
  }),
  defineAudit({
    slug: 'year-end-tax-docs',
    checkedAt: '2026-05-23',
    sourceTitle: '국세청 연말정산 간소화 서비스 개통 안내',
    sourceUrl: 'https://www.nts.go.kr/nts/na/ntt/selectNttInfo.do?mi=&nttSn=1347979',
    sourcePrecision: 'exact',
    sourceUsefulness: '간소화 자료 개통, 최종 확정자료 제공, 공제대상 여부를 근로자가 판단해야 한다는 주의가 있어 회사 제출 전 서류표에 적합하다.',
    idealReconstruction: '회사 제출 마감일, 부양가족 여부, 추가 증빙 후보를 받아 간소화 PDF, 누락 자료, 회사 제출 상태를 분리한 sheet로 만든다.',
    naturalArtifacts: [
      {
        kind: 'spreadsheet',
        artifactTitle: '연말정산 회사 제출 서류 점검표',
        simulatedInputs: ['회사제출마감=2026-01-23', '부양가족=배우자/자녀1', '추가증빙=월세/기부금', '제출방식=회사시스템'],
        expectedOutput: ['자료명, 홈택스 조회 여부, 추가 증빙 위치, 회사 제출 여부, 공제 판단 확인 열이 있는 sheet'],
        currentFlowMatch: '간소화와 추가 증빙 item은 맞지만 연도별 공식 일정과 공제 판단 경계가 더 분명해야 한다.',
        currentUxSupport: 'sheet export는 맞지만 회사 제출 마감과 최종 확정자료 확인일이 별도 필드로 약하다.',
        gap: '세무 민감 Flow는 자료 수집과 공제 가능 판단을 분리해야 한다.',
      },
    ],
    userJourney: ['회사 연말정산 안내와 국세청 간소화 일정을 확인한다.', 'FLOW에 회사 제출 마감일과 추가 증빙 후보를 입력한다.', '간소화 PDF와 별도 영수증을 sheet에 표시한다.', '공제 가능 여부는 국세청/회사 기준으로 별도 확인한다.'],
    currentGap: '현재 Flow는 홈택스 broad source라 최신 공식 일정과 공제대상 주의가 약했다.',
    contentAction: '국세청 공지 URL로 source를 교체하고 공제 판단은 FLOW가 확정하지 않는다는 경계를 명시한다.',
    uxAction: 'tax Flow에는 제출 마감일, 최종자료 확인일, 회사 제출 상태를 sheet preview에 고정한다.',
    decision: 'reshape_before_featured',
    scores: {
      actionDensity: 13,
      temporalStructure: 10,
      externalManagementNeed: 18,
      completionClarity: 12,
      personalizationNeed: 8,
      returnValue: 9,
      sourceSpecificityTrust: 10,
      riskBoundaryClarity: 5,
    },
  }),
  defineAudit({
    slug: 'diet-meal-exercise-log',
    checkedAt: '2026-05-23',
    sourceTitle: '질병관리청 건강하게 체중 감량하기 안내',
    sourceUrl:
      'https://health.kdca.go.kr/healthinfo/biz/health/ntcnInfo/healthSourc/thtimtCntnts/thtimtCntntsView.do?thtimt_cntnts_sn=82',
    sourcePrecision: 'exact',
    sourceUsefulness: '건강한 식습관, 운동, 생활습관 개선을 병행하라는 공식 안내가 식사·운동 기록표의 안전한 원본으로 적합하다.',
    idealReconstruction: '시작일과 기록 항목을 받아 매일 식사, 운동, 수면, 컨디션을 관찰하는 sheet를 만들고 감량 처방은 하지 않는다.',
    naturalArtifacts: [
      {
        kind: 'spreadsheet',
        artifactTitle: '식사·운동·컨디션 일일 기록표',
        simulatedInputs: ['시작일=2026-06-03', '기록기간=14일', '운동=걷기 20분', '주의=어지러움 기록'],
        expectedOutput: ['날짜, 식사기록, 운동종류/시간, 체감강도, 수면, 통증/어지러움, 내일 조정 열이 있는 sheet'],
        currentFlowMatch: 'sheet-first 구조는 맞지만 공식 source와 경고 분리가 이전보다 더 필요하다.',
        currentUxSupport: '기록 export는 가능하지만 건강 주의와 전문가 상담 경계가 기록표 상단에 고정되어야 한다.',
        gap: '다이어트 기록은 추천 식단이 아니라 관찰표라는 UX 신호가 필요하다.',
      },
    ],
    userJourney: ['공식 체중관리 원칙을 확인한다.', 'FLOW에서 기록 기간과 운동 가능 시간을 정한다.', '매일 식사·운동·컨디션을 sheet에 적는다.', '통증이나 어지러움이 있으면 기록하고 전문가에게 확인한다.'],
    currentGap: '현재 Flow는 기록 목적은 맞지만 source가 약해 건강 조언처럼 오해될 수 있다.',
    contentAction: 'source를 질병관리청 공식 안내로 교체하고 식사/운동/생활습관 병행, 무리한 제한 금지를 분리한다.',
    uxAction: 'sheet export 첫 줄에 warning과 기록 목적을 고정한다.',
    decision: 'reshape_before_featured',
    scores: {
      actionDensity: 12,
      temporalStructure: 14,
      externalManagementNeed: 18,
      completionClarity: 12,
      personalizationNeed: 8,
      returnValue: 9,
      sourceSpecificityTrust: 10,
      riskBoundaryClarity: 5,
    },
  }),
  defineAudit({
    slug: 'diet-reset-2week',
    checkedAt: '2026-05-23',
    sourceTitle: '질병관리청 건강하게 체중 감량하기 안내',
    sourceUrl:
      'https://health.kdca.go.kr/healthinfo/biz/health/ntcnInfo/healthSourc/thtimtCntnts/thtimtCntntsView.do?thtimt_cntnts_sn=82',
    sourcePrecision: 'exact',
    sourceUsefulness: '점진적 목표와 건강한 생활습관 병행을 강조해 2주 리셋을 단기 감량 처방이 아닌 관찰·조정 루틴으로 제한할 수 있다.',
    idealReconstruction: '시작일, 가장 자주 무너지는 패턴, 유지할 규칙 후보를 받아 2주 관찰표와 다음 2주 유지 규칙 memo를 만든다.',
    naturalArtifacts: [
      {
        kind: 'spreadsheet',
        artifactTitle: '2주 습관 리셋 관찰·유지 규칙표',
        simulatedInputs: ['시작일=2026-06-10', '패턴=야식/간식', '대체후보=물/산책', '유지규칙수=3개'],
        expectedOutput: ['날짜, 무너진 패턴, 대체 행동, 식사 거름 여부, 컨디션, 다음 2주 유지 규칙 열이 있는 sheet'],
        currentFlowMatch: '간식 줄이기와 유지 규칙 item은 맞지만 안전 경계와 공식 source가 약했다.',
        currentUxSupport: 'routine check는 가능하나 리셋 이후 유지 규칙 memo가 약하다.',
        gap: '리셋 Flow는 금지 목록이 아니라 유지 가능한 규칙 선별표여야 한다.',
      },
    ],
    userJourney: ['체중 숫자보다 무너지는 생활 패턴을 고른다.', 'FLOW에 시작일과 관찰할 패턴을 입력한다.', '2주 동안 제한 대신 대체 행동과 컨디션을 기록한다.', '마지막 날 다음 2주에 유지할 규칙 세 개만 남긴다.'],
    currentGap: '현재 Flow는 2주 루틴으로 유용하지만 감량 약속처럼 읽히지 않도록 더 보강해야 한다.',
    contentAction: '건강 안내 기반으로 식사 거르기/과도 제한 금지와 유지 규칙 중심 설명을 추가한다.',
    uxAction: 'routine 완료 화면에 다음 2주 유지 규칙 memo preview를 추가한다.',
    decision: 'reshape_before_featured',
    scores: {
      actionDensity: 12,
      temporalStructure: 14,
      externalManagementNeed: 17,
      completionClarity: 12,
      personalizationNeed: 8,
      returnValue: 8,
      sourceSpecificityTrust: 10,
      riskBoundaryClarity: 5,
    },
  }),
  defineAudit({
    slug: 'business-registration-basic',
    checkedAt: '2026-05-23',
    sourceTitle: '홈택스 사업자등록 제출서류 안내',
    sourceUrl: 'https://mob.tbht.hometax.go.kr/jsonAction.do?actionId=UTBABAAB92F001',
    sourcePrecision: 'exact',
    sourceUsefulness: '업종, 사업장, 인허가, 제출서류가 개인 상황에 따라 달라지는 행정·세무 준비 Flow로 적합하지만 세무 판단 경계를 분명히 해야 한다.',
    idealReconstruction: '업종, 사업장 유형, 임대차 여부, 인허가 후보를 받아 홈택스 신청 전 서류 memo와 세무서 확인 질문 목록을 만든다.',
    naturalArtifacts: [
      {
        kind: 'memo',
        artifactTitle: '개인 사업자등록 신청 전 확인 메모',
        simulatedInputs: ['업종=온라인 소매', '사업장=자택', '임대차=없음', '인허가=통신판매업 별도 확인'],
        expectedOutput: ['업종 코드 후보, 사업장 정보, 필요 서류, 인허가 확인처, 세무서 질문 목록'],
        currentFlowMatch: '준비 서류 checklist는 맞지만 업종별 판단과 세무 조언 경계가 더 필요하다.',
        currentUxSupport: 'memo destination은 맞지만 공식 확인 질문 목록이 별도 산출물로 약하다.',
        gap: '사업자등록 Flow는 신청 대행이 아니라 제출 전 질문 정리 도구여야 한다.',
      },
    ],
    userJourney: ['홈택스 안내에서 신청 경로를 확인한다.', 'FLOW에 업종과 사업장 조건을 입력한다.', '제출 전 서류와 인허가 질문을 memo로 정리한다.', '불확실한 판단은 세무서나 전문가에게 확인한다.'],
    currentGap: '현재 Flow는 서류 준비에는 맞지만 세무 판단처럼 보이지 않도록 출력 범위를 더 제한해야 한다.',
    contentAction: '업종/인허가/세무 판단은 공식 확인 대상으로 분리하고 FLOW 출력은 준비 memo에 한정한다.',
    uxAction: 'financial_sensitive admin Flow에 공식 확인 질문 카드와 caution copy를 고정한다.',
    decision: 'reshape_before_featured',
    scores: {
      actionDensity: 12,
      temporalStructure: 5,
      externalManagementNeed: 16,
      completionClarity: 12,
      personalizationNeed: 9,
      returnValue: 8,
      sourceSpecificityTrust: 10,
      riskBoundaryClarity: 5,
    },
  }),
  defineAudit({
    slug: 'happy-birth-service-check',
    checkedAt: '2026-05-23',
    sourceTitle: '정부24 행복출산 민원 안내',
    sourceUrl: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=17410000001&HighCtgCD=A01004&tp_seq=01',
    sourcePrecision: 'exact',
    sourceUsefulness: '출생신고 후 여러 출산·양육 서비스를 한 번에 신청하는 공식 절차라 가족 정보와 지원 조건 확인 memo로 적합하다.',
    idealReconstruction: '출생일, 거주지, 보호자, 계좌, 서비스 후보를 받아 신청 전 준비 memo와 지자체 확인 질문을 만든다.',
    naturalArtifacts: [
      {
        kind: 'memo',
        artifactTitle: '행복출산 통합신청 전 가족 정보 메모',
        simulatedInputs: ['출생일=2026-06-04', '거주지=서울 마포구', '보호자=부/모', '계좌=부모급여 수령 계좌 확인'],
        expectedOutput: ['출생신고 상태, 신청자 정보, 계좌, 서비스 후보, 거주지별 추가 확인 질문'],
        currentFlowMatch: '통합신청 준비 방향은 맞지만 지역/가구 조건과 민감 가족정보 경계가 더 필요하다.',
        currentUxSupport: 'checklist는 가능하나 가족정보 memo와 공식 확인 대상이 더 분리되어야 한다.',
        gap: '육아 행정 Flow는 지원 가능 여부를 확정하지 않고 신청 전 준비만 돕는 구조가 필요하다.',
      },
    ],
    userJourney: ['출생신고 후 정부24 행복출산 안내를 확인한다.', 'FLOW에 출생일과 거주지, 계좌 준비 상태를 입력한다.', '신청 전 가족정보 memo를 만들고 누락 항목을 체크한다.', '지원 대상과 지급 조건은 정부24/주민센터에서 최종 확인한다.'],
    currentGap: '현재 Flow는 편리하지만 지원 가능 여부를 확정하는 듯한 표현을 더 낮춰야 한다.',
    contentAction: '거주지/가구별 조건, 신청 가능 기간, 지급 여부는 공식 확인 대상으로 분리한다.',
    uxAction: 'childcare admin Flow에 민감 가족정보 warning과 공식확인 checklist를 상단 배치한다.',
    decision: 'reshape_before_featured',
    scores: {
      actionDensity: 12,
      temporalStructure: 7,
      externalManagementNeed: 16,
      completionClarity: 12,
      personalizationNeed: 9,
      returnValue: 8,
      sourceSpecificityTrust: 10,
      riskBoundaryClarity: 5,
    },
  }),
  defineAudit({
    slug: 'industrial-accident-claim-docs',
    checkedAt: '2026-05-23',
    sourceTitle: '정부24 산재보험 요양비청구 민원 안내',
    sourceUrl: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=14900000263&HighCtgCD=A05007&tp_seq=',
    sourcePrecision: 'exact',
    sourceUsefulness: '요양비 청구는 진료비 영수증, 상세내역, 보완 서류, 청구 유형을 관리해야 하므로 sheet-first 준비 Flow 가치가 높다.',
    idealReconstruction: '재해일, 청구 유형, 병원, 영수증 파일, 보완 요청 여부를 받아 증빙 수집 sheet와 공식 확인 memo를 만든다.',
    naturalArtifacts: [
      {
        kind: 'spreadsheet',
        artifactTitle: '산재보험 요양비 청구 증빙 수집표',
        simulatedInputs: ['재해일=2026-05-12', '청구유형=요양비', '병원=OO정형외과', '영수증=3건', '보완요청=미확인'],
        expectedOutput: ['증빙명, 발급처, 날짜, 금액, 파일명, 제출상태, 보완요청 여부 열이 있는 sheet'],
        currentFlowMatch: '서류 수집 방향은 맞지만 급여 가능 여부와 제출 판단 경계가 더 필요하다.',
        currentUxSupport: 'sheet destination은 맞지만 금액/증빙 파일 관리 preview가 약하다.',
        gap: '노무/재정 민감 Flow는 청구 가능 판단과 증빙 정리를 분리해야 한다.',
      },
    ],
    userJourney: ['정부24 안내에서 청구 민원과 구비서류를 확인한다.', 'FLOW에 재해일, 병원, 증빙 파일 상태를 입력한다.', '영수증과 진료비 상세내역을 sheet로 모은다.', '청구 가능 여부와 보완 요청은 공식 창구에서 확인한다.'],
    currentGap: '현재 Flow는 서류 준비에는 맞지만 금전 급여 판단처럼 읽히지 않도록 경계가 필요하다.',
    contentAction: '요양비 지급 가능성은 확정하지 않고 증빙 수집과 공식 확인 질문으로 제한한다.',
    uxAction: 'financial_sensitive claim Flow에 증빙 파일명, 금액, 보완요청 열을 고정한다.',
    decision: 'reshape_before_featured',
    scores: {
      actionDensity: 12,
      temporalStructure: 6,
      externalManagementNeed: 18,
      completionClarity: 12,
      personalizationNeed: 9,
      returnValue: 9,
      sourceSpecificityTrust: 9,
      riskBoundaryClarity: 5,
    },
  }),
  defineAudit({
    slug: 'national-health-checkup-d7',
    checkedAt: '2026-07-11',
    sourceTitle: '국민건강보험 일반건강검진 안내',
    sourceUrl: 'https://www.nhis.or.kr/nhis/healthin/wbhaca04500m01.do',
    sourcePrecision: 'exact',
    sourceUsefulness: '검진 전 예약, 금식, 문진표, 수면내시경 이동 주의가 명확해 D-7 준비 달력으로 적합하지만 의료 판단은 분리해야 한다.',
    idealReconstruction: '검진일, 예약기관, 내시경 여부, 복용약 여부, 이동방법을 받아 준비 달력과 의료진 확인 질문 memo를 만든다.',
    naturalArtifacts: [
      {
        kind: 'monthly_calendar',
        artifactTitle: '국가건강검진 D-7 준비 달력',
        simulatedInputs: ['검진일=2026-06-19', '기관=OO검진센터', '수면내시경=예', '복용약=혈압약', '동행=배우자'],
        expectedOutput: ['D-7 예약 확인', 'D-3 문진표 작성', 'D-1 금식/복용약 문의', 'D-Day 신분증/동행/대중교통 확인'],
        currentFlowMatch: 'timeline은 맞지만 약 복용과 내시경 주의는 기관/의료진 확인으로 더 분리해야 한다.',
        currentUxSupport: 'calendar export는 적합하나 의료 확인 질문 memo가 약하다.',
        gap: '의료 민감 Flow는 준비 일정과 의학적 판단 질문을 분리해야 한다.',
      },
    ],
    userJourney: ['NHIS 안내와 검진기관 예약 문자를 확인한다.', 'FLOW에 검진일, 내시경 여부, 복용약 여부를 입력한다.', 'D-7 준비 달력을 만들고 금식/이동/신분증을 체크한다.', '약 복용과 검사별 주의는 검진기관 또는 의료진에게 확인한다.'],
    currentGap: '현재 Flow는 검진 준비에 맞지만 의료 지시처럼 읽히지 않도록 질문 memo가 필요하다.',
    contentAction: '금식, 복용약, 수면내시경 이동은 공식/기관 확인 항목으로 분리한다.',
    uxAction: 'medical_sensitive timeline에 의료진 확인 질문 memo와 warning card를 고정한다.',
    decision: 'reshape_before_featured',
    scores: {
      actionDensity: 13,
      temporalStructure: 14,
      externalManagementNeed: 18,
      completionClarity: 12,
      personalizationNeed: 9,
      returnValue: 8,
      sourceSpecificityTrust: 10,
      riskBoundaryClarity: 5,
    },
  }),
  defineAudit({
    slug: 'vaccination-certificate-issue',
    checkedAt: '2026-05-23',
    sourceTitle: '정부24 예방접종증명 민원 안내',
    sourceUrl: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=14600000398&HighCtgCD=A05004',
    sourcePrecision: 'exact',
    sourceUsefulness: '예방접종증명 발급은 본인/자녀, 국문/영문, 제출처 요구 형식 확인이 중요해 발급 memo Flow로 적합하다.',
    idealReconstruction: '제출처, 대상자, 언어, 필요한 접종 항목, 누락 의심 여부를 받아 발급 전 확인 memo와 제출 파일명 기록을 만든다.',
    naturalArtifacts: [
      {
        kind: 'memo',
        artifactTitle: '예방접종증명 제출 요구사항 메모',
        simulatedInputs: ['제출처=어린이집', '대상=자녀', '언어=국문', '필요항목=전체', '누락의심=B형간염'],
        expectedOutput: ['대상자, 증명 언어, 포함 항목, 발급 경로, 누락 확인처, 제출 파일명'],
        currentFlowMatch: '발급 경로 checklist는 맞지만 접종 누락 확인과 제출처 요구 형식이 더 구조화되어야 한다.',
        currentUxSupport: 'memo export는 가능하나 자녀/언어/항목 선택 preview가 약하다.',
        gap: '의료 증명 Flow는 접종 이력 판단이 아니라 제출 요구사항 정리여야 한다.',
      },
    ],
    userJourney: ['제출처에서 요구하는 증명 언어와 항목을 확인한다.', 'FLOW에 대상자와 제출처 요구사항을 입력한다.', '정부24에서 증명서를 발급하고 파일명을 memo에 남긴다.', '누락 기록은 공식 시스템에서 확인한다.'],
    currentGap: '현재 Flow는 발급 순서는 맞지만 의료기록 누락 판단 경계가 약하다.',
    contentAction: '접종 이력 누락/수정은 공식 기관 확인으로 분리하고 FLOW는 발급 준비 memo로 제한한다.',
    uxAction: 'certificate Flow에 대상자, 언어, 제출처 요구사항 입력 카드를 추가한다.',
    decision: 'reshape_before_featured',
    scores: {
      actionDensity: 12,
      temporalStructure: 4,
      externalManagementNeed: 15,
      completionClarity: 13,
      personalizationNeed: 8,
      returnValue: 8,
      sourceSpecificityTrust: 10,
      riskBoundaryClarity: 5,
    },
  }),
  defineAudit({
    slug: 'job-change-risk-check',
    checkedAt: '2026-05-23',
    sourceTitle: '이직 준비 체크리스트 참고 및 고용보험·퇴직급여 공식 확인',
    sourceUrl: 'https://luckysuni-diary.tistory.com/102',
    sourcePrecision: 'exact',
    sourceUsefulness: '이직 전 리스크는 경험형 checklist가 유용하지만 퇴직급여, 고용보험, 공백 기간 처리는 공식 확인과 분리해야 한다.',
    idealReconstruction: '퇴사예정일, 입사예정일, 공백일수, 퇴직급여/고용보험 확인 상태를 받아 개인 판단 memo와 공식 확인 질문표를 만든다.',
    naturalArtifacts: [
      {
        kind: 'memo',
        artifactTitle: '이직 전 공백·급여·보험 리스크 메모',
        simulatedInputs: ['퇴사예정=2026-06-30', '입사예정=2026-07-15', '공백=14일', '퇴직급여=IRP 필요', '고용보험=이직확인서 확인'],
        expectedOutput: ['퇴사 통보 상태, 장비 반납, 급여/퇴직급여 예상일, 고용보험 확인 질문, 공백기간 생활비 memo'],
        currentFlowMatch: '퇴사 절차와 재정 안전장치 item은 맞지만 법적/재정 판단 경계가 더 선명해야 한다.',
        currentUxSupport: 'memo destination은 맞지만 공식 확인 질문과 개인 판단 memo가 섞여 보인다.',
        gap: '커리어 리스크 Flow는 조언이 아니라 확인해야 할 질문 목록과 개인 기록이어야 한다.',
      },
    ],
    userJourney: ['이직 경험 checklist를 보고 놓칠 항목을 파악한다.', 'FLOW에 퇴사/입사 예정일과 공백 기간을 입력한다.', '회사 확인 질문과 개인 재정 memo를 분리해 작성한다.', '퇴직급여, 고용보험, 법적 쟁점은 공식기관/전문가에게 확인한다.'],
    currentGap: '현재 Flow는 실행 체크에는 맞지만 재정·노무 조언처럼 읽힐 여지가 있다.',
    contentAction: '회사 내 절차, 고용보험, 퇴직급여, 생활비 memo를 분리하고 확정 판단을 피한다.',
    uxAction: 'career financial Flow에 official-confirmation questions와 personal-risk memo를 별도 섹션으로 둔다.',
    decision: 'reshape_before_featured',
    scores: {
      actionDensity: 12,
      temporalStructure: 6,
      externalManagementNeed: 16,
      completionClarity: 12,
      personalizationNeed: 9,
      returnValue: 8,
      sourceSpecificityTrust: 7,
      riskBoundaryClarity: 5,
    },
  }),
  defineAudit({
    slug: 'new-apartment-precheck',
    checkedAt: '2026-07-11',
    sourceTitle: '신축 아파트 입주 사전점검 체크리스트 참고',
    sourceUrl: 'https://blog.naver.com/PostView.naver?blogId=juniorhome&logNo=223358772350',
    sourcePrecision: 'broad',
    sourceUsefulness:
      '입주 사전점검은 준비물, 공간별 하자 확인, 보수 요청 목록 전달이라는 실행 단위가 분명해서 체크리스트 Flow stress fixture로 적합하다. 다만 사용자가 원문을 수동 확인하기 전까지는 대표 콘텐츠로 확정하지 않는다.',
    idealReconstruction:
      '사전점검일을 기준으로 준비물 체크, 공간별 점검, 하자 위치 메모, 보수 요청 전달 상태를 최소 입력 체크리스트로 만든다.',
    naturalArtifacts: [
      {
        kind: 'checklist',
        artifactTitle: '입주 사전점검 당일 체크리스트',
        simulatedInputs: ['사전점검일=2026-06-08', '주택=신축 아파트', '동행자=2명', '중점=전기/창호/욕실/수납'],
        expectedOutput: [
          '준비물 챙기기',
          '공간별 하자 위치 메모',
          '보수 요청 목록 정리',
          '관리사무소 전달 상태 체크',
        ],
        currentFlowMatch: '체크리스트 구조는 맞지만 사진/증빙 입력을 기본으로 강제하면 사용자가 부담을 느낄 수 있다.',
        currentUxSupport: 'UX12 상세 메모에 위치와 요청 내용을 적을 수 있어 P0 검증에는 충분하다.',
        gap: '하자 사진은 선택 정보로 두고, 월간 캘린더보다 선택 날짜/상세 sheet에서 처리해야 한다.',
      },
    ],
    userJourney: [
      '입주 사전점검 글을 보고 점검일을 정한다.',
      'FLOW에서 준비물과 공간별 점검 항목을 체크한다.',
      '하자 위치와 보수 요청 내용을 메모로 남긴다.',
      '전달 완료 여부만 체크하고 사진 첨부는 선택으로 둔다.',
    ],
    currentGap:
      '현재 UX12는 기능적으로 버티지만, 항목이 많아지면 월간 셀보다 선택 날짜 상세 영역에서 핵심 체크를 보여줘야 한다.',
    contentAction:
      '사용자가 원문을 확인한 뒤 실제 글에 없는 상세 문구를 제거하고 준비물/공간별 점검/보수 요청만 남긴다.',
    uxAction:
      '체크리스트 Flow에서 첨부, 하자 사진, 위치 기록은 더보기 또는 선택 메모로 내려 입력 복잡도를 낮춘다.',
    decision: 'catalog_preview_only',
    scores: {
      actionDensity: 13,
      temporalStructure: 10,
      externalManagementNeed: 17,
      completionClarity: 13,
      personalizationNeed: 8,
      returnValue: 8,
      sourceSpecificityTrust: 7,
      riskBoundaryClarity: 4,
    },
  }),
  defineAudit({
    slug: 'japan-esim-setup-before-departure',
    checkedAt: '2026-07-11',
    sourceTitle: '일본 eSIM 사용 후기와 설치 순서 참고',
    sourceUrl: 'https://blog.naver.com/PostView.naver?blogId=travelnote_jp&logNo=223529001204',
    sourcePrecision: 'broad',
    sourceUsefulness:
      'eSIM은 구매, 기기 지원 확인, QR 설치, 공항 도착 후 회선 전환이라는 단계가 날짜와 강하게 연결되어 calendar+memo Flow 검증에 적합하다. 원문 수동 확인 전까지는 보강 대상으로 둔다.',
    idealReconstruction:
      '출국일을 기준으로 D-2 구매/기기 확인, D-1 프로필 설치, 공항 도착 후 현지 회선 켜기, 연결 확인 메모를 만든다.',
    naturalArtifacts: [
      {
        kind: 'monthly_calendar',
        artifactTitle: '일본 eSIM 출국 전 준비 캘린더',
        simulatedInputs: ['출국일=2026-06-20', '여행지=일본', '휴대폰=eSIM 지원', '구매처=온라인'],
        expectedOutput: [
          'D-2 eSIM 상품과 기기 지원 확인',
          'D-1 eSIM 프로필 미리 설치',
          'D-Day 공항 도착 후 현지 회선 켜기',
          '연결 확인 메모',
        ],
        currentFlowMatch: '짧은 timeline Flow로 잘 맞고, 캘린더 항목은 제목만 보여도 충분하다.',
        currentUxSupport: '상세 메모에 QR 링크, 구매처, 설치 방법을 담을 수 있다.',
        gap: '캘린더 셀에 설명을 넣지 말고 상세 sheet 메모로 넘겨야 모바일 밀도가 낮다.',
      },
    ],
    userJourney: [
      '여행 준비 글을 보고 출국일을 입력한다.',
      '구매와 설치 날짜를 캘린더에서 확인한다.',
      '상세 메모에서 구매 링크와 설치 순서를 다시 본다.',
      '현지 도착 후 연결 여부만 완료 체크한다.',
    ],
    currentGap:
      '현재 UX12는 짧은 timeline을 잘 처리하지만, 원문에 없는 과도한 troubleshooting은 빼야 한다.',
    contentAction:
      '사용자 원문 확인 후 구매/설치/회선 전환에 직접 연결되지 않는 설명을 제거하고 링크 메모 중심으로 정리한다.',
    uxAction:
      '여행 준비 Flow에서는 장소/첨부보다 날짜, 링크, 메모를 우선 노출하고 나머지는 더보기로 내린다.',
    decision: 'catalog_preview_only',
    scores: {
      actionDensity: 13,
      temporalStructure: 14,
      externalManagementNeed: 17,
      completionClarity: 13,
      personalizationNeed: 7,
      returnValue: 8,
      sourceSpecificityTrust: 7,
      riskBoundaryClarity: 4,
    },
  }),
  defineAudit({
    slug: 'dog-adoption-first-week',
    checkedAt: '2026-06-04',
    sourceTitle: '강아지 입양 전 준비 가이드 참고',
    sourceUrl: 'https://www.gomin77.co.kr/blog/dog-puppy-pet-adoption',
    sourcePrecision: 'exact',
    sourceUsefulness:
      '입양 첫 주는 준비물, 안정 공간, 병원 예약, 등록 확인처럼 사용자가 따라할 행동이 있지만 건강 판단처럼 보이지 않도록 경계가 필요하다.',
    idealReconstruction:
      '입양일을 기준으로 D-1 준비물/공간, D+1 적응 확인, D+3 병원 예약, D+7 등록/생활 루틴 확인을 만들고 건강 판단은 병원 상담 메모로 분리한다.',
    naturalArtifacts: [
      {
        kind: 'monthly_calendar',
        artifactTitle: '강아지 입양 첫 주 체크 캘린더',
        simulatedInputs: ['입양일=2026-06-05', '반려견=강아지', '첫 병원=미정', '등록상태=미정'],
        expectedOutput: [
          'D-1 밥그릇/배변패드/이동장 준비',
          'D-Day 안정 공간 마련',
          'D+3 동물병원 예약 메모',
          'D+7 동물등록 확인',
        ],
        currentFlowMatch: '입양일 기준 timeline으로 맞지만 민감한 건강 판단은 Flow가 결론내리면 안 된다.',
        currentUxSupport: '경고 문구와 상세 메모로 병원 상담 필요 항목을 분리할 수 있다.',
        gap: '증상 기록이나 판단 로직을 넣으면 앱이 무거워지므로 첫 주 실행 체크에 제한해야 한다.',
      },
    ],
    userJourney: [
      '입양 준비 글을 보고 입양일을 입력한다.',
      '첫 주 준비물과 생활 공간 체크만 완료한다.',
      '병원 상담이 필요한 내용은 메모에 적고 판단은 하지 않는다.',
      '등록/예약처럼 명확한 완료 기준만 체크한다.',
    ],
    currentGap:
      '현재 UX12는 hybrid Flow를 보여줄 수 있지만, 건강/훈련 조언까지 확장하면 입력 복잡도와 위험이 커진다.',
    contentAction:
      '원문 수동 확인 뒤 준비물, 공간, 병원 예약, 등록 확인만 남기고 건강 판단/훈련 조언은 주의 메모로 낮춘다.',
    uxAction:
      '반려동물 Flow는 루틴 앱처럼 확장하지 말고 첫 주 일정과 체크 중심으로 유지한다.',
    decision: 'reshape_before_featured',
    scores: {
      actionDensity: 12,
      temporalStructure: 13,
      externalManagementNeed: 16,
      completionClarity: 12,
      personalizationNeed: 8,
      returnValue: 8,
      sourceSpecificityTrust: 7,
      riskBoundaryClarity: 5,
    },
  }),
  defineAudit({
    slug: 'washer-tub-clean-monthly',
    checkedAt: '2026-07-11',
    sourceTitle: '세탁기 통세척 방법 완벽 가이드',
    sourceUrl: 'https://raga-t.com/entry/%EC%84%B8%ED%83%81%EA%B8%B0-%ED%86%B5%EC%84%B8%EC%B2%99-%EB%B0%A9%EB%B2%95-%EC%99%84%EB%B2%BD-%EA%B0%80%EC%9D%B4%EB%93%9C',
    sourcePrecision: 'exact',
    sourceUsefulness:
      '세탁조 청소, 문 열어 건조, 고무패킹, 세제통, 배수필터처럼 반복 관리로 옮길 수 있는 실행 단서가 분명하다. 다만 제조사/모델별 차이는 원문 참고와 사용자 메모로 분리해야 한다.',
    idealReconstruction:
      '시작일과 반복 주기를 입력하면 월 1회 통세척 일정이 생기고, 해당 날짜 상세에서 통세척 실행, 문 열어 건조, 고무패킹/세제통/배수필터 확인 체크리스트를 완료한다.',
    naturalArtifacts: [
      {
        kind: 'routine_calendar',
        artifactTitle: '세탁기 통세척 월간 캘린더',
        simulatedInputs: ['시작일=2026-06-10', '반복=매월', '세탁기=드럼 세탁기'],
        expectedOutput: [
          '매월 10일 통세척 일정',
          '상세 체크리스트: 통세척, 문 열어 건조, 고무패킹, 세제통, 배수필터',
          '다음 관리일 자동 유지',
        ],
        currentFlowMatch: '월간 reminder와 통세척·건조·고무패킹·세제통·배수필터 확인이 한 루틴으로 정리되어 있다.',
        currentUxSupport: '세부 체크와 원문 링크를 유지하면서 모델 설명서가 세제·코스·관리 주기보다 우선한다고 안내한다.',
        gap: '없음. 월간 일정은 확인 reminder이며 모델별 공식 주기를 대체하지 않는다.',
      },
    ],
    userJourney: [
      '사용자가 세탁기 관리 글을 보고 월 1회 반복 관리로 저장한다.',
      '캘린더에서 이번 달 통세척 일정을 연다.',
      '통세척 실행 후 문 열어 건조, 고무패킹, 세제통, 배수필터를 체크한다.',
      '특이사항만 메모하고 다음 달 반복 일정은 유지한다.',
    ],
    currentGap: '현재 Flow는 세 항목만 유지하고 사진 증빙이나 임의 화학제품 용량을 요구하지 않는다.',
    contentAction: '모델별 설명서 우선 원칙과 세탁물 없이 실행하는 주의를 유지한다.',
    uxAction: '월간 reminder와 세부 확인 항목을 같은 완료 수준으로 혼동하지 않게 유지한다.',
    decision: 'keep_representative',
    scores: {
      actionDensity: 12,
      temporalStructure: 12,
      externalManagementNeed: 16,
      completionClarity: 12,
      personalizationNeed: 8,
      returnValue: 7,
      sourceSpecificityTrust: 7,
      riskBoundaryClarity: 4,
    },
  }),
  defineAudit({
    slug: 'monstera-care-routine',
    checkedAt: '2026-06-06',
    sourceTitle: '몬스테라 물주기·분갈이 루틴 참고',
    sourceUrl: 'https://jhbd2.tistory.com/178',
    sourcePrecision: 'exact',
    sourceUsefulness:
      '겉흙 2~3cm, 밝은 간접광, 배수구멍, 잎 상태, 분갈이처럼 초보 식물 관리자가 반복 확인할 수 있는 단서가 있다. 식물 상태 판단은 확정 조언이 아니라 관찰 체크로 표현해야 한다.',
    idealReconstruction:
      '7~10일마다 물주기 판단 루틴을 만들고, 상세에서 겉흙 확인, 간접광/배수구멍 확인, 잎 상태 메모를 체크한다. 분갈이는 6개월마다 별도 장기 체크로 둔다.',
    naturalArtifacts: [
      {
        kind: 'routine_calendar',
        artifactTitle: '몬스테라 7~10일 관리 캘린더',
        simulatedInputs: ['시작일=2026-06-07', '반복=10일마다', '식물=몬스테라'],
        expectedOutput: [
          '10일마다 몬스테라 상태 확인 일정',
          '상세 체크리스트: 겉흙 2~3cm, 밝은 간접광, 배수구멍, 잎 상태',
          '6개월마다 분갈이 필요 확인',
        ],
        currentFlowMatch: 'routine 구조는 맞지만 캘린더 item에서 세부 체크가 보여야 실제 루틴처럼 작동한다.',
        currentUxSupport: '식물 루틴은 사진 기록보다 관찰 메모와 다음 확인일이 우선이다.',
        gap: '대표 노출 전에는 물주기 주기 변경과 6개월 장기 체크가 한 화면에서 과하게 섞이지 않도록 정리해야 한다.',
      },
    ],
    userJourney: [
      '초보 식물 사용자가 시작일과 확인 주기를 고른다.',
      '캘린더에서 몬스테라 루틴을 열어 겉흙과 빛/배수 상태를 확인한다.',
      '잎 상태에 특이사항이 있을 때만 짧게 메모한다.',
      '분갈이 확인은 별도 장기 체크로 남긴다.',
    ],
    currentGap:
      '루틴 앱처럼 과하게 확장하기보다 FlowMe 안에서는 반복 일정, 내부 체크리스트, 메모, 다음 확인일까지만 유지해야 한다.',
    contentAction:
      '물주기 판단과 환경 확인을 3~4개 체크로 줄이고, 분갈이는 장기 체크 항목으로 분리한다.',
    uxAction:
      '반복 일정 상세에서 세부 체크리스트와 주기 변경 저장/취소를 명확히 보여준다.',
    decision: 'reshape_before_featured',
    scores: {
      actionDensity: 11,
      temporalStructure: 12,
      externalManagementNeed: 15,
      completionClarity: 12,
      personalizationNeed: 8,
      returnValue: 7,
      sourceSpecificityTrust: 7,
      riskBoundaryClarity: 4,
    },
  }),
  defineAudit({
    slug: 'water-purifier-filter-cycle',
    checkedAt: '2026-06-06',
    sourceTitle: '정수기 필터 교체 주기표 참고',
    sourceUrl: 'https://pihamadam.tistory.com/267',
    sourcePrecision: 'exact',
    sourceUsefulness:
      '필터 종류별 교체 주기, 코크/출수구, 자가 살균, 물맛·냄새 확인처럼 사용자가 주기표와 메모로 관리할 수 있는 단서가 있다. 모델별 공식 주기는 사용자 입력과 원문/제조사 확인으로 분리해야 한다.',
    idealReconstruction:
      '정수기 모델과 필터 구성을 입력하면 필터별 마지막 교체일, 다음 교체 기준일, 코크/출수구 점검, 물맛·냄새 메모를 한 시트에서 관리한다.',
    naturalArtifacts: [
      {
        kind: 'spreadsheet',
        artifactTitle: '정수기 필터 교체 주기표',
        simulatedInputs: ['모델=퓨리케어', '필터=침전/프리/RO', '마지막 교체일=2026-06-01'],
        expectedOutput: [
          '필터별 마지막 교체일',
          '다음 교체 기준일',
          '코크/출수구 자가 살균 여부',
          '물맛·냄새 메모',
        ],
        currentFlowMatch: 'sheet-first 구조가 맞고 public route에서 workbench형 실행 표면으로 확인할 수 있다.',
        currentUxSupport: '캘린더보다 필터별 표와 다음 교체 기준일이 먼저 보여야 한다.',
        gap: '대표 노출 전에는 제조사별 주기를 Flow가 확정하지 않고 사용자가 모델 기준을 넣는 구조가 더 명확해야 한다.',
      },
    ],
    userJourney: [
      '사용자가 정수기 모델과 필터 구성을 입력한다.',
      '필터별 마지막 교체일과 다음 교체 기준을 표로 본다.',
      '코크/출수구 상태와 물맛·냄새만 짧게 메모한다.',
      '교체 완료 후 다음 기준일을 갱신한다.',
    ],
    currentGap:
      '필터 주기를 Flow가 일괄 확정하는 것처럼 보이면 안 되고, 모델별 기준 입력과 원문 링크 확인이 가까이 있어야 한다.',
    contentAction:
      '필터별 주기표, 코크/출수구 점검, 물맛·냄새 메모만 남기고 구매/분해/전문 수리는 외부 링크로 분리한다.',
    uxAction:
      'sheet-first Flow에서는 캘린더 카드보다 필터별 행, 다음 교체일, 완료 체크를 첫 화면에 둔다.',
    decision: 'reshape_before_featured',
    scores: {
      actionDensity: 12,
      temporalStructure: 10,
      externalManagementNeed: 17,
      completionClarity: 12,
      personalizationNeed: 8,
      returnValue: 8,
      sourceSpecificityTrust: 7,
      riskBoundaryClarity: 4,
    },
  }),
  defineAudit({
    slug: 'plank-30-day-challenge',
    checkedAt: '2026-06-07',
    sourceTitle: '플랭크 30일 챌린지 계획표 공유',
    sourceUrl:
      'https://khj2510.tistory.com/entry/%ED%94%8C%EB%9E%AD%ED%81%AC-30%EC%9D%BC-%EC%B1%8C%EB%A6%B0%EC%A7%80-%EA%B3%84%ED%9A%8D%ED%91%9C-%EA%B3%B5%EC%9C%A0',
    sourcePrecision: 'exact',
    sourceUsefulness:
      '원문에 Day별 초수, 체크 포인트, 휴식일이 표로 정리되어 있어 시작일 기준 캘린더로 옮기기 좋다. 다만 운동 효과 문구와 개인 블로그 성격은 실행 계획과 분리해야 한다.',
    idealReconstruction:
      '사용자가 챌린지 시작일을 입력하면 Day 1~30 목표 초수와 Day 7·19·27 휴식일이 캘린더에 들어가고, 상세에는 오늘 체크포인트, 완료/조정 메모, 중단 조건, 원문 링크만 남는다.',
    naturalArtifacts: [
      {
        kind: 'monthly_calendar',
        artifactTitle: '30일 플랭크 챌린지 캘린더',
        simulatedInputs: ['시작일=2026-06-01', '목표=원문표 그대로', '완료 방식=완료/조정 메모'],
        expectedOutput: [
          '2026-06-01 Day 1 플랭크 20초',
          '2026-06-07 Day 7 휴식·스트레칭',
          '2026-06-19 Day 19 휴식·스트레칭',
          '2026-06-30 Day 30 플랭크 150초',
        ],
        currentFlowMatch: 'public route는 원문 표의 30개 행을 캘린더 item으로 보존한다.',
        currentUxSupport: '캘린더와 실행 리스트는 맞지만 실제 사용자가 원문 대비 초수/휴식일을 바로 이해하는지는 관찰 세션에서 확인해야 한다.',
        gap: '운동 기록을 무겁게 만들지 않고 완료/조정/중단 메모만 남기는지 모바일에서 확인해야 한다.',
      },
    ],
    userJourney: [
      '사용자가 원문 계획표를 읽고 챌린지 시작일을 입력한다.',
      '캘린더에서 오늘 Day 목표 초수와 체크포인트를 확인한다.',
      '완료했거나 목표를 낮춘 이유를 짧게 메모한다.',
      '휴식일에는 플랭크 완료가 아니라 회복/스트레칭으로 표시한다.',
    ],
    currentGap:
      '원문 표는 Flow 전환에 적합하지만 운동 민감 영역이라 효과 보장처럼 보이면 안 되고, 실제 사용자 세션에서 원문 대비 실행 이해도를 확인해야 한다.',
    contentAction:
      'Day별 초수, 체크포인트, 휴식일만 유지하고 효과/식단/다음 단계 설명은 메모나 원문 링크로 낮춘다.',
    uxAction:
      '시작일 입력 후 캘린더 날짜와 상세 item에서 원문 목표 초수, 휴식일, 중단 조건이 바로 보이는지 검증한다.',
    decision: 'reshape_before_featured',
    scores: {
      actionDensity: 12,
      temporalStructure: 14,
      externalManagementNeed: 16,
      completionClarity: 13,
      personalizationNeed: 8,
      returnValue: 8,
      sourceSpecificityTrust: 7,
      riskBoundaryClarity: 4,
    },
  }),
];

const promotedNeedsReviewManualAudits: SourceFitAudit[] = [
  defineAudit({
    slug: 'kids-printable-squishy-craft',
    checkedAt: '2026-06-18',
    sourceTitle: 'Makeit DIY printable squishy craft post',
    sourceUrl: 'https://blog.naver.com/PostView.naver?blogId=makeitdiy&logNo=223260911491',
    sourcePrecision: 'exact',
    sourceUsefulness:
      'The creator post gives a concrete printable-craft premise, but FLOW should only preserve the source link, preparation checklist, and lightweight execution steps without copying downloadable assets.',
    idealReconstruction:
      'The user confirms the original post and usage conditions, prepares paper/coating materials, completes one craft session, and leaves only a short next-craft memo.',
    naturalArtifacts: [
      {
        kind: 'checklist',
        artifactTitle: 'Printable squishy craft prep checklist',
        simulatedInputs: ['craftDate=2026-06-22', 'materials=paper, coating film, tape', 'assetStorage=source only'],
        expectedOutput: [
          'Confirm original post and usage condition',
          'Prepare printable and coating materials',
          'Finish one craft session',
          'Leave next-craft memo without storing child photos or files',
        ],
        currentFlowMatch:
          'The public route already keeps the source as a link and frames the craft as preparation plus execution checks.',
        currentUxSupport:
          'Warnings separate source-file access from FLOW state and keep photos or child-development notes out of the default record.',
        gap:
          'It still needs review wording so the route cannot be read as redistributing printable assets or evaluating a child activity outcome.',
      },
    ],
    userJourney: [
      'The caregiver opens the source post to confirm the printable material and usage terms.',
      'FLOW helps prepare materials and run one craft session.',
      'The result is recorded only as a lightweight next-craft memo, not copied files or child records.',
    ],
    currentGap:
      'Good as a public craft-prep flow, but the source boundary and no-file-storage rule must remain visible before any featured promotion.',
    contentAction:
      'Keep the source link, material prep, cleanup, and next-craft memo. Do not copy images, PDFs, passwords, child photos, or educational assessment records into FLOW.',
    uxAction:
      'Keep source confirmation near the first action and make optional memo/photo behavior clearly non-default.',
    decision: 'reshape_before_featured',
    scores: {
      actionDensity: 12,
      temporalStructure: 8,
      externalManagementNeed: 15,
      completionClarity: 12,
      personalizationNeed: 7,
      returnValue: 7,
      sourceSpecificityTrust: 8,
      riskBoundaryClarity: 5,
    },
  }),
  defineAudit({
    slug: 'remote-help-session-precheck',
    checkedAt: '2026-06-18',
    sourceTitle: 'Remote support official help documents',
    sourceUrl: 'https://support.anydesk.com/v1/docs/connect-to-a-remote-client',
    sourcePrecision: 'broad',
    sourceUsefulness:
      'The route synthesizes common permission and session-ending checks across official remote-support documents, but it is not tied to one exact product journey.',
    idealReconstruction:
      'The user confirms the helper, task scope, screen-sharing/control mode, one-time access preference, and session end state without storing codes, IDs, links, tokens, screenshots, or chat logs.',
    naturalArtifacts: [
      {
        kind: 'checklist',
        artifactTitle: 'Remote help permission precheck',
        simulatedInputs: ['helper=known person', 'mode=screen share first', 'accessStorage=none'],
        expectedOutput: [
          'Confirm helper and task scope',
          'Choose screen share or remote control',
          'Avoid repeated unattended access unless separately verified',
          'End session and confirm permissions are closed',
        ],
        currentFlowMatch:
          'The public route is already a permission checklist and avoids acting as a remote-support tool itself.',
        currentUxSupport:
          'Warnings keep security judgment, identity verification, and access values outside FLOW.',
        gap:
          'Because the source is broad and multi-product, the route should stay catalog-preview or internal-check until an exact official journey is selected.',
      },
    ],
    userJourney: [
      'The user receives a remote-help request and checks who is helping and what task is being done.',
      'FLOW separates view-only screen sharing from remote control and repeated access.',
      'The user ends the session and confirms no access value was saved in FLOW.',
    ],
    currentGap:
      'Useful as a safety checklist, but the broad source mix makes it unsuitable for representative promotion.',
    contentAction:
      'Keep common permission checks and no-secret-storage warnings, then replace the source with one exact official product journey before promotion.',
    uxAction:
      'Keep access-code and session-link fields out of the UI and show end-session cleanup as the final action.',
    decision: 'catalog_preview_only',
    scores: {
      actionDensity: 9,
      temporalStructure: 6,
      externalManagementNeed: 12,
      completionClarity: 10,
      personalizationNeed: 6,
      returnValue: 6,
      sourceSpecificityTrust: 4,
      riskBoundaryClarity: 5,
    },
  }),
  defineAudit({
    slug: 'fridge-cleanout-weekly-plan',
    checkedAt: '2026-07-11',
    sourceTitle: 'Creator fridge cleanout 7-day meal-plan post',
    sourceUrl:
      'https://smilellama.tistory.com/entry/%EC%9B%94-10%EB%A7%8C-%EC%9B%90-%EC%8B%9D%EB%B9%84-%EC%A0%88%EC%95%BD-%EC%A0%9C%EA%B0%80-%EC%84%B1%EA%B3%B5%ED%95%9C-%EB%83%89%EC%9E%A5%EA%B3%A0-%ED%8C%8C%EB%A8%B9%EA%B8%B0-7%EC%9D%BC-%EC%8B%9D%EB%8B%A8-%ED%94%8C%EB%9E%9C-%EC%95%8C%EB%9C%B0-%EC%9E%A5%EB%B3%B4%EA%B8%B0-%ED%8C%81-%ED%8F%AC%ED%95%A8',
    sourcePrecision: 'exact',
    sourceUsefulness:
      'The creator post has a concrete weekly cleanout premise, but FLOW should treat it as inventory triage and menu-option notes rather than nutrition, savings, or food-safety advice.',
    idealReconstruction:
      'The user chooses three priority ingredients, maps them to menu options over seven days, records hold/buy decisions, and keeps safety judgment outside FLOW.',
    naturalArtifacts: [
      {
        kind: 'spreadsheet',
        artifactTitle: '7-day fridge cleanout inventory sheet',
        simulatedInputs: ['startDate=2026-06-18', 'priorityIngredients=tofu, spinach, eggs', 'safetyCheck=user judgment'],
        expectedOutput: [
          'Pick three priority ingredients',
          'Create menu-option rows for days 1-7',
          'Separate use, hold, and buy decisions',
          'Keep spoilage and nutrition judgment outside FLOW',
        ],
        currentFlowMatch:
          'The public route already reduces the source to an inventory sheet and avoids diet-result claims.',
        currentUxSupport:
          'The setup hint and warning make it clear that FLOW is not evaluating food safety, nutrition balance, or savings outcomes.',
        gap:
          'No blocking gap. The route keeps creator budgeting claims out of FLOW and retains only inventory and menu-option records.',
      },
    ],
    userJourney: [
      'The user opens the creator post and chooses a practical cleanout start date.',
      'FLOW helps identify priority ingredients and plan rough menu options.',
      'The user decides what to use, hold, buy, or discard outside FLOW judgment.',
    ],
    currentGap:
      'The first screen and export keep food safety, nutrition, and savings judgments outside FLOW.',
    contentAction:
      'Keep priority ingredients, menu options, hold/buy rows, and discard notes. Remove savings guarantees, nutrition balancing, and food-safety conclusions.',
    uxAction:
      'Show the inventory sheet first and keep safety warnings close to ingredient rows.',
    decision: 'keep_representative',
    scores: {
      actionDensity: 12,
      temporalStructure: 12,
      externalManagementNeed: 17,
      completionClarity: 12,
      personalizationNeed: 8,
      returnValue: 8,
      sourceSpecificityTrust: 8,
      riskBoundaryClarity: 5,
    },
  }),
  defineAudit({
    slug: 'alt-phone-sk7-self-activation',
    checkedAt: '2026-06-08',
    sourceTitle: '알뜰폰 SK7모바일 셀프개통 후기',
    sourceUrl: 'https://blog.naver.com/PostView.nhn?blogId=saljjak-&logNo=223661947600',
    sourcePrecision: 'exact',
    sourceUsefulness:
      '셀프개통 가능 시간, 유심 일련번호, 번호이동 사전동의, 개통 완료 확인처럼 사용자가 순서대로 따라야 하는 디지털 절차 단서가 명확하다.',
    idealReconstruction:
      '개통 예정일과 가입유형을 입력하면 준비물 확인, 유심 정보 입력, 번호이동 사전동의, 개통 후 통화/데이터 확인이 민감정보 저장 없이 체크리스트로 남는다.',
    naturalArtifacts: [
      {
        kind: 'checklist',
        artifactTitle: 'SK7 셀프개통 순서 체크',
        simulatedInputs: ['개통일=2026-06-14', '가입유형=번호이동', '유심=보유'],
        expectedOutput: ['개통 가능 시간 확인', '유심 일련번호는 통신사 화면에만 입력', '번호이동 사전동의 처리', '통화/데이터 연결 확인'],
        currentFlowMatch: 'public route는 내부 체크리스트로 개통 전-진행-완료 단계를 분리한다.',
        currentUxSupport: '개통 화면처럼 보이지 않고 민감정보 미저장 안내를 상세에 둔다.',
        gap: '통신사별 최신 요금제와 인증 조건은 FLOW가 판단하지 않고 공식 안내 확인으로 남겨야 한다.',
      },
    ],
    userJourney: [
      '사용자가 셀프개통 후기를 보고 개통 예정일과 가입유형을 정한다.',
      'FLOW에서 유심, 번호이동, 사전동의, 개통 확인만 체크한다.',
      '민감한 주민등록번호, 인증값, 카드 정보는 통신사 화면에만 입력한다.',
    ],
    currentGap:
      '절차 실행성은 충분하지만 최신 요금제/본인인증 조건은 변동되므로 대표 노출 전 공식 안내 링크와 주의 문구를 계속 분리해야 한다.',
    contentAction:
      '후기 기반 순서는 유지하되 유심 일련번호, 인증값, 결제정보를 FLOW 입력값으로 받지 않는다는 문구를 상세와 export에 유지한다.',
    uxAction:
      '체크리스트 첫 화면에서 개통 가능 시간과 준비물만 보이고, 민감정보는 통신사 화면에서만 입력한다는 경고를 버튼 근처에 둔다.',
    decision: 'reshape_before_featured',
    scores: {
      actionDensity: 12,
      temporalStructure: 8,
      externalManagementNeed: 15,
      completionClarity: 13,
      personalizationNeed: 7,
      returnValue: 8,
      sourceSpecificityTrust: 7,
      riskBoundaryClarity: 5,
    },
  }),
  defineAudit({
    slug: 'infant-health-checkup-prep',
    checkedAt: '2026-07-11',
    sourceTitle: '국민건강보험 영유아 건강검진 안내',
    sourceUrl: 'https://www.nhis.or.kr/nhis/healthin/wbhaca04800m01.do',
    sourcePrecision: 'exact',
    sourceUsefulness:
      '검진 가능 기간, 검진기관 예약, 웹 문진표와 발달선별검사지, 등록번호 전달처럼 방문 전 준비 행동이 공식 안내에 분리되어 있다.',
    idealReconstruction:
      '검진 예정일과 기관 후보를 입력하면 기간 확인, 예약, 문진표 작성, 등록번호 위치 확인, D-Day 방문 준비가 의료 결과 기록 없이 생성된다.',
    naturalArtifacts: [
      {
        kind: 'monthly_calendar',
        artifactTitle: '영유아 건강검진 방문 준비 캘린더',
        simulatedInputs: ['검진일=2026-07-03', '아이월령=24개월', '기관=동네 소아과'],
        expectedOutput: ['D-14 검진 가능 기간 확인', 'D-10 기관 예약', 'D-3 문진표 작성', 'D-1 등록번호 위치 확인', 'D-Day 기관 방문'],
        currentFlowMatch: 'public route는 방문 준비 타임라인으로 검진 전 행동을 나눈다.',
        currentUxSupport: '의료 결과 입력보다 예약/문진표/방문 준비가 먼저 보인다.',
        gap: '의료 판단이나 발달 결과 해석으로 확장하지 않는 경계가 계속 필요하다.',
      },
    ],
    userJourney: [
      '보호자가 공식 안내를 보고 검진 기간과 예약 필요성을 확인한다.',
      'FLOW에서 방문 전 준비 일정을 저장한다.',
      '검진 결과와 의료 판단은 기관과 전문가에게 맡긴다.',
    ],
    currentGap:
      '방문 준비 Flow로는 적합하지만 의료 민감 영역이므로 결과 기록, 진단, 발달 평가처럼 보이는 UI를 억제해야 한다.',
    contentAction:
      '검진 가능 기간, 기관 예약, 문진표, 등록번호, 방문 준비만 유지하고 검진 결과/점수/진단 필드는 추가하지 않는다.',
    uxAction:
      '상세와 export에 공식 안내 우선 및 의료 판단 제외 문구를 반복 노출한다.',
    decision: 'reshape_before_featured',
    scores: {
      actionDensity: 12,
      temporalStructure: 13,
      externalManagementNeed: 17,
      completionClarity: 13,
      personalizationNeed: 8,
      returnValue: 8,
      sourceSpecificityTrust: 9,
      riskBoundaryClarity: 5,
    },
  }),
  defineAudit({
    slug: 'chiangmai-solo-trip-packing',
    checkedAt: '2026-06-08',
    sourceTitle: '치앙마이 혼자 여행 준비물 체크리스트',
    sourceUrl: 'https://blog.naver.com/PostView.nhn?blogId=mat_zip_diary&logNo=223137520451',
    sourcePrecision: 'exact',
    sourceUsefulness:
      '혼자 장기체류 여행에서 통신, 결제, 보험, 비상약, 현지 연락 메모처럼 출국 전 실제로 빠뜨리기 쉬운 준비물 단서가 있다.',
    idealReconstruction:
      '출국일과 체류기간을 입력하면 D-7 통신/결제, D-5 보험/비상약, D-1 문서/연락 메모, D-Day 현지 확인 체크가 생성된다.',
    naturalArtifacts: [
      {
        kind: 'checklist',
        artifactTitle: '치앙마이 장기체류 출국 전 체크',
        simulatedInputs: ['출국일=2026-08-02', '체류기간=30일', '여행형태=혼자'],
        expectedOutput: ['유심/eSIM 준비', 'GLN/카드/현금 분리', '보험 가입 여부 확인', '비상약과 현지 연락처 메모'],
        currentFlowMatch: 'public route는 장기체류 준비를 체크리스트와 메모로 나눈다.',
        currentUxSupport: '상품 추천보다 준비 상태와 링크 메모를 앞세운다.',
        gap: '보험 보장, 결제 가능성, 현지 안전을 보장처럼 말하지 않아야 한다.',
      },
    ],
    userJourney: [
      '사용자가 블로그 체크리스트를 보고 본인 출국일에 맞춰 준비한다.',
      'FLOW에서 통신, 결제, 보험, 비상약, 연락 메모만 관리한다.',
      '상품 조건과 안전 정보는 서비스/공식 안내를 다시 확인한다.',
    ],
    currentGap:
      '장기체류 맥락은 강하지만 여행 안전과 보험 보장을 FLOW가 판단하는 것처럼 보이지 않게 계속 제한해야 한다.',
    contentAction:
      '상품 추천을 제거하고 준비물, 링크 위치, 비상 연락 메모 중심으로 export 문구를 유지한다.',
    uxAction:
      '여행자보험과 결제 수단은 가입/가능 여부 판단이 아니라 확인 위치 메모로 표시한다.',
    decision: 'reshape_before_featured',
    scores: {
      actionDensity: 12,
      temporalStructure: 12,
      externalManagementNeed: 16,
      completionClarity: 12,
      personalizationNeed: 8,
      returnValue: 8,
      sourceSpecificityTrust: 7,
      riskBoundaryClarity: 4,
    },
  }),
  defineAudit({
    slug: 'lease-contract-report-deadline',
    checkedAt: '2026-07-11',
    sourceTitle: '부동산거래관리시스템 주택임대차신고 서비스 안내',
    sourceUrl: 'https://rtms.molit.go.kr/main/serviceInfo.do',
    sourcePrecision: 'exact',
    sourceUsefulness:
      '계약일 기준 30일 신고 마감, 계약서/인증수단 준비, 방문/온라인 신고 방식, 접수 확인처럼 공식 행정 마감형 실행 단서가 명확하다.',
    idealReconstruction:
      '계약일과 신고 방식을 입력하면 D+30 마감 캘린더, 준비 서류 체크, 공식 시스템 링크, 접수 완료 상태가 개인정보 저장 없이 남는다.',
    naturalArtifacts: [
      {
        kind: 'monthly_calendar',
        artifactTitle: '임대차계약 신고 마감 캘린더',
        simulatedInputs: ['계약일=2026-06-10', '신고방식=온라인', '주택소재지=서울'],
        expectedOutput: ['2026-07-10 신고 마감', '계약서 준비', '인증수단 준비', 'RTMS 접수 확인 위치 메모'],
        currentFlowMatch: 'public route는 계약일 기준 마감과 준비 서류를 캘린더/체크로 나눈다.',
        currentUxSupport: '계약서 원문이나 주민번호를 저장하지 않는 caution이 붙어 있다.',
        gap: '법적 효력, 과태료, 신고대상 여부는 공식 확인 대상으로 계속 분리해야 한다.',
      },
    ],
    userJourney: [
      '사용자가 계약일을 기준으로 신고 마감일을 확인한다.',
      'FLOW에서 준비물과 공식 시스템 링크를 확인한다.',
      '신고 대상 여부와 법적 판단은 공식기관/전문가 확인으로 남긴다.',
    ],
    currentGap:
      '행정 마감 Flow로 적합하지만 법률/과태료 판단처럼 보이는 문구는 대표 노출 전 더 줄여야 한다.',
    contentAction:
      '계약서 개인정보와 금액은 저장하지 않고 마감일, 준비 서류, 공식 링크, 접수 확인 위치만 유지한다.',
    uxAction:
      '캘린더 카드와 상세 caution에서 공식 시스템 우선 및 개인정보 미저장 문구를 함께 보여준다.',
    decision: 'reshape_before_featured',
    scores: {
      actionDensity: 12,
      temporalStructure: 14,
      externalManagementNeed: 18,
      completionClarity: 12,
      personalizationNeed: 8,
      returnValue: 8,
      sourceSpecificityTrust: 9,
      riskBoundaryClarity: 5,
    },
  }),
  defineAudit({
    slug: 'jeonse-contract-precheck-docs',
    checkedAt: '2026-06-08',
    sourceTitle: "카카오페이 페이어텐션 - 전세 계약할 때 '이것' 꼭 확인하세요",
    sourceUrl: 'https://contents.kakaopay.com/contents/2056',
    sourcePrecision: 'exact',
    sourceUsefulness:
      '시세, 등기부등본, 보증보험, 중개사/계약서, 특약 확인처럼 계약 전 확인해야 할 서류와 보류 판단 단서가 명확하다.',
    idealReconstruction:
      '계약 예정일을 입력하면 계약 3일 전부터 당일까지 서류 확인, 공식 링크 확인, 보류 메모가 체크리스트로 생성된다.',
    naturalArtifacts: [
      {
        kind: 'checklist',
        artifactTitle: '전세계약 전 서류 확인 체크',
        simulatedInputs: ['계약일=2026-06-21', '보증보험=확인 전', '중개사=확인 전'],
        expectedOutput: ['시세/등기부등본 확인', '보증보험 가능 여부 확인', '중개사와 표준계약서 확인', '이상 항목 보류 메모'],
        currentFlowMatch: 'public route는 계약 판단을 대신하지 않고 확인/보류 체크를 제공한다.',
        currentUxSupport: '보류가 정상 결과로 보이고 공식/전문가 확인 대상이 분리되어 있다.',
        gap: '법률 판단이나 안전 점수처럼 보이는 표현은 계속 제거해야 한다.',
      },
    ],
    userJourney: [
      '사용자가 계약 전 확인 콘텐츠를 보고 필요한 서류를 모은다.',
      'FLOW에서 확인 완료/보류를 체크한다.',
      '문제가 있으면 공인중개사/전문가/공식기관 확인으로 넘긴다.',
    ],
    currentGap:
      '서류 확인 Flow로는 강하지만 계약 안전을 보장하는 제품처럼 읽히지 않도록 보류와 전문가 확인을 더 강하게 유지해야 한다.',
    contentAction:
      '안전 점수, 계약 가능 판정, 법률 결론을 추가하지 않고 서류 확인과 보류 사유만 유지한다.',
    uxAction:
      '첫 화면에서 보류 버튼/상태를 정상 결과로 보여주고 법률 판단 제외 문구를 상세에 둔다.',
    decision: 'reshape_before_featured',
    scores: {
      actionDensity: 12,
      temporalStructure: 9,
      externalManagementNeed: 17,
      completionClarity: 13,
      personalizationNeed: 8,
      returnValue: 8,
      sourceSpecificityTrust: 8,
      riskBoundaryClarity: 5,
    },
  }),
  defineAudit({
    slug: 'elementary-school-entry-d30',
    checkedAt: '2026-06-08',
    sourceTitle: '교육부 2026학년도 초등학교 취학통지 및 예비소집 안내',
    sourceUrl:
      'https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=294&boardSeq=104634&lev=0&m=020402&opType=N&page=1&s=moe&searchType=null&statusYN=W',
    sourcePrecision: 'exact',
    sourceUsefulness:
      '취학통지서 발급, 우편·인편 통지, 학교별 예비소집처럼 입학 전 공식 행정 확인 단서가 명확하다. 학부모 체크리스트는 네임스티커, 등교 동선, 입학식 전날 점검 같은 보조 실행 단서를 제공한다.',
    idealReconstruction:
      '입학식 날짜를 입력하면 D-30 공식 안내 확인, D-21 먼저 살 물건, D-14 보류 항목, D-7 이름 표시, D-1 등교/입학식 가방 점검이 생성된다.',
    naturalArtifacts: [
      {
        kind: 'monthly_calendar',
        artifactTitle: '초등 입학 D-30 준비 캘린더',
        simulatedInputs: ['입학식=2027-03-02', '학교=OO초등학교', '안내문=확인 전'],
        expectedOutput: ['취학통지·예비소집 확인', '먼저 살 물건 목록', '학교 안내 전 보류 항목', '네임스티커와 이름 표시', '등교 동선과 입학식 가방 점검'],
        currentFlowMatch: 'public route는 공식 안내 확인과 가정 준비를 5개 날짜 카드로 나누고 민감정보 입력을 요구하지 않는다.',
        currentUxSupport: '보류 항목이 정상 상태로 보이며 쇼핑 추천보다 학교 안내 우선 copy가 먼저 나온다.',
        gap: '학교별 최신 준비물과 지원금/건강 정보 판단을 FLOW가 대신하지 않는 경계를 계속 유지해야 한다.',
      },
    ],
    userJourney: [
      '보호자가 취학통지와 학교 예비소집 안내를 확인한다.',
      '입학식 날짜를 기준으로 먼저 살 물건과 보류할 물건을 나눈다.',
      '아이와 이름 표시, 등교 동선, 입학식 전날 가방 점검을 실행한다.',
    ],
    currentGap:
      '생활 전환 Flow로 적합하지만 학교별 안내, 건강/예방접종, 지원금 정보로 확장되면 민감정보 기록이나 행정 판단처럼 보일 수 있다.',
    contentAction:
      '공식 취학통지·예비소집 확인을 첫 카드로 유지하고, 구매 추천·지원금 금액·건강 정보·학교 배정 문서 저장을 추가하지 않는다.',
    uxAction:
      '공개 route 첫 화면에서 입학식 날짜 기준 캘린더와 보류 항목을 보여주고, 상세 caution에는 학교 안내 우선과 민감정보 미저장을 둔다.',
    decision: 'reshape_before_featured',
    scores: {
      actionDensity: 12,
      temporalStructure: 14,
      externalManagementNeed: 17,
      completionClarity: 13,
      personalizationNeed: 8,
      returnValue: 8,
      sourceSpecificityTrust: 9,
      riskBoundaryClarity: 5,
    },
  }),
  defineAudit({
    slug: 'picture-book-reading-routine',
    checkedAt: '2026-07-11',
    sourceTitle: '토토북 그림책 독서 지도안',
    sourceUrl:
      'https://image.aladdin.co.kr/img/files/150922_workbook/%EC%9C%A0%EC%95%84/16%20%ED%86%A0%ED%86%A0%EB%B6%81_%EB%8F%85%EC%88%98%EB%A6%AC%EC%99%80%20%EA%B5%B4%EB%9A%9D%EC%83%88.pdf',
    sourcePrecision: 'broad',
    sourceUsefulness:
      '그림책 표지 보기, 질문 카드, 함께 읽기, 아이가 고른 장면 짚기처럼 독서 루틴 안에서 바로 쓸 수 있는 상호작용 단서가 있다.',
    idealReconstruction:
      '독서 요일과 책 제목을 입력하면 반복 독서 일정, 오늘 질문 카드, 읽기 완료 체크가 평가 기록 없이 생성된다.',
    naturalArtifacts: [
      {
        kind: 'routine_calendar',
        artifactTitle: '그림책 읽기 질문 카드 루틴',
        simulatedInputs: ['시작일=2026-06-15', '요일=월/수/금', '책=독수리와 굴뚝새'],
        expectedOutput: ['오늘 읽을 책 고르기', '표지 질문 1개', '함께 읽기', '아이가 고른 장면 메모'],
        currentFlowMatch: 'public route는 질문 카드와 반복 읽기 루틴을 분리한다.',
        currentUxSupport: '학습 평가보다 오늘 읽기 행동과 질문 하나가 먼저 보인다.',
        gap: '독해 점수, 발달 평가, 권장도서 전체 캘린더로 확장하지 않는 제한이 필요하다.',
      },
    ],
    userJourney: [
      '보호자가 지도안/후기를 보고 오늘 읽을 책과 질문을 고른다.',
      'FLOW에서 읽기 요일과 질문 카드 하나를 저장한다.',
      '아이 반응은 평가가 아니라 다음 읽기 메모로 남긴다.',
    ],
    currentGap:
      '질문 카드 UX는 좋지만 교육 효과나 독해 평가처럼 보이지 않도록 copy를 계속 낮춰야 한다.',
    contentAction:
      '질문은 1개씩만 노출하고 점수, 평가, 발달 기록 필드는 추가하지 않는다.',
    uxAction:
      '루틴 상세에서 오늘 질문 카드와 읽기 완료가 먼저 보이고 원문 PDF 링크는 참고로 둔다.',
    decision: 'catalog_preview_only',
    scores: {
      actionDensity: 11,
      temporalStructure: 12,
      externalManagementNeed: 15,
      completionClarity: 12,
      personalizationNeed: 7,
      returnValue: 7,
      sourceSpecificityTrust: 8,
      riskBoundaryClarity: 4,
    },
  }),
  defineAudit({
    slug: 'kids-dino-footprint-art',
    checkedAt: '2026-07-11',
    sourceTitle: '유아 공룡 놀이 자료 참고',
    sourceUrl:
      'https://info.childcare.go.kr/info/pnis/search/PnisFileDownload.jsp?STCODE_POP=41480000016&filetype=YUPLOADU&flag=DNGB&schoolyear=2026&wkyear=202604',
    sourcePrecision: 'broad',
    sourceUsefulness:
      '공룡 놀이 준비물, 발자국 찍기, 이야기 만들기, 다음 놀이 고르기처럼 주말 놀이 실행 순서로 줄일 수 있는 단서가 있다.',
    idealReconstruction:
      '놀이 날짜와 준비물 상태를 입력하면 준비, 놀이 실행, 아이 말 메모, 정리와 다음 놀이 후보가 한 화면 체크리스트로 생성된다.',
    naturalArtifacts: [
      {
        kind: 'checklist',
        artifactTitle: '공룡 발자국 주말 놀이 체크',
        simulatedInputs: ['놀이일=2026-06-20', '도안=있음', '물감=있음'],
        expectedOutput: ['준비물 꺼내기', '발자국 찍기', '아이 말 한 줄 메모', '작품 말리기와 다음 놀이 선택'],
        currentFlowMatch: 'public route는 놀이 준비와 당일 실행을 4개 체크로 줄인다.',
        currentUxSupport: '사진 증빙이나 발달 평가는 기본 요구가 아니다.',
        gap: '교육 효과 보장이나 발달 평가처럼 읽히는 문구를 더 줄일 필요가 있다.',
      },
    ],
    userJourney: [
      '보호자가 놀이 자료를 보고 주말에 할 활동을 고른다.',
      'FLOW에서 준비물과 놀이 순서만 체크한다.',
      '아이 말은 다음 놀이 선택을 위한 가벼운 메모로만 남긴다.',
    ],
    currentGap:
      '짧은 프로젝트 Flow로 적합하지만 유아 활동은 교육 효과와 기록 강요로 확장되기 쉬워 경계가 필요하다.',
    contentAction:
      '준비물, 놀이, 한 줄 메모, 정리만 유지하고 사진 증빙/발달 평가/교육 효과 문구를 제거한다.',
    uxAction:
      '체크리스트 표면에서 준비물과 당일 실행을 먼저 보이고 기록은 선택 메모로 둔다.',
    decision: 'catalog_preview_only',
    scores: {
      actionDensity: 11,
      temporalStructure: 9,
      externalManagementNeed: 14,
      completionClarity: 12,
      personalizationNeed: 7,
      returnValue: 7,
      sourceSpecificityTrust: 7,
      riskBoundaryClarity: 4,
    },
  }),
  defineAudit({
    slug: 'banana-peanut-recipe-video',
    checkedAt: '2026-06-08',
    sourceTitle: '노밀가루 바나나 땅콩버터 빵 20분 완성',
    sourceUrl: 'https://www.recipio.kr/recipes/WwyL63J3',
    sourcePrecision: 'exact',
    sourceUsefulness:
      '짧은 영상 레시피의 재료 확인, 섞기, 원본 기준 굽기, 맛/변형 메모가 당일 체크리스트로 충분히 변환된다.',
    idealReconstruction:
      '조리일과 재료 보유 여부를 입력하면 재료 확인, 섞기, 원본 영상 기준 굽기, 식힘 후 메모가 내부 체크로 생성된다.',
    naturalArtifacts: [
      {
        kind: 'checklist',
        artifactTitle: '바나나 땅콩버터 빵 당일 조리 체크',
        simulatedInputs: ['조리일=2026-06-14', '바나나=2개', '용기=내열'],
        expectedOutput: ['재료 확인', '용기에 섞기', '원본 영상 기준 굽기', '맛과 다음 변형 메모'],
        currentFlowMatch: 'public route는 조리 당일 내부 체크와 원본 링크 중심으로 구성된다.',
        currentUxSupport: '영양 기록이나 식단 관리로 확장하지 않는다.',
        gap: '영상 레시피의 온도/시간을 FLOW가 새로 판단하지 않게 원본 링크 의존을 계속 보여야 한다.',
      },
    ],
    userJourney: [
      '사용자가 짧은 레시피 영상을 보고 오늘 만들 수 있는지 확인한다.',
      'FLOW에서 재료, 조리, 식힘, 다음 메모만 체크한다.',
      '정확한 온도와 시간은 원본 영상/레시피를 다시 확인한다.',
    ],
    currentGap:
      '가벼운 레시피 Flow로 적합하지만 칼로리, 식단, 영양 처방으로 확장되면 목적이 흐려진다.',
    contentAction:
      '원본 영상 링크, 재료, 조리 체크, 다음 변형 메모만 유지하고 영양/식단 기록은 추가하지 않는다.',
    uxAction:
      '상세에서 원본 영상 확인 버튼과 당일 체크를 먼저 보이고, 기록은 선택 메모로 낮춘다.',
    decision: 'reshape_before_featured',
    scores: {
      actionDensity: 11,
      temporalStructure: 7,
      externalManagementNeed: 13,
      completionClarity: 12,
      personalizationNeed: 6,
      returnValue: 7,
      sourceSpecificityTrust: 8,
      riskBoundaryClarity: 4,
    },
  }),
  defineAudit({
    slug: 'first-passport-issue',
    checkedAt: '2026-07-11',
    sourceTitle: '외교부 여권안내 - 최초 발급, 사진, 접수기관, 수수료',
    sourceUrl: 'https://www.passport.go.kr/home/kor/contents.do?menuPos=2',
    sourcePrecision: 'exact',
    sourceUsefulness:
      '현재 공식 페이지가 최초 발급 대상, 공통 서류, 사진 규격, 국내 접수기관, 수수료를 각각 제공해 한 번의 발급 준비 체크리스트로 재구성할 수 있다.',
    idealReconstruction:
      '신청자 조건을 확인한 뒤 사진과 서류를 준비하고, 현재 접수기관과 수수료를 다시 확인해 방문·수령까지 마치는 체크리스트다.',
    naturalArtifacts: [
      {
        kind: 'checklist',
        artifactTitle: '여권 최초 발급 준비 체크',
        simulatedInputs: ['신청자=성인', '신청지역=서울', '출국예정=2026-09'],
        expectedOutput: ['인화 사진 규격 확인', '본인 서류 확인', '접수기관 업무시간 확인', '수수료·수령 방법 기록'],
        currentFlowMatch: '사진·서류와 신청·수령 네 행동이 현재 공식 페이지에 직접 연결된다.',
        currentUxSupport: '체크리스트와 메모 export가 신청 전 준비물을 한 번에 옮긴다.',
        gap: '처리 기간은 접수기관과 시기에 따라 달라 고정 날짜를 만들지 않아야 한다.',
      },
    ],
    userJourney: [
      '처음 여권을 신청하는 사용자가 본인 조건에 맞는 공식 안내를 확인한다.',
      '사진과 서류를 챙기고 방문할 접수기관의 현재 업무시간을 확인한다.',
      '접수처가 안내한 수령 시점을 개인 메모에 남긴다.',
    ],
    currentGap: '온라인 재발급 사진 픽셀 규격이 최초 발급 인화 사진 규격처럼 읽히던 문구를 제거했다.',
    contentAction: '사진, 서류, 접수기관, 수수료만 유지하고 처리 기간이나 대상별 예외를 Flow가 단정하지 않는다.',
    uxAction: '공식 하위 페이지 링크를 각 행동에 붙이고 체크리스트를 첫 산출물로 유지한다.',
    decision: 'keep_representative',
    scores: {
      actionDensity: 13,
      temporalStructure: 8,
      externalManagementNeed: 16,
      completionClarity: 14,
      personalizationNeed: 7,
      returnValue: 7,
      sourceSpecificityTrust: 10,
      riskBoundaryClarity: 5,
    },
  }),
  defineAudit({
    slug: 'citizen-secretary-alerts',
    checkedAt: '2026-07-11',
    sourceTitle: '국민비서 - 알림서비스 목록과 신청 안내',
    sourceUrl: 'https://www.ips.go.kr/pot/svc/ntcn/selectSvcGuide.do',
    sourcePrecision: 'exact',
    sourceUsefulness:
      '현재 알림 종류, 발송 대상과 주기, 누리집 및 민간 앱 신청 경로를 확인할 수 있어 신청 전 세 행동으로 줄일 수 있다.',
    idealReconstruction: '필요한 알림을 고르고 수신 앱을 선택한 뒤 신청 상태를 확인하는 짧은 설정 체크리스트다.',
    naturalArtifacts: [
      {
        kind: 'checklist',
        artifactTitle: '국민비서 알림 설정 체크',
        simulatedInputs: ['관심알림=여권 만료·자동차 검사', '수신앱=카카오톡'],
        expectedOutput: ['현재 알림 목록 확인', '받을 앱 선택', '신청 상태 확인'],
        currentFlowMatch: '공식 서비스 목록과 현재 신청 경로만 남긴다.',
        currentUxSupport: '짧은 메모 체크리스트로 설정 누락을 막는다.',
        gap: '설정 이후 FlowMe로 돌아올 반복 실행 가치는 낮다.',
      },
    ],
    userJourney: [
      '사용자가 놓치기 싫은 행정 알림을 공식 목록에서 고른다.',
      '자주 쓰는 앱이나 국민비서 누리집에서 신청한다.',
      '선택한 앱에서 신청 상태를 확인하고 종료한다.',
    ],
    currentGap: '오래된 서비스 개수와 특정 인증 절차를 삭제했지만 한 번 설정하고 끝나는 외부 서비스 진입 성격이 강하다.',
    contentAction: '서비스 개수를 고정하지 않고 현재 목록·대상·주기를 공식 페이지에서 확인하게 한다.',
    uxAction: '공개 대표보다는 유용한 행정 카탈로그 미리보기로 두고 저장·export는 열지 않는다.',
    decision: 'catalog_preview_only',
    scores: {
      actionDensity: 10,
      temporalStructure: 4,
      externalManagementNeed: 10,
      completionClarity: 12,
      personalizationNeed: 8,
      returnValue: 4,
      sourceSpecificityTrust: 10,
      riskBoundaryClarity: 5,
    },
  }),
  defineAudit({
    slug: 'closet-organize-1day',
    checkedAt: '2026-07-11',
    sourceTitle: '오늘의집 - 미니멀 옷장 정리와 비우는 기준',
    sourceUrl: 'https://ohou.se/advices/7406',
    sourcePrecision: 'exact',
    sourceUsefulness:
      '개인별 비움 기준, 유예 판단, 처리 방법별 분류, 가족·계절별 수납 사례가 당일 실행 체크리스트로 충분히 구체적이다.',
    idealReconstruction: '비움 기준을 먼저 정하고 분류 봉투를 준비한 뒤 남길 옷 배치와 처분 날짜까지 마치는 당일 체크리스트다.',
    naturalArtifacts: [
      {
        kind: 'checklist',
        artifactTitle: '옷장 비우기 하루 체크',
        simulatedInputs: ['기준=2년 미착용', '유예기간=이번 계절', '처리방법=중고·기부·수거'],
        expectedOutput: ['비움 기준 적기', '분류 봉투 준비', '옷 분류', '남길 옷 재배치', '처리 날짜 확정'],
        currentFlowMatch: '원문의 선택 기준과 처리 방법을 여섯 개 행동으로 보존한다.',
        currentUxSupport: '체크와 개인 메모만 요구하고 사진 증빙은 요구하지 않는다.',
        gap: '가족별 수납 사례를 모든 사용자에게 정답처럼 강요하지 않아야 한다.',
      },
    ],
    userJourney: [
      '사용자가 자신의 옷장과 망설이는 옷에 맞는 비움 기준을 정한다.',
      '남김·유예·중고·기부·수거로 분류하고 남길 옷을 다시 배치한다.',
      '비울 옷이 집에 다시 쌓이지 않도록 처리 날짜를 정한다.',
    ],
    currentGap: '원문 예시였던 1년 기준과 출처에 없던 수납 법칙을 일반 규칙처럼 보이게 한 문구를 제거했다.',
    contentAction: '사용자 기준과 유예 선택을 보존하고 처리 방법별 분류 외의 정리 상식을 추가하지 않는다.',
    uxAction: '메모보다 당일 체크를 먼저 보이고 처리 날짜만 선택 메모로 남긴다.',
    decision: 'keep_representative',
    scores: {
      actionDensity: 14,
      temporalStructure: 6,
      externalManagementNeed: 16,
      completionClarity: 14,
      personalizationNeed: 8,
      returnValue: 8,
      sourceSpecificityTrust: 9,
      riskBoundaryClarity: 5,
    },
  }),
  defineAudit({
    slug: 'domestic-trip-d7',
    checkedAt: '2026-07-11',
    sourceTitle: '트립닷컴 - 국내 여행 준비물 체크리스트',
    sourceUrl:
      'https://kr.trip.com/guide/info/%EA%B5%AD%EB%82%B4+%EC%97%AC%ED%96%89+%EC%A4%80%EB%B9%84%EB%AC%BC.html',
    sourcePrecision: 'exact',
    sourceUsefulness:
      '계절, 동반자, 숙박형태, 활동별 준비물과 여행 후 다음 목록을 개선할 메모 단서를 제공한다.',
    idealReconstruction:
      '여행 조건을 고른 뒤 공통 준비물과 해당 조건의 추가 준비물만 남겨 출발 전 개인 체크리스트를 만드는 구조다.',
    naturalArtifacts: [
      {
        kind: 'checklist',
        artifactTitle: '국내여행 개인 짐 목록',
        simulatedInputs: ['계절=가을', '동반자=가족', '숙박=민박', '활동=트레킹'],
        expectedOutput: ['공통 필수품', '일교차 대비 옷', '가족 용품', '트레킹 용품', '숙소 미제공 물품'],
        currentFlowMatch: '발명된 예약·관광 동선을 제거하고 원문의 준비물 분류만 남겼다.',
        currentUxSupport: '메모 체크리스트로 내 짐 목록을 만들 수 있다.',
        gap: '상업 링크가 많은 원문이라 실제 준비물 본문과 상품 영역을 계속 분리해야 한다.',
      },
    ],
    userJourney: [
      '사용자가 이번 여행의 계절·동반자·숙박·활동을 적는다.',
      '공통 준비물과 해당 조건의 물건만 골라 짐 목록을 완성한다.',
      '여행 후 빠뜨렸거나 유용했던 물건을 다음 여행용으로 남긴다.',
    ],
    currentGap: '이전 Flow는 준비물 글을 근거로 예약 취소 정책과 관광지 운영시간까지 발명한 D-7 타임라인이었다.',
    contentAction: '준비물 체크리스트만 유지하고 예약·동선·집 잠금 같은 원문 밖 행동은 추가하지 않는다.',
    uxAction: '캘린더가 아니라 메모 체크리스트로 재구성했으며 상업 추천을 배제한 모바일 QA가 더 필요하다.',
    decision: 'reshape_before_featured',
    scores: {
      actionDensity: 12,
      temporalStructure: 2,
      externalManagementNeed: 12,
      completionClarity: 12,
      personalizationNeed: 9,
      returnValue: 7,
      sourceSpecificityTrust: 8,
      riskBoundaryClarity: 5,
    },
  }),
  defineAudit({
    slug: 'portfolio-4week',
    checkedAt: '2026-07-11',
    sourceTitle: 'Velog @vonvoyage27 - 포트폴리오 4주 만에 준비하기',
    sourceUrl:
      'https://velog.io/@vonvoyage27/%ED%9A%A8%EC%9C%A8%EC%A0%81%EC%9C%BC%EB%A1%9C-IT-%EA%B0%9C%EB%B0%9C%EC%9E%90%EB%A1%9C-%EC%B7%A8%EC%97%85-%EC%A4%80%EB%B9%84%ED%95%98%EA%B8%B0-%ED%8F%AC%ED%8A%B8%ED%8F%B4%EB%A6%AC%EC%98%A4-%ED%8E%B8',
    sourcePrecision: 'exact',
    sourceUsefulness:
      '아이템·기술 선정부터 기능·페이지·DB·API 설계, 개발, 배포, 포트폴리오 작성까지 1주 설계·3주 개발의 명확한 실행 순서를 제공한다.',
    idealReconstruction:
      '완료일을 입력하면 프로젝트 범위, 설계 문서, 개발 일정, 배포, 포트폴리오 자료가 4주 캘린더와 실행표로 생성된다.',
    naturalArtifacts: [
      {
        kind: 'monthly_calendar',
        artifactTitle: '개발 프로젝트 4주 일정',
        simulatedInputs: ['완료일=2026-08-31', '프로젝트=웹 서비스', '팀=4명'],
        expectedOutput: ['D-28 아이템·기술', 'D-25 기능·화면', 'D-21 DB·API 설계', 'D-20~D-8 개발', 'D-7 배포', 'D-1 포트폴리오'],
        currentFlowMatch: '원문의 준비 순서와 1주 설계·3주 개발 구조를 날짜 항목으로 보존한다.',
        currentUxSupport: '캘린더와 시트가 일정·문서·배포 결과를 함께 옮긴다.',
        gap: '모든 포트폴리오가 아니라 개발 프로젝트 제작이 필요한 사용자에게만 맞는 범위를 제목에서 분명히 해야 한다.',
      },
    ],
    userJourney: [
      '주니어 개발자가 완성 목표일과 만들 프로젝트 범위를 정한다.',
      '첫 주에 기능·화면·DB·API 설계를 마치고 이후 3주 개발 일정을 실행한다.',
      '배포 주소, 저장소, 역할과 성과, 데모를 포트폴리오 한 페이지에 모은다.',
    ],
    currentGap: '이전 Flow는 원문에 없는 일반 포트폴리오 목적·STAR·도구 선택으로 바뀌어 개발 프로젝트 제작 순서를 잃었다.',
    contentAction: '원문의 프로젝트 제작 순서를 유지하고 일반 취업 조언이나 템플릿 선택을 추가하지 않는다.',
    uxAction: '완료일 기반 캘린더와 프로젝트 실행표를 먼저 보여주고 포트폴리오 설명은 마지막 산출물로 둔다.',
    decision: 'keep_representative',
    scores: {
      actionDensity: 14,
      temporalStructure: 15,
      externalManagementNeed: 18,
      completionClarity: 14,
      personalizationNeed: 8,
      returnValue: 9,
      sourceSpecificityTrust: 9,
      riskBoundaryClarity: 5,
    },
  }),
];

sourceFitAudits.push(...realSourceManualSourceFitAudits);
sourceFitAudits.push(...promotedNeedsReviewManualAudits);

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
