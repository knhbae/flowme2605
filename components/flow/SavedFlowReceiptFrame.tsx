'use client';

import Link from 'next/link';

import { FlowReceipt } from './FlowExecutionPrimitives';
import { FLOW_UI_PRIMARY_ACTION_CLASS } from './flow-ui';
import type { EffectiveFlowResult } from '@/lib/flow/effective-flow-snapshot';
import { markMyFlowFirstEntry } from '@/lib/flow/my-flow-local-ia';
import { getQ3UserCopyProfile } from '@/lib/flow/q3-user-copy';

type SavedFlowReceiptFrameProps = {
  title: string;
  result: EffectiveFlowResult;
  dateRangeLabel?: string;
  savedContentSummary?: string;
  receiptTitle?: string;
  receiptSummary?: string;
  primaryHref: string;
  q3CopyEnabled?: boolean;
};

export function SavedFlowReceiptFrame({
  title,
  result,
  dateRangeLabel,
  savedContentSummary,
  receiptTitle,
  receiptSummary,
  primaryHref,
  q3CopyEnabled = true,
}: SavedFlowReceiptFrameProps) {
  const q3Copy = getQ3UserCopyProfile(q3CopyEnabled);
  const scheduleSummary = result.counts.dated > 0
    ? result.counts.undated > 0
      ? `날짜 있음 ${result.counts.dated}개 · 날짜 없음 ${result.counts.undated}개`
      : dateRangeLabel ?? `날짜 있음 ${result.counts.dated}개`
    : '날짜 없음';
  const savedResultSummary = savedContentSummary ?? `${result.label} ${result.counts.total}개`;

  return (
    <section
      data-testid="public-flow-saved-receipt"
      data-p29-marker="P29-SAVED-RECEIPT-DISTINCT"
      data-p35-marker="P35-R3-SINGLE-SAVED-RECEIPT"
      data-p35-r8-marker={savedContentSummary ? 'P35-R8A-SERIES-OCCURRENCE-COUNT' : undefined}
      data-p35-state="saved-receipt"
      data-flow-anatomy="saved-receipt"
      className="border-y border-[var(--flowme-border-strong)] py-5 sm:py-7"
    >
      <FlowReceipt
        data-testid="public-flow-saved-receipt-status"
        role="status"
        aria-live="polite"
        tone="success"
        label={q3Copy.receipt.savedTitle}
        title={receiptTitle ?? `${savedResultSummary}를 저장했어요`}
        summary={`${title} · ${scheduleSummary}`}
      >
        <p className="mt-2 break-keep text-sm font-medium text-[var(--flowme-text-secondary)]">
          {receiptSummary ?? (q3CopyEnabled
            ? '내 계획에서 다음 할 일부터 이어갈 수 있습니다.'
            : '내 Flow에서 다음 할 일부터 이어갈 수 있습니다.')}
        </p>
      </FlowReceipt>
      <div className="mt-5 sm:max-w-md">
        <Link
          data-testid="public-flow-saved-receipt-primary"
          data-action-priority="primary"
          className={`${FLOW_UI_PRIMARY_ACTION_CLASS} w-full`}
          href={primaryHref}
          onClick={() => {
            if (typeof window === 'undefined') return;
            const target = new URL(primaryHref, window.location.origin);
            const flowSlug = target.searchParams.get('flow') ?? '';
            markMyFlowFirstEntry(window.sessionStorage, flowSlug);
          }}
        >
          {q3Copy.receipt.continueInMyPlans}
        </Link>
        <Link
          data-testid="public-flow-saved-receipt-browse"
          className="mt-2 inline-flex min-h-9 w-full items-center justify-center text-sm font-semibold text-[var(--flowme-text-secondary)] underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]"
          href="/flows"
        >
          {q3Copy.receipt.returnToDiscovery}
        </Link>
      </div>
    </section>
  );
}
