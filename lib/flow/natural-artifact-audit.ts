import type { FlowBundle } from './types';
import type { NaturalArtifactSimulation } from './source-fit';

export type NaturalArtifactAuditDecision =
  | 'promote_to_manual_source_fit'
  | 'reshape_content_or_ux'
  | 'keep_catalog_review'
  | 'replace_or_hide_source';

export type RealSourceNaturalArtifactAudit = {
  slug: string;
  checkedAt: string;
  sourceTitle: string;
  sourceUrl: string;
  sourceEvidence: string[];
  userScenario: string;
  naturalArtifacts: NaturalArtifactSimulation[];
  currentContentGap: string;
  currentUxGap: string;
  nextContentAction: string;
  nextUxAction: string;
  decision: NaturalArtifactAuditDecision;
};

type DecisionCounts = Record<NaturalArtifactAuditDecision, number>;

export type NaturalArtifactAuditCoverageSummary = {
  realSourceCount: number;
  auditedRealSourceCount: number;
  remainingRealSourceCount: number;
  auditedCategoryCounts: Record<string, number>;
  decisionCounts: DecisionCounts;
};

const emptyDecisionCounts: DecisionCounts = {
  promote_to_manual_source_fit: 0,
  reshape_content_or_ux: 0,
  keep_catalog_review: 0,
  replace_or_hide_source: 0,
};

export const realSourceNaturalArtifactAudits: RealSourceNaturalArtifactAudit[] = [
  {
    slug: 'real-samsung-aircon-seasonal-care',
    checkedAt: '2026-05-22',
    sourceTitle: '삼성전자서비스 에어컨 세척 서비스 안내',
    sourceUrl: 'https://www.samsungsvc.co.kr/info/maintenance',
    sourceEvidence: [
      '공식 페이지가 에어컨 세척/유지보수의 필요, 서비스 범위, 세척 과정, 전문 세척 신청 연락처를 제공한다.',
      '세척은 예약과 방문 준비가 필요한 서비스라 사용자가 일정표와 예약 메모를 따로 만들 가능성이 높다.',
    ],
    userScenario: '사용자는 여름 전 에어컨 냄새와 냉방 약화를 보고 공식 세척 서비스를 예약할지 판단한다.',
    naturalArtifacts: [
      {
        kind: 'monthly_calendar',
        artifactTitle: '여름 전 에어컨 세척 예약 달력',
        simulatedInputs: ['사용시작일=2026-06-15', '실내기=거실 1대/안방 1대', '희망방문=2026-06-01~2026-06-08'],
        expectedOutput: [
          '2026-05-25 모델명/설치 위치 확인',
          '2026-05-27 필터 오염과 냄새 사진 기록',
          '2026-05-28 세척 범위와 비용 문의',
          '2026-06-03 방문 예약',
          '2026-06-03 세척 후 냉방/누수 확인',
        ],
        currentFlowMatch: '현재 Flow 항목은 모델, 오염, 비용, 예약, 사후 확인을 모두 포함한다.',
        currentUxSupport: 'timeline 입력과 월별 달력은 맞지만 예약 후보 날짜 여러 개를 비교하는 UI는 약하다.',
        gap: '서비스 예약 후보와 현장 연락처 메모가 export preview에 더 명확히 보여야 한다.',
      },
      {
        kind: 'memo',
        artifactTitle: '세척 상담 메모',
        simulatedInputs: ['모델=AF18...', '증상=냄새/약한 냉방', '예산상한=20만원', '문의번호=1588-4190'],
        expectedOutput: ['모델명, 설치 위치, 증상 사진, 문의한 서비스 범위, 비용, 방문 가능 시간, 상담 결과'],
        currentFlowMatch: '항목별 메모로 대부분 기록할 수 있다.',
        currentUxSupport: '일반 메모는 가능하지만 상담 메모 전용 필드로 보이지 않는다.',
        gap: '서비스형 Flow에는 상담/예약 메모 템플릿이 필요하다.',
      },
    ],
    currentContentGap: '콘텐츠 구조는 좋지만 서비스 예약 메모와 비용 문의 결과가 별도 산출물로 분리되어 있지 않다.',
    currentUxGap: '달력은 보이지만 예약 후보 비교와 상담 메모 preview가 약하다.',
    nextContentAction: '에어컨 세척 Flow를 manual source-fit 후보로 승격하고 상담 메모 기준을 추가한다.',
    nextUxAction: '서비스 예약형 Flow에 예약 후보/상담 메모 export preview를 붙인다.',
    decision: 'promote_to_manual_source_fit',
  },
  {
    slug: 'real-samsung-washer-filter-care',
    checkedAt: '2026-05-22',
    sourceTitle: '삼성전자서비스 세탁기 배수필터 청소 안내',
    sourceUrl: 'https://www.samsungsvc.co.kr/solution/1978102',
    sourceEvidence: [
      '공식 페이지가 배수필터 주 1회 이상 청소, 잔수 제거, 재조립/잠김 확인, 누수 주의를 안내한다.',
      '반복 관리 루틴과 안전 체크가 핵심이라 캘린더 반복과 짧은 체크리스트가 자연스럽다.',
    ],
    userScenario: '사용자는 세탁기 5C 점검 문자를 본 뒤 매주 배수필터 청소를 반복 루틴으로 만들고 싶다.',
    naturalArtifacts: [
      {
        kind: 'routine_calendar',
        artifactTitle: '주 1회 배수필터 청소 달력',
        simulatedInputs: ['시작일=2026-06-06', '반복=매주 토요일 오전', '제품=비스포크 AI 콤보', '주의=잔수 제거'],
        expectedOutput: ['매주 토요일 배수필터 청소', '잔수 제거', '필터/내부 청소', '재조립과 잠김 확인', '누수 확인'],
        currentFlowMatch: '루틴 항목은 공식 절차와 잘 맞는다.',
        currentUxSupport: '반복 루틴 preview는 가능하지만 주 1회 권장 근거가 첫 화면에서 더 보여야 한다.',
        gap: '반복 주기와 안전 주의가 달력 카드에 함께 표시되어야 한다.',
      },
      {
        kind: 'checklist',
        artifactTitle: '청소 당일 안전 체크리스트',
        simulatedInputs: ['청소일=2026-06-06', '준비물=낮은 용기/수건/장갑', '상태=5C 표시'],
        expectedOutput: ['전원 끄기', '잔수 제거 용기 준비', '필터 분리', '솔로 청소', '오른쪽으로 재조립', '잠김/누수 확인'],
        currentFlowMatch: '청소 전 준비와 청소 후 확인이 포함되어 있다.',
        currentUxSupport: '체크리스트 UI는 맞지만 사진/증상 메모가 보조로만 존재한다.',
        gap: '고장 코드, 누수 여부, 다음 청소일이 export에 들어가야 한다.',
      },
    ],
    currentContentGap: '주 1회 반복 근거와 잠김/누수 확인이 대표 메타로 더 강조되어야 한다.',
    currentUxGap: '반복 달력과 안전 체크가 분리되어 보여야 사용자가 루틴을 이해하기 쉽다.',
    nextContentAction: '공식 주기와 안전 주의를 item meta로 승격한다.',
    nextUxAction: 'routine Flow의 반복 주기/주의 배지를 월간 달력 preview에 포함한다.',
    decision: 'promote_to_manual_source_fit',
  },
  {
    slug: 'real-qnet-application-examday-check',
    checkedAt: '2026-05-22',
    sourceTitle: 'Q-Net 원서접수시 유의사항',
    sourceUrl: 'https://www.q-net.or.kr/rcv002.do?gSite=L&id=rcv002_identi',
    sourceEvidence: [
      '공식 페이지가 인정 신분증 요건, 원본/사진/주민등록번호/성명/발급자 기준, 인정되지 않는 예시를 안내한다.',
      '시험 접수와 시험 당일 준비는 마감과 준비물 누락 리스크가 있어 일정+체크리스트 산출물이 자연스럽다.',
    ],
    userScenario: '사용자는 자격증 원서접수 후 시험 전날 신분증과 준비물을 빠뜨리지 않으려 한다.',
    naturalArtifacts: [
      {
        kind: 'monthly_calendar',
        artifactTitle: 'Q-Net 접수부터 시험당일 일정표',
        simulatedInputs: ['시험일=2026-07-12', '접수마감=2026-06-10 18:00', '종목=정보처리기사', '시험장=서울동부'],
        expectedOutput: ['6/9 접수 마감 전 확인', '6/10 결제/접수 상태 저장', '7/11 신분증/수험표 준비', '7/12 입실 시간 맞춰 출발'],
        currentFlowMatch: '접수 전, 접수 완료, 시험 당일 흐름은 맞다.',
        currentUxSupport: '시험일 anchor는 맞지만 접수 마감 같은 별도 deadline 입력은 부족하다.',
        gap: '시험일 외 접수 마감/수험표 출력일 같은 보조 날짜를 입력할 수 있어야 한다.',
      },
      {
        kind: 'spreadsheet',
        artifactTitle: '시험 준비물 확인표',
        simulatedInputs: ['신분증=운전면허증 원본', '수험표=PDF 저장', '계산기=허용기종 확인', '입실=09:00'],
        expectedOutput: ['항목, 공식 기준, 내 준비물, 확인일, 보관 위치, 미해결 여부 열'],
        currentFlowMatch: '준비물 항목은 있으나 공식 기준과 내 준비물을 나란히 보는 표는 없다.',
        currentUxSupport: '일반 체크리스트로는 가능하지만 신분증 인정 기준 같은 긴 공식 기준을 보존하기 어렵다.',
        gap: '공식 기준/내 준비물 비교형 export가 필요하다.',
      },
    ],
    currentContentGap: '접수 마감, 수험표, 신분증 기준처럼 시험 전 단계별 deadline이 더 구조화되어야 한다.',
    currentUxGap: '시험일 하나만으로는 접수/출력/준비물 날짜가 충분히 표현되지 않는다.',
    nextContentAction: 'Q-Net Flow를 시험일+접수마감 다중 deadline Flow로 보강한다.',
    nextUxAction: 'timeline Flow에 보조 deadline 입력과 공식 기준 대비표 export를 추가한다.',
    decision: 'reshape_content_or_ux',
  },
  {
    slug: 'real-gov24-moving-report-check',
    checkedAt: '2026-05-22',
    sourceTitle: '정부24 전입신고 민원안내',
    sourceUrl: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=13100000016&tp_seq=01',
    sourceEvidence: [
      '점검 시점에는 정부24 URL이 서비스 일시중단 안내로 리다이렉트되어 실제 민원 안내 본문을 확인하지 못했다.',
      '전입신고는 이사 후 신고 준비, 온라인 가능 여부, 처리 결과 보관이 핵심이라는 기존 Flow 구조는 유지 가치가 있다.',
    ],
    userScenario: '사용자는 이사 후 전입신고를 정부24에서 처리하고 완료 캡처와 후속 확인을 남기려 한다.',
    naturalArtifacts: [
      {
        kind: 'checklist',
        artifactTitle: '전입신고 실행 체크리스트',
        simulatedInputs: ['이사일=2026-06-27', '신고자=세대주 본인', '인증수단=공동인증서', '주택유형=전세'],
        expectedOutput: ['신고 기한 확인', '온라인 신청 가능 여부 확인', '주소/세대 정보 입력', '처리 완료 캡처', '확정일자/주소 변경 후속 확인'],
        currentFlowMatch: '신고 전 확인과 신고 후 확인 구조는 맞다.',
        currentUxSupport: '날짜 없는 체크리스트로 되어 있어 이사일 기준 신고 기한을 시각화하기 어렵다.',
        gap: 'anchor_type none보다 선택적 이사일 입력과 마감 표시가 적합하다.',
      },
      {
        kind: 'memo',
        artifactTitle: '신고 완료 증빙 메모',
        simulatedInputs: ['처리일=2026-06-28', '접수번호=예시-1234', '결과=처리완료', '후속=주소 변경'],
        expectedOutput: ['접수번호, 처리상태, 캡처 위치, 후속 처리 목록, 문제 발생 시 문의처'],
        currentFlowMatch: '메모로 기록할 수는 있지만 증빙 메모가 별도 산출물로 드러나지 않는다.',
        currentUxSupport: '체크와 메모는 가능하지만 완료 증빙 중심 UX는 약하다.',
        gap: '행정 Flow에는 접수번호/처리상태/증빙 캡처 위치 필드가 필요하다.',
      },
    ],
    currentContentGap: '현재 source 확인이 일시적으로 불완전하므로 실제 정부24 본문 재확인이 필요하다.',
    currentUxGap: '행정 신고형 Flow에는 선택 날짜와 증빙 메모가 필요하다.',
    nextContentAction: '정부24 페이지 정상 접근 시 민원 조건과 처리 기한을 재확인한다.',
    nextUxAction: 'checklist Flow에 선택적 deadline과 증빙 메모 패턴을 추가한다.',
    decision: 'keep_catalog_review',
  },
  {
    slug: 'real-childcare-vaccination-visit-prep',
    checkedAt: '2026-05-22',
    sourceTitle: '아이사랑 월령별 성장 및 돌보기',
    sourceUrl: 'https://www.childcare.go.kr/?menuno=439',
    sourceEvidence: [
      '아이사랑 페이지는 4~6개월 건강검진, 생후 4개월 예방접종, 증상/외출 준비 등 월령별 돌봄 정보를 제공한다.',
      '검진/접종은 의료진 판단이 우선인 민감 영역이므로 방문 준비 메모와 공식 주의 분리가 핵심이다.',
    ],
    userScenario: '보호자는 4개월 접종/검진 예약 전 최근 증상과 준비물을 정리해 병원에서 빠뜨리지 않으려 한다.',
    naturalArtifacts: [
      {
        kind: 'monthly_calendar',
        artifactTitle: '4개월 접종/검진 방문 준비 달력',
        simulatedInputs: ['방문일=2026-06-12', '아기월령=4개월', '방문유형=예방접종+검진', '보호자=엄마'],
        expectedOutput: ['6/9 문진표/예약 확인', '6/11 체온/수유/수면 기록 준비', '6/12 아기수첩 지참', '6/13 접종 후 반응 관찰'],
        currentFlowMatch: '방문 전후 흐름은 맞지만 방문 후 관찰이 더 중요하게 보여야 한다.',
        currentUxSupport: 'timeline은 맞지만 의료 주의와 기록 입력이 일반 메모에 묻힌다.',
        gap: '방문 후 반응 기록과 의료진 상담 우선 문구가 별도 산출물이어야 한다.',
      },
      {
        kind: 'memo',
        artifactTitle: '의료진에게 보여줄 증상 메모',
        simulatedInputs: ['최근증상=기침 없음/수유량 감소', '체온=36.8', '수면=밤중 2회 깸', '질문=이유식 시작 시점'],
        expectedOutput: ['체온, 수유, 수면, 최근 증상, 보호자 질문, 의료진 답변, 다음 방문일'],
        currentFlowMatch: '증상 기록 항목은 있으나 질문/답변 구조는 약하다.',
        currentUxSupport: '메모 입력은 가능하지만 병원 방문 기록장처럼 보이지 않는다.',
        gap: '민감 의료 방문형 Flow에는 질문/답변/다음 방문일 메모가 필요하다.',
      },
    ],
    currentContentGap: '방문 후 관찰과 의료진 답변 기록이 현재 항목에서 덜 강조된다.',
    currentUxGap: '의료 민감 기록은 일반 메모보다 구조화된 방문 기록으로 보여야 한다.',
    nextContentAction: '검진/접종 Flow에 방문 후 관찰과 의료진 답변 항목을 보강한다.',
    nextUxAction: '의료/육아 Flow에 방문 기록 메모 템플릿과 주의 배너를 추가한다.',
    decision: 'reshape_content_or_ux',
  },
  {
    slug: 'real-pet-registration-check',
    checkedAt: '2026-05-22',
    sourceTitle: '국가동물보호정보시스템 동물등록제도 안내',
    sourceUrl: 'https://www.animal.go.kr/front/community/show.do?boardId=contents&menuNo=2000000016&seq=+66',
    sourceEvidence: [
      '공식 페이지는 등록대상동물 기준, 내장형/외장형 등록방법, 동반 방문, 대행기관/지자체 확인, 대리 신청 서류를 안내한다.',
      '사용자는 등록 대상 확인과 방문 준비물, 등록번호 보관 메모를 만들 가능성이 높다.',
    ],
    userScenario: '사용자는 3개월 강아지를 입양한 뒤 동물등록 대상 여부와 방문 준비를 확인한다.',
    naturalArtifacts: [
      {
        kind: 'checklist',
        artifactTitle: '반려동물 등록 방문 준비표',
        simulatedInputs: ['동물=강아지', '월령=3개월', '거주=아파트', '등록방식=내장형 희망'],
        expectedOutput: ['등록 대상 여부 확인', '대행기관 찾기', '반려동물 동반 방문', '소유자 신분/연락처 준비', '등록번호 보관'],
        currentFlowMatch: '등록 대상, 방식, 기관, 소유자 정보, 등록번호 보관이 모두 포함되어 있다.',
        currentUxSupport: '날짜 없는 체크리스트로는 적합하지만 기관 후보와 문의 결과 기록이 약하다.',
        gap: '대행기관 후보/전화 문의 결과를 저장하는 비교 또는 메모가 필요하다.',
      },
      {
        kind: 'memo',
        artifactTitle: '등록번호 보관 메모',
        simulatedInputs: ['등록번호=410000000000000', '기관=OO동물병원', '변경신고=주소/연락처 변경 시', '보관위치=사진앨범/메모앱'],
        expectedOutput: ['등록번호, 기관명, 등록방식, 소유자 연락처, 변경신고 조건, 보관 위치'],
        currentFlowMatch: '등록번호 보관 항목은 맞다.',
        currentUxSupport: '메모는 가능하지만 장기 보관 정보로 강조되지 않는다.',
        gap: '등록 완료 후 반복 조회할 핵심 정보 카드가 필요하다.',
      },
    ],
    currentContentGap: '대행기관 선택과 등록 후 장기 보관 정보가 더 구조화되어야 한다.',
    currentUxGap: '체크리스트는 맞지만 기관 후보/등록번호 보관 카드가 약하다.',
    nextContentAction: '등록기관 후보와 등록번호 보관 기준을 item detail에 추가한다.',
    nextUxAction: '행정/등록형 checklist에 장기 보관 메모 preview를 추가한다.',
    decision: 'promote_to_manual_source_fit',
  },
  {
    slug: 'real-ohouse-moving-d30-prep',
    checkedAt: '2026-05-22',
    sourceTitle: '오늘의집 원룸 이사 준비 순서 가이드',
    sourceUrl: 'https://ohou.se/advices/12199',
    sourceEvidence: [
      '원문은 원룸 이사를 이사 2주 전, 전날, 당일, 이사 후 7일 이내로 나누고 업체 예약, 이전 신청, 하자 사진, 공과금, 전입신고를 안내한다.',
      '금전/보증금 리스크가 있어 일정, 증빙 메모, 업체/비용 비교표가 함께 필요하다.',
    ],
    userScenario: '1인 가구 사용자가 6월 말 원룸 이사를 앞두고 업체 예약, 공과금, 전입신고, 하자 사진을 놓치지 않으려 한다.',
    naturalArtifacts: [
      {
        kind: 'monthly_calendar',
        artifactTitle: '원룸 이사 2주 준비 달력',
        simulatedInputs: ['이사일=2026-06-27', '집유형=원룸 전세', '이사방식=용달+기사 도움', '보증금=1,000만원'],
        expectedOutput: ['6/13 업체 예약/이전 신청', '6/26 냉장고/귀중품/서류 분리', '6/27 하자 사진/공과금/잔금', '7/4 전입신고/주소변경 확인'],
        currentFlowMatch: 'Flow 항목은 원문 단계와 잘 맞는다.',
        currentUxSupport: 'timeline 달력은 맞지만 보증금/정산 증빙 산출물이 부족하다.',
        gap: '금전 리스크가 있는 이사 Flow는 증빙 사진/정산 메모가 중심에 와야 한다.',
      },
      {
        kind: 'comparison_table',
        artifactTitle: '이사 업체 후보 비교표',
        simulatedInputs: ['후보A=용달 18만원', '후보B=반포장 32만원', '조건=엘리베이터/사다리차 없음', '우선순위=가격/시간'],
        expectedOutput: ['업체, 견적, 포함 서비스, 예약 가능 시간, 추가비, 연락처, 결정 상태 열'],
        currentFlowMatch: '업체 예약 항목은 있으나 후보 비교표는 없다.',
        currentUxSupport: '현재 UX는 후보 비교보다 체크리스트 중심이다.',
        gap: '이사/구매/서비스 예약 Flow에는 간단한 후보 비교표가 필요하다.',
      },
    ],
    currentContentGap: '정산/하자/보증금 증빙과 업체 비교가 항목 수준에서 더 분리되어야 한다.',
    currentUxGap: 'financial_sensitive Flow인데 비교표와 증빙 메모 preview가 약하다.',
    nextContentAction: '오늘의집 이사 Flow를 후보 비교+증빙 메모 중심으로 보강한다.',
    nextUxAction: '금전 리스크가 있는 timeline Flow에 비교표와 증빙 메모 export를 연결한다.',
    decision: 'reshape_content_or_ux',
  },
  {
    slug: 'real-kdca-travel-health-check',
    checkedAt: '2026-05-22',
    sourceTitle: '질병관리청 해외여행 전 건강정보',
    sourceUrl: 'https://www.kdca.go.kr/menu.es?mid=a20102060200',
    sourceEvidence: [
      '질병관리청 페이지는 국가별 위험요인 확인, 예방접종/예방약/구급약 준비, 필요 시 의사 상담을 안내한다.',
      '예방접종은 여행 직전이 아니라 여유 있게 준비해야 하므로 출국일 기준 건강 준비 달력이 자연스럽다.',
    ],
    userScenario: '사용자는 7월 해외여행 전 국가별 감염병 위험과 예방접종 상담 여부를 확인하려 한다.',
    naturalArtifacts: [
      {
        kind: 'monthly_calendar',
        artifactTitle: '해외여행 건강 준비 달력',
        simulatedInputs: ['출국일=2026-07-20', '국가=베트남', '기저질환=없음', '상담희망=여행의학 클리닉'],
        expectedOutput: ['5/25 국가별 위험 확인', '6/1 예방접종/예방약 상담', '7/13 복용약/구급약 준비', '7/20 출국 전 위생수칙 확인'],
        currentFlowMatch: '감염병 확인, 상담, 약 준비, 위생수칙 항목은 맞다.',
        currentUxSupport: 'timeline은 맞지만 국가 입력과 공식 확인일 기록이 별도 필드가 아니다.',
        gap: '여행 건강 Flow에는 국가/확인일/공식 링크 메모가 필요하다.',
      },
      {
        kind: 'memo',
        artifactTitle: '국가별 감염병 확인 메모',
        simulatedInputs: ['국가=베트남', '확인일=2026-06-01', '확인항목=예방접종/말라리아/모기 회피', '상담=필요'],
        expectedOutput: ['국가, 확인일, 감염병 위험, 예방접종/예방약 상담 필요, 의료진 답변, 재확인일'],
        currentFlowMatch: '주의와 확인 항목은 있으나 국가별 기록 표면은 약하다.',
        currentUxSupport: '의료 민감 정보가 일반 메모로만 남는다.',
        gap: '공식 확인 메모와 의료진 상담 결과를 구조화해야 한다.',
      },
    ],
    currentContentGap: '국가별 확인 결과와 상담 결과 기록이 더 중심이 되어야 한다.',
    currentUxGap: '민감 여행건강 Flow인데 공식 확인일/상담 결과/재확인일 UX가 부족하다.',
    nextContentAction: '국가별 공식 확인과 상담 결과 기록 항목을 보강한다.',
    nextUxAction: 'medical_sensitive timeline에 공식 확인 메모와 재확인일 필드를 추가한다.',
    decision: 'reshape_content_or_ux',
  },
  {
    slug: 'real-thankyou-bubu-video-full-body-no-jump',
    checkedAt: '2026-05-22',
    sourceTitle: 'ThankyouBUBU 전신 다이어트 최고의 운동',
    sourceUrl: 'https://www.youtube.com/watch?v=pcyrlkHXAdE',
    sourceEvidence: [
      '영상 제목이 점프, 눕는 동작, 반복, 토크가 없는 전신 다이어트 운동임을 직접 드러내며 저충격 단회 운동 루틴에 가깝다.',
      '사용자는 영상을 본 뒤 운동 동작 자체를 다시 열람하기보다 정해진 요일에 1회 실행하고 완료 여부와 몸 상태를 기록할 가능성이 높다.',
    ],
    userScenario: '사용자는 퇴근 후 층간소음 없이 할 20분 전신 운동을 찾고, 월수금 저녁 반복 일정과 운동 후 피로도를 기록하려 한다.',
    naturalArtifacts: [
      {
        kind: 'routine_calendar',
        artifactTitle: '월수금 전신 운동 반복 캘린더',
        simulatedInputs: ['시작일=2026-06-01', '반복=월/수/금 20:30', '기간=4주', '장소=거실', '강도=중간'],
        expectedOutput: [
          '6/1, 6/3, 6/5, 6/8... 각 날짜에 전신 다이어트 1회 등록',
          '각 회차에 준비운동, 본운동, 마무리 스트레칭 체크',
          '완료 후 피로도 1~5와 무릎/허리 불편 여부 기록',
        ],
        currentFlowMatch: '현재 Flow는 routine/start_date 구조와 운동 항목 체크는 맞지만 요일 반복과 4주 달력 반영이 약하다.',
        currentUxSupport: '루틴 preview는 있으나 사용자가 월수금 같은 반복 요일을 지정해 월간 캘린더로 보는 화면이 부족하다.',
        gap: '운동 영상형 Flow는 반복 요일, 기간, 회차별 기록이 한 화면에서 캘린더로 보여야 한다.',
      },
      {
        kind: 'memo',
        artifactTitle: '운동 후 몸 상태 기록',
        simulatedInputs: ['회차=1회차', '운동시간=18분', '피로도=4', '통증=없음', '메모=점프 없이 가능'],
        expectedOutput: ['회차, 실제 소요시간, 피로도, 통증 여부, 다음 회차 조정 메모'],
        currentFlowMatch: '일반 메모는 가능하지만 운동 기록 전용 필드는 없다.',
        currentUxSupport: '체크 완료 후 기록을 남기는 affordance가 약해 사용자가 완료만 누르고 떠날 가능성이 있다.',
        gap: '운동 루틴에는 완료 체크 뒤 짧은 기록 입력이 자연스럽게 이어져야 한다.',
      },
    ],
    currentContentGap: '동작명보다 반복 일정과 실행 후 몸 상태 기록이 핵심인데 현재 콘텐츠는 todo 목록 중심이다.',
    currentUxGap: '반복 요일을 캘린더에 박아 보여주는 월간 루틴 화면이 부족하다.',
    nextContentAction: '전신 운동 Flow를 회차 단위 루틴+기록형으로 재구성한다.',
    nextUxAction: 'routine Flow에 요일 선택, 월간 반복 캘린더, 회차별 상태 기록 preview를 추가한다.',
    decision: 'reshape_content_or_ux',
  },
  {
    slug: 'real-thankyou-bubu-video-daily-stretch-9min',
    checkedAt: '2026-05-22',
    sourceTitle: 'ThankyouBUBU 하루 9분 전신 스트레칭 BEST',
    sourceUrl: 'https://www.youtube.com/watch?v=aob4Lh1Vebk',
    sourceEvidence: [
      '영상 제목이 하루 9분 전신 스트레칭과 운동 전후 활용 맥락을 제시하므로 짧은 반복 루틴으로 전환하기 쉽다.',
      '스트레칭은 한 번 보고 끝나는 정보보다 아침, 운동 전, 운동 후 같은 반복 트리거와 더 잘 맞는다.',
    ],
    userScenario: '사용자는 아침마다 9분 스트레칭을 해보고 싶지만 매일 하는 것은 부담스러워 평일 아침 반복과 주말 휴식을 설정하려 한다.',
    naturalArtifacts: [
      {
        kind: 'routine_calendar',
        artifactTitle: '평일 아침 9분 스트레칭 루틴 캘린더',
        simulatedInputs: ['시작일=2026-06-02', '반복=평일 07:40', '휴식=토/일', '소요시간=9분'],
        expectedOutput: [
          '월~금 오전 7:40에 스트레칭 일정 생성',
          '각 회차에 목/어깨, 허리, 하체 이완 체크',
          '주말은 자동 휴식일로 표시',
        ],
        currentFlowMatch: 'routine 구조는 맞지만 짧은 루틴의 반복 요일과 휴식일이 콘텐츠에 드러나지 않는다.',
        currentUxSupport: '현재 UX는 루틴 시작일 위주라 평일만 반복 같은 자연 입력을 충분히 지원하지 않는다.',
        gap: '짧은 루틴 Flow에는 반복 빈도와 제외 요일이 필수 입력이어야 한다.',
      },
      {
        kind: 'todo_list',
        artifactTitle: '운동 전후 스트레칭 체크리스트',
        simulatedInputs: ['사용맥락=러닝 전후', '러닝요일=화/목/토', '목표=부상 예방'],
        expectedOutput: ['러닝 전 9분 스트레칭', '러닝 후 하체 이완', '통증 부위 메모', '다음 운동 강도 조정'],
        currentFlowMatch: '동작 체크리스트로는 변환 가능하지만 운동 전후라는 트리거가 약하다.',
        currentUxSupport: '루틴과 다른 Flow 일정의 연결이 없어 러닝일에 붙여 쓰기 어렵다.',
        gap: '루틴 Flow는 단독 반복뿐 아니라 다른 일정 전후에 붙는 트리거형 반복도 고려해야 한다.',
      },
    ],
    currentContentGap: '현재 항목은 스트레칭 실행 자체에 머물고 반복 트리거, 휴식일, 운동 전후 용도를 분리하지 않는다.',
    currentUxGap: '짧은 반복 루틴을 한눈에 월간으로 확인하는 화면이 없다.',
    nextContentAction: '스트레칭 Flow를 매일형/운동전후형 두 사용 시나리오로 분리한다.',
    nextUxAction: 'routine 설정에 반복 요일, 제외 요일, 연결 트리거를 넣는다.',
    decision: 'reshape_content_or_ux',
  },
  {
    slug: 'real-fitvely-video-body-fat-6kg-method',
    checkedAt: '2026-05-22',
    sourceTitle: 'FITVELY 체지방 6kg 감량 비법',
    sourceUrl: 'https://www.youtube.com/watch?v=EQcoKqDO8Ds',
    sourceEvidence: [
      '체지방 감량 방법 콘텐츠는 단일 체크리스트보다 식단, 운동, 체중/체지방 기록이 반복되는 추적형 산출물과 잘 맞는다.',
      '사용자는 영상의 원칙을 자기 식사와 운동 루틴에 적용하며 매일 기록하고 주간으로 조정할 가능성이 높다.',
    ],
    userScenario: '사용자는 4주간 체지방을 줄이기 위해 식단 원칙과 운동 여부를 기록하고, 매주 체중과 허리둘레 변화를 확인하려 한다.',
    naturalArtifacts: [
      {
        kind: 'spreadsheet',
        artifactTitle: '4주 체지방 감량 기록표',
        simulatedInputs: ['시작일=2026-06-01', '목표=체지방 -2kg', '측정=월요일 아침', '운동=주4회', '식단=단백질 우선'],
        expectedOutput: [
          '날짜, 체중, 허리둘레, 운동 여부, 식단 준수, 수면, 메모 컬럼',
          '주간 평균과 지난주 대비 변화량',
          '2주 연속 정체 시 식단/운동 조정 메모',
        ],
        currentFlowMatch: '현재 routine 구조는 반복 체크는 가능하지만 체중/둘레/식단 같은 수치 기록이 약하다.',
        currentUxSupport: '체크리스트 UI는 있으나 표 형태 기록과 주간 요약 preview가 부족하다.',
        gap: '다이어트 콘텐츠는 체크보다 로그와 주간 리포트가 핵심 산출물이다.',
      },
      {
        kind: 'routine_calendar',
        artifactTitle: '운동+식단 반복 실행 캘린더',
        simulatedInputs: ['반복=월/화/목/토 운동', '식단체크=매일 저녁', '리셋=매주 일요일'],
        expectedOutput: ['운동일 일정', '매일 식단 체크 알림', '일요일 주간 측정/리뷰 일정'],
        currentFlowMatch: '운동/식단 항목이 있으나 서로 다른 반복 주기를 한 Flow 안에서 조합하는 모델이 부족하다.',
        currentUxSupport: '한 Flow 안에 여러 반복 패턴을 캘린더로 미리보기 어렵다.',
        gap: '다이어트 Flow는 여러 루틴이 같은 달력에 겹쳐 보여야 한다.',
      },
    ],
    currentContentGap: '체지방 감량 콘텐츠는 원칙 적용과 기록이 핵심인데 현재 항목은 실행 체크 중심이다.',
    currentUxGap: '식단/운동/측정처럼 서로 다른 반복 주기를 한 달력에서 조합하지 못한다.',
    nextContentAction: '다이어트 Flow를 로그형 spreadsheet와 루틴형 calendar를 함께 가진 구조로 바꾼다.',
    nextUxAction: 'routine Flow에 복수 반복 규칙과 주간 기록표 preview를 추가한다.',
    decision: 'reshape_content_or_ux',
  },
  {
    slug: 'real-fitvely-video-workout-split-science',
    checkedAt: '2026-05-22',
    sourceTitle: 'FITVELY 과학적으로 운동루틴 짜는법',
    sourceUrl: 'https://www.youtube.com/watch?v=-GJMwcES45A',
    sourceEvidence: [
      '영상 제목은 분할법, 세트수, 무게, 휴식, 운동 종류처럼 사용자가 자기 주간 운동표로 재구성해야 하는 요소를 담고 있다.',
      '단순 todo보다 요일별 부위, 세트수, 휴식일, 중량 기록을 포함한 루틴 설계표가 자연 산출물이다.',
    ],
    userScenario: '사용자는 헬스장 주 4회 루틴을 짜기 위해 가슴/등/하체/어깨 요일과 세트수, 휴식일을 월간 캘린더에 배치하려 한다.',
    naturalArtifacts: [
      {
        kind: 'routine_calendar',
        artifactTitle: '주 4회 분할 운동 월간 캘린더',
        simulatedInputs: ['시작일=2026-06-01', '분할=상체/하체/휴식/상체/하체', '운동일=월/화/목/금', '휴식=수/토/일'],
        expectedOutput: [
          '월요일 상체A, 화요일 하체A, 목요일 상체B, 금요일 하체B 반복',
          '휴식일은 회색으로 표시',
          '각 회차에 세트수, 중량, RPE 기록칸 제공',
        ],
        currentFlowMatch: '현재 Flow는 운동 순서를 체크할 수 있지만 분할법을 월간 루틴으로 설계하는 정보가 부족하다.',
        currentUxSupport: '복수 운동 항목을 요일별로 반복 배치하는 UI가 없다.',
        gap: '운동루틴 설계 콘텐츠에는 루틴 빌더와 월간 반영 preview가 필요하다.',
      },
      {
        kind: 'comparison_table',
        artifactTitle: '분할법 선택 비교표',
        simulatedInputs: ['후보A=무분할 주3회', '후보B=상하체 주4회', '후보C=3분할 주5회', '제약=평일 4일 가능'],
        expectedOutput: ['후보, 주당 횟수, 회복 부담, 장비 필요, 예상 소요시간, 선택 여부'],
        currentFlowMatch: '현재 항목은 하나의 루틴을 따라가는 구조라 사용자가 분할법 후보를 비교하기 어렵다.',
        currentUxSupport: 'decision/comparison 화면은 중고차 Flow에는 있으나 운동 루틴형에는 연결되어 있지 않다.',
        gap: '루틴 설계형 콘텐츠는 반복 캘린더 전에 비교/선택 단계가 필요하다.',
      },
    ],
    currentContentGap: '운동루틴 설계 원본은 선택과 설계가 핵심인데 현재 Flow는 이미 정해진 루틴 실행에 가깝다.',
    currentUxGap: '루틴 후보 비교 후 선택한 패턴을 캘린더에 반영하는 UX가 없다.',
    nextContentAction: '운동루틴 설계 Flow를 후보 비교 -> 주간 패턴 확정 -> 월간 반복으로 재구성한다.',
    nextUxAction: 'routine Flow에 comparison_table에서 선택한 반복 규칙을 캘린더로 전환하는 흐름을 추가한다.',
    decision: 'reshape_content_or_ux',
  },
  {
    slug: 'real-sinagong-computer-d30-study',
    checkedAt: '2026-05-22',
    sourceTitle: '시나공 컴퓨터활용능력 학습 자료',
    sourceUrl: 'https://www.sinagong.co.kr/',
    sourceEvidence: [
      '시나공 사이트는 컴퓨터활용능력, 정보처리, 워드프로세서 등 시험별 자료실, 기출문제, 시험대비자료, 핵심요약집, CBT와 온라인 채점 메뉴를 제공한다.',
      '컴활 자료실에는 시험대비자료와 기출문제 게시물이 날짜별로 노출되어 D-30 학습표의 자료 수집 근거로 사용할 수 있다.',
    ],
    userScenario: '사용자는 컴활 1급 필기 시험을 30일 앞두고 기출, 요약, CBT, 오답 복습을 주차별로 나누어 공부표를 만들려 한다.',
    naturalArtifacts: [
      {
        kind: 'monthly_calendar',
        artifactTitle: '컴활 D-30 주차별 학습 달력',
        simulatedInputs: ['시험일=2026-07-05', '과목=컴활1급필기', '평일공부=90분', '주말공부=3시간'],
        expectedOutput: [
          'D-30~D-21 개념+핵심요약',
          'D-20~D-10 기출 5회',
          'D-9~D-3 오답 반복',
          'D-2~D-1 CBT 실전과 시험장 준비',
        ],
        currentFlowMatch: '현재 timeline/end_date 구조는 맞지만 자료실에서 받은 파일과 기출 회차를 붙이는 공간이 부족하다.',
        currentUxSupport: '날짜별 todo는 가능하나 과목/회차/점수 기록을 달력과 함께 보기는 어렵다.',
        gap: '시험 공부 Flow는 일정표와 점수/오답 로그가 함께 필요하다.',
      },
      {
        kind: 'spreadsheet',
        artifactTitle: '기출 회차 점수/오답 기록표',
        simulatedInputs: ['기출회차=2026년 2차/2025년 1차', '합격기준=과목별 40점 이상 평균 60점', '오답복습=2회'],
        expectedOutput: ['회차, 풀이일, 과목별 점수, 평균, 오답 수, 재풀이일, 약점 키워드'],
        currentFlowMatch: '오답 정리 항목은 있으나 실제 점수표 산출물이 없다.',
        currentUxSupport: '체크리스트는 점수 변화를 보여주지 못한다.',
        gap: '자격증 학습 Flow는 캘린더뿐 아니라 spreadsheet형 성과 로그가 필요하다.',
      },
    ],
    currentContentGap: 'source가 넓은 사이트라 특정 자료/회차가 Flow item과 직접 매핑되지 않는다.',
    currentUxGap: 'D-30 일정은 가능하지만 자료 링크, 회차 점수, 오답 로그가 한 화면에 없다.',
    nextContentAction: '시나공 Flow의 source precision을 broad로 유지하고 대표 자료 유형별 item link를 보강한다.',
    nextUxAction: 'study timeline에 점수/오답 spreadsheet preview를 결합한다.',
    decision: 'reshape_content_or_ux',
  },
  {
    slug: 'real-mofa-overseas-travel-prep',
    checkedAt: '2026-05-22',
    sourceTitle: '외교부 해외안전여행',
    sourceUrl: 'https://www.0404.go.kr/',
    sourceEvidence: [
      '해외안전여행 서비스는 국가/지역별 여행경보, 여행 전 점검사항, 위기상황별 대처매뉴얼, 영사안전콜센터, 동행서비스를 제공한다.',
      '앱/모바일 페이지는 여행일정 등록, 실시간 해외안전정보, 위급상황 시 가족 또는 지인에게 내 위치 전송 같은 여행 중 실행 정보를 포함한다.',
    ],
    userScenario: '사용자는 베트남 여행 전 여행경보, 여권/비자, 영사콜센터, 가족 공유 정보를 정리하고 출국 전날까지 확인하려 한다.',
    naturalArtifacts: [
      {
        kind: 'monthly_calendar',
        artifactTitle: '출국 D-14 해외안전 준비 달력',
        simulatedInputs: ['출국일=2026-07-20', '방문국=베트남', '동행=부모님', '공유대상=가족 단톡방'],
        expectedOutput: [
          'D-14 여행경보와 안전공지 확인',
          'D-10 여권/비자/입국 조건 확인',
          'D-7 영사콜센터와 현지 공관 연락처 저장',
          'D-1 가족에게 일정과 숙소 공유',
        ],
        currentFlowMatch: '여행 안전 준비 항목은 대체로 있으나 공식 확인 결과를 저장하는 구조가 약하다.',
        currentUxSupport: 'timeline UI는 맞지만 국가명과 확인일을 입력해 재확인하는 인터랙션이 없다.',
        gap: '여행 안전 Flow는 국가별 확인 결과와 재확인일이 핵심 필드여야 한다.',
      },
      {
        kind: 'memo',
        artifactTitle: '비상 연락처 오프라인 메모',
        simulatedInputs: ['영사콜센터=+82-2-3210-0404', '현지공관=주베트남대사관', '보험=OO손보', '가족=배우자'],
        expectedOutput: ['영사콜센터, 현지 공관, 보험사, 숙소, 가족 연락처, 여권 사본 위치'],
        currentFlowMatch: '긴급 연락처 저장 항목은 있으나 실제 오프라인 메모 출력 형태가 약하다.',
        currentUxSupport: '메모는 item에 묶여 있어 한 장짜리 비상 카드로 복사하기 어렵다.',
        gap: '여행 Flow는 체크리스트 외에 비상 카드 export가 필요하다.',
      },
    ],
    currentContentGap: '공식 사이트의 여행경보/동행/영사콜센터 기능이 Flow 안에서 별도 산출물로 분리되지 않는다.',
    currentUxGap: '국가별 공식 확인 결과와 비상 연락처 카드를 만들기 어렵다.',
    nextContentAction: '해외안전 Flow를 국가별 확인표와 비상 연락처 카드 중심으로 보강한다.',
    nextUxAction: 'travel timeline에 국가 입력, 확인일, 비상 카드 복사 preview를 추가한다.',
    decision: 'reshape_content_or_ux',
  },
  {
    slug: 'real-ts-vehicle-inspection-prep',
    checkedAt: '2026-05-22',
    sourceTitle: 'TS한국교통안전공단 자동차검사 절차 안내',
    sourceUrl: 'https://main.kotsa.or.kr/portal/contents.do?menuCode=01010104',
    sourceEvidence: [
      'TS 안내는 자동차검사가 관능검사, ABS검사, 하체검사, 전조등 검사, 배출가스 검사, 검사결과 설명으로 시행된다고 설명한다.',
      '관능검사에는 차대번호, 원동기 형식, 등록번호판, 봉인상태, 불법구조변경, 전자센서, 오일량, 타이어, 브레이크 패드 등이 포함된다.',
    ],
    userScenario: '사용자는 자동차 정기검사 예약일을 앞두고 서류, 타이어/등화, 검사소 방문, 결과 후 정비 메모를 준비하려 한다.',
    naturalArtifacts: [
      {
        kind: 'monthly_calendar',
        artifactTitle: '자동차검사 예약 전후 준비 달력',
        simulatedInputs: ['검사일=2026-06-18', '차량=아반떼 2021', '검사소=성산검사소', '예약=2026-06-18 10:30'],
        expectedOutput: [
          'D-7 검사 기간과 예약 확인',
          'D-3 등록증/보험/등화/타이어 점검',
          'D-Day 검사소 방문과 결제',
          'D+1 결과표 보관과 정비 필요 항목 등록',
        ],
        currentFlowMatch: 'timeline 구조와 차량 점검 항목은 맞다.',
        currentUxSupport: '예약 시간, 검사소, 결과표 보관 같은 정보가 일반 메모에만 들어간다.',
        gap: '자동차검사 Flow는 예약 정보와 검사 결과 후속 정비가 별도 산출물로 보여야 한다.',
      },
      {
        kind: 'checklist',
        artifactTitle: '검사 전 자가점검 체크리스트',
        simulatedInputs: ['확인=등화/타이어/와이퍼/경고등', '서류=자동차등록증', '결제=카드'],
        expectedOutput: ['등록번호판/봉인 확인', '전조등/방향지시등 확인', '타이어 마모 확인', '경고등 확인', '검사 결과표 저장'],
        currentFlowMatch: '기본 자가점검 항목은 포함되어 있다.',
        currentUxSupport: '검사 절차별로 접힘 구분이 약해 사용자가 무엇을 검사소에서 보는지 알기 어렵다.',
        gap: '공식 검사 절차와 사용자 사전점검 항목을 분리해서 보여야 한다.',
      },
    ],
    currentContentGap: '공식 절차와 사용자가 검사 전 할 자가점검이 섞여 있다.',
    currentUxGap: '예약 정보, 검사소 정보, 결과 후 정비 메모가 카드로 분리되지 않는다.',
    nextContentAction: '자동차검사 Flow를 검사 전 준비, 검사소 방문, 결과 후 정비로 재구성한다.',
    nextUxAction: 'vehicle timeline에 예약 카드와 검사 결과 follow-up 메모를 추가한다.',
    decision: 'promote_to_manual_source_fit',
  },
  {
    slug: 'real-safe-driving-license-renewal',
    checkedAt: '2026-05-22',
    sourceTitle: '한국도로교통공단 운전면허증 발급 가이드',
    sourceUrl: 'https://www.safedriving.or.kr/guide/larGuide10.do?menuCode=MN-PO-12111o',
    sourceEvidence: [
      '안전운전 통합민원은 적성검사와 갱신, 재발급, 국제운전면허증 등 유형별 수수료와 준비물, 인터넷/대리접수 가능 여부를 구분해 안내한다.',
      '적성검사는 운전면허증, 6개월 이내 여권용 사진 2매, 건강검진결과 활용 가능성, 신체검사장 유무 같은 조건이 필요하다.',
    ],
    userScenario: '사용자는 2종 보통 면허 갱신 대상인지 적성검사 대상인지 헷갈려서 준비물, 수수료, 온라인 가능 여부를 표로 정리하려 한다.',
    naturalArtifacts: [
      {
        kind: 'monthly_calendar',
        artifactTitle: '면허 갱신 마감 준비 달력',
        simulatedInputs: ['만료일=2026-08-31', '면허=2종보통', '나이=45', '사진촬영=필요', '수령=시험장 방문'],
        expectedOutput: [
          'D-30 대상 유형 확인',
          'D-21 사진 촬영',
          'D-14 온라인 신청 또는 방문 예약',
          'D-7 수령 장소/수수료 확인',
          'D-Day 면허증 수령',
        ],
        currentFlowMatch: '현재 checklist/none이라 기한을 입력하지 않으면 마감 준비가 보이지 않는다.',
        currentUxSupport: '날짜 없는 체크리스트로는 갱신기간 경과 리스크를 충분히 보여주기 어렵다.',
        gap: '면허 갱신은 checklist가 아니라 선택적 마감일 입력이 있는 deadline Flow가 더 적합하다.',
      },
      {
        kind: 'comparison_table',
        artifactTitle: '적성검사/갱신/재발급 조건 비교표',
        simulatedInputs: ['후보A=2종 갱신', '후보B=1종 적성검사', '후보C=분실 재발급', '선택=2종 갱신'],
        expectedOutput: ['유형, 준비물, 사진 매수, 수수료, 인터넷 가능 여부, 대리 가능 여부, 수령 조건'],
        currentFlowMatch: '준비물 체크는 있으나 본인 유형을 고르는 비교 단계가 없다.',
        currentUxSupport: '사용자가 자신에게 맞는 경로를 선택한 뒤 checklist가 줄어드는 UX가 없다.',
        gap: '행정 발급 Flow는 먼저 유형을 선택하고 그에 맞는 체크리스트로 필터링되어야 한다.',
      },
    ],
    currentContentGap: '면허 발급 가이드는 유형별 조건표가 핵심인데 현재 Flow는 단일 체크리스트로 단순화되어 있다.',
    currentUxGap: '사용자 유형 선택과 마감일 입력이 없어서 실제 준비 일정으로 전환하기 어렵다.',
    nextContentAction: '면허 갱신 Flow를 유형 선택형 행정 checklist+deadline Flow로 재구성한다.',
    nextUxAction: 'checklist Flow에 optional deadline과 조건 분기 필터를 추가한다.',
    decision: 'reshape_content_or_ux',
  },
  {
    slug: 'real-gov24-resident-register-copy',
    checkedAt: '2026-05-22',
    sourceTitle: '정부24 주민등록표 등본 발급 민원안내',
    sourceUrl: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=13100000015&HighCtgCD=A1004',
    sourceEvidence: [
      '정부24 민원 안내 원문은 직접 본문 접근이 제한되어 검색 인덱스와 공공 민원 안내를 보조 확인했으며, 인터넷/방문/FAX/우편/무인발급기 신청과 즉시 처리, 인터넷 무료 발급이 핵심 정보다.',
      '주민등록등본은 발급 자체보다 제출처 요구, 주민번호 공개 범위, PDF/출력 방식, 제출 증빙 보관이 사용자의 실제 관리 산출물이다.',
    ],
    userScenario: '사용자는 은행 대출 서류로 주민등록등본을 제출해야 해서 공개 범위와 PDF 저장본, 제출 완료 여부를 체크리스트로 관리하려 한다.',
    naturalArtifacts: [
      {
        kind: 'checklist',
        artifactTitle: '주민등록등본 제출 전 발급 체크리스트',
        simulatedInputs: ['제출처=은행 대출', '서류=주민등록등본', '공개범위=주민번호 뒷자리 비공개', '제출방식=PDF 업로드'],
        expectedOutput: [
          '제출처가 요구한 서류명과 발급일 기준 확인',
          '본인 인증 수단 준비',
          '주민번호/세대원 표시 범위 선택',
          'PDF 저장 또는 출력 방식 선택',
          '제출 전 발급일, 표시항목, 파일명을 재확인',
        ],
        currentFlowMatch: '현재 checklist 구조는 발급 준비 항목을 담을 수 있지만 제출처 요구와 공개 범위 선택이 구조화되어 있지 않다.',
        currentUxSupport: '체크와 메모는 가능하나 제출처, 공개범위, 파일 위치 같은 행정 증빙 필드가 없다.',
        gap: '행정서류 Flow는 발급 전 조건 선택과 제출 후 증빙 보관이 한 체크리스트 안에 보여야 한다.',
      },
      {
        kind: 'memo',
        artifactTitle: '발급본 검수/제출 증빙 메모',
        simulatedInputs: ['발급일=2026-06-03', '파일명=등본_은행제출.pdf', '제출기한=2026-06-10', '제출상태=업로드 완료'],
        expectedOutput: ['발급일, 파일 위치, 공개 범위, 제출처, 제출 기한, 제출 상태, 재발급 필요 여부'],
        currentFlowMatch: '일반 메모로 일부 기록할 수 있지만 발급 문서 검수 카드로 보이지 않는다.',
        currentUxSupport: '메모가 item 단위라 최종 제출 증빙을 한 장으로 복사하기 어렵다.',
        gap: '민원 발급 Flow에는 제출 증빙 memo export가 필요하다.',
      },
    ],
    currentContentGap: '현재 Flow는 발급하기 행동 중심이고 제출처 요구와 표시항목 검수 기준이 약하다.',
    currentUxGap: '체크리스트는 있으나 행정서류용 조건 필터와 제출 증빙 카드가 없다.',
    nextContentAction: '주민등록등본 Flow를 제출처 요구 확인, 표시항목 선택, 발급, 제출 증빙 보관 순서로 재구성한다.',
    nextUxAction: 'checklist Flow에 제출처/공개범위/파일위치 같은 행정 증빙 필드를 추가한다.',
    decision: 'reshape_content_or_ux',
  },
  {
    slug: 'real-childcare-support-application-check',
    checkedAt: '2026-05-22',
    sourceTitle: '아이사랑 시간제 보육 이용안내',
    sourceUrl: 'https://www.childcare.go.kr/?menuno=202',
    sourceEvidence: [
      '아이사랑 시간제보육 안내는 독립반 6개월~36개월 미만, 통합반 6개월 이상 0~2세 영아, 월 60시간 지원, 평일 운영시간, 시간 단위 예약을 안내한다.',
      '제공기관 첫 방문 시 이용신청서/운영규정서약서, 가족관계증명서와 신분증, 기저귀/침구/간식 같은 개별 준비물이 필요하다.',
    ],
    userScenario: '사용자는 24개월 아이를 반나절 맡기기 위해 이용 조건을 확인하고 근처 기관의 가능 시간대를 비교한 뒤 첫 방문 서류와 준비물을 챙기려 한다.',
    naturalArtifacts: [
      {
        kind: 'checklist',
        artifactTitle: '시간제보육 예약 실행 체크리스트',
        simulatedInputs: ['아이월령=24개월', '희망일=2026-06-18', '이용시간=13:00-16:00', '지역=마포구'],
        expectedOutput: [
          '지원 대상과 월 이용 가능 시간 확인',
          '아이사랑 회원가입과 아동 등록',
          '희망 지역 제공기관과 가능 시간 조회',
          '예약과 결제 방식 확인',
          '첫 방문 서류와 기저귀/침구/간식 준비',
        ],
        currentFlowMatch: '현재 checklist 구조는 신청 단계를 담기 좋지만 아이 월령, 지역, 희망 시간 같은 입력값이 없다.',
        currentUxSupport: '일반 체크는 가능하나 예약 후보를 비교하고 선택하는 화면이 없다.',
        gap: '보육 신청 Flow는 기관/시간 후보를 고른 뒤 선택한 후보 기준으로 준비물이 좁혀져야 한다.',
      },
      {
        kind: 'comparison_table',
        artifactTitle: '시간제보육 기관/시간 후보표',
        simulatedInputs: ['후보A=센터A 13:00-16:00', '후보B=센터B 10:00-13:00', '우선순위=거리/시간', '첫방문=서류 제출 필요'],
        expectedOutput: ['기관명, 거리, 가능 시간, 지원/본인부담 금액, 예약 가능 여부, 첫 방문 서류, 선택 여부'],
        currentFlowMatch: '현재 Flow는 기관 비교 전제를 갖고 있지 않다.',
        currentUxSupport: '중고차용 비교표 UX는 있지만 보육 checklist에는 연결되지 않았다.',
        gap: '신청형 육아 Flow에도 candidate comparison이 필요하다.',
      },
    ],
    currentContentGap: '공식 안내의 이용 대상, 시간, 서류, 준비물이 Flow item에 직접 매핑되어 있지 않다.',
    currentUxGap: '지역/시간 입력과 기관 후보 비교가 없어 실제 예약 의사결정까지 이어지지 않는다.',
    nextContentAction: '시간제보육 Flow를 조건 확인, 기관 후보 비교, 예약, 첫 방문 준비로 재구성한다.',
    nextUxAction: 'checklist Flow에 조건 입력과 후보 비교표를 선택적으로 붙일 수 있게 한다.',
    decision: 'reshape_content_or_ux',
  },
  {
    slug: 'real-pet-health-visit-routine',
    checkedAt: '2026-05-22',
    sourceTitle: '국가동물보호정보시스템 자주하는 질문',
    sourceUrl: 'https://www.animal.go.kr/front/awtis/faq/faqList.do?menuNo=2000000021',
    sourceEvidence: [
      '국가동물보호정보시스템 FAQ는 법적 효력이 없는 자주 묻는 질문임을 명시하고, 등록대행업체가 주로 동물병원이라는 점과 등록증 출력/변경 신고 같은 행정 정보를 제공한다.',
      '현재 원본은 반려동물 건강 방문 루틴의 직접 가이드라기보다 동물등록/행정 FAQ에 가깝다.',
    ],
    userScenario: '사용자는 동물병원 방문 전에 최근 증상, 식욕, 배변, 접종/등록 정보를 정리하고 방문 후 재진과 접종 리마인더를 남기려 한다.',
    naturalArtifacts: [
      {
        kind: 'checklist',
        artifactTitle: '동물병원 방문 전 질문/증상 체크리스트',
        simulatedInputs: ['방문일=2026-06-12', '증상=구토 2회', '식욕=감소', '기록=동물등록번호/접종수첩'],
        expectedOutput: [
          '증상 발생 시간과 횟수',
          '식욕/음수/배변/활동 변화',
          '동물등록번호와 이전 진료 기록',
          '수의사에게 물어볼 질문',
          '검사/처방 동의 전 확인사항',
        ],
        currentFlowMatch: 'Flow 주제는 건강 방문 준비와 맞지만 현재 원본은 이 건강 방문 체크리스트를 직접 뒷받침하지 못한다.',
        currentUxSupport: '메모와 체크는 가능하나 증상 타임라인과 질문 목록을 별도 산출물로 보여주지 않는다.',
        gap: '반려동물 건강 방문 Flow는 더 정확한 수의학/병원 방문 원본으로 교체하거나 보강해야 한다.',
      },
      {
        kind: 'routine_calendar',
        artifactTitle: '다음 접종/재진 캘린더',
        simulatedInputs: ['시작일=2026-06-12', '재진=2주 후', '복약=7일', '예방접종=매년 6월'],
        expectedOutput: ['복약 종료일', '2주 후 재진 일정', '다음 예방접종 월간 리마인더', '이상 증상 관찰 메모'],
        currentFlowMatch: 'routine 구조는 맞지만 source가 건강 루틴을 충분히 설명하지 않는다.',
        currentUxSupport: '단일 반복은 가능하나 복약 종료, 재진, 연간 접종처럼 다른 주기를 함께 표시하기 어렵다.',
        gap: '건강 Flow는 복수 리마인더와 방문 메모가 함께 필요하다.',
      },
    ],
    currentContentGap: '현재 원본은 동물등록 FAQ라 건강 방문 루틴의 근거로는 broad/reference 수준이다.',
    currentUxGap: '증상 기록, 질문 목록, 복약/재진/접종의 서로 다른 리마인더를 한 화면에서 만들기 어렵다.',
    nextContentAction: '반려동물 건강 방문 Flow는 더 직접적인 병원 방문/예방접종 안내 원본을 찾은 뒤 재감사한다.',
    nextUxAction: 'routine Flow에 복수 리마인더와 방문 전 질문 메모 export를 추가한다.',
    decision: 'keep_catalog_review',
  },
  {
    slug: 'real-ohouse-movein-cleaning-check',
    checkedAt: '2026-05-22',
    sourceTitle: '오늘의집 원룸 입주청소 가격표',
    sourceUrl: 'https://ohou.se/advices/12375',
    sourceEvidence: [
      '오늘의집 글은 10평 기준 20만~30만 원, 청소 범위/인원/날짜에 따른 비용 차이, 주말/성수기 20~30% 상승 가능성, 추가 비용 발생 포인트를 설명한다.',
      '업체 선택 기준으로 최소 2~3곳 비교, 후기 확인, 추가 비용 여부, 서비스 범위 확인을 제시하고 원룸 입주청소 체크리스트를 제공한다.',
    ],
    userScenario: '사용자는 원룸 입주 전 셀프 청소와 업체 청소 비용을 비교하고 2~3개 업체 견적의 포함/제외 범위와 재청소 기준을 정리하려 한다.',
    naturalArtifacts: [
      {
        kind: 'comparison_table',
        artifactTitle: '입주청소 견적 비교표',
        simulatedInputs: ['평수=9평', '입주일=2026-07-01', '후보A=18만원 기본청소', '후보B=24만원 창틀 포함', '추가=곰팡이/베란다 확인'],
        expectedOutput: [
          '업체명과 견적 금액',
          '기본/고급 청소 범위',
          '창틀, 베란다, 곰팡이 제거 포함 여부',
          '주말/성수기 추가비',
          '재청소 기준과 예약 가능일',
          '선택 여부',
        ],
        currentFlowMatch: '현재 checklist는 청소 범위 확인에는 맞지만 견적 후보 비교가 핵심 산출물로 보이지 않는다.',
        currentUxSupport: 'decision Flow 비교표 UX가 있지만 이 입주청소 checklist에는 아직 연결되어 있지 않다.',
        gap: '비용이 걸린 주거 Flow는 업체 후보 비교표를 먼저 보여줘야 한다.',
      },
      {
        kind: 'checklist',
        artifactTitle: '청소 후 검수/재청소 요청 체크리스트',
        simulatedInputs: ['청소일=2026-06-29', '확인공간=화장실/주방/창틀', '미흡=창틀 먼지', '증빙=사진 6장'],
        expectedOutput: ['공간별 사진 체크', '계약 범위 대비 미흡 목록', '재청소 요청 메시지', '재확인일', '입주 전 최종 확인'],
        currentFlowMatch: '입주청소 준비 항목은 있지만 청소 후 검수와 재청소 요청 단계가 약하다.',
        currentUxSupport: '메모는 가능하나 사진/증빙 중심 검수 카드가 없다.',
        gap: '청소 Flow는 계약 전 비교와 작업 후 검수라는 두 산출물이 분리되어야 한다.',
      },
    ],
    currentContentGap: '원본은 가격 구조와 업체 선택 기준이 핵심인데 현재 Flow는 단순 준비 체크리스트로 축소되어 있다.',
    currentUxGap: '견적 비교, 추가비 확인, 재청소 증빙 메모가 연결되지 않는다.',
    nextContentAction: '입주청소 Flow를 비용 비교, 계약 전 포함범위 확인, 청소 후 검수로 재구성한다.',
    nextUxAction: 'financial-sensitive checklist에 comparison_table과 proof memo를 결합한다.',
    decision: 'reshape_content_or_ux',
  },
];

export function getNaturalArtifactAudit(slug: string): RealSourceNaturalArtifactAudit | undefined {
  return realSourceNaturalArtifactAudits.find((audit) => audit.slug === slug);
}

export function summarizeNaturalArtifactAuditCoverage(
  bundles: FlowBundle[],
): NaturalArtifactAuditCoverageSummary {
  const realSourceBundles = bundles.filter((bundle) => bundle.flow.source_status === 'real');
  const auditedSlugs = new Set(realSourceNaturalArtifactAudits.map((audit) => audit.slug));
  const auditedCategoryCounts: Record<string, number> = {};
  const decisionCounts: DecisionCounts = { ...emptyDecisionCounts };

  for (const audit of realSourceNaturalArtifactAudits) {
    const bundle = realSourceBundles.find((entry) => entry.flow.slug === audit.slug);
    if (bundle) {
      auditedCategoryCounts[bundle.flow.category] = (auditedCategoryCounts[bundle.flow.category] ?? 0) + 1;
    }
    decisionCounts[audit.decision] += 1;
  }

  return {
    realSourceCount: realSourceBundles.length,
    auditedRealSourceCount: realSourceBundles.filter((bundle) => auditedSlugs.has(bundle.flow.slug)).length,
    remainingRealSourceCount: realSourceBundles.filter((bundle) => !auditedSlugs.has(bundle.flow.slug)).length,
    auditedCategoryCounts,
    decisionCounts,
  };
}
