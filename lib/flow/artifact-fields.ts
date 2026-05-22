import type { FlowBundle } from './types';

export type ArtifactComparisonRow = {
  id: string;
  title: string;
};

export type ArtifactMemoField = {
  id: string;
  label: string;
  placeholder: string;
  groupTitle?: string;
  groupEyebrow?: string;
  groupDescription?: string;
};

const movingSlugs = new Set(['moving-d30-basic', 'real-ohouse-moving-d30-prep']);
const travelSlugs = new Set(['overseas-travel-d14', 'real-mofa-overseas-travel-prep']);

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

export function getComparisonRows(bundle: FlowBundle): ArtifactComparisonRow[] {
  if (movingSlugs.has(bundle.flow.slug)) return movingVendorComparisonRows;
  return bundle.items.map((item) => ({ id: item.id, title: item.title }));
}

export function getMemoCardFields(bundle: FlowBundle): ArtifactMemoField[] {
  if (movingSlugs.has(bundle.flow.slug)) return movingProofMemoFields;
  if (travelSlugs.has(bundle.flow.slug)) return travelProofMemoFields;
  return [];
}
