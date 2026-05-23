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
};

export type ArtifactLogTable = {
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  rows: ArtifactLogRow[];
  columns: ArtifactLogColumn[];
};

const movingSlugs = new Set(['moving-d30-basic', 'real-ohouse-moving-d30-prep']);
const travelSlugs = new Set(['overseas-travel-d14', 'real-mofa-overseas-travel-prep']);
const studySlugs = new Set(['real-sinagong-computer-d30-study']);
const driverLicenseSlugs = new Set(['driver-license-renewal-check']);
const familyCertificateSlugs = new Set(['family-certificate-issue']);
const residentRegisterSlugs = new Set(['resident-register-copy-issue']);
const qnetExamSlugs = new Set(['qnet-exam-application-prep']);

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
  if (movingSlugs.has(bundle.flow.slug)) {
    return {
      title: '이사 업체 후보 비교',
      eyebrow: '업체 비교표',
      rows: movingVendorComparisonRows,
    };
  }
  return undefined;
}

export function getMemoCardFields(bundle: FlowBundle): ArtifactMemoField[] {
  if (familyCertificateSlugs.has(bundle.flow.slug)) return familyCertificateMemoFields;
  if (residentRegisterSlugs.has(bundle.flow.slug)) return residentRegisterMemoFields;
  if (movingSlugs.has(bundle.flow.slug)) return movingProofMemoFields;
  if (travelSlugs.has(bundle.flow.slug)) return travelProofMemoFields;
  return [];
}

export function getLogTables(bundle: FlowBundle): ArtifactLogTable[] {
  if (qnetExamSlugs.has(bundle.flow.slug)) return qnetLogTables;
  if (studySlugs.has(bundle.flow.slug)) return studyLogTables;
  return [];
}
