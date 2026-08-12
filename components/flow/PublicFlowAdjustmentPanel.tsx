'use client';

import React, { type ReactNode } from 'react';

import {
  FLOW_UI_COMPACT_ACTION_CLASS,
  FLOW_UI_INPUT_CLASS,
  FLOW_UI_PRIMARY_ACTION_CLASS,
  FLOW_UI_SECONDARY_ACTION_CLASS,
} from './flow-ui';
import { FlowBottomSheet } from './FlowExecutionPrimitives';
import { FlowEditorSurface } from './FlowEditorSurface';
import { FlowContextDisclosure } from './FlowContextDisclosure';
import type {
  FlowEditorCloseEvent,
  FlowEditorFailure,
  FlowEditorStatus,
} from '@/lib/flow/flow-editor-transaction';
import { selectFlowEditorAdapter } from '@/lib/flow/flow-editor-transaction';
import {
  getFlowEditorSurfaceContract,
  type FlowEditorSchemaCapabilities,
} from '@/lib/flow/flow-editor-schema';
import { Q3_USER_COPY_PROFILE } from '@/lib/flow/q3-user-copy';

export type PublicSharedEditorTransaction = {
  status: FlowEditorStatus;
  failure?: FlowEditorFailure;
  pendingClose: boolean;
  onRequestClose: (event: FlowEditorCloseEvent) => void;
  onContinueEditing: () => void;
  onDiscardChanges: () => void;
  onRetry: () => void;
};

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
  canMoveUp: boolean;
  canMoveDown: boolean;
  completionCriterion?: string;
  sourceUrl?: string;
  warning?: string;
};

export type PublicFlowItemEditorDraft = {
  itemId: string;
  title: string;
  detail: string;
  date: string;
  completionCriterion?: string;
  sourceUrl?: string;
  warning?: string;
};

export type PublicFlowAdjustmentCapabilities = Readonly<{
  itemEdit?: boolean;
  itemReorder?: boolean;
}>;

export type PublicFlowAdjustmentPanelProps = {
  kind: PublicFlowAdjustmentKind;
  kindOptions: PublicFlowAdjustmentKindOption[];
  currentResult: PublicFlowAdjustmentResultSummary;
  adjustedResult: PublicFlowAdjustmentResultSummary;
  titleDraft: string;
  anchorLabel?: string;
  anchorDraft?: string;
  items: PublicFlowAdjustmentItem[];
  itemEditNotice?: string;
  routineEditor?: ReactNode;
  sourceUrl?: string;
  warning?: string;
  initialFocusSelector?: string;
  applyDisabled?: boolean;
  capabilities?: PublicFlowAdjustmentCapabilities;
  onKindChange: (kind: PublicFlowAdjustmentKind) => void;
  onTitleChange: (value: string) => void;
  onAnchorChange?: (value: string) => void;
  onItemIncludedChange: (itemId: string, included: boolean) => void;
  onItemMove?: (itemId: string, direction: 'up' | 'down') => void;
  onItemEdit?: (item: PublicFlowAdjustmentItem, returnFocusSelector: string) => void;
  onApply: () => void;
  onCancel: () => void;
  transaction?: PublicSharedEditorTransaction;
  sharedEditorEnabled?: boolean;
  q3CopyEnabled?: boolean;
  approvedPlanExecution?: boolean;
};

function PublicEditorFrame({
  transaction,
  adapter,
  level,
  testId,
  headingId,
  eyebrow,
  title,
  initialFocusSelector,
  returnFocusSelector,
  p35Marker,
  adjustmentKind,
  schemaCapabilities,
  className,
  commitLabel,
  commitTestId,
  cancelTestId,
  headerCancel = false,
  enforce48pxTargets = false,
  commitDisabled,
  onCommit,
  onCancel,
  children,
}: {
  transaction?: PublicSharedEditorTransaction;
  adapter: 'shared' | 'legacy';
  level: 'plan' | 'item';
  testId: string;
  headingId: string;
  eyebrow?: string;
  title: string;
  initialFocusSelector?: string;
  returnFocusSelector?: string;
  p35Marker: string;
  adjustmentKind?: PublicFlowAdjustmentKind;
  schemaCapabilities?: FlowEditorSchemaCapabilities;
  className: string;
  commitLabel: string;
  commitTestId: string;
  cancelTestId: string;
  headerCancel?: boolean;
  enforce48pxTargets?: boolean;
  commitDisabled?: boolean;
  onCommit: () => void;
  onCancel: () => void;
  children: ReactNode;
}) {
  const contract = getFlowEditorSurfaceContract({
    context: 'public-draft',
    level,
    capabilities: schemaCapabilities,
  });
  if (adapter === 'legacy') {
    return (
      <FlowBottomSheet
        testId={testId}
        headingId={headingId}
        eyebrow={eyebrow}
        title={title}
        closeLabel={headerCancel ? '취소' : '닫기'}
        closeTestId={headerCancel ? cancelTestId : undefined}
        closeButtonClassName={enforce48pxTargets ? '!min-h-12' : undefined}
        onClose={onCancel}
        initialFocusSelector={initialFocusSelector}
        returnFocusSelector={returnFocusSelector}
        p35Marker={p35Marker}
        dialogProps={{
          'data-adjustment-kind': adjustmentKind,
          'data-editor-transaction': level === 'plan' ? 'atomic' : 'atomic-child',
          'data-editor-adapter': 'legacy',
        }}
        className={`${className} ${enforce48pxTargets ? '[&_button]:min-h-12 [&_input]:min-h-12 [&_select]:min-h-12 [&_a]:inline-flex [&_a]:min-h-12 [&_a]:items-center' : ''}`}
      >
        {children}
      </FlowBottomSheet>
    );
  }

  if (!transaction) return null;

  const errorSummary = transaction.failure
    ? {
        title: transaction.status === 'recovery-required'
          ? '저장 상태를 확인해 주세요'
          : '변경을 반영하지 못했습니다',
        errors: [{
          id: transaction.failure.code,
          message: transaction.failure.message,
        }],
        testId: 'flow-editor-error',
      }
    : undefined;

  return (
    <FlowEditorSurface
      testId={testId}
      headingId={headingId}
      context="public-draft"
      level={level}
      status={transaction.status}
      layout="responsive"
      semanticRole={contract.semanticRole}
      commitRole={contract.commitRole}
      eyebrow={eyebrow}
      title={title}
      initialFocusSelector={initialFocusSelector}
      returnFocusSelector={returnFocusSelector}
      p35Marker={p35Marker}
      dialogProps={{
        'data-adjustment-kind': adjustmentKind,
        'data-editor-schema-fields': contract.fields.map((field) => field.id).join(','),
      }}
      dismissible={transaction.status !== 'submitting' && transaction.status !== 'recovery-required'}
      onRequestClose={(cause) => transaction.onRequestClose(cause)}
      errorSummary={errorSummary}
      discardConfirmation={{
        open: transaction.pendingClose,
        onContinueEditing: transaction.onContinueEditing,
        onDiscardChanges: transaction.onDiscardChanges,
        testId: 'flow-editor-discard-prompt',
      }}
      cancelAction={{
        label: '취소',
        testId: cancelTestId,
        disabled: transaction.status === 'submitting' || transaction.status === 'recovery-required',
        onAction: () => transaction.onRequestClose('cancel'),
      }}
      primaryAction={{
        label: commitLabel,
        testId: commitTestId,
        onAction: onCommit,
      }}
      retryAction={transaction.status === 'recoverable-error' ? {
        label: '다시 시도',
        testId: 'flow-editor-retry',
        onAction: transaction.onRetry,
      } : undefined}
      cancelPlacement={headerCancel ? 'header' : 'footer'}
      enforce48pxTargets={enforce48pxTargets}
      className={className}
    >
      {children}
    </FlowEditorSurface>
  );
}

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
  itemEditNotice,
  routineEditor,
  sourceUrl,
  warning,
  initialFocusSelector,
  applyDisabled = false,
  capabilities,
  onKindChange,
  onTitleChange,
  onAnchorChange,
  onItemIncludedChange,
  onItemMove,
  onItemEdit,
  onApply,
  onCancel,
  transaction,
  sharedEditorEnabled = false,
  q3CopyEnabled = true,
  approvedPlanExecution = false,
}: PublicFlowAdjustmentPanelProps) {
  const panelTitle = kindOptions.find((option) => option.kind === kind)?.label
    ?? (q3CopyEnabled ? Q3_USER_COPY_PROFILE.publicPreview.editPlan : 'Flow 편집');
  const adapter = selectFlowEditorAdapter({
    enabled: sharedEditorEnabled,
    shared: 'shared' as const,
    legacy: 'legacy' as const,
  });
  const itemEditEnabled = capabilities?.itemEdit !== false && Boolean(onItemEdit);
  const itemReorderEnabled = capabilities?.itemReorder !== false && Boolean(onItemMove);

  return (
    <PublicEditorFrame
      transaction={transaction}
      adapter={adapter}
      level="plan"
      testId="public-flow-personal-adjustment"
      headingId="public-flow-personal-adjustment-title"
      eyebrow={q3CopyEnabled ? Q3_USER_COPY_PROFILE.publicPreview.editPlan : undefined}
      title={q3CopyEnabled ? Q3_USER_COPY_PROFILE.publicPreview.editPlan : 'Flow 편집'}
      initialFocusSelector={
        initialFocusSelector ?? "[data-testid='public-flow-adjustment-kind-name']"
      }
      p35Marker="P35-ATOMIC-FULL-HEIGHT-EDITOR"
      adjustmentKind={kind}
      schemaCapabilities={{
        title: true,
        anchor: Boolean(anchorLabel && onAnchorChange),
        items: true,
        routine: Boolean(routineEditor),
        sourceOrSafety: Boolean(sourceUrl || warning),
      }}
      commitLabel={q3CopyEnabled ? Q3_USER_COPY_PROFILE.publicPreview.applyChanges : '이 내용으로 적용'}
      commitTestId="public-flow-adjustment-apply"
      cancelTestId="public-flow-adjustment-cancel"
      headerCancel={approvedPlanExecution}
      enforce48pxTargets={approvedPlanExecution}
      commitDisabled={applyDisabled}
      onCommit={onApply}
      onCancel={onCancel}
      className={approvedPlanExecution
        ? 'inset-0 max-h-none rounded-none px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] md:inset-y-0 md:left-auto md:right-0 md:w-[min(34rem,96vw)] md:max-h-none md:rounded-none md:px-6 md:pb-6 md:pt-5'
        : 'inset-0 max-h-none rounded-none px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[min(34rem,96vw)] sm:max-h-none sm:rounded-none sm:px-6 sm:pb-6 sm:pt-5'}
    >

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
            {q3CopyEnabled ? '내 계획 이름' : '내 Flow 이름'}
            <input
              data-testid="public-flow-adjustment-name-input"
              data-editor-field="plan-title"
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
              data-editor-field="plan-anchor"
              aria-label={anchorLabel}
              className={`mt-1 w-full ${FLOW_UI_INPUT_CLASS}`}
              type="date"
              value={anchorDraft ?? ''}
              onChange={(event) => onAnchorChange(event.target.value)}
            />
          </label>
        ) : null}

        {kind === 'items' ? (
          <div className="mt-3">
            {itemEditNotice ? (
              <p
                data-testid="public-flow-adjustment-item-format-notice"
                className="mb-3 border-l-2 border-[var(--flowme-warning)] bg-[var(--flowme-warning-soft)] px-2 py-1.5 text-xs font-medium leading-5 text-[var(--flowme-warning-strong)]"
              >
                {itemEditNotice}
              </p>
            ) : null}
            <div
              data-testid="public-flow-adjustment-item-list"
              data-editor-field="plan-items"
              data-flow-editor-scroll-key="public-plan-items"
              tabIndex={-1}
              className="max-h-[min(58vh,32rem)] overflow-y-auto border-y border-[var(--flowme-border)] bg-white"
            >
              {items.map((item) => (
              <div
                key={item.id}
                data-testid="public-flow-adjustment-item-row"
                data-item-id={item.id}
                className={`grid min-h-14 items-center gap-2 border-b border-[var(--flowme-border)] px-2 py-2.5 last:border-b-0 ${
                  itemReorderEnabled
                    ? 'grid-cols-[auto_minmax(0,1fr)_auto]'
                    : 'grid-cols-[minmax(0,1fr)_auto]'
                }`}
              >
                {itemReorderEnabled && onItemMove ? (
                  <span className="grid grid-cols-2 gap-0.5" role="group" aria-label={`${item.title} 순서`}>
                    <button
                      type="button"
                      data-testid="public-flow-adjustment-item-move-up"
                      className={FLOW_UI_COMPACT_ACTION_CLASS}
                      aria-label={`${item.title} 위로 이동`}
                      disabled={!item.canMoveUp}
                      onClick={() => onItemMove(item.id, 'up')}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      data-testid="public-flow-adjustment-item-move-down"
                      className={FLOW_UI_COMPACT_ACTION_CLASS}
                      aria-label={`${item.title} 아래로 이동`}
                      disabled={!item.canMoveDown}
                      onClick={() => onItemMove(item.id, 'down')}
                    >
                      ↓
                    </button>
                  </span>
                ) : null}
                {itemEditEnabled && onItemEdit ? (
                  <button
                    type="button"
                    data-testid="public-flow-adjustment-item-edit"
                    data-item-id={item.id}
                    className="min-w-0 rounded-md px-1 py-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]"
                    aria-label={`${item.title} 수정`}
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
                ) : (
                  <div data-testid="public-flow-adjustment-item-summary" className="min-w-0 px-1 py-1">
                    <span className="block break-keep text-sm font-semibold leading-5 text-[var(--flowme-text)]">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block text-[11px] font-medium text-[var(--flowme-text-secondary)]">
                      {item.dateLabel}
                    </span>
                  </div>
                )}
                <label className="flex min-h-10 items-center gap-1.5 text-xs font-semibold text-[var(--flowme-text-secondary)]">
                  <span>포함</span>
                  <input
                    type="checkbox"
                    checked={item.included}
                    aria-label={`${item.title} ${q3CopyEnabled ? '계획에 포함' : 'Flow에 포함'}`}
                    onChange={(event) => onItemIncludedChange(item.id, event.target.checked)}
                  />
                </label>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {kind === 'routine' ? (
          <div data-testid="public-flow-adjustment-routine-editor" data-editor-field="plan-routine" className="mt-3 max-w-3xl">
            {routineEditor}
          </div>
        ) : null}
      </section>

      {approvedPlanExecution && sharedEditorEnabled && warning ? (
        <div data-editor-field="source-and-safety" className="mt-4">
          <FlowContextDisclosure
            kind="caution"
            label="이 계획의 주의사항"
            title="확인하고 진행해 주세요"
            testId="public-flow-plan-editor-warning"
          >
            <p className="whitespace-pre-wrap text-sm leading-6">{warning}</p>
          </FlowContextDisclosure>
        </div>
      ) : sharedEditorEnabled && warning ? (
        <section data-editor-field="source-and-safety" className="mt-4 border-l-2 border-[var(--flowme-warning)] bg-[var(--flowme-warning-soft)] px-3 py-2">
          <h3 className="text-xs font-semibold text-[var(--flowme-warning-strong)]">주의</h3>
          <p className="mt-1 whitespace-pre-wrap text-sm font-medium text-[var(--flowme-warning-strong)]">{warning}</p>
        </section>
      ) : null}
      {sharedEditorEnabled && sourceUrl ? (
        <a
          data-editor-field="source-and-safety"
          className="mt-3 inline-flex text-sm font-semibold text-[var(--flowme-action)] underline underline-offset-4"
          href={sourceUrl}
          target="_blank"
          rel="noreferrer"
        >원문 보기</a>
      ) : null}

      {!transaction ? <div className="sticky bottom-0 z-30 mt-5 flex justify-end gap-2 border-t border-[var(--flowme-border)] bg-white/95 py-3 backdrop-blur">
        {!approvedPlanExecution ? <button
          type="button"
          data-testid="public-flow-adjustment-cancel"
          className={FLOW_UI_SECONDARY_ACTION_CLASS}
          onClick={onCancel}
        >
          취소
        </button> : null}
        <button
          type="button"
          data-testid="public-flow-adjustment-apply"
          data-action-priority="primary"
          className={FLOW_UI_PRIMARY_ACTION_CLASS}
          disabled={applyDisabled}
          onClick={onApply}
        >
          {q3CopyEnabled ? Q3_USER_COPY_PROFILE.publicPreview.applyChanges : '이 내용으로 적용'}
        </button>
      </div> : null}
    </PublicEditorFrame>
  );
}

export function PublicFlowItemEditor({
  draft,
  returnFocusSelector,
  onChange,
  onSave,
  onClose,
  transaction,
  sharedEditorEnabled = false,
  visualSubtractionEnabled = true,
  q3CopyEnabled = true,
  approvedPlanExecution = false,
  fieldCapabilities,
}: {
  draft: PublicFlowItemEditorDraft;
  returnFocusSelector?: string;
  onChange: (draft: PublicFlowItemEditorDraft) => void;
  onSave: (draft: PublicFlowItemEditorDraft) => void;
  onClose: () => void;
  transaction?: PublicSharedEditorTransaction;
  sharedEditorEnabled?: boolean;
  visualSubtractionEnabled?: boolean;
  q3CopyEnabled?: boolean;
  approvedPlanExecution?: boolean;
  fieldCapabilities?: Readonly<{
    title?: boolean;
    detail?: boolean;
    date?: boolean;
  }>;
}) {
  const normalizedTitle = draft.title.trim();
  const resolvedFieldCapabilities = {
    title: fieldCapabilities?.title ?? true,
    detail: fieldCapabilities?.detail ?? true,
    date: fieldCapabilities?.date ?? true,
  };
  const initialFocusSelector = resolvedFieldCapabilities.title
    ? '[data-testid="public-flow-item-editor-title-input"]'
    : resolvedFieldCapabilities.detail
      ? '[data-testid="public-flow-item-editor-detail-input"]'
      : resolvedFieldCapabilities.date
        ? '[data-testid="public-flow-item-editor-date-input"]'
        : undefined;
  const adapter = selectFlowEditorAdapter({
    enabled: sharedEditorEnabled,
    shared: 'shared' as const,
    legacy: 'legacy' as const,
  });

  return (
    <PublicEditorFrame
      transaction={transaction}
      adapter={adapter}
      level="item"
      testId="public-flow-item-editor"
      headingId="public-flow-item-editor-title"
      eyebrow="할 일 조정"
      title={normalizedTitle || (visualSubtractionEnabled ? '수정' : '할 일 수정')}
      initialFocusSelector={initialFocusSelector}
      returnFocusSelector={returnFocusSelector}
      p35Marker="P35-ATOMIC-FULL-HEIGHT-ITEM-EDITOR"
      schemaCapabilities={{
        title: resolvedFieldCapabilities.title,
        detail: resolvedFieldCapabilities.detail,
        date: resolvedFieldCapabilities.date,
        completionCriterion: !approvedPlanExecution && Boolean(draft.completionCriterion),
        sourceOrSafety: Boolean(draft.sourceUrl || draft.warning),
      }}
      commitLabel={q3CopyEnabled ? Q3_USER_COPY_PROFILE.publicPreview.applyChanges : '이 항목 저장'}
      commitTestId="public-flow-item-editor-save"
      cancelTestId="public-flow-item-editor-cancel"
      headerCancel={approvedPlanExecution}
      enforce48pxTargets={approvedPlanExecution}
      commitDisabled={!normalizedTitle}
      onCommit={() => {
        if (sharedEditorEnabled || normalizedTitle) {
          onSave({ ...draft, title: normalizedTitle });
        }
      }}
      onCancel={onClose}
      className={approvedPlanExecution
        ? 'inset-0 max-h-none rounded-none px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] md:inset-y-0 md:left-auto md:right-0 md:w-[min(28rem,92vw)] md:max-h-none md:rounded-none md:px-6 md:pb-6 md:pt-5'
        : 'inset-0 max-h-none rounded-none px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[min(28rem,92vw)] sm:max-h-none sm:rounded-none sm:px-6 sm:pb-6 sm:pt-5'}
    >
      <form
        data-p35-marker="P35-R2-CONTEXTUAL-ITEM-EDIT-390 P35-R2-ITEM-INSPECTOR-1024"
        className="mt-5 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (transaction) onSave({ ...draft, title: normalizedTitle });
          else if (normalizedTitle) onSave({ ...draft, title: normalizedTitle });
        }}
      >
        {resolvedFieldCapabilities.title ? (
          <label className="block text-sm font-semibold text-[var(--flowme-text)]">
            할 일
            <input
              data-testid="public-flow-item-editor-title-input"
              data-editor-field="item-title"
              className={`mt-1 w-full ${FLOW_UI_INPUT_CLASS}`}
              value={draft.title}
              maxLength={120}
              required
              onChange={(event) => onChange({ ...draft, title: event.target.value })}
            />
          </label>
        ) : null}
        {resolvedFieldCapabilities.detail ? (
          <label className="block text-sm font-semibold text-[var(--flowme-text)]">
            {approvedPlanExecution ? '메모' : '상세 내용'}
            <textarea
              data-testid="public-flow-item-editor-detail-input"
              data-editor-field="item-detail"
              className={`mt-1 min-h-28 w-full resize-y ${FLOW_UI_INPUT_CLASS}`}
              value={draft.detail}
              maxLength={1000}
              placeholder="내가 실행할 때 필요한 내용을 적어두세요"
              onChange={(event) => onChange({ ...draft, detail: event.target.value })}
            />
          </label>
        ) : null}
        {resolvedFieldCapabilities.date ? (
          <div>
            <label className="block text-sm font-semibold text-[var(--flowme-text)]">
              날짜
              <input
                data-testid="public-flow-item-editor-date-input"
                data-editor-field="item-date"
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
        ) : null}
        {!approvedPlanExecution && sharedEditorEnabled && draft.completionCriterion ? (
          <section data-editor-field="item-completion-criterion" className="border-l-2 border-[var(--flowme-border-strong)] px-3 py-2">
            <h3 className="text-xs font-semibold text-[var(--flowme-text-secondary)]">완료 기준</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm font-medium text-[var(--flowme-text)]">
              {draft.completionCriterion}
            </p>
          </section>
        ) : null}
        {approvedPlanExecution && sharedEditorEnabled && draft.warning ? (
          <div data-editor-field="source-and-safety">
            <FlowContextDisclosure
              kind="caution"
              label="이 항목의 주의사항"
              title="확인하고 진행해 주세요"
              testId="public-flow-item-editor-warning"
            >
              <p className="whitespace-pre-wrap text-sm leading-6">{draft.warning}</p>
            </FlowContextDisclosure>
          </div>
        ) : sharedEditorEnabled && draft.warning ? (
          <section data-editor-field="source-and-safety" className="border-l-2 border-[var(--flowme-warning)] bg-[var(--flowme-warning-soft)] px-3 py-2">
            <h3 className="text-xs font-semibold text-[var(--flowme-warning-strong)]">주의</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm font-medium text-[var(--flowme-warning-strong)]">
              {draft.warning}
            </p>
          </section>
        ) : null}
        {sharedEditorEnabled && draft.sourceUrl ? (
          <a
            data-editor-field="source-and-safety"
            className="inline-flex text-sm font-semibold text-[var(--flowme-action)] underline underline-offset-4"
            href={draft.sourceUrl}
            target="_blank"
            rel="noreferrer"
          >원문 보기</a>
        ) : null}
        {!transaction ? <div className="flex justify-end gap-2 border-t border-[var(--flowme-border)] pt-4">
          {!approvedPlanExecution ? <button
            type="button"
            data-testid="public-flow-item-editor-cancel"
            className={FLOW_UI_SECONDARY_ACTION_CLASS}
            onClick={onClose}
          >
            취소
          </button> : null}
          <button
            type="submit"
            data-testid="public-flow-item-editor-save"
            className={FLOW_UI_PRIMARY_ACTION_CLASS}
            disabled={!normalizedTitle}
          >
            {q3CopyEnabled ? Q3_USER_COPY_PROFILE.publicPreview.applyChanges : '이 항목 저장'}
          </button>
        </div> : null}
      </form>
    </PublicEditorFrame>
  );
}
