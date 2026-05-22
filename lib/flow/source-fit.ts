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
    checkedAt: '2026-05-22',
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
    sourceUsefulness: '원본은 식단표, 날짜 입력 가능성, 재료 순서, 레시피, 알레르기 관찰을 포함해 FLOW화 가치가 높다.',
    idealReconstruction: '시작일 기준 식단 달력, 재료별 레시피, 반응 기록, 공식/주의 정보로 재구성한다.',
    naturalArtifacts: [
      {
        kind: 'monthly_calendar',
        artifactTitle: '초기 이유식 14일 식단 달력',
        simulatedInputs: ['시작일=2026-06-01', '아기월령=6개월', '첫재료=쌀미음', '알레르기주의=계란 보류'],
        expectedOutput: ['6/1 쌀미음', '6/4 애호박 추가', '6/7 감자 추가', '각 재료 2~3일 반응 관찰'],
        currentFlowMatch: '식단표와 재료 순서는 맞지만 공식 주의와 개인 반응 기록이 더 명확해야 한다.',
        currentUxSupport: '식단 달력은 유효하나 반응 기록이 핵심 산출물로 더 드러나야 한다.',
        gap: '건강 민감 영역이라 달력보다 반응 기록/주의 카드가 동등하게 중요하다.',
      },
      {
        kind: 'spreadsheet',
        artifactTitle: '재료 반응 기록표',
        simulatedInputs: ['날짜=2026-06-04', '재료=애호박', '섭취량=2스푼', '반응=특이 없음'],
        expectedOutput: ['날짜, 재료, 섭취량, 피부/변/수면 반응, 보호자 메모, 확인 필요 여부 열'],
        currentFlowMatch: '메모/export 방향은 맞지만 반응 기록이 별도 표처럼 강하지 않다.',
        currentUxSupport: '엑셀 export는 가능하나 입력 UX가 체크리스트 항목에 묻힌다.',
        gap: '반응 기록 전용 입력과 export preview가 필요하다.',
      },
    ],
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
    checkedAt: '2026-05-22',
    sourceTitle: '중고차 구매 체크리스트 완벽 가이드',
    sourceUrl: 'https://www.drive-insight.net/posts/used-car-buying-checklist-ko/',
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
    checkedAt: '2026-05-22',
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
    checkedAt: '2026-05-22',
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
    checkedAt: '2026-05-22',
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
    checkedAt: '2026-05-22',
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
