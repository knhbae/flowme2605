'use client';

import type { FlowExperienceProjectionRow } from '@/lib/flow/flow-experience-projection';
import {
  composeApprovedItemRawMemoText,
  parseApprovedItemRawMemoText,
} from '@/lib/flow/approved-item-raw-memo';

import { FlowBottomSheet } from './FlowExecutionPrimitives';

export function PublicFlowItemPreview({
  row,
  memoText,
  rawMemoText,
  returnFocusSelector,
  onClose,
  onEdit,
}: {
  row: FlowExperienceProjectionRow;
  /** Backward-compatible input; separate completion data is folded into one raw memo. */
  memoText?: string;
  /** Preferred precomposed editable source. */
  rawMemoText?: string;
  returnFocusSelector?: string;
  onClose: () => void;
  onEdit?: () => void;
}) {
  const headingId = `public-flow-item-preview-${row.id.replace(/[^a-zA-Z0-9_-]/gu, '-')}`;
  const displayRawMemoText = rawMemoText === undefined
    ? composeApprovedItemRawMemoText({
        memoText,
        description: row.description,
        completionCriterion: row.completionCriterion,
      })
    : parseApprovedItemRawMemoText(rawMemoText).memoText;
  return (
    <FlowBottomSheet
      testId="public-flow-item-preview"
      headingId={headingId}
      eyebrow={row.schedule.date ?? '날짜 미정'}
      title={row.title}
      onClose={onClose}
      returnFocusSelector={returnFocusSelector}
      dialogProps={{
        'data-item-id': row.id,
        'data-public-preview': 'readonly',
      }}
      className="lg:inset-y-0 lg:left-auto lg:right-0 lg:max-h-none lg:w-[28rem] lg:rounded-none lg:pb-6 lg:pt-6"
    >
      <div className="mt-4 grid gap-3">
        <section aria-labelledby={`${headingId}-memo`}>
          <h3 id={`${headingId}-memo`} className="text-xs font-semibold text-[var(--flowme-text-secondary)]">
            메모
          </h3>
          <pre
            data-testid="public-flow-item-preview-raw-memo"
            className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-[var(--flowme-surface-subtle)] p-3 font-sans text-sm leading-6 text-[var(--flowme-text)]"
          >
            {displayRawMemoText || '메모가 없습니다.'}
          </pre>
        </section>
        {onEdit ? (
          <button
            type="button"
            data-testid="public-flow-item-preview-edit"
            className="inline-flex min-h-12 items-center justify-center rounded-md border border-[var(--flowme-border-strong)] bg-white px-4 text-sm font-semibold text-[var(--flowme-action)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]"
            onClick={onEdit}
          >
            수정
          </button>
        ) : null}
      </div>
    </FlowBottomSheet>
  );
}
