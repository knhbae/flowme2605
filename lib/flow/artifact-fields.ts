import type { FlowBundle } from './types';

export type ArtifactComparisonRow = {
  id: string;
  title: string;
};

export type ArtifactMemoField = {
  id: string;
  label: string;
  placeholder: string;
};

const movingSlugs = new Set(['moving-d30-basic', 'real-ohouse-moving-d30-prep']);

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

export function getComparisonRows(bundle: FlowBundle): ArtifactComparisonRow[] {
  if (movingSlugs.has(bundle.flow.slug)) return movingVendorComparisonRows;
  return bundle.items.map((item) => ({ id: item.id, title: item.title }));
}

export function getMemoCardFields(bundle: FlowBundle): ArtifactMemoField[] {
  if (movingSlugs.has(bundle.flow.slug)) return movingProofMemoFields;
  return [];
}
