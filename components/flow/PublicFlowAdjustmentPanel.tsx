'use client';

import type { ReactNode } from 'react';

import {
  FLOW_UI_COMPACT_ACTION_CLASS,
  FLOW_UI_INPUT_CLASS,
  FLOW_UI_PRIMARY_ACTION_CLASS,
  FLOW_UI_SECONDARY_ACTION_CLASS,
} from './flow-ui';
import { FlowBottomSheet } from './FlowExecutionPrimitives';

export type PublicFlowAdjustmentKind = 'name' | 'anchor' | 'items' | 'routine';

export type PublicFlowAdjustmentKindOption = {
  kind: PublicFlowAdjustmentKind;
  label: string;
  summary: string;
};

export type PublicFlowAdjustmentResultSummary = {
  title: string;
  itemCount: number;
  resultSummary: string;
  routineSummary?: string;
};

export type PublicFlowAdjustmentItem = {
  id: string;
  title: string;
  detail?: string;
  date?: string;
  dateLabel: string;
  included: boolean;
};

export type PublicFlowItemEditorDraft = {
  itemId: string;
  title: string;
  detail: string;
  date: string;
};

type PublicFlowAdjustmentPanelProps = {
  kind: PublicFlowAdjustmentKind;
  kindOptions: PublicFlowAdjustmentKindOption[];
  currentResult: PublicFlowAdjustmentResultSummary;
  adjustedResult: PublicFlowAdjustmentResultSummary;
  titleDraft: string;
  anchorLabel?: string;
  anchorDraft?: string;
  items: PublicFlowAdjustmentItem[];
  routineEditor?: ReactNode;
  applyDisabled?: boolean;
  onKindChange: (kind: PublicFlowAdjustmentKind) => void;
  onTitleChange: (value: string) => void;
  onAnchorChange?: (value: string) => void;
  onItemIncludedChange: (itemId: string, included: boolean) => void;
  onItemEdit: (item: PublicFlowAdjustmentItem, returnFocusSelector: string) => void;
  onApply: () => void;
  onCancel: () => void;
};

function ResultSummary({
  label,
  value,
  adjusted = false,
}: {
  label: string;
  value: PublicFlowAdjustmentResultSummary;
  adjusted?: boolean;
}) {
  return (
    <div
      data-testid={adjusted ? 'public-flow-adjustment-result-after' : 'public-flow-adjustment-result-before'}
      className={adjusted ? 'min-w-0 bg-[var(--flowme-action-soft)] px-3 py-3' : 'min-w-0 px-3 py-3'}
    >
      <p className="text-[10px] font-semibold text-[var(--flowme-text-tertiary)]">{label}</p>
      <p className="mt-1 break-keep text-sm font-semibold text-[var(--flowme-text)]">{value.title}</p>
      <p className="mt-1 text-xs font-semibold text-[var(--flowme-text-secondary)]">
        {value.itemCount}개 · {value.resultSummary}
      </p>
      {value.routineSummary ? (
        <p className="mt-1 break-keep text-xs font-medium text-[var(--flowme-text-secondary)]">
          {value.routineSummary}
        </p>
      ) : null}
    </div>
  );
}

export function PublicFlowAdjustmentPanel({
  kind,
  kindOptions,
  currentResult,
  adjustedResult,
  titleDraft,
  anchorLabel,
  anchorDraft,
  items,
  routineEditor,
  applyDisabled = false,
  onKindChange,
  onTitleChange,
  onAnchorChange,
  onItemIncludedChange,
  onItemEdit,
  onApply,
  onCancel,
}: PublicFlowAdjustmentPanelProps) {
  const panelTitle = kindOptions.find((option) => option.kind === kind)?.label ?? 'Flow 조정';

  return (
    <section
      data-testid="public-flow-personal-adjustment"
      data-adjustment-kind={kind}
      data-p35-marker="P35-ADJUST-ONE-KIND"
      tabIndex={-1}
      aria-labelledby="public-flow-personal-adjustment-title"
      className="border-b border-[var(--flowme-border-strong)] py-5 outline-none sm:py-7"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onCancel();
        }
      }}
    >
      <div>
        <div>
          <p className="text-xs font-semibold text-[var(--flowme-action)]">Flow 조정</p>
          <h2 id="public-flow-personal-adjustment-title" className="mt-1 text-xl font-bold text-[var(--flowme-text)]">
            한 번에 한 가지만 바꾸기
          </h2>
        </div>
      </div>

      <div
        data-testid="public-flow-adjustment-kind-picker"
        role="group"
        aria-label="조정할 내용"
        className={`mt-4 grid gap-2 ${kindOptions.length >= 3 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2'}`}
      >
        {kindOptions.map((option) => (
          <button
            key={option.kind}
            type="button"
            data-testid={`public-flow-adjustment-kind-${option.kind}`}
            aria-pressed={kind === option.kind}
            aria-controls="public-flow-adjustment-active-panel"
            className={`min-h-14 rounded-md border px-3 py-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)] ${
              kind === option.kind
                ? 'border-[var(--flowme-action)] bg-[var(--flowme-action-soft)] text-[var(--flowme-action)]'
                : 'border-[var(--flowme-border)] bg-white text-[var(--flowme-text)] hover:border-[var(--flowme-border-strong)]'
            }`}
            onClick={() => onKindChange(option.kind)}
          >
            <span className="block text-xs font-bold">{option.label}</span>
            <span className="mt-0.5 block text-[11px] font-medium text-[var(--flowme-text-secondary)]">
              {option.summary}
            </span>
          </button>
        ))}
      </div>

      <div
        data-testid="public-flow-adjustment-comparison"
        className="mt-4 grid grid-cols-2 divide-x divide-[var(--flowme-border)] border-y border-[var(--flowme-border)] bg-white"
      >
        <ResultSummary label="현재" value={currentResult} />
        <ResultSummary label="조정 후" value={adjustedResult} adjusted />
      </div>

      <section
        id="public-flow-adjustment-active-panel"
        data-testid="public-flow-adjustment-active-panel"
        data-adjustment-kind={kind}
        aria-labelledby="public-flow-adjustment-active-heading"
        className="mt-4 min-w-0"
      >
        <h3 id="public-flow-adjustment-active-heading" className="text-sm font-semibold text-[var(--flowme-text)]">
          {panelTitle}
        </h3>

        {kind === 'name' ? (
          <label className="mt-3 block max-w-xl text-sm font-semibold text-[var(--flowme-text)]">
            내 Flow 이름
            <input
              data-testid="public-flow-adjustment-name-input"
              className={`mt-1 w-full ${FLOW_UI_INPUT_CLASS}`}
              value={titleDraft}
              maxLength={80}
              onChange={(event) => onTitleChange(event.target.value)}
            />
          </label>
        ) : null}

        {kind === 'anchor' && anchorLabel && onAnchorChange ? (
          <label className="mt-3 block max-w-xl text-sm font-semibold text-[var(--flowme-text)]">
            <span className="sr-only">{anchorLabel}</span>
            <input
              data-testid="public-flow-adjustment-anchor-input"
              aria-label={anchorLabel}
              className={`mt-1 w-full ${FLOW_UI_INPUT_CLASS}`}
              type="date"
              value={anchorDraft ?? ''}
              onChange={(event) => onAnchorChange(event.target.value)}
            />
          </label>
        ) : null}

        {kind === 'items' ? (
          <div
            data-testid="public-flow-adjustment-item-list"
            className="mt-3 max-h-[min(58vh,32rem)] overflow-y-auto border-y border-[var(--flowme-border)] bg-white"
          >
            {items.map((item) => (
              <div
                key={item.id}
                data-testid="public-flow-adjustment-item-row"
                data-item-id={item.id}
                className="grid min-h-14 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 border-b border-[var(--flowme-border)] px-2 py-2.5 last:border-b-0"
              >
                <button
                  type="button"
                  data-testid="public-flow-adjustment-item-edit"
                  data-item-id={item.id}
                  className="min-w-0 rounded-md px-1 py-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]"
                  aria-label={`${item.title} 내용과 날짜 수정`}
                  onClick={(event) => onItemEdit(
                    item,
                    `[data-testid="public-flow-adjustment-item-edit"][data-item-id="${CSS.escape(item.id)}"]`,
                  )}
                >
                  <span className="block break-keep text-sm font-semibold leading-5 text-[var(--flowme-text)]">
                    {item.title}
                  </span>
                  <span className="mt-0.5 block text-[11px] font-medium text-[var(--flowme-text-secondary)]">
                    {item.dateLabel}
                  </span>
                </button>
                <button
                  type="button"
                  className={FLOW_UI_COMPACT_ACTION_CLASS}
                  aria-label={`${item.title} 수정`}
                  onClick={() => onItemEdit(
                    item,
                    `[data-testid="public-flow-adjustment-item-edit"][data-item-id="${CSS.escape(item.id)}"]`,
                  )}
                >
                  수정
                </button>
                <input
                  type="checkbox"
                  checked={item.included}
                  aria-label={`${item.title} Flow에 포함`}
                  onChange={(event) => onItemIncludedChange(item.id, event.target.checked)}
                />
              </div>
            ))}
          </div>
        ) : null}

        {kind === 'routine' ? (
          <div data-testid="public-flow-adjustment-routine-editor" className="mt-3 max-w-3xl">
            {routineEditor}
          </div>
        ) : null}
      </section>

      <div className="sticky bottom-0 z-30 mt-5 flex justify-end gap-2 border-t border-[var(--flowme-border)] bg-[#F5F7F6]/95 py-3 backdrop-blur">
        <button
          type="button"
          data-testid="public-flow-adjustment-cancel"
          className={FLOW_UI_SECONDARY_ACTION_CLASS}
          onClick={onCancel}
        >
          취소
        </button>
        <button
          type="button"
          data-testid="public-flow-adjustment-apply"
          data-action-priority="primary"
          className={FLOW_UI_PRIMARY_ACTION_CLASS}
          disabled={applyDisabled}
          onClick={onApply}
        >
          변경 적용
        </button>
      </div>
    </section>
  );
}

export function PublicFlowItemEditor({
  draft,
  returnFocusSelector,
  onChange,
  onSave,
  onClose,
}: {
  draft: PublicFlowItemEditorDraft;
  returnFocusSelector?: string;
  onChange: (draft: PublicFlowItemEditorDraft) => void;
  onSave: (draft: PublicFlowItemEditorDraft) => void;
  onClose: () => void;
}) {
  const normalizedTitle = draft.title.trim();

  return (
    <FlowBottomSheet
      testId="public-flow-item-editor"
      headingId="public-flow-item-editor-title"
      eyebrow="할 일 조정"
      title={normalizedTitle || '할 일 수정'}
      onClose={onClose}
      initialFocusSelector='[data-testid="public-flow-item-editor-title-input"]'
      returnFocusSelector={returnFocusSelector}
      className="sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[min(28rem,92vw)] sm:max-h-none sm:rounded-none sm:pb-6"
    >
      <form
        data-p35-marker="P35-R2-CONTEXTUAL-ITEM-EDIT-390 P35-R2-ITEM-INSPECTOR-1024"
        className="mt-5 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (normalizedTitle) onSave({ ...draft, title: normalizedTitle });
        }}
      >
        <label className="block text-sm font-semibold text-[var(--flowme-text)]">
          할 일
          <input
            data-testid="public-flow-item-editor-title-input"
            className={`mt-1 w-full ${FLOW_UI_INPUT_CLASS}`}
            value={draft.title}
            maxLength={120}
            required
            onChange={(event) => onChange({ ...draft, title: event.target.value })}
          />
        </label>
        <label className="block text-sm font-semibold text-[var(--flowme-text)]">
          상세 내용
          <textarea
            data-testid="public-flow-item-editor-detail-input"
            className={`mt-1 min-h-28 w-full resize-y ${FLOW_UI_INPUT_CLASS}`}
            value={draft.detail}
            maxLength={1000}
            placeholder="내가 실행할 때 필요한 내용을 적어두세요"
            onChange={(event) => onChange({ ...draft, detail: event.target.value })}
          />
        </label>
        <div>
          <label className="block text-sm font-semibold text-[var(--flowme-text)]">
            날짜
            <input
              data-testid="public-flow-item-editor-date-input"
              className={`mt-1 w-full ${FLOW_UI_INPUT_CLASS}`}
              type="date"
              value={draft.date}
              onChange={(event) => onChange({ ...draft, date: event.target.value })}
            />
          </label>
          {draft.date ? (
            <button
              type="button"
              data-testid="public-flow-item-editor-date-clear"
              className={`mt-1 ${FLOW_UI_COMPACT_ACTION_CLASS}`}
              onClick={() => onChange({ ...draft, date: '' })}
            >
              날짜 없애기
            </button>
          ) : null}
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--flowme-border)] pt-4">
          <button
            type="button"
            data-testid="public-flow-item-editor-cancel"
            className={FLOW_UI_SECONDARY_ACTION_CLASS}
            onClick={onClose}
          >
            취소
          </button>
          <button
            type="submit"
            data-testid="public-flow-item-editor-save"
            className={FLOW_UI_PRIMARY_ACTION_CLASS}
            disabled={!normalizedTitle}
          >
            이 항목 저장
          </button>
        </div>
      </form>
    </FlowBottomSheet>
  );
}
