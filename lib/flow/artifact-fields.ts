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
  if (movingSlugs.has(bundle.flow.slug)) return movingProofMemoFields;
  if (travelSlugs.has(bundle.flow.slug)) return travelProofMemoFields;
  return [];
}

export function getLogTables(bundle: FlowBundle): ArtifactLogTable[] {
  if (studySlugs.has(bundle.flow.slug)) return studyLogTables;
  return [];
}
