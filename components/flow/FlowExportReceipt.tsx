'use client';

import type { FlowExportResultReceipt } from '@/lib/flow/export-scope';

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

export function FlowExportReceipt({ receipt }: { receipt: FlowExportResultReceipt }) {
  const successful = receipt.status === 'success';

  return (
    <div
      data-testid="flow-export-result-receipt"
      data-export-scope={receipt.scope}
      data-export-destination={receipt.destination}
      data-export-output-count={receipt.outputCount}
      data-export-omitted-count={receipt.omittedCount}
      role="status"
      aria-live="polite"
      className={`mt-3 border-l-2 px-3 py-2 ${
        successful
          ? 'border-[#1F8A5B] bg-[#EFF8F3] text-[#175C40]'
          : 'border-rose-500 bg-rose-50 text-rose-800'
      }`}
    >
      <p className="text-sm font-semibold">{receipt.message}</p>
      <p className="mt-1 text-xs font-medium">
        {scopeLabels[receipt.scope]} · {destinationLabels[receipt.destination]}
        {receipt.omittedCount > 0 ? ` · ${receipt.omittedCount}개 제외` : ''}
      </p>
      {!successful ? (
        <p className="mt-1 text-xs font-medium">잠시 후 다시 시도해 주세요.</p>
      ) : receipt.filename ? (
        <p data-testid="flow-export-result-filename" className="mt-1 break-all text-xs font-medium">
          {receipt.filename}
        </p>
      ) : (
        <p className="mt-1 text-xs font-medium">클립보드에 담았습니다.</p>
      )}
    </div>
  );
}
