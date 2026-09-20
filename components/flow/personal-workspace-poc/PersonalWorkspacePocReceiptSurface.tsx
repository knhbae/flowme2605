import React from 'react';

import type { PersonalWorkspacePocReceipt } from '@/lib/flow/personal-workspace-poc-receipt';

type PersonalWorkspacePocReceiptSurfaceProps = Readonly<{
  receipt: PersonalWorkspacePocReceipt;
  onRetry?: () => void;
  onUndo?: () => void;
  /** The open editor owns failure announcements while its inline error is visible. */
  announce?: boolean;
}>;

const STATUS_LABEL: Record<PersonalWorkspacePocReceipt['status'], string> = {
  saving: '저장 중',
  success: '저장 완료',
  noop: '같은 내용',
  failure: '저장 실패',
  canceled: '취소됨',
  undone: '되돌림 완료',
};

const OWNER_LABEL = {
  'authoring-source': '작성 원문',
  'poc-personal-plan': '내 계획',
  organization: '정리 위치',
  execution: '실행 상태',
} as const;

const RETURN_CONTEXT_LABEL = {
  'parent-plan': 'Flow의 할 일 목록',
  'flow-detail': 'Flow 상세',
  'folder-list': '원래 폴더 목록',
  'period-list': '원래 기간 목록',
  'result-view': '원래 결과 보기',
  'quick-list': '빠른 할 일 목록',
} as const;

function receiptMessage(receipt: PersonalWorkspacePocReceipt): string {
  switch (receipt.status) {
    case 'saving':
      return `${receipt.affectedCount}개 변경을 저장하고 있습니다.`;
    case 'success':
      return `${receipt.affectedCount}개 변경을 저장했습니다.`;
    case 'noop':
      return '같은 내용이라 저장하지 않았습니다.';
    case 'failure':
      return receipt.rollback === 'recovery-required'
        ? '저장을 확인하지 못했습니다. 새로고침한 뒤 복구 상태를 확인해 주세요.'
        : '저장하지 못해 이전 상태를 유지했습니다.';
    case 'canceled':
      return receipt.affectedCount > 0
        ? `${receipt.affectedCount}개 변경을 버리고 ${RETURN_CONTEXT_LABEL[receipt.returnContext]}으로 돌아왔습니다.`
        : `저장할 변경 없이 ${RETURN_CONTEXT_LABEL[receipt.returnContext]}으로 돌아왔습니다.`;
    case 'undone':
      return `${receipt.affectedCount}개 변경을 이전 상태로 되돌렸습니다.`;
  }
}

function displayReceiptValue(value: PersonalWorkspacePocReceipt['changes'][number]['before']): string {
  return value === null || value === '' ? '없음' : String(value);
}

export function PersonalWorkspacePocReceiptSurface({
  receipt,
  onRetry,
  onUndo,
  announce = true,
}: PersonalWorkspacePocReceiptSurfaceProps) {
  return (
    <section
      data-testid="personal-workspace-editor-receipt"
      data-receipt-status={receipt.status}
      data-intent-id={receipt.intentId}
      data-operation={receipt.operation}
      data-scope-ref={receipt.scopeRef}
      data-affected-count={receipt.affectedCount}
      data-target-write-count={receipt.targetWriteCount}
      data-support-write-count={receipt.supportWriteCount}
      data-return-context={receipt.status === 'canceled' ? receipt.returnContext : undefined}
      role={announce ? receipt.status === 'failure' ? 'alert' : 'status' : undefined}
      aria-live={announce ? receipt.status === 'failure' ? 'assertive' : 'polite' : 'off'}
      aria-labelledby="personal-workspace-editor-receipt-heading"
      className="my-3 rounded-md border border-[var(--flowme-border)] bg-white p-3 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2
            id="personal-workspace-editor-receipt-heading"
            className="text-sm font-semibold text-[var(--flowme-text)]"
          >
            {STATUS_LABEL[receipt.status]}
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--flowme-text-secondary)]">
            {receiptMessage(receipt)}
          </p>
        </div>
      </div>

      {receipt.changes.length > 0 ? (
        <ul className="mt-3 divide-y divide-[var(--flowme-border)] border-y border-[var(--flowme-border)]">
          {receipt.changes.map((change) => (
            <li
              key={`${change.owner}:${change.field}`}
              data-receipt-owner={change.owner}
              data-receipt-field={change.field}
              className="grid min-w-0 gap-1 py-2 text-sm sm:grid-cols-[8rem_minmax(0,1fr)]"
            >
              <span className="font-semibold text-[var(--flowme-text-secondary)]">
                {OWNER_LABEL[change.owner]} · {change.label}
              </span>
              <span className="min-w-0 break-words text-[var(--flowme-text)]">
                <span data-receipt-before>{displayReceiptValue(change.before)}</span>
                <span aria-hidden="true"> → </span>
                <span className="font-semibold" data-receipt-after>{displayReceiptValue(change.after)}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {receipt.status === 'failure' && receipt.rollback !== 'recovery-required' && onRetry ? (
          <button
            type="button"
            data-testid="personal-workspace-editor-receipt-retry"
            className="min-h-12 rounded-md border border-[var(--flowme-border-strong)] bg-white px-3 py-2 text-sm font-semibold text-[var(--flowme-action)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]"
            onClick={onRetry}
          >
            다시 시도
          </button>
        ) : null}
        {receipt.status === 'success' && onUndo ? (
          <button
            type="button"
            data-testid="personal-workspace-editor-receipt-undo"
            className="min-h-12 rounded-md border border-[var(--flowme-border-strong)] bg-white px-3 py-2 text-sm font-semibold text-[var(--flowme-action)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]"
            onClick={onUndo}
          >
            {receipt.undoLabel}
          </button>
        ) : null}
      </div>
    </section>
  );
}
