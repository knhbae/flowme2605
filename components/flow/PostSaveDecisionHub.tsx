'use client';

import Link from 'next/link';
import { useEffect, useRef, type ReactNode } from 'react';

import type { PostSaveDecisionMetric } from '@/lib/flow/post-save-decision-hub';
import { FLOW_EXECUTION_ACTIONS } from '@/lib/flow/execution-ui-contract';
import { FlowReceipt } from './FlowExecutionPrimitives';
import {
  FLOW_UI_PRIMARY_ACTION_CLASS,
  FLOW_UI_SECONDARY_ACTION_CLASS,
  FLOW_UI_TERTIARY_ACTION_CLASS,
} from './flow-ui';

type PostSaveDecisionHubProps = {
  title: string;
  receiptSummary: string;
  metrics: PostSaveDecisionMetric[];
  held: boolean;
  canStart: boolean;
  exportLabel: string;
  exportExpanded: boolean;
  onStart: () => void;
  onViewFlow: () => void;
  onOpenExport: () => void;
  children: ReactNode;
  exportContent?: ReactNode;
};

export function PostSaveDecisionHub({
  title,
  receiptSummary,
  metrics,
  held,
  canStart,
  exportLabel,
  exportExpanded,
  onStart,
  onViewFlow,
  onOpenExport,
  children,
  exportContent,
}: PostSaveDecisionHubProps) {
  const exportButtonRef = useRef<HTMLButtonElement | null>(null);
  const exportRegionRef = useRef<HTMLDivElement | null>(null);
  const previousExportExpandedRef = useRef(false);
  const metricColumnClass =
    metrics.length <= 2 ? 'sm:grid-cols-2' :
    metrics.length === 3 ? 'sm:grid-cols-3' :
    metrics.length === 4 ? 'sm:grid-cols-4' :
    'sm:grid-cols-5';

  useEffect(() => {
    if (exportExpanded) {
      exportRegionRef.current?.focus({ preventScroll: false });
    } else if (previousExportExpandedRef.current) {
      exportButtonRef.current?.focus({ preventScroll: true });
    }
    previousExportExpandedRef.current = exportExpanded;
  }, [exportExpanded]);

  return (
    <section className="mb-5 overflow-hidden rounded-lg border border-[var(--flowme-border)] bg-[var(--flowme-surface)] shadow-[0_1px_0_rgba(27,26,23,0.03)]">
      <FlowReceipt
        data-testid="my-flow-post-save-receipt"
        role="status"
        aria-live="polite"
        tone={held ? 'warning' : 'success'}
        label={held ? '저장 기록 보관됨' : '내 Flow에 저장됨'}
        title={title}
        summary={held ? '확인 후 실행 목록에 표시할 수 있어요.' : receiptSummary}
        className="border-b border-[var(--flowme-border)]"
      >
        <span data-testid="my-flow-post-save-confirmation" className="sr-only">
          {held ? '저장 기록 보관됨' : '내 Flow에 저장됨'}
        </span>
        <span data-testid="my-flow-post-save-receipt-summary" className="sr-only">
          {held ? '확인 후 실행 목록에 표시할 수 있어요.' : receiptSummary}
        </span>
      </FlowReceipt>

      {!held ? (
        <dl data-testid="my-flow-post-save-metrics" className={`grid grid-cols-2 border-b border-[#E7E4DD] ${metricColumnClass}`}>
          {metrics.map((metric) => (
            <div
              key={metric.key}
              data-metric={metric.key}
              className={`min-w-0 border-b border-r border-[#E7E4DD] px-4 py-3 last:border-r-0 sm:col-span-1 sm:border-b-0 sm:px-5 ${metrics.length % 2 === 1 ? 'last:col-span-2' : ''}`}
            >
              <dt className="text-[11px] font-semibold text-[#8A857B]">{metric.label}</dt>
              <dd className="mt-0.5 break-keep text-sm font-semibold text-[#1B1A17]">{metric.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <div className="grid min-w-0 gap-0 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div data-testid="my-flow-post-save-artifact" className="order-2 min-w-0 px-4 py-4 sm:px-5 lg:order-1 lg:border-r lg:border-[var(--flowme-border)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-[var(--flowme-text)]">{held ? '보관한 전체 Flow' : '저장된 전체 Flow'}</h3>
            <span className="text-xs font-semibold text-[var(--flowme-text-tertiary)]">전체 항목</span>
          </div>
          {children}
        </div>

        <aside className="order-1 border-b border-[var(--flowme-border)] bg-[var(--flowme-surface-subtle)] px-4 py-4 sm:px-5 lg:order-2 lg:border-b-0">
          {held ? (
            <div>
              <p className="text-sm font-semibold text-[var(--flowme-text)]">원문 확인이 먼저예요</p>
              <p data-testid="my-flow-post-save-held-note" className="mt-1 break-keep text-xs leading-5 text-[var(--flowme-text-secondary)]">
                원문 확인이 끝난 뒤 다시 실행할 수 있어요.
              </p>
            </div>
          ) : (
            <div data-testid="my-flow-post-save-action-hub">
              <p className="text-xs font-semibold text-[var(--flowme-text-tertiary)]">다음 행동</p>
              <div className="mt-2 grid gap-2">
                {canStart ? (
                  <button
                    type="button"
                    data-testid="my-flow-post-save-open-first"
                    data-action-priority="primary"
                    className={`${FLOW_UI_PRIMARY_ACTION_CLASS} w-full`}
                    onClick={onStart}
                  >
                    {FLOW_EXECUTION_ACTIONS.startFirstItem.label}
                  </button>
                ) : null}
                <button
                  ref={exportButtonRef}
                  type="button"
                  data-testid="my-flow-post-save-view-flow"
                  data-action-priority="secondary"
                  className={`${FLOW_UI_SECONDARY_ACTION_CLASS} w-full`}
                  onClick={onViewFlow}
                >
                  {FLOW_EXECUTION_ACTIONS.viewWholeFlow.label}
                </button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1 border-t border-[var(--flowme-border)] pt-2">
                <Link
                  data-testid="my-flow-post-save-open-calendar"
                  className={`${FLOW_UI_TERTIARY_ACTION_CLASS} w-full`}
                  href="/calendar"
                >
                  {FLOW_EXECUTION_ACTIONS.openCalendar.label}
                </Link>
                <button
                  type="button"
                  data-testid="my-flow-post-save-open-export"
                  aria-expanded={exportExpanded}
                  className={`${FLOW_UI_TERTIARY_ACTION_CLASS} w-full`}
                  onClick={onOpenExport}
                >
                  {exportLabel}
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>
      {exportContent ? (
        <div
          ref={exportRegionRef}
          data-testid="my-flow-post-save-export-region"
          tabIndex={-1}
          className="border-t border-[var(--flowme-border)] px-4 pb-4 outline-none sm:px-5"
        >
          {exportContent}
        </div>
      ) : null}
    </section>
  );
}
