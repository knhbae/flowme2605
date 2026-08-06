'use client';

import type { ReactNode } from 'react';

import type { PostSaveDecisionMetric } from '@/lib/flow/post-save-decision-hub';
import { FlowReceipt } from './FlowExecutionPrimitives';
import { FLOW_UI_PRIMARY_ACTION_CLASS } from './flow-ui';

type PostSaveDecisionHubProps = {
  title: string;
  receiptSummary: string;
  metrics: PostSaveDecisionMetric[];
  held: boolean;
  onViewFlow: () => void;
  children: ReactNode;
  q3CopyEnabled?: boolean;
};

export function PostSaveDecisionHub({
  title,
  receiptSummary,
  metrics,
  held,
  onViewFlow,
  children,
  q3CopyEnabled = true,
}: PostSaveDecisionHubProps) {
  return (
    <section
      data-p35-marker="P35-R3-LEGACY-HANDOFF-SINGLE-ACTION"
      className="mb-5 overflow-hidden rounded-lg border border-[var(--flowme-border)] bg-[var(--flowme-surface)] shadow-[0_1px_0_rgba(27,26,23,0.03)]"
    >
      <FlowReceipt
        data-testid="my-flow-post-save-receipt"
        role="status"
        aria-live="polite"
        tone={held ? 'warning' : 'success'}
        label={held ? '저장 기록 보관됨' : q3CopyEnabled ? '내 계획에 저장됨' : '내 Flow에 저장됨'}
        title={title}
        summary={held ? '확인 후 실행 목록에 표시할 수 있어요.' : receiptSummary}
        className="border-b border-[var(--flowme-border)]"
      >
        <span data-testid="my-flow-post-save-confirmation" className="sr-only">
          {held ? '저장 기록 보관됨' : q3CopyEnabled ? '내 계획에 저장됨' : '내 Flow에 저장됨'}
        </span>
        <span data-testid="my-flow-post-save-receipt-summary" className="sr-only">
          {held ? '확인 후 실행 목록에 표시할 수 있어요.' : receiptSummary}
        </span>
      </FlowReceipt>

      {!held && metrics.length > 0 ? (
        <dl
          data-testid="my-flow-post-save-metrics"
          data-layout="compact"
          className="flex flex-wrap gap-x-4 gap-y-1 border-b border-[#E7E4DD] px-4 py-2.5 sm:px-5"
        >
          {metrics.map((metric) => (
            <div
              key={metric.key}
              data-metric={metric.key}
              className="inline-flex min-w-0 items-baseline gap-1.5"
            >
              <dt className="text-[11px] font-semibold text-[#8A857B]">{metric.label}</dt>
              <dd className="break-keep text-xs font-semibold text-[#1B1A17]">{metric.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {held ? (
        <div className="border-b border-[var(--flowme-border)] bg-[var(--flowme-surface-subtle)] px-4 py-3 sm:px-5">
          <p className="text-sm font-semibold text-[var(--flowme-text)]">원문 확인이 먼저예요</p>
          <p data-testid="my-flow-post-save-held-note" className="mt-1 break-keep text-xs leading-5 text-[var(--flowme-text-secondary)]">
            원문 확인이 끝난 뒤 다시 실행할 수 있어요.
          </p>
        </div>
      ) : (
        <div
          data-testid="my-flow-post-save-action-hub"
          data-layout="compact"
          className="border-b border-[var(--flowme-border)] px-4 py-3 sm:px-5"
        >
          <p className="sr-only">다음 행동</p>
          <div className="sm:max-w-md">
            <button
              type="button"
              data-testid="my-flow-post-save-view-flow"
              data-action-priority="primary"
              className={`${FLOW_UI_PRIMARY_ACTION_CLASS} w-full`}
              onClick={onViewFlow}
            >
              {q3CopyEnabled ? '저장한 전체 계획 보기' : '저장한 전체 Flow 보기'}
            </button>
          </div>
        </div>
      )}

      <div data-testid="my-flow-post-save-artifact" className="min-w-0 px-4 py-4 sm:px-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-[var(--flowme-text)]">
            {held
              ? q3CopyEnabled ? '보관한 전체 계획' : '보관한 전체 Flow'
              : q3CopyEnabled ? '저장된 전체 계획' : '저장된 전체 Flow'}
          </h3>
          <span className="text-xs font-semibold text-[var(--flowme-text-tertiary)]">전체 항목</span>
        </div>
        {children}
      </div>
    </section>
  );
}
