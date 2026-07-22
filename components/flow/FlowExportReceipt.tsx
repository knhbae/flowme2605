'use client';

import type { FlowExportResultReceipt } from '@/lib/flow/export-scope';
import { FlowReceipt } from './FlowExecutionPrimitives';

const scopeLabels = {
  flow: 'Flow 전체',
  selected: '선택 항목',
  item: '현재 항목',
} as const;

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
}: {
  receipt: FlowExportResultReceipt;
  flowTitle?: string;
  sourceLabel?: string;
}) {
  const successful = receipt.status === 'success';

  return (
    <FlowReceipt
      data-testid="flow-export-result-receipt"
      data-export-scope={receipt.scope}
      data-export-destination={receipt.destination}
      data-export-output-count={receipt.outputCount}
      data-export-omitted-count={receipt.omittedCount}
      data-p29-marker="P29-EXPORT-RECEIPT-IDENTITY"
      data-flow-anatomy="export-receipt"
      role="status"
      aria-live="polite"
      compact
      tone={successful ? 'success' : 'error'}
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
      {!successful ? (
        <p className="mt-1 text-xs font-medium">잠시 후 다시 시도해 주세요.</p>
      ) : receipt.filename ? (
        <p data-testid="flow-export-result-filename" className="mt-1 break-all text-xs font-medium">
          {receipt.filename}
        </p>
      ) : (
        <p className="mt-1 text-xs font-medium">클립보드에 담았습니다.</p>
      )}
    </FlowReceipt>
  );
}
