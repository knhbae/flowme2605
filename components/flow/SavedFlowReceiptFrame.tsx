'use client';

import Link from 'next/link';

import { FlowArtifactSummary, FlowReceipt } from './FlowExecutionPrimitives';
import {
  FLOW_UI_PRIMARY_ACTION_CLASS,
  FLOW_UI_TERTIARY_ACTION_CLASS,
} from './flow-ui';

type SavedFlowReceiptFrameProps = {
  title: string;
  categoryLabel?: string;
  sourceLabel?: string;
  sourceHref?: string;
  itemCount: number;
  resultLabel: string;
  dateRangeLabel?: string;
  primaryHref: string;
};

export function SavedFlowReceiptFrame({
  title,
  categoryLabel,
  sourceLabel,
  sourceHref,
  itemCount,
  resultLabel,
  dateRangeLabel,
  primaryHref,
}: SavedFlowReceiptFrameProps) {
  const metrics = [
    { label: '저장 이름', value: title },
    { label: '전체', value: `할 일 ${itemCount}개` },
    { label: '주요 결과', value: resultLabel },
    dateRangeLabel ? { label: '일정 범위', value: dateRangeLabel } : null,
  ].filter((metric): metric is { label: string; value: string } => Boolean(metric));

  return (
    <section
      data-testid="public-flow-saved-receipt"
      data-p29-marker="P29-SAVED-RECEIPT-DISTINCT"
      data-flow-anatomy="saved-receipt"
      className="border-y border-[var(--flowme-border-strong)] py-5 sm:py-7"
    >
      <FlowArtifactSummary
        eyebrow="저장 완료"
        title={title}
        categoryLabel={categoryLabel}
        sourceLabel={sourceLabel}
        sourceHref={sourceHref}
      />
      <FlowReceipt
        data-testid="public-flow-saved-receipt-status"
        role="status"
        aria-live="polite"
        tone="success"
        label="내 Flow에 저장됨"
        title={`${itemCount}개 할 일을 저장했어요`}
        summary="저장한 전체 계획을 확인하거나 첫 할 일부터 시작할 수 있습니다."
        className="mt-5"
      />
      <dl className="mt-4 grid gap-px overflow-hidden rounded-md border border-[var(--flowme-border)] bg-[var(--flowme-border)] sm:grid-cols-2">
        {metrics.map((metric) => (
          <div key={metric.label} className="min-w-0 bg-[var(--flowme-surface)] px-3 py-3">
            <dt className="text-[10px] font-semibold text-[var(--flowme-text-tertiary)]">{metric.label}</dt>
            <dd className="mt-1 break-keep text-sm font-semibold text-[var(--flowme-text)]">{metric.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-5 grid gap-2 sm:max-w-md sm:grid-cols-[minmax(0,1fr)_auto]">
        <Link
          data-testid="public-flow-saved-receipt-primary"
          data-action-priority="primary"
          className={`${FLOW_UI_PRIMARY_ACTION_CLASS} w-full`}
          href={primaryHref}
        >
          내 Flow에서 시작
        </Link>
        <Link className={`${FLOW_UI_TERTIARY_ACTION_CLASS} w-full`} href="/calendar">
          캘린더에서 보기
        </Link>
      </div>
    </section>
  );
}
