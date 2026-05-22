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
