'use client';

import Link from 'next/link';
import { useEffect, useRef, type ReactNode } from 'react';

import type { PostSaveDecisionMetric } from '@/lib/flow/post-save-decision-hub';
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
    <section className="mb-5 overflow-hidden rounded-lg border border-[#E7E4DD] bg-white shadow-[0_1px_0_rgba(27,26,23,0.03)]">
      <header className="border-b border-[#E7E4DD] px-4 py-4 sm:px-5" role="status" aria-live="polite">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-black text-emerald-700" aria-hidden="true">
            ✓
          </span>
          <div className="min-w-0">
            <span data-testid="my-flow-post-save-confirmation" className="text-xs font-semibold text-emerald-700">
              {held ? '저장 기록 보관됨' : '내 Flow에 저장됨'}
            </span>
            <h2 className="mt-1 break-keep text-xl font-semibold text-[#1B1A17] sm:text-2xl">{title}</h2>
            <p data-testid="my-flow-post-save-receipt-summary" className="mt-1 text-sm font-medium text-[#6E6B64]">
              {held ? '현재 확인이 필요한 Flow라 실행 목록에는 표시하지 않아요.' : receiptSummary}
            </p>
          </div>
        </div>
      </header>

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
        <div data-testid="my-flow-post-save-artifact" className="order-2 min-w-0 px-4 py-4 sm:px-5 lg:order-1 lg:border-r lg:border-[#E7E4DD]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-[#1B1A17]">{held ? '보관한 전체 Flow' : '저장된 전체 Flow'}</h3>
            <span className="text-xs font-semibold text-[#8A857B]">전체 항목</span>
          </div>
          {children}
        </div>

        <aside className="order-1 border-b border-[#E7E4DD] bg-[#FAFAF8] px-4 py-4 sm:px-5 lg:order-2 lg:border-b-0">
          {held ? (
            <div>
              <p className="text-sm font-semibold text-[#1B1A17]">원문 확인이 먼저예요</p>
              <p data-testid="my-flow-post-save-held-note" className="mt-1 break-keep text-xs leading-5 text-[#6E6B64]">
                원문 확인이 끝난 뒤 다시 실행할 수 있어요.
              </p>
            </div>
          ) : (
            <div data-testid="my-flow-post-save-action-hub">
              <p className="text-xs font-semibold text-[#8A857B]">다음 행동</p>
              <div className="mt-2 grid gap-2">
                {canStart ? (
                  <button
                    type="button"
                    data-testid="my-flow-post-save-open-first"
                    className={`${FLOW_UI_PRIMARY_ACTION_CLASS} w-full`}
                    onClick={onStart}
                  >
                    첫 할 일 시작
                  </button>
                ) : null}
                <button
                  ref={exportButtonRef}
                  type="button"
                  data-testid="my-flow-post-save-view-flow"
                  className={`${FLOW_UI_SECONDARY_ACTION_CLASS} w-full`}
                  onClick={onViewFlow}
                >
                  전체 Flow 보기
                </button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1 border-t border-[#E7E4DD] pt-2">
                <Link
                  data-testid="my-flow-post-save-open-calendar"
                  className={`${FLOW_UI_TERTIARY_ACTION_CLASS} w-full`}
                  href="/calendar"
                >
                  Calendar
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
          className="border-t border-[#E7E4DD] px-4 pb-4 outline-none sm:px-5"
        >
          {exportContent}
        </div>
      ) : null}
    </section>
  );
}
