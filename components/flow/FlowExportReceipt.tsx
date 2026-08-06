'use client';

import type { FlowExportResultReceipt } from '@/lib/flow/export-scope';
import { FlowReceipt } from './FlowExecutionPrimitives';

const destinationLabels = {
  calendar: '캘린더 파일',
  checklist: '체크리스트',
  sheet: '시트',
  memo: '메모',
} as const;

export function FlowExportReceipt({
  receipt,
  flowTitle,
  sourceLabel,
  stableIdentity,
  q3CopyEnabled = true,
}: {
  receipt: FlowExportResultReceipt;
  flowTitle?: string;
  sourceLabel?: string;
  stableIdentity?: string;
  q3CopyEnabled?: boolean;
}) {
  const scopeLabels = {
    flow: q3CopyEnabled ? '계획 전체' : 'Flow 전체',
    selected: '선택 항목',
    item: '현재 항목',
  } as const;
  const successful = receipt.status === 'success';
  const partial = receipt.status === 'partial';

  return (
    <FlowReceipt
      data-testid="flow-export-result-receipt"
      data-export-scope={receipt.scope}
      data-export-destination={receipt.destination}
      data-export-output-count={receipt.outputCount}
      data-export-omitted-count={receipt.omittedCount}
      data-export-stable-identity={stableIdentity}
      data-transfer-request-id={receipt.transferRequestId}
      data-snapshot-kind={receipt.snapshotKind}
      data-snapshot-version={receipt.snapshotVersion}
      data-snapshot-hash={receipt.snapshotHash}
      data-item-ids={receipt.itemIds?.join(',')}
      data-item-count={receipt.itemCount}
      data-artifact-output-count={receipt.artifactOutputCount}
      data-one-way={receipt.oneWay === undefined ? undefined : String(receipt.oneWay)}
      data-outcome={receipt.outcome}
      data-persisted-at={receipt.persistedAt}
      data-p29-marker="P29-EXPORT-RECEIPT-IDENTITY"
      data-p35-marker="P35-EXPORT-COUNT-PARITY"
      data-flow-anatomy="export-receipt"
      role="status"
      aria-live="polite"
      compact
      tone={successful ? 'success' : partial ? 'warning' : 'error'}
      label={`${scopeLabels[receipt.scope]} · ${destinationLabels[receipt.destination]}`}
      title={receipt.message}
      className="mt-3"
    >
      {flowTitle ? (
        <p data-testid="flow-export-result-identity" className="mt-1 text-xs font-semibold">
          {flowTitle}{sourceLabel ? ` · 출처 ${sourceLabel}` : ''}
        </p>
      ) : null}
      {receipt.omittedCount > 0 ? (
        <p className="mt-1 text-xs font-medium">{receipt.omittedCount}개 제외</p>
      ) : null}
      {partial ? (
        <p className="mt-1 text-xs font-medium">결과는 만들어졌지만 기록을 남기지 못했어요. 결과를 다시 만들지 말고 기록만 다시 저장하세요.</p>
      ) : !successful ? (
        <p className="mt-1 text-xs font-medium">잠시 후 다시 시도해 주세요.</p>
      ) : receipt.filename ? (
        <p data-testid="flow-export-result-filename" className="mt-1 break-all text-xs font-medium">
          {receipt.filename}
        </p>
      ) : (
        <p className="mt-1 text-xs font-medium">클립보드에 담았습니다.</p>
      )}
      {successful ? (
        <p data-testid="flow-export-result-next-action" className="mt-1 text-xs font-medium">
          {q3CopyEnabled ? '저장한 계획에서 계속 실행할 수 있어요.' : '저장한 Flow에서 계속 실행할 수 있어요.'}
        </p>
      ) : null}
    </FlowReceipt>
  );
}
