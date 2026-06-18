import type { FlowBundle } from './types';

export type ArtifactComparisonRow = {
  id: string;
  title: string;
};

export type ArtifactComparisonConfig = {
  title: string;
  eyebrow: string;
  rows: ArtifactComparisonRow[];
};

export type ArtifactMemoField = {
  id: string;
  label: string;
  placeholder: string;
  groupTitle?: string;
  groupEyebrow?: string;
  groupDescription?: string;
};

export type ArtifactLogColumn = {
  id: string;
  label: string;
  placeholder: string;
};

export type ArtifactLogRow = {
  id: string;
  label: string;
  defaultValues?: Record<string, string>;
};

export type ArtifactLogTable = {
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  sourceKind?: 'source_derived';
  readOnlyColumnIds?: string[];
  userEditableColumnIds?: string[];
  rows: ArtifactLogRow[];
  columns: ArtifactLogColumn[];
};

const movingSlugs = new Set(['moving-d30-basic', 'real-ohouse-moving-d30-prep']);
const travelSlugs = new Set(['overseas-travel-d14']);
const studySlugs = new Set(['real-sinagong-computer-d30-study', 'computer-skills-d30-study']);
const driverLicenseSlugs = new Set(['driver-license-renewal-check', 'real-safe-driving-license-renewal']);
const familyCertificateSlugs = new Set(['family-certificate-issue']);
const residentRegisterSlugs = new Set(['resident-register-copy-issue', 'real-gov24-resident-register-copy']);
const qnetExamSlugs = new Set(['qnet-exam-application-prep', 'real-qnet-application-examday-check']);
const childcareVisitSlugs = new Set(['real-childcare-vaccination-visit-prep']);
const kdcaTravelHealthSlugs = new Set(['real-kdca-travel-health-check']);
const childcareSupportSlugs = new Set(['real-childcare-support-application-check']);
const newCarDeliverySlugs = new Set(['new-car-delivery-check']);
const usedCarSlugs = new Set(['used-car-buying-check']);
const workoutProgrammingSlugs = new Set([
  'real-fitvely-video-bulk-up-method',
  'real-fitvely-video-workout-order',
  'real-fitvely-video-workout-split-science',
]);
const fitvelyNutritionExactVideoSlugs = new Set([
  'real-fitvely-video-body-fat-6kg-method',
  'real-fitvely-video-carb-reason',
  'real-fitvely-video-three-week-check',
  'real-fitvely-video-post-workout-nutrition',
  'real-fitvely-video-carb-amount-shorts',
  'real-fitvely-video-after-work-nutrition',
  'real-fitvely-video-weight-class-method',
]);
const vehicleInspectionSlugs = new Set(['vehicle-inspection-prep']);
const taxDocumentSlugs = new Set(['year-end-tax-docs']);
const businessRegistrationSlugs = new Set(['business-registration-basic']);
const happyBirthSlugs = new Set(['happy-birth-service-check']);
const industrialAccidentSlugs = new Set(['industrial-accident-claim-docs']);
const healthCheckupSlugs = new Set(['national-health-checkup-d7']);
const vaccinationCertificateSlugs = new Set(['vaccination-certificate-issue']);
const jobChangeRiskSlugs = new Set(['job-change-risk-check']);
const fitvelyDietRecordSlugs = new Set(['real-fitvely-diet-record-routine']);
const waterPurifierFilterSlugs = new Set(['water-purifier-filter-cycle']);

const driverLicenseComparisonRows: ArtifactComparisonRow[] = [
  { id: 'driver-license-renewal-type', title: '면허/갱신 유형' },
  { id: 'driver-license-health-check', title: '건강검진 자료 활용 가능 여부' },
  { id: 'driver-license-materials-fee', title: '사진·신분증·수수료 준비' },
  { id: 'driver-license-apply-pickup', title: '온라인 신청 또는 방문 수령 경로' },
];

const familyCertificateMemoFields: ArtifactMemoField[] = [
  {
    id: 'family-submitter-requirement',
    label: '제출처 요구사항',
    placeholder: '예: 은행 제출, 상세 증명서 요구, 3개월 이내 발급본',
    groupEyebrow: '제출 전 요구사항',
    groupTitle: '가족관계증명서 제출 메모',
    groupDescription: '제출처가 요구한 증명서 종류와 공개 범위를 발급 전에 한곳에 정리합니다.',
  },
  {
    id: 'family-certificate-kind',
    label: '증명서 종류',
    placeholder: '예: 가족관계증명서 / 혼인관계증명서 / 기본증명서',
  },
  {
    id: 'family-detail-scope',
    label: '일반/상세/특정 범위',
    placeholder: '예: 상세, 본인 기준, 배우자와 자녀 표시 필요',
  },
  {
    id: 'family-disclosure-scope',
    label: '주민등록번호 공개 범위',
    placeholder: '예: 뒷자리 비공개, 제출처 확인 완료',
  },
  {
    id: 'family-file-location',
    label: '파일/출력 위치',
    placeholder: '예: PDF 파일명, 출력본 보관 위치, 제출 완료 여부',
  },
];

const residentRegisterMemoFields: ArtifactMemoField[] = [
  {
    id: 'resident-submitter-requirement',
    label: '제출처 요구사항',
    placeholder: '예: 회사 제출, 초본, 주소 변동 전체 필요',
    groupEyebrow: '개인정보 공개 범위',
    groupTitle: '등본·초본 제출 메모',
    groupDescription: '제출처 요구사항과 표시 항목을 먼저 적어 개인정보 공개 범위 실수를 줄입니다.',
  },
  {
    id: 'resident-document-kind',
    label: '등본/초본 선택',
    placeholder: '예: 초본, 개인 인적사항 중심',
  },
  {
    id: 'resident-display-items',
    label: '주소 변동·세대원·병역 표시',
    placeholder: '예: 주소 변동 전체, 세대원 미표시, 병역 표시',
  },
  {
    id: 'resident-disclosure-scope',
    label: '주민등록번호 공개 범위',
    placeholder: '예: 뒷자리 비공개, 제출처 확인 완료',
  },
  {
    id: 'resident-file-location',
    label: '발급일·파일 위치',
    placeholder: '예: 2026-05-23 발급, PDF 파일명 또는 출력본 위치',
  },
];

const passportRenewalMemoFields: ArtifactMemoField[] = [
  {
    id: 'passport-applicant-context',
    label: '여행일·신청자·신청 경로',
    placeholder: '예: 2026-08-15 출국, 본인 성인 재발급, 정부24 온라인 신청',
    groupEyebrow: '신청 전 제출 메모',
    groupTitle: '여권 재발급 제출 메모',
    groupDescription: '여행 일정, 사진 확인, 접수번호, 수령·보관 정보를 한 장에 남겨 신청 후 다시 찾는 일을 줄입니다.',
  },
  {
    id: 'passport-photo-check',
    label: '사진 규격 확인',
    placeholder: '예: 2026-05 촬영, 6개월 이내, 배경·크기 공식 안내 확인',
  },
  {
    id: 'passport-old-passport-status',
    label: '기존 여권 상태',
    placeholder: '예: 만료일 2026-07-10, 훼손 없음, 반납/지참 필요 여부 확인',
  },
  {
    id: 'passport-application-proof',
    label: '접수번호·상태 캡처',
    placeholder: '예: 접수번호 2026-000000, 정부24 처리상태 캡처 passport-receipt.png',
  },
  {
    id: 'passport-pickup-storage',
    label: '수령일·보관 위치',
    placeholder: '예: 2026-06-20 구청 수령, 여권 지갑과 스캔본 보관 위치',
  },
];

const childcareVisitMemoFields: ArtifactMemoField[] = [
  {
    id: 'childcare-visit-purpose',
    label: '방문 목적과 예약 시간',
    placeholder: '예: 4개월 예방접종 + 영유아 검진, 2026-06-03 10:30',
    groupEyebrow: '의료 방문 메모',
    groupTitle: '영유아 검진/접종 방문 카드',
    groupDescription: '의료진 판단이 필요한 내용과 보호자 관찰 메모를 분리해 방문 전후 기록으로 남깁니다.',
  },
  {
    id: 'childcare-recent-symptoms',
    label: '최근 증상/복용/특이사항',
    placeholder: '예: 최근 발열 없음, 감기약 복용 없음, 수면이 평소보다 짧음',
  },
  {
    id: 'childcare-questions',
    label: '진료실에서 물어볼 질문',
    placeholder: '예: 접종 후 목욕 가능 여부, 다음 접종 전 관찰할 증상',
  },
  {
    id: 'childcare-post-visit-observation',
    label: '방문 후 관찰 메모',
    placeholder: '예: 접종 부위 붓기 없음, 24시간 체온 관찰',
  },
  {
    id: 'childcare-next-visit',
    label: '다음 방문/접종 일정',
    placeholder: '예: 다음 접종 2026-07-05, 예약 필요',
  },
];

const kdcaTravelHealthMemoFields: ArtifactMemoField[] = [
  {
    id: 'kdca-destination',
    label: '여행 국가/지역',
    placeholder: '예: 태국 방콕, 2026-07-18 출국',
    groupEyebrow: '질병관리청 확인 메모',
    groupTitle: '해외여행 건강 준비 카드',
    groupDescription: '국가별 공식 확인일, 상담 필요 여부, 재확인 날짜를 여행 일정과 분리해 기록합니다.',
  },
  {
    id: 'kdca-official-check-date',
    label: '공식 정보 확인일',
    placeholder: '예: KDCA 해외여행 건강정보 2026-06-20 확인',
  },
  {
    id: 'kdca-vaccine-consultation',
    label: '예방접종/예방약 상담 메모',
    placeholder: '예: 출국 4주 전 여행클리닉 상담 예약 필요',
  },
  {
    id: 'kdca-medicine-kit',
    label: '상비약/개인 의약품 준비',
    placeholder: '예: 평소 복용약, 해열제, 처방전 영문명 메모',
  },
  {
    id: 'kdca-recheck-date',
    label: '출국 전 재확인 날짜',
    placeholder: '예: 출국 7일 전 KDCA/외교부 공지 재확인',
  },
];

const qnetLogTables: ArtifactLogTable[] = [
  {
    id: 'qnet-application-deadlines',
    eyebrow: '접수 deadline',
    title: '접수·결제 마감 기록',
    description: '시험일과 별도로 움직이는 접수 마감, 결제 완료, 환불·변경 마감을 기록합니다.',
    rows: [
      { id: 'qnet-application-deadline', label: '원서접수 마감' },
      { id: 'qnet-payment-complete', label: '결제 완료' },
      { id: 'qnet-change-refund-deadline', label: '환불·변경 마감' },
    ],
    columns: [
      { id: 'due', label: '마감/시점', placeholder: '예: 2026-06-10 18:00' },
      { id: 'status', label: '상태/결정', placeholder: '예: 접수 완료, 결제 대기' },
      { id: 'evidence', label: '증빙/메모', placeholder: '예: Q-Net 접수 내역 캡처' },
    ],
  },
  {
    id: 'qnet-exam-day-records',
    eyebrow: '시험 당일',
    title: '수험표·시험장 준비 기록',
    description: '수험표 출력, 시험장 위치, 입실 시간, 합격자 발표일을 당일 준비 메모로 묶습니다.',
    rows: [
      { id: 'qnet-admission-ticket', label: '수험표 출력' },
      { id: 'qnet-exam-site', label: '시험장·입실 시간' },
      { id: 'qnet-result-date', label: '합격자 발표일' },
    ],
    columns: [
      { id: 'due', label: '마감/시점', placeholder: '예: 2026-07-15 09:00' },
      { id: 'status', label: '상태/결정', placeholder: '예: 서울동부 시험장, 08:30 도착' },
      { id: 'evidence', label: '증빙/메모', placeholder: '예: 수험표 PDF, 교통편 40분' },
    ],
  },
];

const childcareSupportComparisonRows: ArtifactComparisonRow[] = [
  { id: 'childcare-support-age-condition', title: '아이 월령/반 유형 조건' },
  { id: 'childcare-support-monthly-hours', title: '월 지원 시간과 본인부담 확인' },
  { id: 'childcare-support-center-slot', title: '제공기관 후보와 가능한 시간대' },
  { id: 'childcare-support-first-visit-docs', title: '첫 방문 서류와 준비물' },
];

const newCarDeliveryMemoFields: ArtifactMemoField[] = [
  {
    id: 'new-car-delivery-place',
    label: '인수 장소와 담당자',
    placeholder: '예: 마포 전시장 인도장, 김OO 매니저',
    groupEyebrow: '인수 증빙 메모',
    groupTitle: '사진·딜러 확인·서명 전 보류 기록',
    groupDescription: '체크 완료보다 사진 파일명, 딜러 확인, 보류 조건을 먼저 남깁니다. FLOW는 인수 여부를 대신 판단하지 않습니다.',
  },
  {
    id: 'new-car-photo-files',
    label: '사진/영상 파일명',
    placeholder: '예: door-scratch-4821.jpg, hud-test-20260603.mp4',
  },
  {
    id: 'new-car-dealer-confirmation',
    label: '딜러 확인 내용',
    placeholder: '예: 운전석 도어 하단 스크래치 확인, 보수 일정 문자로 받기로 함',
  },
  {
    id: 'new-car-handover-boundary',
    label: '인수 보류/서명 경계 메모',
    placeholder: '예: 보수 일정과 문서 확인 전 인수 서명하지 않음',
  },
];

const usedCarComparisonRows: ArtifactComparisonRow[] = [
  { id: 'used-car-price-mileage', title: '후보별 가격·주행거리' },
  { id: 'used-car-history-record', title: '사고 이력·성능점검기록부' },
  { id: 'used-car-seller-memo', title: '판매자 설명·현장 확인 메모' },
  { id: 'used-car-hold-reason', title: '구매 보류 사유' },
];

const workoutProgrammingComparisonRows: ArtifactComparisonRow[] = [
  { id: 'workout-source-rule-candidate', title: '원본 영상에서 고른 기준 후보' },
  { id: 'workout-user-condition-fit', title: '내 일정·회복·장비 조건 적합성' },
  { id: 'workout-weekly-plan-application', title: '이번 주 운동표에 반영할 칸' },
  { id: 'workout-revise-or-hold', title: '수정하거나 보류할 조건' },
];

const usedCarDecisionMemoFields: ArtifactMemoField[] = [
  {
    id: 'used-car-target-need',
    label: '구매 목적과 예산 경계',
    placeholder: '예: 출퇴근용, 총예산 1,500만원, 수리비 100만원 넘으면 보류',
    groupEyebrow: '구매 판단 메모',
    groupTitle: '후보 비교·조회·보류 메모',
    groupDescription: 'FLOW가 구매 여부를 대신 판단하지 않고, 후보별 공식 조회 결과와 보류 사유를 가볍게 남기도록 돕습니다.',
  },
  {
    id: 'used-car-proof-files',
    label: '조회 결과/사진 메모(선택)',
    placeholder: '예: 성능점검표 확인, 사고이력 조회 완료, 필요하면 tire-front.jpg',
  },
  {
    id: 'used-car-expert-check',
    label: '정비사/전문가 확인 내용',
    placeholder: '예: 하부 누유 확인 필요, 리프트 점검 전 계약 보류',
  },
  {
    id: 'used-car-buy-hold-memo',
    label: '구매 보류/진행 메모',
    placeholder: '예: 사고 이력 설명과 성능점검표가 맞지 않으면 진행하지 않음',
  },
];

const vehicleInspectionMemoFields: ArtifactMemoField[] = [
  {
    id: 'vehicle-inspection-reservation',
    label: '검사 예약 정보',
    placeholder: '예: 2026-06-18 10:30, 성산검사소, 예약번호/접수 문자',
    groupEyebrow: '예약·결과 증빙',
    groupTitle: '검사 예약·결과 후속 메모',
    groupDescription: '예약 정보, 준비 서류, 결과표, 후속 정비를 체크 완료와 분리해 보관합니다.',
  },
  {
    id: 'vehicle-inspection-documents',
    label: '서류/차량 정보',
    placeholder: '예: 자동차등록증, 보험 상태, 차량번호/차대번호 확인',
  },
  {
    id: 'vehicle-inspection-precheck-evidence',
    label: '사전 점검 증빙',
    placeholder: '예: 등화장치 영상, 타이어 사진, 경고등 없음 메모',
  },
  {
    id: 'vehicle-inspection-result-sheet',
    label: '검사 결과표 보관',
    placeholder: '예: 적합/부적합, 결과표 사진 또는 PDF 파일명',
  },
  {
    id: 'vehicle-inspection-repair-follow-up',
    label: '후속 정비/재검사 메모',
    placeholder: '예: 전조등 정비 예약, 재검사 기한, 예상 비용',
  },
];

const taxDocumentMemoFields: ArtifactMemoField[] = [
  {
    id: 'tax-company-deadline',
    label: '회사 제출 마감',
    placeholder: '예: 2026-01-23 18:00, 회사 시스템 업로드',
    groupEyebrow: '공식 일정/회사 제출',
    groupTitle: '연말정산 제출 메모',
    groupDescription: '공제 가능 여부를 Flow가 판단하지 않고, 공식 자료 확인일과 회사 제출 상태를 분리해 기록합니다.',
  },
  { id: 'tax-final-data-date', label: '최종자료 확인일', placeholder: '예: 간소화 최종자료 2026-01-20 확인' },
  { id: 'tax-extra-documents', label: '추가 증빙 목록', placeholder: '예: 월세 계약서, 기부금 영수증, 안경 구입비' },
  { id: 'tax-deduction-caution', label: '공제 판단 주의', placeholder: '예: 부양가족/월세 공제 가능 여부는 회사 또는 국세청 확인' },
  { id: 'tax-submission-status', label: '제출 상태와 증빙 위치', placeholder: '예: PDF 업로드 완료, 원본 파일 D:\\tax\\2026' },
];

const businessRegistrationMemoFields: ArtifactMemoField[] = [
  {
    id: 'business-type-question',
    label: '업종/과세유형 확인 질문',
    placeholder: '예: 온라인 소매, 간이/일반 과세 여부는 세무서 확인',
    groupEyebrow: '공식 확인 질문',
    groupTitle: '사업자등록 준비 메모',
    groupDescription: '업종·인허가·세무 판단은 확정하지 않고, 신청 전 공식 확인 질문과 준비 증빙만 남깁니다.',
  },
  { id: 'business-place-document', label: '사업장/임대차 증빙', placeholder: '예: 자택 사업장, 임대차계약서 해당 없음 확인 필요' },
  { id: 'business-license-permit', label: '인허가 별도 확인', placeholder: '예: 통신판매업 신고 별도 확인' },
  { id: 'business-tax-office-question', label: '세무서/홈택스 확인 질문', placeholder: '예: 업종코드, 첨부서류, 처리기간 질문' },
  { id: 'business-submission-proof', label: '신청 증빙 위치', placeholder: '예: 접수번호, 캡처 파일, 보완 요청 여부' },
];

const happyBirthMemoFields: ArtifactMemoField[] = [
  {
    id: 'happy-birth-child-date',
    label: '출생일/신청 기준일',
    placeholder: '예: 출생일 2026-06-04, 신청 예정일 2026-06-10',
    groupEyebrow: '가족정보 주의',
    groupTitle: '행복출산 신청 준비 메모',
    groupDescription: '거주지·가구 조건과 지급 여부는 공식 확인 대상으로 두고, 민감 가족정보는 필요한 범위만 기록합니다.',
  },
  { id: 'happy-birth-household-area', label: '거주지/가구 조건 확인', placeholder: '예: 서울 마포구, 주민센터 또는 정부24에서 지원 항목 확인' },
  { id: 'happy-birth-guardian-account', label: '보호자/계좌 준비', placeholder: '예: 부모급여 수령 계좌 확인, 보호자 신분증 준비' },
  { id: 'happy-birth-official-question', label: '공식 확인 질문', placeholder: '예: 우리 구 추가 지원, 신청 가능 기간, 중복 신청 여부' },
  { id: 'happy-birth-submission-proof', label: '제출 증빙 위치', placeholder: '예: 신청 완료 캡처, 접수번호, 보완 안내' },
];

const industrialAccidentMemoFields: ArtifactMemoField[] = [
  {
    id: 'industrial-claim-type',
    label: '청구 유형',
    placeholder: '예: 요양비, 이송비, 보조기, 약제비',
    groupEyebrow: '증빙 수집/공식 판단 분리',
    groupTitle: '산재 요양비 청구 증빙 메모',
    groupDescription: '지급 가능성은 확정하지 않고, 청구 유형·금액·파일·보완요청을 증빙표로 남깁니다.',
  },
  { id: 'industrial-receipt-files', label: '영수증/진료비 파일명', placeholder: '예: receipt-2026-05-12.pdf, detail-claim.xlsx' },
  { id: 'industrial-amount-record', label: '금액 기록', placeholder: '예: 본인부담 128,000원, 청구 검토 대상' },
  { id: 'industrial-official-question', label: '근로복지공단 확인 질문', placeholder: '예: 보완서류, 청구 가능 항목, 제출 경로' },
  { id: 'industrial-supplement-request', label: '보완 요청/처리 상태', placeholder: '예: 2026-06-03 보완 요청, 진료확인서 추가' },
];

const healthCheckupMemoFields: ArtifactMemoField[] = [
  {
    id: 'health-check-date-place',
    label: '검진기관/예약시간',
    placeholder: '예: 2026-06-19 08:30, OO검진센터',
    groupEyebrow: '의료기관 확인 질문',
    groupTitle: '건강검진 준비 질문 메모',
    groupDescription: '금식·복용약·내시경 이동은 Flow 지시가 아니라 기관/의료진에게 확인할 질문으로 기록합니다.',
  },
  { id: 'health-check-medicine-question', label: '복용약 확인 질문', placeholder: '예: 혈압약 복용 여부를 검진기관에 문의' },
  { id: 'health-check-fasting-confirmation', label: '금식 안내 확인', placeholder: '예: 기관 안내 문자 기준, 물/약 복용 가능 여부 확인' },
  { id: 'health-check-endoscopy-transport', label: '수면내시경 이동 계획', placeholder: '예: 보호자 동행, 자가운전 안 함' },
  { id: 'health-check-result-method', label: '결과 수령 방법', placeholder: '예: 모바일/우편/방문 수령, 재상담 필요 여부' },
];

const vaccinationCertificateMemoFields: ArtifactMemoField[] = [
  {
    id: 'vaccination-certificate-target',
    label: '대상자',
    placeholder: '예: 자녀 이름, 생년월일, 보호자 관계',
    groupEyebrow: '의료기록 증명 메모',
    groupTitle: '예방접종증명서 제출 메모',
    groupDescription: '접종 이력 누락이나 수정 판단은 공식 기관 확인으로 분리하고, 제출처 요구사항만 기록합니다.',
  },
  { id: 'vaccination-certificate-language', label: '언어/발급 형식', placeholder: '예: 국문 PDF, 영문 필요 여부 확인' },
  { id: 'vaccination-certificate-submit-requirement', label: '제출처 요구사항', placeholder: '예: 어린이집 제출, 최근 3개월 이내 발급본' },
  { id: 'vaccination-certificate-missing-record', label: '누락/수정 공식 확인', placeholder: '예: 누락 기록은 보건소/접종기관 확인' },
  { id: 'vaccination-certificate-file-location', label: '파일/출력 위치', placeholder: '예: PDF 저장 위치, 출력본 보관 위치' },
];

const jobChangeRiskMemoFields: ArtifactMemoField[] = [
  {
    id: 'job-change-company-question',
    label: '회사 확인 질문',
    placeholder: '예: 퇴사 통보 기한, 인수인계, 연차 정산 기준',
    groupEyebrow: '개인 판단/공식 확인 분리',
    groupTitle: '이직 전 리스크 메모',
    groupDescription: '재정·노무 결론을 내리지 않고 회사 질문, 공공기관 확인, 개인 현금흐름 메모를 분리합니다.',
  },
  { id: 'job-change-public-insurance-check', label: '고용보험/건강보험 확인', placeholder: '예: 이직확인서 처리, 자격 이력, 공백 기간 보험 처리' },
  { id: 'job-change-retirement-pay-note', label: '퇴직급여/IRP 메모', placeholder: '예: 지급 예정일, 필요 계좌, 회사 확인 담당자' },
  { id: 'job-change-gap-budget', label: '공백 기간 생활비 메모', placeholder: '예: 14일 공백, 월세/카드/보험료 현금흐름' },
  { id: 'job-change-decision-boundary', label: '확정하지 않을 판단', placeholder: '예: 실업급여 가능 여부, 법적 분쟁 가능성은 공식 상담' },
];

const movingVendorComparisonRows: ArtifactComparisonRow[] = [
  { id: 'moving-vendor-price', title: '이사 업체 견적 금액' },
  { id: 'moving-vendor-included-service', title: '포함 서비스' },
  { id: 'moving-vendor-ladder-elevator', title: '사다리차/엘리베이터 조건' },
  { id: 'moving-vendor-available-date', title: '가능 날짜와 시간' },
  { id: 'moving-vendor-damage-rule', title: '파손/분실 보상 기준' },
];

const movingProofMemoFields: ArtifactMemoField[] = [
  {
    id: 'moving-proof-contract-location',
    label: '견적서/계약서 위치',
    placeholder: '예) 문자 견적 캡처, PDF 파일명, 카카오톡 대화 위치',
    groupEyebrow: '계약·결제 증빙',
    groupTitle: '증빙 메모',
    groupDescription: '견적, 계약금, 잔금, 보상 기준을 흩어진 캡처 대신 한곳에 남겨둡니다.',
  },
  {
    id: 'moving-proof-deposit',
    label: '계약금/예약금 증빙',
    placeholder: '예) 10만원 이체 완료, 입금자명, 캡처 위치',
  },
  {
    id: 'moving-proof-balance-date',
    label: '잔금 예정일과 이체 한도',
    placeholder: '예) D-Day 오전 잔금, 전날 한도 증액 확인',
  },
  {
    id: 'moving-proof-damage-rule',
    label: '파손/분실 보상 기준',
    placeholder: '예) 파손 사진 즉시 공유, 보상 접수 연락처',
  },
  {
    id: 'moving-proof-final-call',
    label: '최종 통화 확인 메모',
    placeholder: '예) 방문 시간, 인원, 차량, 추가비 없음 확인',
  },
];

const travelProofMemoFields: ArtifactMemoField[] = [
  {
    id: 'travel-destination',
    label: '방문 국가/도시',
    placeholder: '예) 일본 도쿄',
    groupEyebrow: '공식 확인·비상 카드',
    groupTitle: '공식 확인·비상 카드',
    groupDescription: '국가별 입국 조건과 비상 연락처를 한 장에 남겨둡니다.',
  },
  {
    id: 'travel-entry-condition',
    label: '입국 조건 확인 결과',
    placeholder: '예) 무비자 90일, 여권 6개월 이상 확인',
  },
  {
    id: 'travel-alert-status',
    label: '여행경보 확인 결과',
    placeholder: '예) 외교부 안전공지 2026-07-16 확인',
  },
  {
    id: 'travel-baggage-rule',
    label: '항공·수하물 규정 확인',
    placeholder: '예) 보조배터리 기내만, 액체류 100ml',
  },
  {
    id: 'travel-emergency-contact',
    label: '영사콜센터·현지 공관',
    placeholder: '예) 영사콜센터 +82-2-3210-0404 / 주일본대사관',
  },
  {
    id: 'travel-share-note',
    label: '숙소·보험·가족 공유 메모',
    placeholder: '예) 호텔 주소와 보험 연락처를 가족 단톡방에 공유',
  },
];

const mofaTravelEmergencyMemoFields: ArtifactMemoField[] = [
  {
    id: 'mofa-travel-destination-confirmation',
    label: '방문 국가와 확인일',
    placeholder: '예: 베트남 다낭, 2026-07-16 외교부 국가/지역별 정보 확인',
    groupEyebrow: '공식 확인·비상 카드',
    groupTitle: '국가별 여행경보·비상 연락 카드',
    groupDescription:
      '여행경보, 안전공지, 공관 연락처, 현지 신고 번호, 가족 공유 메모를 한 장에 남겨 출국 전후에 다시 확인합니다.',
  },
  {
    id: 'mofa-travel-alert-notice',
    label: '여행경보·안전공지 확인 결과',
    placeholder: '예: 여행경보 단계와 최근 안전공지 확인, 야간 이동 주의 필요',
  },
  {
    id: 'mofa-travel-embassy-contact',
    label: '영사콜센터·현지 공관 연락처',
    placeholder: '예: 영사콜센터 +82-2-3210-0404, 주베트남대사관/총영사관 연락처 저장',
  },
  {
    id: 'mofa-travel-local-emergency',
    label: '현지 긴급 신고 번호·보험 연락처',
    placeholder: '예: 현지 경찰/구급 번호, 여행자보험 긴급 지원 번호, 숙소 주소',
  },
  {
    id: 'mofa-travel-family-share',
    label: '가족 공유 메모',
    placeholder: '예: 항공편, 숙소, 동행자, 비상 연락법을 가족 단톡방에 공유',
  },
];

const studyLogTables: ArtifactLogTable[] = [
  {
    id: 'study-chapter-progress',
    eyebrow: '학습 진도표',
    title: '챕터 진도표',
    description: '원본 자료와 교재 범위를 주차별 목표일로 나눠 적습니다.',
    rows: [
      { id: 'study-chapter-week-1', label: '1주차 개념 1회독' },
      { id: 'study-chapter-week-2', label: '2주차 기출 풀이' },
      { id: 'study-chapter-week-3', label: '3주차 오답 보완' },
      { id: 'study-chapter-final', label: '마지막 주 실전 점검' },
    ],
    columns: [
      { id: 'scope', label: '범위', placeholder: '예) 1~3장' },
      { id: 'targetDate', label: '목표일', placeholder: '예) 2026-06-12' },
      { id: 'status', label: '상태', placeholder: '예) 예정/진행/완료' },
      { id: 'note', label: '메모', placeholder: '예) 요약노트 작성' },
    ],
  },
  {
    id: 'study-mock-scores',
    eyebrow: '기출 기록표',
    title: '기출 점수·오답 기록',
    description: '기출 회차별 점수, 오답, 재풀이 날짜를 남겨 약점을 좁힙니다.',
    rows: [
      { id: 'study-mock-1', label: '기출 1회차' },
      { id: 'study-mock-2', label: '기출 2회차' },
      { id: 'study-mock-3', label: '기출 3회차' },
    ],
    columns: [
      { id: 'solvedDate', label: '풀이일', placeholder: '예) 2026-06-13' },
      { id: 'score', label: '점수', placeholder: '예) 78점' },
      { id: 'wrongAnswers', label: '오답', placeholder: '예) 계산 문제 4개' },
      { id: 'retryDate', label: '재풀이일', placeholder: '예) 2026-06-15' },
      { id: 'weaknessNote', label: '약점 메모', placeholder: '예) 스프레드시트 함수' },
    ],
  },
];

const computerSkillsStudyLogTables: ArtifactLogTable[] = [
  {
    id: 'study-chapter-progress',
    sourceKind: 'source_derived',
    readOnlyColumnIds: ['scope'],
    userEditableColumnIds: ['targetDate', 'status', 'note'],
    eyebrow: '원본 기반 진도표',
    title: '챕터 진도표',
    description: '원본 시험 범위에서 가져온 기본 진도 row를 먼저 두고, 날짜와 상태만 조정합니다.',
    rows: [
      {
        id: 'study-chapter-week-1',
        label: '필기 핵심 개념 정리',
        defaultValues: {
          scope: '컴퓨터 일반·스프레드시트 핵심 개념',
          status: '원본에서 가져온 진도',
          note: '시험일까지 먼저 배치하고 약한 단원만 조정',
        },
      },
      {
        id: 'study-chapter-week-2',
        label: '스프레드시트 실기 함수·피벗',
        defaultValues: {
          scope: '함수식, 피벗테이블, 차트 작업',
          status: '원본에서 가져온 진도',
          note: '기출에서 틀린 함수 유형을 약점 메모로 남김',
        },
      },
      {
        id: 'study-chapter-week-3',
        label: '데이터베이스 실기 쿼리·폼',
        defaultValues: {
          scope: '쿼리, 폼, 보고서, 처리 조건',
          status: '원본에서 가져온 진도',
          note: '실기 환경 점검 후 재풀이 날짜 지정',
        },
      },
      {
        id: 'study-chapter-final',
        label: '기출 오답 보완과 실전 점검',
        defaultValues: {
          scope: '기출 회차, 오답 유형, 시험장 준비',
          status: '원본에서 가져온 진도',
          note: '마지막 주에는 새 범위보다 반복 실수 제거',
        },
      },
    ],
    columns: [
      { id: 'scope', label: '범위', placeholder: '예) 함수식, 피벗테이블' },
      { id: 'targetDate', label: '목표일', placeholder: '예) 2026-06-12' },
      { id: 'status', label: '상태', placeholder: '예) 예정/진행/완료' },
      { id: 'note', label: '메모', placeholder: '예) 요약노트 작성' },
    ],
  },
  studyLogTables[1],
];

const fitvelyDietObservationLogTables: ArtifactLogTable[] = [
  {
    id: 'fitvely-diet-observation-log',
    eyebrow: '관찰표',
    title: '식단 기준 관찰표',
    description: '원본 영상에서 고른 식단 기준 1개를 실제 식사, 컨디션, 다음 조정 메모와 함께 기록합니다.',
    rows: [
      { id: 'fitvely-diet-meal', label: '오늘 한 끼 기록' },
      { id: 'fitvely-diet-condition', label: '운동/수면/컨디션' },
      { id: 'fitvely-diet-weekly-adjustment', label: '주간 조정 메모' },
    ],
    columns: [
      { id: 'date', label: '날짜', placeholder: '예) 2026-06-01' },
      { id: 'mealMemo', label: '식사 메모', placeholder: '예) 점심: 닭가슴살, 밥, 샐러드' },
      { id: 'selectedRule', label: '선택 기준', placeholder: '예) 단백질 먼저 확인' },
      { id: 'condition', label: '컨디션', placeholder: '예) 허기/어지러움 없음, 수면 7시간' },
      { id: 'nextAdjustment', label: '다음 조정', placeholder: '예) 저녁 탄수화물 양은 유지' },
    ],
  },
];

const fitvelyNutritionActionObservationLogTables: ArtifactLogTable[] = [
  {
    id: 'fitvely-nutrition-action-observation-log',
    eyebrow: '적용 전후 관찰표',
    title: '오늘 한 끼 적용 관찰표',
    description:
      '원본 영상 기준 1개를 오늘 한 번만 적용하고, 적용 전 상태와 적용 후 반응, 유지/중단 결정을 같은 행에 적습니다.',
    rows: [
      { id: 'fitvely-nutrition-before', label: '적용 전 기록' },
      { id: 'fitvely-nutrition-after', label: '적용 후 기록' },
    ],
    columns: [
      { id: 'date', label: '날짜', placeholder: '예: 2026-06-01' },
      {
        id: 'targetAction',
        label: '적용할 식사·운동 전후 행동',
        placeholder: '예: 다음 점심 한 끼 / 운동 직후 섭취 행동',
      },
      { id: 'selectedRule', label: '영상에서 고른 기준', placeholder: '예: 오늘 한 번 적용할 기준 1개' },
      { id: 'beforeCondition', label: '적용 전 컨디션', placeholder: '예: 허기, 제한감, 운동 전후 상태' },
      { id: 'afterReaction', label: '적용 후 반응', placeholder: '예: 몸 상태, 허기, 폭식 유발감' },
      { id: 'keepOrStop', label: '유지/중단 결정', placeholder: '예: 한 번 더 적용 / 수정 / 중단' },
    ],
  },
];

const waterPurifierFilterLogTables: ArtifactLogTable[] = [
  {
    id: 'water-purifier-filter-cycle-log',
    eyebrow: '필터 주기표',
    title: '정수기 필터 교체 주기표',
    description: '원문에서 따라할 수 있는 필터·출수구 관리 항목만 남기고, 사용자는 마지막 교체일과 다음 확인일만 채웁니다.',
    rows: [
      {
        id: 'sediment-filter',
        label: '침전 필터',
        defaultValues: { cycle: '원문 3~6개월', sourceMemo: '모래·흙·녹물 등 큰 부유물 1차 필터' },
      },
      {
        id: 'pre-carbon-filter',
        label: '프리카본 필터',
        defaultValues: { cycle: '원문 6~12개월', sourceMemo: '염소·화학물질·냄새 제거' },
      },
      {
        id: 'ro-nano-filter',
        label: 'RO/나노 필터',
        defaultValues: { cycle: '원문 12~24개월', sourceMemo: '미세 입자·중금속 등 핵심 정수 필터' },
      },
      {
        id: 'post-carbon-filter',
        label: '후카본 필터',
        defaultValues: { cycle: '원문 9~12개월', sourceMemo: '정수 마지막 단계의 물맛·냄새 개선' },
      },
      { id: 'outlet-self-clean', label: '코크/출수구 자가 살균' },
      { id: 'taste-smell-check', label: '물맛·냄새 확인' },
    ],
    columns: [
      { id: 'lastChangedAt', label: '마지막 교체일', placeholder: '예: 2026-06-01' },
      { id: 'cycle', label: '교체 주기', placeholder: '예: 6개월 / 모델 안내 기준' },
      { id: 'nextCheckAt', label: '다음 확인일', placeholder: '예: 2026-12-01' },
      { id: 'conditionMemo', label: '상태 메모', placeholder: '예: 물맛·냄새 변화 없음' },
      { id: 'sourceMemo', label: '원문/모델 확인', placeholder: '예: 제조사 안내와 원문 링크 확인' },
    ],
  },
];

export function getComparisonRows(bundle: FlowBundle): ArtifactComparisonRow[] {
  const config = getComparisonConfig(bundle);
  if (config) return config.rows;
  return bundle.items.map((item) => ({ id: item.id, title: item.title }));
}

export function getComparisonConfig(bundle: FlowBundle): ArtifactComparisonConfig | undefined {
  if (driverLicenseSlugs.has(bundle.flow.slug)) {
    return {
      title: '면허 갱신/적성검사 조건표',
      eyebrow: '조건 비교',
      rows: driverLicenseComparisonRows,
    };
  }
  if (childcareSupportSlugs.has(bundle.flow.slug)) {
    return {
      title: '시간제보육 이용 조건 비교표',
      eyebrow: '기관/예약 비교',
      rows: childcareSupportComparisonRows,
    };
  }
  if (workoutProgrammingSlugs.has(bundle.flow.slug)) {
    return {
      title: '운동 기준 결정표',
      eyebrow: '기준 선택 후 운동표 반영',
      rows: workoutProgrammingComparisonRows,
    };
  }
  return undefined;
}

export function getMemoCardFields(bundle: FlowBundle): ArtifactMemoField[] {
  if (familyCertificateSlugs.has(bundle.flow.slug)) return familyCertificateMemoFields;
  if (residentRegisterSlugs.has(bundle.flow.slug)) return residentRegisterMemoFields;
  if (childcareVisitSlugs.has(bundle.flow.slug)) return childcareVisitMemoFields;
  if (kdcaTravelHealthSlugs.has(bundle.flow.slug)) return kdcaTravelHealthMemoFields;
  if (taxDocumentSlugs.has(bundle.flow.slug)) return taxDocumentMemoFields;
  if (businessRegistrationSlugs.has(bundle.flow.slug)) return businessRegistrationMemoFields;
  if (happyBirthSlugs.has(bundle.flow.slug)) return happyBirthMemoFields;
  if (industrialAccidentSlugs.has(bundle.flow.slug)) return industrialAccidentMemoFields;
  if (healthCheckupSlugs.has(bundle.flow.slug)) return healthCheckupMemoFields;
  if (vaccinationCertificateSlugs.has(bundle.flow.slug)) return vaccinationCertificateMemoFields;
  if (jobChangeRiskSlugs.has(bundle.flow.slug)) return jobChangeRiskMemoFields;
  if (bundle.flow.slug === 'passport-renewal-docs') return [];
  if (movingSlugs.has(bundle.flow.slug)) return [];
  if (bundle.flow.slug === 'real-mofa-overseas-travel-prep') return [];
  if (travelSlugs.has(bundle.flow.slug)) return travelProofMemoFields;
  if (newCarDeliverySlugs.has(bundle.flow.slug)) return newCarDeliveryMemoFields;
  if (usedCarSlugs.has(bundle.flow.slug)) return [];
  if (vehicleInspectionSlugs.has(bundle.flow.slug)) return [];
  return [];
}

export function getHoldMemoFields(bundle: FlowBundle): ArtifactMemoField[] {
  const section = bundle.flow.hold_section;
  if (!section) return [];
  const isUsedCar = bundle.flow.slug === 'used-car-buying-check';

  return [
    {
      id: `${bundle.flow.slug}-hold-reason`,
      label: '보류 사유',
      placeholder: section.reasons.join(' / '),
      groupEyebrow: isUsedCar ? '구매 보류 메모' : '보류 증거 메모',
      groupTitle: section.title,
      groupDescription: section.consequence,
    },
    {
      id: `${bundle.flow.slug}-hold-evidence-files`,
      label: isUsedCar ? '공식 조회/사진 메모(선택)' : '사진/증빙 파일명',
      placeholder: isUsedCar
        ? '예: 사고이력 조회 완료, 자동차등록원부 압류 없음, 필요하면 하부사진 2장'
        : '예: door-scratch-4821.jpg, usedcar_20260526_engine_noise.mp4',
    },
    {
      id: `${bundle.flow.slug}-hold-confirmation`,
      label: isUsedCar ? '판매자/전문가 확인' : '상대방 확인',
      placeholder: isUsedCar ? '예: 판매자 답변, 정비소 점검 결과, 수리비 견적' : '예: 딜러/판매자에게 재확인 요청한 내용과 답변',
    },
    {
      id: `${bundle.flow.slug}-hold-next-check`,
      label: '다음 확인 시점',
      placeholder: '예: 공식 조회 후, 전문가 점검 후, 서면 확인 받은 뒤',
    },
  ];
}

export function getLogTables(bundle: FlowBundle): ArtifactLogTable[] {
  if (qnetExamSlugs.has(bundle.flow.slug)) return qnetLogTables;
  if (waterPurifierFilterSlugs.has(bundle.flow.slug)) return waterPurifierFilterLogTables;
  if (fitvelyDietRecordSlugs.has(bundle.flow.slug)) return [];
  if (fitvelyNutritionExactVideoSlugs.has(bundle.flow.slug)) return fitvelyNutritionActionObservationLogTables;
  if (bundle.flow.slug === 'computer-skills-d30-study') return [];
  if (studySlugs.has(bundle.flow.slug)) return studyLogTables;
  return [];
}
